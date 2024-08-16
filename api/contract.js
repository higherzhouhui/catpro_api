const { ethers } = require('ethers')
const { PET_NFT_CONTRACT } = require('./constants')

// 与以太坊节点连接
const provider = new ethers.providers.JsonRpcProvider(
  'https://mainnet.infura.io/v3/3ee083eb780d4bb38982f6eac516a1e9'
)

// 以太坊主网的 Uniswap V2 工厂合约地址
const factoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

// Uniswap V2 工厂合约 ABI
const factoryAbi = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
]

// 要查询的代币地址
const tokenAAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH (Wrapped Ether)
const tokenBAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI

async function eth2ffp() {
  const factoryContract = new ethers.Contract(
    factoryAddress,
    factoryAbi,
    provider
  )

  // 获取代币对应的交易对地址
  const pairAddress = await factoryContract.getPair(
    tokenAAddress,
    tokenBAddress
  )

  // 交易对合约 ABI
  const pairAbi = [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
  ]

  const pairContract = new ethers.Contract(pairAddress, pairAbi, provider)

  // 获取交易对储备量
  const reserves = await pairContract.getReserves()

  // 储备量单位转换，假设第一个代币为 WETH，第二个代币为 DAI
  const wethReserve = parseFloat(reserves.reserve0.toString()) / 10 ** 18
  const daiReserve = parseFloat(reserves.reserve1.toString()) / 10 ** 18

  // 计算价格，假设 1 WETH = X DAI
  const price = daiReserve / wethReserve
  const rate = 1 / price
  console.log(`1 eth 兑换 ${rate}个DAI`)
  return rate
}

async function monitor_ffp_claim() {
  const abi = [
    'event FPetClaim(address indexed addr,address indexed nft,uint256 tokenId)'
  ]
  const ffp = new ethers.Contract(PET_NFT_CONTRACT, abi,provider)
  ffp.on('FPetClaim',(addr,nft,tokenId) => {
    console.log(`${addr} get a nft ${nft},id: ${tokenId}`)
  } )
}

async function contract_event() {
  const uniswap_addr = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
  const abi = [
    'event Transfer(address indexed from, address indexed to, uint256 amount)',
    'function balanceOf(address account) external view returns (uint)'
  ]
  const uniswap = new ethers.Contract(uniswap_addr, abi, provider)
  const balance = await uniswap.balanceOf(
    '0x96e3C57AEc80A2DEA822c38BFfA52493Aae626Ee'
  )
  console.log('aaa:', balance)

  uniswap.on('Transfer', (from, to, amount, event) => {
    console.log(`${from} sent ${formatEther(amount)} to ${to}`)
  })
}

async function get_wallet_nftid(wallet) {
  const abi = ['function tokenId(address owner) public view returns (uint256)']
  const nft_contract = new ethers.Contract(PET_NFT_CONTRACT, abi, provider)
  const nft_id = await nft_contract.tokenId(wallet)
  console.log('nft_id:', nft_id)

  uniswap.on('Transfer', (from, to, amount, event) => {
    console.log(`${from} sent ${formatEther(amount)} to ${to}`)
  })
}

module.exports = {
  eth2ffp,
  monitor_ffp_claim
}

// contract_event()
get_wallet_nftid('0x183f8Df38DAF42Cec545415462e9ec11b9044e02')