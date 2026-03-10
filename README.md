# Proof-of-Impact Funding Protocol (PIFP)

## Starknet Re{define} Hackathon Project Document
**Primary Track: Wildcard**

---

## Submission Summary (<=500 words)

Proof-of-Impact Funding Protocol (PIFP) is a Starknet application that makes funding conditional on verifiable impact. Instead of relying on donors to trust intermediaries, PIFP escrows funds on-chain and releases them only after the required proof of completion is submitted and validated.

In the current build, a creator opens a project with a funding goal, a fixed donation amount, a recipient, and a proof requirement hash. Donors contribute through an OTP-protected flow that enforces one donation per wallet per project. Donations are held in contract-controlled escrow using a configured ERC20 payment token. When the project implementer is ready to prove completion, the proof is hashed and submitted through the oracle-backed verification flow. If the submitted proof hash matches the expected hash stored for that project, the contract marks the project as completed and releases the escrowed funds to the recipient.

The stack consists of a Cairo smart contract on Starknet, a Rust oracle service for OTP issuance and proof submission, and a Next.js frontend for project creation, donation, and verification. The oracle does not custody funds. Its role is limited to issuing short-lived action tokens after OTP verification and relaying authorized proof-related actions to Starknet.

From a privacy perspective, this version is privacy-aware rather than fully private. Raw evidence is not posted on-chain. Instead, the frontend and backend work with proof hashes, so integrity is anchored publicly while sensitive source material can remain off-chain. This reduces unnecessary exposure, but donation amounts, wallet addresses, and project state remain public on Starknet.

PIFP fits the Wildcard track best because the shipped product is a complete Starknet funding workflow with practical anti-abuse controls: OTP-gated actions, on-chain escrow, one-donation-per-wallet enforcement, proof-gated payout, and wallet activity tracking. Bitcoin support is roadmap-only in this version and not the core of the submission.

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

Users donate a fixed ERC20 amount into a Starknet-controlled escrow contract.
The protocol enforces one donation per wallet per project and records a commitment marker to prevent reuse.

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
* issue_otp_token()
* release_funds() through proof verification

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
2. Fund project with a fixed ERC20 donation amount
3. Submit proof
4. Trigger payout

---

## 10. Security Considerations

* Funds locked in smart contract (non-custodial)
* Hash-based proof verification
* One-time OTP action tokens for protected actions
* One donation per wallet per project
* No admin withdrawal privileges

---

## 11. Demo Flow (3-Minute Video)

1. Create water project
2. Donors fund with the configured ERC20 payment token
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

## 14. Submission Details

| Item | Value |
| :--- | :--- |
| **Starknet Contract** | `0x06360d50942e8ffa2a7ba97d471b75647663d14cade852ef3877cc9ba065b30c` (Sepolia) |
| **Github Repository** | [PIFP Repository](https://github.com/ayomideadeniran/Proof-of-Impact-Funding-Protocol-PIFP-) |
| **Demo Video** | [Watch Demo Video](https://www.canva.com/design/DAHDjrg_Fg8/CnSZEWQmsk3EHgsr23g81g/watch?utm_content=DAHDjrg_Fg8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hc87cb11c6e) |
| **Starknet Wallet** | `0x55d8794dbdcea4eb7f855f7b667ae310e24253b105c57dc164cb8c4ac92a8c4` |
| **Project Description** | See Section [Submission Summary](#submission-summary-500-words) |

> [!TIP]
> **Action Required**: Replace the video placeholder link above with your actual 3-minute demo video once uploaded.

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

If you already have a local `sncast` account configured, you can bypass bridge private-key signing entirely:

```env
ORACLE_USE_SNCAST=true
ORACLE_SNCAST_BIN=sncast
ORACLE_SNCAST_ACCOUNT=pifp_deployer
ORACLE_RPC_URL=https://your-testnet-rpc
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

If `ORACLE_USE_SNCAST=true`, the bridge will invoke through your local `sncast` account instead of `starknet.js` signing. This is the preferred local path when your machine already has the correct Starknet account configured in `~/.starknet_accounts`.

If the bridge logs `Account: invalid signature`, the issue is not the deployed contract. It means the local `ORACLE_PRIVATE_KEY` does not control `ORACLE_ACCOUNT_ADDRESS`, or that account uses a signer setup this bridge does not support.

## 16. Render Deployment

The repo now includes [render.yaml](/home/knights/Documents/Project/Proof-of-Impact Funding Protocol (PIFP)/render.yaml) plus Render helper scripts in [render-build.sh](/home/knights/Documents/Project/Proof-of-Impact Funding Protocol (PIFP)/oracle-service/scripts/render-build.sh) and [render-start.sh](/home/knights/Documents/Project/Proof-of-Impact Funding Protocol (PIFP)/oracle-service/scripts/render-start.sh).

This setup:

* installs `sncast` during Render build
* copies the binary into `oracle-service/.render/bin/sncast`
* sets `ORACLE_SNCAST_BIN` automatically at runtime if not already set
* can write an accounts file from `ORACLE_SNCAST_ACCOUNTS_JSON` at startup

Recommended Render env for `sncast` mode:

```env
ORACLE_USE_SNCAST=true
ORACLE_SNCAST_ACCOUNT=pifp_deployer
ORACLE_RPC_URL=https://your-testnet-rpc
ORACLE_PIFP_CONTRACT_ADDRESS=0x...
ORACLE_CALLER_ADDRESS=0x...
ORACLE_SNCAST_ACCOUNTS_JSON={"alpha-sepolia":{"pifp_deployer":{"address":"0x...","class_hash":"0x...","deployed":true,"legacy":false,"private_key":"0x...","public_key":"0x...","salt":"0x...","type":"open_zeppelin"}}}
```

If you already provision the accounts file another way, set `ORACLE_ACCOUNTS_FILE` instead of `ORACLE_SNCAST_ACCOUNTS_JSON`.

---

## 17. Conclusion

PIFP transforms global funding into a verifiable system where impact, not promises, controls payments.

By combining Starknet execution, proof-gated release logic, and privacy-aware hashing, the protocol enables transparent and trust-minimized aid distribution.

---

## 18. Privacy Limitations & Next Steps

Current limitations:

* Donor addresses are visible on public chain data
* No zero-knowledge proof verification circuit in this version
* No encrypted on-chain state for donations

Next steps:

* Add zk-proof based evidence verification
* Add optional encrypted evidence bundles with access control
* Introduce stronger private donation patterns while preserving auditability

---

## 19. Security & Authentication Model

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

OTP is currently delivered by email through the oracle service.
Action tokens are short-lived and consumed once on-chain.

---

### C. Replay Resistance

The current build uses:

* one-time OTP action tokens for protected actions
* one donation per wallet per project enforcement
* commitment tracking to prevent commitment reuse

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

---

### H. Security Goal

Even if the backend is compromised, attackers cannot steal funds because:

* Funds are controlled by smart contracts
* Transactions require wallet signatures
* Critical actions require OTP confirmation
* One-time action tokens and donation guards reduce replay/abuse risk

This creates defense‑in‑depth protection combining cryptographic security and user authentication safeguards.
