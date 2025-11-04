'use client'

import { type ReactNode } from 'react'

/**
 * ClientLayout 组件
 *
 * 提供客户端布局和样式包裹
 *
 * 注意：Provider 包裹（Web3Provider/SolanaProvider）已移至根布局 (layout.tsx)
 * 以支持多链选择。ClientLayout 仅负责客户端布局逻辑。
 *
 * @param children React 子组件
 * @returns 包装后的客户端布局
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

