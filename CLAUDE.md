# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is `crosschain-sdk-1-3` (v1.3.0), a **Cardano Plutus V2 multi-signature SDK** for cross-chain operations. It's a pure CommonJS library — no build step, no bundler. The repository has a flat structure (no `src/` directory); all `.js` files live at root.

## Commands

```bash
# Run testnet integration tests (WebSocket Ogmios)
node sdk-test.js

# Run mainnet integration tests (HTTP Ogmios)
node sdk-test-mainnet.js
```

There is no build step, no linting configuration, and no unit test suite. The `test` script in `package.json` is a non-functional placeholder. `tsconfig.json` exists only for IDE IntelliSense (`emitDeclarationOnly: true` → `dist/index.d.ts`).

## Architecture

### Entry point

[`index.js`](index.js) re-exports four top-level modules:
- **`ContractSdk`** ([`sdk.js`](sdk.js)) — Main orchestrator class
- **`contracts`** ([`contracts.js`](contracts.js)) — Treasury/Mint/Mapping/CheckToken contracts
- **`contracts_mgr`** ([`contracts-mgr.js`](contracts-mgr.js)) — Governance layer (AdminNFT, GroupNFT) and staking
- **`contracts_msg`** ([`msg-contract.js`](msg-contract.js)) — Cross-chain messaging (Inbound/Outbound tokens)

### Module dependency hierarchy

```
sdk.js (ContractSdk)
 ├── contracts-mgr.js   ← Group/Amin NFTs, staking, parameter governance
 ├── contracts.js       ← Treasury vault, mapping tokens, check tokens
 │    ├── contracts-mgr.js
 │    ├── nft-contract.js   ← NFT variants of treasury/mint/mapping
 │    └── msg-contract.js   ← Inbound/outbound cross-chain messaging
 ├── ogmios-utils.js    ← WebSocket transport (uses @cardano-ogmios/client)
 ├── ogmios-utils2.js   ← HTTP transport (uses axios via chain-utils.js)
 └── utils.js           ← Protocol params, tx builder, address helpers, datum encoding
      └── plutusdata.js ← PlutusData CBOR serialization (TxId, Address, Value, etc.)
```

### Two Ogmios transport modes

The SDK supports two network backends selected by the `conViaWs` constructor flag:
- **WebSocket** (`ogmios-utils.js`) — Direct connection to a Cardano Ogmios node
- **HTTP** (`ogmios-utils2.js` + `chain-utils.js`) — REST API proxy (testnet: `nodes-testnet.wandevs.org/cardano`, mainnet: `nodes.wandevs.org/cardano`)

Both expose identical function names (`init_ogmios`, `getUtxo`, `getParamProtocol`, `evaluateTx`, `submitTx`, etc.).

### Plutus scripts

Compiled Plutus V2 scripts live in [`plutus/mainnet/`](plutus/mainnet/) and [`plutus/testnet/`](plutus/testnet/) as JSON files containing `{ type: "PlutusScriptV2", description, cborHex }`. Each contract module has an `init(network)` function that loads and parses the scripts it needs via `CardanoWasm.PlutusScript.from_bytes_v2()`. There are ~20 scripts per network.

### Key patterns

1. **Two-phase initialization**: Call `sdk.init(host, port, tls)` after construction to connect to Ogmios and fetch script reference UTXOs.

2. **Multi-signature tx flow**: All transactions require multiple signatures. First construct and sign (`sdk.someOperation(..., signFn)`), then accumulate additional signatures via `sdk.addSignature(signedTx, nextSignFn)` until the threshold is met, then submit externally.

3. **Static class methods as namespaces**: All contract classes use static methods exclusively — they are never instantiated. Classes group related script operations (e.g., `GroupInfoNFTHolderScript.setVersion()`, `AdminNFT.mint()`). Plutus script objects are stored in module-level variables.

4. **Governance model**: AdminNFT + GroupNFT form the top-level governance. The GroupInfo NFT holder stores a datum with validator hashes for all sub-contracts (TreasuryCheck, MintCheck, StakeCheck, NFT contracts, InboundCheck, OutboundHolder). Admin manages signatories and multi-sig thresholds.

5. **Signing callback pattern**: Every method that constructs a transaction accepts a `signFn` with signature `async (hash) => { return { vkey, signature } }`, where `vkey` is the bech32 public key and `signature` is a hex string.

6. **Check token inheritance**: `CheckTokenScriptBase` is subclassed by domain-specific check token scripts (TreasuryCheck, MintCheck, NFT variants, InboundCheck) across `contracts.js`, `nft-contract.js`, and `msg-contract.js`.
