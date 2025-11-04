'use client';

/**
 * Solana Provider 组件
 *
 * 为 Solana 网络提供必要的上下文和基础设施：
 * 1. ConnectionProvider - RPC 连接
 * 2. WalletProvider - 钱包适配器管理
 * 3. WalletModalProvider - 钱包连接 UI 组件
 *
 * 使用方式：
 * 在根 layout 中包装 children
 * ```tsx
 * <SolanaProvider>
 *   {children}
 * </SolanaProvider>
 * ```
 */

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { clusterApiUrl } from '@solana/web3.js';

// 导入样式（WalletModalProvider 需要）
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * SolanaProvider 组件
 *
 * 提供 Solana 钱包和连接上下文
 *
 * @param children React 子组件
 * @returns 包装后的 Provider 树
 */
export function SolanaProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  /**
   * RPC 端点配置
   *
   * 优先级：
   * 1. 环境变量 NEXT_PUBLIC_SOLANA_RPC
   * 2. 根据 NEXT_PUBLIC_SOLANA_CLUSTER 的官方 RPC
   * 3. 默认 devnet
   */
  const endpoint = useMemo(() => {
    // 如果有明确配置的 RPC 地址，使用它
    if (process.env.NEXT_PUBLIC_SOLANA_RPC) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC;
    }

    // 否则根据集群选择官方 RPC
    const cluster = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ||
      'devnet') as 'devnet' | 'testnet' | 'mainnet-beta';

    try {
      return clusterApiUrl(cluster);
    } catch {
      // clusterApiUrl 可能不支持某些集群，降级到 devnet
      console.warn(
        `Invalid cluster "${cluster}", falling back to devnet`
      );
      return clusterApiUrl('devnet');
    }
  }, []);

  /**
   * 钱包适配器列表
   *
   * 支持的钱包（按推荐顺序）：
   * 1. Phantom - 最广泛使用的 Solana 钱包
   * 2. Solflare - 功能丰富的多链钱包
   * 3. Backpack - 现代 Solana 钱包
   *
   * 初期硬编码钱包列表，后续可扩展或动态加载
   */
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(error) => {
          console.warn('[SolanaProvider] Wallet error:', error);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * 注意：
 * - ConnectionProvider、WalletProvider 来自 @solana/wallet-adapter-react
 * - WalletModalProvider 来自 @solana/wallet-adapter-react-ui
 * - 通常不需要在外部单独导出，因为 SolanaProvider 已经完整包裹
 */
