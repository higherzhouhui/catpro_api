const { successResp, errorResp } = require('./common')
const { CheckInReward } = require('./models')
const utils = require('./utils')
const { sequelize, QueryTypes } = require('./database')

// 配置日志输出
var log4js = require('log4js')

function checkInReward_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/checkInReward/p',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('checkInReward')
  return logger
}

/**
 * post /api/checkInReward/list
 * @summary 签到奖励列表
 * @tags checkInReward
 * @description 奖励列表接口
 * @security - Authorization
 */
async function list(req, resp) {
  const uid = req.uid
  checkInReward_logger().info(`用户:${uid}要获取道具列表`)
  const list = await CheckInReward.findAll({
    order: [['day', 'asc']],
  })
  return successResp(resp, list)
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
  checkInReward_logger().info(`用户:${req.uid},查询道具:${id}的信息`)

  let checkInReward = await checkInReward.findByPk(id)
  if (!checkInReward) {
    return errorResp(resp, 400, 'no checkInReward')
  }

  checkInReward.dataValues.ffp = await utils.usdt_ffp(checkInReward.usdt)
  return successResp(resp, checkInReward)
}


// ************************** Private Method ************************

// ************************** Admin Method Api ************************
module.exports = {
  list,
  info,
}

