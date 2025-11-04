/**
 * Solana 链配置
 *
 * 包含 Solana devnet 和 mainnet 的所有配置项
 * 通过环境变量可以动态切换
 */

import { clusterApiUrl } from '@solana/web3.js';

/**
 * Solana 集群类型
 */
export type SolanaCluster = 'devnet' | 'testnet' | 'mainnet-beta';

/**
 * Solana 配置接口
 */
export interface SolanaConfig {
  /** 集群名称 */
  cluster: SolanaCluster;

  /** Solana RPC 端点 */
  rpc: string;

  /** x402 支付网关 URL */
  gatewayUrl: string;

  /** USDC SPL Token mint 地址 */
  usdcMint: string;

  /** 支持的钱包适配器名称 */
  wallets: string[];

  /** Block Explorer 基础 URL */
  explorerBaseUrl: string;

  /** 是否启用调试模式 */
  debug: boolean;

  /**
   * PayAI Network facilitator 配置
   * 参考：https://docs.payai.network/introduction
   */
  payai?: {
    /** Facilitator URL */
    facilitatorUrl?: string;

    /** Facilitator API 密钥（如果需要） */
    apiKey?: string;
  };
}

/**
 * Devnet 配置 - 用于开发和测试
 *
 * USDC mint: Gh9ZwEmdLJ8DscKQV6DgaLqRjzPxEKaDkKjNraboLKxw (devnet 标准)
 * 水龙头: https://faucet.circle.com/
 */
export const solanDevnetConfig: SolanaConfig = {
  cluster: 'devnet',
  rpc: process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl('devnet'),
  gatewayUrl:
    process.env.NEXT_PUBLIC_X402_GATEWAY_URL ||
    'https://x402s.bedev.hubble-rpc.xyz',
  usdcMint:
    process.env.NEXT_PUBLIC_USDC_MINT ||
    'Gh9ZwEmdLJ8DscKQV6DgaLqRjzPxEKaDkKjNraboLKxw', // devnet USDC
  wallets: ['Phantom', 'Solflare', 'Backpack'],
  explorerBaseUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL ||
    'https://explorer.solana.com',
  debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
  payai: {
    facilitatorUrl: process.env.NEXT_PUBLIC_PAYAI_FACILITATOR_URL,
    apiKey: process.env.NEXT_PUBLIC_PAYAI_API_KEY,
  },
};

/**
 * Mainnet 配置 - 用于生产环境
 *
 * USDC mint: EPjFWaLb3odccccjorSrgSsqXM6JN4mC4Yvs4P4YGAW (mainnet 标准)
 */
export const solanaMainnetConfig: SolanaConfig = {
  cluster: 'mainnet-beta',
  rpc: process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl('mainnet-beta'),
  gatewayUrl:
    process.env.NEXT_PUBLIC_X402_GATEWAY_URL ||
    'https://x402s.bedev.hubble-rpc.xyz', // TODO: 生产网关 URL
  usdcMint:
    process.env.NEXT_PUBLIC_USDC_MINT ||
    'EPjFWaLb3odccccjorSrgSsqXM6JN4mC4Yvs4P4YGAW', // mainnet USDC
  wallets: ['Phantom', 'Solflare', 'Backpack'],
  explorerBaseUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL ||
    'https://explorer.solana.com',
  debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
  payai: {
    facilitatorUrl: process.env.NEXT_PUBLIC_PAYAI_FACILITATOR_URL,
    apiKey: process.env.NEXT_PUBLIC_PAYAI_API_KEY,
  },
};

/**
 * 根据环境变量获取 Solana 配置
 *
 * @returns Solana 配置对象
 */
export function getSolanaConfig(): SolanaConfig {
  const cluster = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ||
    'devnet') as SolanaCluster;

  switch (cluster) {
    case 'mainnet-beta':
      return solanaMainnetConfig;
    case 'testnet':
      return solanDevnetConfig; // testnet 暂未配置，使用 devnet
    case 'devnet':
    default:
      return solanDevnetConfig;
  }
}

/**
 * 便捷函数：获取 Block Explorer 链接
 *
 * @param type 链接类型: 'tx' (交易), 'address' (地址)
 * @param value 交易哈希或地址
 * @returns Block Explorer URL
 *
 * @example
 * const txUrl = getSolanaExplorerUrl('tx', '5kL...');
 * const addrUrl = getSolanaExplorerUrl('address', 'So1...');
 */
export function getSolanaExplorerUrl(
  type: 'tx' | 'address' | 'token',
  value: string
): string {
  const config = getSolanaConfig();
  const baseUrl = config.explorerBaseUrl;
  const cluster = config.cluster === 'devnet' ? '?cluster=devnet' : '';

  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}${cluster}`;
    case 'address':
      return `${baseUrl}/address/${value}${cluster}`;
    case 'token':
      return `${baseUrl}/token/${value}${cluster}`;
    default:
      return baseUrl;
  }
}

/**
 * 便捷函数：格式化 Solana 地址显示
 *
 * @param address 完整的 Solana 地址
 * @param startChars 开头显示字符数（默认 4）
 * @param endChars 结尾显示字符数（默认 4）
 * @returns 缩短后的地址 (如: "So1n...gAW")
 *
 * @example
 * const short = formatSolanaAddress('So11111111111111111111111111111111111111112');
 * // => "So1n...1111"
 */
export function formatSolanaAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * 便捷函数：格式化 Solana 签名（交易哈希）显示
 *
 * @param signature Solana 签名 (88 个字符)
 * @param startChars 开头显示字符数（默认 8）
 * @param endChars 结尾显示字符数（默认 8）
 * @returns 缩短后的签名
 *
 * @example
 * const short = formatSolanaSignature('5kL1Zw4...');
 * // => "5kL1Zw4...XXXXXXXX"
 */
export function formatSolanaSignature(
  signature: string,
  startChars: number = 8,
  endChars: number = 8
): string {
  if (signature.length <= startChars + endChars) {
    return signature;
  }
  return `${signature.slice(0, startChars)}...${signature.slice(-endChars)}`;
}

/**
 * Solana SPL Token decimals
 * USDC 在 Solana 上使用 6 位小数
 */
export const SOLANA_USDC_DECIMALS = 6;

/**
 * 便捷函数：将 raw amount 转换为 USDC 显示值
 *
 * @param amount 原始金额 (以最小单位计，如 lamports)
 * @param decimals 小数位数（默认 6 for USDC）
 * @returns 格式化后的金额字符串
 *
 * @example
 * const display = formatSolanaAmount('1000000');  // => "1.000000"
 * const display = formatSolanaAmount('1500000', 6);  // => "1.500000"
 */
export function formatSolanaAmount(
  amount: string | number,
  decimals: number = SOLANA_USDC_DECIMALS
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const divisor = Math.pow(10, decimals);
  return (num / divisor).toFixed(decimals);
}

/**
 * 导出所有配置和工具函数
 */
export const solanaConfig = {
  devnet: solanDevnetConfig,
  mainnet: solanaMainnetConfig,
  getConfig: getSolanaConfig,
  getExplorerUrl: getSolanaExplorerUrl,
  formatAddress: formatSolanaAddress,
  formatSignature: formatSolanaSignature,
  formatAmount: formatSolanaAmount,
  USDC_DECIMALS: SOLANA_USDC_DECIMALS,
};
