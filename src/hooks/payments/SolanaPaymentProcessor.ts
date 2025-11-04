/**
 * Solana 支付处理器实现
 *
 * 基于 @solana/wallet-adapter-react 的 useWallet() hook
 * 支持通过 signMessage() 进行链上支付验证
 *
 * 关键特性：
 * - 使用 x402-fetch 库自动处理 402 Payment Required 响应
 * - 通过 signMessage() 生成支付证明
 * - 支持 Phantom、Solflare 等 Solana 钱包
 *
 * 与 EVM 版本的主要差异：
 * - 签名方法：signMessage() 而不是 signTypedData()
 * - 消息格式：Solana 消息而不是 EIP-712 结构化数据
 * - 其他流程由 x402-fetch 库自动处理
 */

import { wrapFetchWithPayment } from 'x402-fetch';
import type {
  PaymentProcessor,
  PaymentResponse,
  QueryResponse,
  PaymentError,
} from './types';
import { PaymentError as PaymentErrorClass, PaymentErrorCode } from './types';

/**
 * Solana 钱包适配器接口
 * 对应 @solana/wallet-adapter-react 的 useWallet() 返回值
 */
interface SolanaWalletAdapter {
  /** 钱包是否已连接 */
  connected: boolean;

  /** 连接的钱包地址 (PublicKey) */
  publicKey: any | null;

  /** 钱包名称 (如 'Phantom', 'Solflare') */
  name?: string;

  /** 签署消息方法 */
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;

  /** 签署交易方法（可选） */
  signTransaction?: (transaction: any) => Promise<any>;

  /** 签署多个交易方法（可选） */
  signAllTransactions?: (transactions: any[]) => Promise<any[]>;

  /** 连接钱包 */
  connect?: () => Promise<void>;

  /** 断开连接 */
  disconnect?: () => Promise<void>;
}

/**
 * Solana 支付处理器
 *
 * 使用示例：
 * ```typescript
 * const { publicKey, signMessage } = useWallet();
 * const processor = new SolanaPaymentProcessor({
 *   gatewayUrl: 'https://x402s.bedev.hubble-rpc.xyz',
 *   chainId: 'solana-devnet'
 * });
 *
 * processor.initialize({ publicKey, signMessage });
 *
 * const result = await processor.fetchWithPayment(
 *   '/api/query',
 *   {
 *     method: 'POST',
 *     body: JSON.stringify({ question: '...' })
 *   }
 * );
 * ```
 */
export class SolanaPaymentProcessor implements PaymentProcessor {
  private gatewayUrl: string;
  private chainId: string;
  private wallet: SolanaWalletAdapter | null = null;
  private fetchWithPayment: any = null;
  private debug: boolean = false;

  constructor(options: {
    gatewayUrl: string;
    chainId: string;
    debug?: boolean;
  }) {
    this.gatewayUrl = options.gatewayUrl;
    this.chainId = options.chainId;
    this.debug = options.debug || false;

    this.log('初始化 SolanaPaymentProcessor', { gatewayUrl: this.gatewayUrl });
  }

  /**
   * 初始化处理器
   *
   * 接收来自 useWallet() hook 的钱包对象
   * 并创建 x402-fetch 包装器
   */
  initialize(wallet: SolanaWalletAdapter): void {
    if (!wallet) {
      throw new PaymentErrorClass('钱包对象不能为空', PaymentErrorCode.WALLET_NOT_CONNECTED);
    }

    this.wallet = wallet;

    // 检查必要的方法
    if (!wallet.signMessage) {
      throw new PaymentErrorClass(
        '钱包不支持 signMessage 方法',
        PaymentErrorCode.WALLET_NOT_CONNECTED
      );
    }

    this.log('钱包已初始化', {
      connected: wallet.connected,
      address: wallet.publicKey?.toString() || 'unknown',
      walletName: wallet.name,
    });

    // 创建 x402-fetch 包装器
    // 关键：传入 signMessage 方法，x402-fetch 将在需要时调用它
    this.fetchWithPayment = wrapFetchWithPayment(fetch, {
      sign: wallet.signMessage, // Solana 消息签名方法
    });

    this.log('x402-fetch 包装器已创建');
  }

  /**
   * 执行支付包装的请求
   *
   * 核心流程：
   * 1. 使用 x402-fetch 发送请求
   * 2. 如果收到 402 Payment Required，x402-fetch 自动拦截
   * 3. 调用 wallet.signMessage() 获取签名
   * 4. 创建 X-PAYMENT 头并重试请求
   * 5. 返回查询结果
   */
  async fetchWithPayment<T = QueryResponse>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    try {
      // 检查钱包连接
      if (!this.isConnected()) {
        throw new PaymentErrorClass(
          '钱包未连接',
          PaymentErrorCode.WALLET_NOT_CONNECTED
        );
      }

      if (!this.fetchWithPayment) {
        throw new PaymentErrorClass(
          'x402-fetch 尚未初始化',
          PaymentErrorCode.UNKNOWN
        );
      }

      this.log('发送请求', {
        url,
        method: options.method || 'GET',
      });

      // 调用 x402-fetch 包装的 fetch
      // 它会自动处理：
      // 1. 初始请求
      // 2. 402 响应拦截
      // 3. 钱包签署消息
      // 4. 生成 X-PAYMENT 头
      // 5. 自动重试请求
      const response = await this.fetchWithPayment(url, options);

      this.log('请求完成', {
        status: response.status,
        ok: response.ok,
      });

      // 检查响应状态
      if (!response.ok && response.status !== 402) {
        throw new PaymentErrorClass(
          `请求失败: ${response.status} ${response.statusText}`,
          PaymentErrorCode.PAYMENT_REQUEST_FAILED
        );
      }

      // 解析响应数据
      const data = await response.json();

      // 如果还是 402，说明支付验证失败
      if (response.status === 402) {
        this.log('网关返回 402 - 可能是支付验证失败', data);
        throw new PaymentErrorClass(
          '支付验证失败',
          PaymentErrorCode.PAYMENT_VERIFICATION_FAILED,
          data
        );
      }

      // 提取支付响应头（如果存在）
      const paymentResponseHeader = response.headers.get('X-Payment-Response');
      let paymentInfo: PaymentResponse | undefined;

      if (paymentResponseHeader) {
        try {
          paymentInfo = this.decodePaymentResponse(paymentResponseHeader);
          this.log('支付信息已解析', paymentInfo);
        } catch (error) {
          this.log('警告：支付响应头解析失败', error);
          // 不中断流程，支付可能已成功但响应头格式有问题
        }
      }

      // 返回格式化的结果
      const result: QueryResponse = {
        success: true,
        sqlQuery: data.sqlQuery || data.sql_used,
        dbResults: data.dbResults || data.data,
        paymentInfo,
        raw: data,
      };

      return result as T;
    } catch (error) {
      this.log('错误：', error);

      if (error instanceof PaymentErrorClass) {
        throw error;
      }

      // 包装其他错误
      throw new PaymentErrorClass(
        error instanceof Error ? error.message : String(error),
        PaymentErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * 解析 X-Payment-Response 头
   *
   * 格式：Base64 编码的支付确认信息
   *
   * @param headerValue X-Payment-Response 头的值
   * @returns 解析后的支付信息
   */
  decodePaymentResponse(headerValue: string): PaymentResponse {
    try {
      // 解码 Base64
      const decoded = Buffer.from(headerValue, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);

      // 验证必要字段
      if (!parsed.transactionHash && !parsed.signature) {
        throw new Error('缺少交易哈希或签名信息');
      }

      const response: PaymentResponse = {
        transactionHash: parsed.transactionHash || parsed.signature,
        network: parsed.network || this.chainId,
        amount: parsed.amount || '0',
        asset: parsed.asset || parsed.mint || 'unknown',
        timestamp: parsed.timestamp || Date.now(),
        payer: parsed.payer || parsed.from,
        payee: parsed.payee || parsed.to,
        rawHeader: headerValue,
      };

      return response;
    } catch (error) {
      throw new PaymentErrorClass(
        `无法解析支付响应头: ${error instanceof Error ? error.message : String(error)}`,
        PaymentErrorCode.PAYMENT_RESPONSE_PARSE_FAILED,
        { headerValue, error }
      );
    }
  }

  /**
   * 检查钱包是否已连接
   */
  isConnected(): boolean {
    return this.wallet?.connected || false;
  }

  /**
   * 获取钱包地址
   */
  getAddress(): string | null {
    return this.wallet?.publicKey?.toString() || null;
  }

  /**
   * 获取链 ID
   */
  getChainId(): string {
    return this.chainId;
  }

  /**
   * 调试日志
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[SolanaPaymentProcessor] ${message}`, data || '');
    }
  }
}

/**
 * 导出类型，便于使用
 */
export type { SolanaWalletAdapter };
