const express = require('express')
const router = express.Router()
const user = require('./user.js')
const chain = require('./chain.js')
const manage = require('./manage.js')
const game = require('./game.js')

// const admin = require('./admin.js')
// admin.init_systemConfig()
// admin.init_manager()
// 用户路由
router.post('/user/login', user.login)
router.post('/user/update', user.updateInfo)
router.post('/user/check', user.userCheck)
router.post('/user/bindWallet', user.bindWallet)
router.get('/user/list', user.getUserList)
router.get('/user/subList', user.getSubUserList)
router.get('/user/userInfo', user.getUserInfo)
router.get('/user/createUser', user.createUserInfo)
router.get('/user/cancelCreateUser', user.cancelCreateUserInfo)

router.get('/game/begin', game.begin)
router.post('/game/end', game.end)


router.get('/system/getFfpAndEthPrice', chain.getFfpAndEthPrice)
router.get('/system/distributeRewards', chain.distributeRewards)
router.get('/system/distributePts', chain.distributePts)

router.get('/system/getConfig', manage.getConfigInfo)

// 管理后台接口
router.post('/dogAdmin/login', manage.login)
router.get('/dogAdmin/userInfo', manage.userInfo)
router.get('/dogAdmin/getUserList', manage.getUserList)
router.get('/dogAdmin/getUserInviteList', manage.getUserInviteList)
router.post('/dogAdmin/user/update', manage.updateUserInfo)
router.post('/dogAdmin/user/remove', manage.removeUser)
router.get('/dogAdmin/getPropsList', manage.getPropsList)
router.post('/dogAdmin/props/update', manage.updatePropsInfo)
router.post('/dogAdmin/props/remove', manage.removeProps)
router.get('/dogAdmin/getEventList', manage.getEventList)
router.post('/dogAdmin/event/update', manage.updateEventInfo)
router.post('/dogAdmin/event/remove', manage.removeEvent)
router.get('/dogAdmin/config/info', manage.getConfigInfo)
router.post('/dogAdmin/config/update', manage.updateConfigInfo)
router.get('/dogAdmin/home/info', manage.getHomeInfo)
router.get('/dogAdmin/admin/list', manage.getAdminList)
router.post('/dogAdmin/admin/update', manage.updateAdminInfo)
router.post('/dogAdmin/admin/remove', manage.removeAdminInfo)

router.get('/dogAdmin/pet/list', manage.getPetList)
router.post('/dogAdmin/pet/update', manage.updatePetInfo)
router.post('/dogAdmin/pet/remove', manage.removePetInfo)

router.get('/dogAdmin/prize/list', manage.getPrizeList)
router.post('/dogAdmin/prize/update', manage.updatePrizeInfo)
router.post('/dogAdmin/prize/remove', manage.removePrize)

router.get('/dogAdmin/exp/list', manage.getExpList)
router.post('/dogAdmin/exp/update', manage.updateExpList)
router.post('/dogAdmin/exp/remove', manage.removeLevel)
router.get('/dogAdmin/propsRecord/list', manage.getPropsRecordList)
router.post('/dogAdmin/propsRecord/update', manage.updateUserPropsList)
router.post('/dogAdmin/propsRecord/remove', manage.removeUserProps)
router.get('/dogAdmin/wallet/list', manage.getWalletList)
router.post('/dogAdmin/wallet/remove', manage.removeWallet)

module.exports = router
