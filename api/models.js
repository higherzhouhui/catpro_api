const { DataTypes } = require('sequelize')
const db = require('./database')
/** 用户表 */
const User = db.sequelize.define(
  'User',
  {
    authDate: { type: DataTypes.STRING, defaultValue: '' },
    hash: { type: DataTypes.STRING },
    query_id: { type: DataTypes.STRING},
    addedToAttachmentMenu: {type: DataTypes.STRING},
    allowsWriteToPm: { type: DataTypes.BOOLEAN},
    first_name: { type: DataTypes.STRING},
    user_id: { type: DataTypes.BIGINT },
    languageCode: { type: DataTypes.STRING},
    last_name: { type: DataTypes.STRING},
    username: { type: DataTypes.STRING},
    score: {type: DataTypes.BIGINT, defaultValue: 0},
    telegram_premium: {type: DataTypes.BIGINT, defaultValue: 0},
    isPremium: {type: DataTypes.BOOLEAN, defaultValue: false},
    startParam: {type: DataTypes.STRING, defaultValue: '0'},
    photoUrl: {type: DataTypes.STRING},
    account_age_score: {type: DataTypes.BIGINT, defaultValue: 0},
    invite_friends_score: {type: DataTypes.BIGINT, defaultValue: 0},
    game_score: {type: DataTypes.BIGINT, defaultValue: 0},
    check_score: {type: DataTypes.BIGINT, defaultValue: 0},
    bind_wallet_score: {type: DataTypes.BIGINT, defaultValue: 0},
    wallet: {type: DataTypes.STRING},
    check_date: {type: DataTypes.DATE},
    game_max_score: {type: DataTypes.BIGINT, defaultValue: 0},
    year: {type: DataTypes.INTEGER, defaultValue: 0},
    percent: {type: DataTypes.INTEGER, defaultValue: 0},
    is_New: {type: DataTypes.BOOLEAN, defaultValue: true},
    is_really: {type: DataTypes.BOOLEAN, defaultValue: true},
  },
  {
    tableName: 'user',
    indexes: [
      {
        unique: true,
        fields: ['user_id']
      }
    ]
  }
)
User.sync({ alter: true })

/** 全局配置  */
const Config = db.sequelize.define(
  'Config',
  {
    not_one_year: { type: DataTypes.INTEGER, defaultValue: 9527 },
    one_year_add: {type: DataTypes.INTEGER, defaultValue: 7372},
    huiYuan_add: {type: DataTypes.INTEGER, defaultValue: 16999},
    invite_add: {type: DataTypes.INTEGER, defaultValue: 2222},
    every_three_ratio: {type: DataTypes.INTEGER, defaultValue: 4},
    play_game: {type: DataTypes.INTEGER, defaultValue: 600},
    one_found_game: {type: DataTypes.INTEGER, defaultValue: 400},
  },
  {
    tableName: 'config'
  }
)
Config.sync({ alter: true })

/** 操作日志  */
const Event = db.sequelize.define(
  'Event',
  {
    type: { type: DataTypes.STRING },
    score: { type: DataTypes.INTEGER },
    from_user: { type: DataTypes.BIGINT},
    to_user: { type: DataTypes.BIGINT},
    from_username: { type: DataTypes.STRING, defaultValue: 'dogs'},
    to_username: { type: DataTypes.STRING, defaultValue: 'dogs'},
    desc: {type: DataTypes.STRING },
    is_really: {type: DataTypes.BOOLEAN, defaultValue: true}
  },
  {
    tableName: 'event'
  }
)

Event.sync({ alter: true })

/** Manager */
const Manager = db.sequelize.define(
  'Manager',
  {
    account: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING },
    token: { type: DataTypes.STRING },
  },
  {
    tableName: 'manager'
  }
)
Manager.sync({ alter: true })

module.exports = {
  User,
  Config,
  Event,
  Manager
}
