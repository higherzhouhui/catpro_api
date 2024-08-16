const fs = require('fs')
const path = require('path')

const successResp = (resp, data, msg = 'success') => {
  return resp.send({
    code: 0,
    msg: msg,
    data: data
  })
}

function errorResp(resp, code, msg = 'error') {
  return resp.send({
    code: code,
    msg: msg,
    data: null
  })
}

function authErrorResp(resp) {
  return errorResp(resp, 401, 'token 不能为空')
}

function tokenInvalidateErrorResp(resp) {
  return errorResp(resp, 402, 'token 无效')
}

function paramErrorResp(resp) {
  return errorResp(resp, 400, '缺少必须的参数')
}

function system_config() {
  const config = fs.readFileSync(path.join(__dirname, '../data/config.json'))
  return JSON.parse(config)
}

function contract_addr() {
  const config = fs.readFileSync(path.join(__dirname, '../data/contract_addr.json'))
  return JSON.parse(config)
}

module.exports = {
  successResp,
  errorResp,
  authErrorResp,
  tokenInvalidateErrorResp,
  paramErrorResp,
  system_config,
  contract_addr
}
