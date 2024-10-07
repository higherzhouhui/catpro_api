var log4js = require('log4js')
const { errorResp, successResp } = require('./common')
const Model = require('./models')
const dataBase = require('./database')
const moment = require('moment/moment')
const { isLastDay, createToken } = require('./utils')
const cron = require('node-cron');

/**
 * post /api/user/login
 * @summary Log in
 * @tags user
 * @description Login interface
 * @param {Object}  request.body.required  -  id
 * @param {string}  id.request.body.id.required  -  id
 * @param {string}  hash.request.body.hash.required  -  hash
 * @param {string}  authDate.request.body.authDate.required  -  authDate
 * @param {string}  username.request.body.username.required  -  username
 * @security - Authorization
 */
async function login(req, resp) {
  user_logger().info('Initiate login', req.body)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      const data = req.body
      if (!data.username) {
        data.username = data.firstName + data.lastName
      }
      if (!(data.hash && data.id && data.username && data.authDate && data.wallet)) {
        user_logger().error('Login failed', 'Data format exception')
        return errorResp(resp,  400, `validate error`)
      }
      let user = await Model.User.findOne({
        where: {
          wallet: data.wallet
        }
      })
      // Find the current user; if they exist, return their data; if not, create a new one
      if (!user) {
        const info = await Model.Config.findOne()
        data.user_id = data.id
        // Initialize points
        data.score = info.invite_normalAccount_score
        data.ticket = info.ticket
        // If they are a member, add extra points
        if (data.isPremium) {
          data.score += info.invite_premiumAccount_score
          data.ticket += info.invite_premiumAccount_ticket
          data.telegram_premium = info.invite_premiumAccount_score
        }

        const event_data = {
          type: 'register',
          from_user: data.id,
          to_user: data.id,
          score: data.score,
          ticket: data.ticket,
          from_username: data.username,
          to_username: data.username,
          desc: `${data.username}  join us!`
        }
        await Model.Event.create(event_data)

        try {
          // Add points to the superior user
          if (data.startParam) {
            let isShareGame = data.startParam.includes('SHAREGAME')
            let inviteId;
            if (isShareGame) {
              const param = data.startParam.replace('SHAREGAME', '')
              inviteId = parseInt(atob(param))
            } else {
              inviteId = parseInt(atob(data.startParam))
            }
            if (!isNaN(inviteId)) {
              data.startParam = inviteId
              const parentUser = await Model.User.findOne({
                where: {
                  user_id: inviteId
                }
              })
              let increment_score = info.invite_normalAccount_score
              let increment_ticket = info.invite_normalAccount_ticket
              // If they are a member, they receive more points
              if (data.isPremium) {
                increment_score = info.invite_premiumAccount_score
                increment_ticket = info.invite_premiumAccount_ticket
              }

              if (parentUser) {
                if (isShareGame) {
                  const event_data = {
                    type: 'share_playGame',
                    from_user: data.id,
                    to_user: inviteId,
                    score: 50,
                    ticket: 0,
                    from_username: data.username,
                    to_username: parentUser.username,
                    desc: `${parentUser.username} invite ${data.username} play game!`
                  }
                  await Model.Event.create(event_data)
                }
                const event_data = {
                  type: 'Inviting',
                  from_user: data.id,
                  to_user: inviteId,
                  score: increment_score,
                  ticket: increment_ticket,
                  from_username: data.username,
                  to_username: parentUser.username,
                  desc: `${parentUser.username} invite ${data.username} join us!`
                }
                await Model.Event.create(event_data)
                // The order cannot be changed
                if (isShareGame) {
                  increment_score += 50
                }
                await parentUser.increment({
                  score: increment_score,
                  invite_friends_score: increment_score,
                  ticket: increment_ticket
                })
              }
            }
          }
        } catch (error) {
          user_logger().info('Failed to execute find parent element', error)
        }
        if (data.id) {
          delete data.id
        }
        user = await Model.User.create(data)
        const token = createToken(data)
        return successResp(resp, { ...user.dataValues, token }, 'success')
      } else {
        //Update user information
        const updateData = data.user
        await user.update({
          username: updateData.username,
          firstName: updateData.firstName,
          lastName: updateData.lastName,
        })
        const token = createToken(user.dataValues)
        return successResp(resp, {check_date: user.check_date, token, ...user.dataValues}, 'success')
      }
    })
  } catch (error) {
    user_logger().error('Login failed:', error)
    console.error(`Login failed:${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * post /api/user/h5PcLogin
 * @summary Log in
 * @tags user
 * @description Login interface
 * @param {string}  id.query.required  -  id
 * @param {string}  address.query.required  -  address
 * @param {string}  h5PcLogin.query.required  -  h5PcLogin
 * @security - Authorization
 */
async function h5PcLogin(req, resp) {
  user_logger().info('PCH5 Initiate login', req.body)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      const data = req.body
      if (!(data.wallet && data.wallet_nickName && data.username)) {
        user_logger().error('Login failed', 'Data format exception')
        return errorResp(resp,  400, `validate error`)
      }
      let user = await Model.User.findOne({
        where: {
          wallet: data.wallet
        }
      })
      // Find the current user; if they exist, return their data; if not, create a new one
      if (!user) {
        const info = await Model.Config.findOne()
        data.user_id = `${new Date().getTime()}`
        data.id = data.user_id
        // Initialize points
        data.score = info.invite_normalAccount_score
        data.ticket = info.ticket
       
        const event_data = {
          type: 'register',
          from_user: data.id,
          to_user: data.id,
          score: data.score,
          ticket: data.ticket,
          from_username: data.username,
          to_username: data.username,
          desc: `${data.username}  join us!`
        }
        await Model.Event.create(event_data)

        try {
          // Add points to the superior user
          if (data.startParam) {
            let isShareGame = data.startParam.includes('SHAREGAME')
            let inviteId;
            if (isShareGame) {
              const param = data.startParam.replace('SHAREGAME', '')
              inviteId = parseInt(atob(param))
            } else {
              inviteId = parseInt(atob(data.startParam))
            }
            if (!isNaN(inviteId)) {
              data.startParam = inviteId
              const parentUser = await Model.User.findOne({
                where: {
                  user_id: inviteId
                }
              })
              let increment_score = info.invite_normalAccount_score
              let increment_ticket = info.invite_normalAccount_ticket
             
              if (parentUser) {
                if (isShareGame) {
                  const event_data = {
                    type: 'share_playGame',
                    from_user: data.id,
                    to_user: inviteId,
                    score: 50,
                    ticket: 0,
                    from_username: data.username,
                    to_username: parentUser.username,
                    desc: `${parentUser.username} invite ${data.username} play game!`
                  }
                  await Model.Event.create(event_data)
                }
                const event_data = {
                  type: 'Inviting',
                  from_user: data.id,
                  to_user: inviteId,
                  score: increment_score,
                  ticket: increment_ticket,
                  from_username: data.username,
                  to_username: parentUser.username,
                  desc: `${parentUser.username} invite ${data.username} join us!`
                }
                await Model.Event.create(event_data)
                // The order cannot be changed
                if (isShareGame) {
                  increment_score += 50
                }
                await parentUser.increment({
                  score: increment_score,
                  invite_friends_score: increment_score,
                  ticket: increment_ticket
                })
              }
            }
          }
        } catch (error) {
          data.startParam = ''
          user_logger().info('Failed to execute find parent element', error)
        }
        if (data.id) {
          delete data.id
        }
        await Model.User.create(data)
        const token = createToken(data)
        return successResp(resp, { ...data, isTg: false, token }, 'success')
      } else {
        // await user.update(data.user)
        const token = createToken(user.dataValues)
        return successResp(resp, {token, ...user.dataValues}, 'success')
      }
    })
  } catch (error) {
    user_logger().error('Login failed', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}


/**
 * post /api/user/update
 * @summary Modify user information
 * @tags user
 * @description Modify user information
 * @security - Authorization
 */
async function updateInfo(req, resp) {
  user_logger().info('Modify user information', req.id)
  const tx = await dataBase.sequelize.transaction()
  try {
    await Model.User.update({
      is_Tg: false
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
    user_logger().error('Failed to modify user information', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * post /api/user/sign
 * @summary User check-in
 * @tags user
 * @description User check-in
 * @security - Authorization
 */
async function userCheck(req, resp) {
  user_logger().info('User check-in', req.id)
  try {
    await dataBase.sequelize.transaction(async (t) => {
      const user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      if (!user) {
        return errorResp(resp, 403, `not found`)
      }
      let day = 0
      let today = moment().utc().format('MM-DD')
      const checkInList = await Model.Event.findAll({
        where: {
          type: 'checkIn',
          from_user: req.id,
        },
        order: [['createdAt', 'desc']],
        attributes: ['createdAt']
      })
      const newCheckInList = checkInList.filter(item => {
        return moment(item.dataValues.createdAt).utc().format('MM-DD') != today
      })

      newCheckInList.map((item, index) => {
        if (isLastDay(new Date(item.dataValues.createdAt).getTime(), index + 1)) {
          day = (index + 1) % 7
        }
      })

      const allRewardList = await Model.CheckInReward.findAll({
        order: [['day', 'asc']],
        attributes: ['day', 'score', 'ticket']
      })
      let reward = allRewardList[0]
      try {
        reward = allRewardList[day]
      } catch(error) {
        user_logger().error('check day Error:', 'dayIndex:', day, `${error}`)
      }
      let check_score = user.check_score
      let score = user.score
      let ticket = user.ticket
      if (user.check_date != today) {
        check_score += reward.score
        score += reward.score
        ticket += reward.ticket
        await Model.User.update({
          check_date: today,
          check_score: check_score,
          score: score,
          ticket: ticket
        }, {
          where: {
            user_id: req.id
          },
        })

        let event_data = {
          type: 'checkIn',
          from_user: req.id,
          from_username: user.username,
          to_user: req.id,
          to_username: user.username,
          desc: `${user.username} is checked, day: ${reward.day}`,
          score: reward.score,
          ticket: reward.ticket,
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
            const score_ratio = Math.floor(reward.score * config.invite_friends_ratio / 100)
            await parentUser.increment({
              score: score_ratio,
              invite_friends_score: score_ratio
            })
            event_data = {
              type: 'checkIn_parent',
              from_user: req.id,
              from_username: user.username,
              to_user: parentUser.user_id,
              to_username: parentUser.username,
              score: score_ratio,
              ticket: 0,
              desc: `${parentUser.username} get checkIn reward ${score_ratio} $CAT from ${user.username}`
            }
            await Model.Event.create(event_data)
          }
        }
      }
      return successResp(resp, {
        check_date: today,
        check_score: check_score,
        score: score,
        reward_ticket: reward.ticket,
        ticket: ticket,
        day: reward.day,
        reward_score: reward.score
      }, 'success')
    }
    )
  } catch (error) {
    user_logger().error('User check-in failed', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * post /api/user/bindWallet
 * @summary User binds wallet
 * @tags user
 * @description User binds wallet
 * @security - Authorization
 */
async function bindWallet(req, resp) {
  user_logger().info('User binds wallet', req.id)
  const tx = await dataBase.sequelize.transaction()
  try {
    const user = await Model.User.findOne({
      where: {
        user_id: req.id
      }
    })
    if (!user) {
      return errorResp(resp, 403, `can't find this user`)
    }
    await Model.User.update({
      wallet: req.body.wallet,
      wallet_nickName: req.body.wallet_nickName
    }, {
      where: {
        user_id: req.id
      },
      transaction: tx
    })

    await tx.commit()
    return successResp(resp, { wallet: req.body.wallet, wallet_nickName: req.body.wallet_nickName }, 'success')
  } catch (error) {
    await tx.rollback()
    user_logger().error('User wallet binding failed', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/list
 * @summary Get user list
 * @tags user
 * @description Get user list
 * @param {string}  page.query.required  -  Pagination
 * @security - Authorization
 */
async function getUserList(req, resp) {
  user_logger().info('Get user list', req.id)
  try {
    const page = req.query.page
    // const total = await dataBase.sequelize.query(`SELECT SUM(score) as total FROM user`, {
    //   type: dataBase.QueryTypes.SELECT
    // })
    const list = await Model.User.findAndCountAll({
      order: [['score', 'desc'], ['createdAt', 'asc']],
      offset: (page - 1) * 20,
      limit: 20 * 1,
      attributes: ['username', 'score']
    })
    const userInfo = await Model.User.findOne({
      where: {
        user_id: req.id
      }
    })
    if (!userInfo) {
      return errorResp(resp, 403, 'not found this user')
    }

    const sql = `SELECT 
        user_id,
        score,
            (SELECT COUNT(*) + 1 FROM user WHERE score > u.score) AS ranking
        FROM 
            user u
        WHERE 
            user_id = ${req.id};`;
    const ranking = await dataBase.sequelize.query(sql, {
      type: dataBase.QueryTypes.SELECT
    })
    const same_score = await Model.User.findAll({
      order: [['createdAt', 'asc']],
      where: {
        score: {
          [dataBase.Op.eq]: userInfo.score
        }
      }
    })
    let rank = ranking[0].ranking
    same_score.forEach((item, index) => {
      if (item.dataValues.user_id == req.id) {
        rank += index
      }
    })
    return successResp(resp, { ...list, rank: rank }, 'success')
  } catch (error) {
    user_logger().error('Failed to retrieve user list', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * get /api/user/subTotal
 * @summary Get total members of the subordinate
 * @tags user
 * @description Get total members of the subordinate
 * @security - Authorization
 */
async function getSubUserTotal(req, resp) {
  user_logger().info('Get total members of the subordinate', req.id)
  try {
    const subUser = await Model.User.findAndCountAll({
      where: {
        startParam: req.id
      }
    })
   
    const user = await Model.User.findOne({
      where: {
        user_id: req.id
      }
    })
    if (!user) {
      return errorResp(resp, 403, `not found`)
    }
    let parentObj = {}
    if (user.startParam) {
      const parent = await Model.User.findOne({
        where: {
          user_id: user.startParam
        },
        attributes: ['username']
      })
      if (parent) {
        parentObj.username = parent.username
        if (!subUser.count) {
          const eventList = await Model.Event.findAll({
            order: [['createdAt', 'desc']],
            where: {
              from_user: req.id,
              to_user: user.startParam
            },
          })
          let totalScore = 0
          eventList.forEach(item => {
            totalScore += item.score
          })
          parentObj.totalScore = totalScore
          parentObj.list = eventList
        }
      }
    }
    
    return successResp(resp, { total: subUser.count, ...parentObj }, 'success')
  } catch (error) {
    user_logger().error('Failed to retrieve total members of the subordinate', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/subList
 * @summary Get subordinate user list
 * @tags user
 * @description Get subordinate user list
 * @param {string}  page.query.required  -  pagination
 * @security - Authorization
 */
async function getSubUserList(req, resp) {
  user_logger().info('Get subordinate user list', req.id)
  try {
    const page = req.query.page
    const list = await Model.Event.findAndCountAll({
      order: [['createdAt', 'desc']],
      attributes: ['from_username', 'score', 'createdAt', 'type'],
      offset: (page - 1) * 20,
      limit: 20 * 1,
      where: {
        from_user: {
          [dataBase.Op.not]: req.id
        },
        to_user: req.id,
        score: {
          [dataBase.Op.gt]: 0
        },
      }
    })
    return successResp(resp, { ...list }, 'success')
  } catch (error) {
    user_logger().error('Failed to retrieve subordinate user list', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/getMyScoreHistory
 * @summary Get my points record
 * @tags user
 * @description Get my points record
 * @param {string}  page.query.required  -  pagination
 * @security - Authorization
 */
async function getMyScoreHistory(req, resp) {
  user_logger().info('Get my points record.', req.id)
  try {
    const page = req.query.page
    const list = await Model.Event.findAndCountAll({
      order: [['createdAt', 'desc']],
      attributes: ['from_username', 'score', 'createdAt', 'type', 'ticket'],
      offset: (page - 1) * 20,
      limit: 20 * 1,
      where: {
        score: {
          [dataBase.Op.gt]: 0
        },
        to_user: req.id
        // [dataBase.Op.or]: [
        //   {
        //     from_user: req.id,
        //     to_user: 0,
        //   },
        //   {
        //     from_user: req.id,
        //     to_user: req.id,
        //   },
        //   {
        //     to_user: req.id,
        //   }
        // ],
        
      },
    })
    return successResp(resp, { ...list }, 'success')
  } catch (error) {
    user_logger().error('Failed to retrieve my points record', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * get /api/user/getInfo
 * @summary Get user information
 * @tags user
 * @description Get user information
 * @security - Authorization
 */
async function getUserInfo(req, resp) {
  user_logger().info('Get user information', req.id)
  try {
    const userInfo = await Model.User.findOne({
      where: {
        user_id: req.id
      },
    })
    if (!userInfo) {
      return errorResp(resp, 403, `not found this user`)
    }
    return successResp(resp, userInfo.dataValues, 'success')
  } catch (error) {
    user_logger().error('Failed to retrieve user information', error)
    console.error(`${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * get /api/user/createUser
 * @summary Generate user information
 * @tags user
 * @description Generate user information
 * @param {number}  delay.query  -  Delay time, which indicates how often to generate a piece of data (in ms)
 * @param {score}  score.query  -  Score
 * @param {id}  id.query  -  Superior IDs, separated by commas
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
  return successResp(resp, {}, 'Execution successful.')
}

/**
 * get /api/user/cancelCreateUser
 * @summary Cancel generating user information
 * @tags user
 * @description Cancel generating user information
 * @security - Authorization
 */

async function cancelCreateUserInfo(req, resp) {
  Object.keys(timer).map(key => {
    clearInterval(timer[key])
  })
  return successResp(resp, {}, 'Cancellation successful')
}


/**
 * get /api/user/getMagicPrize
 * @summary Get the mystery prize
 * @tags user
 * @description Get the mystery prize
 * @security - Authorization
 */

async function getMagicPrize(req, resp) {
  user_logger().info('Get the mystery prize', req.id)
  try {
    await dataBase.sequelizeAuto.transaction(async (t) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // Set today's start time
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1); // Set today's end time
      const isEvent = await Model.Event.findOne({
        where: {
          from_user: req.id,
          type: 'get_magicPrize',
          createdAt: {
            [dataBase.Op.gte]: todayStart,
            [dataBase.Op.lt]: todayEnd,
          }
        }
      })
      const user = await Model.User.findOne({
        where: {
          user_id: req.id
        }
      })
      if (user && !isEvent) {
        await user.increment({
          score: 2500
        })
        const event_data = {
          type: 'get_magicPrize',
          from_user: req.id,
          from_username: user.username,
          to_username: user.username,
          to_user: req.id,
          score: 2500,
          ticket: 0,
          desc: `${user.username} get magic prize`
        }
        await Model.Event.create(event_data) 
        return successResp(resp, {score: user.score + 2500}, 'success')
      } else {
        return errorResp(resp, 400, 'user had get')
      }
    })
  } catch (error) {
    user_logger().info('Failed to get the mystery prize', `${error}`)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * get /api/user/resetTicket
 * @summary Reset daily count
 * @tags user
 * @description Reset daily count
 * @security - Authorization
 */

async function resetTicketInfo(req, resp) {
  try {
    await dataBase.sequelizeAuto.transaction(async (t) => {
      await Model.User.update({
        ticket: 6
      }, {
        where: {}
      })
      return successResp(resp, {}, 'Reset successful')
    })
  } catch (error) {
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * get /api/user/startFarming
 * @summary Start planting
 * @tags user
 * @description Start planting
 * @security - Authorization
 */

async function startFarming(req, resp) {
  try {
    const id = req.id
    await dataBase.sequelizeAuto.transaction(async (t) => {
      const user = await Model.User.findOne({
        where: {
          user_id: id
        }
      })
      if (!user) {
        return errorResp(resp, 403, `not found`)
      }
      // If the current time is still within the end time range, restarting is not allowed
      if (user && user.dataValues.end_farm_time && new Date(user.dataValues.end_farm_time).getTime() > Date.now()) {
        return errorResp(resp, 400, 'Farming has not yet ended')
      }
      const last_farming_time = new Date()
      const end_farm_time = new Date(last_farming_time.getTime() + 3 * 60 * 60 * 1000)
      await Model.User.update(
        {
          end_farm_time: end_farm_time,
          last_farming_time: last_farming_time,
        },
        {
          where: {
            user_id: id
          }
        })
      const event_data = {
        type: 'start_farming',
        from_user: req.id,
        from_username: user.username,
        to_username: user.username,
        to_user: req.id,
        score: 0,
        ticket: 0,
        desc: `${user.username} start farming`
      }
      await Model.Event.create(event_data)
      return successResp(resp, {
        end_farm_time: end_farm_time,
        last_farming_time: last_farming_time
      }, 'Start farming')
    })
  } catch (error) {
    user_logger().error('Failed to start planting', error)
    return errorResp(resp, 400, `${error}`)
  }
}




/**
 * get /api/user/getRewardFarming
 * @summary Harvest the fruit
 * @tags user
 * @description Harvest the fruit
 * @security - Authorization
 */

async function getRewardFarming(req, resp) {
  try {
    const id = req.id
    await dataBase.sequelizeAuto.transaction(async (t) => {
      const user = await Model.User.findOne({
        where: {
          user_id: id
        }
      })
      if (!user) {
        return errorResp(resp, 403, `not found`)
      }
      const now = new Date()
      const last_farming_time = user.dataValues.last_farming_time || now
      const end_farm_time = user.dataValues.end_farm_time
      if (new Date(last_farming_time).getTime() > new Date(end_farm_time).getTime()) {
        return errorResp(resp, 400, 'Farming has not started yet')
      }
      let score = 0.1 * Math.floor(((Math.min(now.getTime(), new Date(end_farm_time).getTime()) - new Date(last_farming_time).getTime())) / 1000)
      score = score.toFixed(1) * 1
      await Model.User.update(
        {
          score: user.score + score,
          farm_score: user.farm_score + score,
          last_farming_time: now,
        },
        {
          where: {
            user_id: id
          }
        }
      )
      // If this farming session ends, execute the return to the superior
      if (user.startParam && now.getTime() > new Date(end_farm_time).getTime()) {
        const parentUser = await Model.User.findOne({
          where: {
            user_id: user.startParam
          }
        })
        if (parentUser) {
          const config = await Model.Config.findOne()
          const score_ratio = Math.floor(1080 * config.invite_friends_ratio / 100)
          await parentUser.increment({
            score: score_ratio,
            invite_friends_farm_score: score_ratio
          })
          event_data = {
            type: 'harvest_farming_parent',
            from_user: req.id,
            from_username: user.username,
            to_user: parentUser.user_id,
            to_username: parentUser.username,
            score: score_ratio,
            ticket: 0,
            desc: `${parentUser.username} get farming harvest ${score_ratio} $CAT from ${user.username}`
          }
          await Model.Event.create(event_data)
        }
      }
      // Record the harvest
      if (now.getTime() > new Date(end_farm_time).getTime()) {
        event_data = {
          type: 'harvest_farming',
          from_user: req.id,
          from_username: user.username,
          to_username: user.username,
          to_user: req.id,
          score: 1080,
          ticket: 0,
          desc: `${user.username} get farming harvest 1080 $CAT`
        }
        await Model.Event.create(event_data)
      }

      return successResp(resp, {
        score: user.score + score,
        farm_score: user.farm_score + score,
        last_farming_time: now,
        farm_reward_score: score
      }, 'Farming harvest')
    })
  } catch (error) {
    user_logger().error('Failed to receive the fruit', error)
    return errorResp(resp, 400, `${error}`)
  }
}


async function resetTicketInfoInner() {
  try {
    await dataBase.sequelizeAuto.transaction(async (t) => {
      const config = await Model.Config.findOne()
      await Model.User.update({
        ticket: config.ticket
      }, {
        where: {}
      })
      user_logger().log(`Reset successful`)
    })
  } catch (error) {
    user_logger.error(`Reset failed：${error}`)
  }
}
// Execute the task every day at 08:00 AM, specified timezone Asia/Chongqing
cron.schedule('0 8 * * *', () => {
  user_logger().log(`Start resetting the Ticket`)
  resetTicketInfoInner()
}, {
  scheduled: true,
  timezone: 'Asia/Chongqing'
});

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
      user_logger().info('Virtual user created successfully：', data)
    })
  } catch (error) {
    user_logger().error('Failed to create virtual user：', error)
  }
}

// Configure log output
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
  cancelCreateUserInfo,
  resetTicketInfo,
  startFarming,
  getRewardFarming,
  getSubUserTotal,
  getMagicPrize,
  getMyScoreHistory,
  h5PcLogin,
  resetTicketInfoInner
}