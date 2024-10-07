const { Prize, Config } = require('./models')
const jwt = require('jsonwebtoken')
const SECRET_KEY = 'CAT_API'
var log4js = require('log4js')

function createToken(data) {
  const token = jwt.sign(
    { user: {username: data.username, id: data.user_id} },
    SECRET_KEY,
    { expiresIn: '10 days' }
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

  // Convert UID to a string, ensuring the length is 7, and prepend zeros if it's shorter
  const formattedUid = String(uid).padStart(8, '0')

  const randomSuffix = Math.floor(Math.random() * 1000000) // Generate a 3-digit random number

  const orderNumber = `${year}${month}${day}${hours}${minutes}${seconds}${formattedUid}${randomSuffix}`
  return orderNumber
}

function timestampToTime(timestamp) {
  const date = new Date(timestamp * 1000) // Create a Date object using the timestamp as a parameter
  const year = date.getFullYear() // Get the year
  const month = date.getMonth() + 1 // Get the month (note: months start from 0, so add 1)
  const day = date.getDate() // Get the date
  const hours = date.getHours() // Get the hour
  const minutes = date.getMinutes() // Get the minute
  const seconds = date.getSeconds() // Get the seconds

  // Format the output
  const formattedDate = `${year}-${pad(month)}-${pad(day)}`
  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`

  return `${formattedDate} ${formattedTime}`
}

function pad(num) {
  return num < 10 ? '0' + num : num
}

/**
 * Calculate the winning move of the attack
 * @param {*} playerA
 * @param {*} coefA
 * @param {*} palyerB
 * @param {*} coefB
 * @returns (Winner, Loser) object
 */

// Currently, control the attacker’s win rate: 60% against friends; 70% higher than the opponent's level; 50% lower than the opponent's level; 65% at the same level.
async function calculateWinner(playerA, playerB) {
  // Attacker's win rate increases by 10%
  const systemConfig = await Config.findByPk(1)
  let ratio = 0
  // First, establish the relationship
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
 * Lottery program.
 * @returns Prize object
 */
async function raffle_prizes() {
  const prizes = await Prize.findAll({
    where: { visible: 1 }
  })

  // Calculate the overall winning probability
  const totalProbability = prizes.reduce((acc, prize) => acc + prize.weight, 0)
  const randomValue = Math.random() * totalProbability // Generate a random number between 0 and the total probability
  let cumulativeProbability = 0

  for (const prize of prizes) {
    cumulativeProbability += prize.weight // Cumulative winning probability of the prizes
    if (randomValue <= cumulativeProbability) {
      return prize // Return the name of the winning prize
    }
  }

  return prizes[0] // If not won, return the corresponding message
}

function get_current_time() {
  return Math.floor(new Date().getTime() / 1000)
}

/**
 * Calculate the percentage of two numbers
 * @param {*} dividend
 * @param {*} divisor
 * @returns
 */
function divideAndFormatWithPercentage(dividend, divisor) {
  // Ensure the divisor is not zero to avoid division by zero errors
  if (divisor === 0) {
    throw new Error('The divisor cannot be zero')
  }

  // Calculate the result
  const result = (dividend / divisor) * 100

  // Keep two decimal places and add a percentage sign
  const formattedResult = result.toFixed(2) + '%'

  return formattedResult
}

function format_current_time() {
  // Get the current time
  const currentDate = new Date()

  // Get the month, date, hour, and minute, and format them
  const month = currentDate.getMonth() + 1 // Months start from 0, so add 1
  const day = currentDate.getDate()
  const hours = currentDate.getHours()
  const minutes = currentDate.getMinutes()

  // Format the time
  const formattedTime = `${month}/${day} ${padZero(hours)}:${padZero(minutes)}`

  // Output the formatted time
  console.log(`Formatted current time: ${formattedTime}`)
  return formattedTime
}

// Zero-padding function
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
  // Validate prefix, length, and hexadecimal format
  // Regular expression to match Ethereum wallet address format
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
  const base34Chars = '123456789ABCDEFGHKMNPQRSTVWXYZ' // Base 34 character set
  let result = ''
  const length = base34Chars.length
  // Convert UID to base 34
  while (uid > 0) {
    const remainder = uid % length
    result = base34Chars[remainder] + result
    uid = Math.floor(uid / length)
  }

  // If the result is less than 6 digits, prepend zero characters
  while (result.length < 6) {
    result = '0' + result
  }

  return result
}

/** Calculate the quantity of FFP based on USDT */
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
  const endTimeStamp = startTimeStamp + 24 * 60 * 60 * 1000; // Milliseconds in 24 hours
  // Check if the given timestamp is within the time range
  return timestamp >= startTimeStamp && timestamp < endTimeStamp;
}


// Configure log output
function logger_self(type) {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: `./logs/${type}/${type}`,
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger(type)
  return logger
}

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
  createToken,
  logger_self
}
