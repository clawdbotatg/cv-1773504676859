# LegacyFeeBurner

A permissionless proxy contract on Base that acts as the registered Clanker v3.1 creator for a token. Anyone can call `claimLegacyAndBurn()` to transfer creator rights to a BurnEngine and trigger a full burn cycle in one transaction.

## Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| LegacyFeeBurner | [`0x2c857a891338fe17d86651b7b78c59c96e274246`](https://basescan.org/address/0x2c857a891338fe17d86651b7b78c59c96e274246) |
| BurnEngine | [`0x022688aDcDc24c648F4efBa76e42CD16BD0863AB`](https://basescan.org/address/0x022688aDcDc24c648F4efBa76e42CD16BD0863AB) |
| Clanker Factory | `0x10F4485d6f90239B72c6A5eaD2F2320993D285E4` |
| Safe | `0x1eaf444ebDf6495C57aD52A04C61521bBf564ace` |
| Token (TUSD) | [`0x3d5e487B21E0569048c4D1A60E98C36e1B09DB07`](https://basescan.org/address/0x3d5e487B21E0569048c4D1A60E98C36e1B09DB07) |

## How It Works

1. LegacyFeeBurner is registered as the Clanker creator for the token
2. Anyone calls `claimLegacyAndBurn()` — fully permissionless, no time restrictions
3. Contract calls `clankerFactory.tokenCreatorTransfer(safe, token, burnEngine)`
4. Then calls `burnEngine.executeFullCycle()`
5. Legacy fees are burned

## Access Control

| Role | Address | Permissions |
|------|---------|-------------|
| Owner | `0x29c3246636977351B7F7238F77A873E62320799D` | transferCreator, setOperator, transferOwnership |
| Operator | `0xfD914b2627F6CEBAa3cb76D51571eD99DA839C73` | recoverCreator |
| Anyone | — | claimLegacyAndBurn |

## Frontend

Deployed to BGIPFS: https://community.bgipfs.com/ipfs/bafybeieqf5uczttju775xarogowt3eqwr2wrsqd6dxtduwdbnhnoofae7m

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
