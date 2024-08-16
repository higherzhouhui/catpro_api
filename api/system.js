const { successResp, system_config, errorResp } = require('./common')
const { EPOCH_ID, EPOCH_NEXT_TIME } = require('./constants')
const { cache, Op } = require('./database')
const { FFP, User, Pet } = require('./models')
const { divideAndFormatWithPercentage } = require('./utils')

/**
 * 获取ffp信息
 * @param {*} req
 * @param {*} resp
 * @returns
 */
async function ffp_info(req, resp) {
  const config = system_config()
  let epoch_id = await cache.get(EPOCH_ID)
  const epoch_next_time = await cache.get(EPOCH_NEXT_TIME)
  let uid = req.uid
  let input_data = `data:{"p":"erc-20","op":"mint","tick":"#FFP","supply":${config.ffp_supply},"limit":${config.ffp_limit}}`

  if (req.query.id && req.query.id > 0) {
    uid = req.query.id
  }
  console.log('uid', uid)
  const user = await User.findByPk(uid)
  if (!user) {
    return errorResp(resp, 400)
  }
  console.log(user.id, user.nick_name)
  console.log('box:', user.box_type2_amount)
  console.log(user.box_type2_amount)
  const holders = await User.count({
    where: { pets: { [Op.gt]: 0 } }
  })
  const pets = await Pet.count()

  const box_amount =
    user.box_type1_amount +
    user.box_type2_amount +
    user.box_type3_amount +
    user.box_type4_amount
  console.log(box_amount)
  const data = {
    uid: parseInt(uid),
    coins: user.coins,
    ffp: user.ffp,
    pts: user.pts,
    exp: user.exp,
    box: 20,
    mine_amount: user.pets,
    holders: holders,
    percent: divideAndFormatWithPercentage(holders * 10000, config.ffp_supply),
    protocol: 'erc20',
    supply: config.ffp_supply,
    minted: pets,
    input_data: input_data,
    current_epoch: epoch_id,
    next: epoch_next_time,
    allow_mint: config.allow_mint
  }
  successResp(resp, data)
}

async function ffp_create() {
  const data = {
    total: 772200,
    holders: 12865,
    percent: '11.54%',
    pro: 'erc-20',
    data: '{"p":"erc-20","op":"mint","tick":"#FFP","max":"772200","lim":"777"}',
    hash: '72606550DB754E17',
    current_epoch: 7560,
    minted: 7980,
    server: 1707204000,
    next: 1706695680
  }
  try {
    FFP.create(data)
    console.log('success')
  } catch (error) {
    console.log('error', error)
  }
}

async function ffp_update_epoch() {
  const server_time = 1707204000
  const next_time = 1707204000
  const current_epoch = 7860

  const ffp = await FFP.update(
    {
      server: server_time,
      next: next_time,
      current_epoch: current_epoch
    },
    { where: { total: 772200 } }
  )
}

async function ffp_update_holders(holders) {
  const ffp = await FFP.update(
    {
      holders: holders
    },
    { where: { id: 1 } }
  )
}

async function get_epoch_id() {
  cache
    .get(EPOCH_ID)
    .then((value) => {
      return value
    })
    .catch(() => {
      return 0
    })
}

module.exports = {
  ffp_info,
  ffp_update_epoch,
  ffp_update_holders,
  get_epoch_id
}
