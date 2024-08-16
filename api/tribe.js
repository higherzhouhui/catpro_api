const { errorResp, successResp, system_config } = require('./common')
const { sequelize } = require('./database')
const { User, Tribe, UserTribe } = require('./models')
var log4js = require('log4js')
/**
 * 创建部落
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function create(req, resp) {
  const uid = req.uid
  tribe_logger().info(`用户${uid}创建部落`)
  const name = req.body.name
  let tip_message = ''
  if (!name) {
    tip_message = '缺少名字信息'
    tribe_logger().info(tip_message)
    return errorResp(resp, 400, tip_message)
  }
  const user = await User.findByPk(uid)
  const count = system_config().tribe_invite_count
  tribe_logger().info(`已经邀请${user.invite_amount},要求邀请${count}`)

  if (user.invite_amount < count) {
    tip_message = `至少邀请${count}人，才有资格创建`
    tribe_logger().info(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  tribe_logger().info('参数校验完成，进入事物处理流程')
  const tx = await sequelize.transaction()
  try {
    // 创建部落表
    const result = await Tribe.create(
      { uid: uid, name: name },
      { transaction: tx }
    )
    const tribe_id = result.id
    tribe_logger().info('部落创建成功,id:', tribe_id)

    // 创建用户部落关联表
    await UserTribe.create(
      { uid: uid, tribe_id: tribe_id, role: 'owner' },
      { transaction: tx }
    )
    tribe_logger().info('用户关联表创建成功')

    await tx.commit()
    tribe_logger().info('部落创建流程处理完毕:', result.dataValues)
    return successResp(resp, { tribe_id: tribe_id }, '部落创建成功')
  } catch (error) {
    tribe_logger().info('部落创建失败:', error)
    await tx.rollback()
    return errorResp(resp, 400, '部落创建失败')
  }
}

/**
 * 加入部落
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function join(req, resp) {
  const uid = req.uid
  tribe_logger().info(`用户${uid}要加入部落`)

  let tip_message = ''
  const tribe_id = req.body.tribe_id
  if (!tribe_id) {
    tip_message = '部落ID有误'
    tribe_logger().info(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  const tribe = await Tribe.findByPk(tribe_id)
  if (!tribe) {
    tip_message = '要加入的部落不存在'
    tribe_logger().info(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  const user_tribe = await UserTribe.findOne({
    where: { tribe_id: tribe_id, uid: uid }
  })
  if (user_tribe) {
    tip_message = '已经在部落了，不要重复加入'
    tribe_logger().info(tip_message)
    return errorResp(resp, 400, tip_message)
  }

  tribe_logger().info('参数校验完毕，进入事务处理流程')
  const tx = await sequelize.transaction()
  try {
    await UserTribe.create(
      { uid: uid, tribe_id: tribe_id },
      { transaction: tx }
    )
    await tx.commit()
    return successResp(resp, {}, '成功加入部落')
  } catch (error) {
    await tx.rollback()
    tribe_logger().info('加入部落出错:', error)
    return errorResp(resp, 400, '加入部落出错')
  }
}

/**
 * 部落表
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function list(req, resp) {
  const uid = req.uid
  tribe_logger().info(`用户${uid}创建部落`)
  let page_number = parseInt(req.query.page_number || 1)
  if (page_number < 1) {
    page_number = 1
  }
  let page_size = parseInt(req.query.page_size || 10)
  if (page_size < 1) {
    page_size = 10
  }

  const list = await Tribe.findAndCountAll({
    order: [['createdAt', 'desc']],
    limit: page_size,
    offset: (page_number - 1) * page_size,
    attributes: ['id', 'uid', 'name', 'remark']
  })
  return successResp(resp, list)
}

/**
 * 部落详情
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function info(req, resp) {
  const uid = req.uid
  tribe_logger().info(`用户${uid}查看部落详情`)
  const tribe_id = req.query.tribe_id
  if (!tribe_id) {
    tribe_logger().info('要查询的部落id有误')
    return errorResp(resp, 400, '要查询的部落id有误')
  }
  const tribe = await Tribe.findByPk(tribe_id, {
    attributes: ['id', 'uid', 'name', 'remark']
  })
  return successResp(resp, tribe)
}

//----------------------------- private method --------------
// 配置日志输出
function tribe_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/tribe/t',
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
  create,
  join,
  list,
  info
}
