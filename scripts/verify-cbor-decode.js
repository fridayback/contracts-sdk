#!/usr/bin/env node
// 验证 CardanoWasm.PlutusData.from_hex 能否回读 cbor.serialise 编码（d8799f...ff）
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

const hex = 'd8799f44aabbccdd182aff';
const data = CardanoWasm.PlutusData.from_hex(hex);
const c = data.as_constr_plutus_data();
console.log('alt:', c.alternative().to_str());
console.log('fields len:', c.data().len());
console.log('f0 bytes:', Buffer.from(c.data().get(0).as_bytes()).toString('hex'));
console.log('f1 int:', c.data().get(1).as_integer().to_str());

// Aiken list ToData: [] -> Constr 0 []; [x..xs] -> Constr 1 [x, rest]
// 空列表
const empty = CardanoWasm.PlutusData.new_constr_plutus_data(
  CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.PlutusList.new()));
console.log('empty list:', Buffer.from(empty.to_bytes()).toString('hex'), '(expect d87980)');

// Cons: Constr 1 [x, rest]
const consLs = CardanoWasm.PlutusList.new();
consLs.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('5')));
consLs.add(empty);
const cons = CardanoWasm.PlutusData.new_constr_plutus_data(
  CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('1'), consLs));
console.log('cons list:', Buffer.from(cons.to_bytes()).toString('hex'), '(expect d87a9f05d87980ff)');
