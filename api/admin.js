var log4js = require('log4js')

const Model = require('./models')


async function init_manager() {
  try {
    const list = [
      { account: 'admin', password: 'a12345678' },
      { account: '18516010812', password: 'a123456' },
    ]
    list.map(async item => {
      await Model.Manager.create(item)
    })
  } catch (error) {
    console.error('init manage error:', error)
  }
}

async function init_rewardList() {
  try {
    const exp = require('../data/reward')
    exp.list.map(async item => {
      await Model.CheckInReward.create(item)
    })
  } catch (error) {
    console.error('init exp error:', error)
  }
}

async function init_systemConfig() {
  try {
    await Model.Config.create({})
  } catch (error) {
    console.error('init exp error:', error)
  }
}

async function init_taskList() {
  try {
    const list = [
      {
        score: 2000,
        link: 'https://t.me/hamstermemedapp',
        name: 'Telegram Community',
        ticket: 0,
        type: 'telegram'
      },
      {
        score: 2000,
        link: 'https://t.me/hamstermemedapp',
        name: 'Follow Us',
        ticket: 0,
        type: 'twitter'
      },
      {
        score: 2000,
        link: '/wallet',
        name: 'Bind Wallet',
        ticket: 0,
        type: 'wallet'
      },
    ]
    list.forEach(async item => {
      await Model.TaskList.create(item)
    })
  } catch (error) {
    console.error('init tasklist error:', error)
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

module.exports = {
  init_manager,
  init_rewardList,
  init_systemConfig,
  init_taskList
}