/**
 * 多链 Block Explorer 链接生成器
 *
 * 支持 Solana devnet/mainnet 和 Base 链的交易链接生成
 */

import { getSolanaExplorerUrl } from './solana'

type ChainType = 'solana' | 'base'
type ExplorerType = 'tx' | 'address' | 'token'

/**
 * 生成 Block Explorer 链接
 *
 * @param chain 区块链类型 ('solana' 或 'base')
 * @param type 链接类型 ('tx' 交易, 'address' 地址, 'token' 代币)
 * @param value 要链接的值（交易哈希、地址或代币合约）
 * @returns Block Explorer URL
 *
 * @example
 * // Solana devnet 交易
 * getExplorerUrl('solana', 'tx', '5kL...')
 * // => 'https://explorer.solana.com/tx/5kL...?cluster=devnet'
 *
 * // Base 交易
 * getExplorerUrl('base', 'tx', '0x123...')
 * // => 'https://basescan.io/tx/0x123...'
 */
export function getExplorerUrl(
  chain: ChainType,
  type: ExplorerType,
  value: string
): string {
  if (chain === 'solana') {
    return getSolanaExplorerUrl(type, value)
  }

  // Base chain 链接
  const baseExplorer = 'https://basescan.io'

  switch (type) {
    case 'tx':
      return `${baseExplorer}/tx/${value}`
    case 'address':
      return `${baseExplorer}/address/${value}`
    case 'token':
      return `${baseExplorer}/token/${value}`
    default:
      return baseExplorer
  }
}

/**
 * 生成交易链接
 *
 * @param chain 区块链类型
 * @param txHash 交易哈希
 * @returns 交易的 Block Explorer URL
 */
export function getTxExplorerUrl(chain: ChainType, txHash: string): string {
  return getExplorerUrl(chain, 'tx', txHash)
}

/**
 * 生成地址链接
 *
 * @param chain 区块链类型
 * @param address 钱包地址
 * @returns 地址的 Block Explorer URL
 */
export function getAddressExplorerUrl(chain: ChainType, address: string): string {
  return getExplorerUrl(chain, 'address', address)
}

/**
 * 生成代币链接
 *
 * @param chain 区块链类型
 * @param tokenAddress 代币合约地址或 mint 地址
 * @returns 代币的 Block Explorer URL
 */
export function getTokenExplorerUrl(chain: ChainType, tokenAddress: string): string {
  return getExplorerUrl(chain, 'token', tokenAddress)
}

/**
 * 获取链的显示名称
 *
 * @param chain 区块链类型
 * @returns 链的显示名称
 */
export function getChainDisplayName(chain: ChainType): string {
  switch (chain) {
    case 'solana':
      return 'Solana'
    case 'base':
      return 'Base'
    default:
      return 'Unknown'
  }
}

/**
 * 获取链的符号（货币单位）
 *
 * @param chain 区块链类型
 * @returns 链的原生货币符号
 */
export function getChainNativeSymbol(chain: ChainType): string {
  switch (chain) {
    case 'solana':
      return 'SOL'
    case 'base':
      return 'ETH'
    default:
      return 'UNKNOWN'
  }
}

/**
 * 获取链的支付代币信息
 *
 * @param chain 区块链类型
 * @returns 支付代币符号和小数位
 */
export function getChainPaymentToken(chain: ChainType): { symbol: string; decimals: number } {
  switch (chain) {
    case 'solana':
      return { symbol: 'USDC', decimals: 6 }
    case 'base':
      return { symbol: 'USDC', decimals: 6 }
    default:
      return { symbol: 'UNKNOWN', decimals: 0 }
  }
}
