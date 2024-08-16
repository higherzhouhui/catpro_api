const { successResp, errorResp, paramErrorResp } = require('./common')
var log4js = require('log4js')
const { Wallet, User } = require('./models')
const { sequelize, cache } = require('./database')
const { WALLET_INDEX_KEY } = require('./constants')

/**
 * 添加钱包
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function add(req, resp) {
  const tx = await sequelize.transaction()
  try {
    const uid = req.uid
    const address = req.body.wallet
    const type = req.body.type
    get_logger().info(`用户${uid}要添加${type}类型的钱包${address}`)

    //   获取当前钱包的最大索引
    const wallet_index = (await cache.get(WALLET_INDEX_KEY)) || 1105
    //   事物处理
    const isExist = await Wallet.findOne({
      where: {
        address: address, uid: uid
      }, transaction: tx
    })
    if (isExist) {
      isExist.dataValues.address = address
      await Wallet.update(isExist.dataValues, { where: { uid: uid, address: address }, transaction: tx })
    } else {
      await Wallet.create({
        uid: uid, type: type, address: address, is_select: false, index: wallet_index
      }, { transaction: tx })
    }
    await tx.commit()
    // 更新索引
    await cache.set(WALLET_INDEX_KEY, parseInt(wallet_index) + 1)
    get_logger().info('钱包添加成功')
    return successResp(
      resp,
      req.body,
      'success'
    )
  } catch (error) {
    await tx.rollback()
    get_logger().error('添加钱包失败:', error)
    return errorResp(resp, 400, `${error}`)
  }
}

async function list(req, resp) {
  const uid = req.uid
  get_logger().info('获取钱包列表:', uid)
  const wallets = await Wallet.findAndCountAll({
    where: {
      uid: uid
    },
  })
  return successResp(resp, wallets)
}

/**
 * 钱包切换
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function select(req, resp) {
  const uid = req.uid
  get_logger().info(`${uid}要切换钱包地址`)
  const wallet = req.body.wallet
  if (!wallet) {
    return paramErrorResp(resp)
  }

  const info = await Wallet.findByPk(wallet)
  if (!info) {
    return errorResp(resp, 400, `can't find this address`)
  }

  const tx = await sequelize.transaction()
  try {
    if (!info.is_select) {
      //   取消上一次钱包的选中
      await Wallet.update(
        { is_select: false },
        { where: { is_select: true, uid: uid }, transaction: tx }
      )

      // 更新钱包选中
      await Wallet.update(
        { is_select: true },
        { where: { address: wallet, uid: uid }, transaction: tx }
      )

      //   切换用户钱包地址
      await User.update(
        { wallet: wallet },
        { where: { id: uid }, transaction: tx }
      )
    }

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    return errorResp(resp, 400, '钱包更新出现错误')
  }
  return successResp(resp)
}

/**
 * 更新钱包名称
 */
async function update_wallet(req, resp) {
  const tx = await sequelize.transaction()
  try {
    const uid = req.uid
    const data = req.body
    await Wallet.update(data, {where: {uid: uid, address: data.address}, transaction: tx})
    await tx.commit()
    return successResp(resp, {}, 'success')
  } catch (error) {
    await tx.rollback()
    get_logger().error('更新钱包失败',error, req.uid, req.body)
    return errorResp(resp, 400, `${error}`)
  }
}

/**
 * 更新钱包名称
 */
async function delete_wallet(req, resp) {
  const tx = await sequelize.transaction()
  try {
    const uid = req.uid
    const data = req.body
    await Wallet.destroy({where: {uid: uid, address: data.address}, transaction: tx})
    await tx.commit()
    return successResp(resp, {}, 'success')
  } catch (error) {
    await tx.rollback()
    get_logger().error('删除钱包失败',error, ree.uid, req.body)
    return errorResp(resp, 400, `${error}`)
  }
}

//----------------------------- private method --------------
// 配置日志输出
function get_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/wallet/w',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('wallet')
  return logger
}

module.exports = {
  add,
  list,
  select,
  delete_wallet,
  update_wallet
}
