'use client'

import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'

// Dynamically import Web3Provider with SSR disabled to avoid indexedDB errors during build
const Web3Provider = dynamic(() => import('@/context/Web3Provider'), {
  ssr: false,
})

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>
}

