# Findings — evm-audit-dos

Contract: LegacyFeeBurner.sol | Checklist items evaluated: 18

## [DOS-1] External dependency chain can block claimLegacyAndBurn
**Severity**: Low
**Category**: evm-audit-dos
**Location**: `claimLegacyAndBurn()`
**Description**: The function makes two sequential external calls — `clankerFactory.tokenCreatorTransfer()` then `burnEngine.executeFullCycle()`. If either external contract reverts (paused, upgraded, or broken), `claimLegacyAndBurn()` is permanently blocked with no fallback path. The only recovery is `recoverCreator()` to pull creator rights back to owner.
**Proof of Concept**: If BurnEngine is paused or has a bug, every call to `claimLegacyAndBurn()` reverts. Fees cannot be claimed until BurnEngine is fixed.
**Recommendation**: This is acceptable by design — the contract intentionally couples claiming with burning. The `recoverCreator()` function provides an escape hatch. Document this dependency explicitly.

---

### Items reviewed with no findings:
- No unbounded loops ✓
- No user-growable arrays ✓
- No ETH transfers ✓
- No returndata bombing risk (calls to known contracts via interfaces) ✓
- No gas griefing vectors ✓
- No pause mechanism to brick ✓
- No block stuffing concerns ✓
