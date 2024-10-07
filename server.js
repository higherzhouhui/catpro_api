const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const app = express()
const { token_auth, logger } = require('./api/middleware')
var multipart = require('connect-multiparty')
var log4js = require('log4js')
var bodyParser = require('body-parser')

if (process.env.NODE_ENV == 1) {
  require('dotenv').config({ path: './.env.dev' })
} else {
  require('dotenv').config({ path: './.env' })
}
require('./utils/swaggerUI')(app);

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ limit: '2mb', extended: false }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// Parse formdata data
app.use(multipart())

// Cache to store IP and request time
const rateLimitCache = new Map();

// Timer for cleaning old cache records
setInterval(() => {
  rateLimitCache.clear();
}, 20000); // Clear the cache every 20 seconds
// Request rate limiting middleware
const rateLimiter = (req, res, next) => {
  let ip = req.headers['authorization'] || req.body.id
  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, 1);
  } else {
    const count = rateLimitCache.get(ip);
    if (count >= 50) { // Maximum allowed request count
      return res.status(429).send('Too Many Requests');
    }
    rateLimitCache.set(ip, count + 1);
  }
  next();
};

app.use(rateLimiter);


// Cross-origin configuration
app.use(cors())

// Define the whitelist interfaces that do not require token verification
const white_list = [
  '/api/user/login',
  '/api/user/h5PcLogin',
  '/api/admin/migrateData',
  '/api/dogAdmin/login',
  '/api/system/resetTicket',
  '/api/system/getConfig',
  /^\/api\/nft\/\d+$/,
  '/api/system/getFfpAndEthPrice',
]
app.use((req, resp, next) => {
  const path = req.path // Get the request path
  // Check if the path is in the whitelist
  if (
    white_list.some((item) => {
      if (typeof item === 'string') {
        return item === path
      } else if (item instanceof RegExp) {
        return item.test(path)
      }
      return false
    })
  ) {
    return next()
  }
  token_auth(req, resp, next)
})
app.use(logger)

app.use('/api', require('./api/router'))

function system_logger() {
  log4js.configure({
    appenders: {
      out: { type: 'console' },
      app: {
        type: 'dateFile',
        filename: './logs/system/s',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: {
      default: { appenders: ['out', 'app'], level: 'debug' }
    }
  })
  var logger = log4js.getLogger('system')
  return logger
}

const port = process.env.INIT ? 10002 : process.env.SERVER_PORT
app.listen(port, function () {
  system_logger().info(`1.Api server is listen port: ${port}`)
})
