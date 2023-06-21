const ContractSdk = require('./sdk');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const ogmiosUtils = require('./ogmios-utils');
const contractsMgr = require('./contracts-mgr');
const contracts = require('./contracts')

const host = '127.0.0.1';
// const host = '52.13.9.234'//preview
// const host = '44.229.225.45';//preprod

const collateralAmount = 123450000
const parameterizedAmount = 5678900;
const parameterizedAmount2 = 5600000;

const payPrvKeyNext = '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a';
const payPrvKey = 'cbc623254ca1eb30d8cb21b2ef04381372ff24529a74e4b5117d1e3bbb0f0188';
const scriptRefOwnerAddr = 'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd';
const admin = 'addr_test1qz6twkzgss75sk379u0e27phvwhmtqqfuhl5gnx7rh7nux2xg4uwrhx9t58far8hp3a06hfdfzlsxgfrzqv5ryc78e4s4dwh26';
const adminNext = 'addr_test1qpewhjzf3nsh8ytwtkqewf0n8kkynxsva867stedemugsa5a5fxd4tcsgemc7gc4sqfww6f6s0rc45kcsjkd2wzxt2dqnhh2wl';

const sdk = new ContractSdk(false);

const tmpaddr = CardanoWasm.Address.from_bech32('addr_test1qzqchffrha5hjcztwx0p48wtv0y36hw098rdw366fqlzuymun97wgelqtwe9aladfx2pukf4jdfqtjh7cnja50y247dsnalv6f');
const basetmp = CardanoWasm.BaseAddress.from_address(tmpaddr);

const signatories = [
    admin,
    adminNext,
    'addr_test1qzqchffrha5hjcztwx0p48wtv0y36hw098rdw366fqlzuymun97wgelqtwe9aladfx2pukf4jdfqtjh7cnja50y247dsnalv6f',
    'addr_test1qr2h8sc5v5wg4eg0ennegxvpqrtdxnhxldgaysakvmh5tx4yqse03kx9yltqx3w4sgvrc23n75wuj4vtglj0aafecaqszc0l33',
    'addr_test1qr763w3kp7yfl3xdz2vk405jc7v7rya67yga3zp7vzkr47c0g5fgz07n45z3eqnu9f465lhmlan65aju6ukml8tc0hvssnqf4g'
]

const mustSignBy = [
    admin, adminNext
];

const signFn = async hash => {
    return ogmiosUtils.signFn(payPrvKey, hash);
}

const signFnNext = async hash => {
    return ogmiosUtils.signFn(payPrvKeyNext, hash);
}

const evaluate = async function (rawTx) {
    // console.log('\n\n\n',rawTx,'\n\n\n');
    return await ogmiosUtils.evaluateTx(CardanoWasm.Transaction.from_hex(rawTx));
}

async function getUtxoOfAmount(amount) {
    let utxos = await ogmiosUtils.getUtxo(admin);
    utxos = utxos.filter(o => {
        return (Object.keys(o.value.assets).length <= 0) && (o.value.coins * 1 == amount * 1)
    });
    return utxos;
}

async function getUtxoForFee() {
    let utxos = await ogmiosUtils.getUtxo(admin);
    utxos = utxos.filter(o => {
        return (o.value.coins * 1 != collateralAmount && o.value.coins * 1 != parameterizedAmount && o.value.coins * 1 != parameterizedAmount2)
    });
    return utxos;
}

async function tryGetCollateralUtxo() {
    let utxo = await getUtxoOfAmount(collateralAmount);
    if (utxo.length <= 0) {
        utxo = await makeUtxoOfAmount(collateralAmount);
    } else {
        utxo = utxo[0];
    }
    return utxo;
}

async function getGroupInfo() {
    const groupInfoTokenUtxo = await sdk.getGroupInfoNft();
    return contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoTokenUtxo.datum);
}

async function getAdminInfo() {
    const adminNftUtxo = await sdk.getAdminNft();
    return contractsMgr.AdminNFTHolderScript.getSignatoriesInfoFromDatum(adminNftUtxo.datum);
}

async function getCheckTokenUtxo(type) {
    let owner;
    let tokenId;
    const groupInfo = await getGroupInfo();
    const stkvh = groupInfo[contractsMgr.GroupNFT.StkVh]
    switch (type) {
        case 0:
            owner = contracts.TreasuryCheckScript.address(stkvh).to_bech32(sdk.ADDR_PREFIX);
            tokenId = contracts.TreasuryCheckTokenScript.tokenId();
            break;

        case 1:
            owner = contracts.MintCheckScript.address(stkvh).to_bech32(sdk.ADDR_PREFIX);
            tokenId = contracts.MintCheckTokenScript.tokenId();
        default:
            break;
    }
    let treasuryUtxos = await ogmiosUtils.getUtxo(owner);

    treasuryUtxos = treasuryUtxos.filter(o =>
        (o.value.assets && o.value.assets[tokenId] * 1 > 0))


    return treasuryUtxos;
}

async function finalTxEvaluate(signedTx) {
    signedTx = await sdk.addSignature(signedTx, signFnNext);
    signedTx = await sdk.addSignature(signedTx, signFn);
    console.log('Tx:', signedTx.to_json());
    return await ogmiosUtils.evaluateTx(signedTx);
}

async function submitAndWaitConfirmed(signedTx) {

    signedTx = await sdk.addSignature(signedTx, signFnNext);
    signedTx = await sdk.addSignature(signedTx, signFn);
    console.log('Tx:', signedTx.to_json());
    const ret = await ogmiosUtils.evaluateTx(signedTx);
    console.log(ret);
    const txHash = await ogmiosUtils.submitTx(signedTx);
    const o = await ogmiosUtils.waitTxConfirmed(admin, txHash);
    return o;
}

function showGroupInfo(groupInfo) {
    let ret = {};
    for (const i in groupInfo) {
        // for (let i = 0; i < groupInfo.length; i++) {
        switch (i * 1) {
            case contractsMgr.GroupNFT.Version:
                ret.Version = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.Admin:
                ret.Admin = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.OracleWorker:
                ret.OracleWorker = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.GPK:
                ret.GPK = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.MintCheckVH:
                ret.MintCheckVH = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.TreasuryCheckVH:
                ret.TreasuryCheckVH = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.StkCheckVh:
                ret.StkCheckVh = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.StkVh:
                ret.StkVh = groupInfo[i];
                break;
            default:
                break;
        }

    }

    // console.log(JSON.stringify(ret));
    return ret;
}

const stakeAddr = 'stake_test17p8g82t994mpvlvj3xcephhn2fmtasnzlvxdrr92fgyrt4gw25zwy';
async function main() {
    // const sdk = new ContractSdk(false);
    await sdk.init(host, 1337);


    const collateralUtxo = await tryGetCollateralUtxo();
    const protocolParams = await ogmiosUtils.getParamProtocol();
    {
        // const rawTx = '84a900838258201ba3c34e0250abc119d235869fc0712c13419ddb5eb2d083ec2de96fcf866b2b02825820c7e4d46516778e6e88bd6650dcf759db5311382cffb1ce1537fda7228565ae2700825820c7e4d46516778e6e88bd6650dcf759db5311382cffb1ce1537fda7228565ae27010183a300581d70bd61924e0b87d297749f6fb125b4221b592b6b6df34486925e4bffdd01821a0023943ea1581c76c4659b1b328354e6bded80f25b8ea17521584fc9919ef54a3fe86ca15247726f7570496e666f546f6b656e436f696e01028201d818590119d8799f9f581cbd61924e0b87d297749f6fb125b4221b592b6b6df34486925e4bffdd581c56eed02841b7835d050d1801ccc61939ce8281026932576db36ef66a582102676e77d38e58f5e69081b7f3ad88b3f9045ba807e20c48c9fdd4fb8e55256d06581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c083f459eeb1e23972c6fe190543dcbbcbc5d6db9c4892403ea288382581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581cb007bdeb1853cf42a36eb07737185e608b778ce8a6b94a6ed8f6c7b2581c4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5581c9c2abd15db9e9b27fca7f4b367cc08e28483d4ca05fcc63a3f58413cffffa300581d70f5fd1d6971f9e8f51a1e501178a7f77d19619e6abd503a700f82a80901821a001af6bca1581c32b20627e2309c04a2cf462458ee63cb61712c3b7c952da8cc37b6a5a14c41646d696e4e4654436f696e01028201d818589dd8799f9f581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c72ebc8498ce173916e5d819725f33dac499a0ce9f5e82f2dcef88876581c818ba523bf6979604b719e1a9dcb63c91d5dcf29c6d7475a483e2e13581cd573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459a581cfda8ba360f889fc4cd12996abe92c799e193baf111d8883e60ac3afbff01ff82583900d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c7411a00786a86021a00100abb0b58207abdb2aeb5fbe2596e92380ebaa6f9e7fae3440286eb8a429483a1fec58c9c120d81825820f8abbf237bbf6fdb86215912a9c73888ddc9b6977146d1aa9a19a53527f31a57000e81581cd573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459a1082583900d573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459aa40432f8d8c527d60345d582183c2a33f51dc9558b47e4fef539c741821a002c6592a0111a001fe5ae1284825820c7e4d46516778e6e88bd6650dcf759db5311382cffb1ce1537fda7228565ae27008258203c124ab49b4188b9744e874b2367e6545f197d05325b774de02c0ba1a76a303a00825820c7e4d46516778e6e88bd6650dcf759db5311382cffb1ce1537fda7228565ae270182582072745b379e00db1be0350779a247b08833b38630e182c676468e9e62fd698b8a00a20380058284000105821a004c988e1a5479a224840002d87980821a0056991d1a6338f236f5f6';
        // const tx1 = CardanoWasm.Transaction.from_hex(rawTx);
        // const wks = CardanoWasm.TransactionWitnessSet.from_hex('a30081825820f86e30c08857030d1fcadfcb2e750c5f1f817deed4747be1a7a5fc9a5167678b584004379ebbb96a60b6c4e31c52d5e04b44d617dead8bce1921f283de60c1ca246e8034491f13f2c2e9d19986725234babe19e0390d7330223f55d3a0e897929e0e0380058284000105821a004c988e1a5479a224840002d87980821a0056991d1a6338f236');
        // const tx = CardanoWasm.Transaction.new(tx1.body(),wks);
        // console.log(tx.to_json());
        // const ex = await ogmiosUtils.evaluateTx(tx);
    }
    // return;
    let signFn;
    {
        const utxosForFee = await getUtxoForFee();
        let adminInfo = await getAdminInfo();
        console.log('before setAdmin:', JSON.stringify(adminInfo));
        let signedTx = await sdk.setAdmin(signatories, 1, mustSignBy, utxosForFee, [collateralUtxo], admin);
        console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        const exUnit = await finalTxEvaluate(signedTx);
        // signedTx = await sdk.setAdmin(signatories, 1, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
        let o = await submitAndWaitConfirmed(signedTx);
        adminInfo = await getGroupInfo();
        console.log('after setAdmin:', JSON.stringify(adminInfo));
    }

    {
        const utxosForFee = await getUtxoForFee();
        let groupInfo = await getGroupInfo();
        console.log('before setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
        let signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        // signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin,signFn,exUnit);
        let o = await submitAndWaitConfirmed(signedTx);
        groupInfo = await getGroupInfo();
        console.log('after setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    }

    {
        console.log('amount before mint:', (await getCheckTokenUtxo(0)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.mintTreasuryCheckToken(2, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        // console.log('--%%%%%%%%%%%%%-------\n',signedTx.to_json());
        // signedTx = await sdk.mintTreasuryCheckToken(2, mustSignBy, utxosForFee, [collateralUtxo], admin,signFn,exUnit);
        const o = await submitAndWaitConfirmed(signedTx);
        console.log('amount after mint:', (await getCheckTokenUtxo(0)).length);
    }

    {
        console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.mintMintCheckToken(2, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        // signedTx = await sdk.mintMintCheckToken(2, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        const o = await submitAndWaitConfirmed(signedTx);
        console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
    }

    {
        let os = await getCheckTokenUtxo(0);
        console.log('amount before burn:', os.length);
        const utxpSpend = os.slice(0, 1);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.burnTreasuryCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin);
        const exUnit = await finalTxEvaluate(signedTx);
        // signedTx = await sdk.burnTreasuryCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin, signFn, exUnit);
        const o = await submitAndWaitConfirmed(signedTx);
        console.log('after before burn:', (await getCheckTokenUtxo(0)).length);
    }

    {
        let os = await getCheckTokenUtxo(1);
        console.log('amount before burn:', os.length);
        const utxpSpend = os.slice(0, 1);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.burnMintCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin);
        const exUnit = await finalTxEvaluate(signedTx);
        // signedTx = await sdk.burnMintCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin, signFn, exUnit);
        const o = await submitAndWaitConfirmed(signedTx);
        console.log('after before burn:', (await getCheckTokenUtxo(1)).length);
    }

}


main().then(() => {
    console.log('successful !');
}).catch(e => {
    console.error(e);
    // console.log(e[0].message);
}).finally(() => {
    ogmiosUtils.unInit();
})