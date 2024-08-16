var log4js = require('log4js')
const { successResp, errorResp } = require('./common')
const {
  Prize,
  UserTask,
  Task,
  User,
  Box,
  Order,
  Props,
  PropsRecord,
  Event,
  Pet
} = require('./models')
const { sequelize, QueryTypes } = require('./database')
const { check_follow } = require('./twitter')
const { generateOrderNumber, get_current_time } = require('./utils')

//******************************** task ***************************/
/**
 * 获取任务列表
 * @param {*} req
 * @param {*} resp
 */
async function task_list(req, resp) {
  try {
    const uid = req.uid
    get_logger().info('获取任务列表:', uid)
    const sql = `SELECT t.id,t.type,t.label,t.target,t.action,t.total,ut.status, ut.id utId FROM task t LEFT JOIN user_task ut ON ut.task_id = t.id AND ut.uid = ${uid} ORDER BY t.id`
    const list = await sequelize.query(sql, { type: QueryTypes.SELECT })
    return successResp(resp, list)
  } catch (error) {
    return errorResp(resp, 400, `${error}`)
  }
}

/** 更新任务执行状态 */
async function task_done(req, resp) {
  const uid = req.uid
  get_logger().info('查询用户任务完成情况:', uid)

  let tip_message = ''
  const task_id = req.body.task_id
  if (!task_id) {
    tip_message = '缺少任务id'
    get_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 获取任务信息
  const task = await Task.findByPk(task_id)
  if (!task) {
    tip_message = '任务不存在'
    get_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 获取当前的任务
  const user_task = await UserTask.findOne({ where: { uid: uid } })

  const tx = await sequelize.transaction()
  try {
    // 创建任务完成状态
    if (!user_task) {
      await UserTask.create(
        { uid: uid, task_id: task_id, status: 2 },
        { transaction: tx }
      )
    }
    tx.commit()
    // 任务处理完毕
  } catch (error) {
    get_logger().error('任务更新出错', error)
    return errorResp(resp, 400, '任务更新出错')
  }
  return successResp(resp)
}

async function task_check_zh(req, resp) {
  get_logger().info('开始检查任务状态:', req.uid)
  try {
    const uid = req.uid
    const data = req.body
    if (data.status == 2) {
      if (data.utId) {
        await UserTask.update({
          status: 2
        }, { where: { id: data.utId } })
      } else {
        await UserTask.create({
          uid: uid,
          task_id: data.id,
          status: 2
        })
      }
      return successResp(resp, {}, 'success')
    } else if (data.status == 3) {
      await UserTask.update(
        { status: 3 },
        { where: { id: data.utId } }
      )
      // 数据库写死egg是11000的ID
      let prize_id = 11000
      // 如果该用户名下没有宠物，那么做任务就一定会得到一个宠物
      const petList = await Pet.findAll(
        {where: {uid: uid}}
      )
      if (petList.length != 0) {
        prize_id = await box_prize()
      }
      await Box.create(
        {
          uid: uid,
          task_id: data.id,
          prize_id: prize_id
        }
      )
      return successResp(resp, {}, 'success')
    }
  } catch (error) {
    get_logger().error('检查任务失败:', error)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * 任务完成情况检查
 * @param {*} req
 * @param {*} resp
 */
async function task_check(req, resp) {
  const uid = req.uid
  get_logger().info('查询用户任务完成情况:', uid)

  let tip_message = ''
  const task_id = req.query.task_id
  if (!task_id) {
    tip_message = '缺少任务id'
    get_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  const task = await Task.findByPk(task_id)
  if (!task) {
    tip_message = '任务不存在'
    get_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  const user = await User.findByPk(uid)
  if (!user || !user.twitter_id) {
    tip_message = '缺少用户信息'
    get_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 任务不检测，直接返回完成
  // const result = await check_follow(user.twitter_id)
  const result = true
  console.log('ddd:', result)
  if (!result) {
    tip_message = '任务未完成'
    get_logger().error(tip_message)
    return successResp(resp, { finish: 0 })
  }

  // 获取当前的任务
  const user_task = await UserTask.findOne({
    where: { uid: uid, task_id: task_id }
  })

  const tx = await sequelize.transaction()
  try {
    // 创建任务完成状态
    if (!user_task) {
      await UserTask.create(
        { uid: uid, task_id: task_id, status: 1 },
        { transaction: tx }
      )
    } else {
      // 更新任务完成状态
      await UserTask.update(
        { status: 1 },
        { where: { uid: uid, task_id: task_id }, transaction: tx }
      )
    }

    // 给用户发放宝箱
    for (let i = 0; i < task.box_amount; i++) {
      await Box.create(
        {
          uid: uid,
          task_id: task_id,
          prize_id: box_prize()
        },
        { transaction: tx }
      )
    }
    await tx.commit()
    get_logger().info('任务检查流程处理完毕')
    // 任务处理完毕
  } catch (error) {
    get_logger().error('任务检查出错', error)
    return errorResp(resp, 400, '任务检查出错')
  }

  successResp(resp, { finish: 1 })
}

//******************************** box ***************************/
/**
 * 打开宝箱
 * @param {*} req
 * @param {*} resp
 */
async function box_open(req, resp) {
  const box_id = req.body.box_id
  const uid = req.uid
  get_logger().info(`用户${req.uid}要开宝箱${box_id}`)

  let tip_message = ''
  // 获取用户信息
  const user_info = await User.findByPk(uid)
  if (!user_info) {
    tip_message = `cant't find userInfo`
    get_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 校验宝箱信息
  const box = await Box.findByPk(box_id)
  if (!box) {
    get_logger().error('没有对应的宝箱信息')
    return errorResp(resp, 400, `cant't find this box`)
  }

  if (box.uid != req.uid) {
    get_logger().error('只有宝箱所有者才能打开')
    return errorResp(resp, 400, 'only box owner open')
  }

  if (box.status == 1) {
    get_logger().error('宝箱已被打开过')
    return errorResp(resp, 400, 'box is opened')
  }

  // 查询奖品信息
  const prize = await Prize.findByPk(box.prize_id)
  if (!prize) {
    get_logger().error('没有对应的奖品信息')
    return errorResp(resp, 400, `cant't find prize`)
  }
  const order_id = generateOrderNumber(uid)
  const order = {
    order_id: order_id,
    props_id: prize.props_id,
    props_amount: prize.amount,
    total_fee: 0,
    title: prize.name,
    uid: uid,
    source: 'reward',
    status: 'payed',
    tx_hash: order_id
  }
  // 查询道具信息
  const props = await Props.findByPk(prize.props_id)
  if (!props) {
    get_logger().error('没有对应的道具信息')
    return errorResp(resp, 400, `can't find this props`)
  }
  const props_data = {
    uid: uid,
    props_id: prize.props_id,
    props_name: prize.name,
    props_type: props.type,
    props_price: props.usdt,
    props_amount: prize.props_amount,
    props_tod: props.tod,
    order_id: order.order_id
  }

  const event_text = `${user_info.nick_name} open box get ${prize.name}`
  let event_data = {
    type: 'box',
    text: event_text,
    uid: uid,
    amount: 1,
  }

  const tx = await sequelize.transaction()
  try {
    // 如果宝箱中礼物是资产类，给给用户增加数值
    if (props.type == 'asset') {
      await User.increment(
        { pts: prize.amount },
        { where: { id: uid }, transaction: tx }
      )
      get_logger().info('给用户增加积分成功')
    } else if (props.type == 'pet') {
      const randomNumber = Math.floor(Math.random() * (18 - 2 + 1)) + 2
      const img = `${randomNumber}_0.gif`
      await Pet.create({
        img: img,
        exp: 0,
        tod: get_current_time(),
        name: 'egg_box_' + Math.round(Math.random() * 100000000),
        uid: uid
      }, {transaction: tx}) 
    } else {
      // // 更新用户的相关奖品信息
      // await Order.create(order)
      // get_logger().info('用户奖品更新成功')

      // 增加用户道具记录
      await PropsRecord.create(props_data, { transaction: tx })
      get_logger().info('用户道具记录成功')
    }

    // 更新宝箱的状态为已领取
    await Box.update({ status: 1 }, { where: { id: box_id }, transaction: tx })
    get_logger().info('宝箱状态更新成功')

    // 增加日志记录
    await Event.create(event_data, { transaction: tx })
    get_logger().info('事件记录成功')

    await tx.commit()
  } catch (error) {
    get_logger().error('宝箱打开流程处理失败:', error)
    await tx.rollback()
    return errorResp(resp, 400, `${error}`)
  }
  successResp(resp, `get reward:${prize.name}`, prize.name)
}

/**
 * 获取宝箱列表
 * @param {*} req
 * @param {*} resp
 */
async function box_list(req, resp) {
  const uid = req.uid
  get_logger().info('获取宝箱列表的用户:', uid)
  const list = await Box.findAll({ where: { uid: uid, status: 0 } })
  successResp(resp, list)
}

//******************************** prize ***************************/
/**
 * 获取奖品列表
 * @param {*} req
 * @param {*} resp
 */
async function prize_list(req, resp) {
  const list = await Task.findAll()
  successResp(resp, list)
}

async function box_prize() {
  const prizeList = await Prize.findAll({
    where: {
      visible: 1
    }
  })
  let total = 0

  prizeList.map((item) => {
    total += item.weight
  })
  let pre = 0
  let id = 0
  const rate = Math.random()
  prizeList.map((item, index) => {
    let cRate = 0
    for (let i = 0; i < index + 1; i ++) {
      cRate += prizeList[i].weight
    }
    const next = cRate / total
    if (rate > pre && pre < next) {
      id = item.id
    }
    pre = next
  })
  return id
}

//----------------------------- private method --------------

// 配置日志输出
function get_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/quest/q',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('quest')
  return logger
}

module.exports = {
  task_list,
  task_done,
  task_check,
  box_list,
  box_open,
  prize_list,
  task_check_zh
}
