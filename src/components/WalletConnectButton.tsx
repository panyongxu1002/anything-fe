'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

/**
 * 多链钱包连接按钮
 *
 * 根据活跃链自动选择：
 * - Solana: WalletMultiButton (支持 Phantom, Solflare 等)
 * - Base/EVM: RainbowKit ConnectButton
 */
export default function WalletConnectButton() {
  const activeChain = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as 'solana' | 'base') || 'solana'

  if (activeChain === 'solana') {
    return (
      <div className="wallet-connect-button-solana">
        <WalletMultiButton className="wallet-adapter-button-trigger bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all" />
      </div>
    )
  }

  // RainbowKit for Base/EVM chains
  return (
    <div className="wallet-connect-button-evm">
      <ConnectButton />
    </div>
  )
}
