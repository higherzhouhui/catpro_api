const { Prize, Config } = require('./models')
const jwt = require('jsonwebtoken')
const SECRET_KEY = 'CAT_API'

function createToken(data) {
  const token = jwt.sign(
    { user: {username: data.username, id: data.user_id} },
    SECRET_KEY,
    { expiresIn: '1m' }
  )
  return token
}

function generateOrderNumber(uid) {
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  const day = String(currentDate.getDate()).padStart(2, '0')
  const hours = String(currentDate.getHours()).padStart(2, '0')
  const minutes = String(currentDate.getMinutes()).padStart(2, '0')
  const seconds = String(currentDate.getSeconds()).padStart(2, '0')

  // 将uid转为字符串，确保长度为7，不足时前面补0
  const formattedUid = String(uid).padStart(8, '0')

  const randomSuffix = Math.floor(Math.random() * 1000000) // 生成3位随机数

  const orderNumber = `${year}${month}${day}${hours}${minutes}${seconds}${formattedUid}${randomSuffix}`
  return orderNumber
}

function timestampToTime(timestamp) {
  const date = new Date(timestamp * 1000) // 创建 Date 对象，使用时间戳作为参数
  const year = date.getFullYear() // 获取年份
  const month = date.getMonth() + 1 // 获取月份（注意：月份从0开始，所以需要加1）
  const day = date.getDate() // 获取日期
  const hours = date.getHours() // 获取小时
  const minutes = date.getMinutes() // 获取分钟
  const seconds = date.getSeconds() // 获取秒数

  // 格式化输出
  const formattedDate = `${year}-${pad(month)}-${pad(day)}`
  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`

  return `${formattedDate} ${formattedTime}`
}

function pad(num) {
  return num < 10 ? '0' + num : num
}

/**
 * 计算攻击的胜负手
 * @param {*} playerA
 * @param {*} coefA
 * @param {*} palyerB
 * @param {*} coefB
 * @returns (赢家，输家)对象
 */

// 目前控制攻击者胜率好友60% 比对方等级高70%;比对方等级低50%;同等级65%
async function calculateWinner(playerA, playerB) {
  // 攻击者增加10%的胜率
  const systemConfig = await Config.findByPk(1)
  let ratio = 0
  // 首先确定关系
  if (playerA.invite_id == playerB.id || playerA.id == playerB.invite_id) {
    ratio = systemConfig.bonk_friend_rate
  } else if (playerA.pts > playerB.pts * 5 || playerA.pts - playerB.pts > 200) {
    ratio = systemConfig.bonk_not_level_rate
  } else if (playerA.pts * 5 < playerB.pts || playerB.pts - playerA.pts > 200) {
    ratio = (1 - systemConfig.bonk_not_level_rate)
  } else {
    ratio = systemConfig.bonk_same_level_rate
  }
  if (ratio > Math.random() - 0.1) {
    return { winner: playerA, loser: playerB }
  } else {
    return { winner: playerB, loser: playerA }
  }
}
// let c = 0  

// for(let i = 0; i < 10000; i ++) {
//   calculateWinner({id: 114146, invite_id: 10001, pts: 3200}, {id: 10, invite_id: 9999, pts: 1000}).then(res => {
//     if (res.winner.id == 114146) {
//       c ++
//     }
//   })
// }
// setTimeout(() => {
//   console.log(c / 100)
// }, 5000);

/**
 * 抽奖程序
 * @returns 奖品对象
 */
async function raffle_prizes() {
  const prizes = await Prize.findAll({
    where: { visible: 1 }
  })

  // 计算总体中奖概率
  const totalProbability = prizes.reduce((acc, prize) => acc + prize.weight, 0)
  const randomValue = Math.random() * totalProbability // 生成一个0到总概率之间的随机数
  let cumulativeProbability = 0

  for (const prize of prizes) {
    cumulativeProbability += prize.weight // 累计奖品的中奖概率
    if (randomValue <= cumulativeProbability) {
      return prize // 返回中奖的奖品名称
    }
  }

  return prizes[0] // 如果未中奖，则返回相应提示
}

function get_current_time() {
  return Math.floor(new Date().getTime() / 1000)
}

/**
 * 计算两数的百分比
 * @param {*} dividend
 * @param {*} divisor
 * @returns
 */
function divideAndFormatWithPercentage(dividend, divisor) {
  // 确保除数不为零，避免除零错误
  if (divisor === 0) {
    throw new Error('除数不能为零')
  }

  // 计算结果
  const result = (dividend / divisor) * 100

  // 保留两位小数并加上百分号
  const formattedResult = result.toFixed(2) + '%'

  return formattedResult
}

function format_current_time() {
  // 获取当前时间
  const currentDate = new Date()

  // 获取月份、日期、小时和分钟，并进行格式化
  const month = currentDate.getMonth() + 1 // 月份从 0 开始，所以要加 1
  const day = currentDate.getDate()
  const hours = currentDate.getHours()
  const minutes = currentDate.getMinutes()

  // 格式化时间
  const formattedTime = `${month}/${day} ${padZero(hours)}:${padZero(minutes)}`

  // 输出格式化后的时间
  console.log(`Formatted current time: ${formattedTime}`)
  return formattedTime
}

// 补零函数
function padZero(num) {
  return num.toString().padStart(2, '0')
}

function scaleUpByNumber(number, wei = 18) {
  for (let i = 0; i < wei; i++) {
    number = number * 10
  }
  return Math.round(number)
}

function scaleDownByNumber(number, wei = 18) {
  for (let i = 0; i < wei; i++) {
    number = number / 10
  }
  return formatNumTen(number, 7)
}

function tokenIdToGif(tokenId) {
  const petImgList = [
    'm_l1.gif',
    'f_l1.gif',
    'f_l2.gif',
    'f_l3.gif',
    'f_l4.gif',
    'm_l1.gif',
    'm_l2.gif',
    'm_l3.gif',
    'm_l4.gif',
    'm_l2.gif',
  ]
  let lastId = `${tokenId}`.charAt(`${tokenId}`.length - 1)
  lastId = parseInt(lastId) || 0
  return petImgList[lastId]
}

function expToNftImg(lastName, exp, expList, tokenId) {
  let img = ''
  try {
    const l05 = 72
    const l69 = 216
    const m1029 = 453
    const f1029 = 777
    const nft = 23328
    if (lastName.endsWith('gif')) {
      if (lastName.includes('f_l')) {
        img = '/fmale'
      } else {
        img = '/male'
      }
    } else {
      if (lastName.includes('/fmale')) {
        img = '/fmale'
      } else {
        img = '/male'
      }
    }
    const fList = expList.filter(item => item.lv == 29)
    if (exp > fList[0].exp) {
      const cIndex = (tokenId * 1) % nft
      img += `/nft/${cIndex}.png`
    } else {
      let cLevel = 0
      let rAmount = 0
      expList.map((item) => {
        if (exp > item.exp) {
          cLevel = item.lv
        }
      })
      if (cLevel < 6) {
        rAmount = l05
      }
      if (cLevel > 5 && cLevel < 10) {
        rAmount = l69
      }
      if (cLevel > 9 && cLevel < 30) {
        if (img.includes('/fmale')) {
          rAmount = f1029
        } else {
          rAmount = m1029
        }
      }
      const cIndex = Math.floor(Math.random() * rAmount)
      img += `/l${cLevel}/${cIndex}.png`
    }
  } catch (error) {
    console.error(error)
  }
  return img
}

function verify_wallet(wallet) {
  // 校验前缀，长度、16进制
  // 正则表达式用于匹配以太坊钱包地址格式
  const addressRegex = /^0x[a-fA-F0-9]{40}$/
  const isValidAddress = addressRegex.test(wallet)
  return isValidAddress
}

function formatNumTen(money, length = 5) {
  let curZero = 1
  if (money) {
    if (length) {
      for (let i = 0; i < length; i++) {
        curZero *= 10
      }
    }
    return Math.round(money * curZero) / curZero
  } else {
    return 0
  }
}

function uid_code(uid) {
  const base34Chars = '123456789ABCDEFGHKMNPQRSTVWXYZ' // 34 进制的字符集
  let result = ''
  const length = base34Chars.length
  // 将 UID 转换为 34 进制
  while (uid > 0) {
    const remainder = uid % length
    result = base34Chars[remainder] + result
    uid = Math.floor(uid / length)
  }

  // 如果结果不够 6 位，则在开头添加零字符
  while (result.length < 6) {
    result = '0' + result
  }

  return result
}

/** 根据usdt 计算ffp的数量 */
async function usdt_ffp(usdt) {
  try {
    const systemConfig = await Config.findByPk(1)
    const ratio = systemConfig.ffp_eth
    const priceUsdt = systemConfig.eth_price
    const priceEth = formatNumTen(usdt / priceUsdt)
    const ffp = formatNumTen(priceEth / ratio)
    return ffp
  } catch {
    return usdt * 10
  }
}

function whereSqlLint(obj) {
  let sql = ''
  Object.keys(obj).map(item => {
    if (sql) {
      sql += `and ${item}=${obj[item]}`
    } else {
      sql += `where ${item}=${obj[item]}`
    }
  })
  return sql
}

function accordingIdGetTime(id) {
  let year = 0;
  let percent = 99;
  const fiveYear = 1000000000
  const fourYear = 2000000000
  const threeYear = 3000000000
  const twoYear = 4000000000
  const oneYear = 5000000000
  const now = 6300000000
  if (id > now) {
    year = 0
  }
  if (id <= now && id > oneYear) {
    year = 1
    percent = 90
  }
  if (id <= oneYear && id > twoYear) {
    year = 2
    percent = 80
  }
  if (id <= twoYear && id > threeYear) {
    year = 3
    percent = 70
  }
  if (id <= threeYear && id > fourYear) {
    year = 4
    percent = 60
  }
  if (id <= fourYear && id > fiveYear) {
    year = 5
    percent = 50
  }
  if (id < fiveYear) {
    year = 6
    percent = 20
  }
  return {year, percent}
}


function isLastDay(timestamp, diff) {
  const date = new Date()
  date.setDate(date.getDate() - diff)
  date.setHours(0,0,0,0)
  const startTimeStamp = date.getTime()
  const endTimeStamp = startTimeStamp + 24 * 60 * 60 * 1000; // 24小时的毫秒数
  // 判断给定的时间戳是否在时间范围内
  return timestamp >= startTimeStamp && timestamp < endTimeStamp;
}

/******************************Private method */

module.exports = {
  generateOrderNumber,
  timestampToTime,
  calculateWinner,
  raffle_prizes,
  get_current_time,
  divideAndFormatWithPercentage,
  format_current_time,
  verify_wallet,
  uid_code,
  usdt_ffp,
  tokenIdToGif,
  formatNumTen,
  scaleUpByNumber,
  scaleDownByNumber,
  whereSqlLint,
  expToNftImg,
  accordingIdGetTime,
  isLastDay,
  createToken
}
