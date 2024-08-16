const { system_config, successResp, errorResp } = require('./common')
const {
  EPOCH_ID,
  SOCIAL_URL,
  SOCIAL_TOKEN,
  TWITTER_ID
} = require('./constants')
const { cache } = require('./database')
const http = require('needle')
const { User } = require('./models')
var log4js = require('log4js')

/**
 * 发送mint所需的的twitter内容
 * @param {*} req
 * @param {*} resp
 */
async function post_twiiter(req, resp) {
  let epoch_id = await cache.get(EPOCH_ID)
  const config = system_config()
  let tw_url =
    '{  \n    "p": "erc-20", \n    "op": "mint", \n    "tick": "#FFP", \n    "max": "' +
    config.ffp_supply +
    '",\n    "lim": "' +
    config.ffp_limit +
    '"\n  }\n  @forkfrenpet Epoch ' +
    epoch_id +
    '\nHash:' +
    config.ffp_hash +
    '\n\nInvitation code ' +
    req.uid +
    '  #Inscription #Ethscripitons'

  const post_content =
    'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tw_url)

  return successResp(
    resp,
    { post_content: post_content },
    'post success,waiting for verification'
  )
}

/**
 * 查询某个twitter用户的详细信息
 * @param {*} req
 * @param {*} resp
 */
async function get_twiiter_info(req, resp) {
  const twitter_id = req.query.twitter_id
  let url = SOCIAL_URL + 'user/' + twitter_id

  twitter_request(url)
    .then((data) => {
      twitter_logger().info('twiiter_info:', data)
      console.log('ddd:', data.screen_name || data.name)

      // 更新用户表的数据
      User.update(
        {
          nick_name: data.screen_name || data.name,
          head: data.profile_image_url_https,
          address: data.location,
          twitter_info: data
        },
        { where: { twitter_id: twitter_id } }
      )
        .then(() => twitter_logger().info('用户表数据更新成功'))
        .catch((error) => twitter_logger().error('用户表更新失败:', error))
      return successResp(resp, data)
    })
    .catch((error) => {
      console.log('er:', error)
    })
}

/**
 * 检查是否转发了某个推文
 * @param {*} req
 * @param {*} resp
 */
async function check_retweet(req, resp) {
  const tweet_id = req.query.tweet_id
  const user = await User.findByPk(req.uid)
  const tweet_user_id = user.twitter_id

  let url =
    SOCIAL_URL + `tweets/${tweet_id}/retweeted_by/${tweet_user_id}?max_count=20`
  twitter_request(url)
    .then((result) => {
      twitter_logger().info('转发了特定的twitte', result)
      return successResp(resp, result)
    })
    .catch((error) => {
      twitter_logger().error('校验错误:', error)
      return errorResp(resp, 400, '校验失败')
    })
}

/**
 * 检查是否关注了某个用户--不可用
 * @param {*} req
 * @param {*} resp
 */
async function check_follow(twitter_id) {
  let url =
    SOCIAL_URL + `user/${twitter_id}/following/${TWITTER_ID}?max_cout=20`

  return new Promise((resolve, reject) => {
    twitter_request(url)
      .then((result) => {
        twitter_logger().info('follow某个用户', result.status)
        if (result.status == 'error') {
          resolve(false)
        }
        resolve(true)
      })
      .catch((error) => {
        twitter_logger().error('校验错误:', error)
        reject(false)
      })
  })
}

/**
 * 检查是否回复了某个推文
 * @param {*} req
 * @param {*} resp
 */
async function check_reply_tweet(req, resp) {
  const tweet_id = req.query.tweet_id
  const user = await User.findByPk(req.uid)
  const tweet_user_id = user.twitter_id

  let url =
    SOCIAL_URL + `user/${tweet_user_id}/following/${tweet_id}?max_cout=20`
  twitter_request(url)
    .then((result) => {
      twitter_logger().info('follow某个用户', result)
      return successResp(resp, result)
    })
    .catch((error) => {
      twitter_logger().error('校验错误:', error)
      return errorResp(resp, 400, '校验失败')
    })
}

/**
 * 检查是否发送了特定内容的推文
 * @param {*} req
 * @param {*} resp
 */
async function check_post(req, resp) {
  const twitter_id = req.query.twitter_id
  const user = await User.findByPk(req.uid)
  const tweet_user_id = user.twitter_id

  let url =
    SOCIAL_URL + `user/${tweet_user_id}/following/${twitter_id}?max_cout=20`
  twitter_request(url)
    .then((result) => {
      twitter_logger().info('follow某个用户', result)
      return successResp(resp, result)
    })
    .catch((error) => {
      twitter_logger().error('校验错误:', error)
      return errorResp(resp, 400, '校验失败')
    })
}

// *************************************Private Method**********************************
// 配置日志输出
function twitter_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/twiiter/t',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('twiiter')
  return logger
}

/**
 * 从第三方Socia上获取用户信息
 * @param {*} tid
 * @returns 返回用户信息
 * 984229745322639360
 */
async function twitter_request(url) {
  let options = {
    headers: {
      authorization: SOCIAL_TOKEN,
      accept: 'application/json'
    }
  }

  return new Promise((resolve, reject) => {
    http('get', url, options)
      .then((resp) => {
        resolve(resp.body)
      })

      .catch((error) => {
        reject(error)
        twitter_logger().error('数据请求失败:', error)
      })
  })
}

module.exports = {
  post_twiiter,
  get_twiiter_info,
  check_retweet,
  check_follow,
  check_reply_tweet,
  check_post,
  twitter_request
}
// getUserInfoFromSocia('1495787985136230406')

// check_follow('1744717385804996608')
//   .then((res) => {
//     console.log(res)
//   })
//   .catch((error) => {
//     console.log('erro:', error)
//   })

