use starknet::ContractAddress;

#[starknet::interface]
pub trait IPIFP<TContractState> {
    fn issue_otp_token(
        ref self: TContractState,
        user: ContractAddress,
        action_type: u8,
        project_id: u64,
        token: felt252,
        expires_at: u64
    );
    fn create_project(
        ref self: TContractState,
        title: ByteArray,
        description: ByteArray,
        image_url: ByteArray,
        video_url: ByteArray,
        proof_links_blob: ByteArray,
        funding_goal: u256,
        fixed_donation_amount: u256,
        recipient: ContractAddress,
        proof_requirement_hash: felt252,
        otp_token: felt252
    ) -> u64;
    fn donate(ref self: TContractState, project_id: u64, amount: u256, commitment: felt252, otp_token: felt252);
    fn submit_proof(ref self: TContractState, project_id: u64, proof_hash: felt252, otp_token: felt252);
    fn upsert_wallet_email_hash(ref self: TContractState, user: ContractAddress, email_hash: felt252);
    fn get_wallet_email_hash(self: @TContractState, user: ContractAddress) -> felt252;
    fn has_donated(self: @TContractState, project_id: u64, donor: ContractAddress) -> bool;
    fn get_project(self: @TContractState, project_id: u64) -> Project;
    fn get_project_count(self: @TContractState) -> u64;
    fn get_activity_count(self: @TContractState, user: ContractAddress) -> u64;
    fn get_activity(self: @TContractState, user: ContractAddress, activity_id: u64) -> ActivityRecord;
}

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
}

#[derive(Drop, Serde, starknet::Store)]
pub struct Project {
    pub id: u64,
    pub title: ByteArray,
    pub description: ByteArray,
    pub image_url: ByteArray,
    pub video_url: ByteArray,
    pub proof_links_blob: ByteArray,
    pub funding_goal: u256,
    pub fixed_donation_amount: u256,
    pub funds_collected: u256,
    pub creator: ContractAddress,
    pub recipient: ContractAddress,
    pub proof_requirement_hash: felt252,
    pub is_completed: bool,
    pub is_funded: bool,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct ActivityRecord {
    pub id: u64,
    pub kind: u8,
    pub project_id: u64,
    pub amount: u256,
    pub timestamp: u64,
}

#[starknet::contract]
pub mod PIFP {
    use super::{ActivityRecord, IERC20Dispatcher, IERC20DispatcherTrait, Project, IPIFP};
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::contract_address_const;
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
        has_donated_by_project: LegacyMap<(u64, ContractAddress), bool>,
        otp_token_expiry: LegacyMap<(ContractAddress, u8, u64, felt252), u64>,
        wallet_email_hash: LegacyMap<ContractAddress, felt252>,
        activity_count: LegacyMap<ContractAddress, u64>,
        activities: LegacyMap<(ContractAddress, u64), ActivityRecord>,
        owner: ContractAddress,
        oracle: ContractAddress,
        payment_token: ContractAddress,
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
        pub title: ByteArray,
        pub description: ByteArray,
        pub image_url: ByteArray,
        pub video_url: ByteArray,
        pub proof_links_blob: ByteArray,
        pub funding_goal: u256,
        pub fixed_donation_amount: u256,
        pub creator: ContractAddress,
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
    fn constructor(
        ref self: ContractState, oracle_address: ContractAddress, payment_token_address: ContractAddress
    ) {
        self.owner.write(get_caller_address());
        self.oracle.write(oracle_address);
        self.payment_token.write(payment_token_address);
        self.project_count.write(0);
    }

    fn consume_otp_token(
        ref self: ContractState, user: ContractAddress, action_type: u8, project_id: u64, token: felt252
    ) {
        let now = get_block_timestamp();
        let expires_at = self.otp_token_expiry.read((user, action_type, project_id, token));
        assert(expires_at != 0, 'OTP token not found');
        assert(now <= expires_at, 'OTP token expired');
        self.otp_token_expiry.write((user, action_type, project_id, token), 0);
    }

    fn log_activity(ref self: ContractState, user: ContractAddress, kind: u8, project_id: u64, amount: u256) {
        let next_id = self.activity_count.read(user) + 1;
        self.activity_count.write(user, next_id);
        self.activities.write(
            (user, next_id),
            ActivityRecord {
                id: next_id,
                kind,
                project_id,
                amount,
                timestamp: get_block_timestamp(),
            }
        );
    }

    #[abi(embed_v0)]
    impl PIFPImpl of IPIFP<ContractState> {
        fn issue_otp_token(
            ref self: ContractState,
            user: ContractAddress,
            action_type: u8,
            project_id: u64,
            token: felt252,
            expires_at: u64
        ) {
            let caller = get_caller_address();
            assert(caller == self.oracle.read(), 'Only oracle can issue OTP token');
            assert(token != 0, 'Invalid OTP token');
            assert(expires_at > get_block_timestamp(), 'Invalid OTP expiry');
            self.otp_token_expiry.write((user, action_type, project_id, token), expires_at);
        }

        fn create_project(
            ref self: ContractState,
            title: ByteArray,
            description: ByteArray,
            image_url: ByteArray,
            video_url: ByteArray,
            proof_links_blob: ByteArray,
            funding_goal: u256,
            fixed_donation_amount: u256,
            recipient: ContractAddress,
            proof_requirement_hash: felt252,
            otp_token: felt252
        ) -> u64 {
            let creator = get_caller_address();
            consume_otp_token(ref self, creator, 1, 0, otp_token);
            assert(fixed_donation_amount > 0, 'Invalid donation amount');
            let id = self.project_count.read() + 1;
            
            let project = Project {
                id,
                title: title.clone(),
                description: description.clone(),
                image_url: image_url.clone(),
                video_url: video_url.clone(),
                proof_links_blob: proof_links_blob.clone(),
                funding_goal,
                fixed_donation_amount,
                funds_collected: 0,
                creator,
                recipient,
                proof_requirement_hash,
                is_completed: false,
                is_funded: false,
            };

            self.projects.write(id, project);
            self.project_count.write(id);
            log_activity(ref self, creator, 1, id, 0);

            self.emit(ProjectCreated {
                project_id: id,
                title,
                description,
                image_url,
                video_url,
                proof_links_blob,
                funding_goal,
                fixed_donation_amount,
                creator,
                recipient,
            });

            id
        }

        fn donate(ref self: ContractState, project_id: u64, amount: u256, commitment: felt252, otp_token: felt252) {
            let mut project = self.projects.read(project_id);
            assert(project.id != 0, 'Project does not exist');
            assert(!project.is_completed, 'Project already completed');
            assert(amount == project.fixed_donation_amount, 'Use fixed donation amount');

            let donor = get_caller_address();
            consume_otp_token(ref self, donor, 2, project_id, otp_token);
            assert(
                !self.has_donated_by_project.read((project_id, donor)),
                'Donor already donated'
            );

            // Pull donor funds into protocol escrow.
            let payment_token_address = self.payment_token.read();
            if payment_token_address != contract_address_const::<0>() {
                let token = IERC20Dispatcher { contract_address: payment_token_address };
                let transferred = token.transfer_from(donor, get_contract_address(), amount);
                assert(transferred, 'Token transfer_from failed');
            }

            assert(!self.commitments.read(commitment), 'Commitment used');
            self.commitments.write(commitment, true);
            self.has_donated_by_project.write((project_id, donor), true);

            project.funds_collected += amount;
            if project.funds_collected >= project.funding_goal {
                project.is_funded = true;
            }
            self.projects.write(project_id, project);
            log_activity(ref self, donor, 2, project_id, amount);

            self.emit(DonationReceived {
                project_id,
                amount,
                commitment,
            });
        }

        fn submit_proof(ref self: ContractState, project_id: u64, proof_hash: felt252, otp_token: felt252) {
            let caller = get_caller_address();
            assert(caller == self.oracle.read(), 'Only oracle can submit proof');
            consume_otp_token(ref self, caller, 3, project_id, otp_token);

            let mut project = self.projects.read(project_id);
            assert(project.id != 0, 'Project does not exist');
            assert(!project.is_completed, 'Project already completed');

            assert(proof_hash == project.proof_requirement_hash, 'Invalid proof hash');

            let creator = project.creator;
            let releasable_funds = project.funds_collected;
            project.is_completed = true;
            self.projects.write(project_id, project);
            log_activity(ref self, creator, 3, project_id, releasable_funds);

            self.emit(ProofVerified {
                project_id,
                proof_hash,
            });

            self.release_funds(project_id);
        }

        fn upsert_wallet_email_hash(ref self: ContractState, user: ContractAddress, email_hash: felt252) {
            let caller = get_caller_address();
            assert(caller == self.oracle.read(), 'Only oracle');
            assert(email_hash != 0, 'Invalid email hash');
            self.wallet_email_hash.write(user, email_hash);
        }

        fn get_wallet_email_hash(self: @ContractState, user: ContractAddress) -> felt252 {
            self.wallet_email_hash.read(user)
        }

        fn get_project(self: @ContractState, project_id: u64) -> Project {
            self.projects.read(project_id)
        }

        fn has_donated(self: @ContractState, project_id: u64, donor: ContractAddress) -> bool {
            self.has_donated_by_project.read((project_id, donor))
        }

        fn get_project_count(self: @ContractState) -> u64 {
            self.project_count.read()
        }

        fn get_activity_count(self: @ContractState, user: ContractAddress) -> u64 {
            self.activity_count.read(user)
        }

        fn get_activity(self: @ContractState, user: ContractAddress, activity_id: u64) -> ActivityRecord {
            self.activities.read((user, activity_id))
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn release_funds(ref self: ContractState, project_id: u64) {
            let mut project = self.projects.read(project_id);
            assert(project.is_completed, 'Project not completed');
            assert(project.funds_collected > 0, 'No funds to release');

            // Push escrowed funds to recipient after successful proof.
            let payment_token_address = self.payment_token.read();
            if payment_token_address != contract_address_const::<0>() {
                let token = IERC20Dispatcher { contract_address: payment_token_address };
                let transferred = token.transfer(project.recipient, project.funds_collected);
                assert(transferred, 'Token transfer failed');
            }

            self.emit(FundsReleased {
                project_id,
                amount: project.funds_collected,
                recipient: project.recipient,
            });
            log_activity(ref self, project.recipient, 4, project_id, project.funds_collected);

            // Prevent re-release.
            project.funds_collected = 0;
            self.projects.write(project_id, project);
        }
    }
}
