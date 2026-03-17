# Full Audit — LegacyFeeBurner

## Contract ↔ Frontend Integration

### Function Names
✅ All function names in frontend match contract: claimLegacyAndBurn, recoverCreator, transferCreator, setOperator, transferOwnership, acceptOwnership

### ABI Match
✅ deployedContracts.ts ABI matches the Solidity contract exactly

### Chain Configuration
✅ scaffold.config.ts targets chains.base (8453), deployedContracts uses 8453 key

### Read Functions
✅ Frontend reads owner, operator, token, safe, burnEngine — all exist in contract

### Address Placeholder
⚠️ NOTE: deployedContracts.ts has 0x0000...0000 placeholder — will be updated after deploy

## No integration issues found.
