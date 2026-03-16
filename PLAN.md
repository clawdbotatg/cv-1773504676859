# PLAN.md — LegacyFeeBurner

**Job:** `cv-1773504676859` (on-chain ID: 7)
**Client:** `0x9ba58Eea1Ea9ABDEA25BA83603D54F6D9A01E506`
**Stack:** Solidity + Foundry · Scaffold-ETH 2 · Base mainnet
**Deployer of contract:** `job.client` — always read from on-chain job data, never hardcode

---

## Overview

A proxy contract on Base that acts as the registered `creator` for a Clanker v3.1 token, enabling anyone to claim legacy fees and send them directly to BurnEngine for burning in a single transaction. Hardware wallet retains full control to recover or transfer creator status.

**Key design change from original plan:** `claimLegacyAndBurn()` is **fully permissionless — callable by anyone at any time**. No dead man's switch, no CLAIM_INTERVAL, no time restriction.

Paired with a minimal one-button SE2 frontend deployed to Vercel/BGIPFS.

### Context (related jobs)
- **Job 5 (cv-1773321831954):** TurboUSD AI Federal Meme Reserve Agent — BurnEngine V1 + Telegram bot + dashboard
- **Job 6 (cv-1773510123450 / burnengine-v2):** BurnEngine V2 — permissionless hyperstructure
- **Job 7 (this job):** LegacyFeeBurner — proxy that feeds into a BurnEngine

---

## Deployment Addresses

All addresses confirmed via job messages. Constructor accepts them as args (immutables set at construction).

| Field | Address | Notes |
|-------|---------|-------|
| `_owner` | `0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3` | Hardware wallet — full control |
| `_operator` | `0xeB99a27AD482534FBf40213d6714e130A43Db0d8` | Hot wallet — can call recoverCreator() |
| `_burnEngine` | `0x1f068DB935DD585941eC386eB14ca595F350D63e` | Test BurnEngine |
| `_token` | `0x2b7f32C4C05Ab1ebB3E6a5E268e343b35CDA19Db` | Test token |
| `_safe` | `0x1eaf444ebDf6495C57aD52A04C61521bBf564ace` | Gnosis Safe (legacy fee holder) |
| `clankerFactory` (hardcoded constant) | `0x10F4485d6f90239B72c6A5eaD2F2320993D285E4` | Clanker v3.1 factory — never changes |

**No more TBDs — all addresses confirmed.**

---

## Smart Contract: LegacyFeeBurner.sol

**Location:** `packages/foundry/contracts/LegacyFeeBurner.sol`

### Purpose
Acts as the registered Clanker creator for the token. Enables:
1. **Anyone** can call `claimLegacyAndBurn()` at any time → single tx: transfer creator to Safe → call `BurnEngine.executeFullCycle()`
2. Operator can call `recoverCreator()` → returns creator to owner
3. Hardware wallet (owner) retains full recovery and transfer rights

### Key Design Decisions
- **`claimLegacyAndBurn()` is fully permissionless** — no time lock, no operator restriction, callable by anyone
- **No arbitrary calls** — only hardcoded interactions with clankerFactory and BurnEngine
- **No upgradability, no pause, no admin token withdrawal**
- **No fallback/receive** — cannot accept ETH or arbitrary calls
- **Ownable2Step** for safe ownership transfers
- **ReentrancyGuard** on `claimLegacyAndBurn()` (two external calls in sequence)
- Constructor args: `_owner`, `_operator`, `_burnEngine`, `_token`, `_safe` — all set as immutables

### State Variables

```solidity
// Immutables (set at construction, never changeable)
address public immutable clankerFactory;  // hardcoded: 0x10F4485d6f90239B72c6A5eaD2F2320993D285E4
address public immutable burnEngine;      // from constructor: _burnEngine
address public immutable safe;            // from constructor: _safe
address public immutable token;           // from constructor: _token

// Mutable
address public owner;           // hardware wallet — set via Ownable2Step
address public pendingOwner;    // for 2-step ownership transfer
address public operator;        // hot wallet — can call recoverCreator()
// NOTE: No lastClaimTimestamp, no CLAIM_INTERVAL — claiming is fully permissionless
```

### Constructor

```solidity
constructor(
    address _owner,        // 0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3
    address _operator,     // 0xeB99a27AD482534FBf40213d6714e130A43Db0d8
    address _burnEngine,   // 0x1f068DB935DD585941eC386eB14ca595F350D63e
    address _token,        // 0x2b7f32C4C05Ab1ebB3E6a5E268e343b35CDA19Db
    address _safe          // 0x1eaf444ebDf6495C57aD52A04C61521bBf564ace
)
```

### Functions

| Function | Access | Description |
|----------|--------|-------------|
| `claimLegacyAndBurn()` | **Anyone, anytime** (fully permissionless) | `clankerFactory.tokenCreatorTransfer(safe, token, burnEngine)` → `burnEngine.executeFullCycle()` |
| `recoverCreator()` | Operator or owner | `clankerFactory.updateTokenCreator(token, owner)` — always points back to current owner |
| `transferCreator(address newCreator)` | Owner only | `clankerFactory.updateTokenCreator(token, newCreator)` — arbitrary new creator |
| `setOperator(address newOperator)` | Owner only | Update authorized operator address |
| `transferOwnership(address newOwner)` | Owner only | Sets `pendingOwner` — Step 1 of 2-step transfer |
| `acceptOwnership()` | Pending owner only | Confirms ownership — Step 2 of 2-step transfer |

### Access Control for `claimLegacyAndBurn()`
```solidity
// Fully permissionless — no msg.sender check, no time check
function claimLegacyAndBurn() external nonReentrant {
    // 1. clankerFactory.tokenCreatorTransfer(safe, token, burnEngine)
    // 2. burnEngine.executeFullCycle()
}
```

### Events
- `LegacyFeesClaimed(address indexed caller, address indexed token, address indexed burnEngine, uint256 timestamp)`
- `FullCycleTriggered(address indexed burnEngine)`
- `CreatorTransferred(address indexed token, address indexed newCreator)`
- `CreatorRecovered(address indexed token, address indexed owner)`
- `OperatorUpdated(address indexed previousOperator, address indexed newOperator)`
- `OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)`
- `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`

### Clanker Factory Interface
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
**Fork:** Base mainnet fork — tests against REAL Clanker factory state

### Required Test Coverage (≥90%)

1. **Deployment** — constructor sets all immutables correctly
2. **claimLegacyAndBurn() — fully permissionless**
   - Anyone can call (random address, not operator, not owner) ✓
   - Operator can call ✓
   - Owner can call ✓
   - No time restriction ✓
3. **recoverCreator()**
   - Operator can call
   - Owner can call
   - Random address reverts
4. **transferCreator()**
   - Owner can call
   - Operator cannot call
   - Random address reverts
5. **setOperator()**
   - Owner can update operator
   - Non-owner reverts
6. **Ownable2Step**
   - `transferOwnership` sets pendingOwner
   - `acceptOwnership` transfers correctly
   - Wrong address cannot `acceptOwnership`
7. **Function selector verification**
   - `tokenCreatorTransfer` selector matches `0xcb349ff9`
   - Encoding verified against live factory on fork
8. **Reentrancy guard** — cannot be called recursively

### Pre-Deploy Dry Run Test (Critical — from build plan)
Before transferring creator to proxy:
1. Call `claimLegacyAndBurn()` BEFORE creator is transferred → should revert (proxy not authorized)
2. Confirms revert path works and proxy is safe to register

---

## Deploy Script

**Location:** `packages/foundry/script/DeployLegacyFeeBurner.s.sol`

Uses env vars for constructor args (never hardcoded):
```bash
LEGACY_OWNER=0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3 \
LEGACY_OPERATOR=0xeB99a27AD482534FBf40213d6714e130A43Db0d8 \
LEGACY_BURN_ENGINE=0x1f068DB935DD585941eC386eB14ca595F350D63e \
LEGACY_TOKEN=0x2b7f32C4C05Ab1ebB3E6a5E268e343b35CDA19Db \
LEGACY_SAFE=0x1eaf444ebDf6495C57aD52A04C61521bBf564ace \
forge script DeployLegacyFeeBurner --rpc-url base --broadcast
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
- `BurnEngine` at `0x1f068DB935DD585941eC386eB14ca595F350D63e`

### Three Views (single page, conditional on connected wallet)

#### Public View (no wallet OR unrecognized wallet)
- **"Claim & Burn All" button** — since permissionless, anyone can call this
  - Shows button always (no countdown, no restriction)
  - Loader/disabled state during tx (per frontend-ux Rule 1)
  - Transaction status: pending → "Claiming legacy fees..." → "Triggering BurnEngine..." → ✅ BaseScan link
- Display: `operator` and `owner` addresses via `<Address/>`
- Network banner if on wrong chain

#### Operator View (operator wallet connected)
- Same "Claim & Burn All" button as public view
- Additional: **"Emergency: Recover Creator to Owner"** → calls `recoverCreator()`
  - Confirm dialog before executing
- Status display: operator address, owner address

#### Owner View (owner wallet connected)
- Same as Operator view PLUS:
- **"Transfer Creator"** → `<AddressInput/>` → calls `transferCreator(address)`
  - Warning: "This transfers creator rights externally."
- **"Set New Operator"** → `<AddressInput/>` → calls `setOperator(address)`
- **"Transfer Ownership (Step 1)"** → `<AddressInput/>` → calls `transferOwnership(address)`
  - Show pending owner if set, with "Accept Ownership" button

#### Wrong Network
- "Switch to Base" button — per four-state flow (frontend-ux Rule 2)

### UX Rules (from ethskills frontend-ux)
- Every onchain button: separate loading state, disabled during tx, show spinner (Rule 1)
- Never show Approve+Action simultaneously — no ERC20 approval needed here (Rule 2)
- All addresses: `<Address/>` for display, `<AddressInput/>` for input (Rule 3)
- No duplicate h1 title (Rule 5)
- DaisyUI semantic colors — no hardcoded dark backgrounds (Rule 7)
- Fix pill-shaped inputs: `--radius-field: 0.5rem` in both theme blocks (Rule 8)
- Contract error translation: parse custom errors to human-readable text (Rule 9)
- No public RPCs in production: use Alchemy via env var (Rule 6)

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
- Use `cast rpc anvil_setIntervalMining 1` for consistent block production
- Test all three views against fork with real Clanker state

### Phase 2: Live Contracts + Local UI
- Deploy `LegacyFeeBurner.sol` to Base mainnet
- Set `targetNetworks: [chains.base]`
- **DO NOT transfer creator to proxy until round-trip test passes:**
  1. Call `claimLegacyAndBurn()` before creator transfer → verify it reverts (not authorized)
  2. Transfer creator to proxy
  3. Call `recoverCreator()` immediately → verify creator returns to owner on Basescan
  4. Only then proceed to claim

### Phase 3: Production Deploy
- IPFS build or Vercel deploy per client's Vercel deployment guide in the build plan
- Set OG image, correct metadata, remove SE2 branding
- Env vars: `NEXT_PUBLIC_LEGACY_FEE_BURNER_ADDRESS`, `NEXT_PUBLIC_BURN_ENGINE_ADDRESS`, `NEXT_PUBLIC_BASE_RPC`

---

## Security Notes

- **Permissionless calling is safe** — BurnEngine address is immutable, destination cannot be redirected. Worst case: someone calls it too often (minor gas waste, always produces the desired burn outcome).
- **Hot wallet compromise:** Attacker can call `recoverCreator()` (returns to owner — safe) or `transferCreator()` — wait, no, operator cannot call `transferCreator()`. Operator can only do `recoverCreator()`. Zero damage possible from operator compromise.
- **Owner compromise:** Attacker could call `transferCreator()` to redirect creator. Mitigated by hardware wallet.
- **No token custody:** Token goes directly from Safe → BurnEngine via `tokenCreatorTransfer`. Proxy never holds tokens.
- **Reentrancy:** ReentrancyGuard on `claimLegacyAndBurn()` — two sequential external calls.

---

## Stage Checklist

- [x] `create_repo` — `clawdbotatg/cv-1773504676859` created
- [x] `create_plan` — this file
- [ ] `create_user_journey` — USERJOURNEY.md
- [ ] `prototype` — contract + tests + frontend
- [ ] `contract_audit` — ethskills.com/audit/SKILL.md line-by-line
- [ ] `contract_fix` — fix audit findings
- [ ] `deep_contract_audit` — ~100 lines, simple access control, no swaps — likely skip
- [ ] `deep_contract_fix`
- [ ] `frontend_audit` — ethskills.com/qa/SKILL.md + frontend-ux + frontend-playbook
- [ ] `frontend_fix`
- [ ] `full_audit`
- [ ] `full_audit_fix`
- [ ] `deploy_contract` — deploy with addresses above
- [ ] `livecontract_fix`
- [ ] `deploy_app`
- [ ] `liveapp_fix`
- [ ] `liveuserjourney`
- [ ] `readme`
- [ ] `ready`

---

## Notes for Builder

- **Worker wallet blocker:** On-chain `acceptJob(7)` and `logWork()` require a registered worker wallet. Austin is provisioning — build proceeds in parallel.
- **BurnEngine ABI for externalContracts.ts:** Check `burnengine-v2` repo (`clawdbotatg/burnengine-v2`) for the BurnEngineV2 ABI. Use `executeFullCycle()` signature.
- **Clanker factory ABI verification:** Fork test MUST verify `tokenCreatorTransfer` selector is `0xcb349ff9` against live Base mainnet state.
- **No CLAIM_INTERVAL anywhere** — do not implement the 7-day dead man's switch at all. Fully permissionless from day one.
