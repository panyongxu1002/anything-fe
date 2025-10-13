# X402 Official Specification Analysis

Based on the official x402 GitHub repository: https://github.com/coinbase/x402

## Key Findings from Official Spec

### Payment Payload Structure (Correct Format)

According to the official spec, the `X-PAYMENT` header should contain:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "payload": <scheme dependent>
}
```

**Important**: The `payload` field is **scheme dependent**.

### For "exact" Scheme on EVM

According to `specs/schemes/exact/scheme_exact_evm.md`, the exact scheme uses **EIP-3009** (Transfer With Authorization) or **EIP-3009** (Receive With Authorization).

This means the payload is NOT a simple signature, but rather:

1. **Uses EIP-712 Typed Data Signature** (not simple message signing!)
2. **Contains authorization parameters** for the ERC-20 token transfer
3. **Uses `transferWithAuthorization` or `receiveWithAuthorization` functions**

### Expected Payload Structure for EIP-3009

```typescript
{
  from: string,        // Payer address
  to: string,          // Payee address (payTo)
  value: string,       // Amount
  validAfter: number,  // Timestamp when authorization becomes valid
  validBefore: number, // Timestamp when authorization expires
  nonce: string,       // Unique nonce (32 bytes hex)
  v: number,          // Signature v
  r: string,          // Signature r (32 bytes hex)
  s: string           // Signature s (32 bytes hex)
}
```

## Why Our Current Implementation is Wrong

### Our Current Approach ❌
```typescript
// We sign a simple JSON message
const message = JSON.stringify({
  network: "base-sepolia",
  asset: "0x...",
  amount: "10000",
  payTo: "0x...",
  payer: "0x...",
  timestamp: 1760328074,
  nonce: "abc123"
})

// Then create payload
{
  x402Version: 1,
  scheme: "exact",
  payload: {
    network: "base-sepolia",
    asset: "0x...",
    amount: "10000",
    // ... with signature
  }
}
```

### Correct Approach (EIP-3009) ✅
```typescript
// 1. Sign EIP-712 typed data for transferWithAuthorization
const domain = {
  name: "USDC",  // Token name
  version: "2",  // Token version
  chainId: 84532,
  verifyingContract: "0x036CbD53..." // USDC contract address
}

const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
}

const message = {
  from: "0xb7D082ABE53E887bab7FC20F0A6B767e762babb7",
  to: "0x7E3FACDE45EBB967A9adaFd096f1d7Cf926baab8",
  value: "10000",
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: "0x..." // 32 bytes hex
}

// 2. Get signature and split into v, r, s
const signature = await signTypedDataAsync({ domain, types, message })
const { v, r, s } = splitSignature(signature)

// 3. Create payload
{
  x402Version: 1,
  scheme: "exact",
  payload: {
    from: message.from,
    to: message.to,
    value: message.value,
    validAfter: message.validAfter,
    validBefore: message.validBefore,
    nonce: message.nonce,
    v,
    r,
    s
  }
}
```

## What We Need to Do

1. **Use EIP-712 Typed Data Signature** instead of simple message signing
2. **Get token metadata** (name, version) from the `extra` field or chain
3. **Split signature** into v, r, s components
4. **Use proper nonce format** (32 bytes hex, not random string)
5. **Set validAfter and validBefore** timestamps

## References

- [EIP-3009 Specification](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-712 Typed Data](https://eips.ethereum.org/EIPS/eip-712)
- [x402 Repository](https://github.com/coinbase/x402)
- [x402 exact scheme spec](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)

## Next Steps

1. Install ethers or viem utilities for signature splitting
2. Implement EIP-712 signing
3. Update payload structure
4. Test with Gateway

