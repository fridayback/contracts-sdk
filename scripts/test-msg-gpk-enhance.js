#!/usr/bin/env node
// 单元验证：msg-gpk-activate 新增编解码工具与 Aiken 语义对齐
// 1) PendingGPK encode/decode 往返
// 2) AssetLimit list encode/decode 往返
// 3) packInteger/unpackInteger 与 Aiken pack_integer 示例一致
// 4) genGroupInfoDatum 含 14-17 参数可回读
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const contractsMgr = require('../contracts-mgr');

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log('PASS', name); }
    else { fail++; console.log('FAIL', name, '|', detail); }
}

// --- 1. PendingGPK encode/decode ---
const gpkHex = 'abcd'.repeat(8); // 32B
const pending = { newGpk: gpkHex, activationTime: 1723000000000 };
const enc = contractsMgr.GroupNFT.encodePendingGpk(pending);
console.log('  pending cbor:', enc);
check('pending decode roundtrip', JSON.stringify(contractsMgr.GroupNFT.decodePendingGpk(enc)) === JSON.stringify(pending), JSON.stringify(contractsMgr.GroupNFT.decodePendingGpk(enc)));
check('pending starts d8799f', enc.startsWith('d8799f'), enc.slice(0, 6));
check('pending decode bad -> null', contractsMgr.GroupNFT.decodePendingGpk('deadbeef') === null);

// --- 2. AssetLimit list encode/decode ---
const limits = [
    { policy: 'aa'.repeat(28), name: '', limit: 1000 },
    { policy: 'bb'.repeat(28), name: '4d59436f696e', limit: 500 },
];
const encL = contractsMgr.GroupNFT.encodeAssetLimits(limits);
console.log('  limits cbor:', encL);
const decL = contractsMgr.GroupNFT.decodeAssetLimits(encL);
check('limits decode roundtrip', JSON.stringify(decL) === JSON.stringify(limits), JSON.stringify(decL));
const emptyL = contractsMgr.GroupNFT.encodeAssetLimits([]);
check('empty limits -> d87980', emptyL === 'd87980', emptyL);
check('empty limits decode -> []', JSON.stringify(contractsMgr.GroupNFT.decodeAssetLimits(emptyL)) === '[]', JSON.stringify(contractsMgr.GroupNFT.decodeAssetLimits(emptyL)));
check('limits decode bad -> null', contractsMgr.GroupNFT.decodeAssetLimits('ff') === null);

// --- 3. packInteger/unpackInteger 与 Aiken 示例对齐 ---
const packCases = [[0, '00'], [1, '01'], [255, 'ff'], [256, '0100'], [-1, '8001'], [-256, '800100']];
for (const [n, expectHex] of packCases) {
    const got = contractsMgr.GroupNFT.packInteger(n);
    check(`packInteger(${n}) == ${expectHex}`, got === expectHex, got);
}
const unpackCases = [['00', 0], ['01', 1], ['ff', 255], ['0100', 256], ['8001', -1], ['800100', -256], ['', 0]];
for (const [h, expectN] of unpackCases) {
    const got = contractsMgr.GroupNFT.unpackInteger(h);
    check(`unpackInteger(${JSON.stringify(h)}) == ${expectN}`, got === expectN, got);
}
// 往返
for (let n = 0; n <= 200000; n += 977) {
    const rt = contractsMgr.GroupNFT.unpackInteger(contractsMgr.GroupNFT.packInteger(n));
    if (rt !== n) { fail++; console.log('FAIL pack roundtrip', n, rt); }
}

// --- 4. genGroupInfoDatum 含 14-17 可回读 ---
const params18 = {};
for (let i = 0; i <= 17; i++) params18[i] = (i * 11 % 256).toString(16).padStart(2, '0');
params18[14] = enc;          // pending gpk
params18[15] = encL;         // cross limit
params18[16] = 'ff'.repeat(20); // halt worker pkh
params18[17] = '01';         // halt status 1
const datumHex = contractsMgr.GroupNFT.genGroupInfoDatum(params18).to_hex();
const back = contractsMgr.GroupNFT.groupInfoFromDatum(datumHex);
check('18-param datum length', Object.keys(back).length === 18, Object.keys(back).length);
check('params[14] roundtrip', back['14'] === enc, back['14']);
check('params[15] roundtrip', back['15'] === encL, back['15']);
check('params[16] roundtrip', back['16'] === 'ff'.repeat(20), back['16']);
check('params[17] roundtrip', back['17'] === '01', back['17']);

// 旧 12 项配置兼容（不传 12/13 → 长度 12）
const params12 = {};
for (let i = 0; i <= 11; i++) params12[i] = (i % 256).toString(16).padStart(2, '0');
const datum12 = contractsMgr.GroupNFT.genGroupInfoDatum(params12).to_hex();
const back12 = contractsMgr.GroupNFT.groupInfoFromDatum(datum12);
check('12-param datum length (兼容旧配置)', Object.keys(back12).length === 12, Object.keys(back12).length);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
