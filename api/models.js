const { DataTypes } = require('sequelize')
const db = require('./database')
/** 用户表 */
const User = db.sequelize.define(
  'User',
  {
    authDate: { type: DataTypes.STRING, defaultValue: '' },
    hash: { type: DataTypes.STRING },
    chatInstance: { type: DataTypes.STRING },
    chatType: { type: DataTypes.STRING },
    query_id: { type: DataTypes.STRING },
    addedToAttachmentMenu: { type: DataTypes.STRING },
    allowsWriteToPm: { type: DataTypes.BOOLEAN },
    firstName: { type: DataTypes.STRING },
    user_id: { type: DataTypes.BIGINT },
    languageCode: { type: DataTypes.STRING },
    lastName: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    score: { type: DataTypes.DOUBLE, defaultValue: 0 },
    telegram_premium: { type: DataTypes.BIGINT, defaultValue: 0 },
    isPremium: { type: DataTypes.BOOLEAN, defaultValue: false },
    startParam: { type: DataTypes.STRING, defaultValue: '0' },
    photoUrl: { type: DataTypes.STRING },
    invite_friends_score: { type: DataTypes.BIGINT, defaultValue: 0 },
    invite_friends_game_score: { type: DataTypes.BIGINT, defaultValue: 0 },
    game_score: { type: DataTypes.DOUBLE, defaultValue: 0 },
    farm_score: { type: DataTypes.DOUBLE, defaultValue: 0 },
    invite_friends_farm_score: { type: DataTypes.BIGINT, defaultValue: 0 },
    check_score: { type: DataTypes.BIGINT, defaultValue: 0 },
    task_score: { type: DataTypes.BIGINT, defaultValue: 0 },
    bind_wallet_score: { type: DataTypes.BIGINT, defaultValue: 0 },
    check_date: { type: DataTypes.STRING, defaultValue: '' },
    ticket: { type: DataTypes.BIGINT, defaultValue: 6 },
    wallet: { type: DataTypes.STRING },
    wallet_nickName: { type: DataTypes.STRING },
    end_farm_time: { type: DataTypes.DATE },
    last_farming_time: { type: DataTypes.DATE },
    is_really: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_Tg: { type: DataTypes.BOOLEAN, defaultValue: true },
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


/** 签到奖励列表  */
const CheckInReward = db.sequelize.define(
  'checkInReward',
  {
    day: { type: DataTypes.INTEGER },
    ticket: { type: DataTypes.INTEGER },
    score: { type: DataTypes.INTEGER }
  },
  {
    tableName: 'checkInReward'
  }
)

// CheckInReward.sync({ alter: true })


/** 任务列表  */
const TaskList = db.sequelize.define(
  'taskList',
  {
    name: { type: DataTypes.STRING },
    link: { type: DataTypes.STRING },
    linkType: { type: DataTypes.STRING },
    score: { type: DataTypes.INTEGER },
    ticket: { type: DataTypes.INTEGER },
    type: {type: DataTypes.STRING},
  },
  {
    tableName: 'taskList'
  }
)

// TaskList.sync({ alter: true })

/** 全局配置  */
const Config = db.sequelize.define(
  'Config',
  {
    ticket: { type: DataTypes.INTEGER, defaultValue: 6 },
    invite_normalAccount_score: { type: DataTypes.INTEGER, defaultValue: 2000 },
    invite_normalAccount_ticket: { type: DataTypes.INTEGER, defaultValue: 1 },
    invite_premiumAccount_score: { type: DataTypes.INTEGER, defaultValue: 20000 },
    invite_premiumAccount_ticket: { type: DataTypes.INTEGER, defaultValue: 5 },
    invite_friends_ratio: { type: DataTypes.INTEGER, defaultValue: 10 },
    game_time: { type: DataTypes.INTEGER, defaultValue: 30 },
    special_reward: { type: DataTypes.INTEGER, defaultValue: 2500 },
    farm_score: { type: DataTypes.INTEGER, defaultValue: 1080 },
    tg_link: { type: DataTypes.STRING, defaultValue: 'https://t.me/frenpetgame_bot/forkfrengame'},
  },
  {
    tableName: 'config'
  }
)
// Config.sync({ alter: true })
/** 操作日志  */
const Event = db.sequelize.define(
  'Event',
  {
    type: { type: DataTypes.STRING },
    score: { type: DataTypes.INTEGER, defaultValue: 0 },
    from_user: { type: DataTypes.BIGINT },
    to_user: { type: DataTypes.BIGINT, defaultValue: 0 },
    from_username: { type: DataTypes.STRING, defaultValue: 'system' },
    to_username: { type: DataTypes.STRING, defaultValue: 'system' },
    desc: { type: DataTypes.STRING },
    ticket: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_really: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  {
    tableName: 'event'
  }
)

// Event.sync({ alter: true })

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
// Manager.sync({ alter: true })

/** UserTask */
const UserTask = db.sequelize.define(
  'UserTask',
  {
    task_id: { type: DataTypes.INTEGER },
    status: { type: DataTypes.STRING, default: 'start' },
    user_id: { type: DataTypes.BIGINT },
  },
  {
    tableName: 'UserTask'
  }
)
// UserTask.sync({ alter: true })

module.exports = {
  User,
  Config,
  Event,
  Manager,
  CheckInReward,
  TaskList,
  UserTask,
}
