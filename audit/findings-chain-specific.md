# Findings — evm-audit-chain-specific

Contract: LegacyFeeBurner.sol | Target: Base (OP Stack L2) | Checklist items evaluated: 29

## [CS-1] Hardcoded Clanker Factory address is Base-specific
**Severity**: Info
**Category**: evm-audit-chain-specific
**Location**: `constructor()` — `clankerFactory = 0x10F4485d6f90239B72c6A5eaD2F2320993D285E4`
**Description**: The Clanker Factory address is hardcoded as a constant. This contract is inherently Base-only and cannot be deployed to any other chain without modification.
**Recommendation**: Acceptable — contract is explicitly designed for Base only. Document this constraint.

---

### Items reviewed with no findings:
- PUSH0: Solidity ^0.8.24 compiles with PUSH0, Base supports Shanghai ✓
- No `block.number` usage ✓
- No `block.prevrandao` usage ✓
- No gas estimation concerns ✓
- No L1 data fee sensitivity ✓
- No cross-chain messaging ✓
- No hardcoded WETH/token addresses beyond intentional Base addresses ✓
- No `tx.origin` checks ✓
- No `.transfer()` or `.send()` ✓
