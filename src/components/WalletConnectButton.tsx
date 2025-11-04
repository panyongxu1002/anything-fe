'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

/**
 * 多链钱包连接按钮
 *
 * 根据活跃链自动选择：
 * - Solana: WalletMultiButton (支持 Phantom, Solflare, Backpack)
 * - Base/EVM: RainbowKit ConnectButton
 */
export default function WalletConnectButton() {
  const activeChain = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as 'solana' | 'base') || 'solana'

  if (activeChain === 'solana') {
    // Solana wallet button with custom styling
    return (
      <div className="wallet-connect-button-solana">
        <WalletMultiButton
          className="!px-6 !py-2.5 !bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !rounded-lg !text-sm !font-semibold !text-white !shadow-md hover:!shadow-lg !transition-all"
          style={{
            backgroundColor: 'rgb(147, 51, 234)',
            color: 'white',
          }}
        />
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

