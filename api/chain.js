const http = require('needle')
const log4js = require('log4js')

const {
  RECIVE_WALLET,
  CONTRACT_ADDR,
  BaseConfig,
  PREV_FEED_UID,
} = require('./constants')
const { successResp, system_config, errorResp } = require('./common')
const ethers = require('ethers')
const Model = require('./models')
const { cache, sequelize, QueryTypes, Op } = require('./database')
const utils = require('./utils')
const abiConfig = require('../common/abi')
const provider = new ethers.providers.JsonRpcProvider(BaseConfig.rpcUrl111)

// 配置日志输出
function get_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/chain/chain',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('wallet')
  return logger
}

/**
 * 查询链上交易状态
 * @param {*} tx_hash
 * @param {*} buyer
 * @param {*} total_fee
 * @returns true or false
 */
function query_chain_tx(tx_hash, buyer, total_fee) {
  const url = `https://api.facet.org/transactions/${tx_hash}`
  return new Promise((resolve, reject) => {
    http.request('get', url, {}, (error, resp) => {
      if (!error) {
        const status = resp.body.result.status
        const tx_log = resp.body.result.logs[0]
        const tx_data = tx_log.data

        // 校验交易状态
        if (
          tx_log.event == 'Transfer' &&
          tx_log.contractAddress == CONTRACT_ADDR &&
          tx_data.to == RECIVE_WALLET &&
          tx_data.from == buyer &&
          tx_data.amount == total_fee &&
          status == 'success'
        ) {
          console.log('tx', tx_log.data)
        }
        resolve(true)
      } else {
        reject(false)
      }
    })
  })
}

async function execBuyEvent(data) {
  const tx = await sequelize.transaction()
  try {
    get_logger().info('监听到Buy事件', data)
    let { address, propsId, amount } = data
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    // 第一步找到是谁
    const uid = walletInfo.dataValues.uid
    const usesInfo = await Model.User.findByPk(uid)

    // 第二步找到该道具
    const propsInfo = await Model.Props.findOne({
      where: {
        id: propsId
      }
    })
    if (propsInfo === null) {
      get_logger().error('未找到该道具ID', data)
      return
    }

    const ffp = await utils.usdt_ffp(propsInfo.dataValues.usdt)
    const num = Math.round(amount / ffp)
    const props_data = {
      uid: uid,
      props_id: propsInfo.dataValues.id,
      props_name: propsInfo.dataValues.name,
      props_type: propsInfo.dataValues.type,
      props_price: amount,
      props_amount: num,
      props_tod: propsInfo.dataValues.tod,
      order_id: utils.generateOrderNumber(uid) + '_' + amount
    }
    const [propsRecordInfo, created] = await Model.PropsRecord.findOrCreate({
      where: { uid: uid, props_id: propsInfo.dataValues.id, source: 'buy' },
      defaults: props_data
    })
    if (!created) {
      await Model.PropsRecord.increment({ props_amount: num }, { where: { id: propsRecordInfo.dataValues.id }, transaction: tx })
    }

    // 喂食物refund到上一个喂食物的人pts
    const prev_feed_uid = (await cache.get(PREV_FEED_UID)) || 1000
    await cache.set(PREV_FEED_UID, uid)
    const preUserInfo = await Model.User.findByPk(prev_feed_uid)
    if (preUserInfo) {
      await Model.User.increment(
        { pts: amount },
        { where: { id: prev_feed_uid }, transaction: tx }
      )
      // 记录返回给上一用户pts
      let event_data = {
        uid: prev_feed_uid,
        type: 'refound',
        text: `${preUserInfo.nick_name} received ${amount} pts rewards`,
        amount: amount,
      }
      await Model.Event.create(event_data, { transaction: tx })
    }

    await Model.User.increment(
      { props_total_fee: amount },
      { where: { id: uid }, transaction: tx }
    )

    // 记录购买事件
    event_data = {
      uid: uid,
      type: 'buy',
      text: `${usesInfo.nick_name} purchased ${propsInfo.dataValues.name} * ${num}; cost ${amount} FFPs`,
      amount: amount,
    }
    await Model.Event.create(event_data, { transaction: tx })

    // 更新邀请人可以得到的奖励
    const reward_pid_coins = utils.formatNumTen(amount * system_config().commission_rate)
    if (usesInfo.invite_id) {
      const superiorInfo = await Model.User.findByPk(usesInfo.invite_id)
      if (superiorInfo) {
        const invite_coins = superiorInfo.invite_reward_coins * 1 + reward_pid_coins * 1
        const coins = superiorInfo.coins * 1 + reward_pid_coins * 1
        await Model.User.update(
          { invite_reward_coins: invite_coins, coins: coins },
          { where: { id: usesInfo.invite_id }, transaction: tx }
        )
        // 记录邀请奖励
        event_data = {
          uid: usesInfo.invite_id,
          type: 'invite_reward',
          text: `${superiorInfo.nick_name} received ${reward_pid_coins} FFPs invitation reward`,
          amount: reward_pid_coins,
        }
        await Model.Event.create(event_data, { transaction: tx })
      }
    }
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行Buy事件失败', error)
    get_logger().error('参数', data)
  }
}

async function execTransferNftEvent(data) {
  const tx = await sequelize.transaction()

  try {
    get_logger().info('监听到NFT转帐事件', data)
    let { address, sender, tokenId } = data
    if (sender != '0x0000000000000000000000000000000000000000') {
      return
    }
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    // 第一步找到是谁
    const uid = walletInfo.dataValues.uid
    const usesInfo = await Model.User.findByPk(uid)

    // 由于claim和Transfer都会进到该函数需要做一下区分
    const petInfo = await Model.Pet.findOne({
      where: {
        wallet: address
      }
    })
    if (petInfo) {
      const img = utils.tokenIdToGif(tokenId)

      await Model.Pet.update({
        claim_nft_id: tokenId,
        img: img,
      }, {
        where: {
          wallet: address
        },
        transaction: tx
      })
      // 记录认领记录
      const event_data = {
        uid: uid,
        type: 'claim',
        text: `${usesInfo.nick_name} Claim a pet #${tokenId}`,
        amount: 0
      }
      await Model.Event.create(event_data, { transaction: tx })
    } else {
      // const randomNumber = Math.floor(Math.random() * (18 - 2 + 1)) + 2
      // const img = `${randomNumber}_0.gif`
      const img = utils.tokenIdToGif(tokenId)
      await Model.Pet.create({
        claim_nft_id: tokenId,
        img: img,
        exp: 0,
        wallet: address,
        tod: utils.get_current_time(),
        name: 'egg_' + Math.round(Math.random() * 100000000),
        uid: uid
      }, {
        transaction: tx
      })
      const event_data = {
        uid: uid,
        type: 'transfer_nft',
        text: `${usesInfo.nick_name} Received a pet #${tokenId}`,
      }
      await Model.Event.create(event_data, { transaction: tx })
    }

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行监听TransferNft失败', error)
    get_logger().error('参数', data)
  }
}

async function execClaimEvent(data) {
  const tx = await sequelize.transaction()

  try {
    get_logger().info('监听到Claim事件', data)
    let { address, tokenId } = data
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    // 第一步找到是谁
    const uid = walletInfo.dataValues.uid
    const usesInfo = await Model.User.findByPk(uid)

    let petInfo = await Model.Pet.findOne({
      where: {
        wallet: address
      }
    })
    if (!petInfo) {
      petInfo = await Model.Pet.findOne({
        where: {
          claim_nft_id: 0
        }
      })
    }

    await Model.Pet.update({
      claim_nft_id: tokenId
    }, {
      where: {
        wallet: address
      },
      transaction: tx
    })
    // 记录认领记录
    const event_data = {
      uid: uid,
      type: 'claim',
      text: `${usesInfo.nick_name} Claim a pet #${tokenId}`,
    }
    await Model.Event.create(event_data, { transaction: tx })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行监听Claim失败', error)
    get_logger().error('参数', data)
  }
}



async function execExchangeEvent(data) {
  const tx = await sequelize.transaction()
  try {
    let { address, amount } = data
    amount = ethers.utils.formatEther(amount)
    data.amount = amount
    get_logger().info('监听到Exchange事件', data)
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    const usesInfo = await Model.User.findByPk(walletInfo.uid)

    await Model.User.update(
      { pts: 0 },
      { where: { id: walletInfo.uid }, transaction: tx }
    )
    // exchange记录
    const event_data = {
      uid: usesInfo.id,
      type: 'exchange',
      text: `${usesInfo.nick_name} exchanged ${amount} FFPs`,
      amount: amount,
    }
    await Model.Event.create(event_data, { transaction: tx })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行监听Exchange失败', error)
    get_logger().error('参数', data)
  }
}


async function execBuyTokeEvent(data) {
  const tx = await sequelize.transaction()
  try {
    let { address, amount, price } = data
    get_logger().info('监听到BuyToken事件', data)
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    const usesInfo = await Model.User.findByPk(walletInfo.uid)

    // buyToken记录
    const event_data = {
      uid: usesInfo.id,
      type: 'buy_token',
      text: `${usesInfo.nick_name} buy ${amount} FFPs, cost ${price} ETH`,
      amount: price,
    }
    await Model.Event.create(event_data, { transaction: tx })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行监听buyToken失败', error)
    get_logger().error('参数', data)
  }
}


async function execClaimRewardEvent(data) {
  const tx = await sequelize.transaction()
  try {
    let { address, amount } = data
    amount = ethers.utils.formatEther(amount)
    data.amount = amount
    get_logger().info('监听到ClaimReward事件', data)
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    const usesInfo = await Model.User.findByPk(walletInfo.uid)

    await Model.User.update(
      { invite_reward_coins: Math.max(0, usesInfo.invite_reward_coins - amount) },
      { where: { id: walletInfo.uid }, transaction: tx }
    )
    // claim_reward记录
    const event_data = {
      uid: usesInfo.id,
      type: 'claim FFP',
      text: `${usesInfo.nick_name} claimed ${amount} FFPs`,
      amount: amount
    }
    await Model.Event.create(event_data, { transaction: tx })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行监听ClaimRewards失败', error)
    get_logger().error('参数', data)
  }
}

async function execFPetExpFeedEvent(data) {
  const tx = await sequelize.transaction()
  try {
    const { address, tokenId, propsId } = data
    get_logger().info('监听到PetExpFeed事件', data)
    const walletInfo = await Model.Wallet.findOne({
      where: {
        address: address
      }
    })
    if (walletInfo === null) {
      get_logger().error('address不存在wallet中', data)
      return
    }
    const usesInfo = await Model.User.findByPk(walletInfo.uid)
    const petInfo = await Model.Pet.findOne({
      where: {
        claim_nft_id: tokenId,
        uid: walletInfo.uid
      }
    })
    const propsInfo = await Model.Props.findByPk(propsId)
    const props_record = await Model.PropsRecord.findOne({
      where: {
        props_id: propsId,
        uid: usesInfo.id,
        props_amount: {
          [Op.gt]: 0
        }
      }
    })
    const props_amount = props_record.dataValues.props_amount - 1
    await Model.PropsRecord.update(
      { props_amount: props_amount },
      { where: { id: props_record.dataValues.id }, transaction: tx }
    )
    let propsFfpAmount = await utils.usdt_ffp(propsInfo.usdt)
    // 如果食物不是购买得来的，则金额为0
    if (props_record.source != 'buy') {
      propsFfpAmount = 0
    }
    let exp = utils.formatNumTen(petInfo.dataValues.exp * 1 + propsInfo.exp * 1, 3)
    // 如果食物不是购买得来的，则经验值只增加50%
    // if (props_record.source != 'buy') {
    //   exp = exp * 0.5
    // }
    const tod = petInfo.dataValues.tod > utils.get_current_time() ? petInfo.dataValues.tod * 1 + propsInfo.tod * 1 : utils.get_current_time() + propsInfo.dataValues.tod * 1
    // 如果是第一次喂则birthday现在
    const birthday = petInfo.dataValues.exp * 1 > 0 ? petInfo.dataValues.birthday || Date.now() : Date.now()
    const expList = await Model.ExpList.findAll()
    const img = utils.expToNftImg(petInfo.dataValues.img, exp, expList, tokenId)
    await Model.Pet.update(
      { exp: exp, tod: tod, birthday: birthday, img: img },
      { where: { id: petInfo.dataValues.id }, transaction: tx }
    )

    // Feed Pet记录
    event_data = {
      uid: usesInfo.id,
      type: 'Feed Pet',
      text: `${usesInfo.nick_name} fed a ${propsInfo.name} to pet #${tokenId}`,
      amount: propsFfpAmount
    }
    await Model.Event.create(event_data, { transaction: tx })

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    get_logger().error('执行监听PetExpFeed失败', error)
    get_logger().error('参数', data)
  }
}


async function listenContractEvent() {
  const FfpApiGateContract = new ethers.Contract(BaseConfig.FfpApiGateWayAddress, abiConfig.FfpApiGateWayAbi, provider)
  const FfpSettleContract = new ethers.Contract(BaseConfig.FfpSettleAddress, abiConfig.FfpSettleAbi, provider)
  const FfpTokenScaleContract = new ethers.Contract(BaseConfig.FfpTokenSaleAddress, abiConfig.FfpTokenSaleAbi, provider)
  const FfpNftContract = new ethers.Contract(BaseConfig.FfpetNftAddress, abiConfig.FfpNftAbi, provider)

  // 宠物认领事件和transfer一致的
  // FfpApiGateContract.on('FPetClaim', (walletAddress, nftAddress, bigId) => {
  //   const tokenId = bigId.toString()
  //   const data = { address: walletAddress, tokenId }
  //   execClaimEvent(data)
  // })

  // 食物购买事件
  FfpSettleContract.on('Buy', (senderAddress, toAddress, propsId, bigAmount) => {
    const data = { address: senderAddress, propsId: propsId.toString(), amount: ethers.utils.formatEther(`${bigAmount}`) }
    execBuyEvent(data)
  })

  // 喂经验
  FfpApiGateContract.on('FPetExpFeet', (walletAddress, nftAddress, bigTokenId, bigPropsId) => {
    const tokenId = bigTokenId.toString() * 1
    const propsId = bigPropsId.toString() * 1
    const data = {
      address: walletAddress,
      tokenId,
      propsId
    }
    execFPetExpFeedEvent(data)
  })
  // 积分兑换FFP
  FfpSettleContract.on('Exchange', (senderAddress, toAddress, amount) => {
    const data = { address: toAddress, amount: amount }
    execExchangeEvent(data)
  })
  // 领取FFP
  FfpSettleContract.on('ClaimReward', (senderAddress, toAddress, amount) => {
    const data = { address: toAddress, amount: amount }
    execClaimRewardEvent(data)
  })

  // 购买token
  FfpTokenScaleContract.on('TokenPurchase', (address, bigAmount, bigPrice) => {
    const data = { address: address, amount: ethers.utils.formatEther(bigAmount), price: ethers.utils.formatEther(bigPrice) }
    execBuyTokeEvent(data)
  })

  // NFT的转帐
  FfpNftContract.on('Transfer', (senderAddress, toAddress, bigTokenId) => {
    const data = { sender: senderAddress, address: toAddress, tokenId: bigTokenId.toString() }
    execTransferNftEvent(data)
  })
}


function FPetClaimEventHash() {
  // 定义事件签名
  const eventSignature = 'FPetClaim(address,address,uint256)'
  const eventHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(eventSignature)
  )
  console.log('claim hash:', eventHash)
  return eventHash
}

function buy_event_hash() {
  const eventSignature = 'Buy(address,address,uint256)'
  const eventHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(eventSignature)
  )
  console.log('Buy hash:', eventHash)
  return eventHash
}

function exchange_event_hash() {
  const eventSignature =
    'Exchange(address indexed sender, address indexed to , uint256 amount)'
  const eventHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(eventSignature)
  )
  console.log('Buy hash:', eventHash)
  return eventHash
}

function transfer_hash() {
  const eventSignature = 'Transfer(address,address,uint256)View Source'
  const eventHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(eventSignature)
  )
  console.log('transfer:', eventHash)
  return eventHash
}

async function nft(req, resp) {
  try {
    get_logger().info('请求nft数据:', req)
    const token_id = req.params.token_id
    const petInfo = await Model.Pet.findOne({
      where: {
        claim_nft_id: token_id
      }
    })
    if (!petInfo) {
      return resp.send({})
    } else {
      const data = {
        name: 'fpet nft',
        token_id: token_id,
        image: `https://static.forkfrenpet.com/images/c/${petInfo.dataValues.img}`,
        description: 'fpet nft address',
        ...petInfo.dataValues
      }
      return resp.send(data)
    }
  } catch (error) {
    get_logger().error('请求nft数据失败', error)
  }
}
// 每10分钟获取一次
async function getFfpAndEthPrice(req, resp) {
  try {
    const FfpTokenScaleContract = new ethers.Contract(BaseConfig.FfpTokenSaleAddress, abiConfig.FfpTokenSaleAbi, provider)
    let ffp_eth = await FfpTokenScaleContract.price()
    //得到1个FFP等于多少ETH
    ffp_eth = ethers.utils.formatEther(ffp_eth)
    let eth_price = 3000
    http.get('https://api-sepolia.etherscan.io/api?module=stats&action=ethprice&apikey=NM95XFCH1IENA14F2NTG6BHQBWG826Y4FY', (error, response) => {
      eth_price = response.body.result.ethusd
    })
    setTimeout(() => {
      Model.Config.update(
        { ffp_eth, eth_price },
        { where: { id: 1 } }
      )
    }, 3000);
    return successResp(resp, {}, '执行成功')
  } catch (error) {
    get_logger().error('获取价格失败', error)
    return errorResp(resp, 400, '')
  }
}

// 每天固定时间执行昨日排行奖励
async function distributeRewards(req, resp) {
  const tx = await sequelize.transaction()
  try {
    get_logger().info('开始执行排行奖励')
    const currentDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
    const month = currentDate.getMonth() + 1 // 月份从 0 开始，所以要加 1
    const day = currentDate.getDate()
    const year = currentDate.getFullYear()
    const today = `${year}-${month}-${day}`
    const systemConfig = await Model.Config.findByPk(1)
    // 需要埋点记录今日的总收益，将今日Feed总量作为总收益
    const response = await sequelize.query(`SELECT SUM(amount) AS total_amount FROM event WHERE DATE(createdAt) = '${today}' AND type = 'Feed Pet';`, {
      type: QueryTypes.SELECT
    });
    const total = response[0].total_amount * systemConfig.total
    if (total == 0) {
      get_logger().error(`${today}无收入`)
      return successResp(resp, {}, '昨日无收入')
    }
    const userList = await Model.User.findAll({
      order: [['pts', 'desc']],
      limit: 100,
      offset: 0,
      attributes: [
        'id',
        'pts',
        'nick_name'
      ]
    })
    for (let i = 0; i < userList.length; i++) {
      const rank = i + 1;
      const item = userList[i]
      let amount = 0
      let event_data = {
        uid: item.id,
        type: 'rank_reward',
        amount: amount,
        other_uid: 1,
        text: '',
      }
      
      if (rank == 1) {
        amount = utils.formatNumTen(total * systemConfig.first)
        event_data.text = `${item.nick_name} ranked ${rank}th(${today}) on the leaderBoard and received a reward of ${amount} FFPs`
      }
      if (rank == 2) {
        amount = utils.formatNumTen(total * systemConfig.second)
        event_data.text = `${item.nick_name} ranked ${rank}th(${today}) on the leaderBoard and received a reward of ${amount} FFPs`
      }
      if (rank == 3) {
        amount = utils.formatNumTen(total * systemConfig.third)
        event_data.text = `${item.nick_name} ranked ${rank}th(${today}) on the leaderBoard and received a reward of ${amount} FFPs`
      }
      if (rank > 3 && rank <= 10) {
        amount = utils.formatNumTen(total * systemConfig.four_ten)
        event_data.text = `${item.nick_name} ranked ${rank}th(${today}) on the leaderBoard and received a reward of ${amount} FFPs`
      }
      if (rank > 10 && rank <= 50) {
        amount = utils.formatNumTen(total * systemConfig.eleven_fifty)
        event_data.text = `${item.nick_name} ranked ${rank}th(${today}) on the leaderBoard and received a reward of ${amount} FFPs`
      }
      if (rank > 51 && rank <= 100) {
        amount = utils.formatNumTen(total * systemConfig.ff_hundred)
        event_data.text = `${item.nick_name} ranked ${rank}th(${today}) on the leaderBoard and received a reward of ${amount} FFPs`
      }
      await Model.Event.create(event_data, { transaction: tx })
      await Model.User.increment({ pts: amount }, { where: { id: item.id }, transaction: tx })
    }
    await tx.commit()
    return successResp(resp, {}, 'success')
  } catch (error) {
    await tx.rollback()
    get_logger().error(error)
    return errorResp(resp, 400, `${error}`)
  }
}
const accordingExpGetLevel = (levelList, exp) => {
  let cIndex = 0
  levelList.map((item, index) => {
    if (exp > item.exp) {
      cIndex = index
    }
  })
  return levelList[cIndex]
}

// 每过1个小时执行奖励，根据宠物存活时间
async function distributePts(req, resp) {
  const tx = await sequelize.transaction()
  try {
    const expList = await Model.ExpList.findAll()
    const currentTime = utils.get_current_time()
    const petList = await Model.Pet.findAll({
      where: {
        claim_nft_id: {
          [Op.not]: 0
        },
        exp: {
          [Op.gt]: expList[1].exp 
        },
        tod: {
          [Op.gt]: currentTime
        }
      }
    })
    petList.map(async (item, index) => {
      try {
        let lvPts = 1
        if (item.tod - currentTime < 3600) {
          lvPts = (item.tod - currentTime) / 3600
        }
        lvPts = utils.formatNumTen(accordingExpGetLevel(expList, item.exp).pts * lvPts)
        if (lvPts > 0) {
          const event_data = {
            uid: item.uid,
            type: 'pet_pts',
            text: `#${item.claim_nft_id} pet(lv${accordingExpGetLevel(expList, item.exp).lv}) produces ${lvPts} pts`,
            amount: lvPts,
          }
          await Model.Event.create(event_data, { transaction: tx })
          await Model.User.increment({
            pts: lvPts
          }, {
            where: {
              id: item.uid
            }, transaction: tx
          })
          await tx.commit()
        }
      } catch (error) {
        await tx.rollback()
      }
    })
    return successResp(resp, {}, '派发成功')
  } catch (error) {
    tx.rollback()
    get_logger().error('每小时派发PTS错误', error)
    return errorResp(resp, 400, `${error}`)
  }
}
// 执行监听
listenContractEvent()
module.exports = {
  query_chain_tx,
  nft,
  getFfpAndEthPrice,
  distributeRewards,
  distributePts
}
