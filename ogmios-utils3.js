const {
    createInteractionContext,
    createLedgerStateQueryClient,
    createTransactionSubmissionClient
} = require('@cardano-ogmios/client');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const utils = require('./utils');
const cbor = require('cbor-sync');

//---------------------------------------------------------------------------------------------
let context;
let stateQueryClient;
let txSubmissionClient;

const errorHandler = async (error) => {
    console.error('OGMios error:', error);
    if (txSubmissionClient) {
        await txSubmissionClient.shutdown();
    }
    if (stateQueryClient) {
        await stateQueryClient.shutdown();
    }
}

const closeHandler = async (code, reason) => {
    console.log('WebSocket closed: code =', code, 'reason =', reason);
}

// 默认连接配置
let DEFAULT_OGMIOS_URL = 'ws://52.13.9.234:1337';

// 初始化连接
async function initializeConnection(ogmiosUrl = DEFAULT_OGMIOS_URL) {
    if (context && stateQueryClient && txSubmissionClient) {
        return { context, stateQueryClient, txSubmissionClient };
    }

    try {
        // 创建交互上下文
        context = await createInteractionContext(errorHandler, closeHandler, {
            connection: {
                host: ogmiosUrl.includes('://') ? ogmiosUrl.split('://')[1].split(':')[0] : ogmiosUrl.split(':')[0],
                port: parseInt(ogmiosUrl.split(':').pop()),
                tls: ogmiosUrl.startsWith('wss://')
            }
        });

        // 创建状态查询客户端
        stateQueryClient = await createLedgerStateQueryClient(context);

        // 创建交易提交客户端
        txSubmissionClient = await createTransactionSubmissionClient(context);

        console.log(`Connected to OGMios at ${ogmiosUrl}`);
        return { context, stateQueryClient, txSubmissionClient };
    } catch (error) {
        console.error('Failed to initialize OGMios connection:', error);
        throw error;
    }
}

//--------------------------------------------------
module.exports.getParamProtocol = async function (via = 'ogmios') {
    if (via == 'ogmios') {
        await initializeConnection();

        let protocolParams = await stateQueryClient.protocolParameters();
        console.log('Raw protocol parameters fetched from OGMios:', JSON.stringify(protocolParams.plutusCostModels));
        // const v1 = CardanoWasm.CostModel.from_bytes(protocolParams.plutusCostModels[`plutus:v1`]);
        // const v2 = CardanoWasm.CostModel.from_bytes(protocolParams.plutusCostModels[`plutus:v2`]);
        // const v3 = CardanoWasm.CostModel.from_bytes(protocolParams.plutusCostModels[`plutus:v3`]);
        const v1 = CardanoWasm.CostModel.new();
        let index = 0;
        for (const key in protocolParams.plutusCostModels[`plutus:v1`]) {
            // for (const key in costModelsLib[`PlutusV1`]) {
            v1.set(index, CardanoWasm.Int.new_i32(protocolParams.plutusCostModels[`plutus:v1`][index]));
            // v1.set(index, CardanoWasm.Int.new_i32(costModelsLib[`PlutusV1`][key]));
            index++;
        }

        const v2 = CardanoWasm.CostModel.new();
        index = 0;
        for (const key in protocolParams.plutusCostModels[`plutus:v2`]) {
            // for (const key in costModelsLib[`PlutusV2`]) {
            v2.set(index, CardanoWasm.Int.new_i32(protocolParams.plutusCostModels[`plutus:v2`][index]));
            // v2.set(index, CardanoWasm.Int.new_i32(costModelsLib[`PlutusV2`][key]));
            index++;
        }
        const v3 = CardanoWasm.CostModel.new();
        index = 0;
        for (const key in protocolParams.plutusCostModels[`plutus:v3`]) {
            // for (const key in costModelsLib[`PlutusV3`]) {
            v3.set(index, CardanoWasm.Int.new_i32(protocolParams.plutusCostModels[`plutus:v3`][index]));
            // v3.set(index, CardanoWasm.Int.new_i32(costModelsLib[`PlutusV3`][key]));
            index++;
        }

        protocolParams.costModels = CardanoWasm.Costmdls.new();
        protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v1(), v1);
        protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v2(), v2);
        protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v3(), v3);
        console.log('Protocol parameters fetched and cost models initialized successfully.', protocolParams);

        return protocolParams;
    } else {
        throw 'Not Support BlockFrostApi'
    }
}

module.exports.getScriptRefByScriptHash = async function (scriptRefOwnerAddr, scriptHash) {
    let refUtxo = await this.getUtxo(scriptRefOwnerAddr);
    const ref = refUtxo.find(o => {
        const { script: scriptTmp } = utils.plutusScriptFromScriptRef(o.script);
        if (!scriptTmp) return false;
        return scriptTmp.hash().to_hex() == scriptHash

    });
    return ref;
}

//TODO: -------------------
module.exports.getUtxo = async function (address, coinValue = 0, via = 'ogmios') {
    let ret = [];
    if (via == 'ogmios') {
        await initializeConnection();

        let utxos = await stateQueryClient.utxo({ addresses: [address] });

        for (let i = 0; i < utxos.length; i++) {
            const utxo = utxos[i];
            if (coinValue && CardanoWasm.BigNum.from_str(utxo.value.ada.lovelace + '').compare(
                CardanoWasm.BigNum.from_str('' + coinValue)
            ) < 0) continue;
            let assetValue = {};
            for (const polocyId in utxo.value) {
                if (polocyId == 'ada') continue;
                for (const assetName in utxo.value[polocyId]) {
                    assetValue[polocyId + '.' + assetName] = CardanoWasm.BigNum.from_str(utxo.value[polocyId][assetName] + '').to_str();
                }
                // utxo[1].value.assets[polocyId] = CardanoWasm.BigNum.from_str(utxo[1].value.assets[polocyId] + '').to_str();
            }
            ret.push({
                txHash: utxo.transaction.id,
                index: utxo.index,
                value: {
                    coins: CardanoWasm.BigNum.from_str(utxo.value.ada.lovelace + '').to_str(),
                    assets: assetValue
                },
                address: utxo.address,
                datum: utxo.datum,
                datumHash: utxo.datumHash,
                script: utxo.script
            })
        }
    } else {
        throw 'Not Support BlockFrostApi'

    }

    return ret;

}


module.exports.waitTxConfirmed = async (addr, txHash, slots = 20) => {
    let p = new Promise((resolve, reject) => {
        setTimeout(async (addr, txHash) => {
            const utxos = await this.getUtxo(addr);
            const utxo = utxos.find(o => o.txHash == txHash);
            resolve(utxo);
        }, 5000, addr, txHash);
    });
    let utxo = await p;
    if (!utxo) {
        if (slots <= 0) {
            throw ('Timeout');
        } else {
            utxo = await this.waitTxConfirmed(addr, txHash, slots - 1);
        }
    }
    return utxo;

}

module.exports.submitTx = async function (signedTx) {
    await initializeConnection();
    return await txSubmissionClient.submitTransaction(Buffer.from(signedTx.to_bytes()).toString('hex'));
}

/**
 * //just for local test
 * @param {*} skey private key in hex
 * @param {*} hash the data hash to be signed
 * @returns 
 */
module.exports.signFn = (skey, hash) => {
    const payPrvKey = CardanoWasm.PrivateKey.from_normal_bytes(Buffer.from(skey, 'hex'));
    const signature = payPrvKey.sign(Buffer.from(hash, 'hex')).to_hex();
    const vkey = payPrvKey.to_public().to_bech32();
    return { vkey, signature };
}

module.exports.init_ogmios = async function (hostServer = { host: '52.13.9.234', port: 1337, tls: false }) {
    // 重置连接以便使用新的URL
    if (txSubmissionClient) {
        await txSubmissionClient.shutdown();
    }
    if (stateQueryClient) {
        await stateQueryClient.shutdown();
    }
    context = null;
    stateQueryClient = null;
    txSubmissionClient = null;

    // 处理参数：支持字符串URL或对象
    let host, port, tls;

    if (typeof hostServer === 'string') {
        // 字符串格式的URL
        const url = hostServer.startsWith('ws://') || hostServer.startsWith('wss://') ? hostServer : `ws://${hostServer}`;
        const urlObj = new URL(url);
        host = urlObj.hostname;
        port = parseInt(urlObj.port);
        tls = urlObj.protocol === 'wss:';
    } else {
        // 对象格式
        host = hostServer.host || '52.13.9.234';
        port = hostServer.port || 1337;
        tls = hostServer.tls || false;
    }

    // 更新默认URL
    DEFAULT_OGMIOS_URL = `ws${tls ? 's' : ''}://${host}:${port}`;

    // 初始化新连接
    await initializeConnection(DEFAULT_OGMIOS_URL);
}

module.exports.getdelegationsAndRewards = async function (stakeKeyHash) {
    await initializeConnection();
    const infos = await stateQueryClient.delegationsAndRewards([stakeKeyHash]);
    return infos[stakeKeyHash];
}

// module.exports.currentNetworkSlotToTimestamp = async function (slot) {
//     await initializeConnection();
//     const eraSummaries = await stateQueryClient.eraSummaries();
//     const genesis = await stateQueryClient.genesisConfiguration();

//     return this.soltToTimestamp(slot, eraSummaries, genesis);
// }

module.exports.currentNetworkSlotToTimestamp = async function (slot) {
    await initializeConnection();
    // 1. 获取 Era Summaries
    const eraSummaries = await stateQueryClient.eraSummaries();

    // 2. 定位 slot 所在的 Era
    const currentEra = eraSummaries.find(
        (era) => slot >= era.start.slot && slot < era.end.slot
    );

    if (!currentEra) {
        throw new Error(`Slot ${slot} is not within any known era.`);
    }

    // 3. 计算偏移量并转换为时间戳
    const slotLengthInMs = currentEra.parameters.slotLength.milliseconds;
    const slotOffset = slot - currentEra.start.slot;
    const genesisConfig = await stateQueryClient.genesisConfiguration('byron');
    const startTime = new Date(genesisConfig.startTime).getTime();
    // const eraStartTimestamp = (new Date(currentEra.start.time.seconds)).getTime();
    console.log(new Date(currentEra.start.time.seconds).toUTCString());

    return startTime + currentEra.start.time.seconds * 1000 + slotOffset * slotLengthInMs;
}

module.exports.soltToTimestamp = function (slot, eraSummaries, genesis) {
    const earIndex = function (slot, slotConfig) {
        for (let i = 0; i < slotConfig.length; i++) {
            const ear = slotConfig[i];
            if (slot >= ear.start.slot && slot <= ear.end.slot) return i;
            if (slot > ear.end.slot) continue;
            if (slot < ear.end.slot) {
                throw `Bad slot ${slot}`;
            }
        }

        throw `Bad slot ${slot}`;
    }

    let sysStartTimeStamp = Date.parse(genesis.systemStart);
    const earIndexNumber = earIndex(slot, eraSummaries);
    const targetEar = eraSummaries[earIndexNumber];

    return sysStartTimeStamp + targetEar.start.time * 1000 + (slot - targetEar.start.slot) * targetEar.parameters.slotLength * 1000;
}

module.exports.getLastestSolt = async function () {
    await initializeConnection();
    const tip = await stateQueryClient.networkTip();
    return tip.slot;
}

module.exports.blockHeight = async function () {
    await initializeConnection();
    const tip = await stateQueryClient.networkTip();
    return tip.blockNo || tip.slot;
}

module.exports.evaluateTx = async (signedTx) => {
    try {
        await initializeConnection();
        const cost = await txSubmissionClient.evaluateTransaction(signedTx.to_hex());
        let ret = {};
        for (let index = 0; index < cost.length; index++) {
            const c = cost[index];
            ret[c.validator.purpose + ':' + c.validator.index] = { memory: c.budget.memory, steps: c.budget.cpu };
        }
        return ret;
    } catch (e) {
        console.error(e);
        if (Array.isArray(e)) {
            for (let i = 0; i < e.length; i++) {
                const err = e[i];
                console.error(err.stack || err);
            }
        }
        throw e;
    }
}

module.exports.evaluate = async (signedTxRaw) => {
    try {
        await initializeConnection();
        const cost = await txSubmissionClient.evaluateTransaction(signedTxRaw);
        let ret = {};
        for (let index = 0; index < cost.length; index++) {
            const c = cost[index];
            ret[c.validator.purpose + ':' + c.validator.index] = { memory: c.budget.memory, steps: c.budget.cpu };
        }
        return ret;
    } catch (e) {
        console.error(e);
        if (Array.isArray(e)) {
            for (let i = 0; i < e.length; i++) {
                const err = e[i];
                console.error(err.stack || err);
            }
        }
        throw e;
    }
}

module.exports.fixTxExuintByEvaluate = async function (protocolParams, costModesLib, txRaw, collateralUtxos, gasMutipl = 1) {
    const exUnitEVA = await this.evaluate(txRaw);

    let total_ex_mem = 0;
    let total_ex_cpu = 0;

    for (const key in exUnitEVA) {
        const exUnit = exUnitEVA[key];
        total_ex_mem += Math.floor(exUnit.memory * gasMutipl);
        total_ex_cpu += Math.floor(exUnit.steps * gasMutipl);
    }

    if (protocolParams.maxExecutionUnitsPerTransaction.memory < total_ex_mem || protocolParams.maxExecutionUnitsPerTransaction.steps < total_ex_cpu) {
        throw `ExUnit too large: memory:${total_ex_mem} ,steps:${total_ex_cpu}`;
    }
    let tx = CardanoWasm.Transaction.from_hex(txRaw);
    let witnessSset;
    {
        if (tx.witness_set()) {
            witnessSset = tx.witness_set();
        } else {
            witnessSset = CardanoWasm.TransactionWitnessSet.new();
        }

        let vks = witnessSset.vkeys();
        if (!vks) {
            vks = CardanoWasm.Vkeywitnesses.new();
        }
        let aa = tx.body().required_signers().len();
        let bb = vks.len();

        for (let i = aa - bb; i > 0; i--) {
            const vk = CardanoWasm.Vkeywitness.new(
                CardanoWasm.Vkey.new(CardanoWasm.PublicKey.from_hex('cbc623254ca1eb30d8cb21b2ef04381372ff24539a74e4b5117d1e3bbb0f0188')),
                CardanoWasm.Ed25519Signature.from_hex('b31d2a51199f1c47f1d3f10e7a4b68bf717ded8d8e0346b8d37a2e44a02088ac62f6ea82b0b13fda81da242c92def5b5fadb3e7e16459897f000b1bd4e09a30b')
            );
            vks.add(vk);
        }
        witnessSset.set_vkeys(vks);

        tx = CardanoWasm.Transaction.new(
            tx.body(), witnessSset, tx.auxiliary_data()
        )
    }
    const redeemers = witnessSset.redeemers();
    const redeemersNew = CardanoWasm.Redeemers.new();
    for (let i = 0; i < redeemers.len(); i++) {
        const redeemer = redeemers.get(i);
        const tag = redeemer.tag();
        const index = redeemer.index();
        const redeemerData = redeemer.data();

        let tagStr = '';
        switch (tag.kind()) {
            case CardanoWasm.RedeemerTagKind.Spend:
                tagStr = 'spend:' + index.to_str();
                break;
            case CardanoWasm.RedeemerTagKind.Mint:
                tagStr = 'mint:' + index.to_str();
                break;
            case CardanoWasm.RedeemerTagKind.Cert:
                tagStr = 'cert:' + index.to_str();
                break;
            case CardanoWasm.RedeemerTagKind.Reward:
                tagStr = 'reward:' + index.to_str();
                break;
            default:
                break;
        }
        let ex_unit_mem = Math.floor(exUnitEVA[tagStr].memory * gasMutipl);
        let ex_unit_cpu = Math.floor(exUnitEVA[tagStr].steps * gasMutipl);
        const exUint = CardanoWasm.ExUnits.new(CardanoWasm.BigNum.from_str(ex_unit_mem + ''), CardanoWasm.BigNum.from_str(ex_unit_cpu + ''));

        const redeemerNew = CardanoWasm.Redeemer.new(
            tag, index, redeemerData, exUint
        );
        redeemersNew.add(redeemerNew);
    }


    const memPriceParams = protocolParams.prices.memory.split('/');
    const stepPriceParams = protocolParams.prices.steps.split('/');

    const exUnitPrice = CardanoWasm.ExUnitPrices.new(
        CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str(memPriceParams[0]), CardanoWasm.BigNum.from_str(memPriceParams[1]))
        , CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str(stepPriceParams[0]), CardanoWasm.BigNum.from_str(stepPriceParams[1])));

    const totalExUnits = CardanoWasm.ExUnits.new(CardanoWasm.BigNum.from_str(total_ex_mem + ''), CardanoWasm.BigNum.from_str(total_ex_cpu + ''));
    const plutusCost = CardanoWasm.calculate_ex_units_ceil_cost(totalExUnits, exUnitPrice);

    const txfeeWithoutPlutus = CardanoWasm.BigNum.from_str('' + protocolParams.minFeeCoefficient).checked_mul(
        CardanoWasm.BigNum.from_str('' + tx.to_bytes().byteLength)
    ).checked_add(CardanoWasm.BigNum.from_str('' + protocolParams.minFeeConstant));

    const total_fee = plutusCost.checked_add(txfeeWithoutPlutus);

    const newBody = CardanoWasm.TransactionBody.new(tx.body().inputs(), tx.body().outputs(), total_fee, tx.body().ttl());
    if (tx.body().auxiliary_data_hash()) newBody.set_auxiliary_data_hash(tx.body().auxiliary_data_hash());
    if (tx.body().certs()) newBody.set_certs(tx.body().certs());

    let collaterOwnerAddress;
    const txCollateralInputBuilder = CardanoWasm.TxInputsBuilder.new();
    for (let i = 0; i < collateralUtxos.length; i++) {
        const utxoCollateral = collateralUtxos[i];
        const txId = CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxoCollateral.txHash, 'hex'));
        const input = CardanoWasm.TransactionInput.new(txId, utxoCollateral.index);
        const value = utils.funValue(utxoCollateral.value);
        const from = CardanoWasm.Address.from_bech32(utxoCollateral.address);
        collaterOwnerAddress = from;
        txCollateralInputBuilder.add_regular_input(from, input, value);
    }
    newBody.set_collateral(txCollateralInputBuilder.inputs());


    const totalCollateraInputlValue = txCollateralInputBuilder.total_value();
    const collateralValue = CardanoWasm.Value.new(total_fee.checked_mul(CardanoWasm.BigNum.from_str('2')));
    const collateralReturnValue = totalCollateraInputlValue.checked_sub(collateralValue);
    const collateralOutput = CardanoWasm.TransactionOutput.new(collaterOwnerAddress, collateralReturnValue);

    newBody.set_collateral_return(collateralOutput);
    newBody.set_reference_inputs(tx.body().reference_inputs());
    newBody.set_required_signers(tx.body().required_signers());

    // const costModesLib = protocolParams.costModels;
    // const tmp = CardanoWasm.Costmdls.new();
    // tmp.insert(CardanoWasm.Language.new_plutus_v2(), costModesLib.get(CardanoWasm.Language.new_plutus_v2()));
    const hash = CardanoWasm.hash_script_data(redeemersNew, costModesLib);
    newBody.set_script_data_hash(hash);
    if (tx.body().update()) newBody.set_update(tx.body().update());
    if (tx.body().validity_start_interval()) newBody.set_validity_start_interval(tx.body().validity_start_interval());
    if (tx.body().validity_start_interval_bignum()) newBody.set_validity_start_interval_bignum(tx.body().validity_start_interval_bignum());

    if (tx.body().withdrawals()) newBody.set_withdrawals(tx.body().withdrawals());
    if (tx.body().network_id()) newBody.set_network_id(tx.body().network_id());
    if (tx.body().mint()) newBody.set_mint(tx.body().mint());
    if (tx.body().auxiliary_data_hash()) newBody.set_auxiliary_data_hash(tx.body().auxiliary_data_hash());

    witnessSset.set_redeemers(redeemersNew);
    if (tx.witness_set().plutus_data()) witnessSset.set_plutus_data(tx.witness_set().plutus_data());
    {
        const tmptx = CardanoWasm.Transaction.from_hex(txRaw);
        if (tmptx.witness_set().vkeys()) {
            witnessSset.set_vkeys(tmptx.witness_set().vkeys());
        } else {
            witnessSset.set_vkeys(CardanoWasm.Vkeywitnesses.new());
        }
    }

    if (tx.witness_set().plutus_scripts()) witnessSset.set_plutus_scripts(tx.witness_set().plutus_scripts());
    if (tx.witness_set().bootstraps()) witnessSset.set_bootstraps(tx.witness_set().bootstraps());
    if (tx.witness_set().native_scripts()) witnessSset.set_native_scripts(tx.witness_set().native_scripts());

    const newTx = CardanoWasm.Transaction.new(newBody, witnessSset, tx.auxiliary_data());
    return newTx;
}
