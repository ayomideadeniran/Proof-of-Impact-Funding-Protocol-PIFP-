# Proof-of-Impact Funding Protocol (PIFP)

## Starknet Re{define} Hackathon Project Document

---

## 1. Project Overview

**Proof-of-Impact Funding Protocol (PIFP)** is a trust-minimized global funding platform that ensures donated funds are only released when verifiable real-world impact occurs.

Traditional donation systems rely on trust in intermediaries such as NGOs, governments, or organizations. PIFP replaces trust with cryptographic verification using Starknet smart contracts and Bitcoin-backed funding pools.

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

## 5. Privacy Model

Donor identity is hidden using a commitment/nullifier scheme.

### Donation Commitment

commitment = hash(secret + amount + project_id)

The contract stores only the commitment, not the user identity.

Later, the donor can prove participation without revealing identity.

Benefits:

* Anonymous donations
* Prevents tracking
* Privacy-preserving philanthropy

---

## 6. Bitcoin Integration

Bitcoin acts as the funding asset.

Starknet smart contract controls release conditions while Bitcoin provides monetary settlement.

Flow:

1. BTC deposited
2. Wrapped/represented on Starknet
3. Locked in contract
4. Released only after proof verification

This demonstrates Starknet as a Bitcoin execution layer.

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

### Privacy Track

Anonymous donations using commitments

### Bitcoin Track

Bitcoin-backed funding pools

### Wildcard Impact

Global corruption-resistant aid infrastructure

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

---

## 15. Conclusion

PIFP transforms global funding into a verifiable system where impact, not promises, controls payments.

By combining Bitcoin settlement, Starknet execution, and privacy-preserving commitments, the protocol enables transparent and trustless global aid distribution.

---

## 16. Security & Authentication Model (Tight Security Implementation)

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
