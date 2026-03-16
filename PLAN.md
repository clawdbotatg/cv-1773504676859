# PLAN.md — LegacyFeeBurner

**Job:** `cv-1773504676859` (on-chain ID: 7)
**Client:** `0x9ba58Eea1Ea9ABDEA25BA83603D54F6D9A01E506`
**Stack:** Solidity + Foundry · Scaffold-ETH 2 · Base mainnet
**Deployer of contract:** `job.client` — always read from on-chain job data, never hardcode

---

## Overview

A proxy contract on Base that acts as the registered `creator` for a Clanker v3.1 token (₸USD), enabling a hot wallet to claim legacy fees and send them directly to BurnEngine V2 for burning in a single transaction. Hardware wallet retains full control to recover or transfer creator status. Includes a 7-day dead man's switch that opens up the claim+burn to anyone. Paired with a minimal one-button SE2 frontend on Vercel/BGIPFS.

### Context (related jobs)
- **Job 5 (cv-1773321831954):** TurboUSD AI Federal Meme Reserve Agent — BurnEngine V1 + Telegram bot + dashboard
- **Job 6 (cv-1773510123450 / burnengine-v2):** BurnEngine V2 — permissionless hyperstructure, deployed to Base at `0xb9Ca0A8c39A06892a205d173F95424D5AccC141f`
- **Job 7 (this job):** LegacyFeeBurner — proxy that feeds into BurnEngine V2

---

## Known Addresses (all Base mainnet)

| Name | Address |
|------|---------|
| BurnEngine V2 | `0xb9Ca0A8c39A06892a205d173F95424D5AccC141f` |
| Clanker Factory (v3.1) | `0x10F4485d6f90239B72c6A5eaD2F2320993D285E4` |
| Gnosis Safe (fee holder) | `0x1eaf444ebDf6495C57aD52A04C61521bBf564ace` |
| ₸USD token | `0x3d5e487B21E0569048c4D1A60E98C36e1B09DB07` |
| Client wallet | `0x9ba58Eea1Ea9ABDEA25BA83603D54F6D9A01E506` |

## TBDs — Required Before `deploy_contract` Stage

The following must come from the client (via escalation response) before deployment:

| Field | Status | Notes |
|-------|--------|-------|
| `_owner` (hardware wallet address) | **NEEDED** | Constructor arg — retains full control of the proxy |
| `_operator` (hot wallet address) | **NEEDED** | Constructor arg — can call `claimLegacyAndBurn()` and `recoverCreator()` |

All other addresses are known and hardcoded as immutables in the contract.

---

## Smart Contract: LegacyFeeBurner.sol

**Location:** `packages/foundry/contracts/LegacyFeeBurner.sol`

### Purpose
Acts as the registered Clanker creator for ₸USD. Enables:
1. Hot wallet calls `claimLegacyAndBurn()` → single tx: transfer creator to Safe → call `BurnEngine.executeFullCycle()`
2. Dead man's switch: anyone can call `claimLegacyAndBurn()` after 7 days of inactivity
3. Hardware wallet (owner) retains full recovery and transfer rights

### Key Design Decisions
- **No arbitrary calls** — only hardcoded interactions with clankerFactory and BurnEngine V2
- **No upgradability, no pause, no admin token withdrawal**
- **No fallback/receive** — cannot accept ETH or arbitrary calls
- **Ownable2Step** for safe ownership transfers
- **ReentrancyGuard** on `claimLegacyAndBurn()` (two external calls in sequence)
- Dead man's switch is safe: destination (BurnEngine V2) is immutable, cannot be redirected

### State Variables

```solidity
// Immutables (set at construction, never changeable)
address public immutable clankerFactory;  // 0x10F4485d6f90239B72c6A5eaD2F2320993D285E4
address public immutable burnEngine;      // 0xb9Ca0A8c39A06892a205d173F95424D5AccC141f
address public immutable safe;            // 0x1eaf444ebDf6495C57aD52A04C61521bBf564ace
address public immutable token;           // 0x3d5e487B21E0569048c4D1A60E98C36e1B09DB07

// Mutable
address public owner;           // hardware wallet — set via Ownable2Step
address public pendingOwner;    // for 2-step ownership transfer
address public operator;        // hot wallet — can claim+burn and recover creator
uint256 public lastClaimTimestamp;  // tracks last claim for dead man's switch
uint256 public constant CLAIM_INTERVAL = 7 days;  // 604800 seconds
```

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `claimLegacyAndBurn()` | Operator: anytime. Anyone: after 7 days since last claim | `clankerFactory.tokenCreatorTransfer(safe, token, burnEngine)` → `burnEngine.executeFullCycle()`. Updates `lastClaimTimestamp`. |
| `recoverCreator()` | Operator only | `clankerFactory.updateTokenCreator(token, owner)` — always points back to owner |
| `transferCreator(address newCreator)` | Owner only | `clankerFactory.updateTokenCreator(token, newCreator)` — arbitrary new creator |
| `setOperator(address newOperator)` | Owner only | Update authorized operator address |
| `transferOwnership(address newOwner)` | Owner only | Sets `pendingOwner` — Step 1 of 2-step transfer |
| `acceptOwnership()` | Pending owner only | Confirms ownership — Step 2 of 2-step transfer |

### Access Control Logic for `claimLegacyAndBurn()`
```solidity
if (msg.sender != operator) {
    require(block.timestamp >= lastClaimTimestamp + CLAIM_INTERVAL, "Too early");
}
// Execute:
// 1. clankerFactory.tokenCreatorTransfer(safe, token, burnEngine)
// 2. burnEngine.executeFullCycle()
// 3. lastClaimTimestamp = block.timestamp
```

### Events
- `LegacyFeesClaimed(address indexed token, address indexed burnEngine, uint256 timestamp)`
- `FullCycleTriggered(address indexed burnEngine)`
- `CreatorTransferred(address indexed token, address indexed newCreator)`
- `CreatorRecovered(address indexed token, address indexed owner)`
- `OperatorUpdated(address indexed previousOperator, address indexed newOperator)`
- `OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)`
- `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`

### Clanker Factory Interface (critical)
```solidity
interface IClankerFactory {
    // Used in claimLegacyAndBurn()
    function tokenCreatorTransfer(address safe, address token, address recipient) external;
    // selector: 0xcb349ff9
    
    // Used in recoverCreator() and transferCreator()
    function updateTokenCreator(address token, address newCreator) external;
}
```

---

## Foundry Tests

**Location:** `packages/foundry/test/LegacyFeeBurner.t.sol`
**Fork:** Base mainnet fork — tests against REAL Clanker factory and BurnEngine V2 state

### Required Test Coverage (≥90%)

1. **Deployment** — constructor sets all immutables correctly
2. **Access control — claimLegacyAndBurn()**
   - Operator can call at any time
   - Non-operator fails before 7 days (reverts)
   - Non-operator succeeds after 7 days
   - Updates `lastClaimTimestamp` on success
3. **Access control — recoverCreator()**
   - Operator can call
   - Owner can call
   - Random address reverts
4. **Access control — transferCreator()**
   - Owner can call
   - Operator cannot call
   - Random address reverts
5. **Access control — setOperator()**
   - Owner can update operator
   - Non-owner reverts
6. **Ownable2Step**
   - `transferOwnership` sets pendingOwner
   - `acceptOwnership` transfers correctly
   - Wrong address cannot `acceptOwnership`
7. **Function selector verification**
   - `tokenCreatorTransfer` selector matches `0xcb349ff9`
   - Call encoding verified against live factory state on fork
8. **Dead man's switch edge cases**
   - Exactly at 7 days (block.timestamp = lastClaim + 7 days): should succeed
   - 1 second before 7 days: should revert
9. **Reentrancy guard** — `claimLegacyAndBurn()` cannot be called recursively

### Pre-Deploy Dry Run Test (Critical)
Per the security notes in the build plan: before ever transferring creator to the proxy, verify the round-trip:
1. Call `claimLegacyAndBurn()` BEFORE creator is transferred → should revert (proxy not authorized as creator)
2. This confirms the revert path works and the proxy contract is safe to register

---

## Deploy Script

**Location:** `packages/foundry/script/DeployLegacyFeeBurner.s.sol`

```solidity
// Constructor args — set via env vars or deploy config, NEVER hardcoded
address owner = vm.envAddress("LEGACY_OWNER");    // TBD: hardware wallet
address operator = vm.envAddress("LEGACY_OPERATOR"); // TBD: hot wallet
// All other addresses are immutable constants in the contract
```

**Target:** Base mainnet (chain ID 8453)
**Verification:** `forge verify-contract` on Basescan after deployment

---

## Frontend: SE2 Single Page App

**Location:** `packages/nextjs/`
**Chain:** Base mainnet (`chains.base`)
**Deploy target:** Vercel (per client's build plan) OR BGIPFS

### External Contracts (in `externalContracts.ts`)
- `LegacyFeeBurner` — deployed address (available after `deploy_contract` stage)
- `BurnEngineV2` at `0xb9Ca0A8c39A06892a205d173F95424D5AccC141f`

### Three Views (single page, conditional on connected wallet)

#### Public View (no wallet OR unrecognized wallet)
- Display: `lastClaimTimestamp`, time elapsed, time until permissionless claim opens (7-day countdown)
- Display: `operator`, `owner` addresses using `<Address/>` component
- If 7+ days since last claim: show "Claim & Burn All" button (permissionless) with loader/disabled state
- If under 7 days: show countdown timer + "Claim available [date/time]"
- Correct network banner if on wrong chain

#### Operator View (hot wallet connected)
- Primary button: **"Claim & Burn All"** → calls `claimLegacyAndBurn()`
  - Transaction status flow: pending → "Claiming legacy fees..." → "Triggering BurnEngine..." → ✅ Done → BaseScan link
  - Separate loading state per Rule 1 (frontend-ux)
- Secondary button: **"Emergency: Recover Creator to Owner"** → calls `recoverCreator()`
  - Confirm dialog before executing (irreversible action)
- Display: operator address, owner address, `lastClaimTimestamp`, time until permissionless window

#### Owner View (hardware wallet connected)
- **"Transfer Creator"** → `<AddressInput/>` → calls `transferCreator(address)`
  - Warning: "This transfers creator rights to an external address. Use Recover Creator to get back."
- **"Set New Operator"** → `<AddressInput/>` → calls `setOperator(address)`
- **"Transfer Ownership (Step 1)"** → `<AddressInput/>` → calls `transferOwnership(address)`
  - Show `pendingOwner` if set, with "Accept Ownership" button
- Display: same status info as public view

#### Wrong Network
- Prompt to switch to Base (chain ID 8453) — per four-state flow in frontend-ux

### UX Rules (from ethskills frontend-ux)
- Every onchain button: separate loading state, disabled during tx, show spinner
- Never show Approve+Action simultaneously
- All addresses: `<Address/>` for display, `<AddressInput/>` for input
- No duplicate h1 title
- DaisyUI semantic colors — no hardcoded dark backgrounds
- Fix pill-shaped inputs: `--radius-field: 0.5rem` in both theme blocks
- Error translation: parse contract custom errors to human-readable text
- No public RPCs in production: use Alchemy via env var

### scaffold.config.ts
```typescript
targetNetworks: [chains.base],
rpcOverrides: {
  [chains.base.id]: process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org",
},
pollingInterval: 3000,
burnerWalletMode: "localNetworksOnly",
```

---

## Build Phases (ethskills orchestration)

### Phase 1: Local (Base Fork)
- Run: `yarn fork --network base` + `yarn deploy` + `yarn start`
- Set `targetNetworks: [chains.foundry]` during development
- Test all three views against fork with real Clanker/BurnEngine state
- Use `cast rpc anvil_setIntervalMining 1` for timestamp-dependent logic (7-day switch)

### Phase 2: Live Contracts + Local UI
- Deploy `LegacyFeeBurner.sol` to Base mainnet with real `_owner` and `_operator` addresses
- Set `targetNetworks: [chains.base]`
- Run test suite against live contract
- **DO NOT transfer creator to proxy until round-trip test passes**

### Phase 3: Production Deploy
- Build IPFS export or Vercel deploy
- Set OG image, correct metadata, remove SE2 branding
- Verify all routes work

---

## Security Notes (from build plan)

- **Trapped creator risk:** Before claiming any fees, verify round-trip: transfer creator to proxy → immediately call `recoverCreator()` from operator → verify creator returns to owner on BaseScan. This costs just gas, no risk to fees.
- **Hot wallet compromise:** Attacker can only call `claimLegacyAndBurn()` (burns to BurnEngine — desired) or `recoverCreator()` (returns to owner — safe). Zero damage possible.
- **Owner compromise:** Attacker could call `transferCreator()` to redirect creator. Mitigated by hardware wallet.
- **Dead man's switch:** After 7 days anyone can trigger — safe because BurnEngine V2 address is immutable.
- **No token custody:** ₸USD goes directly from Safe → BurnEngine via `tokenCreatorTransfer`. Proxy never holds tokens.
- **Reentrancy:** ReentrancyGuard on `claimLegacyAndBurn()` — two sequential external calls.

---

## Stage Checklist

- [x] `create_repo` — `clawdbotatg/cv-1773504676859` created
- [x] `create_plan` — this file
- [ ] `create_user_journey` — USERJOURNEY.md
- [ ] `prototype` — contract + tests + frontend
- [ ] `contract_audit` — ethskills.com/audit/SKILL.md line-by-line
- [ ] `contract_fix` — fix audit findings
- [ ] `deep_contract_audit` — evaluate if needed (contract is ~100 lines, relatively simple, but has external calls — evaluate at audit time)
- [ ] `frontend_audit` — ethskills.com/qa/SKILL.md + frontend-ux + frontend-playbook
- [ ] `frontend_fix`
- [ ] `full_audit`
- [ ] `full_audit_fix`
- [ ] `deploy_contract` — **BLOCKED on `_owner` and `_operator` addresses from client**
- [ ] `livecontract_fix`
- [ ] `deploy_app`
- [ ] `liveapp_fix`
- [ ] `liveuserjourney`
- [ ] `readme`
- [ ] `ready`

---

## Notes

- **Worker wallet blocker:** On-chain `acceptJob(7)` and `logWork()` require a registered worker wallet. Austin is provisioning this — build proceeds in parallel.
- **BurnEngine V2 ABI:** Use `getStatus()`, `executeFullCycle()` from `burnengine-v2` repo for `externalContracts.ts`.
- **Fork testing selector:** `tokenCreatorTransfer` selector `0xcb349ff9` must be verified against live factory via Base mainnet fork test.
