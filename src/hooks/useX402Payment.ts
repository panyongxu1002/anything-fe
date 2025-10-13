'use client'

import { useState, useCallback } from 'react'
import type {
  X402QueryRequest,
  X402QueryResponse,
  X402PaymentResponse
} from '@/types/x402'

// Use local API route - all payment logic happens server-side
const API_ROUTE = '/api/query'

interface UseX402PaymentReturn {
  loading: boolean
  error: string | null
  paymentResponse: X402PaymentResponse | null
  executeQuery: (request: X402QueryRequest) => Promise<X402QueryResponse | null>
}

export function useX402Payment(): UseX402PaymentReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentResponse, setPaymentResponse] = useState<X402PaymentResponse | null>(null)

  // Execute query - all payment logic handled server-side
  const executeQuery = useCallback(async (request: X402QueryRequest): Promise<X402QueryResponse | null> => {
    try {
      setLoading(true)
      setError(null)
      setPaymentResponse(null)

      console.log('\n' + '='.repeat(60))
      console.log('🚀 Sending query to API route (server-side payment)')
      console.log('='.repeat(60))
      console.log('📤 Request:', request)

      // Simple fetch to our API route
      // All x402 payment logic happens server-side
      const response = await fetch(API_ROUTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      console.log('📊 Response Status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Request failed:', errorData)
        setError(errorData.error || `Request failed: ${response.status}`)
        return null
      }

      // Parse response
      const data = await response.json()
      console.log('✅ Query successful!')
      console.log('📦 Response data:', {
        success: data.success,
        hasSqlQuery: !!data.sqlQuery,
        dbResultsCount: data.dbResults?.length || 0,
        hasPaymentInfo: !!data.paymentInfo
      })
      console.log('='.repeat(60) + '\n')

      // Extract payment info if available
      if (data.paymentInfo) {
        console.log('💳 Payment processed:', data.paymentInfo)
        setPaymentResponse(data.paymentInfo)
      }

      // Return in the expected format
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
  }, [])

  return {
    loading,
    error,
    paymentResponse,
    executeQuery,
  }
}
