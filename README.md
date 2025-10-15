# Hubble AI Assistant

A Next.js application that integrates with x402 payment protocol for paid API queries using user's browser wallets.

## Features

- 🤖 **AI-Powered SQL Generation**: Convert natural language questions to SQL queries
- 💳 **x402 Payment Integration**: User-pays model with browser wallet support
- 👛 **RainbowKit Wallet Connection**: Connect with MetaMask, Coinbase Wallet, and more
- 📊 **Real-time Results**: Display query results with syntax highlighting
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔗 **Multi-Chain Support**: Solana, Base, BNB, Ethereum (more coming soon)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `.env.local` file:

```bash
# X402 Gateway URL (optional, has default)
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query

# WalletConnect Project ID (required for RainbowKit)
# Get yours at: https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

⚠️ **Important**: Your wallet needs USDC on Base Sepolia testnet to make payments.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Payment Setup

### Get Test USDC on Base Sepolia

1. **Install Wallet**
   - Install [MetaMask](https://metamask.io/) or any Ethereum wallet

2. **Get Base Sepolia ETH**
   - Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Enter your wallet address
   - Receive test ETH

3. **Get Base Sepolia USDC**
   - Visit [Circle Faucet](https://faucet.circle.com/)
   - Request USDC on Base Sepolia

4. **Test the Integration**
   - Connect your wallet in the app
   - Enter a query
   - Approve the payment signature in your wallet
   - View results and payment confirmation

## How It Works

### Payment Flow

```
Connect Wallet → User Query → 402 Payment Required → User Signs → Payment Sent → Result
```

1. **User connects wallet** - Click "Connect Wallet" button (RainbowKit)
2. **User submits query** - Enter natural language question
3. **Gateway returns 402** - Payment required for this endpoint
4. **x402-fetch intercepts** - Detects 402 response automatically
5. **User signs payment** - Wallet prompts for EIP-3009 authorization signature
6. **Request retries** - Sends query with payment proof in X-PAYMENT header
7. **Success** - Display results + payment confirmation with transaction link

### Technologies

- **Next.js 15** - React framework with App Router
- **x402-fetch** - Payment protocol client (browser wallet support)
- **RainbowKit** - Wallet connection UI
- **Wagmi** - React Hooks for Ethereum
- **Viem** - Ethereum library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main query interface
├── hooks/
│   └── useX402Payment.ts   # Payment logic
├── components/
│   ├── QueryResultDisplay.tsx  # Results UI
│   └── ResultDisplay.tsx       # JSON display
├── types/
│   └── x402.ts             # TypeScript types
└── config/
    └── exampleQueries.ts   # Example queries
```

## Documentation

- **[X402 EOA Integration Guide](./X402_EOA_INTEGRATION.md)** - Detailed browser wallet integration guide
- **[Official x402 Browser Wallet Example](https://github.com/coinbase/x402/tree/main/examples/typescript/fullstack/browser-wallet-example)** - Reference implementation
- **[Coinbase x402 Docs](https://docs.cdp.coinbase.com/x402/)** - Official documentation
- **[x402 Specification](https://github.com/coinbase/x402/blob/main/specs/x402-specification.md)** - Technical specification

## Security

### User-Pays Model

- ✅ **No private keys on server** - Users control their own wallets
- ✅ **User approval required** - Every payment requires explicit wallet signature
- ✅ **Transparent pricing** - Users see payment amount before signing
- ✅ **Gasless for users** - x402 uses EIP-3009 (no gas required for signature)

### Production Deployment

Use environment variables on your hosting platform:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Railway**: Project → Variables

## Development

### Available Scripts

```bash
# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_X402_GATEWAY_URL` | Yes | x402 gateway endpoint |
| `NEXT_PUBLIC_CLIENT_PRIVATE_KEY` | Yes | Ethereum private key with USDC |

## Troubleshooting

### "Payment account not configured"

**Solution**: Set `NEXT_PUBLIC_CLIENT_PRIVATE_KEY` in `.env.local`

### "Insufficient funds"

**Solution**: Add USDC to your account on Base Sepolia

### Payment succeeds but no results

**Check**:
1. Console logs for detailed errors
2. Network is Base Sepolia (chainId: 84532)
3. USDC token address is correct

## Examples

### Example Queries

- "What is my total balance?"
- "Show me all transactions from yesterday"
- "List the top 10 users by transaction count"
- "What's the average transaction value?"

See [exampleQueries.ts](./src/config/exampleQueries.ts) for more examples.

## References

- [x402 Protocol](https://docs.cdp.coinbase.com/x402/)
- [Base Network](https://docs.base.org/)
- [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009)
- [Viem Documentation](https://viem.sh/)

## Support

- [Coinbase Developer Discord](https://discord.com/invite/cdp)
- [GitHub Issues](https://github.com/coinbase/x402/issues)

## License

MIT

