'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

/**
 * 多链钱包连接按钮
 *
 * 根据活跃链自动选择：
 * - Solana: 显示使用私钥签名的提示
 * - Base/EVM: RainbowKit ConnectButton
 */
export default function WalletConnectButton() {
  const activeChain = (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as 'solana' | 'base') || 'solana'

  if (activeChain === 'solana') {
    return (
      <div className="wallet-connect-button-solana px-4 py-2 rounded-lg bg-purple-100 text-purple-700 text-sm font-medium shadow-inner">
        使用配置的 Solana 测试私钥完成支付
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
