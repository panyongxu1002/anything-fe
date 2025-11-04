'use client'

import { getTxExplorerUrl, getChainDisplayName, getChainPaymentToken } from '@/config/explorer'
import type { X402PaymentResponse } from '@/types/x402'

interface PaymentSuccessDisplayProps {
  chain: 'solana' | 'base'
  paymentResponse: X402PaymentResponse
}

/**
 * 支付成功显示组件
 *
 * 显示交易哈希、代币信息和 Block Explorer 链接
 */
export default function PaymentSuccessDisplay({
  chain,
  paymentResponse,
}: PaymentSuccessDisplayProps) {
  const token = getChainPaymentToken(chain)
  const chainName = getChainDisplayName(chain)

  return (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-green-800 font-semibold mb-2 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Payment Successful
      </h3>

      <div className="text-sm text-green-700 space-y-3">
        <p>Your payment has been processed successfully on {chainName}.</p>

        {/* Transaction Hash */}
        {paymentResponse.transaction && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-green-600 font-medium">Transaction Hash:</span>
            <a
              href={getTxExplorerUrl(chain, paymentResponse.transaction)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs break-all text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 group transition-colors"
            >
              {paymentResponse.transaction}
              <svg
                className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

        {/* Payment Details */}
        <div className="bg-white rounded p-2 mt-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Amount */}
            {paymentResponse.amount && (
              <div>
                <span className="text-green-600 font-medium">Amount:</span>
                <p className="font-mono text-gray-700">
                  {paymentResponse.amount} {token.symbol}
                </p>
              </div>
            )}

            {/* Network */}
            {paymentResponse.network && (
              <div>
                <span className="text-green-600 font-medium">Network:</span>
                <p className="font-mono text-gray-700">{paymentResponse.network}</p>
              </div>
            )}

            {/* Timestamp */}
            {paymentResponse.timestamp && (
              <div>
                <span className="text-green-600 font-medium">Time:</span>
                <p className="font-mono text-gray-700">
                  {new Date(paymentResponse.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
