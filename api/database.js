const { Sequelize, QueryTypes, Op } = require('sequelize')
const Redis = require('ioredis')
var log4js = require('log4js')
var logger = log4js.getLogger('system')
if (process.env.NODE_ENV == 1) {
  require('dotenv').config({ path: '../.env.dev' })
} else {
  require('dotenv').config({ path: '../.env' })

}
const config = process.env

const cache = new Redis({
  host: config.DB_HOST,
  port: config.REDIS_PORT,
  db: config.REDIS_DB_NO
})

cache.on('connect', () => {
  logger.info('2.Redis connection has establish successfully')
})

// 连接错误的回调函数
cache.on('error', (err) => {
  logger.error('Redis error:', err)
})

// 配置数据库连接
const sequelize = new Sequelize(
  config.DB_NAME,
  config.DB_USER,
  config.DB_PASSWORD,
  {
    host: config.DB_HOST,
    dialect: 'mysql',
    logging: false,
    // define: {
    //   createdAt: 'created_at',
    //   updatedAt: 'updated_at',
    //   deletedAt: 'deleted_at',
    //   underscored: true
    // }
    pool: {
      max: 30,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
)

// 配置数据库连接
const sequelizeAuto = new Sequelize(
  config.DB_NAME,
  config.DB_USER,
  config.DB_PASSWORD,
  {
    host: config.DB_HOST,
    dialect: 'mysql',
    logging: false,
    // define: {
    //   createdAt: 'created_at',
    //   updatedAt: 'updated_at',
    //   deletedAt: 'deleted_at',
    //   underscored: true
    // }
    pool: {
      max: 30,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
)



// 测试连接
async function connectDB() {
  try {
    await sequelize.authenticate()
    logger.info('3.Mysql connection has establish successfully!')
    await sequelize.sync({ alter: false }); // 将 force 设置为 true 将会删除并重新创建所有表
    logger.log('4.Database synchronization successful!');
    logger.log('5.Server started successful!');
  } catch (error) {
    logger.error('connect db error', error)
  }
}

connectDB()

module.exports = {
  sequelize,
  QueryTypes,
  Op,
  cache,
  sequelizeAuto
}
