const { successResp, errorResp } = require('./common')
const { CheckInReward } = require('./models')

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
  try {
    checkInReward_logger().info(`用户:${req.username}要获取道具列表`)
    const list = await CheckInReward.findAll({
      order: [['day', 'asc']],
    })
    return successResp(resp, list)
  } catch(error) {
    return errorResp(resp, 400, `${error}`)
  }
}


module.exports = {
  list,
}

