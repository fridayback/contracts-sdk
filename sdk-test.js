const ContractSdk = require('./sdk');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const ogmiosUtils = require('./ogmios-utils');

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

const mustSignBy = [
    admin,adminNext
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

async function main() {
    const sdk = new ContractSdk(false);
    await sdk.init(host, 1337);

    let utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();

    let signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn);
    signedTx = await sdk.addSignature(signedTx, signFnNext);
    console.log('update Tx:', signedTx.to_json());
    const ret = await ogmiosUtils.evaluateTx(signedTx);
    console.log(ret);
    const txHash = await ogmiosUtils.submitTx(signedTx);
    const o = await ogmiosUtils.waitTxConfirmed(admin, txHash);
    console.log(o);
}


main().then(() => {
    console.log('successful !');
}).catch(e => {
    console.error(e);
}).finally(()=>{
    ogmiosUtils.unInit();
})