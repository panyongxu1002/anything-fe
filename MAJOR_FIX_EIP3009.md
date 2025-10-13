# 🎯 重大修复：使用 EIP-3009 标准

## 问题根源

通过查看 [x402 官方仓库](https://github.com/coinbase/x402)，我们发现**之前的实现方式完全错误**！

### ❌ 之前的错误实现

```typescript
// 错误：使用简单的消息签名
const message = JSON.stringify({
  network: "base-sepolia",
  asset: "0x...",
  amount: "10000",
  payTo: "0x...",
  payer: "0x...",
  timestamp: 1760328074,
  nonce: "abc123"
})

const signature = await signMessageAsync({ message })

// 错误的 payload 结构
payload: {
  network: "base-sepolia",
  asset: "0x...",
  amount: "10000",
  payTo: "0x...",
  payer: "0x...",
  signature: "0x...",
  timestamp: 1760328074,
  nonce: "abc123"
}
```

**问题**：
1. 使用了简单的消息签名而不是 EIP-712
2. Payload 结构不符合 EIP-3009 标准
3. Nonce 格式错误（应该是 32 bytes hex）
4. 缺少 v, r, s 签名组件
5. 缺少 validAfter 和 validBefore 字段

### ✅ 正确的实现（EIP-3009）

根据 x402 官方规范：`specs/schemes/exact/scheme_exact_evm.md`

```typescript
// 正确：使用 EIP-712 类型化数据签名
const domain = {
  name: "USDC",              // 从 extra.name 获取
  version: "2",              // 从 extra.version 获取
  chainId: 84532,            // Base Sepolia
  verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // USDC 合约地址
}

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
}

const message = {
  from: "0xb7D082ABE53E887bab7FC20F0A6B767e762babb7",
  to: "0x7E3FACDE45EBB967A9adaFd096f1d7Cf926baab8",
  value: BigInt("10000"),
  validAfter: BigInt(0),
  validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600),
  nonce: "0x..." // 32 bytes hex
}

// 使用 EIP-712 签名
const signature = await signTypedDataAsync({
  domain,
  types,
  primaryType: 'TransferWithAuthorization',
  message
})

// 拆分签名为 v, r, s
const v = parseInt(signature.slice(130, 132), 16)
const r = '0x' + signature.slice(2, 66)
const s = '0x' + signature.slice(66, 130)

// 正确的 payload 结构（EIP-3009）
payload: {
  from: "0xb7D082ABE53E887bab7FC20F0A6B767e762babb7",
  to: "0x7E3FACDE45EBB967A9adaFd096f1d7Cf926baab8",
  value: "10000",
  validAfter: "0",
  validBefore: "1760331674",
  nonce: "0x1234...abcd", // 32 bytes hex
  v: 28,
  r: "0x...",
  s: "0x..."
}
```

## 什么是 EIP-3009？

[EIP-3009](https://eips.ethereum.org/EIPS/eip-3009) 定义了 `transferWithAuthorization` 和 `receiveWithAuthorization` 函数，允许通过链下签名来授权代币转账。

### 关键特点：

1. **Gas-less transactions**: 用户不需要支付 gas，由接收方提交交易
2. **Meta-transactions**: 支持元交易模式
3. **EIP-712 签名**: 使用类型化数据签名，更安全
4. **Time-bound**: 可以设置授权的有效时间窗口

### USDC 使用 EIP-3009

USDC 代币合约实现了 EIP-3009 标准，因此 x402 的 "exact" scheme 在 EVM 上使用这个标准。

## 修改的文件

### 1. `src/types/x402.ts`

```typescript
// 更新 X402PaymentPayload 为 EIP-3009 格式
export interface X402PaymentPayload {
  from: string          // Payer address
  to: string            // Payee address
  value: string         // Amount in smallest unit
  validAfter: string    // Timestamp when authorization becomes valid
  validBefore: string   // Timestamp when authorization expires
  nonce: string         // 32 bytes hex nonce
  v: number            // Signature v component
  r: string            // Signature r component
  s: string            // Signature s component
}
```

### 2. `src/hooks/useX402Payment.ts`

主要变化：

1. **导入变更**:
   - ❌ `useSignMessage` 
   - ✅ `useSignTypedData`
   - ✅ `toHex` from viem

2. **Nonce 生成**:
   - ❌ `Math.random().toString(36)`
   - ✅ `toHex(crypto.getRandomValues(new Uint8Array(32)))`

3. **签名方式**:
   - ❌ `signMessageAsync({ message: JSON.stringify(...) })`
   - ✅ `signTypedDataAsync({ domain, types, primaryType, message })`

4. **Payload 结构**:
   - ❌ `{ network, asset, amount, payTo, payer, signature, timestamp, nonce }`
   - ✅ `{ from, to, value, validAfter, validBefore, nonce, v, r, s }`

## 工作原理

### Step 1: 用户签名 EIP-712 消息

```
用户钱包 → EIP-712 签名 → { v, r, s }
```

### Step 2: 构造 X-PAYMENT Header

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "payload": {
    "from": "0x...",
    "to": "0x...",
    "value": "10000",
    "validAfter": "0",
    "validBefore": "1760331674",
    "nonce": "0x...",
    "v": 28,
    "r": "0x...",
    "s": "0x..."
  }
}
```

Base64 编码后放入 `X-PAYMENT` header。

### Step 3: Gateway 验证签名

Gateway 使用 USDC 合约的 `transferWithAuthorization` 来验证：

```solidity
function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
) external
```

### Step 4: 执行转账

如果签名有效，Gateway 调用合约执行转账，用户的 USDC 会被转给 Gateway。

## 为什么之前失败？

Gateway 期望 EIP-3009 格式的签名，但我们发送的是：

1. ❌ 简单消息签名（不是 EIP-712）
2. ❌ 错误的 payload 结构
3. ❌ 缺少 v, r, s 组件
4. ❌ Nonce 格式不对（不是 32 bytes hex）

所以 Gateway 返回 402，因为它无法验证我们的签名。

## 测试步骤

1. **确保钱包连接**
2. **确保在 Base Sepolia 网络**
3. **确保有测试 USDC**
4. **发起查询**
5. **在钱包中签名** - 现在会看到 EIP-712 结构化数据
6. **等待结果**

## 预期行为

### 钱包签名弹窗会显示：

```
Sign Message

Domain:
  Name: USDC
  Version: 2
  Chain ID: 84532
  Verifying Contract: 0x036CbD53...

Message:
  from: 0xb7D082AB...
  to: 0x7E3FACDE...
  value: 10000
  validAfter: 0
  validBefore: 1760331674
  nonce: 0x1234...
```

这是 EIP-712 的标准显示，比之前的简单消息签名更安全、更清晰。

## 控制台日志

现在会看到：

```
📝 Generated EIP-3009 parameters
🪙 Token metadata: { tokenName: "USDC", tokenVersion: "2", chainId: 84532 }
📄 EIP-712 Domain: {...}
📄 EIP-712 Types: {...}
📄 EIP-712 Message: {...}
🔐 Requesting EIP-712 signature from wallet...
✅ EIP-712 Signature received
🔓 Signature components: { v: 28, r: "0x...", s: "0x..." }
📝 Payment Proof Structure (EIP-3009): {...}
```

## 参考资料

- [EIP-3009 Specification](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [x402 GitHub Repository](https://github.com/coinbase/x402)
- [x402 exact scheme spec](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)
- [USDC Contract on Base Sepolia](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e)

## 下一步

1. ✅ 代码已修复
2. ⏳ 运行 `pnpm dev` 测试
3. ⏳ 连接钱包并发起查询
4. ⏳ 签名 EIP-712 消息
5. ⏳ 验证支付成功

🎉 **这次应该能成功了！**

