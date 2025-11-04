'use client'

import { useX402Payment } from '@/hooks/useX402Payment'
import { useX402SolanaPayment } from '@/hooks/useX402SolanaPayment'
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
 * 使用示例：
 * ```tsx
 * const { executeQuery, isConnected } = useX402PaymentAdapter()
 * const response = await executeQuery({ question: '...' })
 * ```
 */
export function useX402PaymentAdapter(): UseX402PaymentAdapterReturn {
  const activeChain = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as 'solana' | 'base') || 'solana'

  // Load both hooks conditionally
  const evmPayment = useX402Payment()
  const solanaPayment = useX402SolanaPayment()

  // Select appropriate hook based on active chain
  if (activeChain === 'solana') {
    return {
      ...solanaPayment,
      chain: 'solana',
    }
  } else {
    return {
      ...evmPayment,
      chain: 'base',
    }
  }
}
