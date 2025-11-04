'use client'

/**
 * 链上下文 Hook
 *
 * 提供统一的链类型检测和选择逻辑，避免重复读取环境变量
 * 并为多链支持奠定基础
 *
 * 使用示例：
 * ```tsx
 * const { activeChain, isSolana, isBase } = useChainContext()
 *
 * if (isSolana) {
 *   // 仅在 Solana 模式时执行的代码
 * }
 * ```
 */

interface ChainContext {
  /** 当前活跃的区块链 */
  activeChain: 'solana' | 'base'
  /** 是否为 Solana 链 */
  isSolana: boolean
  /** 是否为 Base 链 */
  isBase: boolean
}

/**
 * 获取当前活跃链的上下文信息
 *
 * @returns 链上下文对象，包含链类型和布尔判断
 */
export function useChainContext(): ChainContext {
  const activeChain = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as 'solana' | 'base') || 'solana'

  return {
    activeChain,
    isSolana: activeChain === 'solana',
    isBase: activeChain === 'base',
  }
}
