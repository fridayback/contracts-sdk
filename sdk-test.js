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

async function submitAndWaitConfirmed(signedTx) {
    console.log('Tx:', signedTx.to_json());
    signedTx = await sdk.addSignature(signedTx, signFnNext);
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

    console.log(JSON.stringify(ret));
}

const stakeAddr = 'stake_test17p8g82t994mpvlvj3xcephhn2fmtasnzlvxdrr92fgyrt4gw25zwy';
async function main() {
    // const sdk = new ContractSdk(false);
    await sdk.init(host, 1337);

    
    const collateralUtxo = await tryGetCollateralUtxo();

    // {
    //     const utxosForFee = await getUtxoForFee();
    //     let groupInfo = await getGroupInfo();
    //     console.log('before setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    //     let signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn);
    //     let o = await submitAndWaitConfirmed(signedTx);
    //     groupInfo = await getGroupInfo();
    //     console.log('after setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    // }

    // {
    //     console.log('amount before mint:', (await getCheckTokenUtxo(0)).length);
    //     const utxosForFee = await getUtxoForFee();
    //     const signedTx = await sdk.mintTreasuryCheckToken(2, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn);
    //     const o = await submitAndWaitConfirmed(signedTx);
    //     console.log('amount after mint:', (await getCheckTokenUtxo(0)).length);
    // }

    // {
    //     console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
    //     const utxosForFee = await getUtxoForFee();
    //     const signedTx = await sdk.mintMintCheckToken(2, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn);
    //     const o = await submitAndWaitConfirmed(signedTx);
    //     console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
    // }

    {
        let os = await getCheckTokenUtxo(0);
        console.log('amount before burn:', os.length);
        const utxpSpend = os.slice(0,2);
        const utxosForFee = await getUtxoForFee(); 
        const signedTx = await sdk.burnTreasuryCheckToken(mustSignBy,utxosForFee,[collateralUtxo],utxpSpend,admin,signFn);
        const o = await submitAndWaitConfirmed(signedTx);
        console.log('after before burn:', (await getCheckTokenUtxo(0)).length);
    }

}


main().then(() => {
    console.log('successful !');
}).catch(e => {
    console.error(e);
}).finally(() => {
    ogmiosUtils.unInit();
})