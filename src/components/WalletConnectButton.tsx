'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function WalletConnectButton() {
  const activeChain = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as 'solana' | 'base') || 'solana'

  // Render appropriate wallet button based on active chain
  if (activeChain === 'solana') {
    return (
      <WalletMultiButton className="!px-6 !py-2 !bg-purple-600 hover:!bg-purple-700 !rounded-lg !text-sm" />
    )
  }

  // Default to RainbowKit for Base/EVM
  return <ConnectButton />
}

