import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientLayout from "@/components/ClientLayout";
import { SolanaProvider } from "@/context/SolanaProvider";
import { Web3Provider } from "@/context/Web3Provider";
import "./globals.css";

/**
 * 链类型选择
 *
 * 目前支持的链：
 * - 'solana': Solana devnet/mainnet（当前活跃）
 * - 'base': Base L2（备用）
 */
type ChainType = 'solana' | 'base';

/**
 * 当前活跃的区块链
 *
 * 可通过环境变量 NEXT_PUBLIC_ACTIVE_CHAIN 覆盖
 * 默认值：'solana'
 */
const ACTIVE_CHAIN: ChainType =
  (process.env.NEXT_PUBLIC_ACTIVE_CHAIN as ChainType) || 'solana';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hubble AI Assistant",
  description: "Hubble AI Assistant with x402 Payment Integration",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * 根据 ACTIVE_CHAIN 选择合适的 Provider
   *
   * - Solana: 使用 SolanaProvider（ConnectionProvider + WalletProvider）
   * - Base/EVM: 使用 Web3Provider（wagmi + RainbowKit）
   */
  const chainProvider =
    ACTIVE_CHAIN === 'solana' ? (
      <SolanaProvider>
        <ClientLayout>{children}</ClientLayout>
      </SolanaProvider>
    ) : (
      <Web3Provider>
        <ClientLayout>{children}</ClientLayout>
      </Web3Provider>
    );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {chainProvider}
      </body>
    </html>
  );
}
