
const {
    createInteractionContext,
    createStateQueryClient,
    createTxSubmissionClient, TxSubmission
} = require('@cardano-ogmios/client');

let CardanoWasm = null;

module.exports.setWasm = function(wasm) {
  CardanoWasm = wasm;
}

//---------------------------------------------------------------------------------------------
let context;
let txSubmitclient;
let query;

const errorHandler = async (error) => {
    console.error(error);
    await txSubmitclient.shutdown();
}

const closeHandler = async (code, reason) => {
    // console.log('WS close: code =', code, 'reason =', reason);
    // await client.shutdown();
}
//---------------------------------------------------------------------------------------------

// const BlockFrostAPI = require('@blockfrost/blockfrost-js').BlockFrostAPI;
// const blockFrostApi = new BlockFrostAPI({ isTestNet: true, projectId: 'testnetuBFkbLWQvS43rZCQSrYkFFL1gnHaxt3Z' });

// const interVia = 'api';
const interVia = 'ogmios';

//--------------------------------------------------
module.exports.getParamProtocol = async function (via = 'ogmios') {
    if (via == 'ogmios') {
        let protocolParams = await query.currentProtocolParameters();

        const v1 = CardanoWasm.CostModel.new();
        let index = 0;
        for (const key in protocolParams.costModels[`plutus:v1`]) {
            v1.set(index, CardanoWasm.Int.new_i32(protocolParams.costModels[`plutus:v1`][key]));
            index++;
        }

        const v2 = CardanoWasm.CostModel.new();
        index = 0;
        for (const key in protocolParams.costModels[`plutus:v2`]) {
            v2.set(index, CardanoWasm.Int.new_i32(protocolParams.costModels[`plutus:v2`][key]));
            index++;
        }
        protocolParams.costModels = CardanoWasm.Costmdls.new();
        protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v1(), v1);
        protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v2(), v2);

        return protocolParams;
    } else {
        throw 'Not Support BlockFrostApi'
        // let latest_block = await blockFrostApi.blocksLatest();
        // let protocolParams = await blockFrostApi.epochsParameters(latest_block.epoch);

        // let index = 0;
        // const v1 = CardanoWasm.CostModel.new();
        // for (const key in protocolParams.cost_models.PlutusV1) {
        //     v1.set(index, CardanoWasm.Int.new_i32(protocolParams.cost_models.PlutusV1[key]));
        //     index++;
        // }

        // const v2 = CardanoWasm.CostModel.new();
        // index = 0;
        // for (const key in protocolParams.cost_models.PlutusV2) {
        //     v2.set(index, CardanoWasm.Int.new_i32(protocolParams.cost_models.PlutusV2[key]));
        //     index++;
        // }

        // protocolParams.costModels = CardanoWasm.Costmdls.new();
        // protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v1(), v1);
        // protocolParams.costModels.insert(CardanoWasm.Language.new_plutus_v2(), v2);
        // return protocolParams;
    }

}

//TODO: -------------------
module.exports.getUtxo = async function (address, coinValue = 0, via = 'ogmios') {
    let ret = [];
    if (via == 'ogmios') {
        let utxos = await query.utxo([address]);
        // console.log("utxos=", utxos)

        for (let i = 0; i < utxos.length; i++) {
            const utxo = utxos[i];
            if (coinValue && CardanoWasm.BigNum.from_str(utxo[1].value.coins + '').compare(
                CardanoWasm.BigNum.from_str('' + coinValue)
            ) < 0) continue;
            for (const assetId in utxo[1].value.assets) {
                // console.log('====<',CardanoWasm.BigNum.from_str(utxo[1].value.assets[assetId]+'').to_str());
                utxo[1].value.assets[assetId] = CardanoWasm.BigNum.from_str(utxo[1].value.assets[assetId]+'').to_str();
            }
            ret.push({
                txHash: utxo[0].txId,
                index: utxo[0].index,
                value: {
                    coins: CardanoWasm.BigNum.from_str(utxo[1].value.coins + '').to_str(),
                    assets: utxo[1].value.assets
                },
                address: utxo[1].address,
                datum: utxo[1].datum,
                datumHash: utxo[1].datumHash,
                script: utxo[1].script
            })
        }
    } else {
        throw 'Not Support BlockFrostApi'
        // const utxos = await blockFrostApi.addressesUtxosAll(address);

        // for (let i = 0; i < utxos.length; i++) {
        //     const utxo = utxos[i];
        //     if (coinValue && CardanoWasm.BigNum.from_str(utxo.amount[0].quantity).compare(
        //         CardanoWasm.BigNum.from_str('' + coinValue)
        //     ) < 0) continue;
        //     ret.push({
        //         txHash: utxo.tx_hash,
        //         index: utxo.output_index,
        //         value: utxo.amount[0].quantity,
        //         address: address
        //     })
        // }
    }

    return ret;

}


module.exports.waitTxConfirmed = async (addr, txHash, slots = 20) => {
    let p = new Promise((resolve, reject) => {
        setTimeout(async (addr, txHash) => {
            const utxos = await this.getUtxo(addr);
            const utxo = utxos.find(o => o.txHash == txHash);
            resolve(utxo);
            // if(utxo) resolve(utxo);
            // else {
            //     if(slots<=0) reject('Timeout');
            //     else{
            //         const ret = await waitTxConfirmed(addr,txHash,slots-1);
            //         resolve(ret);
            //     }
            // }
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
    if (interVia == 'ogmios') {
        return await txSubmitclient.submitTx(Buffer.from(signedTx.to_bytes()).toString('hex'));

    } else {
        throw 'Not Support BlockFrostApi'
        // return await blockFrostApi.txSubmit(signedTx.to_bytes());
    }

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

module.exports.init_ogmios = async function (hostServer={ host:'127.0.0.1', port:1337 }) {
    let host = '127.0.0.1';
    let port = 1337;
    if(hostServer){
        if(hostServer.host) host = hostServer.host;
        if(hostServer.port) port = hostServer.port;
    }
    context = await createInteractionContext(errorHandler, closeHandler, { connection: { host, port }, interactionType: 'LongRunning' });
    txSubmitclient = await createTxSubmissionClient(context);
    query = await createStateQueryClient(context);
    const blockHeight = await query.blockHeight();
    
    const ss = await this.getUtxo('addr_test1qz6twkzgss75sk379u0e27phvwhmtqqfuhl5gnx7rh7nux2xg4uwrhx9t58far8hp3a06hfdfzlsxgfrzqv5ryc78e4s4dwh26')
    // console.log(ss);
    // // context.socket.close()
    // const fd = await query.eraStart();
    // const soltConfig = await query.eraSummaries();
    // const tips = await query.chainTip();
    // const genisis = await query.genesisConfig();

    // console.log('===>',this.soltToTimestamp(28180867,soltConfig,genisis));
}
//eb1905f4b011bc3412d65a1977668abbe4fa3538d3bd4e828076d64d
module.exports.getdelegationsAndRewards = async function (stakeKeyHash){
    const infos = await query.delegationsAndRewards([stakeKeyHash]);
    return infos[stakeKeyHash];
}

module.exports.currentNetworkSlotToTimestamp = async function (slot){
    const eraSummaries = await query.eraSummaries();
    const genisis = await query.genesisConfig();

    return this.soltToTimestamp(slot,eraSummaries,genisis);
}

module.exports.soltToTimestamp = function (slot,eraSummaries,genisis){

    // const slotConfig = await query.eraSummaries(); 
    const earIndex = function (slot,slotConfig){
        for (let i = 0; i < slotConfig.length; i++) {
            const ear = slotConfig[i];
            if(slot >= ear.start.slot && slot <= ear.end.slot) return i;
            if(slot > ear.end.slot) continue;
            if(slot < ear.end.slot) {
                throw `Bad slot ${slot}`;
            }
        }

        throw `Bad slot ${slot}`;
    }

    let sysStartTimeStamp = Date.parse(genisis.systemStart);
    const earIndeNumber = earIndex(slot,eraSummaries);
    const targetEar = eraSummaries[earIndeNumber];
    // console.log(JSON.stringify(eraSummaries));
    // for (let i = 0; i < eraSummaries.length; i++) {
    //     const ear = eraSummaries[i];
    //     // sysStartTimeStamp += ear.time + ear.
    // } 1683864067000 - 1654041600000 - 5184000
    return sysStartTimeStamp + targetEar.start.time*1000 + (slot - targetEar.start.slot )* targetEar.parameters.slotLength*1000

}

module.exports.getLastestSolt = async function (){
    const a = await query.chainTip();
    return a.slot;
}

module.exports.unInit = async function (){
    context.socket.close();
}

module.exports.evaluateTx = async (signedTx) => {
    try {
        const cost = await TxSubmission.evaluateTx(context, signedTx.to_hex());
        // console.log(JSON.stringify(cost));
        return cost;
    } catch (e) {
        console.error(e);
        for (let i = 0; i < e.length; i++) {
            const err = e[i];
            console.error(err.stack);
        }
    }
}