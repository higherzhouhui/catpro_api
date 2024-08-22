var log4js = require('log4js')
const { errorResp, successResp } = require('./common')
const Model = require('./models')
const utils = require('./utils')
const dataBase = require('./database')

/**
 * get /api/game/begin
 * @summary 开始游戏
 * @tags game
 * @description 开始游戏接口
 * @security - Authorization
 */
async function begin(req, resp) {
  game_logger().info('开始玩游戏')
  try {
    await dataBase.sequelize.transaction(async (t) => {
      let user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      // 找到当前用户，如果存在则返回其数据，如果不存在则新创建
      if (user) {
        let ticket = user.dataValues.ticket

        if (ticket == 0) {
          return errorResp(resp, 400, `次数不足`)
        }
        await user.decrement({
          ticket: 1
        })

        const event_data = {
          type: 'play_game',
          from_user: req.id,
          from_username: user.username,
          to_user: user.username,
          to_username: user.username,
          score: 0,
          ticket: -1,
          desc: `${user.username} begin play game`
        }
        await Model.Event.create(event_data)

        return successResp(resp, { ticket: ticket - 1 }, 'success')
      } else {
        return errorResp(resp, 400, '未找到该用户')
      }
    })
  } catch (error) {
    game_logger().error('开始玩游戏失败', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * post /api/game/end
 * @summary 结算游戏
 * @tags game
 * @description 结算游戏接口
 * @security - Authorization
 */
async function end(req, resp) {
  game_logger().info('结算游戏', req.id)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      let user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      // 找到当前用户，如果存在则返回其数据，如果不存在则新创建
      if (user) {
        const score = req.body.score
        
        await user.increment({
          score: score,
          game_score: score
        })
       
        let event_data = {
          type: 'play_game_reward',
          from_user: req.id,
          from_username: user.username,
          score: score,
          to_user: user.username,
          to_username: user.username,
          ticket: 0,
          desc: `${user.username} play game GET ${score} $CAT`
        }
        await Model.Event.create(event_data)
        if (user.startParam) {
          const parentUser = await Model.User.findOne({
            where: {
              user_id: user.startParam
            }
          })
          if (parentUser) {
            const config = await Model.Config.findOne()
            const score_ratio = Math.floor(score * config.invite_friends_ratio  / 100)
            await parentUser.increment({
              score: score_ratio,
              invite_friends_game_score: score_ratio
            })
            let event_data = {
              type: 'play_game_reward_parent',
              from_user: req.id,
              from_username: user.username,
              to_user: parentUser.user_id,
              to_username: parentUser.username,
              score: score_ratio,
              ticket: 0,
              desc: `${parentUser.username} get game reward ${score_ratio} $CAT from ${user.username}`
            }
            await Model.Event.create(event_data)
          }
        }
        return successResp(resp, { score: user.score + score, game_score: user.game_score + score }, 'success')
      } else {
        return errorResp(resp, 400, '未找到该用户')
      }
    })
  } catch (error) {
    game_logger().error('结算游戏失败', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

//----------------------------- private method --------------
// 配置日志输出
function game_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/game/game',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('game')
  return logger
}

module.exports = {
  begin,
  end,
}