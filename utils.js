const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

module.exports.initProtocolParams = function (protocolParams, interVia = 'ogmios') {
    if (interVia == 'ogmios') {
        const linearFee = CardanoWasm.LinearFee.new(
            CardanoWasm.BigNum.from_str('' + protocolParams.minFeeCoefficient),//(protocolParams.linearFee.minFeeA),
            CardanoWasm.BigNum.from_str('' + protocolParams.minFeeConstant)//(protocolParams.linearFee.minFeeB)
        );

        const memPriceParams = protocolParams.prices.memory.split('/');
        const stepPriceParams = protocolParams.prices.steps.split('/');
        const exUnitPrice = CardanoWasm.ExUnitPrices.new(
            CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str(memPriceParams[0]), CardanoWasm.BigNum.from_str(memPriceParams[1]))
            , CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str(stepPriceParams[0]), CardanoWasm.BigNum.from_str(stepPriceParams[1])))


        if (!protocolParams.coinsPerUtxoByte) {
            return CardanoWasm.TransactionBuilderConfigBuilder.new()
                .fee_algo(linearFee)
                .pool_deposit(CardanoWasm.BigNum.from_str(protocolParams.poolDeposit + ''))//('500000000'))
                .key_deposit(CardanoWasm.BigNum.from_str(protocolParams.stakeKeyDeposit + ''))//('2000000'))
                .max_value_size(+protocolParams.maxValueSize)//(4000)
                .max_tx_size(+protocolParams.maxTxSize)//(8000)
                .coins_per_utxo_word(CardanoWasm.BigNum.from_str(protocolParams.coinsPerUtxoWord + ''))
                .ex_unit_prices(exUnitPrice)
                .build();
        } else {
            return CardanoWasm.TransactionBuilderConfigBuilder.new()
                .fee_algo(linearFee)
                .pool_deposit(CardanoWasm.BigNum.from_str(protocolParams.poolDeposit + ''))//('500000000'))
                .key_deposit(CardanoWasm.BigNum.from_str(protocolParams.stakeKeyDeposit + ''))//('2000000'))
                .max_value_size(+protocolParams.maxValueSize)//(4000)
                .max_tx_size(+protocolParams.maxTxSize)//(8000)
                .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(protocolParams.coinsPerUtxoByte + ''))
                .ex_unit_prices(exUnitPrice)
                .build();
        }
    } else {
        const linearFee = CardanoWasm.LinearFee.new(
            CardanoWasm.BigNum.from_str('' + protocolParams.min_fee_a),//(protocolParams.linearFee.minFeeA),
            CardanoWasm.BigNum.from_str('' + protocolParams.min_fee_b)//(protocolParams.linearFee.minFeeB)
        );

        const memPriceParams = protocolParams.prices.memory.split('/');
        const stepPriceParams = protocolParams.prices.steps.split('/');
        const exUnitPrice = CardanoWasm.ExUnitPrices.new(
            CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str(memPriceParams[0]), CardanoWasm.BigNum.from_str(memPriceParams[1]))
            , CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str(stepPriceParams[0]), CardanoWasm.BigNum.from_str(stepPriceParams[1])))


        return CardanoWasm.TransactionBuilderConfigBuilder.new()
            .fee_algo(linearFee)
            .pool_deposit(CardanoWasm.BigNum.from_str(protocolParams.pool_deposit))//('500000000'))
            .key_deposit(CardanoWasm.BigNum.from_str(protocolParams.key_deposit))//('2000000'))
            .max_value_size(+protocolParams.max_val_size)//(4000)
            .max_tx_size(+protocolParams.max_tx_size)//(8000)
            .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(protocolParams.coins_per_utxo_size))
            .ex_unit_prices(exUnitPrice)
            .build();
    }

}

module.exports.initTxBuilder = function (protocolParams) {
    const txBuilderCfg = this.initProtocolParams(protocolParams);
    // Step2: new TransactionBuilder with paramsconfig
    return CardanoWasm.TransactionBuilder.new(txBuilderCfg);
}

module.exports.createScriptRef = async function (protocolParams, utxtos, changeAddr, ownerAddr, script, signFn) {

    const txBuilder = this.initTxBuilder(protocolParams);

    const txInputBuilder = CardanoWasm.TxInputsBuilder.new();
    for (let i = 0; i < utxtos.length; i++) {
        const utxoForFee = utxtos[i];
        const txId = CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxoForFee.txHash, 'hex'));
        const input = CardanoWasm.TransactionInput.new(txId, utxoForFee.index);
        const value = this.funValue(utxoForFee.value);
        const from = CardanoWasm.Address.from_bech32(utxoForFee.address);
        txInputBuilder.add_input(from, input, value);
        // const fee = txBuilder.fee_for_input(from, input, value);
        // allFee = allFee.checked_add(fee);
    }

    const minimumAda = this.getMinAdaOfUtxo(protocolParams, ownerAddr, { coins: 1000000, assets: {} }, undefined, script);
    const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('' + minimumAda));
    const output = CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bech32(ownerAddr), value);
    const scriptRef = CardanoWasm.ScriptRef.new_plutus_script(script);
    output.set_script_ref(scriptRef);


    txBuilder.set_inputs(txInputBuilder);
    txBuilder.add_output(output);
    // const addr = CardanoWasm.Address.from_bech32(admin);
    // const baseAddr = CardanoWasm.BaseAddress.from_address(addr);
    // txBuilder.add_required_signer(baseAddr.payment_cred().to_keyhash());
    txBuilder.add_change_if_needed(CardanoWasm.Address.from_bech32(changeAddr));


    const body = txBuilder.build_tx().body();
    let txBodyHash = CardanoWasm.hash_transaction(body);

    const transactionWitnessSet = CardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const signResult = await signFn(txBodyHash.to_hex());
    vkeyWitnesses.add(CardanoWasm.Vkeywitness.from_json(JSON.stringify(signResult)));
    transactionWitnessSet.set_vkeys(vkeyWitnesses);

    const signedTx = CardanoWasm.Transaction.new(
        body,
        transactionWitnessSet
    );

    return signedTx;
}


module.exports.transfer = async (protocolParams, utxtoInputs, to, funValue, changeAddr, datum, script, signFn) => {
    const txBuilder = this.initTxBuilder(protocolParams);
    const txInputBuilder = CardanoWasm.TxInputsBuilder.new();
    for (let i = 0; i < utxtoInputs.length; i++) {
        const utxo = utxtoInputs[i];
        const txId = CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.txHash, 'hex'));
        const input = CardanoWasm.TransactionInput.new(txId, utxo.index);
        const value = this.funValue(utxo.value);
        const from = CardanoWasm.Address.from_bech32(utxo.address);
        txInputBuilder.add_input(from, input, value);
    }

    const minimumAda = this.getMinAdaOfUtxo(protocolParams, to, funValue, datum, script);
    if (minimumAda > funValue.coins * 1) throw `output coins is to small ,required minimum is ${minimumAda}, actual value is ${funValue.coins}`;

    const value = this.funValue(funValue);
    const output = CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bech32(to), value);
    if (datum) {
        output.set_plutus_data(datum);
    }

    if (script) {
        const scriptRef = CardanoWasm.ScriptRef.new_plutus_script(script);
        output.set_script_ref(scriptRef);
    }


    txBuilder.set_inputs(txInputBuilder);
    txBuilder.add_output(output);
    txBuilder.add_change_if_needed(CardanoWasm.Address.from_bech32(changeAddr));


    const body = txBuilder.build_tx().body();
    let txBodyHash = CardanoWasm.hash_transaction(body);

    const transactionWitnessSet = CardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const signResult = await signFn(txBodyHash.to_hex());
    vkeyWitnesses.add(CardanoWasm.Vkeywitness.from_json(JSON.stringify(signResult)));
    transactionWitnessSet.set_vkeys(vkeyWitnesses);

    const signedTx = CardanoWasm.Transaction.new(
        body,
        transactionWitnessSet
    );

    return signedTx;
}

module.exports.getMinAdaOfUtxo = function (protocolParams, owner, value, datum, refScript) {

    const mutiAsset = CardanoWasm.MultiAsset.new();
    let checkedValue = value;
    if (!(value instanceof CardanoWasm.Value)) {
        if (!value.assets) value.assets = {}
        for (const tokenId in value.assets) {
            const [policy_id, tokenName] = tokenId.split('.');
            const assetName = CardanoWasm.AssetName.new(Buffer.from(tokenName, 'hex'));

            const asset = CardanoWasm.Assets.new();
            asset.insert(assetName, CardanoWasm.BigNum.from_str('' + value.assets[tokenId]));
            mutiAsset.insert(CardanoWasm.ScriptHash.from_hex(policy_id), asset);
        }

        const minAdaWithToken = 1000000 + 1 * value.coins;//1672280
        checkedValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(minAdaWithToken + ''));
        checkedValue.set_multiasset(mutiAsset);
    } else {
        // console.log(value.to_json());
        if (value.coin().less_than(CardanoWasm.BigNum.from_str('1000000'))) {
            // console.log('=====>',value.coin().to_str());
            value.set_coin(CardanoWasm.BigNum.from_str('1000000'));
        }
    }

    // console.log(typeof owner);
    let ownerAddr = owner;
    if (!(owner instanceof CardanoWasm.Address)) {
        ownerAddr = CardanoWasm.Address.from_bech32(owner);
    }
    // console.log('ownerAddr=',ownerAddr.to_bech32());
    const output = CardanoWasm.TransactionOutput.new(ownerAddr, checkedValue);

    if (datum) output.set_plutus_data(datum);


    if (refScript) {
        output.set_script_ref(CardanoWasm.ScriptRef.new_plutus_script(refScript));
    }
    // console.log(output.to_json());
    // console.log('size=',output.to_bytes().byteLength+160);

    return (160 + output.to_bytes().byteLength) * protocolParams.coinsPerUtxoByte
}


module.exports.datum42 = function () {
    const ls = CardanoWasm.PlutusList.new();
    ls.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('1')));
    return ls;
}
//{"constructor":0,"fields":[{"int":42}]}
module.exports.genDemoDatum42 = function () {
    // const ls = CardanoWasm.PlutusList.new();
    // ls.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('1')));
    return CardanoWasm.PlutusData.new_constr_plutus_data(
        CardanoWasm.ConstrPlutusData.new(
            CardanoWasm.BigNum.from_str('0'),
            this.datum42()
        )
    )
}

module.exports.funValue = function (valueMap) {
    const mutiAsset = CardanoWasm.MultiAsset.new();


    const policyAssets = {}

    for (const assetId in valueMap.assets) {
        const assetValue = valueMap.assets[assetId];
        if(assetValue*1 == 0) continue;
        let [policy_id, assetName] = assetId.split('.');

        let assets = policyAssets[policy_id];
        if (!assets) {
            assets = CardanoWasm.Assets.new();
            policyAssets[policy_id] = assets
        }
        if (!assetName) assetName = '';
        assets.insert(CardanoWasm.AssetName.new(Buffer.from(assetName, 'hex')), CardanoWasm.BigNum.from_str('' + assetValue));
    }
    for (const policy_id in policyAssets) {
        const assets = policyAssets[policy_id];
        mutiAsset.insert(CardanoWasm.ScriptHash.from_hex(policy_id), assets);
    }

    // console.log(mutiAsset.to_json());

    let value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('' + valueMap.coins));
    if(mutiAsset.len() > 0) value.set_multiasset(mutiAsset);
    // console.log(value.to_json());
    return value;
}

module.exports.addressToPkhOrScriptHash = function (addrStr) {
    const tmp = CardanoWasm.Address.from_bech32(addrStr);
    let toAddrBase = CardanoWasm.BaseAddress.from_address(tmp);
    if (!toAddrBase) toAddrBase = CardanoWasm.EnterpriseAddress.from_address(tmp);
    switch (toAddrBase.payment_cred().kind()) {
        case 0:
            return toAddrBase.payment_cred().to_keyhash().to_hex();
            break;
        case 1:
            return toAddrBase.payment_cred().to_scripthash().to_hex();
        default:
            throw 'unexpected kind type:' + toAddrBase.payment_cred().kind()
            break;
    }
}

module.exports.addressType = function (addrStr){
    const tmp = CardanoWasm.Address.from_bech32(addrStr);
    let toAddrBase = CardanoWasm.BaseAddress.from_address(tmp);
    if (!toAddrBase) toAddrBase = CardanoWasm.EnterpriseAddress.from_address(tmp);
    return toAddrBase.payment_cred().kind();
}

//TODO: 
module.exports.addressToHashs = function (addrStr) {
    const tmp = CardanoWasm.Address.from_bech32(addrStr);
    let toAddrBase = CardanoWasm.BaseAddress.from_address(tmp);
    let ret = {};
    if (!toAddrBase) {
        toAddrBase = CardanoWasm.EnterpriseAddress.from_address(tmp);
    } else {
        const stake_cred = toAddrBase.stake_cred();
        switch (stake_cred.kind()) {
            case 0:
                ret.pkhStk = stake_cred.to_keyhash().to_hex();
                break;
            case 1:
                ret.pkhStk = stake_cred.to_scripthash().to_hex();
            default:
                break;
        }
    }

    switch (toAddrBase.payment_cred().kind()) {
        case 0:
            ret.pkhPay = toAddrBase.payment_cred().to_keyhash().to_hex();
            break;
        case 1:
            ret.pkhPay = toAddrBase.payment_cred().to_scripthash().to_hex();
            break;
        default:
            throw 'unexpected kind type:' + toAddrBase.payment_cred().kind();
            break;
    }

    return ret;
}