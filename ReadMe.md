sdk使用指南：
1. sdk构造及初始化：
    const isMainnet = false; 
     const sdk = new ContractSdk(isMainnet);// 如果是主网则为true,否则为false

    await sdk.init(host, port); //host,port为ogmios服务的ip和端口（注：此处的ommios为cardano官方程序）
2. 由于sdk所涉功能对应的交易都需要多签，因此使用时都是发起者先构造交易并签名，然后调用添加其他签名的接口，增加其他账号的签名
    如设置oracle worker地址：
    # 1. 构造交易
        let signedTx = await sdk.setOracleWorker(newOracleWorker, mustSignBy, utxosForFee, [collateralUtxo], changeAddr, signFn);
        其中newOracleWorker为要设置的oracle worker地址, mustSignBy为本交易必须要签名的地址列表，utxoForFee为支付交易Fee的utxo,changeAddr为utxoForFee的找零地址，
        signFn为发起者的签名回调函数。其原型为
        const signFn = async hash => { }。返回数据格式为：return { vkey, signature };其中Vkey为签名私钥对应的公钥的to_bech32格式,signature为签名结果的十六进制字符串。
    # 2. 添加签名
        signedTxPlus1 = await sdk.addSignature(signedTx, signFnNext);
        signedTxPlus2 = await sdk.addSignature(signedTx, signFnNext2);
        ...
        其中signedTx为发起者构造的交易对象，signFnNext和signFnNext2均为构造交易步骤中指定的必须签名的地址的签名回调函数，原型和构造交易的signFn一样。
3. 发送交易
    通过钱包或ogmios服务发送交易，具体方式可自选。

4. sdk接口说明：
### async setOracleWorker(newOracleWorker, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn) 
    newOracleWorker为要设置的oracle worker地址,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### async setTreasuryCheckVH(newTreasuryCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    newTreasuryCheckVH为要设置的新的TreasuryCheck scriptHash,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### async setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    newMintCheckVH 为要设置的新的MintCheck scriptHash,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### async setStakeCheckVH(newStackCheckVH, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    newStackCheckVH 为要设置的新的 StackCheck scriptHash,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### async delegate(pool, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    pool 此次delegate 的pool地址,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### async claim(amount,receiptor, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    amount claim的数量,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### async deregister(mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。
### mintTreasuryCheckToken(amount, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    amount mint的TreasuryCheckToken数量,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。

### mintMintCheckToken(amount, mustSignBy, utxosForFee, utxoForCollaterals, changeAddr, signFn)
    amount mint的MintCheckToken数量,
    mustSignBy为本交易必须要签名的地址列表，
    utxoForFee为支付交易Fee的utxo,
    utxoForCollaterals为交易保证金,
    changeAddr为utxoForFee的找零地址，
    signFn为发起者的签名回调函数。