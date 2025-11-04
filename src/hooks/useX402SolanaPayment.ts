'use client'

import { useState, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { SolanaPaymentProcessor } from '@/hooks/payments/SolanaPaymentProcessor'
import type {
  X402QueryRequest,
  X402QueryResponse,
  X402PaymentResponse
} from '@/types/x402'

// Use local API route to avoid CORS issues
const API_ROUTE = '/api/query'

interface UseX402SolanaPaymentReturn {
  loading: boolean
  error: string | null
  paymentResponse: X402PaymentResponse | null
  executeQuery: (request: X402QueryRequest) => Promise<X402QueryResponse | null>
  isConnected: boolean
  address: string | undefined
}

export function useX402SolanaPayment(): UseX402SolanaPaymentReturn {
  const { connected, publicKey, signMessage } = useWallet()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentResponse, setPaymentResponse] = useState<X402PaymentResponse | null>(null)

  // Create Solana payment processor with wallet context
  const paymentProcessor = useMemo(() => {
    if (!connected || !publicKey || !signMessage) {
      return null
    }

    try {
      console.log('✅ Created SolanaPaymentProcessor with wallet:', publicKey.toString())

      const processor = new SolanaPaymentProcessor({
        gatewayUrl: process.env.NEXT_PUBLIC_X402_GATEWAY_URL ||
          'https://x402s.bedev.hubble-rpc.xyz',
        chainId: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet',
        debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
      })

      // Initialize processor with wallet
      processor.initialize({
        connected,
        publicKey,
        signMessage,
      })

      return processor
    } catch (err) {
      console.error('❌ Failed to create SolanaPaymentProcessor:', err)
      return null
    }
  }, [connected, publicKey, signMessage])

  // Execute query with user's wallet for payment
  const executeQuery = useCallback(
    async (request: X402QueryRequest): Promise<X402QueryResponse | null> => {
      if (!connected || !publicKey) {
        setError('Please connect your Solana wallet first')
        return null
      }

      if (!paymentProcessor) {
        setError('Payment processor not ready. Please try again.')
        return null
      }

      try {
        setLoading(true)
        setError(null)
        setPaymentResponse(null)

        console.log('\n' + '='.repeat(60))
        console.log('🚀 Executing Query with Solana Wallet Payment')
        console.log('='.repeat(60))
        console.log('👛 Wallet Address:', publicKey.toString())
        console.log('📤 Request:', request)

        // Build request URL and options
        const url = API_ROUTE
        const options: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }

        // Use payment processor to fetch with automatic 402 handling
        // It will automatically:
        // 1. Detect 402 Payment Required response
        // 2. Prompt user to sign payment with their wallet
        // 3. Retry request with payment proof
        const response = await paymentProcessor.fetchWithPayment<X402QueryResponse>(
          url,
          options
        )

        console.log('📊 Response:', {
          success: response.success,
          hasSqlQuery: !!response.sqlQuery,
          dbResultsCount: response.dbResults?.length || 0,
          hasPaymentInfo: !!response.paymentInfo,
        })

        // Extract payment info if available
        if (response.paymentInfo) {
          console.log('💳 Payment info:', response.paymentInfo)
          setPaymentResponse({
            success: true,
            transaction: response.paymentInfo.transactionHash ||
                        response.paymentInfo.signature,
            amount: response.paymentInfo.amount,
            asset: response.paymentInfo.asset,
            timestamp: response.paymentInfo.timestamp,
          } as X402PaymentResponse)
        }

        console.log('✅ Query successful!')
        console.log('='.repeat(60) + '\n')

        return response as X402QueryResponse
      } catch (err) {
        console.error('\n' + '❌'.repeat(30))
        console.error('❌ Query Execution Error:')
        console.error('❌ Error:', err)
        console.error('❌'.repeat(30) + '\n')

        const errorMessage = err instanceof Error ? err.message : 'Query execution failed'
        setError(errorMessage)
        return null
      } finally {
        setLoading(false)
      }
    },
    [connected, publicKey, paymentProcessor]
  )

  return {
    loading,
    error,
    paymentResponse,
    executeQuery,
    isConnected: connected,
    address: publicKey?.toString(),
  }
}
