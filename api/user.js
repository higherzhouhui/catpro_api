var log4js = require('log4js')
const { errorResp, successResp } = require('./common')
const Model = require('./models')
const utils = require('./utils')
const dataBase = require('./database')

/**
 * post /api/user/login
 * @summary 登录
 * @tags user
 * @description 登录接口
 * @param {string}  id.query.required  -  id
 * @param {string}  hash.query.required  -  hash
 * @param {string}  authDate.query.required  -  authDate
 * @param {string}  username.query.required  -  username
 * @security - Authorization
 */
async function login(req, resp) {
  user_logger().info('发起登录', req.body)
  try {
    const result = await dataBase.sequelize.transaction(async (t) => {
      const data = req.body
      if (!(data.hash && data.id && data.username && data.authDate)) {
        await tx.rollback()
        user_logger().error('登录失败', '格式不对')
        return errorResp(resp, `validate error`)
      }
      let user = await Model.User.findOne({
        where: {
          user_id: data.id
        }
      })
      // 找到当前用户，如果存在则返回其数据，如果不存在则新创建
      if (!user) {
        const info = await Model.Config.findOne()
        data.user_id = data.id
        // 要根据使用年限递增
        const { year, percent } = utils.accordingIdGetTime(data.user_id)
        data.year = year
        data.percent = percent
        // 一年以内
        data.account_age_score = info.not_one_year + info.one_year_add * year
        data.score = data.account_age_score
        if (data.isPremium) {
          data.telegram_premium = info.huiYuan_add
          data.score += data.telegram_premium
        }
        try {
          if (data.startParam) {
            const inviteId = atob(data.startParam) * 1
            if (!isNaN(inviteId)) {
              data.startParam = inviteId
              const parentUser = await Model.User.findOne({
                where: {
                  user_id: inviteId
                }
              })
              const pList = await Model.Event.findAndCountAll({
                where: {
                  to_user: inviteId,
                  type: 'register'
                }
              })
              let increment_score = info.invite_add
              // 每邀请三个奖励暴击

              if (pList.count && pList.count % 3 == 0) {
                increment_score = Math.floor(info.invite_add * (info.every_three_ratio + Math.random()))
              }
              if (parentUser) {
                await parentUser.increment({ score: increment_score, invite_friends_score: increment_score })
                const event_data = {
                  type: 'register',
                  from_user: data.id,
                  to_user: inviteId,
                  score: increment_score,
                  from_username: data.username,
                  to_username: parentUser.username,
                }
                await Model.Event.create(event_data)
              }
            }
          }
        } catch (error) {
          user_logger().info('执行找父元素失败', error)
        }
        if (data.id) {
          delete data.id
        }

        await Model.User.create(data)
        return successResp(resp, { ...data, is_New: true }, 'success')
      } else {
        return successResp(resp, user, 'success')
      }
    })
  } catch (error) {
    user_logger().error('登录失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
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
  user_logger().info('修改用户信息', req.id)
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
    user_logger().error('修改用户信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * post /api/user/sign
 * @summary 用户签到
 * @tags user
 * @description 用户签到
 * @security - Authorization
 */
async function userCheck(req, resp) {
  user_logger().info('用户信息', req.id)
  const tx = await dataBase.sequelize.transaction()
  try {
    const user = await Model.User.findOne({
      where: {
        user_id: req.id
      }
    })
    if (!user) {
      return errorResp(resp, `未找到该用户`)
    }
    await Model.User.update({
      check_date: Date.now(),
      check_score: user.check_score + 3600,
      score: user.score + 3600
    }, {
      where: {
        user_id: req.id
      },
      transaction: tx
    })
  
    const event_data = {
      type: 'sign',
      from_user: req.id,
      from_username: user.username,
      to_user: req.id,
      to_username: user.username,
      desc: `${user.username} is check in`,
      score: 3600
    }
    await Model.Event.create(event_data, {transaction: tx})
    await tx.commit()
    return successResp(resp, {check_date: new Date(), check_score: user.check_score + 3600, score: user.score + 3600}, 'success')
  } catch (error) {
    await tx.rollback()
    user_logger().error('用户签到失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * post /api/user/bindWallet
 * @summary 用户绑定钱包
 * @tags user
 * @description 用户绑定钱包
 * @security - Authorization
 */
async function bindWallet(req, resp) {
  user_logger().info('用户信息', req.id)
  const tx = await dataBase.sequelize.transaction()
  try {
    const user = await Model.User.findOne({
      where: {
        user_id: req.id
      }
    })

    await Model.User.update({
      wallet: req.body.wallet,
      bind_wallet_score: 9000,
      score: user.score + (user.wallet ? 0 : 9000)
    }, {
      where: {
        user_id: req.id
      },
      transaction: tx
    })
    if (!user.wallet) {
      const event_data = {
        type: 'wallet',
        from_user: req.id,
        from_username: user.username,
        to_user: req.id,
        to_username: user.username,
        desc: `${user.username} is bind wallet`,
        score: 9000
      }
      await Model.Event.create(event_data, {transaction: tx})
    }
    await tx.commit()
    return successResp(resp, {wallet: req.body.wallet, bind_wallet_score: 9000, score: user.score + (user.wallet ? 0 : 9000)}, 'success')
  } catch (error) {
    await tx.rollback()
    user_logger().error('用户绑定钱包失败', error)
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
  user_logger().info('获取用户列表', req.id)
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
    user_logger().error('获取用户列表失败', error)
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
  user_logger().info('获取下级用户列表', req.id)
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
    user_logger().error('获取下级用户列表失败', error)
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
  user_logger().info('获取下级用户列表', req.id)
  try {
    const userInfo = await Model.User.findOne({
      where: {
        user_id: req.id
      },
      attributes: ['score', 'telegram_premium', 'invite_friends_score', 'game_score', 'game_max_score'],
    })
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // 设置今天的开始时间
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1); // 设置今天的结束时间

    const playGameEvent = await Model.Event.findAndCountAll({
      where: {
        createdAt: {
          [dataBase.Op.gte]: todayStart,
          [dataBase.Op.lt]: todayEnd,
        },
        from_user: req.id,
        type: 'play_game'
      },
    })
    return successResp(resp, { userInfo: { ...userInfo.dataValues, playGameTimes: 5 - playGameEvent.count} }, 'success')
  } catch (error) {
    user_logger().error('获取下级用户列表失败', error)
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
 * @param {id}  id.query  -  上级id，用逗号分隔
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
      autoCreateUser(query)
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
async function autoCreateUser(query) {
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
      const list = query.id ? query.id.split(',') : ''
      const inviteList = list || [6086431490, 5771251263, 6348858602]
      const info = await Model.Config.findOne()
      data.username = `${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}${nameList[Math.floor(Math.random() * 73)]}`
      data.startParam = inviteList[Math.floor(Math.random() * inviteList.length)]
      data.user_id = `${new Date().getTime()}`
      data.score = Math.floor(query.score * Math.random()) || Math.floor(Math.random() * 30 * info.one_year_add + info.not_one_year)
      const invite_score = Math.floor(Math.random() * info.invite_add + info.invite_add)
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
      user_logger().info('创建虚拟用户成功：', data)
    })
  } catch (error) {
    user_logger().error('创建虚拟用户失败：', error)
  }
}

// 配置日志输出
function user_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/user/user',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('user')
  return logger
}

module.exports = {
  login,
  updateInfo,
  userCheck,
  getUserList,
  bindWallet,
  getSubUserList,
  getUserInfo,
  createUserInfo,
  cancelCreateUserInfo
}