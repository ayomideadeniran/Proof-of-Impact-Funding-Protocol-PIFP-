use axum::{
    routing::{get, post},
    Router,
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use sha2::{Sha256, Digest};
use hex;
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    // Load env (optional)
    dotenv::dotenv().ok();

    // Define routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/hash-proof", post(hash_proof))
        .route("/request-otp", post(request_otp))
        .route("/verify-otp", post(verify_otp))
        //.route("/submit-proof", post(submit_proof)) // Requires starknet setup
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
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

async fn hash_proof(Json(payload): Json<ProofRequest>) -> impl IntoResponse {
    let mut hasher = Sha256::new();
    hasher.update(payload.data.as_bytes());
    let result = hasher.finalize();
    let hash_hex = hex::encode(result);

    // Starknet felts are roughly 251 bits, so we might need to truncate or ensure it fits.
    // For simplicity, we return the hex. Frontend/Contract adapts it.
    
    (StatusCode::OK, Json(ProofResponse { hash: format!("0x{}", hash_hex) }))
}

#[derive(Deserialize)]
struct OtpRequest {
    email: String,
}

async fn request_otp(Json(_payload): Json<OtpRequest>) -> impl IntoResponse {
    // Mock sending OTP
    println!("Sending OTP to {}", _payload.email);
    (StatusCode::OK, Json("OTP Sent"))
}

#[derive(Deserialize)]
struct OtpVerify {
    email: String,
    otp: String,
}

async fn verify_otp(Json(payload): Json<OtpVerify>) -> impl IntoResponse {
    if payload.otp == "123456" {
        (StatusCode::OK, Json("Verified"))
    } else {
        (StatusCode::UNAUTHORIZED, Json("Invalid OTP"))
    }
}
