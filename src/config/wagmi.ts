import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, baseSepolia } from 'wagmi/chains'

// Get projectId from https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  throw new Error('WalletConnect Project ID is not defined')
}

// Configure wagmi config with RainbowKit
export const config = getDefaultConfig({
  appName: 'Hubble AI Assistant',
  projectId,
  chains: [base, baseSepolia, mainnet],
  ssr: true,
})

