'use client'

import { useCallback, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { createX402Client, type WalletAdapter as X402WalletAdapter } from 'x402-solana'
import { decodeXPaymentResponse } from 'x402-fetch'
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

  const walletAdapter = useMemo<X402WalletAdapter | null>(() => {
    if (!publicKey || !signTransaction) {
      return null
    }

    return {
      publicKey,
      address: publicKey.toBase58(),
      signTransaction,
    }
  }, [publicKey, signTransaction])

  const x402Client = useMemo(() => {
    if (!walletAdapter) {
      return null
    }

    try {
      return createX402Client({
        wallet: walletAdapter,
        network,
        rpcUrl,
      })
    } catch (clientError) {
      console.error('❌ Failed to create x402 Solana client:', clientError)
      return null
    }
  }, [walletAdapter, network, rpcUrl])

  const executeQuery = useCallback(
    async (request: X402QueryRequest): Promise<X402QueryResponse | null> => {
      if (!walletAdapter || !x402Client) {
        setError('请先连接 Solana 钱包')
        return null
      }

      try {
        setLoading(true)
        setError(null)
        setPaymentResponse(null)

        const response = await x402Client.fetch(API_ROUTE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })

        if (response.status === 402) {
          const body = await response.text()
          throw new Error(
            `Payment is still required: ${body || 'gateway returned 402 again'}`
          )
        }

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Query failed: ${response.status} ${response.statusText} ${errorText}`
          )
        }

        const data = await response.json()

        const paymentHeader =
          response.headers.get('X-Payment-Response') ||
          response.headers.get('x-payment-response')

        if (paymentHeader) {
          try {
            const decoded = decodeXPaymentResponse(paymentHeader)
            setPaymentResponse({
              success: true,
              transaction: decoded.transaction,
              network: decoded.network ?? network,
              amount: (decoded as any).amount,
              asset: (decoded as any).asset,
              timestamp: (decoded as any).timestamp ?? Date.now(),
            })
          } catch (decodeError) {
            console.warn('⚠️  Failed to decode payment response header:', decodeError)
          }
        }

        return {
          success: data.success ?? true,
          sqlQuery: data.sqlQuery ?? null,
          dbResults: Array.isArray(data.dbResults) ? data.dbResults : [],
          raw: data.raw ?? data,
        }
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
    [network, walletAdapter, x402Client]
  )

  return {
    loading,
    error,
    paymentResponse,
    executeQuery,
    isConnected: Boolean(connected && walletAdapter && x402Client),
    address,
  }
}
