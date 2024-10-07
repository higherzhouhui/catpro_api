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
    console.error('init reward error:', error)
  }
}

async function init_systemConfig() {
  try {
    await Model.Config.create({})
  } catch (error) {
    console.error('init config error:', error)
  }
}

async function init_taskList() {
  await Model.TaskList.sync({ force: true })
  try {
    const exp = require('../data/task')
    exp.list.forEach(async item => {
      await Model.TaskList.create(item)
    })
  } catch (error) {
    console.error('init tasklist error:', error)
  }
}

//----------------------------- private method --------------
// Configure log output
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

async function init_baseData() {
  await init_manager()
  await init_rewardList()
  await init_taskList()
  await init_systemConfig()

  const config = await Model.Config.findAll()
  if (config) {
    console.log(config)
    return 'successful!'
  } else {
    return 'fail'
  }
}

module.exports = {
  init_manager,
  init_rewardList,
  init_systemConfig,
  init_taskList,
  init_baseData
}