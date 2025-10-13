# 🔒 Security Upgrade: Server-Side Payment Handling

## Overview

Private key and payment logic have been moved from client-side to server-side for enhanced security.

## ⚠️ Critical Changes

### Before (Insecure)
```typescript
// ❌ Private key exposed in browser
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x...  // BAD! Visible in browser

// Client-side payment logic
const account = privateKeyToAccount(process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY)
```

### After (Secure)
```typescript
// ✅ Private key only on server
CLIENT_PRIVATE_KEY=0x...  // GOOD! Server-only, never sent to browser

// Server-side payment logic in API route
// src/app/api/query/route.ts handles all payments
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Client-Side)                                       │
│                                                             │
│  ┌──────────────────┐                                      │
│  │ User submits     │                                      │
│  │ query            │                                      │
│  └────────┬─────────┘                                      │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐                                      │
│  │ fetch('/api/     │                                      │
│  │ query')          │                                      │
│  └────────┬─────────┘                                      │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │
            │ HTTPS
            │
┌───────────▼─────────────────────────────────────────────────┐
│ Server-Side (Next.js API Route)                            │
│                                                             │
│  ┌──────────────────────────────────────┐                 │
│  │ /api/query                           │                 │
│  │                                      │                 │
│  │  1. Get CLIENT_PRIVATE_KEY (secure) │                 │
│  │  2. Create account                   │                 │
│  │  3. Wrap fetch with x402-fetch       │                 │
│  │  4. Handle 402 payment automatically │                 │
│  │  5. Sign with private key            │                 │
│  │  6. Return results                   │                 │
│  └────────┬─────────────────────────────┘                 │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐                                      │
│  │ x402 Gateway     │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Production (.env.local or Hosting Platform)

```bash
# ✅ Server-side only (NO NEXT_PUBLIC_ prefix)
CLIENT_PRIVATE_KEY=0x1234567890abcdef...

# ✅ Can be public
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query
```

### Key Differences

| Variable | Prefix | Accessible From | Security |
|----------|--------|----------------|----------|
| `CLIENT_PRIVATE_KEY` | None | **Server only** | ✅ Secure |
| `NEXT_PUBLIC_*` | `NEXT_PUBLIC_` | **Client & Server** | ❌ Exposed to browser |

## Security Benefits

### 1. Private Key Never Exposed
- ✅ Private key stays on server
- ✅ Not included in JavaScript bundle
- ✅ Not visible in browser DevTools
- ✅ Not accessible via `process.env` in client code

### 2. Payment Logic Server-Side
- ✅ All signing happens on server
- ✅ EIP-3009 signatures created server-side
- ✅ No wallet client code in browser

### 3. Simplified Client Code
```typescript
// ❌ Before: ~150 lines of client-side payment logic
import { privateKeyToAccount } from 'viem/accounts'
import { wrapFetchWithPayment } from 'x402-fetch'
const account = privateKeyToAccount(privateKey)
const fetchWithPayment = wrapFetchWithPayment(fetch, account)

// ✅ After: Simple API call
const response = await fetch('/api/query', {
  method: 'POST',
  body: JSON.stringify({ question })
})
```

## File Changes

### Modified Files

1. **`src/app/api/query/route.ts`** - ✅ All payment logic here
   - Imports `x402-fetch` and `viem/accounts`
   - Reads `CLIENT_PRIVATE_KEY` from server env
   - Creates account and wraps fetch
   - Handles 402 responses automatically

2. **`src/hooks/useX402Payment.ts`** - ✅ Simplified to just API calls
   - No more private key handling
   - No more `x402-fetch` wrapper
   - Simple `fetch()` to API route

3. **`src/app/page.tsx`** - ✅ Removed account display
   - No `accountAddress` prop
   - Simple query submission

4. **`env.template`** - ✅ Updated variable names
   - Changed from `NEXT_PUBLIC_CLIENT_PRIVATE_KEY`
   - To `CLIENT_PRIVATE_KEY` (server-only)

### Removed Dependencies (from client bundle)

```diff
- privateKeyToAccount (viem/accounts) - moved to server
- wrapFetchWithPayment (x402-fetch) - moved to server
```

## Deployment

### Vercel

1. Go to Project Settings → Environment Variables
2. Add `CLIENT_PRIVATE_KEY` with your private key
3. **DO NOT** add `NEXT_PUBLIC_` prefix
4. Deploy

### Other Platforms

Set environment variable on your hosting platform:
- Railway: Variables tab
- Netlify: Site settings → Environment variables
- AWS: Set in Lambda/EC2 environment
- Docker: Pass via `docker run -e CLIENT_PRIVATE_KEY=...`

## Verification

### Check 1: Private Key Not in Browser

Open browser DevTools → Console:
```javascript
// ❌ Should be undefined (secure)
console.log(process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY)
// → undefined ✅

// ✅ Only this should exist
console.log(process.env.NEXT_PUBLIC_X402_GATEWAY_URL)
// → https://x402.bedev.hubble-rpc.xyz/lego/api/v1/query ✅
```

### Check 2: Payment Works

1. Submit a query
2. See server logs show payment processing
3. Query completes successfully
4. Payment transaction link appears

### Check 3: Source Code Inspection

View page source (Ctrl+U):
- ❌ Should NOT see any private key
- ❌ Should NOT see `x402-fetch` in client bundle
- ✅ Should only see simple `fetch('/api/query')` calls

## Migration Checklist

- [x] Move private key from `NEXT_PUBLIC_CLIENT_PRIVATE_KEY` to `CLIENT_PRIVATE_KEY`
- [x] Move x402-fetch logic to API route
- [x] Simplify client-side hook
- [x] Update environment variable documentation
- [x] Remove account address display
- [x] Test payment flow
- [x] Verify private key not exposed in browser
- [x] Update deployment guides

## Best Practices

### ✅ DO

- Keep `CLIENT_PRIVATE_KEY` on server
- Use dedicated payment account with limited funds
- Monitor transaction logs
- Rotate keys periodically
- Use `.env.local` for local development (gitignored)

### ❌ DON'T

- Add `NEXT_PUBLIC_` prefix to `CLIENT_PRIVATE_KEY`
- Commit private keys to git
- Use main wallet for automated payments
- Share private keys across environments
- Log full private key in server logs

## Troubleshooting

### Error: "Payment account not configured on server"

**Cause**: `CLIENT_PRIVATE_KEY` environment variable not set

**Solution**: 
1. Check `.env.local` has `CLIENT_PRIVATE_KEY=0x...`
2. Restart dev server: `pnpm dev`
3. For production, set in hosting platform

### Error: "Invalid private key"

**Cause**: Private key format incorrect

**Solution**: 
- Must start with `0x`
- Must be 64 hexadecimal characters (+ `0x` prefix)
- Example: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### Payment not working

**Cause**: Account has no USDC on Base Sepolia

**Solution**:
1. Check account balance on [Base Sepolia](https://sepolia.basescan.org/)
2. Get test ETH from faucet
3. Swap for test USDC

## Summary

This upgrade significantly improves security by:
1. ✅ Keeping private keys server-side only
2. ✅ Moving all payment logic to API routes
3. ✅ Reducing attack surface
4. ✅ Following Next.js security best practices
5. ✅ Maintaining same user experience

**Result**: Private key is never exposed to the browser, making the application production-ready.

