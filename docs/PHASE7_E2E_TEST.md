# Phase 7: 端到端测试指南

## 概述

本指南介绍如何在 Solana devnet 上进行完整的端到端测试，验证 x402 支付流程是否正常工作。

## 前提条件

### 1. 环境配置

```bash
# 确保设置了以下环境变量
NEXT_PUBLIC_ACTIVE_CHAIN=solana
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402s.bedev.hubble-rpc.xyz
NEXT_PUBLIC_EXPLORER_URL=https://explorer.solana.com
NEXT_PUBLIC_DEBUG=true
```

### 2. 依赖检查

```bash
# 验证 Solana wallet adapter 已安装
npm ls @solana/wallet-adapter-react
npm ls @solana/wallet-adapter-react-ui

# 验证 x402-fetch 已安装
npm ls x402-fetch
```

### 3. 钱包准备

- **Phantom Wallet**: [安装 Chrome 扩展](https://phantom.app/)
- **Solflare Wallet**: [安装 Chrome 扩展](https://solflare.com/)
- **Backpack Wallet**: [安装 Chrome 扩展](https://www.backpack.app/)

### 4. 获取 devnet USDC

访问 [Circle Faucet](https://faucet.circle.com/) 领取 devnet USDC：

1. 连接你的 Phantom 钱包
2. 选择 Solana devnet
3. 输入钱包地址
4. 领取测试 USDC (标准: 100 USDC)

或者使用 Solana CLI:

```bash
solana airdrop 1 <ADDRESS> -u devnet
```

## 测试步骤

### 步骤 1: 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 步骤 2: 验证 UI 元素

- [ ] 确认页面显示 "Solana" 链选择器
- [ ] 确认钱包按钮显示 "Connect Wallet" (Solana 风格)
- [ ] 确认没有 RainbowKit 的 "Connect" 按钮

### 步骤 3: 连接 Phantom 钱包

**预期行为:**
1. 点击 "Connect Wallet" 按钮
2. Phantom 弹出窗口出现
3. 选择钱包账户并批准连接
4. 按钮变为显示钱包地址

**测试命令:**
```javascript
// 在浏览器控制台检查
console.log('Wallet connected:', window.__WALLET_ADDRESS__)
```

### 步骤 4: 查看 Debug 日志

打开浏览器控制台并确认以下日志:

```
✅ Created SolanaPaymentProcessor with wallet: [address]
✅ Wallet initialized with...
✅ x402-fetch wrapper created
```

### 步骤 5: 执行查询并触发支付

1. 在文本框中输入查询 (例如: "What is x402 protocol?")
2. 点击 "Query" 按钮
3. 等待钱包提示签署消息

**预期流程:**
- Request 1: 无支付 → 返回 402 Payment Required
- Phantom 弹出: 请求签署支付消息
- Request 2: 携带 X-PAYMENT 头 → 返回 200 及数据

### 步骤 6: 验证支付响应

检查以下内容:

- [ ] 页面显示 "Payment Successful" 消息
- [ ] 显示交易哈希（完整的 88 字符签名）
- [ ] 显示交易 URL 链接指向 Solana Explorer
- [ ] 显示金额和 USDC 代币信息
- [ ] 显示正确的时间戳

### 步骤 7: 验证 Block Explorer 链接

1. 点击交易哈希链接
2. 预期跳转到: `https://explorer.solana.com/tx/[SIGNATURE]?cluster=devnet`
3. 在 Solana Explorer 上验证交易详情

## Debug 检查清单

### 浏览器控制台

```javascript
// 检查钱包连接状态
typeof window.solana !== 'undefined' && window.solana.isConnected

// 检查 Solana web3
const sol = require('@solana/web3.js')
console.log('Solana web3 available:', !!sol)

// 检查环境变量
const chain = process.env.NEXT_PUBLIC_ACTIVE_CHAIN
console.log('Active chain:', chain)  // 应显示 'solana'

// 检查支付处理器初始化
localStorage.getItem('payment_processor_status')
```

### Network 标签

1. 打开 DevTools → Network
2. 观察查询请求:
   - **第一次 POST /api/query**: Status 402 (需支付)
   - **第二次 POST /api/query**: Status 200 (支付成功)

3. 检查响应头:
   - `X-Payment-Response`: Base64 编码的支付确认

### 常见问题排查

**问题 1: 钱包不连接**
```
❌ "Please connect your Solana wallet first"

解决方案:
- 确认 Phantom 已安装并启用
- 检查 NEXT_PUBLIC_ACTIVE_CHAIN=solana
- 清除浏览器缓存并刷新
```

**问题 2: 402 错误不触发支付**
```
❌ "Request failed: 402"

解决方案:
- 验证网关 URL: NEXT_PUBLIC_X402_GATEWAY_URL
- 确认 USDC 余额 > 0
- 检查浏览器控制台的详细错误
```

**问题 3: 签名请求被拒绝**
```
❌ "User rejected the request"

解决方案:
- 这是正常的用户拒绝行为
- 不会进行支付，查询失败
```

**问题 4: 支付成功但无结果**
```
⚠️ "Payment Successful" 但无查询结果

解决方案:
- 检查 x402 网关是否返回数据
- 验证 API 端点是否正确
- 检查后端日志
```

## 性能指标

### 目标指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 首次加载时间 | < 3s | 页面完全渲染 |
| 钱包连接 | < 2s | Phantom 显示并连接 |
| 第一个查询请求 | < 1s | 初始 POST 请求 |
| 支付签名提示 | < 2s | Phantom 签署消息 |
| 支付重试请求 | < 1s | 带支付头的 POST |
| 总响应时间 | < 5s | 从提交到显示结果 |

### 测量方法

```javascript
// 在页面加载时运行
const startTime = performance.now()
// ... 执行测试步骤 ...
const endTime = performance.now()
console.log(`Total time: ${endTime - startTime}ms`)
```

## 成功标志

✅ 所有以下条件都满足时，测试通过:

1. **钱包连接**: Phantom/Solflare/Backpack 成功连接
2. **查询执行**: 能够输入和提交查询
3. **支付流程**:
   - 402 响应正确触发
   - Phantom 签署消息提示出现
   - X-PAYMENT 头正确添加
4. **支付显示**:
   - 交易哈希正确显示
   - Explorer 链接正确生成
   - 时间戳正确显示
5. **查询结果**:
   - 返回 SQL 查询语句
   - 显示数据库结果
   - 无 JavaScript 错误

## 故障排除联系方式

遇到问题可以检查:

- GitHub Issues: [HubbleVision/anything-fe](https://github.com/HubbleVision/anything-fe/issues)
- x402 Docs: [x402.org](https://x402.org)
- Solana Docs: [docs.solana.com](https://docs.solana.com)

## 下一步

测试通过后:

1. ✅ 验证所有阶段功能正常
2. 🚀 部署到 devnet/testnet
3. 📊 收集用户反馈
4. 🔧 进行必要的优化调整
