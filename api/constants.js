const useChain = 'Sepolia'

const config = {
  Sepolia: {
    FfpTokenAddress: '0x1c8A4D2F76417a8065305afF4A5d4d1d52E2FB8C',
    FfpetNftAddress: '0xC9368Ea657a10091a3C1680D9e9d22602adda3c2',
    FfpetHookAddress: '0xB88f155Ab1c6Ae1839D9dd99113BF01bB0783753',
    FfpLotteryAddress: '0xB02B79a2FfA9a14443BF9e026E50d3619F03E0e5',
    FfpApiGateWayAddress: '0x10c57576eb02621e411c614549984dca261de5f3',
    FfpSettleAddress: '0x76dBA3F7C99Ab7CAfD6b83399285E53A3be26A84',
    SwapAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    EthAddress: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
    FfpTokenSaleAddress: '0x1FcF122c7b53dceb23cc1C8CBa1372F6C547c369',
    ChainId: '11155111',
    HOST_DOMAIN: '.forkfrenpet.com',
    rpcUrl1: 'https://sepolia.infura.io/v3/185ac6ce977d4a828c4d4445ce0cd770',
    rpcUrl: 'https://sepolia.infura.io/v3/ee31a41ab5f849e29396c4233e84f181',
    rpcUrlWss: 'wss://sepolia.infura.io/ws/v3/ee31a41ab5f849e29396c4233e84f181',
  },
  Base: {
    FfpTokenAddress: '0x1c8A4D2F76417a8065305afF4A5d4d1d52E2FB8C',
    FfpetNftAddress: '0xC9368Ea657a10091a3C1680D9e9d22602adda3c2',
    FfpetHookAddress: '0xB88f155Ab1c6Ae1839D9dd99113BF01bB0783753',
    FfpLotteryAddress: '0xB02B79a2FfA9a14443BF9e026E50d3619F03E0e5',
    FfpApiGateWayAddress: '0x36a4Ae9d5fBBF1Ed868C9d09C1ab61C258582a31',
    FfpSettleAddress: '0x76dBA3F7C99Ab7CAfD6b83399285E53A3be26A84',
    SwapAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    EthAddress: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
    FfpTokenSaleAddress: '0x1FcF122c7b53dceb23cc1C8CBa1372F6C547c369',
    ChainId: '8453',
    HOST_DOMAIN: '.forkfrenpet.com',
    rpcUrl1: 'https://sepolia.infura.io/v3/185ac6ce977d4a828c4d4445ce0cd770',
    rpcUrl: 'https://sepolia.infura.io/v3/ee31a41ab5f849e29396c4233e84f181',
  },
}

module.exports = {
  JWT_KEY: '2ISEA%#5Q1!#',
  TW_OAUTH_URL: 'https://api.twitter.com/oauth/authorize?oauth_token=',
  DEFAULT_HEAD_IMG:
    'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
  SOCIAL_URL: 'https://api.socialdata.tools/twitter/',
  SOCIAL_TOKEN: 'Bearer 53|3EtlzL951asQUUbShUxiuM3lqhV7jXJoaTuGKqpPae560982',
  API_HOST: 'https://test.forkfrenpet.com/api/v2',
  WEB_HOST: 'https://ftest.forkfrenpet.com',

  RECIVE_WALLET: '0x9702ed2e924f17c303dae6562723659ea55641c9',
  CONTRACT_ADDR: '0x55ab0390a89fed8992e3affbf61d102490735e24',
  TWITTER_ID: '1600896774780043264',
  MY_ID: '984229745322639360',
  EPOCH_ID: 'epoch_id',
  EPOCH_NEXT_TIME: 'epoch_next_time',
  PREV_FEED_UID: 'prev_feed_uid',
  PREV_BUY_UID: 'prev_buy_uid',
  ETH_SWAP_TOKEN: 'eth_swap_token',
  ETH_PRICE: 'eth_price',

  PRIVATE_KEY:
    'c41e8ee5b9588dd95d9eb955f50f174b2db36b6fcb1707f736cc53e2827ce7a6',
  WALLET: '0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee',

  PRIVATE_KEY1:
    '58e18444e82dd365bde83961a441d2a45d15e04525b0b8e0a0d272cb53281382',
  WALLET1: '0xE65C31b766aEe28E6F6692f50f66fF8e08900720',

  PET_NFT_CONTRACT: '0xC9368Ea657a10091a3C1680D9e9d22602adda3c2',
  FFP_TOKEN_CONTRACT: '0x1c8A4D2F76417a8065305afF4A5d4d1d52E2FB8C',
  GATEWAY_CONTRACT: '0x36a4Ae9d5fBBF1Ed868C9d09C1ab61C258582a31',
  SETTLE_CONTRACT: '0xa8f544cFd881a9efF57aB512BbCf9A4c69C5e7c3',
  SWAP_ROUTER: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',

  CHAIN_ID: 11155111,
  DAPP_NAME: 'fpet dapp',
  DAPP_VERSION: '1.1',
  WALLET_INDEX_KEY: 'wallet_index',
  CURVE_A: 15,
  BLOCK_START_KEY: 'block_start',
  BOOST_TOTAL: 10,
  BaseConfig: config[useChain]
}
