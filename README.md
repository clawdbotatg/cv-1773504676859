# LegacyFeeBurner

A permissionless proxy contract on Base that acts as the registered Clanker v3.1 creator for a token. Anyone can call `claimLegacyAndBurn()` to transfer creator rights to a BurnEngine and trigger a full burn cycle in one transaction.

## Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| LegacyFeeBurner | [`0xF2D3E6Ce8f950bb144A18DfB784e29Ea7cA96e24`](https://basescan.org/address/0xF2D3E6Ce8f950bb144A18DfB784e29Ea7cA96e24) |
| BurnEngine | `0x1f068DB935DD585941eC386eB14ca595F350D63e` |
| Clanker Factory | `0x10F4485d6f90239B72c6A5eaD2F2320993D285E4` |
| Safe | `0x1eaf444ebDf6495C57aD52A04C61521bBf564ace` |
| Token | `0x2b7f32C4C05Ab1ebB3E6a5E268e343b35CDA19Db` |

## How It Works

1. LegacyFeeBurner is registered as the Clanker creator for the token
2. Anyone calls `claimLegacyAndBurn()` — fully permissionless, no time restrictions
3. Contract calls `clankerFactory.tokenCreatorTransfer(safe, token, burnEngine)`
4. Then calls `burnEngine.executeFullCycle()`
5. Legacy fees are burned

## Access Control

| Role | Address | Permissions |
|------|---------|-------------|
| Owner | `0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3` | transferCreator, setOperator, transferOwnership |
| Operator | `0xeB99a27AD482534FBf40213d6714e130A43Db0d8` | recoverCreator |
| Anyone | — | claimLegacyAndBurn |

## Frontend

Deployed to BGIPFS: https://community.bgipfs.com/ipfs/bafybeiakecdcrjoroi6jyj7erantcrxqsdqcwivhcootkltwvkyuh534q4

Three views based on connected wallet:
- **Public** — Claim & Burn All button
- **Operator** — Claim + Emergency Recover Creator
- **Owner** — All of above + Transfer Creator, Set Operator, Transfer Ownership

## Development

```bash
yarn install
yarn fork --network base   # Terminal 1
yarn deploy                # Terminal 2
yarn start                 # Terminal 3
```

## Built by

[LeftClaw Services](https://leftclaw.services) · Job `cv-1773504676859`
