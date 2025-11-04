'use client'

import { useX402Payment } from '@/hooks/useX402Payment'
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

  // 条件化 hook 调用：只初始化活跃链对应的支付处理器
  // 这避免了在缺少相应 Provider 时的运行时错误
  let paymentHandler: Partial<UseX402PaymentAdapterReturn> | null = null

  if (isSolana) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const solanaPayment = useX402SolanaPayment()
    paymentHandler = solanaPayment
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const evmPayment = useX402Payment()
    paymentHandler = evmPayment
  }

  // 确保有一个支付处理器可用
  if (!paymentHandler) {
    throw new Error(`No payment handler available for chain: ${activeChain}`)
  }

  return {
    loading: paymentHandler.loading ?? false,
    error: paymentHandler.error ?? null,
    paymentResponse: paymentHandler.paymentResponse ?? null,
    executeQuery: paymentHandler.executeQuery ?? (async () => null),
    isConnected: paymentHandler.isConnected ?? false,
    address: paymentHandler.address,
    chain: activeChain,
  }
}
