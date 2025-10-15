# X402 EOA Wallet Integration

This project integrates the x402 payment protocol with user's browser wallets (EOA - Externally Owned Account) using RainbowKit and wagmi.

## Implementation Based on Official Examples

This implementation follows the official x402 browser wallet example:
- **Reference**: `examples/typescript/fullstack/browser-wallet-example/` from [coinbase/x402](https://github.com/coinbase/x402)

## Architecture

### Client-Side Payment Flow

```
User Query → Connect Wallet → 402 Payment Required → User Signs in Wallet → Payment Sent → Result
```

1. **User connects wallet** via RainbowKit
2. **Query triggers 402** response from gateway  
3. **x402-fetch intercepts** the 402 response automatically
4. **User signs** EIP-3009 payment authorization in their wallet
5. **Request retries** with payment proof header
6. **Gateway verifies** payment and returns data

### Key Components

#### 1. Wallet Integration (`src/config/wagmi.ts`, `src/context/Web3Provider.tsx`)

Uses RainbowKit + wagmi for standard Web3 wallet connection:

```typescript
// RainbowKit provides wallet connection UI
// Wagmi manages wallet state and provides useWalletClient hook
```

#### 2. Payment Hook (`src/hooks/useX402Payment.ts`)

Follows official x402 pattern - pass wagmi's `walletClient` directly to `wrapFetchWithPayment`:

```typescript
const { data: walletClient } = useWalletClient()

// Official pattern: pass walletClient directly to x402-fetch
const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient)

// x402-fetch automatically handles:
// - Detecting 402 responses
// - Prompting user to sign payment
// - Retrying with payment proof
const response = await fetchWithPayment(apiUrl, options)
```

#### 3. API Proxy (`src/app/api/query/route.ts`)

Next.js API route proxies requests to avoid CORS:

```typescript
// Client → /api/query (Next.js) → x402 Gateway
// - Forwards X-PAYMENT header from client
// - Returns 402 to client when payment required
// - Forwards X-PAYMENT-RESPONSE header back to client
```

## How x402 Payment Works

### EIP-3009: Transfer With Authorization

The x402 protocol uses EIP-3009 for gasless payments:

1. **User signs authorization** (not a transaction)
2. **Signature includes**:
   - From: user's address
   - To: merchant's address
   - Value: payment amount (USDC)
   - ValidAfter/ValidBefore: time window
   - Nonce: unique identifier

3. **Gateway submits** the authorization on-chain
4. **User pays gas-free** - only signs the message

### Payment Header Format

```typescript
// X-PAYMENT header structure
{
  x402Version: 1,
  scheme: "exact",
  network: "base-sepolia",
  payload: {
    signature: "0x...",  // EIP-712 signature
    authorization: {
      from: "0x...",     // user address
      to: "0x...",       // merchant address
      value: "10000",    // USDC amount (6 decimals)
      validAfter: "...",
      validBefore: "...",
      nonce: "0x..."
    }
  }
}
```

## Testing

### Prerequisites

1. **Install MetaMask** or any Ethereum wallet
2. **Get Base Sepolia ETH**: [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
3. **Get Base Sepolia USDC**: [Circle Faucet](https://faucet.circle.com/)

### Test Flow

1. **Start the app**: `pnpm dev`
2. **Connect wallet**: Click "Connect Wallet" button
3. **Submit query**: Enter a question and click "Query"
4. **Approve payment**: Sign the payment in your wallet when prompted
5. **View results**: See query results and payment confirmation

## Environment Setup

```bash
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional (has default)
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query
```

## Key Differences from Private Key Integration

| Aspect | Private Key (Server-Side) | EOA Wallet (Client-Side) |
|--------|---------------------------|--------------------------|
| **Payment Source** | Server's wallet | User's wallet |
| **Signing** | Automatic (server) | Manual (user approval) |
| **Security** | Private key in env | User controls keys |
| **UX** | Seamless | Requires wallet interaction |
| **Use Case** | B2B, Internal tools | Consumer apps |

## Benefits of EOA Integration

1. **User-Pays Model**: Users pay directly from their wallets
2. **No Private Keys**: Server doesn't hold funds or keys
3. **Transparent**: Users see and approve each payment
4. **Standard Web3 UX**: Familiar wallet interaction
5. **Regulatory Friendly**: Users control their own funds

## Official x402 Resources

- **Documentation**: [https://x402.org](https://x402.org)
- **GitHub**: [https://github.com/coinbase/x402](https://github.com/coinbase/x402)
- **Browser Wallet Example**: `examples/typescript/fullstack/browser-wallet-example/`
- **Specification**: [x402-specification.md](https://github.com/coinbase/x402/blob/main/specs/x402-specification.md)

## Troubleshooting

### Wallet Not Connecting
- Ensure wallet is installed and unlocked
- Check that you're on Base Sepolia network
- Clear browser cache and try again

### Payment Failing
- Verify you have USDC on Base Sepolia
- Check wallet has enough ETH for gas (though x402 is gasless for users)
- Ensure payment signature is approved

### 402 Error Not Handled
- Verify wallet is connected before querying
- Check browser console for detailed error messages
- Ensure x402-fetch is properly initialized

## Code References

- **Official Example**: `/Users/siyiding/hubble/x402-examples/examples/typescript/fullstack/browser-wallet-example/`
- **x402-fetch Package**: `/Users/siyiding/hubble/x402-examples/typescript/packages/x402-fetch/`
- **Payment Hook**: `src/hooks/useX402Payment.ts`
- **Wallet Setup**: `src/config/wagmi.ts`, `src/context/Web3Provider.tsx`


