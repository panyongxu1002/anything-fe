'use client'

import { useCallback, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { createX402Client } from 'x402-solana/client'
import type { X402QueryRequest, X402QueryResponse, X402PaymentResponse } from '@/types/x402'

const API_ROUTE = '/api/query'

interface UseX402SolanaPaymentReturn {
  loading: boolean
  error: string | null
  paymentResponse: X402PaymentResponse | null
  executeQuery: (request: X402QueryRequest) => Promise<X402QueryResponse | null>
  isConnected: boolean
  address: string | undefined
}

const decodeBase64 = (value: string): string => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value)
  }
  throw new Error('Base64 decoding is not supported in this environment')
}

const resolveNetwork = (raw?: string): 'solana' | 'solana-devnet' => {
  if (!raw) return 'solana-devnet'
  const normalized = raw.toLowerCase()
  if (normalized === 'solana' || normalized === 'solana-mainnet' || normalized === 'mainnet') {
    return 'solana'
  }
  if (normalized === 'solana-devnet' || normalized === 'devnet') {
    return 'solana-devnet'
  }
  return (normalized.startsWith('solana') ? normalized : `solana-${normalized}`) as
    | 'solana'
    | 'solana-devnet'
}

export function useX402SolanaPayment(): UseX402SolanaPaymentReturn {
  const { publicKey, signTransaction, connected } = useWallet()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentResponse, setPaymentResponse] = useState<X402PaymentResponse | null>(null)

  const address = useMemo(() => publicKey?.toBase58(), [publicKey])

  const network = useMemo(
    () => resolveNetwork(process.env.NEXT_PUBLIC_SOLANA_CLUSTER),
    []
  )
  const rpcUrl = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC, [])
  const walletAdapter = useMemo(() => {
    if (!publicKey || !signTransaction) return null

    return {
      publicKey: {
        toString: () => publicKey.toBase58(),
      },
      signTransaction: signTransaction,
    }
  }, [publicKey, signTransaction])

  const x402Client = useMemo(() => {
    if (!walletAdapter) return null
    try {
      return createX402Client({
        wallet: walletAdapter,
        network,
        rpcUrl,
      })
    } catch (err) {
      console.error('❌ Failed to create x402 Solana client:', err)
      return null
    }
  }, [walletAdapter, network, rpcUrl])

  const executeQuery = useCallback(
    async (request: X402QueryRequest): Promise<X402QueryResponse | null> => {
      if (!walletAdapter || !x402Client) {
        setError('Please connect your Solana wallet first')
        return null
      }

      try {
        setLoading(true)
        setError(null)
        setPaymentResponse(null)

        console.log('\n' + '='.repeat(60))
        console.log('🚀 Executing Query with Solana Wallet Payment')
        console.log('='.repeat(60))
        console.log('👛 Wallet Address:', address ?? 'unknown')
        console.log('📤 Request:', request)

        const response = await x402Client.fetch(API_ROUTE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          console.error('❌ Payment request failed:', response.status, errorBody)
          setError(
            `Payment request failed: ${response.status} ${response.statusText}`
          )
          return null
        }

        const data = await response.json()

        const paymentHeader =
          response.headers.get('X-Payment-Response') ||
          response.headers.get('x-payment-response')

        if (paymentHeader) {
          try {
            const decoded = JSON.parse(decodeBase64(paymentHeader)) as Record<
              string,
              unknown
            >
            const paymentInfo: X402PaymentResponse = {
              success: true,
              transaction:
                (decoded.transactionHash as string | undefined) ||
                (decoded.transactionId as string | undefined) ||
                (decoded.signature as string | undefined),
              network:
                (decoded.network as string | undefined) ||
                network,
              amount: decoded.amount as string | undefined,
              asset:
                (decoded.asset as string | undefined) ||
                (decoded.mint as string | undefined),
              timestamp:
                (decoded.timestamp as number | undefined) || Date.now(),
            }
            setPaymentResponse(paymentInfo)
            console.log('💳 Payment Response:', paymentInfo)
          } catch (decodeError) {
            console.warn('⚠️  Failed to decode payment response:', decodeError)
          }
        }

        console.log('✅ Query successful!')
        console.log('='.repeat(60) + '\n')

        const result: X402QueryResponse = {
          success: data.success ?? true,
          sqlQuery: data.sqlQuery ?? null,
          dbResults: Array.isArray(data.dbResults) ? data.dbResults : [],
          raw: data.raw ?? data,
        }

        return result
      } catch (err) {
        console.error('\n' + '❌'.repeat(30))
        console.error('❌ Query Execution Error:')
        console.error('❌ Error:', err)
        console.error('❌'.repeat(30) + '\n')

        setError(err instanceof Error ? err.message : 'Query execution failed')
        return null
      } finally {
        setLoading(false)
      }
    },
    [address, walletAdapter, x402Client, network]
  )

  return {
    loading,
    error,
    paymentResponse,
    executeQuery,
    isConnected: Boolean(connected && walletAdapter),
    address,
  }
}
