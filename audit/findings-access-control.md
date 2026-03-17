# Findings — evm-audit-access-control

Contract: LegacyFeeBurner.sol | Checklist items evaluated: 15

## [AC-1] No timelock on critical owner functions
**Severity**: Info
**Category**: evm-audit-access-control
**Location**: `transferCreator()`, `setOperator()`
**Description**: Owner can instantly transfer creator rights to an arbitrary address or change the operator with no timelock or delay. If the owner key is compromised, the attacker can immediately redirect creator rights.
**Proof of Concept**: Compromised owner calls `transferCreator(attackerAddress)` — instant, no delay.
**Recommendation**: Acceptable given the owner is a hardware wallet. Document this trust assumption. A timelock would add complexity disproportionate to the contract's simplicity.

## [AC-2] No renounceOwnership — positive finding
**Severity**: Info
**Category**: evm-audit-access-control
**Location**: Contract-wide
**Description**: The contract intentionally omits `renounceOwnership()`, preventing accidental permanent lockout. This is a good design choice for a contract where owner functions are critical for recovery.

---

### Items reviewed with no findings:
- Ownable2Step correctly implemented ✓
- All sensitive functions have proper access checks ✓
- `claimLegacyAndBurn()` is intentionally permissionless (documented design) ✓
- Operator can only call `recoverCreator()` (returns to owner — safe even if compromised) ✓
- No initializer issues (not upgradeable) ✓
- No role inflation possible (single owner, single operator) ✓
- Constructor sets owner correctly with zero-check ✓
