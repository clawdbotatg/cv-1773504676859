# USERJOURNEY.md — LegacyFeeBurner

**Job:** `cv-1773504676859` / Job #7
**Contract:** LegacyFeeBurner on Base mainnet

---

## The Setup

LegacyFeeBurner sits between Clanker (the registered creator system for ₸USD) and BurnEngine. Whenever legacy fees accumulate in the Safe, this contract lets anyone claim and burn them in a single permissionless transaction.

Three actors use this app:

1. **Anyone (public)** — one-click claim & burn, no wallet required to read, wallet required to execute
2. **Operator (hot wallet `0xeB99a27AD482534FBf40213d6714e130A43Db0d8`)** — same as public + emergency recovery
3. **Owner (hardware wallet `0xa2aD5F70B2EaccA81910561B3c1c7FfEC2B2C2B3`)** — full admin control

---

## Journey 1: Anyone Claims & Burns (Primary Flow)

**Who:** Random wallet, MEV bot, community member — anyone
**When:** Any time, always available (fully permissionless)

1. Open the app on Base mainnet
2. See: current operator address, owner address, and a big **"Claim & Burn All"** button
3. Click **"Claim & Burn All"**
4. MetaMask / wallet pops: one transaction to `claimLegacyAndBurn()`
5. Tx pending → spinner: *"Claiming legacy fees from Clanker..."*
6. Tx confirmed → *"BurnEngine triggered ✓"* + Basescan link
7. Done — fees claimed from Safe, burned via BurnEngine, in one tx

---

## Journey 2: Operator Recovers Creator (Emergency)

**Who:** Operator (hot wallet)
**When:** Something went wrong — contract is stuck as creator, need to recover

1. Connect hot wallet → app detects operator wallet, shows Operator view
2. See the emergency **"Recover Creator to Owner"** button below the main claim button
3. Click **"Recover Creator to Owner"**
4. Confirm dialog: *"This will transfer creator rights back to the owner address. Continue?"*
5. MetaMask: one transaction to `recoverCreator()`
6. Tx confirmed → *"Creator returned to owner ✓"* + Basescan link

---

## Journey 3: Owner Sets New Operator

**Who:** Owner (hardware wallet)
**When:** Hot wallet is compromised or rotating wallets

1. Connect hardware wallet → app detects owner wallet, shows Owner view
2. See **"Set New Operator"** input field with `<AddressInput/>`
3. Paste new operator address, click **"Update Operator"**
4. MetaMask: one transaction to `setOperator(newOperator)`
5. Tx confirmed → *"Operator updated ✓"* + Basescan link
6. UI immediately reflects new operator address

---

## Journey 4: Owner Transfers Creator to New Contract

**Who:** Owner
**When:** Upgrading to a new version of LegacyFeeBurner

1. Connect hardware wallet → Owner view
2. See **"Transfer Creator"** input + button
3. Paste new contract address
4. See warning: *"This transfers creator rights to an external address. Operator can use 'Recover Creator' to get back to owner, or owner can re-transfer."*
5. Click **"Transfer Creator"**
6. MetaMask: one transaction to `transferCreator(newAddress)`
7. Tx confirmed → *"Creator transferred ✓"* + Basescan link

---

## Journey 5: Owner Transfers Ownership (2-Step)

**Who:** Owner
**When:** Moving to new hardware wallet

**Step 1 — Nominate:**
1. Connect current hardware wallet → Owner view
2. See **"Transfer Ownership"** input + button
3. Paste new owner address
4. Click **"Transfer Ownership (Step 1)"**
5. MetaMask: tx to `transferOwnership(newOwner)`
6. Tx confirmed → *"Pending owner set: 0x..."* — UI shows pending owner + "Accept Ownership" button
7. Ownership NOT transferred yet — pending owner must confirm

**Step 2 — Accept:**
1. Connect pending owner wallet → UI shows "You are the pending owner"
2. See **"Accept Ownership"** button (highlighted/call-to-action style)
3. Click **"Accept Ownership"**
4. MetaMask: tx to `acceptOwnership()`
5. Tx confirmed → *"Ownership transferred ✓"* — you are now the owner

---

## Edge Cases

### Wrong Network
- User opens app on wrong chain
- Banner: *"LegacyFeeBurner is deployed on Base. Switch network."* + **"Switch to Base"** button
- Wallet not connected: read-only mode (shows addresses, claim button disabled if no wallet)

### Transaction Reverts
- `claimLegacyAndBurn()` reverts because proxy is not the registered creator → *"Contract is not registered as the creator. Owner may need to re-register."*
- `recoverCreator()` reverts because proxy is not creator → *"Creator is not currently held by this contract."*
- Contract error → parse revert data, show human-readable message

### Already Triggered
- If someone else triggered `claimLegacyAndBurn()` moments before → tx reverts (creator no longer held by proxy after transfer completes)
- Show: *"Transaction failed — fees may have just been claimed by someone else. Check Basescan."*

---

## States Summary

| State | Who Sees It |
|-------|------------|
| Not connected | Claim button shown but wallet required to execute |
| Connected, wrong network | Network switch banner |
| Connected, public wallet | Claim button (permissionless) |
| Connected, operator wallet | Claim + Emergency Recover Creator |
| Connected, owner wallet | All of the above + Transfer Creator, Set Operator, Transfer Ownership |
| Connected, pending owner | Accept Ownership button |
