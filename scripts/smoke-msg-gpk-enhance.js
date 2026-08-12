#!/usr/bin/env node
// 冒烟：require 链完整 + 新方法注册 + GroupNFT 常量
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

console.log('--- require contracts-mgr ---');
const cm = require('../contracts-mgr');
console.log('OK. GroupNFT.PendingGPKParam =', cm.GroupNFT.PendingGPKParam);
console.log('GroupNFT.CrossLimit =', cm.GroupNFT.CrossLimit);
console.log('GroupNFT.HaltWorker =', cm.GroupNFT.HaltWorker);
console.log('GroupNFT.HaltStatus =', cm.GroupNFT.HaltStatus);

const holder = cm.GroupInfoNFTHolderScript;
const newMethods = ['setPendingGpk', 'activateGpk', 'setGpkImmediate', 'setCrossLimit', 'setHaltWorker', 'setHaltStatus'];
let ok = true;
for (const m of newMethods) {
    const present = typeof holder[m] === 'function';
    console.log(`  ${m}:`, present ? 'OK' : 'MISSING');
    if (!present) ok = false;
}
console.log('switchGroup(forceAdmin 适配):', typeof holder.switchGroup === 'function' ? 'OK' : 'MISSING');

console.log('--- require sdk ---');
const sdkModule = require('../sdk');
console.log('sdk exports:', Object.keys(sdkModule).join(', '));
const ContractSdk = sdkModule.ContractSdk || sdkModule;
const proto = ContractSdk.prototype;
const sdkMethods = ['setGpkPending', 'activateGpk', 'setGpkImmediate', 'setCrossLimit', 'setHaltWorker', 'setHaltStatus'];
for (const m of sdkMethods) {
    const present = typeof proto[m] === 'function';
    console.log(`  sdk.${m}:`, present ? 'OK' : 'MISSING');
    if (!present) ok = false;
}

console.log(ok ? '\nALL SMOKE OK' : '\nSMOKE FAILED');
process.exit(ok ? 0 : 1);
