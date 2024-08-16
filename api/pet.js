const { successResp, errorResp, paramErrorResp } = require('./common')
const {
  PET_NFT_CONTRACT,
  CURVE_A,
  BaseConfig,
} = require('./constants')
const { sequelize, QueryTypes } = require('./database')
const { Pet, User, Config } = require('./models')

// 配置日志输出
var log4js = require('log4js')
const { get_current_time } = require('./utils')
const { pet_feed_sig, claim_pet_sig } = require('./eip712')

function pet_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/pet/p',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true,
      },
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' },
    },
  })
  var logger = log4js.getLogger('pet')
  return logger
}

/**
 * 1.宠物铸造
 * @param {*} req
 * @param {*} resp
 */
async function mint(req, resp) {
  pet_logger().info('pet_mint_request')
  const uid = req.uid

  // 判断用户是否有min权限
  const user = await User.findByPk(uid)
  if (!user) {
    return errorResp(resp, 400, '暂无经用户信息')
  }
  pet_logger().info(
    `用户信息:目前已经宠物数:${user.pets}, 最大可允许的mint次数:${user.mint_total_amount}`
  )
  if (user.pets >= user.mint_total_amount) {
    return errorResp(resp, 400, '达到最大允许的mint次数')
  }
  const randomNumber = Math.floor(Math.random() * (18 - 2 + 1)) + 2
  const img = `${randomNumber}_0.gif`

  // 组装一宠物信息
  const pet = {
    name: 'egg_' + Math.round(Math.random() * 100000000),
    level: 0,
    uid: uid,
    tod: get_current_time(),
    status: 0,
    img: img,
  }
  pet_logger().info('要铸造的宠物数据:', pet)
  const tx = await sequelize.transaction()
  try {
    // 铸造宠物
    await Pet.create(pet, { transaction: tx })

    // 增加用户的宠物铸造次数
    await User.increment({ pets: 1 }, { where: { id: uid }, transaction: tx })
    await tx.commit()
  } catch (error) {
    await tx.rollback()
    pet_logger().error('铸造铸造失败:', error)
    return errorResp(resp)
  }
  return successResp(resp, {}, '宠物铸造成功')
}

/**
 * 2.宠物列表
 * @param {*} req
 * @param {*} resp
 */
async function list(req, resp) {
  let uid = req.uid
  if (req.query.id && req.query.id > 0) {
    uid = req.query.id
  }
  pet_logger().info('pet_list:', uid, req.query)
  let where = { uid: uid }

  const page_number = parseInt(req.query.page_number || 1)
  const page_size = parseInt(req.query.page_size || 100)
  const list = await Pet.findAndCountAll({
    order: [['createdAt', 'desc']],
    limit: page_size,
    offset: (page_number - 1) * page_size,
    attributes: [
      'id',
      'name',
      'level',
      'tod',
      'status',
      'img',
      'wallet',
      'exp',
      'claim_nft_id',
      'birthday',
    ],
    where: where,
  })
  successResp(resp, list)
}

/**
 * 3.宠物详情
 * @param {*} req
 * @param {*} resp
 */
async function info(req, resp) {
  pet_logger().info('获取宠物信息')
  const pet_id = req.query.pet_id

  if (!pet_id && pet_id < 1) {
    return paramErrorResp
  }
  pet_logger().info(`用户:${req.uid}要查询的宠物id为:${pet_id}的信息:`)

  const pet = await sequelize.query(
    `select * from pet where id = ${pet_id} limit 1`,
    {
      type: QueryTypes.SELECT,
    }
  )
  pet_logger().info('宠物信息:', pet[0])
  if (!pet[0]) {
    return errorResp(resp, 400, '没有此宠物信息')
  }

  if (pet[0].uid != req.uid) {
    return errorResp(resp, 400, '只有宠物所有者才有权查看')
  }
  successResp(resp, pet)
}

async function getFeedSignature(req, resp) {
  const nonce = new Date().getTime() + Math.round(Math.random() * 100000000)
  try {
    const data = req.body
    const petInfo = await Pet.findOne({
      where: {
        claim_nft_id: data.pet_id,
        uid: req.uid
      }
    })
    if (!petInfo) {
      return errorResp(resp, 400, `${data.pet_id} not found`) 
    }
    const calcHour = (count) => {
      let c = count * 1
      if (isNaN(c)) {
        return 0
      } else {
        c = c / 3600
      }
      return Math.round(c)
    }
    const systemConfig = await Config.findByPk(1)
    const tod = petInfo.dataValues.tod
    if (tod - (new Date().getTime() / 1000) > systemConfig.pet_feed_time) {
      return errorResp(resp, 400, `Feeding time is not yet up, feeding can only be done within ${calcHour(systemConfig.pet_feed_time)} hours`) 
    }
    let inc = true
    const result = {
      nft_address: BaseConfig.FfpetNftAddress,
      wallet: data.wallet,
      propsId: data.props_id,
      petId: data.pet_id,
      exp: data.exp,
      nonce: nonce,
      inc: inc,
      a: CURVE_A,
    }
    const signature = await pet_feed_sig(result)
    result.signature = signature
    return successResp(resp, result)
  } catch (error) {
    return errorResp(resp, 400, `${error}`)
  }
}

function get_food_pts_exp(food_id) {
  return {
    pts: 15,
    exp: 20,
    tod: 100,
  }
}

/**
 * 将宠物上链
 * @param {*} resp
 * @param {*} resp
 */
async function claim(req, resp) {
  try {
    const data = req.body
    const uid = req.uid
    const pet_id = data.pet_id
    pet_logger().info(`1.1/6.用户(${uid})要将宠物上链`, data)

    let tip_message = ''
    //校验钱包信息
    const wallet = data.wallet
    if (!wallet) {
      return errorResp(resp, 400, '缺少对应的钱包地址')
    }

    const pet = await Pet.findByPk(pet_id)
    if (!pet) {
      return errorResp(resp, 400, '没有对应的宠物信息')
    }

    pet_logger().info(`1.2/6.要上链的宠物信息`, pet.dataValues)
    if (pet.uid != uid) {
      return errorResp(resp, 400, '只有宠物所有者才有权上链')
    }

    if (pet.signature || pet.claim_pet_id) {
      tip_message = '已经claim过'
      pet_logger().error(tip_message)
      return errorResp(resp, 400, tip_message)
    }

    const tx = await sequelize.transaction()
    try {
      await Pet.update(
        { wallet: wallet },
        { where: { id: pet_id }, transaction: tx }
      )
      await tx.commit()
      pet_logger().info(`6/6.宠物上链成功`)
    } catch (error) {
      await tx.rollback()
      pet_logger().error('宠物上链失败', error)
      return errorResp(resp, 400, '宠物上链失败')
    }

    const signature = await claim_pet_sig(wallet)
    // 返回上链信息
    const reuslt = {
      pet_nft: PET_NFT_CONTRACT,
      wallet: wallet,
      signature: signature,
    }

    return successResp(resp, reuslt)
  } catch (error) {
    pet_logger().error('宠物上链失败', error)
  }
}

module.exports = {
  mint,
  list,
  info,
  claim,
  getFeedSignature,
}
