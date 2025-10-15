import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, baseSepolia } from 'wagmi/chains'

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined')
}

export const config = getDefaultConfig({
  appName: 'Hubble AI Assistant',
  projectId,
  chains: [baseSepolia],
  ssr: true,
})

