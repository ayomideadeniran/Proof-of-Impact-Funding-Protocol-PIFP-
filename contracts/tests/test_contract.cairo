use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, test_address};
use contracts::IPIFPDispatcher;
use contracts::IPIFPDispatcherTrait;
use starknet::contract_address_const;

fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    // Constructor args: oracle_address, payment_token_address
    let oracle = test_address();
    let payment_token = contract_address_const::<0x0>(); // zero address keeps tests as bookkeeping-only
    let mut calldata = ArrayTrait::new();
    calldata.append(oracle.into());
    calldata.append(payment_token.into());

    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

#[test]
fn test_create_project() {
    let contract_address = deploy_contract("PIFP");
    let dispatcher = IPIFPDispatcher { contract_address };

    let recipient = contract_address_const::<0x456>();
    let goal = 1000;
    let fixed_donation = 100;
    let proof_req = 0xabc;
    let create_token = 0x111;
    dispatcher.issue_otp_token(test_address(), 1, 0, create_token, 9999999999);

    let id = dispatcher.create_project(
        "Clean Water",
        "Community borehole repair and maintenance plan",
        "https://example.org/water.jpg",
        "https://example.org/water.mp4",
        "https://example.org/spec.pdf\nhttps://example.org/budget.pdf",
        goal,
        fixed_donation,
        recipient,
        proof_req,
        create_token
    );
    assert(id == 1, 'Invalid ID');

    let project = dispatcher.get_project(id);
    assert(project.title == "Clean Water", 'Invalid title');
    assert(project.description == "Community borehole repair and maintenance plan", 'Invalid description');
    assert(
        project.proof_links_blob == "https://example.org/spec.pdf\nhttps://example.org/budget.pdf",
        'Invalid proof links'
    );
    assert(project.funding_goal == goal, 'Invalid goal');
    assert(project.fixed_donation_amount == fixed_donation, 'Invalid fixed donation');
    assert(dispatcher.get_activity_count(test_address()) == 1, 'Missing create activity');
}

#[test]
fn test_donate() {
    let contract_address = deploy_contract("PIFP");
    let dispatcher = IPIFPDispatcher { contract_address };

    let recipient = contract_address_const::<0x456>();
    let create_token = 0x222;
    dispatcher.issue_otp_token(test_address(), 1, 0, create_token, 9999999999);
    let id = dispatcher.create_project(
        "Tree Planting",
        "Five hundred native trees for erosion control",
        "https://example.org/trees.jpg",
        "https://example.org/trees.mp4",
        "https://example.org/trees-approval.pdf\nhttps://example.org/trees-budget.pdf",
        500,
        100,
        recipient,
        0xdef,
        create_token
    );

    let commitment = 0x999;
    let donate_token = 0x333;
    dispatcher.issue_otp_token(test_address(), 2, id, donate_token, 9999999999);
    dispatcher.donate(id, 100, commitment, donate_token);

    let project = dispatcher.get_project(id);
    assert(project.funds_collected == 100, 'Funds not recorded');
    assert(project.is_funded == false, 'Should not be funded yet');
    assert(dispatcher.has_donated(id, test_address()), 'Donor status should be true');
    assert(dispatcher.get_activity_count(test_address()) == 2, 'Missing activity');
}

#[test]
fn test_wallet_email_hash() {
    let contract_address = deploy_contract("PIFP");
    let dispatcher = IPIFPDispatcher { contract_address };
    let user = contract_address_const::<0xabcde>();
    let email_hash = 0x12345;

    dispatcher.upsert_wallet_email_hash(user, email_hash);
    let stored = dispatcher.get_wallet_email_hash(user);
    assert(stored == email_hash, 'Email hash not stored');
}
