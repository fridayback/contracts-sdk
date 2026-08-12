#!/usr/bin/env node
// 验证 CardanoWasm.PlutusData 构造 + to_bytes 是否与 Aiken cbor.serialise 编码一致
// Aiken 期望: PendingGPK{new_gpk, activation_time} -> Constr 0 [Bytes, Int] -> d8799f<bytes><int>ff
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

// 构造 Constr 0 [bytes, int]
const ls = CardanoWasm.PlutusList.new();
ls.add(CardanoWasm.PlutusData.new_bytes(Buffer.from('aabbccdd', 'hex')));
ls.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('42')));
const constr = CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), ls);
const data = CardanoWasm.PlutusData.new_constr_plutus_data(constr);

console.log('to_hex():        ', data.to_hex());
console.log('to_bytes():      ', Buffer.from(data.to_bytes()).toString('hex'));
console.log('expected d8799f:  d8799f44aabbccdd182aff');

// 空 constr (None -> Constr 1 [])
const ls2 = CardanoWasm.PlutusList.new();
const constr2 = CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('1'), ls2);
const none = CardanoWasm.PlutusData.new_constr_plutus_data(constr2);
console.log('None to_bytes(): ', Buffer.from(none.to_bytes()).toString('hex'), '(expect d87a80)');

// list data (indefinite list of data)
const listData = CardanoWasm.PlutusData.new_list(ls);
console.log('list to_bytes(): ', Buffer.from(listData.to_bytes()).toString('hex'), '(expect 9f44aabbccdd182aff)');

// int > 2^53 (big)
const ls3 = CardanoWasm.PlutusList.new();
ls3.add(CardanoWasm.PlutusData.new_bytes(Buffer.from('aa', 'hex')));
ls3.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('1723000000000')));
const constr3 = CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), ls3);
const data3 = CardanoWasm.PlutusData.new_constr_plutus_data(constr3);
console.log('bigint to_bytes():', Buffer.from(data3.to_bytes()).toString('hex'));
