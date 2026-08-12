#!/usr/bin/env node
// 审核修复回归测试：验证 #1/#2/#3/#4/#5/#6 修复正确
const contractsMgr = require('../contracts-mgr');
const GroupNFT = contractsMgr.GroupNFT;
const Holder = contractsMgr.GroupInfoNFTHolderScript;

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log('PASS', name); }
    else { fail++; console.log('FAIL', name, '|', detail); }
}

// --- #2: genGroupInfoDatum 空洞防御 ---
// 旧 12 项配置（0-11）+ 直接写 14 → 应抛错（不再静默丢参）
const legacy12 = {};
for (let i = 0; i <= 11; i++) legacy12[i] = 'ab';
legacy12[14] = 'cd';
let threw2 = false, msg2 = '';
try { GroupNFT.genGroupInfoDatum(legacy12); } catch (e) { threw2 = true; msg2 = String(e); }
check('#2 空洞(12项+写14)抛错', threw2, msg2);
check('#2 错误信息含 upgrade 提示', threw2 && msg2.includes('action==0'), msg2);

// 连续 18 项仍正常
const full18 = {};
for (let i = 0; i <= 17; i++) full18[i] = 'ab';
let ok18 = true;
try { GroupNFT.genGroupInfoDatum(full18); } catch (e) { ok18 = false; }
check('#2 连续18项正常', ok18);

// 12 项旧配置（无 14+）仍兼容（不抛错）
const pure12 = {};
for (let i = 0; i <= 11; i++) pure12[i] = 'ab';
let okPure12 = true;
try { GroupNFT.genGroupInfoDatum(pure12); } catch (e) { okPure12 = false; }
check('#2 纯12项兼容(不抛)', okPure12);

// --- ensureParamsExtensible ---
let threwE = false;
try { Holder.ensureParamsExtensible(pure12); } catch (e) { threwE = true; }
check('#2 ensureParamsExtensible 12项抛错', threwE);
let okE = true;
try { Holder.ensureParamsExtensible(full18); } catch (e) { okE = false; }
check('#2 ensureParamsExtensible 18项通过', okE);

// --- #1: switchGroup ---
// mode 默认 admin（新语义）：forceAdmin=true，委托 setGpkImmediate
// mode oracle：msg-gpk-activate 合约无 oracle 直改路径，必须抛错
// 用真实 datum（genGroupInfoDatum 构造），stub validator 验证参数穿透
const origValidator = Holder.validator;
let captured = null;
Holder.validator = async function (...args) { captured = args; return 'stub'; };
(async () => {
    const fullParams = {};
    for (let i = 0; i <= 17; i++) fullParams[i] = 'ab';
    const realDatum = GroupNFT.genGroupInfoDatum(fullParams).to_hex();
    const fake = { datum: realDatum };
    try {
        await Holder.switchGroup(null, [], [], fake, null, { forceAdmin: false }, '11'.repeat(32), 'addr', 0, async () => {});
        check('#1 switchGroup 默认 admin 路径 forceAdmin=true', captured && captured[9] === GroupNFT.GPK && captured[10].forceAdmin === true, captured && JSON.stringify(captured[10]));
    } catch (e) {
        check('#1 switchGroup 默认 admin 路径 forceAdmin=true', false, 'throw: ' + e);
    }
    // mode='oracle'（及任何非 admin 值）必须显式抛错
    let threwOracle = false, oracleMsg = '';
    try {
        await Holder.switchGroup(null, [], [], fake, null, { forceAdmin: false }, '11'.repeat(32), 'addr', 0, async () => {}, null, 'oracle');
    } catch (e) {
        threwOracle = true;
        oracleMsg = String(e);
    }
    check('#1 switchGroup oracle 模式抛错', threwOracle, oracleMsg);
    check('#1 oracle 错误信息含 setPendingGpk/not supported', threwOracle && (oracleMsg.includes('setPendingGpk') || oracleMsg.includes('not supported')), oracleMsg);

    // --- #3: validator(action==17) 无 haltWorkerSign → 回退 admin 路径 ---
    // 真实 validator 需完整交易构建环境无法裸调；用 stub validator 捕获 setHaltStatus(unhalt)
    // 构造的 adminInfo：haltWorkerSign 为 falsy 时 isHaltByWorker=false（不启用 haltworker 签名）
    try {
        await Holder.setHaltStatus(null, [], [], fake, null, {}, 0, 'addr', 0, async () => {});
        const isHaltByWorker = captured && captured[9] === GroupNFT.HaltStatus && !!captured[10].haltWorkerSign;
        check('#3 action17 无 haltWorkerSign 时 isHaltByWorker=false', captured && captured[9] === GroupNFT.HaltStatus && !captured[10].haltWorkerSign && !isHaltByWorker && captured[10].forceAdmin === true, captured && JSON.stringify(captured[10]));
    } catch (e) {
        check('#3 action17 无 haltWorkerSign 时 isHaltByWorker=false', false, 'throw: ' + e);
    }
    // 兜底：adminInfo={forceAdmin:true}（无 haltWorkerSign）走 switchGroup→setGpkImmediate 不抛错、参数穿透
    try {
        await Holder.switchGroup(null, [], [], fake, null, { forceAdmin: true }, '11'.repeat(32), 'addr', 0, async () => {});
        check('#3 无 haltWorkerSign 走 admin 委托不抛错', captured && captured[10].forceAdmin === true && captured[10].haltWorkerSign === undefined, captured && JSON.stringify(captured[10]));
    } catch (e) {
        check('#3 无 haltWorkerSign 走 admin 委托不抛错', false, 'throw: ' + e);
    }

    // --- #4: switchGroup 默认 admin 模式委托 setGpkImmediate，newGpk 透传 ---
    const origSetGpkImmediate = Holder.setGpkImmediate;
    let capturedImmediate = null;
    Holder.setGpkImmediate = async function (...args) { capturedImmediate = args; return 'stub'; };
    try {
        await Holder.switchGroup(null, [], [], fake, null, { forceAdmin: true }, '11'.repeat(32), 'addr', 0, async () => {}, null);
        check('#4 switchGroup 委托 setGpkImmediate 且 newGpk 透传', capturedImmediate && capturedImmediate[6] === '11'.repeat(32), capturedImmediate && String(capturedImmediate[6]));
    } catch (e) {
        check('#4 switchGroup 委托 setGpkImmediate 且 newGpk 透传', false, 'throw: ' + e);
    }
    Holder.setGpkImmediate = origSetGpkImmediate;
    Holder.validator = origValidator;

    // --- #6: setHaltStatus 值域校验 ---
    let threw6 = false;
    try { await Holder.setHaltStatus(null, [], [], fake, null, {}, 2, 'addr', 0, async () => {}); } catch (e) { threw6 = true; }
    check('#6 setHaltStatus(status=2) 抛错', threw6);

    // --- #5: decodePendingGpk 超安全整数返回字符串 ---
    // 构造超大 activationTime (2^60)
    const ls = require('@emurgo/cardano-serialization-lib-nodejs').PlutusList.new();
    const CW = require('@emurgo/cardano-serialization-lib-nodejs');
    ls.add(CW.PlutusData.new_bytes(Buffer.from('11'.repeat(32), 'hex')));
    ls.add(CW.PlutusData.new_integer(CW.BigInt.from_str((2n ** 60n).toString())));
    const constr = CW.ConstrPlutusData.new(CW.BigNum.from_str('0'), ls);
    const bigHex = Buffer.from(CW.PlutusData.new_constr_plutus_data(constr).to_bytes()).toString('hex');
    const dec = GroupNFT.decodePendingGpk(bigHex);
    check('#5 超大 activationTime 返回字符串', typeof dec.activationTime === 'string' && BigInt(dec.activationTime) === 2n ** 60n, dec.activationTime);
    // 正常值仍返回 Number
    const normalHex = GroupNFT.encodePendingGpk({ newGpk: '11'.repeat(32), activationTime: 1723000000000 });
    check('#5 正常 activationTime 返回 Number', typeof GroupNFT.decodePendingGpk(normalHex).activationTime === 'number', typeof GroupNFT.decodePendingGpk(normalHex).activationTime);

    // --- #2b: decodeAssetLimits 超安全整数 limit 返回字符串（对齐 #5）---
    const CW2 = require('@emurgo/cardano-serialization-lib-nodejs');
    const bigLimit = 2n ** 60n;
    // AssetLimit 列表 [ {policy, name, limit=2^60} ] → Constr 1 [Constr 0 [Bytes, Bytes, Int], Constr 0 []]
    const limitFields = CW2.PlutusList.new();
    limitFields.add(CW2.PlutusData.new_bytes(Buffer.from('aa'.repeat(28), 'hex')));
    limitFields.add(CW2.PlutusData.new_bytes(Buffer.from('', 'hex')));
    limitFields.add(CW2.PlutusData.new_integer(CW2.BigInt.from_str(bigLimit.toString())));
    const limitItem = CW2.PlutusData.new_constr_plutus_data(
        CW2.ConstrPlutusData.new(CW2.BigNum.from_str('0'), limitFields));
    const consList = CW2.PlutusList.new();
    consList.add(limitItem);
    consList.add(CW2.PlutusData.new_constr_plutus_data(
        CW2.ConstrPlutusData.new(CW2.BigNum.from_str('0'), CW2.PlutusList.new())));
    const bigLimitHex = Buffer.from(CW2.PlutusData.new_constr_plutus_data(
        CW2.ConstrPlutusData.new(CW2.BigNum.from_str('1'), consList)).to_bytes()).toString('hex');
    const decLimits = GroupNFT.decodeAssetLimits(bigLimitHex);
    check('#2b 超大 limit 返回字符串', decLimits && decLimits.length === 1 && typeof decLimits[0].limit === 'string' && BigInt(decLimits[0].limit) === bigLimit, decLimits && JSON.stringify(decLimits));
    // 正常 limit 仍返回 Number
    const normalLimits = GroupNFT.encodeAssetLimits([{ policy: 'aa'.repeat(28), name: '', limit: 1000 }]);
    const decNormalLimits = GroupNFT.decodeAssetLimits(normalLimits);
    check('#2b 正常 limit 返回 Number', decNormalLimits && decNormalLimits.length === 1 && typeof decNormalLimits[0].limit === 'number' && decNormalLimits[0].limit === 1000, decNormalLimits && JSON.stringify(decNormalLimits));

    // --- #2c: setPendingGpk newGpk == 当前 GPK 预检抛错 ---
    // 用真实 18 项 datum，params[2]='ab'，pending.newGpk 相同 → 应抛错
    let threwPending = false, pendingMsg = '';
    try {
        await Holder.setPendingGpk(null, [], [], fake, null, {}, { newGpk: 'ab', activationTime: 1723000000000 }, 'addr', 0, async () => {});
    } catch (e) {
        threwPending = true;
        pendingMsg = String(e);
    }
    check('#2c setPendingGpk newGpk==当前GPK 抛错', threwPending && pendingMsg.includes('equals current GPK'), pendingMsg);

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
