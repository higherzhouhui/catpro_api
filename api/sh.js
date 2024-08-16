#!/usr/bin/env node

const { EPOCH_ID, EPOCH_NEXT_TIME } = require('./constants')
const { cache } = require('./database')
const cron = require('node-cron')
const { get_current_time } = require('./utils')

/**
 * 自动生成epoch
 */
async function make_epoch() {
  console.log('定时任务执行')
  // '0,4,8,12,16,20,24,28,32,36,40,44,48,52,56 * * * *',
  const task = cron.schedule('1/* * * * *', () => {
    console.log('定时任务执行时间:', new Date())
    update_epoch()
      .then(() => console.log('更新成功'))
      .catch((error) => console.log('cache 更新异常', error))
  })

  // task.stop()
}

async function update_epoch() {
  const epoch_id = await cache.get(EPOCH_ID)
  try {
    await cache.set(EPOCH_ID, parseInt(epoch_id + '') + 1 + '')
    const time = get_current_time() + 240
    await cache.set(EPOCH_NEXT_TIME, time)
  } catch (error) {
    console.log('cache 操作异常', error)
  }
}
