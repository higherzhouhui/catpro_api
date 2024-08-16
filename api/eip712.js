const { ethers, uint256, utils } = require('ethers')
const {
  PRIVATE_KEY,
  GATEWAY_CONTRACT,
  CHAIN_ID,
  DAPP_NAME,
  DAPP_VERSION,
  PET_NFT_CONTRACT,
  SETTLE_CONTRACT,
  CURVE_A,
  BaseConfig
} = require('./constants')

/**
 * 将宠物上链
 * @param {*} wallet
 * @returns
 */
async function claim_pet_sig(wallet) {
  const domain = {
    name: DAPP_NAME,
    version: DAPP_VERSION,
    chainId: BaseConfig.ChainId,
    verifyingContract: BaseConfig.FfpApiGateWayAddress
  }

  const types = {
    Claim: [
      { name: 'nft', type: 'address' },
      { name: 'to', type: 'address' }
    ]
  }

  const message = {
    nft: BaseConfig.FfpetNftAddress,
    to: wallet
  }

  // 0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee
  let signer = new ethers.Wallet(PRIVATE_KEY)
  const signature = await signer._signTypedData(domain, types, message)

  console.log('Signature:', signature)
  return signature
}

/** pts 兑换 ffp */
async function exchange_ffp_sig(nonce, amount, wallet) {
  const domain = {
    name: DAPP_NAME,
    version: DAPP_VERSION,
    chainId: BaseConfig.ChainId,
    verifyingContract: BaseConfig.FfpSettleAddress
  }

  const types = {
    ExchangeRequest: [
      { name: 'nonce', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' }
    ]
  }
  const message = {
    nonce: nonce,
    amount: ethers.utils.parseUnits(`${amount}`),
    to: wallet
  }

  // 0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee
  let signer = new ethers.Wallet(PRIVATE_KEY)
  const signature = await signer._signTypedData(domain, types, message)

  console.log('Signature:', signature)
  return signature
}

/**
 * 更新宠物的exp值
 * @param {*} pet_id
 * @param {*} exp
 * @param {*} wallet
 * @returns
 */
async function update_exp(pet_id, exp, wallet) {
  const domain = {
    name: DAPP_NAME,
    version: DAPP_VERSION,
    chainId: BaseConfig.ChainId,
    verifyingContract: BaseConfig.FfpSettleAddress
  }

  const types = {
    Update: [
      { name: 'wallet', type: 'address' },
      { name: 'pet_id', type: 'uint256' },
      { name: 'exp', type: 'uint256' },
      { name: 'contractAddress', type: 'address' }
    ]
  }

  const message = {
    wallet: wallet,
    pet_id: pet_id,
    exp: exp,
    contractAddress: contractAddress
  }

  // 0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee
  let signer = new ethers.Wallet(PRIVATE_KEY)
  const signature = await signer._signTypedData(domain, types, message)

  console.log('Signature:', signature)
  return signature
}

/**
 * 宠物喂养
 * @param {*} wallet
 * @returns
 */
async function pet_feed_sig(data) {
  const {
    nft_address,
    wallet,
    petId,
    exp,
    nonce,
    inc,
    a,
    propsId,
  } = data
  //domain
  const domain = {
    name: DAPP_NAME,
    version: DAPP_VERSION,
    chainId: BaseConfig.ChainId,
    verifyingContract: BaseConfig.FfpApiGateWayAddress
  }

  //types
  const types = {
    PetFeed: [
      { name: 'nft', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'petId', type: 'uint256' },
      { name: "propsId", type: "uint256" },
      { name: 'exp', type: 'uint256' },
      { name: 'inc', type: 'bool' },
      { name: 'a', type: 'uint256' }
    ]
  }

  //message
  const message = {
    nft: nft_address,
    to: wallet,
    nonce: nonce,
    petId: petId,
    propsId: propsId,
    exp: exp,
    inc: inc,
    a: a
  }
  console.log('message', message)

  // 0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee
  let signer = new ethers.Wallet(PRIVATE_KEY)
  const signature = await signer._signTypedData(domain, types, message)
  console.log('Signature:', signature)
  return signature
}


/**
 * 购买食物
 * @param {*} nonce
 * @param {*} propsId
 * @param {*} tokenAmount
 * @param {*} uAmount
 * @returns
 */
async function buyProps_sig(data) {
  const {nonce, propsId, tokenAmount, uAmount} = data
  const domain = {
    name: DAPP_NAME,
    version: DAPP_VERSION,
    chainId: BaseConfig.ChainId,
    verifyingContract: BaseConfig.FfpSettleAddress
  }

  const types = {
    BuyRequest: [
      {name: "nonce", type: "uint256"},
      {name: "propsId", type: "uint256"},
      {name: "tokenAmount", type: "uint256"},
      {name: "uAmount", type: "uint256"}
    ]
  }

  const message = {
    nonce,
    propsId,
    tokenAmount: ethers.utils.parseEther(`${tokenAmount}`),
    uAmount: ethers.utils.parseEther(`${uAmount}`),
  }

  // 0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee
  const signer = new ethers.Wallet(PRIVATE_KEY)
  const signature = await signer._signTypedData(domain, types, message)

  console.log('Signature:', signature)
  return {
    ...data,
    signature
  }
}

/**
 * 获取领取FFP的签名相关信息
 * @param {*} nonce
 * @param {*} amount
 * @param {*} wallet
 * @returns
 */
async function invite_reward_claim_sig(data) {
  try {
    const {amount, nonce, wallet} = data
    const domain = {
      name: DAPP_NAME,
      version: DAPP_VERSION,
      chainId: BaseConfig.ChainId,
      verifyingContract: BaseConfig.FfpSettleAddress
    }
  
    const types = {
      ClaimRewardRequest: [
        { name: 'nonce', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'to', type: 'address' },
      ]
    }
  
    const message = {
      nonce,
      amount: ethers.utils.parseEther(`${amount}`),
      to: wallet,
    }
  
    // 0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee
    let signer = new ethers.Wallet(PRIVATE_KEY)
    const signature = await signer._signTypedData(domain, types, message)
    console.log('Signature:', signature)
    console.log('message:', message)
    return {
      ...data,
      signature
    }
  } catch (error) {
    return {error: `${error}`}
  }
}


module.exports = {
  buyProps_sig,
  update_exp,
  claim_pet_sig,
  exchange_ffp_sig,
  pet_feed_sig,
  invite_reward_claim_sig
}

// pet_feed_sig(6, 20, true)
