use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use contracts::IPIFPDispatcher;
use contracts::IPIFPDispatcherTrait;
use contracts::IPIFPSafeDispatcher;
use contracts::IPIFPSafeDispatcherTrait;
use starknet::contract_address_const;

fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    // Constructor args: oracle_address
    let oracle = contract_address_const::<0x123>();
    let mut calldata = ArrayTrait::new();
    calldata.append(oracle.into());

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
    let proof_req = 0xabc;

    let id = dispatcher.create_project(title, goal, recipient, proof_req);
    assert(id == 1, 'Invalid ID');

    let project = dispatcher.get_project(id);
    assert(project.title == title, 'Invalid title');
    assert(project.funding_goal == goal, 'Invalid goal');
}

#[test]
fn test_donate() {
    let contract_address = deploy_contract("PIFP");
    let dispatcher = IPIFPDispatcher { contract_address };

    let recipient = contract_address_const::<0x456>();
    let id = dispatcher.create_project('Tree Planting', 500, recipient, 0xdef);

    let commitment = 0x999;
    dispatcher.donate(id, 100, commitment);

    let project = dispatcher.get_project(id);
    assert(project.funds_collected == 100, 'Funds not recorded');
    assert(project.is_funded == false, 'Should not be funded yet');

    dispatcher.donate(id, 400, 0x888);
    let project_funded = dispatcher.get_project(id);
    assert(project_funded.funds_collected == 500, 'Total funds wrong');
    assert(project_funded.is_funded == true, 'Should be funded');
}
