'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createSigner } from 'x402-fetch'
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
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentResponse, setPaymentResponse] = useState<X402PaymentResponse | null>(null)
  const [processor, setProcessor] = useState<SolanaPaymentProcessor | null>(null)
  const [address, setAddress] = useState<string | undefined>(undefined)

  const gatewayUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_X402_GATEWAY_URL ||
      'https://x402s.bedev.hubble-rpc.xyz/lego/api/v1/query'
    )
  }, [])

  const cluster = useMemo(() => {
    const raw =
      (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'solana-devnet').toLowerCase()
    if (raw.startsWith('solana')) {
      return raw
    }
    return `solana-${raw}`
  }, [])
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC
  const debug = process.env.NEXT_PUBLIC_DEBUG === 'true'
  const privateKey = process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY

  useEffect(() => {
    let cancelled = false

    async function setup() {
      if (!privateKey) {
        setError('Missing NEXT_PUBLIC_SOLANA_PRIVATE_KEY environment variable')
        setInitializing(false)
        return
      }

      try {
        setInitializing(true)
        setError(null)

        const signer = await createSigner(cluster, privateKey)

        const paymentProcessor = new SolanaPaymentProcessor({
          gatewayUrl,
          chainId: cluster,
          debug,
          rpcUrl,
        })

        paymentProcessor.initialize(signer)

        if (!cancelled) {
          setProcessor(paymentProcessor)
          const signerAddress = paymentProcessor.getAddress() ?? undefined
          setAddress(signerAddress)
          console.log('✅ Solana signer ready:', signerAddress ?? 'unknown')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to initialize Solana signer:', err)
          setError(
            err instanceof Error ? err.message : 'Failed to initialize Solana signer'
          )
        }
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [cluster, debug, gatewayUrl, privateKey, rpcUrl])

  const executeQuery = useCallback(
    async (request: X402QueryRequest): Promise<X402QueryResponse | null> => {
      if (!processor) {
        setError('Solana payment processor not ready. Check private key configuration.')
        return null
      }

      try {
        setLoading(true)
        setError(null)
        setPaymentResponse(null)

        console.log('\n' + '='.repeat(60))
        console.log('🚀 Executing Query with Solana Private Key Payment')
        console.log('='.repeat(60))
        if (address) {
          console.log('👛 Signer Address:', address)
        }
        console.log('📤 Request:', request)

        const response = await processor.fetchWithPayment<X402QueryResponse>(API_ROUTE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })

        console.log('📊 Response:', {
          success: response.success,
          hasSqlQuery: !!response.sqlQuery,
          dbResultsCount: response.dbResults?.length || 0,
          hasPaymentInfo: !!response.paymentInfo,
        })

        if (response.paymentInfo) {
          console.log('💳 Payment info:', response.paymentInfo)
          const info = response.paymentInfo
          const extendedInfo = info as unknown as Record<string, unknown>
          setPaymentResponse({
            success: true,
            transaction:
              (extendedInfo.transactionHash as string | undefined) ||
              info.transaction ||
              'unknown',
            amount: info.amount,
            asset: info.asset,
            timestamp: info.timestamp,
            network: info.network,
          })
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
    [address, processor]
  )

  return {
    loading: loading || initializing,
    error,
    paymentResponse,
    executeQuery,
    isConnected: Boolean(processor),
    address,
  }
}
