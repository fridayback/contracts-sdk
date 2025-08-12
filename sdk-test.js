const ContractSdk = require('./sdk');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const ogmiosUtils = require('./ogmios-utils');
const contractsMgr = require('./contracts-mgr');
const contracts = require('./contracts')
const utils = require('./utils')

const host = '127.0.0.1';
// const host = '52.13.9.234'//preview
// const host = '44.229.225.45';//preprod

const collateralAmount = 123450000
const parameterizedAmount = 5678900;
const parameterizedAmount2 = 5600000;

// const collateralAmount = 5000000;
// const parameterizedAmount = 2222221;
// const parameterizedAmount2 = 2222222

const kkkk = '61b4743240b26bc7bf495aada16e3e1abb8d3147e2ad97e35cf01b36be1afe0b';//CardanoWasm.PrivateKey.generate_ed25519().to_hex();
const newKey = CardanoWasm.PrivateKey.from_hex(kkkk);
const newPkh = newKey.to_public().hash();
const adminaddr = CardanoWasm.BaseAddress.new(
    CardanoWasm.NetworkIdKind.Mainnet
    , CardanoWasm.Certificate.from_keyhash(newPkh)
    , CardanoWasm.Certificate.from_keyhash(newPkh))


// const payPrvKeyNext = '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a';
// const payPrvKey = kkkk;
// const scriptRefOwnerAddr = 'addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym';
// const admin = adminaddr.to_address().to_bech32('addr');
// const adminNext = 'addr_test1qpewhjzf3nsh8ytwtkqewf0n8kkynxsva867stedemugsa5a5fxd4tcsgemc7gc4sqfww6f6s0rc45kcsjkd2wzxt2dqnhh2wl';


const payPrvKeyNext = '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a';
const payPrvKey = 'cbc623254ca1eb30d8cb21b2ef04381372ff24529a74e4b5117d1e3bbb0f0188';
const scriptRefOwnerAddr = 'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd';
const admin = 'addr_test1qz6twkzgss75sk379u0e27phvwhmtqqfuhl5gnx7rh7nux2xg4uwrhx9t58far8hp3a06hfdfzlsxgfrzqv5ryc78e4s4dwh26';
const adminNext = 'addr_test1qpewhjzf3nsh8ytwtkqewf0n8kkynxsva867stedemugsa5a5fxd4tcsgemc7gc4sqfww6f6s0rc45kcsjkd2wzxt2dqnhh2wl';

const sdk = new ContractSdk(false);

// const tmpaddr = CardanoWasm.Address.from_bech32('addr_test1qzqchffrha5hjcztwx0p48wtv0y36hw098rdw366fqlzuymun97wgelqtwe9aladfx2pukf4jdfqtjh7cnja50y247dsnalv6f');
// const basetmp = CardanoWasm.BaseAddress.from_address(tmpaddr);

//addr1q9zwpxsfyz9lp3h6ammx4w05tmznf8fc9jnhphve6yum6xjyuzdqjgyt7rr04mhkd2ulghk9xjwnst98wrwen5feh5dqlz0n7t

const signatories = [
    admin,
    adminNext,
    'addr_test1qzqchffrha5hjcztwx0p48wtv0y36hw098rdw366fqlzuymun97wgelqtwe9aladfx2pukf4jdfqtjh7cnja50y247dsnalv6f',
    'addr_test1qr2h8sc5v5wg4eg0ennegxvpqrtdxnhxldgaysakvmh5tx4yqse03kx9yltqx3w4sgvrc23n75wuj4vtglj0aafecaqszc0l33',
    'addr_test1qr763w3kp7yfl3xdz2vk405jc7v7rya67yga3zp7vzkr47c0g5fgz07n45z3eqnu9f465lhmlan65aju6ukml8tc0hvssnqf4g',
    'addr_test1qpkq2gjlphgx0d8uq72rs47mkkuyrslzqvvvklk273q4nr7uwx4038letqarp479q7wykxl9lygkmrkrq84sazslw8ts32d299',
    'addr_test1qpstydtgjfyavqecas5w730m86tltgl3ask2xsl3hfl2vw9ng88pgc8c4mh3tx0mpm2es8e54w86rvat6de0nmgec5ast965pg',
    'addr_test1qp884fateqg23tt8q2j7xjvk6kqu3wczfdck58egs8tyzvvnp2atxdggqzknchlkmxnnu0wgy9pc4ugyax3u0vsv5fuq5v6kp8',
    'addr_test1qqesh9yrdf4ghwm5p8muwuapvgwxxk4ywa9mzgke2vg9mv5zgtcshah4maetd86h08jjednyrermpej7rf0jd240tnlqx6g0kv'
]

const mustSignBy = [
    admin//, adminNext
];

let input = {
    "function": "updateGroupNFT",
    "paras": {
        "update": {
            "newOracleWorker": "addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd"
        },
        "signers": [""]
    },
    "tx": "",
    "witnessSet": ""
};

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

    // signedTx = await sdk.addSignature(signedTx, signFnNext);
    // signedTx = await sdk.addSignature(signedTx, signFn);
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

async function testssss() {
    async function tryScriptRefUtxo(script) {

        let refUtxo = await ogmiosUtils.getUtxo(scriptRefOwnerAddr);
        // const arr = refUtxo.filter(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
        const ref = refUtxo.find(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
        if (ref) return ref;

        // let utxtos = await getUtxoForFee();

        // let signedTx = await utils.createScriptRef(protocolParamsGlobal, utxtos, admin, scriptRefOwnerAddr, script, signFn);
        // // console.log(signedTx.to_json());
        // const ret = await ogmiosUtils.submitTx(signedTx);
        // console.log('create script ref:', ret)
        // return await ogmiosUtils.waitTxConfirmed(scriptRefOwnerAddr, ret);
    }

    const utxoForFee = [
        {
            txHash: '7bb7149a60df1955035e9bb966c82a9ec37bd8542352f34247bf5de5a466040a',
            index: 3,
            value: { coins: '33333876', assets: {} },
            address: 'addr_test1qqzvl5hsla39l8z56gfv0586mdpx8dxp38xdjua4wrcarlgyelf0plmzt7w9f5sjclg04k6zvw6vrzwvm9em2u83687sneen8a',
            datum: null,
            datumHash: null,
            script: null
        }
    ];
    const treasuryUtxo = [
        {
            txHash: 'e3a8c10137ce522d3a1149254c14ab03a43412f5eec35d903971bd6c53df0899',
            index: 1,
            value: {
                coins: '1293000', assets: {
                    '9772ff715b691c0444f333ba1db93b055c0864bec48fff92d1f2a7fe.446a65645f746573744d6963726f555344': 6347838784
                }
            },
            address: 'addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp',
            datum: 'd8799f01ff',
            datumHash: null,
            script: null
        }
    ];
    const treasuryCheckUxto = {
        txHash: '8b678e01b044ef6006e48dc82b81589d37f3abc8bb83c27b2a7bb57c4d028adf',
        index: 0,
        value: {
            coins: '1293000', assets: {
                '9772ff715b691c0444f333ba1db93b055c0864bec48fff92d1f2a7fe.446a65645f746573744d6963726f555344': 6347838784
            }
        },
        address: 'addr_test1xqweycval58x8ryku838tjqypgjzfs3t4qjj0pwju6prgmjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swlkfgp',
        datum: 'd8799f01ff',
        datumHash: null,
        script: null
    };

    let redeemProof = {
        "to": "addr_test1qz6twkzgss75sk379u0e27phvwhmtqqfuhl5gnx7rh7nux2xg4uwrhx9t58far8hp3a06hfdfzlsxgfrzqv5ryc78e4s4dwh26",
        "tokenId": "9772ff715b691c0444f333ba1db93b055c0864bec48fff92d1f2a7fe.446a65645f746573744d6963726f555344",
        "amount": 50,
        "adaAmount": "1245590",
        "txHash": "8b678e01b044ef6006e48dc82b81589d37f3abc8bb83c27b2a7bb57c4d028adf",
        "index": 0, "mode": 0, "signature": "",
        "pk": "02bb1a9d739f12068f8886671c30c4aa08dbff9085eaf7255df0f7f4925e921d3e",
        "txType": 0, "uniqueId": "2ce5037a837dc399f44b465a199ce932ff5f8d14b59a509dd478ad05a0a6d172",
        "ttl": 1687654250000, "txTTL": 31971050, "outputCount": 2
    };
    const hash = contracts.TreasuryScript.caculateRedeemDataHash(redeemProof);
    const { signature, vkey } = await signFn(hash);
    redeemProof.signature = signature;

    const scriptRefUtxo = await sdk.getScriptRefUtxo(contracts.TreasuryScript.script());
    const treasuryCheckSriptRefUtxo = await sdk.getScriptRefUtxo(contracts.TreasuryCheckScript.script());
    const groupInfUtxo = await sdk.getGroupInfoNft();

    const protocolParams = await ogmiosUtils.getParamProtocol();

    const signedTx = await contracts.TreasuryScript.transferFromTreasury(protocolParams, utxoForFee, treasuryUtxo, scriptRefUtxo, groupInfUtxo, { coins: 0, assets: {} },
        redeemProof.to, redeemProof, utxoForFee, treasuryCheckUxto, scriptRefUtxo, admin, ogmiosUtils.evaluateTx, signFn, undefined, 86987987);
    console.log(signedTx.to_json());
}

async function sendTx() {
    // const vkey = CardanoWasm
    const rawTx = '84a900838258200f2f9814c79f786a06622d4a0d70eaa6a9d0feedc543c79a103b94407d26fe1900825820952f272a6fe0423c6b2afccfddad47fd157333f36f4bac76a364781f525a70bd00825820c1f3e093b0fb4e3aa2ea93b863b8b49fccd33473c2886f21bd3bd9e3f66bae1f010183a300581d70bd61924e0b87d297749f6fb125b4221b592b6b6df34486925e4bffdd01821a0023943ea1581c76c4659b1b328354e6bded80f25b8ea17521584fc9919ef54a3fe86ca15247726f7570496e666f546f6b656e436f696e01028201d818590119d8799f9f581cbd61924e0b87d297749f6fb125b4221b592b6b6df34486925e4bffdd581c56eed02841b7835d050d1801ccc61939ce8281026932576db36ef66a582102bb1a9d739f12068f8886671c30c4aa08dbff9085eaf7255df0f7f4925e921d3e581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c083f459eeb1e23972c6fe190543dcbbcbc5d6db9c4892403ea288382581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581cb007bdeb1853cf42a36eb07737185e608b778ce8a6b94a6ed8f6c7b2581c4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5581c9c2abd15db9e9b27fca7f4b367cc08e28483d4ca05fcc63a3f58413cffffa300581d70f5fd1d6971f9e8f51a1e501178a7f77d19619e6abd503a700f82a80901821a001ee8e4a1581c32b20627e2309c04a2cf462458ee63cb61712c3b7c952da8cc37b6a5a14c41646d696e4e4654436f696e01028201d81858d9d8799f9f581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c72ebc8498ce173916e5d819725f33dac499a0ce9f5e82f2dcef88876581c818ba523bf6979604b719e1a9dcb63c91d5dcf29c6d7475a483e2e13581cd573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459a581cfda8ba360f889fc4cd12996abe92c799e193baf111d8883e60ac3afb581c6c05225f0dd067b4fc07943857dbb5b841c3e20318cb7ecaf441598f581c4e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d64131ff01ff825839004e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d64131930abab3350800ad3c5ff6d9a73e3dc821438af104e9a3c7b20ca2781a3b3f6b0a021a000c82390b5820b9640f7098fb34a8dd9f8c2d453e77dce7d559cd4b563a866df01312dc48eea90d81825820c1f3e093b0fb4e3aa2ea93b863b8b49fccd33473c2886f21bd3bd9e3f66bae1f000e81581c4e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d6413110825839004e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d64131930abab3350800ad3c5ff6d9a73e3dc821438af104e9a3c7b20ca278821a00337696a0111a0018d4aa1284825820952f272a6fe0423c6b2afccfddad47fd157333f36f4bac76a364781f525a70bd008258200f2f9814c79f786a06622d4a0d70eaa6a9d0feedc543c79a103b94407d26fe19008258203c124ab49b4188b9744e874b2367e6545f197d05325b774de02c0ba1a76a303a0082582072745b379e00db1be0350779a247b08833b38630e182c676468e9e62fd698b8a00a200818258200277adf989e3b57620980cb68e77f7af21ec13498fc40aaa95f043ef941360dd584066d9faba494ee9b9793601480ba14b204c5fbbcc6e969703406a507c0bff97f259aea4d22e44ced96b869ef5745e2d14ca2dc4e73f5c26aef74c2f89c4023908058284000005821a004c988e1a5479a224840001d87980821a00295a5e1a2f0e3b97f5f6'
    const tx = CardanoWasm.Transaction.from_hex(rawTx);
    console.log(tx.witness_set().vkeys().get(0).vkey().to_hex());
    const hash = await ogmiosUtils.evaluate(rawTx);
    const vk = CardanoWasm.Vkeywitness.new(
        CardanoWasm.Vkey.from_hex('58200277adf989e3b57620980cb68e77f7af21ec13498fc40aaa95f043ef941360dd'),
        CardanoWasm.Ed25519Signature.from_hex('66d9faba494ee9b9793601480ba14b204c5fbbcc6e969703406a507c0bff97f259aea4d22e44ced96b869ef5745e2d14ca2dc4e73f5c26aef74c2f89c4023908')
    );
    // CardanoWasm
    console.log(vk.signature().to_hex(), vk.vkey().to_hex(), vk.to_json());
}

const aa = CardanoWasm.ScriptDataHash.from_bech32('script_data1jr20xc3tehxc3x9xzuagq5mwrvhdav4q0arxjmv9tqscghshn06s0lm7st');
console.log(aa.to_hex());
//90d4f3622bcdcd8898a6173a80536e1b2edeb2a07f46696d855821845e179bf5
const stakeAddr = 'stake_test17p8g82t994mpvlvj3xcephhn2fmtasnzlvxdrr92fgyrt4gw25zwy';

function show() {
    const stakeHash = contractsMgr.StoremanStackScript.script().hash().to_hex();
    console.log('TreausyCheck Addr:', contracts.TreasuryCheckScript.script().hash().to_hex(), contracts.TreasuryCheckScript.address(stakeHash).to_bech32(sdk.ADDR_PREFIX));
    console.log('MintCheck Addr:', contracts.MintCheckScript.script().hash().to_hex(), contracts.MintCheckScript.address(stakeHash).to_bech32(sdk.ADDR_PREFIX));
    console.log('AdminHolder Addr:', contractsMgr.AdminNFTHolderScript.script().hash().to_hex(), contractsMgr.AdminNFTHolderScript.address().to_bech32(sdk.ADDR_PREFIX));
    console.log('GroupInfoNFTnHolder Addr:', contractsMgr.GroupInfoNFTHolderScript.script().hash().to_hex(), contractsMgr.GroupInfoNFTHolderScript.address().to_bech32(sdk.ADDR_PREFIX));
}

async function tryScriptRefUtxo(script) {

    const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

    let refUtxo = await ogmiosUtils.getUtxo(scriptRefOwnerAddr);
    // const arr = refUtxo.filter(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
    const ref = refUtxo.find(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
    if (ref) return ref;

    let utxtos = await getUtxoForFee();

    let signedTx = await utils.createScriptRef(protocolParamsGlobal, utxtos, admin, scriptRefOwnerAddr, script, signFn);
    // console.log(signedTx.to_json());
    const ret = await ogmiosUtils.submitTx(signedTx);
    console.log('create script ref:', ret)
    return await ogmiosUtils.waitTxConfirmed(scriptRefOwnerAddr, ret);
}

const newTreasyCheckVH = 'addr_test1xqufvx602k4ad7wevz2w8qh2l28mecxa49683xa8kpq3r26wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sdtyha6';
const newMintCheckVH = 'addr_test1xpmqvkf78d98ngyzv578gw4de9wjquuhh97087l87sna0f6wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sajfyg6';

// const newTreasyCheckVH = 'addr_test1xqs45y5mw56t032lv8qgt9sp9xhwvfw49m6sus4xrhnrpwjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sh4zls7';
// const newMintCheckVH = 'addr_test1xq3mlgvywct2zzyhv5ttmsf6c7quymvnxnx0nk3wz629wp2wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swesly4';
const cbor = require('cbor-sync');
async function main() {
    // const sdk = new ContractSdk(false);
    const mainnetUrl = "https://nodes.wandevs.org/cardano";
    const testnetUrl = "https://nodes-testnet.wandevs.org/cardano";
    await sdk.init(testnetUrl);
    show();

    // const cborHex = '84a90082825820bf0ce897ccd74318d6e7efb6ecbaaad9320b0c59bae52738d36082922e51282e01825820c7ee81fff531b71df2c20fe0b511cb2fe2f66817bda8877df108d9dc46a20482010182a300581d712cbf787c0586588393ee0a284760c25db4f139557e113d897af4322601821a0013126ca1581c53cc8f42ca118ffa3fe0f66cf82d973b73913e0ff25edb2e5e1371afa14c41646d696e4e4654436f696e01028201d8185825d8799f9f581ce401804f5a9822508cf9cee59248e0d977778e7c001ce8a7d81f50beff01ff82583901e401804f5a9822508cf9cee59248e0d977778e7c001ce8a7d81f50befddc71f25b5b469185ba09e60f78200d5be05ff4dfa1e9c7722661951b00000001c1685126021a000ca7cf0b5820c7751fab0e918176c2ab9873c609e98dd659f97c22c056be35e566836ba5d0440d818258208f7c78d1e03e4e443486ad338b6f7e2bc500c9779c2490c9ddcddb5018cd7925000e81581ce401804f5a9822508cf9cee59248e0d977778e7c001ce8a7d81f50be1082583901e401804f5a9822508cf9cee59248e0d977778e7c001ce8a7d81f50befddc71f25b5b469185ba09e60f78200d5be05ff4dfa1e9c7722661951a00332c1a111a00191f261282825820be8d471f5ec6aef8d9e1f18afceed18e314361db7998d55bbe1543f3fe00ac3000825820c7ee81fff531b71df2c20fe0b511cb2fe2f66817bda8877df108d9dc46a2048201a0f5f6';
    // const ss = CardanoWasm.Transaction.from_hex(cborHex)
    // console.log(ss.to_json());

    // for (let i = 0; i < 10000; i++) {
    //     await ogmiosUtils.getParamProtocol();

    // }

    const collateralUtxo = await tryGetCollateralUtxo();
    const protocolParams = await ogmiosUtils.getParamProtocol();

    {
        // await testssss();
        // await sendTx();
        // return;
    }
    // return;
    // let signFn;

    // const treasuryCheckRef = await tryScriptRefUtxo(contracts.TreasuryCheckScript.script());
    // const mintCheckRef = await tryScriptRefUtxo(contracts.MintCheckScript.script());

    {
        const utxosForFee = await getUtxoForFee();
        let groupInfo = await getGroupInfo();
        console.log('before upgrade groupNFTHolder:', JSON.stringify(groupInfo));
        const newHolder = 'addr_test1wqxt0mepyg5cp4apcf4k07n88d224cxed6mmd2yd93j8hsqw5s829';//contractsMgr.GroupInfoNFTHolderScript.address().to_bech32(sdk.ADDR_PREFIX);
        const groupInfoUtxo = await sdk.getGroupInfoNft();

        const params = {
            [contractsMgr.GroupNFT.Version + '']:"73d1b47ecda59944e6cfe3ad7582993f1df1d14876a2454744ef26dc"
            ,[contractsMgr.GroupNFT.Admin + '']:"35c3cfda4652b26438b567ec7966a3db0deda9a9a0185cf3d67cb5e3"
            ,[contractsMgr.GroupNFT.GPK + '']:"d55a510b6890d6eb2fc778e33db2b9376c9427f247f1117ec227be8ae5303514"
            ,[contractsMgr.GroupNFT.BalanceWorker + '']:"b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19"
            ,[contractsMgr.GroupNFT.TreasuryCheckVH + '']:"d73c3feecfe48ece5f900708d3dab640cdc36dde774d12ac4c8b2f1e"
            ,[contractsMgr.GroupNFT.OracleWorker + '']:"b4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19"
            ,[contractsMgr.GroupNFT.MintCheckVH + '']:"821caca79e6745ba3b8780e3c9cf4a57ebc463ca596d1676ed5de5df"
            ,[contractsMgr.GroupNFT.StkVh + '']:"a94db90fe8f094e5178ee585046f7a8f4bea06d5c04b4ab195f08f16"
            ,[contractsMgr.GroupNFT.StkCheckVh + '']:"c61727cf755a888e19de2530f96435780a67dfb61e49fcfd49e33d18"
            ,'9':"e9f9f6f5bfd064179d663d9258a75931ae00ee0042765ab341c25cf4"  // NFTRefHolderVH
            ,'10':"a68a4b8ec97ca4a8726f754f76df9ce0abbfca9861b1a2f16db45783" // NFTTreasuryCheckVH
            ,'11':"8b777ff575151bbcb4f414895f597e0cf5bb605916c9394e4c9b93a8" // NFTMintCheckVH
        }

        // const newDatum = genGroupInfoDatum(params).toString('hex');//groupInfoUtxo.datum;
        const newDatum = 'd8799f9f581c0cb7ef21222980d7a1c26b67fa673b54aae0d96eb7b6a88d2c647bc0581c0710d11245e21ddf6d93ca9cf141ef4aa6c39c1e4db1228f349dd0835820d55a510b6890d6eb2fc778e33db2b9376c9427f247f1117ec227be8ae5303514581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581cd62910fbb1e4cf9d01814b11314c5f58fc0df1e47da498daa3e74046581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c50e1278e7a7459acabc9a53406ac034549f40cf310612a009f9ad7e9581c390e946b8d35476ba62e6e90fb5110e07550d0d67874ad0f726c3f04581c2e617283c6d813be4f186419c2067a74c5379ad3b724c473aaad177b581ce9f9f6f5bfd064179d663d9258a75931ae00ee0042765ab341c25cf4581c788bd845cfeb91e86c87c72918f632b8deb5afdc92060bb7c18852c2581c07de0766e9e424eafaa52ac64cda6ad01567e0eb5f96ca1f82a42b23ffff';
        let signedTx = await sdk.upgradeGroupNFTHolder(newHolder, newDatum, mustSignBy, utxosForFee, [collateralUtxo], admin);
        console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.upgradeGroupNFTHolder(newHolder, newDatum, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
        let o = await submitAndWaitConfirmed(signedTx);
        groupInfo = await getGroupInfo();
        console.log('after setAdmin:', JSON.stringify(groupInfo));
    }

    {
        const utxosForFee = await getUtxoForFee();
        let adminInfo = await getAdminInfo();
        console.log('before setAdmin:', JSON.stringify(adminInfo));
        // const newHolder = contractsMgr.AdminNFTHolderScript.address().to_bech32(sdk.ADDR_PREFIX);
        const newHolder = contractsMgr.GroupInfoNFTHolderScript.address().to_bech32(sdk.ADDR_PREFIX);
        const adminInfoUtxo = await sdk.getAdminNft();
        const newDatum = adminInfoUtxo.datum;
        let signedTx = await sdk.upgradeAdminNFTHolder(newHolder, newDatum, mustSignBy, utxosForFee, [collateralUtxo], admin);
        console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.upgradeAdminNFTHolder(newHolder, newDatum, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
        // let o = await submitAndWaitConfirmed(signedTx);
        // adminInfo = await getAdminInfo();
        // console.log('after setAdmin:', JSON.stringify(adminInfo));
    }

    {
        const utxosForFee = await getUtxoForFee();
        let adminInfo = await getAdminInfo();
        console.log('before setAdmin:', JSON.stringify(adminInfo));
        let signedTx = await sdk.setTreasuryCheckVH(newTreasyCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin);
        console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.setTreasuryCheckVH(newTreasyCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
        // let o = await submitAndWaitConfirmed(signedTx);
        // adminInfo = await getAdminInfo();
        // console.log('after setAdmin:', JSON.stringify(adminInfo));
    }

    {
        const utxosForFee = await getUtxoForFee();
        let adminInfo = await getAdminInfo();
        console.log('before setAdmin:', JSON.stringify(adminInfo));
        let signedTx = await sdk.setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin);
        console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
        // let o = await submitAndWaitConfirmed(signedTx);
        // adminInfo = await getAdminInfo();
        // console.log('after setAdmin:', JSON.stringify(adminInfo));
    }


    {
        const utxosForFee = await getUtxoForFee();
        let adminInfo = await getAdminInfo();
        console.log('before setAdmin:', JSON.stringify(adminInfo));
        let signedTx = await sdk.setAdmin(signatories, 2, mustSignBy, utxosForFee, [collateralUtxo], admin);
        console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.setAdmin(signatories, 2, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
        // let o = await submitAndWaitConfirmed(signedTx);
        // adminInfo = await getAdminInfo();
        // console.log('after setAdmin:', JSON.stringify(adminInfo));
    }

    {
        const utxosForFee = await getUtxoForFee();
        let groupInfo = await getGroupInfo();
        console.log('before setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
        let signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // let o = await submitAndWaitConfirmed(signedTx);
        // groupInfo = await getGroupInfo();
        // console.log('after setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    }

    {
        const utxosForFee = await getUtxoForFee();
        let groupInfo = await getGroupInfo();
        console.log('before balanceWorker:', JSON.stringify(showGroupInfo(groupInfo)));
        let signedTx = await sdk.setBalanceWorker(adminNext, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.setBalanceWorker(adminNext, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // let o = await submitAndWaitConfirmed(signedTx);
        // groupInfo = await getGroupInfo();
        // console.log('after setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    }

    {
        let os = await getCheckTokenUtxo(0);
        console.log('amount before burn:', os.length);
        const utxpSpend = os.slice(0, 1);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.burnTreasuryCheckToken(1, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.burnTreasuryCheckToken(1, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('after before burn:', (await getCheckTokenUtxo(0)).length);
    }

    {
        let os = await getCheckTokenUtxo(1);
        console.log('amount before burn:', os.length);
        const utxpSpend = os.slice(3, 4);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.burnMintCheckToken(1, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.burnMintCheckToken(1, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('after before burn:', (await getCheckTokenUtxo(1)).length);
    }

    {
        const utxosForFee = await getUtxoForFee();
        const receiptor = 'addr_test1qp884fateqg23tt8q2j7xjvk6kqu3wczfdck58egs8tyzvvnp2atxdggqzknchlkmxnnu0wgy9pc4ugyax3u0vsv5fuq5v6kp8';
        let signedTx = await sdk.claim(5405304, receiptor, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.claim(85405304, receiptor, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
    }
    {
        const utxosForFee = await getUtxoForFee();
        const newTreasuryCheck = 'addr_test1xqs45y5mw56t032lv8qgt9sp9xhwvfw49m6sus4xrhnrpwjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sh4zls7';
        let signedTx = await sdk.setTreasuryCheckVH(newTreasuryCheck, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await await sdk.setTreasuryCheckVH(newTreasuryCheck, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
    }

    {
        const utxosForFee = await getUtxoForFee();
        const newMintCheck = 'addr_test1xq3mlgvywct2zzyhv5ttmsf6c7quymvnxnx0nk3wz629wp2wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swesly4';
        let signedTx = await sdk.setMintCheckVH(newMintCheck, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await await sdk.setMintCheckVH(newMintCheck, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
    }

    {
        const count = 3;
        console.log('amount before mint:', (await getCheckTokenUtxo(0)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.mintTreasuryCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        console.log('--exUnit---\n', JSON.stringify(exUnit));
        signedTx = await sdk.mintTreasuryCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('amount after mint:', (await getCheckTokenUtxo(0)).length);
    }

    {
        console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdk.mintMintCheckToken(7, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await finalTxEvaluate(signedTx);
        signedTx = await sdk.mintMintCheckToken(7, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
    }

}


main().then(() => {
    console.log('successful !');
}).catch(e => {
    console.error(e);
    // console.log(e[0].message);
}).finally(() => {
    // ogmiosUtils.unInit();
})


function genGroupInfoDatum(groupInfoParams) {
    const ls = CardanoWasm.PlutusList.new();

    const params = CardanoWasm.PlutusList.new();
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.Version + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.Admin + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.GPK + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.BalanceWorker + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.TreasuryCheckVH + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.OracleWorker + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.MintCheckVH + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.StkVh + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.StkCheckVh + ''], 'hex')));
    // NFTRefHolderVH | NFTTreasuryCheckVH | NFTMintCheckVH
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.NFTRefHolderVH + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.NFTTreasuryCheckVH + ''], 'hex')));
    params.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(groupInfoParams[contractsMgr.GroupNFT.NFTMintCheckVH + ''], 'hex')));

    ls.add(CardanoWasm.PlutusData.new_list(params));

    // CardanoWasm.PlutusData.new_empty_constr_plutus_data(CardanoWasm.BigNum.from_str('0'))
    return CardanoWasm.PlutusData.new_constr_plutus_data(
        CardanoWasm.ConstrPlutusData.new(
            CardanoWasm.BigNum.from_str('0'),
            ls
        )
    )
}