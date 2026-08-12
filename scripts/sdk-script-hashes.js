#!/usr/bin/env node
// 计算 SDK plutus/testnet 各脚本的 hash，用于与合约侧 alpha/msg-gpk-activate 对比
const path = require('path');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const base = path.join(__dirname, '..', 'plutus', 'testnet');
const files = ['groupNFT-holder','adminNFT-holder','check-token','mint-check','treasury-check',
  'nft-mint-check','nft-treasury-check','stake-check','storeman-stake','outbound-token',
  'inbound-check','inbound-token','inbound-check-token','outbound-holder','mint-check-token',
  'treasury-check-token','nft-mint-check-token','nft-treasury-check-token','groupNFT','mapping-token',
  'nft-mapping-token','nft-ref-holder','nft-treasury','treasury','adminNFT'];
for (const f of files) {
  try {
    const j = require(path.join(base, f+'.json'));
    const s = CardanoWasm.PlutusScript.from_bytes(Buffer.from(j.cborHex,'hex'));
    console.log(f.padEnd(26), s.hash().to_hex());
  } catch(e) { console.log(f.padEnd(26), 'ERR', e.message.slice(0,80)); }
}
