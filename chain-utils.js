const axios = require('axios');


// const apiDef ={
//     'currentProtocolParameters':{},
//     'utxo':{},
//     'blockHeight':{},
//     'delegationsAndRewards':{},
//     'eraSummaries':{},
//     'genesisConfig':{},
//     'chainTip':{},

//     'evaluateTx':{},
//     'submitTx':{}
// }

const mainnetUrl = "https://nodes.wandevs.org/cardano";
const testnetUrl = "https://nodes-testnet.wandevs.org/cardano";

let apiServer = '';
// const axiosInstance = 
module.exports.setBaseUrl = function (url) {
  apiServer = url
}


module.exports.currentProtocolParameters = async function () {
  const reqUrl = `${apiServer}/${'getCurProtocolParametersByPlutusSdk'}`;
  return (await axios.post(reqUrl, {})).data;
}

module.exports.utxo = async function (filter) {
  const reqUrl = `${apiServer}/${'getUTXOsByPlutusSdk'}`;
  return (await axios.post(reqUrl, filter)).data;
}

module.exports.blockHeight = async function () {
  const reqUrl = `${apiServer}/${'getBlockHeightByPlutusSdk'}`;
  return (await axios.post(reqUrl, {})).data;
}

module.exports.delegationsAndRewards = async function (filter) {
  const reqUrl = `${apiServer}/${'getDelegationsAndRewardsByPlutusSdk'}`;
  return (await axios.post(reqUrl, filter)).data;
}

module.exports.eraSummaries = async function () {
  const reqUrl = `${apiServer}/${'getEraSummariesByPlutusSdk'}`;
  return (await axios.post(reqUrl, {})).data;
}

module.exports.genesisConfig = async function () {
  const reqUrl = `${apiServer}/${'getGenesisConfigByPlutusSdk'}`;
  return (await axios.post(reqUrl, {})).data;
}

module.exports.chainTip = async function () {
  const reqUrl = `${apiServer}/${'getChainTipByPlutusSdk'}`;
  return (await axios.post(reqUrl, {})).data;
}

module.exports.evaluateTx = async function (filter) {
  const reqUrl = `${apiServer}/${'evaluateTxByPlutusSdk'}`;
  return (await axios.post(reqUrl, filter)).data;
}

module.exports.submitTx = async function (filter) {
  const reqUrl = `${apiServer}/${'submitTxByPlutusSdk'}`;
  return (await axios.post(reqUrl, filter)).data;
}
