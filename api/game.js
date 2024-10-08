var log4js = require('log4js')
const { errorResp, successResp } = require('./common')
const Model = require('./models')
const dataBase = require('./database')

/**
 * get /api/game/begin
 * @summary Start the game
 * @tags game
 * @description Start game interface
 * @security - Authorization
 */
async function begin(req, resp) {
  game_logger().info('Start playing the game')
  try {
    await dataBase.sequelize.transaction(async (t) => {
      let user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      if (!user) {
        return errorResp(resp, 403, `not found`)
      }
      if (user) {
        let ticket = user.dataValues.ticket

        if (ticket <= 0) {
          return errorResp(resp, 400, `Insufficient number of games played`)
        }
        await user.decrement({
          ticket: 1
        })

        const event_data = {
          type: 'play_game',
          from_user: req.id,
          from_username: user.username,
          to_user: req.id,
          to_username: user.username,
          score: 0,
          ticket: -1,
          desc: `${user.username} begin play game`
        }
        await Model.Event.create(event_data)

        return successResp(resp, { ticket: ticket - 1 }, 'success')
      } else {
        return errorResp(resp, 403, 'The user was not found')
      }
    })
  } catch (error) {
    game_logger().error('Failed to start playing the game', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * post /api/game/end
 * @summary Settle the game
 * @tags game
 * @description Settle game interface
 * @security - Authorization
 */
async function end(req, resp) {
  game_logger().info('Settle game', req.id)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      let user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      if (!user) {
        return errorResp(resp, 403, `not found`)
      }
      const config = await Model.Config.findOne()
      
      // Anti-cheat score verification
      const start_date = await Model.Event.findOne({
        order: [['createdAt', 'desc']],
        where: {
          type: 'play_game',
          from_user: req.id,
          to_user: req.id
        },
        attributes: ['createdAt']
      })
      const end_date = await Model.Event.findOne({
        order: [['createdAt', 'desc']],
        where: {
          type: 'play_game_reward',
          from_user: req.id,
          to_user: req.id
        },
        attributes: ['createdAt']
      })
      if (start_date && end_date) {
        const start_time = new Date(start_date.dataValues.createdAt).getTime()
        const end_time = new Date(end_date.dataValues.createdAt).getTime()
  
        if (start_time - end_time < 0 || req.body.score > 10000) {
          return errorResp(resp, 400, 'Data abnormality!')
        }
      }

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
          to_user: req.id,
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
        return errorResp(resp, 400, 'User not found')
      }
    })
  } catch (error) {
    game_logger().error('Failed to settle the game', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

//----------------------------- private method --------------
// Configure log output
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