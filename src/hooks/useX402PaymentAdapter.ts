'use client'

import { useX402SolanaPayment } from '@/hooks/useX402SolanaPayment'
import { useChainContext } from '@/hooks/useChainContext'
import type {
  X402QueryRequest,
  X402QueryResponse,
  X402PaymentResponse
} from '@/types/x402'

interface UseX402PaymentAdapterReturn {
  loading: boolean
  error: string | null
  paymentResponse: X402PaymentResponse | null
  executeQuery: (request: X402QueryRequest) => Promise<X402QueryResponse | null>
  isConnected: boolean
  address: string | undefined
  chain: 'solana' | 'base'
}

/**
 * Multi-chain payment adapter hook
 *
 * 自动根据 NEXT_PUBLIC_ACTIVE_CHAIN 环境变量选择合适的支付处理器
 *
 * 改进点：
 * - 条件化 hook 调用，符合 React Hook 规则
 * - 只初始化活跃链的支付处理器
 * - 使用 useChainContext 统一管理链状态
 *
 * 使用示例：
 * ```tsx
 * const { executeQuery, isConnected, chain } = useX402PaymentAdapter()
 * const response = await executeQuery({ question: '...' })
 * ```
 */
export function useX402PaymentAdapter(): UseX402PaymentAdapterReturn {
  const { activeChain, isSolana } = useChainContext()

  if (!isSolana) {
    throw new Error(`当前项目仅支持 Solana 链，收到的链类型：${activeChain}`)
  }

  const solanaPayment = useX402SolanaPayment()

  return {
    loading: solanaPayment.loading,
    error: solanaPayment.error,
    paymentResponse: solanaPayment.paymentResponse,
    executeQuery: solanaPayment.executeQuery,
    isConnected: solanaPayment.isConnected,
    address: solanaPayment.address,
    chain: 'solana',
  }
}
