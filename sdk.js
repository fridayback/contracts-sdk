const utils = require('./utils');
const ogmiosUtils = require('./ogmios-utils');
const contracts = require('./contracts');
const contractsMgr = require('./contracts-mgr');

let CardanoWasm = null;

function setWasm(wasm) {
  CardanoWasm = wasm;
}

const ACTION_DELEGATE = 0;
const ACTION_CLAIM = 1;
const ACTION_DEREGISTER = 2;

class ContractSdk {

    constructor(isMainnet = false, scriptRefOwnerAddr = 'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd') {
        contracts.init(isMainnet);
        this.ADDR_PREFIX = isMainnet ? 'addr' : 'addr_test';
        this.scriptRefOwnerAddr = scriptRefOwnerAddr;
    }

    async init(ogmiosHost, ogmiosPort = 1337) {
        await ogmiosUtils.init_ogmios({ host: ogmiosHost, port: ogmiosPort });
        let refUtxo = await ogmiosUtils.getUtxo(this.scriptRefOwnerAddr);
        this.groupInfoHolderRef = this.getScriptRefUtxo(refUtxo, contractsMgr.GroupInfoNFTHolderScript.script());
        this.adminNftHoldRefScript = this.getScriptRefUtxo(refUtxo, contractsMgr.AdminNFTHolderScript.script());
        this.stakeScriptRefUtxo = this.getScriptRefUtxo(refUtxo, contractsMgr.StoremanStackScript.script());
        this.stakeCheckScriptRefUtxo = this.getScriptRefUtxo(refUtxo, contractsMgr.StakeCheckScript.script());
        this.mintChecTokenscriptRefUtxo = this.getScriptRefUtxo(refUtxo, contracts.MintCheckTokenScript.script());
        this.treasuryChecTokenscriptRefUtxo = this.getScriptRefUtxo(refUtxo, contracts.TreasuryCheckTokenScript.script());
        this.treasuryCheckScriptRefUtxo = this.getScriptRefUtxo(refUtxo, contracts.TreasuryCheckScript.script());
        this.mintCheckScriptRefUtxo = this.getScriptRefUtxo(refUtxo, contracts.MintCheckScript.script());
    }

    getScriptRefUtxo(refUtxo, script) {
        return refUtxo.find(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
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

    async invokeGroupInfoHolder(action, setParam, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const adminNftUtxo = await this.getAdminNft();
        const adminNftHoldRefScript = this.adminNftHoldRefScript;

        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
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

    async invokeAdminNftHolder(action, setParam, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn) {

        const adminNftUtxo = await this.getAdminNft();
        const adminNftHoldRefScript = this.adminNftHoldRefScript;

        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
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
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, adminNftUtxo
                    , adminNftHoldRefScript, changeAddr, signatories, setParam.minNumSignatures, signFn, mustSignBy);
                break;
            }
            case contractsMgr.AdminNFTHolderScript.upgrade: {
                signedTx = await contractsMgr.AdminNFTHolderScript.upgrade(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, adminNftUtxo
                    , adminNftHoldRefScript, changeAddr, setParam.owner, setParam.datum, signFn, mustSignBy);
                break;
            }
            default:
                throw `unkown action${action}`;
                break;
        }

        return signedTx;
    }

    async setAdmin(signatories, minNumSignatures, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn = undefined) {
        return await this.invokeAdminNftHolder(contractsMgr.AdminNFTHolderScript.Update, { signatories, minNumSignatures }
            , mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn);
    }

    async setOracleWorker(newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.OracleWorker, newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async setTreasuryCheckVH(newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.TreasuryCheckVH, newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.MintCheckVH, newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async setStakeCheckVH(newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.StkCheckVh, newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async addSignature(tx, signFn = undefined) {
        return contractsMgr.AdminNFTHolderScript.addSignature(tx, signFn);
    }



    async invokeStoremanStake(action, param, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn) {
        const goupInfoTokenUtxo = await getGroupInfoToken();
        const adminNftUtxo = await getAdminNft();


        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        // console.log('stakeCheckAddr =', stakeCheckAddr);
        let stakeCheckUtxo = await ogmiosUtils.getUtxo(stakeCheckAddr);
        if (stakeCheckUtxo && stakeCheckUtxo.length > 0) {
            stakeCheckUtxo = stakeCheckUtxo[0];
        } else {
            throw 'stackcheck utxo not exist';
        }

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
                throw 'not supports script address'
            }

            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }
        let signedTx;
        switch (action) {
            case ACTION_DELEGATE: {
                signedTx = await contractsMgr.StoremanStackScript.delegate(protocolParamsGlobal, utxosForFee, changeAddr, utxoForCollateral
                    , goupInfoTokenUtxo, param, this.stakeScriptRefUtxo, this.stakeCheckScriptRefUtxo, stakeCheckUtxo
                    , adminNftUtxo, this.adminNftHoldRefScript, mustSignBy, signFn);
                break;
            }
            case ACTION_CLAIM: {
                signedTx = await contractsMgr.StoremanStackScript.claim(protocolParamsGlobal, utxosForFee, changeAddr, utxoForCollateral
                    , goupInfoTokenUtxo, stakeScriptRefUtxo, stakeCheckScriptRefUtxo, stakeCheckUtxo
                    , adminNftUtxo, adminNftHoldRefScript, mustSignBy, signFn, param.claimTo, param.claimAmount);
                break;
            }
            case ACTION_DEREGISTER: {
                signedTx = await contractsMgr.StoremanStackScript.deregister(protocolParamsGlobal, utxosForFee, changeAddr, utxoForCollateral
                    , goupInfoTokenUtxo, stakeScriptRefUtxo, stakeCheckScriptRefUtxo, stakeCheckUtxo
                    , adminNftUtxo, adminNftHoldRefScript, mustSignBy, signFn);
                break;
            }
            default:
                throw `unkown action ${action}`;
                break;
        }

        return signedTx;

    }

    async delegate(pool, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeStoremanStake(ACTION_DELEGATE, pool, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async claim(amount, receiptor, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeStoremanStake(ACTION_CLAIM, { cliamTo: receiptor, claimAmount: amount }, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async deregister(mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        return await this.invokeStoremanStake(ACTION_DEREGISTER, { cliamTo: receiptor, claimAmount: amount }, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn);
    }

    async mintTreasuryCheckToken(amount, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
                throw 'not supports script address'
            }

            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }

        const mintTo = contracts.TreasuryCheckScript.address(groupInfoParams[contractsMgr.GroupNFT.StkVh]).to_bech32(this.ADDR_PREFIX);

        const signedTx = await contracts.TreasuryCheckTokenScript.mint(protocolParamsGlobal, utxosForFee, utxoForCollaterals, this.treasuryChecTokenscriptRefUtxo
            , groupInfoUtxo, { adminNftUtxo, adminNftHoldRefScript: this.adminNftHoldRefScript, mustSignBy }, changeAddr, amount, mintTo, signFn);

        return signedTx;
    }

    async mintMintCheckToken(amount, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
                throw 'not supports script address'
            }

            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }

        const mintTo = contracts.MintCheckScript.address(groupInfoParams[contractsMgr.GroupNFT.StkVh]).to_bech32(this.ADDR_PREFIX);

        const signedTx = await contracts.MintCheckTokenScript.mint(protocolParamsGlobal, utxosForFee, utxoForCollaterals, this.mintChecTokenscriptRefUtxo
            , groupInfoUtxo, { adminNftUtxo, adminNftHoldRefScript: this.adminNftHoldRefScript, mustSignBy }, changeAddr, amount, mintTo, signFn);

        return signedTx;
    }

    async burnTreasuryCheckToken(mustSignByAddrs, utxosForFee, utxoForCollaterals, burnUtxos, changeAddr, signFn = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        // const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
                throw 'not supports script address'
            }

            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }

        const signedTx = await contracts.TreasuryCheckScript.burn(protocolParamsGlobal, utxosForFee
            , utxoForCollaterals, burnUtxos, this.treasuryCheckScriptRefUtxo, this.treasuryChecTokenscriptRefUtxo
            , groupInfoUtxo, { adminNftUtxo, adminNftHoldRefScript: this.adminNftHoldRefScript, mustSignBy }
            , changeAddr, signFn);

        return signedTx;
    }

    async burnMintCheckToken(mustSignByAddrs, utxosForFee, utxoForCollaterals, burnUtxos, changeAddr, signFn = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        // const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        let mustSignBy = [];
        for (let i = 0; i < mustSignByAddrs.length; i++) {
            const addr = mustSignByAddrs[i];
            if (utils.addressType(addr) == CardanoWasm.StakeCredKind.Script) {
                throw 'not supports script address'
            }

            mustSignBy.push(utils.addressToPkhOrScriptHash(addr));
        }

        const signedTx = await contracts.MintCheckScript.burn(protocolParamsGlobal, utxosForFee
            , utxoForCollaterals, burnUtxos, this.mintCheckScriptRefUtxo, this.mintChecTokenscriptRefUtxo
            , groupInfoUtxo, { adminNftUtxo, adminNftHoldRefScript: this.adminNftHoldRefScript, mustSignBy }
            , changeAddr, signFn);

        return signedTx;
    }


}

module.exports = {
  setWasm,
  ContractSdk
}