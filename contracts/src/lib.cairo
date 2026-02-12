use starknet::ContractAddress;

#[starknet::interface]
pub trait IPIFP<TContractState> {
    fn create_project(
        ref self: TContractState,
        title: felt252,
        funding_goal: u256,
        recipient: ContractAddress,
        proof_requirement_hash: felt252
    ) -> u64;
    fn donate(ref self: TContractState, project_id: u64, amount: u256, commitment: felt252);
    fn submit_proof(ref self: TContractState, project_id: u64, proof_hash: felt252);
    fn release_funds(ref self: TContractState, project_id: u64);
    fn get_project(self: @TContractState, project_id: u64) -> Project;
    fn get_project_count(self: @TContractState) -> u64;
}

#[derive(Drop, Serde, starknet::Store)]
pub struct Project {
    pub id: u64,
    pub title: felt252,
    pub funding_goal: u256,
    pub funds_collected: u256,
    pub recipient: ContractAddress,
    pub proof_requirement_hash: felt252,
    pub is_completed: bool,
    pub is_funded: bool,
}

#[starknet::contract]
pub mod PIFP {
    use super::{Project, IPIFP};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use core::starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, 
        StorageMapReadAccess, StorageMapWriteAccess
    };

    #[storage]
    struct Storage {
        projects: LegacyMap<u64, Project>,
        project_count: u64,
        commitments: LegacyMap<felt252, bool>, 
        project_donations: LegacyMap<u64, u256>,
        owner: ContractAddress,
        oracle: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ProjectCreated: ProjectCreated,
        DonationReceived: DonationReceived,
        ProofVerified: ProofVerified,
        FundsReleased: FundsReleased,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ProjectCreated {
        #[key]
        pub project_id: u64,
        pub title: felt252,
        pub funding_goal: u256,
        pub recipient: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DonationReceived {
        #[key]
        pub project_id: u64,
        pub amount: u256,
        pub commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ProofVerified {
        #[key]
        pub project_id: u64,
        pub proof_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FundsReleased {
        #[key]
        pub project_id: u64,
        pub amount: u256,
        pub recipient: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, oracle_address: ContractAddress) {
        self.owner.write(get_caller_address());
        self.oracle.write(oracle_address);
        self.project_count.write(0);
    }

    #[abi(embed_v0)]
    impl PIFPImpl of IPIFP<ContractState> {
        fn create_project(
            ref self: ContractState,
            title: felt252,
            funding_goal: u256,
            recipient: ContractAddress,
            proof_requirement_hash: felt252
        ) -> u64 {
            let id = self.project_count.read() + 1;
            
            let project = Project {
                id,
                title, // Direct assignment since it's now Copy (felt252)
                funding_goal,
                funds_collected: 0,
                recipient,
                proof_requirement_hash,
                is_completed: false,
                is_funded: false,
            };

            self.projects.write(id, project);
            self.project_count.write(id);

            self.emit(ProjectCreated {
                project_id: id,
                title,
                funding_goal,
                recipient,
            });

            id
        }

        fn donate(ref self: ContractState, project_id: u64, amount: u256, commitment: felt252) {
            let mut project = self.projects.read(project_id);
            assert(project.id != 0, 'Project does not exist');
            assert(!project.is_completed, 'Project already completed');

            assert(!self.commitments.read(commitment), 'Commitment used');
            self.commitments.write(commitment, true);

            project.funds_collected += amount;
            if project.funds_collected >= project.funding_goal {
                project.is_funded = true;
            }
            self.projects.write(project_id, project);

            self.emit(DonationReceived {
                project_id,
                amount,
                commitment,
            });
        }

        fn submit_proof(ref self: ContractState, project_id: u64, proof_hash: felt252) {
            let caller = get_caller_address();
            assert(caller == self.oracle.read(), 'Only oracle can submit proof');

            let mut project = self.projects.read(project_id);
            assert(project.id != 0, 'Project does not exist');
            assert(!project.is_completed, 'Project already completed');

            assert(proof_hash == project.proof_requirement_hash, 'Invalid proof hash');

            project.is_completed = true;
            self.projects.write(project_id, project);

            self.emit(ProofVerified {
                project_id,
                proof_hash,
            });

            self.release_funds(project_id);
        }

        fn release_funds(ref self: ContractState, project_id: u64) {
            let project = self.projects.read(project_id);
            assert(project.is_completed, 'Project not completed');
            assert(project.funds_collected > 0, 'No funds to release');

            self.emit(FundsReleased {
                project_id,
                amount: project.funds_collected,
                recipient: project.recipient,
            });
        }

        fn get_project(self: @ContractState, project_id: u64) -> Project {
            self.projects.read(project_id)
        }

        fn get_project_count(self: @ContractState) -> u64 {
            self.project_count.read()
        }
    }
}
