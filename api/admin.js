var log4js = require('log4js')
const { errorResp, successResp } = require('./common')
const {
  Prize,
  User,
  Pet,
  Pts,
  UserTask,
  Props,
  Task,
  PropsRecord,
  Manager,
  ExpList,
  Config,
  Wallet,
  OrderBoost,
  Event
} = require('./models')
const { ADMIN_UID, SOCIAL_URL } = require('./constants')
const { twitter_request } = require('./twitter')
const { sequelize, QueryTypes } = require('./database')
const utils = require('./utils')
const path = require('path')
const fs = require('fs')

async function updateUserPts() {
  try {
    const [result] = await sequelize.query(
      'select id, pts from tuser'
    )
    let i = 0
    for (item of result) {
      User.update({
        pts: item.pts
      }, {where: {id: item.id}}).then(() => {
        i ++
        admin_logger().info(`${i}/${result.length}成功`, item.id)
      }).catch((error) => {
        admin_logger().error(`${error}`, `${item.id}失败`)

      })
    }
  } catch (error) {
    admin_logger().error(`${error}`)
  }
}

// 迁移原用户表数据
async function migrate_user(req, resp) {
  admin_logger().info('迁移数据')
  const [result, metadata] = await sequelize.query(
    'select * from tuser'
  )
  let i = 0
  for (item of result) {
    i ++
    const user = {
      // 基本信息
      id: item.id,
      code: utils.uid_code(item.id),
      nick_name: item.rname || item.tname,
      twitter_id: item.tid,
      head: item.head,
      createdAt: utils.timestampToTime(item.ctime),
      updatedAt: utils.timestampToTime(item.ctime),
      // 资产
      pts: item.pts,
      ffp: item.ffp,
      invite_id: isNaN(item.inv) || !item.inv ? 1000 : item.inv,

      // game
      bonk_freeze_time: item.ntime,
      bonk_status: item.status,
      bonk_count: item.r,
      bonk_win_pts: item.w,
      bonk_loss_pts: item.l
    }
    User.create(user)
      .then(() => {
        admin_logger().info(`${i}/23286`, user.id, utils.get_current_time())
      })
      .catch((error) => {
        admin_logger().error('用户迁移失败:', error)
      })

    // 增加pts 明细记录，做个一次性结余
    await Pts.create({ uid: user.id, amount: item.pts, source: 'box' })

    // 增加pts 明细记录，做个一次性结余
    // await Fpc.create({ uid: user.id, amount: item.ffp, source: 'box' })
  }
}


/**
 * 添加道具信息
 * @param {*} req
 * @param {*} resp
 */
async function props_add() {
  admin_logger().info('添加道具数据')

  const data = fs.readFileSync(path.join(__dirname, '../data/props.json'))
  const json_data = JSON.parse(data)

  for (item of json_data) {
    await Props.create(item)
      .then((result) => {
        admin_logger().info(`${item.name}添加成功`)
      })
      .catch((error) => {
        admin_logger().error('道具添加失败:', error)
      })
  }
}

/**
 * 添加奖品
 * @param {*} req
 * @param {*} resp
 */
async function prize_add() {
  admin_logger().info('添加奖品')

  const json_data = fs.readFileSync(path.join(__dirname, '../data/prize.json'))
  const prizes = JSON.parse(json_data)
  for (const item of prizes) {
    Prize.create(item)
      .then(() => {
        admin_logger().info(`奖品${item.name}添加成功`)
      })
      .catch((error) => {
        admin_logger().error('奖品添加失败', error)
      })
  }
}

/**
 * 添加任务
 * @param {*} req
 * @param {*} resp
 */
async function task_add() {
  admin_logger().info('添加任务数据')

  const data = fs.readFileSync(path.join(__dirname, '../data/task.json'))
  const json_data = JSON.parse(data)

  for (item of json_data) {
    await Task.create(item)
      .then((result) => {
        admin_logger().info('任务添加成功')
      })
      .catch((error) => admin_logger().error('任务添加失败:', error))
  }
}

/**
 * 修正用户头像信息
 * @param {*} req
 * @param {*} resp
 */
async function update_user_head() {
  admin_logger().info('更新用户头像')

  let success_count = 0
  let execute_count = 0
  // 筛选出头像有空的数据集
  // const list = await User.findAll({ where: { head: null } })
  const list = await User.findAll()
  // 默认头像的用户数据集
  // const list = await User.findAll({
  //   where: {
  //     head: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
  //   }
  // })
  admin_logger().info('无头像用户数量:', list.length)
  for (const user of list) {
    execute_count += 1
    console.log('要更新的用户:', user.twitter_id)
    const twitter_id = user.twitter_id

    let url = SOCIAL_URL + 'user/' + twitter_id
    const twitter_info = await twitter_request(url)

    if (twitter_info.status == 'error') {
      admin_logger().error('没有此用户信息')
      continue
    } else {
      // 开始更新用户信息
      const result = await User.update(
        {
          nick_name: twitter_info.screen_name || twitter_info.name,
          head: twitter_info.profile_image_url_https,
          address: twitter_info.location,
          twitter_info: twitter_info
        },
        { where: { twitter_id: twitter_id } }
      )
      if (result[0] == 1) {
        admin_logger().info(`${twitter_id}更新成功`)
        success_count += 1
      }

      admin_logger().info(
        `执行进度：${execute_count}/${list.length},成功数:${success_count}`
      )
    }

  }
}

/**
 * 更新邀请信息
 * @param {*} req
 * @param {*} resp
 */
async function update_invite_count(req, resp) {
  admin_logger().info('更新用户邀请信息')

  // 筛选邀请人数大于0的数据集
  const sql =
    'SELECT invite_id , count(*) num  FROM user group by invite_id HAVING num > 0 ORDER BY num desc'
  const list = await sequelize.query(sql, { type: QueryTypes.SELECT })

  let success_count = 0
  let execute_count = 0

  for (const item of list) {
    execute_count += 1
    admin_logger().info('要更新的用户:', item.invite_id)

    // 开始更新用户信息
    const result = await User.update(
      {
        invite_amount: item.num,
        mint_total_amount: 10 + parseInt(item.num / 3)
      },
      { where: { id: item.invite_id } }
    )
    if (result[0] == 1) {
      admin_logger().info(`${item.invite_id}更新成功`)
      success_count += 1
    }

    admin_logger().info(
      `执行进度：${execute_count}/${list.length},成功数:${success_count}`
    )
  }
}

/**
 * 迁移宠物数据
 */
async function migrate_pet() {
  admin_logger().info('迁移宠物数据')

  const list = await sequelize.query('select id, uid,img from tpet', {
    type: QueryTypes.SELECT
  })

  let success_count = 0
  let execute_count = 0
  for (const item of list) {
    execute_count += 1
    const result = await Pet.create({
      uid: item.uid,
      img: item.img
    })

    if (result.id > 0) {
      admin_logger().info(`pet${item.id}迁移成功`)
      success_count += 1
    }
    admin_logger().info(
      `执行进度：${execute_count}/${list.length},成功数:${success_count}`
    )
  }
}

/** 更新用户的宠物数据 */
async function update_user_pet() {
  admin_logger().info('更新用户宠物数据')

  // 筛选拥有宠物的用户数据集
  const sql =
    'SELECT uid,COUNT(*) amount FROM pet GROUP BY uid HAVING uid> 0 ORDER BY amount DESC'
  const list = await sequelize.query(sql, { type: QueryTypes.SELECT })

  let success_count = 0
  let execute_count = 0

  for (const item of list) {
    execute_count += 1
    admin_logger().info('要更新的用户:', item.uid)

    // 开始更新用户信息
    const result = await User.update(
      {
        pets: item.amount
      },
      { where: { id: item.uid } }
    )
    if (result[0] == 1) {
      admin_logger().info(`${item.uid}更新成功`)
      success_count += 1
    }

    admin_logger().info(
      `执行进度：${execute_count}/${list.length},成功数:${success_count}`
    )
  }
}


/** 更新用户道具 */
async function update_user_props() {
  admin_logger().info('更新用户道具数据')
  try {

    // 筛选拥有道具的用户数据集
    const sql = 'SELECT uid,did,vo FROM act WHERE t = 4'
    const list = await sequelize.query(sql, { type: QueryTypes.SELECT })

    let success_count = 0
    let execute_count = 0

    for (const item of list) {
      const uid = item.uid
      execute_count += 1
      const props_id = item.did
      const props_amount = item.vo
      admin_logger().info('要更新的用户:', uid)

      // 增加用户道具记录表
      const info = await Props.findByPk(props_id)
      if (info.name == 'ffp') {
        await User.increment({
          coins: props_amount,
          invite_reward_coins: props_amount,
        }, { where: { id: item.uid } })
      } else if (info.name == 'pts') {
        await User.increment({
          pts: props_amount,
        }, { where: { id: item.uid } })
      } else {
        await PropsRecord.create({
          uid: uid,
          props_id: props_id,
          props_type: info.type,
          props_name: info.name,
          props_price: info.usdt,
          props_tod: info.tod,
          props_amount: props_amount,
          order_id: utils.get_current_time() + Math.round(Math.random() * 100000000000),
          source: 'box'
        })
      }

      // 关联用户、宝箱、任务之间的对应关系
      // const result2 = await Box.create({
      //   uid: uid,
      //   prize_id: 9527,
      //   task_id: 9527,
      //   status: 1
      // })

      admin_logger().info(`${item.uid}更新成功`)
      success_count += 1

      admin_logger().info(
        `执行进度：${execute_count}/${list.length},成功数:${success_count}`
      )
    }
  } catch (error) {
    console.error(error)
  }

}

//----------------------------- private method --------------
// 配置日志输出
function admin_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/admin/admin',
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

async function init_manager() {
  try {
    const list = [
      { account: 'admin', password: 'a12345678' },
      { account: '18516010812', password: 'a123456' },
    ]
    list.map(async item => {
      await Manager.create(item)
    })
  } catch (error) {
    console.error('init manage error:', error)
  }
}

async function init_expList() {
  try {
    const exp = require('../data/exp')
    exp.list.map(async item => {
      await ExpList.create(item)
    })
  } catch (error) {
    console.error('init exp error:', error)
  }
}


async function init_systemConfig() {
  try {
    await Config.create({})
  } catch (error) {
    console.error('init exp error:', error)
  }
}

async function update_invite_id() {
  const list = await User.findAll({
    where: {invite_id: 0}
  })
  for (let i = 0; i < list.length; i ++) {
    User.update({
      invite_id: 1000,
    }, {where: { id: list[i].id}}).then(res => {
      console.log(`${i}/${list.length}更新成功`)
    })
  }
}

async function test_dbMergeXPet(req, resp) {
  try {
    PropsRecord.sync({ force: true })
    User.sync({ force: true })
    Event.sync({ force: true })
    Pts.sync({ force: true })
    Wallet.sync({ force: true })
    UserTask.sync({ force: true })
    OrderBoost.sync({ force: true })
    Props.sync({ force: true })
    Prize.sync({ force: true })
    ExpList.sync({ force: true })
    setTimeout(async () => {
      await props_add()
      await prize_add()
      await init_expList()
      await migrate_user(req, resp)
      await update_user_head()
      await migrate_pet()
      await update_invite_count()
      await update_user_pet()
      await update_user_props();
      await task_add()
    }, 3000);
  } catch (error) {
    console.error(error)
  }
}
module.exports = {
  migrate_user,
  props_add,
  prize_add,
  task_add,
  update_invite_count,
  update_user_props,
  migrate_pet,
  update_user_pet,
  update_user_head,
  init_manager,
  init_expList,
  init_systemConfig,
  test_dbMergeXPet,
  updateUserPts
}