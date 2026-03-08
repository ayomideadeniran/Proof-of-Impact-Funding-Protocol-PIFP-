use starknet::core::utils::get_selector_from_name;

fn main() {
    let names = vec![
        "issue_otp_token",
        "create_project",
        "donate",
        "submit_proof",
        "upsert_wallet_email_hash",
        "get_wallet_email_hash",
        "has_donated",
        "get_project",
        "get_project_count",
        "get_activity_count",
        "get_activity",
        "__execute__",
        "execute"
    ];
    for name in names {
        println!("{}: {:#x}", name, get_selector_from_name(name).unwrap());
    }
}
