'use client'

import { useAccount, useBalance, useDisconnect, useEnsName } from 'wagmi'
import WalletConnectButton from './WalletConnectButton'

/**
 * Wallet Example Component
 * 
 * Demonstrates how to use Wagmi hooks to display wallet information
 * and interact with the connected wallet.
 * 
 * Features:
 * - Display connection status
 * - Show wallet address
 * - Display wallet balance
 * - Show ENS name (if available)
 * - Disconnect functionality
 */
export default function WalletExample() {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address })
  const { data: ensName } = useEnsName({ address })
  const { disconnect } = useDisconnect()

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Wallet Connection</h2>
      
      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Connect your wallet to get started
          </p>
          <WalletConnectButton />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">Connected</p>
          </div>

          {ensName && (
            <div>
              <p className="text-sm text-gray-600">ENS Name</p>
              <p className="font-mono text-sm font-semibold">{ensName}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Address</p>
            <p className="font-mono text-sm break-all">{address}</p>
          </div>

          {chain && (
            <div>
              <p className="text-sm text-gray-600">Network</p>
              <p className="font-semibold">{chain.name}</p>
            </div>
          )}

          {balance && (
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="font-semibold">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </p>
            </div>
          )}

          <button
            onClick={() => disconnect()}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

