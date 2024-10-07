const { successResp, errorResp } = require('./common')
const { CheckInReward } = require('./models')

// Configure log output
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
 * @summary Check-in reward list
 * @tags checkInReward
 * @description Reward list interface
 * @security - Authorization
 */
async function list(req, resp) {
  try {
    checkInReward_logger().info(`User:${req.username}Need to retrieve the item list`)
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

