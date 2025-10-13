# X402 Payment Integration Guide

This application uses the official **x402** payment protocol to handle paid API requests automatically. The integration follows the [Coinbase x402 Quickstart for Buyers](https://docs.cdp.coinbase.com/x402/quickstart-for-buyers).

## Architecture

### Private Key Authentication

The application uses **private key-based authentication** (recommended by Coinbase for automated payments):
- No wallet connection UI needed
- Automatic payment handling via `x402-fetch`
- Uses `viem` for account creation from private key

### How It Works

```typescript
import { wrapFetchWithPayment } from 'x402-fetch'
import { privateKeyToAccount } from 'viem/accounts'

// 1. Create account from private key
const account = privateKeyToAccount(process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY)

// 2. Wrap fetch with automatic payment handling
const fetchWithPayment = wrapFetchWithPayment(fetch, account)

// 3. Use as normal fetch - x402-fetch handles 402 responses automatically
const response = await fetchWithPayment(url, options)
```

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the project root:

```bash
# X402 Payment Gateway URL
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query

# Client Private Key (for x402 payments)
# ⚠️ IMPORTANT: Never commit this to version control
# This should be a valid Ethereum private key with USDC balance on Base Sepolia
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### 2. Fund Your Account

The account created from your private key needs:
- **Network**: Base Sepolia (testnet)
- **Token**: USDC
- **Amount**: Sufficient for query payments (typically 0.01 USDC per query)

You can:
1. Get test ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Swap for USDC on Base Sepolia testnet
3. Or use [Uniswap on Base Sepolia](https://app.uniswap.org)

### 3. Install Dependencies

```bash
pnpm install
```

Key dependencies:
- `x402-fetch`: Official x402 helper for automatic payment handling
- `viem`: Ethereum library for account creation and signing

### 4. Run the Application

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Payment Flow

### User Experience

1. **User enters query** → Clicks "Query"
2. **x402-fetch detects 402** → Gateway requires payment
3. **Automatic payment** → Signs EIP-3009 transfer authorization
4. **Request retry** → Sends query with payment proof
5. **Success** → Displays query results

### Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Initial Request                                          │
│    POST /query → 402 Payment Required                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. x402-fetch Handles 402                                   │
│    - Parses payment requirements                            │
│    - Verifies amount is acceptable                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Create Payment Authorization (EIP-3009)                  │
│    - Signs typed data (EIP-712)                             │
│    - Creates USDC transfer authorization                    │
│    - Includes: from, to, value, nonce, validity period      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Retry Request with Payment                               │
│    POST /query + X-PAYMENT header (base64 encoded proof)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Gateway Verifies & Processes                             │
│    - Validates signature                                    │
│    - Executes USDC transfer                                 │
│    - Returns query result + X-Payment-Response header       │
└─────────────────────────────────────────────────────────────┘
```

## Code Structure

### Key Files

```
src/
├── hooks/
│   └── useX402Payment.ts          # Main payment hook
├── types/
│   └── x402.ts                     # TypeScript types for x402
└── app/
    └── page.tsx                    # Main UI component
```

### `useX402Payment.ts`

The core hook that handles all payment logic:

```typescript
export function useX402Payment() {
  // 1. Create account from private key
  const account = useMemo(() => {
    const privateKey = process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY
    return privateKeyToAccount(privateKey)
  }, [])

  // 2. Wrap fetch with payment handling
  const fetchWithPayment = useMemo(() => {
    return wrapFetchWithPayment(fetch, account)
  }, [account])

  // 3. Execute queries - payments handled automatically
  const executeQuery = useCallback(async (request) => {
    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    
    // Check for payment response header
    const paymentHeader = response.headers.get('X-Payment-Response')
    if (paymentHeader) {
      const paymentInfo = decodeXPaymentResponse(paymentHeader)
      console.log('Payment successful:', paymentInfo)
    }
    
    return response.json()
  }, [fetchWithPayment])

  return { executeQuery, accountAddress: account.address }
}
```

## Payment Protocol Details

### EIP-3009: Transfer With Authorization

The x402 protocol uses **EIP-3009** for USDC payments on EVM chains:

```typescript
// Typed data structure (EIP-712)
{
  domain: {
    name: "USD Coin",
    version: "2",
    chainId: 84532, // Base Sepolia
    verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // USDC
  },
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" }
    ]
  },
  message: {
    from: "0x...",        // Your account
    to: "0x...",          // Payment recipient
    value: "10000",       // Amount in smallest unit (0.01 USDC = 10000)
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    nonce: "0x..."        // Random 32-byte hex
  }
}
```

### Payment Header Format

```
X-PAYMENT: <base64-encoded-json>
```

Where the decoded JSON is:
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "payload": {
    "from": "0x...",
    "to": "0x...",
    "value": "10000",
    "validAfter": 0,
    "validBefore": 1234567890,
    "nonce": "0x...",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

## Benefits of x402-fetch

### Before (Manual Implementation)
- ❌ 200+ lines of boilerplate code
- ❌ Manual 402 detection and handling
- ❌ Complex EIP-712 signing logic
- ❌ Error-prone payload construction
- ❌ Manual retry mechanism

### After (Using x402-fetch)
- ✅ ~50 lines of clean code
- ✅ Automatic 402 detection
- ✅ Automatic payment signing
- ✅ Standard-compliant payloads
- ✅ Built-in retry logic
- ✅ Official Coinbase support

## Troubleshooting

### Error: "Payment account not configured"

**Cause**: `NEXT_PUBLIC_CLIENT_PRIVATE_KEY` not set

**Solution**: Create `.env.local` with your private key

### Error: "Insufficient funds"

**Cause**: Account doesn't have enough USDC

**Solution**: Fund your account with USDC on Base Sepolia

### Error: "Invalid signature"

**Cause**: Signature verification failed on gateway

**Solution**: 
- Ensure you're using the correct network (Base Sepolia)
- Check that the USDC token address matches
- Verify your private key is valid

### Payment succeeds but query fails

**Cause**: Query execution error after payment

**Solution**: Check console logs for detailed error messages

## Security Considerations

### ⚠️ Private Key Safety

**Never commit your private key to version control!**

- Store in `.env.local` (not `.env`)
- Add `.env.local` to `.gitignore`
- Use environment variables in production
- Consider using a dedicated payment account with limited funds

### Recommended Setup

```bash
# Development: Use .env.local (gitignored)
echo "NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x..." >> .env.local

# Production: Use hosting platform's environment variables
# - Vercel: Project Settings → Environment Variables
# - Netlify: Site Settings → Environment Variables
```

## Alternative: CDP Server Wallet

For production applications, consider using **CDP Server Wallet** instead of raw private keys:

```typescript
import { CdpClient } from '@coinbase/cdp-sdk'

const cdp = new CdpClient()
const cdpAccount = await cdp.evm.createAccount()
const account = toAccount(cdpAccount)

const fetchWithPayment = wrapFetchWithPayment(fetch, account)
```

Benefits:
- Better security (no private keys in code)
- Managed key storage
- Built-in fund management

See: [CDP Server Wallet Quickstart](https://docs.cdp.coinbase.com/wallet-api/docs/welcome)

## References

- [x402 Official Documentation](https://docs.cdp.coinbase.com/x402/)
- [x402 Quickstart for Buyers](https://docs.cdp.coinbase.com/x402/quickstart-for-buyers)
- [x402-fetch NPM Package](https://www.npmjs.com/package/x402-fetch)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [Base Sepolia Testnet](https://docs.base.org/network-information/#base-testnet-sepolia)

## Support

For issues or questions:
- [Coinbase Developer Discord](https://discord.com/invite/cdp)
- [GitHub Issues](https://github.com/coinbase/x402)
