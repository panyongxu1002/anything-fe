# Solana 迁移指南

本文档记录从 Base 链迁移到 Solana 的完整计划和进度。

## 📋 项目概述

**目标**：支持 Solana devnet 上使用 x402 支付协议的查询服务

**关键资源**：
- 网关：https://x402s.bedev.hubble-rpc.xyz
- 网关源代码：https://github.com/HubbleVision/x402-solana-gateway
- 客户端参考：https://github.com/HubbleVision/x402-solana-gateway/blob/develop/scripts/x402-client-js/src/index.ts
- PayAI 文档：https://docs.payai.network/introduction
- USDC 水龙头：https://faucet.circle.com/

---

## 🔧 依赖版本确认

### 来自 x402-solana-gateway 的版本参考

需要确认以下依赖版本（应从网关仓库的 package.json 中验证）：

```json
{
  "@solana/web3.js": "需要确认的版本（避免与钱包适配器冲突）",
  "@solana/wallet-adapter-react": "^0.15.x",
  "@solana/wallet-adapter-wallets": "^0.19.x",
  "@solana/wallet-adapter-phantom": "^0.9.x",
  "@solana/wallet-adapter-base": "^0.9.x（可选）",
  "@solana/spl-token": "^0.4.x（如需 Token 操作）",
  "x402-fetch": "^0.6.6（保持不变）"
}
```

### 版本确认清单

- [ ] 查阅 x402-solana-gateway 的 package.json
- [ ] 确认 @solana/web3.js 具体版本号
- [ ] 验证钱包适配器版本兼容性
- [ ] 检查是否有特殊的 tsconfig 配置
- [ ] 记录完整的锁定版本清单

---

## 📊 阶段进度

### 阶段 1：签名流程验证 ⏳
**状态**：进行中
**时间**：2-3 天

**任务**：
- [x] 创建 `feature/solana-validation` 分支
- [x] 创建测试脚本 `scripts/test-solana-signing.ts`
- [ ] 运行脚本验证 Solana RPC 连通性
- [ ] 集成真实钱包适配器进行签名测试
- [ ] 验证 x402-fetch 与 Solana 网关兼容性
- [ ] 生成签名流程验证报告

**关键验证点**：
1. Solana RPC 连接是否正常
2. signMessage() 方法是否可用
3. x402-fetch 是否正确拦截 402 响应
4. 支付签名流程是否完整

**输出物**：
- 签名流程验证报告
- 依赖版本锁定清单

---

### 阶段 2：支付钩子抽象层设计 ⏳

**预计**：阶段 1 完成后开始

**任务**：
- [ ] 定义 `PaymentProcessor` 接口
- [ ] 创建 `src/hooks/types/payment.ts`
- [ ] 保留 `useX402Payment.ts`（EVM 实现）
- [ ] 创建 `useX402SolanaPayment.ts`（Solana 实现）
- [ ] 文档化 EVM/Solana 差异

**关键设计**：
```
PaymentProcessor Interface
  ├── initialize(client)
  ├── fetchWithPayment(url, options)
  └── decodePaymentResponse(header)

实现
  ├── EvmPaymentProcessor (基于现有 useX402Payment)
  └── SolanaPaymentProcessor (新增)
```

---

### 阶段 3：环境与配置化管理 ⏳

**预计**：阶段 2 完成后开始

**任务**：
- [ ] 创建 `src/config/solana.ts`
- [ ] 创建 `src/config/chains.ts`（多链管理）
- [ ] 准备 `.env.local` 模板
- [ ] 与网关负责人确认支付响应格式

**配置项**：
```typescript
// solana.ts
- cluster: 'devnet' | 'mainnet-beta'
- rpc: string
- gatewayUrl: string
- usdcMint: string
- explorerBaseUrl: string
```

**环境变量**：
```
NEXT_PUBLIC_SOLANA_CHAIN=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_X402_GATEWAY_URL=https://x402s.bedev.hubble-rpc.xyz
NEXT_PUBLIC_USDC_MINT=<devnet USDC mint>
NEXT_PUBLIC_EXPLORER_URL=https://explorer.solana.com
```

---

### 阶段 4：Solana Provider 与钱包连接 ⏳

**预计**：阶段 3 完成后开始

**任务**：
- [ ] 创建 `src/context/SolanaProvider.tsx`
- [ ] 集成 `@solana/wallet-adapter-react`
- [ ] 实现钱包连接逻辑
- [ ] 修改 `src/app/layout.tsx` 支持链选择

---

### 阶段 5：支付钩子实现与联调 ⏳

**预计**：阶段 4 完成后开始

**任务**：
- [ ] 实现 `useX402SolanaPayment` 完整逻辑
- [ ] 修改页面组件集成 Solana 支付
- [ ] 测试支付流程完整链路

---

### 阶段 6：UI 细节与数据显示 ⏳

**预计**：阶段 5 完成后开始

**任务**：
- [ ] 更新 `WalletConnectButton` 为 Solana 适配
- [ ] 修改支付确认提示（Block Explorer 链接）
- [ ] 验证 `QueryResultDisplay` 兼容性

---

### 阶段 7：集成测试与验证 ⏳

**预计**：阶段 6 完成后开始

**任务**：
- [ ] 测试 Phantom 钱包连接
- [ ] 测试 Circle Faucet USDC 领取
- [ ] 完整支付流程端到端测试
- [ ] 错误处理和边界情况测试

---

## 🔗 关键技术点

### EVM vs Solana 差异

| 环节 | EVM (Base) | Solana |
|------|-----------|--------|
| 钱包连接 | RainbowKit | @solana/wallet-adapter |
| 钱包客户端 | wagmi | @solana/wallet-adapter-react |
| 签名方法 | signTypedData() | signMessage() |
| 签名协议 | EIP-712 | Solana message signing |
| Token 标准 | ERC-20 | SPL |
| Block Explorer | basescan.io | solscan.io / explorer.solana.com |
| 支付验证 | 在线 EIP-3009 验证 | 由网关处理 |

### 保持不变的部分

- ✅ `x402-fetch` 库（设计为多链）
- ✅ API 代理逻辑 `/api/query/route.ts`
- ✅ 结果展示组件 `QueryResultDisplay.tsx`
- ✅ 示例查询配置 `exampleQueries.ts`

### 需要适配的部分

- ❌ 钱包连接（RainbowKit → Solana Wallet Adapter）
- ❌ 链配置（wagmi → Solana RPC）
- ❌ 支付钩子（signTypedData → signMessage）
- ❌ UI 细节（Block Explorer 链接等）

---

## 🚀 快速启动

### 本地开发设置

```bash
# 1. 切换到验证分支
git checkout feature/solana-validation

# 2. 安装依赖（暂时保留 EVM 依赖，后续可移除）
npm install

# 3. 验证 Solana RPC
npx tsx scripts/test-solana-signing.ts

# 4. 设置环境变量
cp .env.example .env.local
# 编辑 .env.local，添加 Solana 相关配置

# 5. 启动开发服务器
npm run dev
```

### 获取测试 USDC

1. 访问 https://faucet.circle.com/
2. 选择 Solana devnet
3. 输入钱包地址
4. 领取测试 USDC

### 测试支付流程

1. 连接 Phantom 钱包（切换到 devnet）
2. 输入查询问题
3. 确认签名（无需支付 gas）
4. 查看结果和支付确认

---

## 📝 网关返回格式确认

需要向网关负责人确认以下信息：

- [ ] 402 响应中是否包含 USDC mint 地址？
- [ ] decimals 字段是否为 6？
- [ ] 交易哈希格式（Solana 签名长度）？
- [ ] X-Payment-Response 中的字段定义？
- [ ] 支付确认是否即时？

---

## 🐛 已知问题和注意事项

### 打包体积考量

- 添加 Solana 库会增加 bundle size (~200KB)
- 初期保留 EVM 依赖用于测试，后续可考虑移除
- 最终版本可创建独立仓库 `anything-fe-solana` 以最小化体积

### 钱包适配器兼容性

- 某些版本的 @solana/wallet-adapter 与 Next.js 的 SSR 可能有冲突
- 需要 `"use client"` 指令或动态导入

### 网关协议细节

- x402-fetch 库是否完全支持 Solana 的 signMessage？
- 可能需要根据实际集成情况进行微调

---

## 📞 联系和沟通

- 网关源代码问题：查阅 https://github.com/HubbleVision/x402-solana-gateway
- 支付协议问题：参考 PayAI 文档 https://docs.payai.network/
- Solana 开发问题：https://solana.com/docs

---

## 下一步

1. ✅ 运行 `scripts/test-solana-signing.ts` 验证环境
2. ⏳ 确认依赖版本并生成锁定清单
3. ⏳ 进入阶段 2（支付钩子抽象层设计）

---

*最后更新：2025-01-04*
*维护者：Solana 迁移团队*
