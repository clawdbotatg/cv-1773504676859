# Findings — evm-audit-general

Contract: LegacyFeeBurner.sol | Checklist items evaluated: 46

## [G-1] No extcodesize check on constructor addresses
**Severity**: Low
**Category**: evm-audit-general
**Location**: `constructor()`
**Description**: Constructor validates addresses are non-zero but does not verify they contain deployed code (`address.code.length > 0`). If an incorrect address is passed (e.g., EOA instead of contract), all external calls will revert at runtime rather than failing fast at deployment.
**Proof of Concept**: Deploy with `_burnEngine` set to an EOA. Constructor succeeds. All subsequent calls to `claimLegacyAndBurn()` revert with no clear error.
**Recommendation**: Add `require(_burnEngine.code.length > 0, "Not a contract")` for `_burnEngine` and `_safe` in constructor. Note: `_token` and `_safe` may legitimately be EOAs depending on context, so this applies primarily to `_burnEngine`.

## [G-2] Documentation lists event not present in contract
**Severity**: Info
**Category**: evm-audit-general
**Location**: PLAN.md vs contract
**Description**: PLAN.md lists a `FullCycleTriggered(address indexed burnEngine)` event in the Events section, but the contract does not define or emit this event.
**Recommendation**: Remove `FullCycleTriggered` from PLAN.md or add it to the contract if desired.

---

### Items reviewed with no findings (partial list):
- External calls: No low-level `.call()` — uses interface calls (safe) ✓
- No `msg.value` usage ✓
- No loops ✓
- No `delegatecall` ✓
- No `abi.encodePacked` ✓
- No merkle proofs ✓
- No pause mechanism ✓
- ReentrancyGuard present and is the only modifier (correct ordering) ✓
- No struct deletion ✓
- No assembly ✓
- No `unchecked` blocks ✓
- PUSH0: ^0.8.24 on Base — Base supports Shanghai, no issue ✓
- No `block.timestamp` used for precision timing (only in event emission) ✓
- No force-feeding risk (no ETH balance logic) ✓
- No fallback/receive — cannot accept ETH ✓
