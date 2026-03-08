# Proof-of-Impact Funding Protocol (PIFP)

## Starknet Re{define} Hackathon Project Document
**Primary Track: Wildcard**

---

## 1. Project Overview

**Proof-of-Impact Funding Protocol (PIFP)** is a Starknet funding platform that ensures donated funds are only released when verifiable real-world impact occurs.

Traditional donation systems rely on trust in intermediaries such as NGOs, governments, or organizations. PIFP reduces trust assumptions with Starknet smart contracts, evidence hashing, and on-chain release conditions.

The system locks funds and releases them automatically when verified proof of project completion is submitted and validated.

---

## 2. Problem Statement

Global aid and funding suffer from major issues:

* Misuse of donated funds
* Fake project reporting
* Lack of transparency
* Donor distrust
* Corruption in fund distribution

Because donors cannot verify outcomes, confidence in charitable and development funding continues to decline.

---

## 3. Solution

PIFP introduces **conditional funding**:

Funds are locked until verifiable proof of impact is confirmed on-chain.

### Key Principle

> Money moves only when impact is proven.

This removes the need for trust in intermediaries and creates a transparent global funding infrastructure.

---

## 4. How It Works

### Step 1: Create Project

A project creator registers a project with:

* Title
* Description
* Funding goal
* Proof requirement hash
* Recipient address

### Step 2: Donors Fund Project

Users deposit Bitcoin-backed value into a Starknet-controlled funding pool.
Donations are anonymous via commitment scheme.

### Step 3: Proof Submission

When the project is completed, the implementer submits proof (photo, sensor data, signed attestation, etc.).

Backend oracle hashes proof and submits it to Starknet.

### Step 4: Verification

Smart contract checks proof hash matches required proof condition.

### Step 5: Automatic Release

If valid, funds are automatically released to the project recipient.

---

## 5. Current Privacy Guarantees

PIFP currently uses **selective disclosure** and **hash commitments**, not full confidential transactions.

What is private in this version:

* Raw proof payload is hashed in-browser before submission
* Only proof hash is submitted on-chain (`felt252`)
* Project evidence can be disclosed off-chain while integrity stays anchored on-chain

What is public in this version:

* Donation transactions and sender addresses on Starknet
* Project funding totals and completion status

This model improves integrity and reduces unnecessary data exposure, but it is not a full anonymity system.

---

## 6. Bitcoin Roadmap

This submission focuses on Starknet-native funding logic. Bitcoin-native settlement is planned as a next milestone.

Planned direction:

1. BTC representation on Starknet
2. Proof-gated release logic for BTC-backed value
3. Optional bridge/routing integrations for Bitcoin liquidity

---

## 7. Smart Contract Architecture (Cairo)

### Storage

* Project Registry
* Donation Commitments
* Project Status
* Proof Hash Records

### Core Functions

* create_project()
* donate(commitment)
* submit_proof(proof_hash)
* verify_and_release()
* refund_if_expired()

---

## 8. Backend Oracle (Rust Service)

Responsible for:

* Proof hashing
* Metadata storage
* Starknet contract interaction
* Optional Bitcoin monitoring

Implemented in Rust for memory safety and performance.

The backend does not control funds.
It only relays verifiable data.

---

## 9. Frontend (React)

Minimal interface:

1. Create project
2. Fund project anonymously
3. Submit proof
4. Trigger payout

---

## 10. Security Considerations

* Funds locked in smart contract (non-custodial)
* Hash-based proof verification
* Replay protection using nullifiers
* Expiry refund mechanism
* No admin withdrawal privileges

---

## 11. Demo Flow (3-Minute Video)

1. Create water project
2. Donors fund anonymously
3. Funds locked on-chain
4. Installer uploads proof
5. Contract verifies proof
6. Automatic payout

---

## 12. Hackathon Track Alignment

### Primary: Wildcard

PIFP delivers a complete Starknet funding product with anti-scam controls:

* OTP-gated critical actions
* Evidence-linked project creation
* One-donation-per-wallet per project
* Fixed per-project donation amount chosen by project creator
* On-chain proof-gated release flow

### Secondary Narrative: Privacy-Aware Design

PIFP uses hashed proof commitments and selective disclosure to minimize exposed sensitive data.

### Future Narrative: Bitcoin

Bitcoin-backed settlement is a roadmap extension after this hackathon build.

---

## 13. Expected Impact

PIFP can be used for:

* Charity funding
* Infrastructure development
* Community projects
* Disaster relief
* Climate resilience initiatives

It replaces trust-based funding with cryptographic accountability.

---

## 14. Submission Requirements Checklist

* Starknet deployed contract
* Public GitHub repository
* Demo video (3 minutes)
* Project description (≤500 words)
* Starknet wallet address

## 15. Local Oracle Testing

To test the oracle service locally without touching the deployed setup, run it with a separate local env file.

The Rust service now loads env in this order:

1. `ORACLE_ENV_FILE` if set
2. `.env.local` if present
3. `.env`

Use a local-only file such as `oracle-service/.env.local` with a separate test RPC, test account, and test contract:

```env
ORACLE_RPC_URL=https://your-testnet-rpc
ORACLE_ACCOUNT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...
ORACLE_PIFP_CONTRACT_ADDRESS=0x...
ORACLE_CALLER_ADDRESS=0x...
PORT=3001
```

Run locally from the `oracle-service` directory:

```bash
cargo run
```

Or force a specific file:

```bash
ORACLE_ENV_FILE=.env.local cargo run
```

If the bridge logs `Account: invalid signature`, the issue is not the deployed contract. It means the local `ORACLE_PRIVATE_KEY` does not control `ORACLE_ACCOUNT_ADDRESS`, or that account uses a signer setup this bridge does not support.

---

## 15. Conclusion

PIFP transforms global funding into a verifiable system where impact, not promises, controls payments.

By combining Starknet execution, proof-gated release logic, and privacy-aware hashing, the protocol enables transparent and trust-minimized aid distribution.

---

## 16. Privacy Limitations & Next Steps

Current limitations:

* Donor addresses are visible on public chain data
* No zero-knowledge proof verification circuit in this version
* No encrypted on-chain state for donations

Next steps:

* Add zk-proof based evidence verification
* Add optional encrypted evidence bundles with access control
* Introduce stronger private donation patterns while preserving auditability

---

## 17. Security & Authentication Model (Tight Security Implementation)

The platform implements multi-layer security combining Web2 authentication protections and Web3 cryptographic guarantees.

### A. Wallet Signature Authentication (Primary Identity)

Users authenticate using Starknet wallet signatures instead of passwords.

Flow:

1. Server generates nonce
2. User signs nonce with wallet
3. Signature verified on backend
4. Session created

Prevents impersonation and password leaks.

---

### B. OTP Transaction Authorization (Critical Actions)

Every sensitive action requires One-Time Password (OTP) confirmation:

Protected actions:

* Project creation
* Donation submission
* Proof submission
* Fund release trigger
* Refund request

OTP delivered via:

* Email
* Authenticator app (TOTP preferred)

OTP expires in 60 seconds and cannot be reused.

---

### C. Transaction Intent Hash (Anti‑Phishing Layer)

Before any contract interaction, user must approve a transaction intent:

intent_hash = hash(user + action + amount + timestamp)

User signs intent before sending transaction.
Prevents hidden or injected transactions.

---

### D. Replay Protection (Nullifiers)

Each action generates a unique nullifier:

nullifier = hash(secret + action_id)

Stored on-chain to prevent duplicate execution.

---

### E. Rate Limiting & Abuse Prevention

Rust backend protections:

* IP rate limiting
* OTP request cooldown
* Signature attempt throttling
* Bot detection

---

### F. Session Security

* HttpOnly cookies
* Short session expiry
* Device binding
* Re‑authentication for critical actions

---

### G. Smart Contract Security

* No admin withdrawal permissions
* Funds only move via verified conditions
* Immutable payout logic
* Expiry refund mechanism

---

### H. Security Goal

Even if the backend is compromised, attackers cannot steal funds because:

* Funds are controlled by smart contracts
* Transactions require wallet signatures
* Critical actions require OTP confirmation
* Nullifiers prevent replay attacks

This creates defense‑in‑depth protection combining cryptographic security and user authentication safeguards.
# Proof-of-Impact-Funding-Protocol-PIFP-
// Finalizing commit 30: repository overview and push
