const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const utils = require('./utils');
const ogmiosUtils = require('./ogmios-utils');

const contracts = require('./contracts');
const contractsMgr = require('./contracts-mgr');




class ContractSdk {
    
    constructor(isMainnet = false, scriptRefOwnerAddr = 'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd') {
        contracts.init(isMainnet);
        this.ADDR_PREFIX = isMainnet ? 'addr' : 'addr_test';
        this.scriptRefOwnerAddr = scriptRefOwnerAddr;
    }

    async init(ogmiosHost, ogmiosPort = 1337) {

        await ogmiosUtils.init_ogmios({ host: ogmiosHost, port: ogmiosPort });
        this.groupInfoHolderRef = await this.getScriptRefUtxo(contractsMgr.GroupInfoNFTHolderScript.script());
        this.adminNftHoldRefScript = await this.getScriptRefUtxo(contractsMgr.AdminNFTHolderScript.script());
    }

    async getScriptRefUtxo(script) {
        let refUtxo = await ogmiosUtils.getUtxo(this.scriptRefOwnerAddr);
        const ref = refUtxo.find(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
        return ref;
    }

    async getGroupInfoNft() {
        const groupInfoHolder = contractsMgr.GroupInfoNFTHolderScript.address().to_bech32(this.ADDR_PREFIX);

        const groupInfoToken = (await ogmiosUtils.getUtxo(groupInfoHolder)).find(o => {
            for (const tokenId in o.value.assets) {
                if (tokenId == contractsMgr.GroupNFT.tokenId()) return true;
            }
            return false;
        });

        return groupInfoToken;
    }

    async getAdminNft() {
        const adminNftHolder = contractsMgr.AdminNFTHolderScript.address().to_bech32(this.ADDR_PREFIX);

        const adminNftUtxo = (await ogmiosUtils.getUtxo(adminNftHolder)).find(o => {
            for (const tokenId in o.value.assets) {
                if (tokenId == contractsMgr.AdminNFT.tokenId()) return true;
            }
            return false;
        });

        return adminNftUtxo;
    }

    async invokeGroupInfoHolder(action, setParam, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, waittingConfirmd) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const adminNftUtxo = await this.getAdminNft();
        const adminNftHoldRefScript = this.adminNftHoldRefScript;

        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if(utils.addressType(addr) == CardanoWasm.StakeCredKind.Script){
                throw 'not supports script address'
            }

            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }

        let signedTx;
        switch (action) {
            case contractsMgr.GroupNFT.OracleWorker: {
                const newOracleWorker = utils.addressToPkhOrScriptHash(setParam);

                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setOracleWorker(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, [groupInfoUtxo]
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newOracleWorker, changeAddr, undefined, signFn);
                break;
            }
            case contractsMgr.GroupNFT.TreasuryCheckVH: {
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setTreasuryCheckVH(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, [groupInfoUtxo]
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , setParam, changeAddr, undefined, signFn);
                break;
            }
            case contractsMgr.GroupNFT.MintCheckVH: {
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setMintCheckVH(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, [groupInfoUtxo]
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , setParam, changeAddr, undefined, signFn);
                break;
            }
            // case contractsMgr.GroupNFT.StkVh: {
            //     signedTx = await contractsMgr.GroupInfoNFTHolderScript.setStakeVH(
            //         protocolParamsGlobal, utxosForFee, utxoForCollateral, [groupInfoUtxo]
            //         , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
            //         , setParam, changeAddr, undefined, signFn);
            //     break;
            // }
            case contractsMgr.GroupNFT.StkCheckVh: {
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setStakeCheckVH(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, [groupInfoUtxo]
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , setParam, changeAddr, undefined, signFn);
                break;
            }
            // case contractsMgr.GroupNFT.Version: {
            //     signedTx = await contractsMgr.GroupInfoNFTHolderScript.setVersion(
            //         protocolParamsGlobal, utxosForFee, utxoForCollateral, [groupInfoUtxo]
            //         , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
            //         , setParam, changeAddr, undefined, signFn);TODO
            //     break;
            // }
            default:
                throw `unkown action${action}`;
                break;
        }

        return signedTx;
    }

    async invokeAdminNftHolder(action, setParam, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, waittingConfirmd) {

        const adminNftUtxo = await this.getAdminNft();
        const adminNftHoldRefScript = this.adminNftHoldRefScript;

        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if(utils.addressType(addr) == CardanoWasm.StakeCredKind.Script){
                throw 'not supports script address'
            }
            
            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }

        let signedTx;
        switch (action) {
            case contractsMgr.AdminNFTHolderScript.Update: {
                const signatories = [];
                for (let i = 0; i < setParam.signatories.length; i++) {
                    signatories.push(utils.addressToPkhOrScriptHash(setParam.signatories[i]));
                }

                signedTx = await contractsMgr.AdminNFTHolderScript.update(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, [adminNftUtxo]
                    , adminNftHoldRefScript, changeAddr, signatories, setParam.minNumSignatures, signFn, mustSignBy);
                break;
            }
            case contractsMgr.AdminNFTHolderScript.upgrade: {
                signedTx = await contractsMgr.AdminNFTHolderScript.upgrade(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, [adminNftUtxo]
                    , adminNftHoldRefScript, changeAddr, setParam.owner, setParam.datum, signFn, mustSignBy);
                break;
            }
            default:
                throw `unkown action${action}`;
                break;
        }

        return signedTx;
    }

    async setOracleWorker(newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.OracleWorker, newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async setTreasuryCheckVH(newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.TreasuryCheckVH, newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.MintCheckVH, newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async setStakeCheckVH(newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.StkCheckVh, newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async addSignature(tx,signFn){
        return contractsMgr.AdminNFTHolderScript.addSignature(tx,signFn);
    }

    

    // async registerStack(utxosForFee, changeAddr, signFn) {
    //     const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();
    //     const signedTx = await contractsMgr.StoremanStackScript.register(protocolParamsGlobal, utxosForFee, changeAddr, signFn);
    //     return signedTx;
    // }

    async delegate(){}

    async claim(){}

    async deregister(){}


}

module.exports = ContractSdk