#!/usr/bin/env node
// 验证清 pending（空字节 #""）在 datum 中的编码与回读
const contractsMgr = require('../contracts-mgr');

// 构造 18 项参数，params[14] = ''（清 pending）
const params = {};
for (let i = 0; i <= 17; i++) params[i] = 'ab';
params[14] = '';  // pending 清空
params[17] = '00'; // halt status 0

const datumHex = contractsMgr.GroupNFT.genGroupInfoDatum(params).to_hex();
const back = contractsMgr.GroupNFT.groupInfoFromDatum(datumHex);
console.log('len:', Object.keys(back).length);
console.log('back[14]:', JSON.stringify(back['14']), back['14'] === '' ? 'OK empty' : 'FAIL');
console.log('back[17]:', back['17']);
console.log('all keys:', Object.keys(back).join(','));
if (Object.keys(back).length === 18 && back['14'] === '' && back['17'] === '00') {
    console.log('EMPTY PENDING OK');
    process.exit(0);
} else {
    console.log('FAIL');
    process.exit(1);
}
