const { successResp, errorResp } = require('./common')
const { Props, User, Config } = require('./models')
const { BaseConfig } = require('./constants')
const ethers = require('ethers')
const utils = require('./utils')
const { sequelize, QueryTypes } = require('./database')
require('dotenv').config({ path: '../.env' })
const provider = new ethers.providers.JsonRpcProvider(BaseConfig.rpcUr1l)
const abiConfig = require('../common/abi')

// 配置日志输出
var log4js = require('log4js')
const { exchange_ffp_sig } = require('./eip712')
const { CURVE_A } = require('./constants')

function props_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/props/p',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('props')
  return logger
}

/**
 * 2.获取道具列表
 * @param {*} req
 * @param {*} resp
 */
async function list(req, resp) {
  const uid = req.uid
  props_logger().info(`用户:${uid}要获取道具列表`)

  // 需要根据道具类型查询数量
  const props_sql = `SELECT p.id,p.name,p.price,p.usdt,SUM(pr.props_amount) AS amount,uid FROM props p LEFT JOIN props_record pr ON pr.props_id=p.id AND pr.uid=${uid} AND pr.client_id = 0 WHERE  p.visible =1  GROUP BY p.id`
  let list = await sequelize.query(props_sql, {
    type: QueryTypes.SELECT
  })
  for (item of list) {
    item['price'] = item['usdt'] * 10
  }
  successResp(resp, list)
}

/**
 * 3.获取单个道具的信息
 * @param {*} req
 * @param {*} resp
 */
async function info(req, resp) {
  const id = req.query.id
  if (!id) {
    return errorResp(resp, 400, 'no id')
  }
  props_logger().info(`用户:${req.uid},查询道具:${id}的信息`)

  let props = await Props.findByPk(id)
  if (!props) {
    return errorResp(resp, 400, 'no props')
  }

  props.dataValues.ffp = await utils.usdt_ffp(props.usdt)
  return successResp(resp, props)
}

/**
 * 使用pts 兑换ffp
 * @param {*} req
 * @param {*} resp
 */
async function pts2ffp(req, resp) {
  try {
    const uid = req.uid
    props_logger().info(`${uid}要兑换ffp`)
    let tip_message = ''
    //校验wallet
    const wallet = req.body.wallet
    const nonce = new Date().getTime() + Math.round(Math.random() * 100000000)
    // 校验参数
    const pts = parseInt(req.body.pts)
    if (!pts || pts < 1) {
      tip_message = 'Insufficient balance'
      props_logger().error(tip_message)
      return errorResp(resp, 400, tip_message)
    }
  
    // 查询用户pts额度
    const user = await User.findByPk(uid)
    console.log('u:', user.pts)
    const user_pts = parseFloat(user.pts).toFixed(2) || 0
    const user_ffp = parseInt(user.ffp) || 0
    props_logger().info('用户pts:-ffp', user_pts, user_ffp)
    if (user_pts < pts) {
      tip_message = 'Insufficient balance'
      props_logger().error(tip_message)
      return errorResp(resp, 400, tip_message)
    }
  
    // 计算能兑换ffp的数量
    const ffp = await get_ffp_pts(pts)
    const signature = await exchange_ffp_sig(nonce,ffp, wallet)
    const result = {
      nonce: nonce,
      pts: pts,
      ffp: ffp,
      wallet: wallet,
      signature: signature,
    }
    return successResp(resp, result)
  } catch (error) {
    return errorResp(resp, 400, `${error}`)
  }
  
}

// ************************** Private Method ************************
/** 根据pts计算出ffp的数量 */
async function get_ffp_pts(pts) {
  let ffp = 0
  const systemConfig = await Config.findByPk(1)
  try {
    let rate = 0.1
    if (pts < 100) {
      rate = 0.15
    } else if (pts >= 100 && pts < 500) {
      rate = 0.12
    } else if (pts >= 500 && pts < 1000) {
      rate = 0.1
    } else if (pts >= 1000) {
      rate = 0.08
    }
    ffp = pts * rate * (1 - systemConfig.claim_reward_rate)
  } catch (error) {
    console.error(error)
  }
  return Math.round(ffp)
}

// ************************** Admin Method Api ************************
module.exports = {
  list,
  info,
  pts2ffp
}

