const { successResp, errorResp } = require('./common')
const Model = require('./models')
const dataBase = require('./database')

/**
 * post /api/task/list
 * @summary Get tasks and completion status
 * @tags checkInReward
 * @description Get tasks and completion status
 * @security - Authorization
 */

async function list(req, resp) {
  try {
    const id = req.id
    task_logger().info(`User:${id}Get tasks and completion status`)

    const sql = `SELECT t.*, ut.status FROM taskList t LEFT JOIN UserTask ut ON t.id = ut.task_id AND ut.user_id=${id} ORDER BY t.id`
    let list = await dataBase.sequelize.query(sql, { type: dataBase.QueryTypes.SELECT })

    return successResp(resp, list, 'success')
  } catch (error) {
    task_logger().error(`Failed to retrieve task status：${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}


/**
 * post /api/task/handle
 * @summary Go complete the task
 * @tags handle
 * @description Go complete the task
 * @security - Authorization
 */

async function handle(req, resp) {
  try {
    await dataBase.sequelize.transaction(async (t) => {
      const id = req.id
      task_logger().info(`User:${id}Go complete the task,${JSON.stringify(req.body)}`)
      const body = req.body
      const user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      if (!user) {
        return errorResp(resp, 400, 'User not found')
      }
      const [taskItem, created] = await Model.UserTask.findOrCreate({
        where: {
          user_id: id,
          task_id: body.id
        },
        defaults: {
          task_id: body.id,
          user_id: req.id,
          status: 'Claim'
        }
      })
      if (!created) {
        // The wallet needs to execute check logic
        if (body.link == '/wallet') {
          if (!user.dataValues.wallet) {
            return errorResp(resp, 400, `Please Connect Wallet!`)
          }
        }
        taskItem.dataValues.status = 'Done'
        await Model.UserTask.update(
          {
            status: 'Done'
          },
          {
            where: {
              user_id: id,
              task_id: body.id
            }
          }
        )
        await user.increment({
          score: body.score,
          task_score: body.score
        })
        const event_data = {
          type: `${body.type}`,
          from_user: req.id,
          from_username: user.dataValues.username,
          score: body.score,
          to_user: req.id,
          to_username: user.dataValues.username,
          desc: `${user.dataValues.username} complete ${body.name} task and get ${body.score} $CAT`
        }
        await Model.Event.create(event_data)
      }
      return successResp(resp, taskItem, 'success')
    })
  } catch (error) {
    task_logger().error(`Go complete the task：${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}



// ************************** Private Method ************************
// Configure log output
var log4js = require('log4js')
const { where } = require('sequelize')

function task_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/task/task',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('task')
  return logger
}


// ************************** Task Method Api ************************
module.exports = {
  list,
  handle
}

