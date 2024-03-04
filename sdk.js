const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const utils = require('./utils');
const ogmiosUtils = require('./ogmios-utils');

const contracts = require('./contracts');
const contractsMgr = require('./contracts-mgr');


const ACTION_DELEGATE = 0;
const ACTION_CLAIM = 1;
const ACTION_DEREGISTER = 2;

class ContractSdk {

    constructor(isMainnet = false, scriptRefOwnerAddr) {
        contracts.init(isMainnet);
        this.ADDR_PREFIX = isMainnet ? 'addr' : 'addr_test';
        if (!scriptRefOwnerAddr) {
            this.scriptRefOwnerAddr =
                isMainnet ? 'addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym'
                    : 'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd';
        } else {
            this.scriptRefOwnerAddr = scriptRefOwnerAddr;
        }

        this.allScriptRefUtxo = [];
    }

    async init(ogmiosHost, ogmiosPort = 1337, tls = false) {

        await ogmiosUtils.init_ogmios({ host: ogmiosHost, port: ogmiosPort, tls: tls });
        this.groupInfoHolderRef = await this.getScriptRefUtxo(contractsMgr.GroupInfoNFTHolderScript.script());
        this.adminNftHoldRefScript = await this.getScriptRefUtxo(contractsMgr.AdminNFTHolderScript.script());
        this.stakeScriptRefUtxo = await this.getScriptRefUtxo(contractsMgr.StoremanStackScript.script());
        this.stakeCheckScriptRefUtxo = await this.getScriptRefUtxo(contractsMgr.StakeCheckScript.script());
        this.mintChecTokenscriptRefUtxo = await this.getScriptRefUtxo(contracts.MintCheckTokenScript.script());
        this.treasuryChecTokenscriptRefUtxo = await this.getScriptRefUtxo(contracts.TreasuryCheckTokenScript.script());
        this.treasuryCheckScriptRefUtxo = await this.getScriptRefUtxo(contracts.TreasuryCheckScript.script());
        this.mintCheckScriptRefUtxo = await this.getScriptRefUtxo(contracts.MintCheckScript.script());
    }

    async getScriptRefUtxo(script) {
        if (this.allScriptRefUtxo && this.allScriptRefUtxo.length <= 0) {
            this.allScriptRefUtxo = await ogmiosUtils.getUtxo(this.scriptRefOwnerAddr);
        }
        const ref = this.allScriptRefUtxo.find(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
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

    async invokeGroupInfoHolder(action, setParam, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx) {
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
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newOracleWorker, changeAddr, undefined, signFn, exUnitTx);
                break;
            }
            case contractsMgr.GroupNFT.TreasuryCheckVH: {
                const newTreasuryCheckVk = utils.addressToPkhOrScriptHash(setParam);
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setTreasuryCheckVH(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newTreasuryCheckVk, changeAddr, undefined, signFn, exUnitTx);
                break;
            }
            case contractsMgr.GroupNFT.MintCheckVH: {
                const newMintCheckVk = utils.addressToPkhOrScriptHash(setParam);
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setMintCheckVH(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newMintCheckVk, changeAddr, undefined, signFn, exUnitTx);
                break;
            }
            // case contractsMgr.GroupNFT.StkVh: {
            //     signedTx = await contractsMgr.GroupInfoNFTHolderScript.setStakeVH(
            //         protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
            //         , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
            //         , setParam, changeAddr, undefined, signFn);
            //     break;
            // }
            case contractsMgr.GroupNFT.StkCheckVh: {
                const newStackCheckVk = utils.addressToPkhOrScriptHash(setParam);
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setStakeCheckVH(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newStackCheckVk, changeAddr, undefined, signFn, exUnitTx);
                break;
            }
            case contractsMgr.GroupNFT.BalanceWorker: {
                const newBalancePK = utils.addressToPkhOrScriptHash(setParam);
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setBalanceWorker(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newBalancePK, changeAddr, undefined, signFn, exUnitTx);
                break;
            }
            case contractsMgr.GroupNFT.Version: {
                const newDatum = CardanoWasm.PlutusData.from_hex(setParam.datum);
                const newOwner = utils.addressToPkhOrScriptHash(setParam.owner);
                signedTx = await contractsMgr.GroupInfoNFTHolderScript.setVersion(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, groupInfoUtxo
                    , this.groupInfoHolderRef, { adminNftUtxo, adminNftHoldRefScript, mustSignBy }
                    , newOwner, newDatum, changeAddr, undefined, signFn, exUnitTx);
                break;
            }
            default:
                throw `unkown action${action}`;
                break;
        }

        return signedTx;
    }

    async adminNftHolderUpgrade(newHolderAddress, newDatum, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx) {
        return await this.invokeAdminNftHolder(contractsMgr.AdminNFTHolderScript.upgrade
            , { owner: newHolderAddress, datum: newDatum }
            , mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx);
    }

    async invokeAdminNftHolder(action, setParam, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx) {

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
                    , adminNftHoldRefScript, changeAddr, signatories, setParam.minNumSignatures, signFn, mustSignBy, exUnitTx);
                break;
            }
            case contractsMgr.AdminNFTHolderScript.Upgrade: {
                const datum = CardanoWasm.PlutusData.from_hex(setParam.datum);
                signedTx = await contractsMgr.AdminNFTHolderScript.upgrade(
                    protocolParamsGlobal, utxosForFee, utxoForCollateral, adminNftUtxo
                    , adminNftHoldRefScript, changeAddr, setParam.owner, datum, signFn, mustSignBy, exUnitTx);
                break;
            }
            default:
                throw `unkown action${action}`;
                break;
        }

        return signedTx;
    }

    async setAdmin(signatories, minNumSignatures, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeAdminNftHolder(contractsMgr.AdminNFTHolderScript.Update, { signatories, minNumSignatures }
            , mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx);
    }

    async upgradeGroupNFTHolder(newHolder, newDatum, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.Version, { owner: newHolder, datum: newDatum }, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async upgradeAdminNFTHolder(newHolder, newDatum, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeAdminNftHolder(contractsMgr.AdminNFTHolderScript.Upgrade, { owner: newHolder, datum: newDatum }
            , mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx);
    }

    async setOracleWorker(newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.OracleWorker, newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async setTreasuryCheckVH(newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.TreasuryCheckVH, newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.MintCheckVH, newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async setStakeCheckVH(newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.StkCheckVh, newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async setBalanceWorker(newBalanceWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeGroupInfoHolder(contractsMgr.GroupNFT.BalanceWorker, newBalanceWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async addSignature(tx, signFn = undefined) {
        return contractsMgr.AdminNFTHolderScript.addSignature(tx, signFn);
    }



    async invokeStoremanStake(action, param, mustSignByAddrs, utxosForFee, utxoForCollateral, changeAddr, signFn, exUnitTx = undefined) {
        const goupInfoTokenUtxo = await this.getGroupInfoNft();
        const adminNftUtxo = await this.getAdminNft();


        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        const stakeCheckAddr = contractsMgr.StakeCheckScript.address().to_bech32(this.ADDR_PREFIX);
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
                    , adminNftUtxo, this.adminNftHoldRefScript, mustSignBy, signFn, exUnitTx);
                break;
            }
            case ACTION_CLAIM: {
                signedTx = await contractsMgr.StoremanStackScript.claim(protocolParamsGlobal, utxosForFee, changeAddr, utxoForCollateral
                    , goupInfoTokenUtxo, this.stakeScriptRefUtxo, this.stakeCheckScriptRefUtxo, stakeCheckUtxo
                    , adminNftUtxo, this.adminNftHoldRefScript, mustSignBy, signFn, param.claimTo, param.claimAmount, exUnitTx);
                break;
            }
            case ACTION_DEREGISTER: {
                signedTx = await contractsMgr.StoremanStackScript.deregister(protocolParamsGlobal, utxosForFee, changeAddr, utxoForCollateral
                    , goupInfoTokenUtxo, this.stakeScriptRefUtxo, this.stakeCheckScriptRefUtxo, stakeCheckUtxo
                    , adminNftUtxo, this.adminNftHoldRefScript, mustSignBy, signFn, exUnitTx);
                break;
            }
            default:
                throw `unkown action ${action}`;
                break;
        }

        return signedTx;

    }

    async delegate(pool, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeStoremanStake(ACTION_DELEGATE, pool, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async claim(amount, receiptor, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeStoremanStake(ACTION_CLAIM, { claimTo: receiptor, claimAmount: amount }, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async deregister(mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        return await this.invokeStoremanStake(ACTION_DEREGISTER, { claimTo: receiptor, claimAmount: amount }, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn, exUnitTx);
    }

    async mintTreasuryCheckToken(amount, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
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
            , groupInfoUtxo, { adminNftUtxo, adminNftHoldRefScript: this.adminNftHoldRefScript, mustSignBy }, changeAddr, amount, mintTo, signFn, exUnitTx);

        return signedTx;
    }

    async mintMintCheckToken(amount, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
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
            , groupInfoUtxo, { adminNftUtxo, adminNftHoldRefScript: this.adminNftHoldRefScript, mustSignBy }, changeAddr, amount, mintTo, signFn, exUnitTx);

        return signedTx;
    }

    async burnTreasuryCheckTokenWithHolder(amount,holder, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        const trearyCheckAddr = holder;//contracts.TreasuryCheckScript.address(groupInfoParams[contractsMgr.GroupNFT.StkVh]).to_bech32(this.ADDR_PREFIX);
        let burnUtxos = await ogmiosUtils.getUtxo(trearyCheckAddr);
        if (amount > burnUtxos.length) {
            throw `too many utxos to be burnd: max TreasuryCheck utxos is ${burnUtxos.length}`
        }
        burnUtxos = burnUtxos.slice(0, amount);

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
            , changeAddr, signFn, exUnitTx);

        return signedTx;
    }

    async burnMintCheckTokenWithHolder(amount,holder, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        const trearyCheckAddr = holder;//contracts.MintCheckScript.address(groupInfoParams[contractsMgr.GroupNFT.StkVh]).to_bech32(this.ADDR_PREFIX);
        let burnUtxos = await ogmiosUtils.getUtxo(trearyCheckAddr);
        if (amount > burnUtxos.length) {
            throw `too many utxos to be burnd: max MintCheck utxos is ${burnUtxos.length}`
        }
        burnUtxos = burnUtxos.slice(0, amount);

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
            , changeAddr, signFn, exUnitTx);

        return signedTx;
    }

    async burnTreasuryCheckToken(amount, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        const trearyCheckAddr = contracts.TreasuryCheckScript.address(groupInfoParams[contractsMgr.GroupNFT.StkVh]).to_bech32(this.ADDR_PREFIX);
        let burnUtxos = await ogmiosUtils.getUtxo(trearyCheckAddr);
        if (amount > burnUtxos.length) {
            throw `too many utxos to be burnd: max TreasuryCheck utxos is ${burnUtxos.length}`
        }
        burnUtxos = burnUtxos.slice(0, amount);

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
            , changeAddr, signFn, exUnitTx);

        return signedTx;
    }

    async burnMintCheckToken(amount, mustSignByAddrs, utxosForFee, utxoForCollaterals, changeAddr, signFn = undefined, exUnitTx = undefined) {
        const groupInfoUtxo = await this.getGroupInfoNft();
        const groupInfoParams = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
        const adminNftUtxo = await this.getAdminNft();
        const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

        const trearyCheckAddr = contracts.MintCheckScript.address(groupInfoParams[contractsMgr.GroupNFT.StkVh]).to_bech32(this.ADDR_PREFIX);
        let burnUtxos = await ogmiosUtils.getUtxo(trearyCheckAddr);
        if (amount > burnUtxos.length) {
            throw `too many utxos to be burnd: max MintCheck utxos is ${burnUtxos.length}`
        }
        burnUtxos = burnUtxos.slice(0, amount);

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
            , changeAddr, signFn, exUnitTx);

        return signedTx;
    }


}

module.exports = ContractSdk