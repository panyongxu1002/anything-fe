# Hubble AI Assistant

A Next.js application that integrates with x402 payment protocol for paid API queries.

## Features

- 🤖 **AI-Powered SQL Generation**: Convert natural language questions to SQL queries
- 💳 **x402 Payment Integration**: Automatic payment handling for API requests
- 🔐 **Private Key Authentication**: Secure, automatic payments using private keys
- 📊 **Real-time Results**: Display query results with syntax highlighting
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `.env.local` file:

```bash
# X402 Gateway URL
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query

# Your private key (must have USDC on Base Sepolia)
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x1234567890abcdef...
```

⚠️ **Important**: Your account needs USDC on Base Sepolia testnet to make payments.

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Payment Setup

### Get Test USDC on Base Sepolia

1. **Get Base Sepolia ETH**
   - Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Enter your account address
   - Receive test ETH

2. **Swap ETH for USDC**
   - Use [Uniswap on Base Sepolia](https://app.uniswap.org)
   - Connect with your wallet
   - Swap ETH → USDC

3. **Test the Integration**
   - Enter a query in the app
   - Payment will be automatically handled
   - View results and payment confirmation

## How It Works

### Payment Flow

```
User Query → 402 Payment Required → Auto Sign → Retry with Payment → Result
```

1. **User submits query** - Enter natural language question
2. **Gateway returns 402** - Payment required for this endpoint
3. **x402-fetch handles payment** - Automatically signs EIP-3009 authorization
4. **Request retries** - Sends query with payment proof
5. **Success** - Display results + payment confirmation

### Technologies

- **Next.js 15** - React framework
- **x402-fetch** - Official Coinbase payment handler
- **Viem** - Ethereum library for signing
- **TypeScript** - Type safety
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

- [X402 Integration Guide](./X402_INTEGRATION.md) - Detailed payment integration docs
- [Coinbase x402 Docs](https://docs.cdp.coinbase.com/x402/) - Official documentation
- [x402 Quickstart](https://docs.cdp.coinbase.com/x402/quickstart-for-buyers) - Getting started guide

## Security

### Private Key Safety

- ✅ Store private keys in `.env.local` (gitignored)
- ✅ Never commit private keys to version control
- ✅ Use dedicated payment accounts with limited funds
- ✅ Consider CDP Server Wallet for production

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

