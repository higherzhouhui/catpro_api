var log4js = require('log4js')
const { Props, Order, User, PropsRecord, OrderBoost } = require('./models')
const { errorResp, successResp, system_config } = require('./common')
const utils = require('./utils')
const { sequelize, Op } = require('./database')
const { buyProps_sig } = require('./eip712')
require('dotenv').config({ path: '../.env' })

/**
 * 1.创建道具购买订单,
 * @param {*} req
 * @param {*} resp
 */
async function create(req, resp) {
  const uid = req.uid
  const data = req.body
  order_logger().info(`用户${uid}创建订单:`, data)

  // 校验接收的参数
  let tip_message = ''
  const props_id = data.props_id
  if (!props_id) {
    tip_message = '缺少道具id数据'
    order_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 校验props_amount
  let props_amount = data.props_amount
  if (!props_amount && props_amount < 1) {
    tip_message = '道具数量有误'
    order_logger().error(tip_message)
    return errorResp(resp, 400)
  }
  props_amount = parseInt(props_amount)

  // 校验道具信息
  const props = await Props.findByPk(props_id)
  if (!props) {
    tip_message = '没有对应的道具信息'
    order_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 校验是否为助力订单
  let order_source = 'buy'
  const boost_uid = data.boost_uid
  if (boost_uid) {
    order_source = 'boost'
  }

  // 校验coins
  const coins = req.body.coins
  if (coins < 0 && order_source != 'boost') {
    order_logger().error('coins数据无效')
    return errorResp(resp, 400, 'coins数据无效')
  }
  const u_amount = props.price * props_amount
  const ffp_amount = utils.usdt_ffp(u_amount)
  if (coins < ffp_amount && order_source != 'boost') {
    tip_message = '支付金额与商品金额不匹配'
    order_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 校验wallet
  const wallet = data.wallet
  if (!wallet && coins > 0) {
    tip_message = '缺少钱包数据'
    order_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  // 校验tx_hash
  let tx_hash = data.tx_hash
  if (!tx_hash && coins > 0) {
    tip_message = '缺少交易数据'
    order_logger().error(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  order_logger().info('参数校验完毕,开始组装数据')

  // 组装数据
  const order_id = utils.generateOrderNumber(uid)
  if (!tx_hash) {
    tx_hash = order_id
  }
  const order_data = {
    order_id: order_id,
    props_id: props.id,
    props_amount: props_amount,
    total_fee: u_amount,
    title: props.name,
    uid: uid,
    tx_hash: tx_hash,
    source: order_source,
    ffp_amount: ffp_amount
  }

  order_logger().log('订单数据组装完毕,开始事务处理', order_data)

  let msg = '购买订单创建成功'
  make_order(order_data)
    .then((id) => {
      let result_data = {
        order_id: id
      }
      if (order_source == 'boost') {
        result_data['share_url'] = `${process.env.WEB_HOST}/boost/${id}`
        msg = '助力订单创建成功'
      }
      return successResp(resp, result_data, msg)
    })
    .catch((error) => {
      order_logger().error('创建订单失败了', error)
      return errorResp(resp, 400, '订单创建失败')
    })
}

async function create_boost_order(req, resp) {
  try {
    const data = req.body
    const uid = req.uid
    const orderInfo = await OrderBoost.findOne({
      where: {
        uid: uid,
        propsId: data.propsId,
        current: {
          [Op.not]: 10
        }
      }
    })
    if (orderInfo) {
      return successResp(resp, orderInfo.dataValues, 'success')
    } else {
      const order_id = new Date().getTime() + '_' + Math.round(Math.random() * 1000000)
      await OrderBoost.create({
        uid: uid,
        order_id: order_id,
        propsId: data.propsId,
        current: 0,
        total: 10
      });
      return successResp(resp, {order_id, current: 0, total: 10}, 'success')
    }
  } catch (error) {
    order_logger().error('创建订单失败了', error, req.data, req.uid)
    return errorResp(resp, 400, `${error}`)
  }
}

async function make_order(order_data) {
  const tx = await sequelize.transaction()
  try {
    // 创建订单
    const result = await Order.create(order_data, { transaction: tx })
    order_logger().info('订单创建成功', result.dataValues)

    await tx.commit()
    order_logger().info('订单创建流程处理完毕')

    // 订单创建成功
    return result.order_id
  } catch (error) {
    await tx.rollback()
    order_logger().error('创建订单失败', error)
    await tx.rollback()
    return error
  }
}

// async function update_order(order) {
//   order_logger().info('0/6.准备更新订单信息:', order.id)
//   const uid = order.uid
//   const props_id = order.props_id

//   // 根据订单金额计算能获到的经验值和积分
//   const { exp, pts } = get_reward_of_order(order)

//   // 计算上级邀请人可以得到的奖励
//   const reward_pid_coins = order.total_fee * system_config().commission_rate

//   // 查询用户道具关联表
//   const where_sql = { where: { props_id: props_id, uid: uid } }
//   const user_props = await UserProps.findOne(where_sql)

//   // 查询当前用户信息
//   const user = await User.findByPk(uid)
//   order_logger().info('user:', user)
//   // 准备事务处理
//   const tx = await sequelize.transaction()
//   try {
//     order_logger().info('1/6.进入订单更新的事务处理：', where_sql)

//     // 更新订单状态
//     await Order.update({ status: 'payed' }, { where: { id: order.id } })
//     order_logger().info('2/6.订单状态更新成功')

//     // 创建或更新用户道具关联表
//     if (user_props) {
//       await UserProps.increment({ props_amount: order.props_amount }, where_sql)
//     } else {
//       await UserProps.create({
//         props_id: props_id,
//         uid: uid,
//         props_amount: order.props_amount
//       })
//     }
//     order_logger().info('3/6.用户道具表处理完成')

//     if (order.props_id == 10000) {
//       // 更新当前用户的奖励及消费总额
//       await User.increment(
//         {
//           pts: pts,
//           exp: exp,
//           props_total_fee: order.total_fee,
//           ffp: order.props_amount
//         },
//         { where: { id: uid } }
//       )
//     } else if (order.props_id == 10002) {
//       // 更新当前用户的奖励及消费总额
//       await User.increment(
//         {
//           pts: pts,
//           exp: exp,
//           props_total_fee: order.total_fee,
//           pts: order.props_amount
//         },
//         { where: { id: uid } }
//       )
//     } else {
//       // 更新当前用户的奖励及消费总额
//       await User.increment(
//         { pts: pts, exp: exp, props_total_fee: order.total_fee },
//         { where: { id: uid } }
//       )
//     }

//     order_logger().info('4/6.当前用户奖励及消费总额更新成功')

//     // 更新上级用户奖励(订单金额的10%)
//     await User.increment(
//       { invite_reward_coins: reward_pid_coins },
//       { where: { id: user.invite_id } }
//     )
//     order_logger().info('5/6.上级用户的邀请奖励更新成功')

//     await tx.commit()
//     order_logger().info(`6/6.订单:${order.id}相关任务全部更新成功`)
//   } catch (error) {
//     order_logger().info('6/6.订单交易更新失败，发生回滚', error)
//     await tx.rollback()
//   }
// }

//----------------------------- admin method --------------
/**
 * 定时任务，根据订单状态，去链个检查资金是否到账
 */
// async function check_order() {
//   order_logger().info('检查订单状态')
//   const orders = await Order.findAll({ where: { status: 'notpay' } })
//   if (orders.length < 1) {
//     order_logger().error('没有需要更新的订单')
//     return
//   }
//   for (const order of orders) {
//     if (order.source == 'reward') {
//       // 免费订单
//       update_order(order)
//     } else if (order.source == 'buy') {
//       // 去链上查询交易信息
//       // query_chain_tx(order.tx_hash, order.wallet, order.total_fee).then(
//       //   (result) => {
//       update_order(order)
//       //   }
//       // )
//     }
//   }
// }

async function update_order(tx_hash) {
  order_logger().info('要更新订单hash:', tx_hash)
  const order = await Order.findOne({ where: { tx_hash: tx_hash } })
  if (!order) {
    order_logger().error('没有找到对应的订单信息')
    return
  }
  if (order.status == 'payed') {
    order_logger().error('无需处理')
    return
  }
  const uid = order.uid
  order_logger().info('0/6.准备更新订单信息:', order.order_id)

  // 根据订单金额计算能获到的经验值和积分
  const { exp, pts } = get_reward_of_order(order)

  // 计算上级邀请人可以得到的奖励
  const reward_pid_coins = order.total_fee * system_config().commission_rate

  // 查询当前用户信息
  const user = await User.findByPk(uid)
  order_logger().info('user:', user.id)

  // 准备事务处理
  const tx = await sequelize.transaction()
  try {
    order_logger().info('1/6.进入订单更新的事务处理：')

    // 更新订单状态
    await Order.update(
      { status: 'payed' },
      { where: { order_id: order.order_id }, transaction: tx }
    )
    order_logger().info('2/6.订单状态更新成功')

    // 取出道具信息
    const props = await Props.findByPk(order.props_id)

    // 创建用户道具表数据
    const props_data = {
      uid: uid,
      props_id: order.props_id,
      props_name: order.title,
      props_type: props.type,
      props_price: order.total_fee,
      props_amount: order.props_amount,
      props_tod: props.tod,
      order_id: order.order_id
    }
    order_logger().info('3/6.用户道具表数据:', props_data)
    for (let amount = 0; amount < order.props_amount; amount++) {
      const props_data = {
        uid: uid,
        props_id: order.props_id,
        props_name: order.title,
        props_type: props.type,
        props_price: order.total_fee,
        props_amount: order.props_amount,
        props_tod: props.tod,
        order_id: order.order_id + '_' + amount
      }
      await PropsRecord.create(props_data, { transaction: tx })
    }

    order_logger().info('3/6.用户道具表处理完成')

    if (order.props_id == 10000) {
      // 更新当前用户的奖励及消费总额--ffp
      await User.increment(
        {
          pts: pts,
          exp: exp,
          props_total_fee: order.total_fee
        },
        { where: { id: uid }, transaction: tx }
      )
    } else if (order.props_id == 10002) {
      // 更新当前用户的奖励及消费总额--pts
      await User.increment(
        {
          pts: pts,
          exp: exp,
          props_total_fee: order.total_fee,
          pts: order.props_amount
        },
        { where: { id: uid }, transaction: tx }
      )
    } else {
      // 更新当前用户的奖励及消费总额
      await User.increment(
        { pts: pts, exp: exp, props_total_fee: order.total_fee },
        { where: { id: uid }, transaction: tx }
      )
    }

    order_logger().info('4/6.当前用户奖励及消费总额更新成功')

    // 更新上级用户奖励(订单金额的10%)
    await User.increment(
      { invite_reward_coins: reward_pid_coins },
      { where: { id: user.invite_id }, transaction: tx }
    )
    order_logger().info('5/6.上级用户的邀请奖励更新成功')

    await tx.commit()
    order_logger().info(`6/6.订单:${order.order_id}相关任务全部更新成功`)
  } catch (error) {
    order_logger().info('6/6.订单交易更新失败，发生回滚', error)
    await tx.rollback()
  }
}

//----------------------------- private method --------------
function order_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/order/o',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('order')
  return logger
}

/**
 * 根据道具价格计算能获得的exp,pts
 * @param {*} props
 * @param {*} amount
 * @returns
 */
async function get_reward_of_order(order) {
  // 免费食物订单有0.1%的机会增50经验和50积分；
  if (order.source == 'reward') {
  } else if (order.price >= 1 && order.price <= 10) {
    // 1U-10U 有1.2%-12%的机会增加100-200经验和200积分
  } else if (order.price >= 10 && order.price <= 100) {
    // 11U-100U道具喂养tod结束后，有13%-50%的机会增加200-500经验和500积分
  }

  let result = {
    exp: 100,
    pts: 200
  }

  console.log(result)
  return result
}

/**
 * 获取购买食物的签名相关信息
 */
async function getBuyProps_data(req, resp) {
  const data = req.body
  const nonce = new Date().getTime() + Math.round(Math.random() * 1000000000000)
  data.nonce = nonce
  let result_data = {}
  try {
    result_data = await buyProps_sig(data)
  } catch(error) {
    return errorResp(resp, 400, `${error}`)
  }
  return successResp(resp, result_data, 'success')
}

module.exports = {
  create,
  update_order,
  getBuyProps_data,
  create_boost_order
}
