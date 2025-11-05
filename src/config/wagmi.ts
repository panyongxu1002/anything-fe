import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { injected } from '@wagmi/connectors'
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'

const chains = [base] as const

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  console.warn(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. WalletConnect features will be disabled.'
  )
}

export const config = projectId
  ? getDefaultConfig({
      appName: 'Hubble AI Assistant',
      projectId,
      chains,
      ssr: false, // Disabled to prevent indexedDB errors during build
    })
  : createConfig({
      chains,
      ssr: false,
      connectors: [injected()],
      transports: {
        [base.id]: http(),
      },
    })
