## Hubble AI Assistant (Solana)

Next.js web app that runs paid SQL-style queries through the x402 protocol using Solana devnet wallets such as Phantom, Solflare, and Backpack. The entire payment flow, wallet UX, and troubleshooting guidance in this README now targets Solana only.

## Features

- 🤖 Natural-language-to-SQL generation with syntax-highlighted results
- 💳 x402 Solana payments handled transparently through `x402-solana`
- 👛 Wallet Adapter UI with Phantom / Solflare / Backpack support
- 📊 Real-time result rendering plus decoded payment receipts
- 🛠 Devtools-friendly logging for payment retries and 402 handling

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create `.env.local` and copy the Solana defaults (adjust as needed for your gateway or RPC):

```bash
NEXT_PUBLIC_ACTIVE_CHAIN=solana

# Solana network
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

# x402 gateway + SPL token metadata
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402s.bedev.hubble-rpc.xyz
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKQV6DgaLqRjzPxEKaDkKjNraboLKxw

# Explorer + diagnostics
NEXT_PUBLIC_EXPLORER_URL=https://explorer.solana.com
NEXT_PUBLIC_DEBUG=true
```

> 💡 These values match the settings used throughout `docs/SOLANA_MIGRATION_SUMMARY.md` and `docs/PHASE7_E2E_TEST.md`. Override them per deployment (e.g., mainnet RPC, custom explorer, different gateway).

### 3. Run the dev server

```bash
pnpm dev
```

Open http://localhost:3000 and connect your Solana wallet.

## Solana Payment Setup

1. **Install a wallet** – Phantom (recommended), Solflare, or Backpack extensions all work with the included Wallet Adapter UI.
2. **Fund devnet SOL** – Run `solana airdrop 1 <WALLET_ADDRESS> -u devnet` or use any devnet SOL faucet so signatures can be produced.
3. **Fund devnet USDC**
   - Visit https://faucet.circle.com/
   - Connect Phantom/Solflare
   - Pick **Solana devnet**, enter your address, and request the standard 100 USDC test tokens.
4. **Connect & test**
   - Click “Connect Wallet” in the app
   - Approve the Wallet Adapter popup
   - Submit a query; the first request should return HTTP 402, triggering the Solana signing flow, after which results populate alongside payment details.

## Payment Flow (Solana)

```
Wallet Connect → Query POST /api/query → 402 from gateway → Solana signTransaction → x402-solana retries with X-PAYMENT → Results + receipt
```

Implementation details:

1. `useX402SolanaPayment` wraps `x402-solana` and the Wallet Adapter to build the `fetch` client (see `src/hooks/useX402SolanaPayment.ts`).
2. When the gateway replies with 402, the hook invokes `signTransaction` and resubmits with the payment proof header.
3. The client decodes the `X-Payment-Response` header via `x402-fetch` to display transaction signatures, network (`solana-devnet`), amount, and timestamp.
4. `WalletConnectButton` renders the Solana `WalletMultiButton` so all supported wallets share a consistent UX.

## Technologies

- **Next.js 15** – App Router UI
- **x402-solana & x402-fetch** – Solana-native payment client and response decoder
- **@solana/web3.js** – RPC + transaction utilities
- **@solana/wallet-adapter** stack – Provider + UI components
- **TypeScript + Tailwind CSS** – DX and styling

## Project Structure (Solana highlights)

```
src/
├── app/
│   ├── layout.tsx          # Chooses Solana provider based on env
│   └── page.tsx            # Main query interface
├── components/
│   └── WalletConnectButton.tsx  # Solana WalletMultiButton
├── context/
│   └── SolanaProvider.tsx  # ConnectionProvider + WalletProvider setup
├── hooks/
│   ├── useX402SolanaPayment.ts   # Payment flow hook
│   └── useX402PaymentAdapter.ts  # Routes to Solana hook (default)
├── config/
│   ├── solana.ts           # Cluster, explorer, formatter helpers
│   └── explorer.ts         # Utility for Solana tx/address URLs
└── docs/
    ├── SOLANA_MIGRATION_SUMMARY.md
    └── PHASE7_E2E_TEST.md
```

## Documentation

- `docs/SOLANA_MIGRATION_SUMMARY.md` – Architecture, env matrix, and hook details
- `docs/PHASE7_E2E_TEST.md` – End-to-end checklist on Solana devnet
- `scripts/test-solana-signing.ts` – CLI harness for validating `signMessage`/`signTransaction`
- `X402_EOA_INTEGRATION.md` – Legacy EVM notes (not required for current flow but kept for reference)

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ACTIVE_CHAIN` | yes | Must be `solana` for this build |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | yes | `devnet`, `mainnet-beta`, etc. (`devnet` default) |
| `NEXT_PUBLIC_SOLANA_RPC` | yes | RPC URL passed to Wallet Adapter + x402 client |
| `NEXT_PUBLIC_X402_GATEWAY_URL` | yes | Solana-enabled x402 gateway endpoint |
| `NEXT_PUBLIC_USDC_MINT` | yes | SPL USDC mint (devnet default provided) |
| `NEXT_PUBLIC_EXPLORER_URL` | optional | Base URL for explorer links (defaults to `https://explorer.solana.com`) |
| `NEXT_PUBLIC_DEBUG` | optional | Enable verbose client logging |
| `NEXT_PUBLIC_PAYAI_FACILITATOR_URL` / `NEXT_PUBLIC_PAYAI_API_KEY` | optional | Forwarded to `solana.ts` payai overrides if needed |

## Troubleshooting (Solana)

- **“请先连接 Solana 钱包”** – Ensure Phantom/Solflare is unlocked and reload so Wallet Adapter can detect it.
- **“Payment is still required” after signing** – Confirm devnet USDC balance, verify the gateway URL, and check `NEXT_PUBLIC_USDC_MINT`.
- **No payment receipt displayed** – Inspect the response headers in devtools; `X-Payment-Response` must be present for decoding.
- **RPC errors or timeouts** – Override `NEXT_PUBLIC_SOLANA_RPC` with a more reliable endpoint (e.g., `https://api.devnet.solana.com` or a dedicated provider).

Refer to `docs/PHASE7_E2E_TEST.md` for step-by-step debugging commands, expected console logs, and network traces.

## Example Queries

- “Show me the total USDC spend last week”
- “List top 5 merchants by revenue”
- “What is the average basket size today?”

Additional prompts live in `src/config/exampleQueries.ts`.

## References

- x402 protocol docs – https://docs.cdp.coinbase.com/x402/
- x402 Solana gateway repo – https://github.com/HubbleVision/x402-solana-gateway
- Solana developer docs – https://docs.solana.com
- Circle devnet USDC faucet – https://faucet.circle.com/
- Solana Explorer – https://explorer.solana.com

## Support

- Hubble / x402 engineering updates: internal Slack
- Coinbase Developer Discord: https://discord.com/invite/cdp
- GitHub issues for x402: https://github.com/coinbase/x402/issues

## License

MIT
