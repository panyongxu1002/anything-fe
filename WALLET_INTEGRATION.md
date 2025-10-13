# Wallet Integration Guide

This project has been integrated with RainbowKit for Web3 wallet connections.

## Quick Start

### 1. Get Your WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up or log in
3. Create a new project
4. Copy your project ID

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_project_id_here
```

**Important:** Make sure to replace `your_actual_project_id_here` with your actual project ID from WalletConnect Cloud.

### 3. Start the Development Server

```bash
pnpm dev
```

The wallet connect button is now available in the header of the main page.

## What Was Integrated

### Files Created

- **`src/config/wagmi.ts`** - Wagmi configuration with RainbowKit setup (Base, Base Sepolia, Mainnet)
- **`src/context/Web3Provider.tsx`** - React context provider for RainbowKit
- **`src/components/WalletConnectButton.tsx`** - RainbowKit connect button
- **`src/components/WalletExample.tsx`** - Example component showing wallet info

### Files Modified

- **`src/app/layout.tsx`** - Added Web3Provider wrapper
- **`src/app/page.tsx`** - Added wallet connect button to the header
- **`next.config.ts`** - Added required webpack externals
- **`package.json`** - Added wallet dependencies

### Dependencies Installed

- `@rainbow-me/rainbowkit` - RainbowKit library
- `@wagmi/core` - Core Wagmi functionality
- `wagmi` - React hooks for Ethereum
- `viem` - TypeScript interface for Ethereum
- `@tanstack/react-query` - Data fetching library

## Using the Wallet Components

### Simple Connect Button

The `WalletConnectButton` component uses RainbowKit's ConnectButton:

```tsx
import WalletConnectButton from '@/components/WalletConnectButton'

export default function MyPage() {
  return <WalletConnectButton />
}
```

Or use RainbowKit's ConnectButton directly:

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function MyPage() {
  return <ConnectButton />
}
```

### Full Example Component

The `WalletExample` component shows wallet details:

```tsx
import WalletExample from '@/components/WalletExample'

export default function MyPage() {
  return <WalletExample />
}
```

### Using Wagmi Hooks

#### Get Account Information

```tsx
'use client'

import { useAccount } from 'wagmi'

export default function MyComponent() {
  const { address, isConnected, chain } = useAccount()
  
  if (!isConnected) return <div>Please connect your wallet</div>
  
  return (
    <div>
      <p>Address: {address}</p>
      <p>Chain: {chain?.name}</p>
    </div>
  )
}
```

#### Get Wallet Balance

```tsx
'use client'

import { useAccount, useBalance } from 'wagmi'

export default function Balance() {
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  
  return (
    <div>
      Balance: {balance?.formatted} {balance?.symbol}
    </div>
  )
}
```

#### Read from Smart Contract

```tsx
'use client'

import { useReadContract } from 'wagmi'

const CONTRACT_ADDRESS = '0x...'
const ABI = [/* your ABI */]

export default function ContractData() {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'balanceOf',
    args: ['0x...']
  })
  
  return <div>Balance: {data?.toString()}</div>
}
```

#### Write to Smart Contract

```tsx
'use client'

import { useWriteContract } from 'wagmi'

export default function SendTransaction() {
  const { writeContract } = useWriteContract()
  
  const handleSend = () => {
    writeContract({
      address: '0x...',
      abi: ABI,
      functionName: 'transfer',
      args: ['0x...', 1000n]
    })
  }
  
  return <button onClick={handleSend}>Send</button>
}
```

## RainbowKit Button Variants

RainbowKit's ConnectButton supports different display modes:

```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit'

// Full button with all features (default)
<ConnectButton />

// Compact button
<ConnectButton chainStatus="icon" />

// Only show account (hide chain info)
<ConnectButton chainStatus="none" />

// Custom button with render prop
<ConnectButton.Custom>
  {({
    account,
    chain,
    openAccountModal,
    openChainModal,
    openConnectModal,
    mounted,
  }) => {
    return (
      <button onClick={openConnectModal} type="button">
        {account ? account.displayName : 'Connect Wallet'}
      </button>
    )
  }}
</ConnectButton.Custom>
```

## Supported Networks

By default, the following networks are configured:
- **Base**
- **Base Sepolia** (testnet)
- **Ethereum Mainnet**

To add more networks, edit `src/config/wagmi.ts`:

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, baseSepolia, arbitrum, polygon, optimism } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Hubble AI Assistant',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, baseSepolia, mainnet, arbitrum, polygon, optimism],
  ssr: true,
})
```

## Supported Wallets

RainbowKit automatically supports popular wallets including:
- **Rainbow Wallet** (featured)
- MetaMask
- Coinbase Wallet
- WalletConnect
- Trust Wallet
- Ledger
- And many more through WalletConnect...

## Troubleshooting

### "WalletConnect Project ID is not defined" Error

**Solution:**
1. Make sure you have created a `.env.local` file
2. Verify the variable is named `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
3. Restart the dev server after adding the variable

### Connection Issues

**Solution:**
1. Check that the project ID is correct
2. Verify your domain is added to the allowed origins in WalletConnect Cloud
3. Check browser console for specific errors

### Type Errors

**Solution:**
1. Run `pnpm install` to ensure all dependencies are installed
2. Restart your IDE/editor

### React 19 Peer Dependency Warning

You may see a warning about React 19 compatibility. This can be safely ignored as the libraries work correctly with React 19.

### RainbowKit Styles Not Loading

**Solution:**
If the wallet button doesn't look styled, make sure the RainbowKit CSS is imported in `src/context/Web3Provider.tsx`:

```typescript
import '@rainbow-me/rainbowkit/styles.css'
```

## Customization

### Change Theme

RainbowKit supports light, dark, and auto themes. Edit `src/context/Web3Provider.tsx`:

```typescript
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'

function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Customize Theme Colors

```typescript
<RainbowKitProvider
  theme={darkTheme({
    accentColor: '#7b3ff2',
    accentColorForeground: 'white',
    borderRadius: 'small',
    fontStack: 'system',
  })}
>
  {children}
</RainbowKitProvider>
```

### Custom Wallet List

To customize which wallets appear in the modal, edit `src/config/wagmi.ts`:

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { rainbowWallet, metaMaskWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets'

export const config = getDefaultConfig({
  appName: 'Hubble AI Assistant',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, baseSepolia, mainnet],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [rainbowWallet, metaMaskWallet, coinbaseWallet],
    },
  ],
  ssr: true,
})
```

### Update App Metadata

Edit `src/config/wagmi.ts`:

```typescript
export const config = getDefaultConfig({
  appName: 'Your App Name',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, baseSepolia, mainnet],
  ssr: true,
})
```

## Resources

- [WalletConnect Cloud](https://cloud.walletconnect.com) - Get your project ID
- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [Wagmi Documentation](https://wagmi.sh) - React hooks reference
- [Viem Documentation](https://viem.sh) - Ethereum library reference
- [RainbowKit GitHub](https://github.com/rainbow-me/rainbowkit) - Source code and issues

## Next Steps

1. ✅ Dependencies installed (RainbowKit)
2. ✅ Configuration files created
3. ✅ Wallet button added to main page
4. ⚠️ **TODO:** Get your WalletConnect project ID from [WalletConnect Cloud](https://cloud.walletconnect.com)
5. ⚠️ **TODO:** Create `.env.local` with your project ID
6. ⚠️ **TODO:** Test the wallet connection
7. 🚀 Start building Web3 features!

## Example: Testing the Integration

1. Make sure `.env.local` is configured with your project ID
2. Run `pnpm dev`
3. Open your browser to `http://localhost:3000`
4. Click the wallet button in the header
5. Connect your wallet
6. Navigate to `/wallet-example` (if you create that route) to see detailed wallet info

You can test the full wallet example by importing `WalletExample` component anywhere in your app!

