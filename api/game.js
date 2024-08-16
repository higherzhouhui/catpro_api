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
    const result = await dataBase.sequelize.transaction(async (t) => {
      let user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      // 找到当前用户，如果存在则返回其数据，如果不存在则新创建
      if (user) {
        const config = await Model.Config.findOne()

        if (user.score - config.play_game < 0) {
           return errorResp(resp, 400, `积分不足`)
        }
        await user.decrement({
          score: config.play_game,
          game_score: config.play_game
        })
        const event_data = {
          type: 'play_game',
          from_user: req.id,
          from_username: user.username,
          score: 0 - config.play_game,
          desc: `${user.username} play game COST ${config.play_game}积分`
        }
        await Model.Event.create(event_data)

        return successResp(resp, {score: user.score - config.play_game}, 'success')
      } else {
        return errorResp(resp, 400, '未找到该用户')
      }
    })
  } catch (error) {
    game_logger().error('登录失败', error)
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
  game_logger().info('结算游戏关卡', req.body)
  try {
    const result = await dataBase.sequelize.transaction(async (t) => {
      let user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      // 找到当前用户，如果存在则返回其数据，如果不存在则新创建
      if (user) {
        const config = await Model.Config.findOne()
        const score = config.one_found_game * req.body.found
        await user.increment({
          score: score,
          game_score: score
        })
        if (user.game_max_score < score) {
          await user.update({
            game_max_score: score
          })
        }
        const event_data = {
          type: 'play_game_reward',
          from_user: req.id,
          from_username: user.username,
          score: score,
          desc: `${user.username} play game GET ${score}积分`
        }
        await Model.Event.create(event_data)

        return successResp(resp, {score: user.score + score, game_max_score: score > user.game_max_score ? score : user.game_max_score}, 'success')
      } else {
        return errorResp(resp, 400, '未找到该用户')
      }
    })
  } catch (error) {
    game_logger().error('登录失败', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}


/**
 * post /api/user/update
 * @summary 修改用户信息
 * @tags user
 * @description 修改用户信息
 * @security - Authorization
 */
async function updateInfo(req, resp) {
  game_logger().info('修改用户信息', req.id)
  const tx = await dataBase.sequelize.transaction()
  try {
    await Model.User.update({
      is_New: false
    }, {
      where: {
        user_id: req.id
      },
      transaction: tx
    })
    await tx.commit()
    return successResp(resp, {}, 'success')
  } catch (error) {
    await tx.rollback()
    game_logger().error('修改用户信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/list
 * @summary 获取用户列表
 * @tags user
 * @description 获取用户列表
 * @param {string}  page.query.required  -  分页
 * @security - Authorization
 */
async function getUserList(req, resp) {
  game_logger().info('获取用户列表', req.id)
  try {
    const page = req.query.page
    // const total = await dataBase.sequelize.query(`SELECT SUM(score) as total FROM user`, {
    //   type: dataBase.QueryTypes.SELECT
    // })
    const list = await Model.User.findAndCountAll({
      order: [['score', 'desc']],
      offset: (page - 1) * 20,
      limit: 20 * 1,
      attributes: ['username', 'score']
    })
    const sql = `SELECT 
        user_id,
        score,
            (SELECT COUNT(*) + 1 FROM user WHERE score > u.score) AS ranking
        FROM 
            user u
        WHERE 
            user_id = ${req.id};`;
    const rank = await dataBase.sequelize.query(sql, {
      type: dataBase.QueryTypes.SELECT
    })

    return successResp(resp, { ...list, rank: rank[0].ranking }, 'success')
  } catch (error) {
    game_logger().error('获取用户列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/subList
 * @summary 获取下级用户列表
 * @tags user
 * @description 获取下级用户列表
 * @param {string}  page.query.required  -  分页
 * @security - Authorization
 */
async function getSubUserList(req, resp) {
  game_logger().info('获取下级用户列表', req.id)
  try {
    const page = req.query.page
    const list = await Model.Event.findAndCountAll({
      order: [['createdAt', 'desc']],
      attributes: ['from_username', 'score'],
      offset: (page - 1) * 20,
      limit: 20 * 1,
      where: {
        type: 'register',
        to_user: req.id,
      }
    })
    return successResp(resp, { ...list }, 'success')
  } catch (error) {
    game_logger().error('获取下级用户列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/getInfo
 * @summary 获取用户信息
 * @tags user
 * @description 获取用户信息
 * @security - Authorization
 */
async function getUserInfo(req, resp) {
  game_logger().info('获取下级用户列表', req.id)
  try {
    const userInfo = await Model.User.findOne({
      where: {
        user_id: req.id
      },
      attributes: ['score', 'telegram_premium', 'invite_friends_score', 'game_score', 'game_max_score'],
    })
    return successResp(resp, { userInfo }, 'success')
  } catch (error) {
    game_logger().error('获取下级用户列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/createUser
 * @summary 生成用户信息
 * @tags user
 * @description 生成用户信息
 * @param {number}  delay.query  -  延时时间，即为每过多长时间生成一条数据（单位ms）
 * @param {score}  score.query  -  分数
 * @security - Authorization
 */
let timer = {

}
let index = 0
async function createUserInfo(req, resp) {
  const query = req.query
  index += 1
  timer[`index${index}`] = setInterval(() => {
    try {
      autoCreateUser(query.score || 0)
    } catch {

    }
  }, query.delay || 500);
  return successResp(resp, {}, '执行成功')
}

/**
 * get /api/user/cancelCreateUser
 * @summary 取消生成用户信息
 * @tags user
 * @description 取消生成用户信息
 * @security - Authorization
 */

async function cancelCreateUserInfo(req, resp) {
  Object.keys(timer).map(key => {
    clearInterval(timer[key])
  })
  return successResp(resp, {}, '取消成功')
}


//----------------------------- private method --------------
async function autoCreateUser(score) {
  try {
    const result = await dataBase.sequelizeAuto.transaction(async (t) => {
      const data = {
        auth_date: '2024-05-28T19:00:46.000Z',
        hash: 'system create',
        is_really: false,
      };
      const nameList = ['a', 'b', 'c', 'dc', 'mack', 'magic', 'james',
        'clo', 'The', 'Guy', 'P', 'Le', 'Kobe', 'Johns', 'hak', 'r',
        's', 't', 'CC', 'E', 'FF', 'z', 'MN', 'M', 'QT', 'Li', 'Kk', 'YE',
        'Mc', 'XB', 'IcO', 'QMN', 'd', 'e', 'f', 'j', 'k', 'l', 'm', 'n', 'o',
        'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ba', 'bc', 'bb',
        'bd', 'be', 'bf', 'bj', 'bh', 'bi', 'bk', 'bl', 'bm', 'bn', 'bu', 'bq',
        'dc', 'dj', 'dk', 'dl', 'dm', 'dn', 'dw', 'du', 'dv', 'cj', 'cq', 'bj']
      const inviteList = [6086431490, 5771251263, 6348858602]
      const info = await Model.Config.findOne()
      data.username = `${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}`
      data.startParam = inviteList[Math.floor(Math.random() * 3)]
      data.user_id = `${new Date().getTime()}`
      data.score = Math.floor(score * Math.random()) || Math.floor(Math.random() * 30 * info.one_year_add + info.not_one_year)
      const invite_score = Math.floor(Math.random() * 2 * info.invite_add)
      await Model.User.create(data)

      const parentUser = await Model.User.findOne({
        where: {
          user_id: data.startParam
        }
      })

      if (parentUser) {
        await parentUser.increment({
          score: invite_score,
          invite_friends_score: invite_score
        })
      }
      const event = {
        type: 'register',
        from_user: data.user_id,
        from_username: data.username,
        to_user: data.startParam,
        to_username: `${data.startParam}`,
        is_really: false,
        score: invite_score
      }

      await Model.Event.create(event)
      game_logger().info('创建虚拟用户成功：', data)
    })
  } catch (error) {
    game_logger().error('创建虚拟用户失败：', error)
  }
}

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
  updateInfo,
  getUserList,
  getSubUserList,
  getUserInfo,
  createUserInfo,
  cancelCreateUserInfo
}