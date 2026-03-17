# Frontend Audit — LegacyFeeBurner

## frontend-ux/SKILL.md Checks

### Rule 1: Every Onchain Button — Loader + Disable
✅ PASS — All 6 buttons have individual loading states, disable on click, show spinner text.

### Rule 2: Four-State Flow — Connect → Network → Approve → Action
✅ PASS — Shows RainbowKitCustomConnectButton when disconnected, "Switch to Base" when wrong network, then action button. No approval needed for this contract.

### Rule 3: Address Display
⚠️ FINDING — Uses custom `shortenAddress()` instead of SE2 `<Address/>` component. Missing: ENS resolution, blockie avatar, copy-to-clipboard, block explorer link.

### Rule 4-10: Other UX rules
✅ PASS — No token approval flow needed. Error handling with translateError is good.

## frontend-playbook/SKILL.md Checks

### SE2 Branding Removal
⚠️ FINDING — Tab title is "Scaffold-ETH 2 App" (layout.tsx). Must be "LegacyFeeBurner".
⚠️ FINDING — Footer still has BuidlGuidl branding, "Fork me" links, SE2 logo.

### Contract Address Display
⚠️ FINDING — The deployed contract address itself is not shown on the page. Only owner/operator/token/safe/burnEngine are shown.

## qa/SKILL.md Checks

### Wallet Flow
✅ PASS — Shows Connect button, not text prompt.

### Four-State Button
✅ PASS — One button at a time.

### SE2 Branding
❌ FAIL — Title and footer not updated (see above).

## Summary of Findings
1. Uses shortenAddress() instead of `<Address/>` component for all addresses
2. Tab title still says "Scaffold-ETH 2 App"
3. Footer retains SE2 default branding
4. Contract address not displayed on the page
