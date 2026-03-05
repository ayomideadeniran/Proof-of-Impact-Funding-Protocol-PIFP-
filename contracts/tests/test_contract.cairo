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
    let title = 'Clean Water'; // felt252
    let goal = 1000;
    let fixed_donation = 100;
    let proof_req = 0xabc;
    let create_token = 0x111;
    dispatcher.issue_otp_token(test_address(), 1, 0, create_token, 9999999999);

    let id = dispatcher.create_project(title, goal, fixed_donation, recipient, proof_req, create_token);
    assert(id == 1, 'Invalid ID');

    let project = dispatcher.get_project(id);
    assert(project.title == title, 'Invalid title');
    assert(project.funding_goal == goal, 'Invalid goal');
    assert(project.fixed_donation_amount == fixed_donation, 'Invalid fixed donation');
}

#[test]
fn test_donate() {
    let contract_address = deploy_contract("PIFP");
    let dispatcher = IPIFPDispatcher { contract_address };

    let recipient = contract_address_const::<0x456>();
    let create_token = 0x222;
    dispatcher.issue_otp_token(test_address(), 1, 0, create_token, 9999999999);
    let id = dispatcher.create_project('Tree Planting', 500, 100, recipient, 0xdef, create_token);

    let commitment = 0x999;
    let donate_token = 0x333;
    dispatcher.issue_otp_token(test_address(), 2, id, donate_token, 9999999999);
    dispatcher.donate(id, 100, commitment, donate_token);

    let project = dispatcher.get_project(id);
    assert(project.funds_collected == 100, 'Funds not recorded');
    assert(project.is_funded == false, 'Should not be funded yet');
    assert(dispatcher.has_donated(id, test_address()), 'Donor status should be true');
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
