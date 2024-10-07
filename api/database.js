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

// Callback function for connection error
cache.on('error', (err) => {
  logger.error('Redis error:', err)
})

// Configure database connection
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

// Configure database connection
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



// Test connection
async function connectDB() {
  try {
    await sequelize.authenticate()
    logger.info('3.Mysql connection has establish successfully!')
    // Initialize
    if (process.env.INIT == 1) {
      await sequelize.sync({ force: true }); // Delete and recreate all tables
      logger.log('4.waiting...');
      const admin = require('./admin.js')
      const result = await admin.init_baseData()
      setTimeout(() => {
        logger.log(`6.Init ${result}`)
        logger.log('7.You can run pm2')
        process.exit(0)
      }, 2000);
    } else {
      // await sequelize.sync({ force: false }); // Setting `force` to true will delete and recreate all tables
      await sequelize.sync({ alter: true }); // Setting `force` to true will delete and recreate all tables
      logger.log('4.Database synchronization successful!');
      logger.log('5.Server started successful!');
    }
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
