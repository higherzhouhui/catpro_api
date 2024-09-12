var log4js = require('log4js')
const { errorResp, successResp } = require('./common')
const Model = require('./models')
const utils = require('./utils')
const dataBase = require('./database')
const moment = require('moment')
async function example(req, resp) {
  manager_logger().info('本次迁移成功:')
  try {

  } catch (error) {
    manager_logger().info('本次迁移失败:', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 登录
 */
async function login(req, resp) {
  manager_logger().info('发起登录')
  try {
    const data = req.body
    const userInfo = await Model.Manager.findOne({
      where: {
        account: data.username
      }
    })
    if (!userInfo) {
      return errorResp(resp, 400, `该账号不存在！`)
    }
    if (userInfo.dataValues.password == data.password) {
      let token = new Date().getTime() + 15 * 24 * 60 * 60 * 1000
      await Model.Manager.update(
        { token: token },
        { where: { id: userInfo.id } }
      )
      token = utils.createToken({username: userInfo.dataValues.account, user_id: token})
      return successResp(resp, { ...userInfo.dataValues, token }, '登录成功！')
    } else {
      return errorResp(resp, 400, `密码错误！`)
    }
  } catch (error) {
    manager_logger().info('登录失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}
/**
 * 
 * 获取个人信息
 */
async function userInfo(req, resp) {
  manager_logger().info('查询个人信息')
  try {
    const token = req.id
    const userInfo = await Model.Manager.findOne({
      where: {
        token: token
      }
    })
    if (!userInfo) {
      return errorResp(resp, 400, `登录过期！`)
    }
    return successResp(resp, userInfo.dataValues, '登录成功！')
  } catch (error) {
    manager_logger().info('查询个人信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 查看会员列表
 */
async function getUserList(req, resp) {
  manager_logger().info('查看会员列表')
  try {
    const data = req.query
    let where = {}
    if (data.username) {
      where.username = {
        [dataBase.Op.like]: `%${data.username}%`
      }
    }
    if (data.user_id) {
      where.user_id = {
        [dataBase.Op.like]: `%${data.user_id}%`
      }
    }

    if (data.startParam) {
      where.startParam = {
        [dataBase.Op.like]: `%${data.startParam}%`
      }
    }

    if (data.wallet) {
      where.wallet = {
        [dataBase.Op.like]: `%${data.wallet}%`
      }
    }

    if (data.is_really) {
      where.is_really = data.is_really == 'true' ? true : false
    }

    if (data.is_check) {
      let flag = data.is_check == 'true' ? true : false
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // 设置今天的开始时间
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1); // 设置今天的结束时间
      if (flag) {
        where.check_date = moment().utc().format('MM-DD')
      } else {
        where = {
          ...where,
          check_date: {
            [dataBase.Op.ne]: moment().utc().format('MM-DD')
          }
        }
      }
    }
    const list = await Model.User.findAndCountAll({
      order: [['createdAt', 'desc']],
      where,
      offset: (data.pageNum - 1) * data.pageSize,
      limit: data.pageSize * 1,
    })
    const total = await Model.User.count()
    const total_really = await Model.User.count({
      where: {
        is_really: true
      }
    })
    return successResp(resp, { ...list, total, total_really }, '登录成功！')
  } catch (error) {
    manager_logger().info('查看会员列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 查看下级会员列表
 */
async function getUserInviteList(req, resp) {
  manager_logger().info('查看首页信息')
  try {
    const data = req.query
    const where = {}
    if (data.id) {
      where.invite_id = data.id
    }
    const list = await Model.User.findAndCountAll({
      order: [['createdAt', 'desc']],
      where,
    })
    const total = await Model.User.count()
    return successResp(resp, { ...list, total }, '成功！')
  } catch (error) {
    manager_logger().info('查看首页信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 查看首页信息
 */
async function getHomeInfo(req, resp) {
  manager_logger().info('查看首页信息')
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // 设置今天的开始时间
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1); // 设置今天的结束时间

    const totalUser = await Model.User.count()
    const totalScore = await Model.User.sum('score')
    const totalFarmScore = await Model.User.sum('farm_score')
    const totalGameScore = await Model.User.sum('game_score')
    const totalHuiYuan = await Model.User.count({
      where: {
        isPremium: true
      }
    })
    const todayRegister = await Model.User.count({
      where: {
        createdAt: {
          [dataBase.Op.gt]: todayStart,
          [dataBase.Op.lt]: todayEnd
        }
      }
    })

    const todayScore = await Model.Event.findAll({
      attributes: [
        'createdAt',
        [dataBase.sequelize.literal('SUM(score)'), 'totalScore']
      ],
      where: {
        createdAt: {
          [dataBase.Op.gt]: todayStart,
          [dataBase.Op.lt]: todayEnd
        }
      }
    })

    const todayGameScore = await Model.Event.findAll({
      attributes: [
        'createdAt',
        [dataBase.sequelize.literal('SUM(score)'), 'totalScore']
      ],
      where: {
        createdAt: {
          [dataBase.Op.gt]: todayStart,
          [dataBase.Op.lt]: todayEnd
        },
        type: ['play_game_reward', 'play_game_reward_parent']
      }
    })

    const todayCheckIn = await Model.User.count({
      where: {
        check_date: moment().format('MM-DD')
      }
    })
    // 获取n天前的日期
    const startDate = new Date()
    startDate.setHours(23, 59, 59, 0); // 设置今天的结束时间


    const getList = async (day, table, type) => {
      const list = [];
      for (let i = day - 1; i >= 0; i--) {
        const endDate = new Date(todayStart);
        endDate.setDate(endDate.getDate() - i);
        endDate.setHours(0, 0, 0, 0)
        list.push({
          date: moment(endDate).format('YYYY-MM-DD'),
          num: 0
        })
      }
      let sql = ''
      if (table == 'user') {
        sql = `
        SELECT DATE(createdAt) as date, COUNT(*) as num from user WHERE createdAt >= :endDate AND createdAt <= :startDate GROUP BY date;`;
      } else {
        sql = `
         SELECT DATE(createdAt) as date, sum(score) as num from ${table} WHERE createdAt >= :endDate AND createdAt <= :startDate ${type ? `AND type='${type}'` : ''} GROUP BY date;`;
      }
      const startDate = new Date()
      const endDate = new Date(todayStart);
      endDate.setDate(endDate.getDate() - req.query.day);

      const listResult = await dataBase.sequelize.query(sql, {
        type: dataBase.QueryTypes.SELECT,
        replacements: { startDate, endDate },
      });

      list.map((item, index) => {
        listResult.forEach(rItem => {
          if (item.date == rItem.date) {
            list[index].num = rItem.num
          }
        })
      })
      return list
    }



    const userList = await getList(req.query.day, 'user', '');
    const farmList = await getList(req.query.day, 'event', 'harvest_farming');
    const gameList = await getList(req.query.day, 'event', 'play_game_reward');
    const scoreList = await getList(req.query.day, 'event', '');

    let resData = {
      totalScore,
      totalUser,
      totalFarmScore,
      totalGameScore,
      totalHuiYuan,
      todayRegister,
      todayCheckIn,
      todayScore: todayScore[0].dataValues.totalScore,
      todayGameScore: todayGameScore[0].dataValues.totalScore,
      userList,
      scoreList,
      farmList,
      gameList,
    }

    function handleNumber(obj) {
      const resData = obj
      Object.keys(resData).forEach(key => {
        if (!isNaN(resData[key])) {
          resData[key] = Math.round(resData[key])
        }
      })
      return resData
    }

    resData = handleNumber(resData)

    return successResp(resp, resData, 'success')

  } catch (error) {
    manager_logger().info('查看首页信息', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 查看管理员列表
 */
async function getAdminList(req, resp) {
  manager_logger().info('查看管理员列表')
  try {
    const data = req.query
    const where = {}
    if (data.id) {
      where.invite_id = data.id
    }
    const list = await Model.Manager.findAndCountAll({
      order: [['createdAt', 'desc']],
      where,
    })
    const total = await Model.Manager.count()
    return successResp(resp, { ...list, total }, '成功！')
  } catch (error) {
    manager_logger().info('查看管理员列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 查看道具列表
 */
async function getPropsList(req, resp) {
  manager_logger().info('查看道具列表')
  try {
    const data = req.query
    const where = {}
    if (data.name) {
      where.name = {
        [dataBase.Op.like]: `%${data.name}%`
      }
    }
    if (data.visible == 1) {
      where.visible = 1
    }
    if (data.visible == 0) {
      where.visible = 0
    }
    const list = await Model.Props.findAndCountAll({
      order: [['createdAt', 'desc']],
      where,
      offset: (data.pageNum - 1) * data.pageSize,
      limit: data.pageSize * 1,
    })
    list.rows.map(async (item, index) => {
      item.price = await utils.usdt_ffp(item.usdt)
    })
    setTimeout(() => {
      return successResp(resp, { ...list }, '成功！')
    }, 100);
  } catch (error) {
    manager_logger().info('查看道具列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 查看事件
 */
async function getEventList(req, resp) {
  manager_logger().info('查看事件')
  try {
    const data = req.query
    const where = {}
    if (data.from_user) {
      where.from_user = data.from_user
    }
    if (data.type) {
      where.type = data.type
    }
    if (data.from_username) {
      where.from_username = {
        [dataBase.Op.like]: `%${data.from_username}%`
      }
    }
    if (data.to_user) {
      where.to_user = data.to_user
    }
    if (data.to_username) {
      where.to_username = {
        [dataBase.Op.like]: `%${data.to_username}%`
      }
    }
    if (data.is_really) {
      where.is_really = data.is_really == 'true' ? true : false
    }

    const list = await Model.Event.findAndCountAll({
      order: [['createdAt', 'desc']],
      where,
      offset: (data.pageNum - 1) * data.pageSize,
      limit: data.pageSize * 1,
    })

    const total = await Model.Event.count()
    return successResp(resp, { ...list, total }, '成功！')
  } catch (error) {
    manager_logger().info('查看事件失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 查看系统配置
 */
async function getConfigInfo(req, resp) {
  manager_logger().info('查看系统配置')
  try {
    const info = await Model.Config.findOne()
    return successResp(resp, info.dataValues, '成功！')
  } catch (error) {
    manager_logger().info('查看系统配置失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 查看任务列表
 */
async function getTaskList(req, resp) {
  manager_logger().info('查看任务列表')
  try {
    const list = await Model.TaskList.findAndCountAll({})
    return successResp(resp, list, 'success')
  } catch (error) {
    manager_logger().info('查看任务列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}



/**
 * 
 * 查看钱包列表
 */
async function getWalletList(req, resp) {
  manager_logger().info('查看钱包列表')
  try {
    const data = req.query
    let sql = ''

    if (data.nick_name) {
      sql += `WHERE nick_name LIKE '%${data.nick_name}%'`
    }

    if (data.address) {
      if (sql) {
        sql += 'AND '
      } else {
        sql += 'WHERE '
      }
      sql += ` address='${data.address}'`
    }

    if (data.type) {
      if (sql) {
        sql += 'AND '
      } else {
        sql += 'WHERE '
      }
      sql += ` type='${data.type}'`
    }

    const limit = `LIMIT ${data.pageSize} OFFSET ${(data.pageNum - 1) * data.pageSize}`

    const sqlStr = `SELECT p.*, u.nick_name FROM wallet p JOIN user u ON p.uid = u.id ${sql} ORDER BY createdAt DESC ${limit};`
    const list = await dataBase.sequelize.query(sqlStr, { type: dataBase.QueryTypes.SELECT })

    const countStr = `SELECT COUNT(*) as count FROM wallet p JOIN user u ON p.uid = u.id ${sql};`
    const count = await dataBase.sequelize.query(countStr, { type: dataBase.QueryTypes.SELECT })

    const totalStr = `SELECT COUNT(*) as total FROM wallet p JOIN user u ON p.uid = u.id;`
    const total = await dataBase.sequelize.query(totalStr, { type: dataBase.QueryTypes.SELECT })

    return successResp(resp, { rows: list, total: total[0].total, count: count[0].count }, '成功！')
  } catch (error) {
    manager_logger().info('查看钱包列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 查看等级
 */
async function getExpList(req, resp) {
  manager_logger().info('查看等级')
  try {
    const data = req.query
    const where = {}
    if (data.lv) {
      where.lv = data.lv
    }

    const list = await Model.CheckInReward.findAndCountAll({
      order: [['day', 'asc']],
      where,
    })
    const total = await Model.CheckInReward.count()
    return successResp(resp, { ...list, total }, '成功！')
  } catch (error) {
    manager_logger().info('查看等级失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}
/**
 * 
 * 道具列表
 */
async function getPropsRecordList(req, resp) {
  manager_logger().info('道具列表')
  try {
    const data = req.query
    let sql = 'WHERE props_amount > 0 '

    if (data.nick_name) {
      sql += `AND nick_name LIKE '%${data.nick_name}%'`
    }

    if (data.address) {
      if (sql) {
        sql += 'AND '
      } else {
        sql += 'WHERE '
      }
      sql += ` address='${data.address}'`
    }

    if (data.source) {
      if (sql) {
        sql += 'AND '
      } else {
        sql += 'WHERE '
      }
      sql += ` source='${data.source}'`
    }

    if (data.props_id) {
      if (sql) {
        sql += 'AND '
      } else {
        sql += 'WHERE '
      }
      sql += ` props_id=${data.props_id}`
    }

    const limit = `LIMIT ${data.pageSize} OFFSET ${(data.pageNum - 1) * data.pageSize}`

    const sqlStr = `SELECT p.*, u.nick_name FROM props_record p JOIN user u ON p.uid = u.id ${sql} ORDER BY createdAt DESC ${limit};`
    const list = await dataBase.sequelize.query(sqlStr, { type: dataBase.QueryTypes.SELECT })

    const countStr = `SELECT COUNT(*) as count FROM props_record p JOIN user u ON p.uid = u.id ${sql};`
    const count = await dataBase.sequelize.query(countStr, { type: dataBase.QueryTypes.SELECT })

    const totalStr = `SELECT COUNT(*) as total FROM props_record p JOIN user u ON p.uid = u.id WHERE props_amount > 0;`
    const total = await dataBase.sequelize.query(totalStr, { type: dataBase.QueryTypes.SELECT })

    return successResp(resp, { rows: list, total: total[0].total, count: count[0].count }, '成功！')

  } catch (error) {
    manager_logger().info('道具列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 查看奖品列表
 */
async function getPrizeList(req, resp) {
  manager_logger().info('查看奖品列表')
  try {
    const data = req.query
    const where = {}
    if (data.lv) {
      where.lv = data.lv
    }

    const list = await Model.Prize.findAndCountAll({
      order: [['createdAt', 'desc']],
      where,
    })
    const total = await Model.Prize.count()
    return successResp(resp, { ...list, total }, '成功！')
  } catch (error) {
    manager_logger().info('查看奖品列表失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新会员信息
 */
async function updateUserInfo(req, resp) {
  manager_logger().info('更新会员信息')
  try {
    const data = req.body
    const oldUser = await Model.User.findByPk(data.id)
    await Model.User.update(
      { ...data },
      {
        where: {
          id: data.id
        }
      }
    )
    if (data.score !== oldUser.score) {
      await Model.Event.create({
        type: 'system_change',
        from_user: req.id,
        to_user: data.user_id,
        from_username: 'system',
        to_username: data.username,
        score: data.score - oldUser.score,
        desc: `系统操作score:${data.score - oldUser.score}`
      })
    }
    if (data.ticket !== oldUser.ticket) {
      await Model.Event.create({
        type: 'system_change',
        from_user: 0,
        to_user: data.user_id,
        from_username: 'system',
        to_username: data.username,
        ticket: data.ticket - oldUser.ticket,
        desc: `系统操作ticket:${data.ticket - oldUser.ticket}`
      })
    }
    if (data.startParam !== oldUser.startParam) {
      await Model.Event.create({
        type: 'system_change',
        from_user: 0,
        to_user: data.user_id,
        from_username: 'system',
        to_username: data.username,
        score: 0,
        desc: `系统操作:更改${data.username}的上级ID为${data.startParam}`
      })
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新会员信息', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新道具信息
 */
async function updatePropsInfo(req, resp) {
  manager_logger().info('更新道具信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.Props.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.Props.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新道具信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新事件
 */
async function updateEventInfo(req, resp) {
  manager_logger().info('更新事件信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.Event.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.Event.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新事件信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 更新事件
 */
async function updateConfigInfo(req, resp) {
  manager_logger().info('更新事件信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.Config.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.Config.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新事件信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新管理员信息
 */
async function updateAdminInfo(req, resp) {
  manager_logger().info('更新管理员信息信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.Manager.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.Manager.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新管理员信息信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新奖品
 */
async function updatePrizeInfo(req, resp) {
  manager_logger().info('更新奖品信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.Prize.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.Prize.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新奖品信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新等级
 */
async function updateExpList(req, resp) {
  manager_logger().info('更新等级信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.CheckInReward.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.CheckInReward.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新等级信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新用户道具列表
 */
async function updateUserPropsList(req, resp) {
  manager_logger().info('更新用户道具列表信息')
  try {
    let data = req.body

    if (data.id) {
      const upObj = JSON.parse(JSON.stringify(data))
      delete upObj.id
      await Model.PropsRecord.update(
        upObj,
        {
          where: {
            id: data.id
          }
        }
      )
    } else {
      await Model.PropsRecord.create(data)
    }
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新用户道具列表信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 更新或创建任务
 */
async function updateTaskInfo(req, resp) {
  manager_logger().info('更新或创建任务')
  try {
    const data = req.body
    if (data.id) {
      await Model.TaskList.update(data, {
        where: {
          id: data.id
        }
      })
    } else {
      await Model.TaskList.create(data)
    }

    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新或创建任务失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 删除会员
 */
async function removeUser(req, resp) {
  manager_logger().info('更新会员信息')
  try {
    const data = req.body
    await Model.User.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新会员信息', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 删除钱包
 */
async function removeWallet(req, resp) {
  manager_logger().info('更新钱包信息')
  try {
    const data = req.body
    await Model.Wallet.destroy(
      {
        where: {
          address: data.address
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('更新钱包信息', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 删除道具
 */
async function removeProps(req, resp) {
  manager_logger().info('删除道具信息')
  try {
    const data = req.body
    await Model.Props.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除道具信息失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 删除操作记录
 */
async function removeEvent(req, resp) {
  manager_logger().info('删除操作记录')
  try {
    const data = req.body
    await Model.Event.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除操作记录失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 删除管理员
 */
async function removeAdminInfo(req, resp) {
  manager_logger().info('删除管理员')
  try {
    const data = req.body
    await Model.Manager.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除管理员失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 删除任务
 */
async function removeTaskList(req, resp) {
  manager_logger().info('删除任务')
  try {
    const data = req.body
    await Model.TaskList.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除任务失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}


/**
 * 
 * 删除奖品
 */
async function removePrize(req, resp) {
  manager_logger().info('删除奖品')
  try {
    const data = req.body
    await Model.Prize.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除奖品失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 删除等级
 */
async function removeLevel(req, resp) {
  manager_logger().info('删除等级')
  try {
    const data = req.body
    await Model.CheckInReward.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除等级失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}

/**
 * 
 * 删除用户道具
 */
async function removeUserProps(req, resp) {
  manager_logger().info('删除用户道具')
  try {
    const data = req.body
    await Model.PropsRecord.destroy(
      {
        where: {
          id: data.id
        }
      }
    )
    return successResp(resp, {}, '成功！')
  } catch (error) {
    manager_logger().info('删除用户道具失败', error)
    console.error(`${error}`)
    return errorResp(resp, `${error}`)
  }
}
//----------------------------- private method --------------
// 配置日志输出
function manager_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/manage/manage',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('admin')
  return logger
}


module.exports = {
  login,
  userInfo,
  getUserList,
  getUserInviteList,
  updateUserInfo,
  removeUser,
  removeProps,
  updatePropsInfo,
  getPropsList,
  removeEvent,
  updateEventInfo,
  getEventList,
  getConfigInfo,
  updateConfigInfo,
  getHomeInfo,
  getAdminList,
  updateAdminInfo,
  removeAdminInfo,
  removeTaskList,
  updateTaskInfo,
  getTaskList,
  getPrizeList,
  getExpList,
  updatePrizeInfo,
  updateExpList,
  removeLevel,
  removePrize,
  removeWallet,
  getWalletList,
  getPropsRecordList,
  updateUserPropsList,
  removeUserProps
}