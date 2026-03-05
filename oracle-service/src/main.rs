use axum::{
    routing::{get, post},
    Router,
    Json,
    extract::Query,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use sha2::{Sha256, Digest};
use std::process::Command;
use tower_http::cors::CorsLayer;
use once_cell::sync::Lazy;
use rand::Rng;
use std::collections::HashMap;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    transport::smtp::authentication::Credentials,
};

#[derive(Clone)]
struct OtpEntry {
    code: String,
    expires_at: u64,
}

#[derive(Clone)]
struct VerifiedOtpEntry {
    expires_at: u64,
}

static OTP_STORE: Lazy<RwLock<HashMap<String, OtpEntry>>> = Lazy::new(|| RwLock::new(HashMap::new()));
static VERIFIED_OTP_STORE: Lazy<RwLock<HashMap<String, VerifiedOtpEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));
static WALLET_EMAIL_STORE: Lazy<RwLock<HashMap<String, String>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

#[tokio::main]
async fn main() {
    // Load env (optional)
    dotenv::dotenv().ok();
    load_wallet_email_store().await;

    // Define routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/wallet-profile", get(wallet_profile))
        .route("/hash-proof", post(hash_proof))
        .route("/submit-proof", post(submit_proof))
        .route("/request-otp", post(request_otp))
        .route("/verify-otp", post(verify_otp))
        .route("/issue-action-token", post(issue_action_token))
        .layer(CorsLayer::permissive());

    let port = std::env::var("ORACLE_PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(3001);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Oracle Service listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "Oracle Service Active")
}

#[derive(Deserialize)]
struct ProofRequest {
    data: String,
}

#[derive(Serialize)]
struct ProofResponse {
    hash: String,
}

fn sha256_to_felt_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let mut bytes = hasher.finalize().to_vec();
    // Clamp to 251 bits so it is always a valid felt.
    bytes[0] &= 0x07;
    format!("0x{}", hex::encode(bytes))
}

async fn hash_proof(Json(payload): Json<ProofRequest>) -> impl IntoResponse {
    let hash = sha256_to_felt_hex(&payload.data);
    (StatusCode::OK, Json(ProofResponse { hash }))
}

#[derive(Deserialize)]
struct SubmitProofRequest {
    project_id: u64,
    proof_data: Option<String>,
    proof_hash: Option<String>,
    otp_token: Option<String>,
}

#[derive(Serialize)]
struct SubmitProofResponse {
    tx_hash: String,
    proof_hash: String,
    message: String,
}

fn normalize_hash(hash: &str) -> Result<String, String> {
    let trimmed = hash.trim();
    let no_prefix = trimmed.strip_prefix("0x").unwrap_or(trimmed);
    if no_prefix.is_empty() {
        return Err("proof_hash cannot be empty".to_string());
    }
    if no_prefix.len() > 64 {
        return Err("proof_hash too long".to_string());
    }
    if !no_prefix.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("proof_hash must be hex".to_string());
    }
    if no_prefix.len() == 64 {
        let first = no_prefix.chars().next().unwrap_or('f');
        if !"01234567".contains(first.to_ascii_lowercase()) {
            return Err("proof_hash exceeds felt range".to_string());
        }
    }
    Ok(format!("0x{}", no_prefix.to_lowercase()))
}

fn extract_tx_hash(output: &str) -> Option<String> {
    if let Some(line) = output.lines().find(|line| line.to_lowercase().contains("transaction hash")) {
        return line
            .split_whitespace()
            .find(|part| part.starts_with("0x"))
            .map(ToString::to_string);
    }

    output
        .split_whitespace()
        .find(|part| part.starts_with("0x") && part.len() > 10)
        .map(ToString::to_string)
}

fn run_sncast_invoke(
    function_name: &str,
    calldata: &[String],
) -> Result<String, String> {
    let sncast_bin = std::env::var("ORACLE_SNCAST_BIN").unwrap_or_else(|_| "sncast".to_string());
    let primary_rpc_url = std::env::var("ORACLE_RPC_URL")
        .unwrap_or_else(|_| "https://api.cartridge.gg/x/starknet/sepolia".to_string());
    let fallback_rpc_url = std::env::var("ORACLE_RPC_URL_FALLBACK")
        .unwrap_or_else(|_| "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/ckCaCOPs1z8MLhPX4-hgd".to_string());
    let account_name = std::env::var("ORACLE_SNCAST_ACCOUNT").unwrap_or_else(|_| "pifp_deployer".to_string());
    let contract_address = std::env::var("ORACLE_PIFP_CONTRACT_ADDRESS")
        .map_err(|_| "ORACLE_PIFP_CONTRACT_ADDRESS is not set".to_string())?;

    let mut urls = vec![primary_rpc_url];
    if !urls.iter().any(|u| u == &fallback_rpc_url) {
        urls.push(fallback_rpc_url);
    }

    let mut last_error = String::new();
    for rpc_url in urls {
        let mut cmd = Command::new(&sncast_bin);
        cmd.arg("--wait")
            .arg("--account")
            .arg(&account_name)
            .arg("invoke")
            .arg("--url")
            .arg(&rpc_url)
            .arg("--contract-address")
            .arg(&contract_address)
            .arg("--function")
            .arg(function_name)
            .arg("--calldata");
        for value in calldata {
            cmd.arg(value);
        }

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to execute sncast: {e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let combined = format!("{stdout}\n{stderr}");

        if output.status.success() && !combined.contains("Error:") && !combined.contains("error:") {
            return extract_tx_hash(&combined)
                .ok_or_else(|| format!("Could not parse tx hash from sncast output: {}", combined.trim()));
        }

        last_error = format!("rpc_url={rpc_url}; {}", combined.trim());
    }

    Err(last_error)
}

fn invoke_submit_proof(project_id: u64, proof_hash: &str, otp_token: &str) -> Result<String, String> {
    let calldata = vec![
        project_id.to_string(),
        proof_hash.to_string(),
        otp_token.to_string(),
    ];
    run_sncast_invoke("submit_proof", &calldata).map_err(|err| format!("submit_proof failed: {err}"))
}

async fn submit_proof(Json(payload): Json<SubmitProofRequest>) -> impl IntoResponse {
    let provided_hash = payload
        .proof_hash
        .as_deref()
        .map(str::trim)
        .filter(|h| !h.is_empty());
    let provided_data = payload
        .proof_data
        .as_deref()
        .map(str::trim)
        .filter(|d| !d.is_empty());

    let hash = if let Some(hash) = provided_hash {
        match normalize_hash(hash) {
            Ok(v) => v,
            Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))),
        }
    } else if let Some(data) = provided_data {
        sha256_to_felt_hex(data)
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Provide proof_data or proof_hash" })),
        );
    };

    let otp_token = match payload.otp_token.as_deref() {
        Some(token) => match normalize_hash(token) {
            Ok(v) => v,
            Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))),
        },
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "otp_token is required" })),
            );
        }
    };

    match invoke_submit_proof(payload.project_id, &hash, &otp_token) {
        Ok(tx_hash) => (
            StatusCode::OK,
            Json(serde_json::json!(SubmitProofResponse {
                tx_hash,
                proof_hash: hash,
                message: "Proof submitted on-chain".to_string(),
            })),
        ),
        Err(err) => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "error": err, "proof_hash": hash, "otp_token": otp_token })),
        ),
    }
}

#[derive(Deserialize)]
struct OtpRequest {
    email: Option<String>,
    wallet_address: Option<String>,
}

#[derive(Serialize)]
struct OtpRequestResponse {
    status: String,
    expires_in_seconds: u64,
    dev_otp: Option<String>,
}

fn now_unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn wallet_email_file_path() -> String {
    std::env::var("ORACLE_WALLET_EMAIL_FILE")
        .unwrap_or_else(|_| "oracle-service/wallet_emails.json".to_string())
}

async fn load_wallet_email_store() {
    let path = wallet_email_file_path();
    let content = fs::read_to_string(path).ok();
    let parsed = content
        .as_deref()
        .and_then(|raw| serde_json::from_str::<HashMap<String, String>>(raw).ok())
        .unwrap_or_default();
    let mut store = WALLET_EMAIL_STORE.write().await;
    *store = parsed;
}

async fn persist_wallet_email_store() -> Result<(), String> {
    let path = wallet_email_file_path();
    let store = WALLET_EMAIL_STORE.read().await;
    let content = serde_json::to_string_pretty(&*store)
        .map_err(|e| format!("Failed to serialize wallet-email store: {e}"))?;
    if let Some(parent) = std::path::Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create wallet-email dir: {e}"))?;
    }
    fs::write(path, content).map_err(|e| format!("Failed to persist wallet-email store: {e}"))
}

fn mask_email(email: &str) -> String {
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return email.to_string();
    }
    let name = parts[0];
    let domain = parts[1];
    if name.len() <= 2 {
        return format!("{}***@{}", &name[..1.min(name.len())], domain);
    }
    format!("{}***{}@{}", &name[..1], &name[name.len() - 1..], domain)
}

#[derive(Deserialize)]
struct WalletProfileQuery {
    wallet_address: String,
}

async fn wallet_profile(Query(query): Query<WalletProfileQuery>) -> impl IntoResponse {
    let wallet = match normalize_contract_address(&query.wallet_address) {
        Ok(v) => v,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))),
    };

    let store = WALLET_EMAIL_STORE.read().await;
    if let Some(email) = store.get(&wallet) {
        (
            StatusCode::OK,
            Json(serde_json::json!({
                "email_bound": true,
                "email_masked": mask_email(email)
            })),
        )
    } else {
        (StatusCode::OK, Json(serde_json::json!({ "email_bound": false })))
    }
}

fn should_expose_dev_otp() -> bool {
    std::env::var("ORACLE_EXPOSE_OTP")
        .ok()
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn otp_provider() -> String {
    std::env::var("ORACLE_OTP_PROVIDER")
        .unwrap_or_else(|_| "smtp".to_string())
        .to_lowercase()
}

fn should_sync_wallet_email_onchain() -> bool {
    std::env::var("ORACLE_ENABLE_ONCHAIN_EMAIL_HASH_SYNC")
        .ok()
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn skip_smtp_in_dev_mode() -> bool {
    std::env::var("ORACLE_SKIP_SMTP_WHEN_DEV")
        .ok()
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(true)
}

async fn send_otp_email(email: &str, code: &str, ttl_seconds: u64) -> Result<(), String> {
    let provider = otp_provider();
    if provider == "resend" {
        return send_otp_via_resend(email, code, ttl_seconds).await;
    }
    send_otp_via_smtp(email, code, ttl_seconds).await
}

async fn send_otp_via_smtp(email: &str, code: &str, ttl_seconds: u64) -> Result<(), String> {
    let smtp_host = std::env::var("ORACLE_SMTP_HOST")
        .map_err(|_| "ORACLE_SMTP_HOST is not set".to_string())?;
    let smtp_port = std::env::var("ORACLE_SMTP_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(587);
    let smtp_user = std::env::var("ORACLE_SMTP_USERNAME")
        .map_err(|_| "ORACLE_SMTP_USERNAME is not set".to_string())?;
    let smtp_pass = std::env::var("ORACLE_SMTP_PASSWORD")
        .map_err(|_| "ORACLE_SMTP_PASSWORD is not set".to_string())?;
    let from_email = std::env::var("ORACLE_FROM_EMAIL").unwrap_or_else(|_| smtp_user.clone());

    let message = Message::builder()
        .from(
            from_email
                .parse()
                .map_err(|e| format!("Invalid ORACLE_FROM_EMAIL: {e}"))?,
        )
        .to(email.parse().map_err(|e| format!("Invalid recipient email: {e}"))?)
        .subject("Your PIFP OTP Code")
        .body(format!(
            "Your PIFP verification code is: {code}\n\nThis code expires in {ttl_seconds} seconds."
        ))
        .map_err(|e| format!("Failed to build email: {e}"))?;

    let credentials = Credentials::new(smtp_user, smtp_pass);
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)
        .map_err(|e| format!("SMTP relay error: {e}"))?
        .port(smtp_port)
        .credentials(credentials)
        .build();

    mailer
        .send(message)
        .await
        .map_err(|e| format!("Failed to send OTP email: {e}"))?;

    Ok(())
}

async fn send_otp_via_resend(email: &str, code: &str, ttl_seconds: u64) -> Result<(), String> {
    let api_key = std::env::var("ORACLE_RESEND_API_KEY")
        .map_err(|_| "ORACLE_RESEND_API_KEY is not set".to_string())?;
    let from_email = std::env::var("ORACLE_RESEND_FROM_EMAIL")
        .or_else(|_| std::env::var("ORACLE_FROM_EMAIL"))
        .map_err(|_| "ORACLE_RESEND_FROM_EMAIL or ORACLE_FROM_EMAIL is not set".to_string())?;
    let resend_url = std::env::var("ORACLE_RESEND_API_URL")
        .unwrap_or_else(|_| "https://api.resend.com/emails".to_string());

    let text_body = format!(
        "Your PIFP verification code is: {code}\n\nThis code expires in {ttl_seconds} seconds."
    );
    let html_body = format!(
        "<p>Your PIFP verification code is: <strong>{code}</strong></p><p>This code expires in {ttl_seconds} seconds.</p>"
    );

    let payload = serde_json::json!({
        "from": from_email,
        "to": [email],
        "subject": "Your PIFP OTP Code",
        "text": text_body,
        "html": html_body
    });

    let client = reqwest::Client::new();
    let response = client
        .post(resend_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to call Resend API: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_else(|_| "".to_string());
        return Err(format!("Resend API failed ({status}): {body}"));
    }

    Ok(())
}

async fn request_otp(Json(payload): Json<OtpRequest>) -> impl IntoResponse {
    let wallet_address = payload
        .wallet_address
        .as_deref()
        .and_then(|v| normalize_contract_address(v).ok());

    let email = if let Some(wallet) = wallet_address.as_ref() {
        let store = WALLET_EMAIL_STORE.read().await;
        if let Some(existing) = store.get(wallet) {
            existing.clone()
        } else {
            payload.email.as_deref().unwrap_or("").trim().to_lowercase()
        }
    } else {
        payload.email.as_deref().unwrap_or("").trim().to_lowercase()
    };
    if email.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Email is required for first-time wallet binding" })),
        );
    }

    let ttl_seconds = std::env::var("ORACLE_OTP_TTL_SECONDS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(300);

    let code = format!("{:06}", rand::thread_rng().gen_range(0..1_000_000));
    let expires_at = now_unix_seconds() + ttl_seconds;

    {
        let mut store = OTP_STORE.write().await;
        store.insert(
            email.clone(),
            OtpEntry {
                code: code.clone(),
                expires_at,
            },
        );
    }

    if should_expose_dev_otp() && skip_smtp_in_dev_mode() {
        return (
            StatusCode::OK,
            Json(serde_json::json!(OtpRequestResponse {
                status: "OTP Generated (Dev Instant)".to_string(),
                expires_in_seconds: ttl_seconds,
                dev_otp: Some(code),
            })),
        );
    }

    if let Err(err) = send_otp_email(&email, &code, ttl_seconds).await {
        if should_expose_dev_otp() {
            eprintln!("Warning: SMTP send failed, falling back to dev OTP mode: {err}");
            return (
                StatusCode::OK,
                Json(serde_json::json!(OtpRequestResponse {
                    status: "OTP Generated (Dev Fallback)".to_string(),
                    expires_in_seconds: ttl_seconds,
                    dev_otp: Some(code),
                })),
            );
        }
        return (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "error": err })),
        );
    }

    println!("OTP email sent to {email} (expires in {ttl_seconds}s)");

    (
        StatusCode::OK,
        Json(serde_json::json!(OtpRequestResponse {
            status: "OTP Sent".to_string(),
            expires_in_seconds: ttl_seconds,
            dev_otp: if should_expose_dev_otp() { Some(code) } else { None },
        })),
    )
}

#[derive(Deserialize)]
struct OtpVerify {
    email: Option<String>,
    wallet_address: Option<String>,
    otp: String,
}

async fn verify_otp(Json(payload): Json<OtpVerify>) -> impl IntoResponse {
    let wallet_address = payload
        .wallet_address
        .as_deref()
        .and_then(|v| normalize_contract_address(v).ok());

    let email = if let Some(wallet) = wallet_address.as_ref() {
        let store = WALLET_EMAIL_STORE.read().await;
        if let Some(existing) = store.get(wallet) {
            existing.clone()
        } else {
            payload.email.as_deref().unwrap_or("").trim().to_lowercase()
        }
    } else {
        payload.email.as_deref().unwrap_or("").trim().to_lowercase()
    };
    let otp = payload.otp.trim().to_string();
    if email.is_empty() || otp.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Email and OTP are required" })),
        );
    }

    let now = now_unix_seconds();
    let entry = {
        let store = OTP_STORE.read().await;
        store.get(&email).cloned()
    };

    match entry {
        None => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "No OTP requested for this email" })),
        ),
        Some(entry) if entry.expires_at < now => {
            let mut store = OTP_STORE.write().await;
            store.remove(&email);
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "OTP expired. Request a new one." })),
            )
        }
        Some(entry) if entry.code != otp => (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid OTP" })),
        ),
        Some(_) => {
            let mut store = OTP_STORE.write().await;
            store.remove(&email);
            let mut response = serde_json::json!({ "status": "Verified" });
            if let Some(wallet) = wallet_address.as_ref() {
                let mut map = WALLET_EMAIL_STORE.write().await;
                map.insert(wallet.clone(), email.clone());
                drop(map);
                if let Err(err) = persist_wallet_email_store().await {
                    return (
                        StatusCode::BAD_GATEWAY,
                        Json(serde_json::json!({ "error": err })),
                    );
                }
                if should_sync_wallet_email_onchain() {
                    if let Err(err) = invoke_upsert_wallet_email_hash(wallet, &sha256_to_felt_hex(&email)) {
                        // Keep verification successful even if on-chain email hash sync is unavailable.
                        // Wallet-email binding remains persisted in oracle local storage.
                        eprintln!("Warning: {err}");
                        response["warning"] = serde_json::Value::String(
                            "Email bound locally, but on-chain email hash sync failed. Redeploy latest contract to enable on-chain sync."
                                .to_string(),
                        );
                    }
                }
            }
            let ttl_seconds = std::env::var("ORACLE_VERIFIED_OTP_WINDOW_SECONDS")
                .ok()
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(180);
            let mut verified_store = VERIFIED_OTP_STORE.write().await;
            verified_store.insert(
                email,
                VerifiedOtpEntry {
                    expires_at: now + ttl_seconds,
                },
            );
            (StatusCode::OK, Json(response))
        }
    }
}

#[derive(Deserialize)]
struct IssueActionTokenRequest {
    email: Option<String>,
    action: String,
    wallet_address: String,
    project_id: Option<u64>,
}

#[derive(Serialize)]
struct IssueActionTokenResponse {
    action_token: String,
    expires_at: u64,
    action: String,
}

fn action_to_code(action: &str) -> Option<u8> {
    match action {
        "create_project" => Some(1),
        "donate" => Some(2),
        "submit_proof" => Some(3),
        _ => None,
    }
}

fn normalize_contract_address(address: &str) -> Result<String, String> {
    let trimmed = address.trim();
    let no_prefix = trimmed.strip_prefix("0x").unwrap_or(trimmed);
    if no_prefix.is_empty() {
        return Err("wallet_address cannot be empty".to_string());
    }
    if no_prefix.len() > 64 {
        return Err("wallet_address too long".to_string());
    }
    if !no_prefix.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("wallet_address must be hex".to_string());
    }
    Ok(format!("0x{}", no_prefix.to_lowercase()))
}

fn wallet_for_action(action_code: u8, requested_wallet: &str) -> Result<String, String> {
    // submit_proof is sent on-chain by the oracle account, not by the end-user wallet.
    if action_code == 3 {
        let oracle_caller = std::env::var("ORACLE_CALLER_ADDRESS")
            .map_err(|_| "ORACLE_CALLER_ADDRESS is required for submit_proof action tokens".to_string())?;
        return normalize_contract_address(&oracle_caller);
    }
    normalize_contract_address(requested_wallet)
}

fn invoke_upsert_wallet_email_hash(wallet_address: &str, email_hash: &str) -> Result<String, String> {
    let calldata = vec![wallet_address.to_string(), email_hash.to_string()];
    run_sncast_invoke("upsert_wallet_email_hash", &calldata)
        .map_err(|err| format!("upsert_wallet_email_hash failed: {err}"))
}

fn generate_action_token() -> String {
    let random: [u8; 32] = rand::random();
    let mut bytes = random.to_vec();
    bytes[0] &= 0x07;
    format!("0x{}", hex::encode(bytes))
}

fn invoke_issue_otp_token(
    wallet_address: &str,
    action_code: u8,
    project_id: u64,
    action_token: &str,
    expires_at: u64,
) -> Result<String, String> {
    let calldata = vec![
        wallet_address.to_string(),
        action_code.to_string(),
        project_id.to_string(),
        action_token.to_string(),
        expires_at.to_string(),
    ];
    run_sncast_invoke("issue_otp_token", &calldata).map_err(|err| format!("issue_otp_token failed: {err}"))
}

async fn issue_action_token(Json(payload): Json<IssueActionTokenRequest>) -> impl IntoResponse {
    let requested_wallet = match normalize_contract_address(&payload.wallet_address) {
        Ok(v) => v,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))),
    };
    let email = {
        let store = WALLET_EMAIL_STORE.read().await;
        store
            .get(&requested_wallet)
            .cloned()
            .unwrap_or_else(|| payload.email.as_deref().unwrap_or("").trim().to_lowercase())
    };
    if email.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Email is required for unbound wallet" })),
        );
    }

    let now = now_unix_seconds();
    let verified = {
        let store = VERIFIED_OTP_STORE.read().await;
        store.get(&email).cloned()
    };
    match verified {
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "OTP verification required before issuing action token" })),
            );
        }
        Some(entry) if entry.expires_at < now => {
            let mut store = VERIFIED_OTP_STORE.write().await;
            store.remove(&email);
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "OTP verification window expired. Verify OTP again." })),
            );
        }
        Some(_) => {}
    }

    let action = payload.action.trim().to_lowercase();
    let action_code = match action_to_code(&action) {
        Some(code) => code,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Unsupported action" })),
            );
        }
    };
    let project_id = payload.project_id.unwrap_or(0);
    let wallet_address = match wallet_for_action(action_code, &requested_wallet) {
        Ok(v) => v,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))),
    };

    let ttl_seconds = std::env::var("ORACLE_ACTION_TOKEN_TTL_SECONDS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(300);
    let expires_at = now + ttl_seconds;
    let action_token = generate_action_token();

    match invoke_issue_otp_token(&wallet_address, action_code, project_id, &action_token, expires_at) {
        Ok(_) => {
            let mut store = VERIFIED_OTP_STORE.write().await;
            store.remove(&email);
            (
                StatusCode::OK,
                Json(serde_json::json!(IssueActionTokenResponse {
                    action_token,
                    expires_at,
                    action,
                })),
            )
        }
        Err(err) => (
            StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "error": err })),
        ),
    }
}
