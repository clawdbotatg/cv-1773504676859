# Security Audit Report — LegacyFeeBurner

**Contract**: `LegacyFeeBurner.sol` (~80 lines)
**Date**: 2026-03-16
**Auditor**: ServiceOpus (automated)
**Commit**: HEAD of `clawdbotatg/cv-1773504676859`
**Chain**: Base (OP Stack L2)

---

## Executive Summary

LegacyFeeBurner is a minimal proxy contract that acts as a Clanker v3.1 token creator, enabling permissionless fee claiming and burning. The contract is **well-designed and secure** for its intended purpose. No Critical, High, or Medium severity findings were identified.

The contract's small surface area, lack of token custody, absence of ETH handling, and immutable configuration make it inherently low-risk. The inline Ownable2Step implementation is correct, and the ReentrancyGuard is properly applied.

## Scope

| File | Lines |
|------|-------|
| `LegacyFeeBurner.sol` | ~85 |
| `LegacyFeeBurner.t.sol` | ~130 (context) |

## Skills Applied

| # | Skill | Items Evaluated | Findings |
|---|-------|-----------------|----------|
| 1 | evm-audit-general | 46 | 2 (1 Low, 1 Info) |
| 2 | evm-audit-precision-math | 23 | 0 (all N/A) |
| 3 | evm-audit-access-control | 15 | 2 (2 Info) |
| 4 | evm-audit-erc20 | 27 | 0 (all N/A) |
| 5 | evm-audit-dos | 18 | 1 (1 Low) |
| 6 | evm-audit-chain-specific | 29 | 1 (1 Info) |
| **Total** | | **158** | **6** |

## Findings Summary

| ID | Title | Severity | Category |
|----|-------|----------|----------|
| G-1 | No extcodesize check on constructor addresses | Low | general |
| G-2 | Documentation lists event not in contract | Info | general |
| AC-1 | No timelock on critical owner functions | Info | access-control |
| AC-2 | No renounceOwnership (positive) | Info | access-control |
| DOS-1 | External dependency chain can block claimLegacyAndBurn | Low | dos |
| CS-1 | Hardcoded Clanker Factory is Base-specific | Info | chain-specific |

## Detailed Findings

### [G-1] No extcodesize check on constructor addresses
**Severity**: Low
**Location**: `constructor()`
**Description**: Constructor validates non-zero addresses but doesn't verify they contain deployed code. Deploying with an EOA as `_burnEngine` would pass construction but permanently brick `claimLegacyAndBurn()`.
**Recommendation**: Add `require(_burnEngine.code.length > 0, "Not a contract")` in constructor.

### [DOS-1] External dependency chain can block claimLegacyAndBurn
**Severity**: Low
**Location**: `claimLegacyAndBurn()`
**Description**: Two sequential external calls to clankerFactory and burnEngine — if either reverts, the function is blocked. Mitigated by `recoverCreator()` escape hatch.
**Recommendation**: Acceptable by design. Document the dependency.

### [G-2] Documentation lists event not in contract
**Severity**: Info
**Description**: PLAN.md references `FullCycleTriggered` event not present in contract code.

### [AC-1] No timelock on critical owner functions
**Severity**: Info
**Description**: `transferCreator()` and `setOperator()` execute instantly. Acceptable given hardware wallet ownership.

### [AC-2] No renounceOwnership — positive finding
**Severity**: Info
**Description**: Good design choice — prevents accidental lockout.

### [CS-1] Hardcoded Clanker Factory is Base-specific
**Severity**: Info
**Description**: Contract is inherently Base-only due to hardcoded factory address.

## Positive Security Properties

1. **No token custody** — tokens flow directly Safe → BurnEngine via factory
2. **No ETH handling** — no receive/fallback, no payable functions
3. **Immutable configuration** — burnEngine, safe, token, clankerFactory cannot be changed
4. **Ownable2Step** — prevents ownership transfer to wrong address
5. **ReentrancyGuard** — protects the two-external-call sequence
6. **Minimal attack surface** — ~80 lines, 6 functions, no complex logic
7. **Operator compromise is safe** — can only call recoverCreator() which returns to owner
8. **No upgradability** — what you deploy is what you get

## Conclusion

**The contract is ready for deployment.** The two Low findings are minor deployment hygiene issues that don't affect runtime security when correct addresses are used. No code changes are required, though adding the extcodesize check (G-1) would be a nice hardening measure.

No GitHub issues filed — all findings are Low or Info severity (threshold: Medium+).
