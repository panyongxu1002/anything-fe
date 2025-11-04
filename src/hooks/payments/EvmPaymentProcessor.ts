/**
 * EVM 支付处理器实现 (Base 链)
 *
 * 基于 wagmi 的 useWalletClient hook
 * 支持通过 EIP-3009 gasless transfers 进行链上支付
 *
 * 关键特性：
 * - 使用 x402-fetch 库自动处理 402 Payment Required 响应
 * - 通过 signTypedData() 生成 EIP-3009 授权签名
 * - 支持 MetaMask、Coinbase Wallet 等 EVM 钱包
 *
 * 注意：
 * - 这是从原有 useX402Payment hook 中提取的实现
 * - 保留与原版本的兼容性
 * - 后续可与 Solana 版本进行统一多链管理
 */

import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import type {
  PaymentProcessor,
  PaymentResponse,
  QueryResponse,
} from './types';
import { PaymentError, PaymentErrorCode } from './types';

/**
 * wagmi 钱包客户端接口
 * 对应 useWalletClient() 返回的 data 对象
 */
interface WalletClient {
  /** 钱包账户信息 */
  account?: {
    address: string;
    type: string;
  };

  /** 签署 EIP-712 消息 */
  signTypedData?: (args: any) => Promise<string>;

  /** 其他 wagmi 方法 */
  [key: string]: any;
}

/**
 * EVM 支付处理器
 *
 * 使用示例：
 * ```typescript
 * const { data: walletClient } = useWalletClient();
 * const processor = new EvmPaymentProcessor({
 *   gatewayUrl: 'https://x402.bedev.hubble-rpc.xyz',
 *   chainId: 'base-sepolia'
 * });
 *
 * processor.initialize(walletClient);
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
export class EvmPaymentProcessor implements PaymentProcessor {
  private gatewayUrl: string;
  private chainId: string;
  private walletClient: WalletClient | null = null;
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

    this.log('初始化 EvmPaymentProcessor', { gatewayUrl: this.gatewayUrl });
  }

  /**
   * 初始化处理器
   *
   * 接收来自 useWalletClient() hook 的钱包对象
   * 并创建 x402-fetch 包装器
   */
  initialize(walletClient: WalletClient): void {
    if (!walletClient) {
      throw new PaymentError(
        '钱包客户端不能为空',
        PaymentErrorCode.WALLET_NOT_CONNECTED
      );
    }

    // 检查账户连接
    if (!walletClient.account) {
      throw new PaymentError(
        '钱包账户未连接',
        PaymentErrorCode.WALLET_NOT_CONNECTED
      );
    }

    this.walletClient = walletClient;

    this.log('钱包客户端已初始化', {
      address: walletClient.account.address,
    });

    // 创建 x402-fetch 包装器
    // 关键：传入 walletClient，x402-fetch 将使用 signTypedData 进行签名
    try {
      // 官方 x402 模式：直接传入 walletClient
      this.fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any);
      this.log('x402-fetch 包装器已创建');
    } catch (error) {
      throw new PaymentError(
        `无法创建 x402-fetch 包装器: ${error instanceof Error ? error.message : String(error)}`,
        PaymentErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * 执行支付包装的请求
   *
   * 核心流程：
   * 1. 使用 x402-fetch 发送请求
   * 2. 如果收到 402 Payment Required，x402-fetch 自动拦截
   * 3. 调用 walletClient.signTypedData() 获取签名
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
        throw new PaymentError(
          '钱包未连接',
          PaymentErrorCode.WALLET_NOT_CONNECTED
        );
      }

      if (!this.fetchWithPayment) {
        throw new PaymentError(
          'x402-fetch 尚未初始化',
          PaymentErrorCode.UNKNOWN
        );
      }

      this.log('发送请求', {
        url,
        method: options.method || 'GET',
        address: this.walletClient?.account?.address,
      });

      // 调用 x402-fetch 包装的 fetch
      // 它会自动处理：
      // 1. 初始请求
      // 2. 402 响应拦截
      // 3. 钱包签署 EIP-712 消息
      // 4. 生成 X-PAYMENT 头（EIP-3009 授权）
      // 5. 自动重试请求
      const response = await this.fetchWithPayment(url, options);

      this.log('请求完成', {
        status: response.status,
        ok: response.ok,
      });

      // 检查响应状态
      if (!response.ok && response.status !== 402) {
        throw new PaymentError(
          `请求失败: ${response.status} ${response.statusText}`,
          PaymentErrorCode.PAYMENT_REQUEST_FAILED
        );
      }

      // 解析响应数据
      const data = await response.json();

      // 如果还是 402，说明支付验证失败
      if (response.status === 402) {
        this.log('网关返回 402 - 可能是支付验证失败', data);
        throw new PaymentError(
          '支付验证失败',
          PaymentErrorCode.PAYMENT_VERIFICATION_FAILED,
          data
        );
      }

      // 提取支付响应头（如果存在）
      const paymentResponseHeader =
        response.headers.get('X-Payment-Response') ||
        response.headers.get('x-payment-response');

      let paymentInfo: PaymentResponse | undefined;

      if (paymentResponseHeader) {
        try {
          // 使用 x402-fetch 提供的解码函数
          const decodedPayment = decodeXPaymentResponse(paymentResponseHeader);
          paymentInfo = {
            transactionHash: decodedPayment.transactionHash || decodedPayment.txHash,
            network: decodedPayment.network || this.chainId,
            amount: decodedPayment.amount || '0',
            asset: decodedPayment.asset || decodedPayment.token,
            timestamp: decodedPayment.timestamp || Date.now(),
            payer: decodedPayment.payer || decodedPayment.from,
            payee: decodedPayment.payee || decodedPayment.to,
            rawHeader: paymentResponseHeader,
          };
          this.log('支付信息已解析', paymentInfo);
        } catch (error) {
          this.log('警告：支付响应头解析失败', error);
          // 不中断流程，支付可能已成功但响应头格式有问题
        }
      }

      // 返回格式化的结果
      const result: QueryResponse = {
        success: data.success ?? true,
        sqlQuery: data.sqlQuery ?? null,
        dbResults: Array.isArray(data.dbResults) ? data.dbResults : [],
        paymentInfo,
        durationMs: data.durationMs,
        raw: data,
      };

      return result as T;
    } catch (error) {
      this.log('错误：', error);

      if (error instanceof PaymentError) {
        throw error;
      }

      // 包装其他错误
      throw new PaymentError(
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
      // 使用 x402-fetch 提供的解码函数
      const decoded = decodeXPaymentResponse(headerValue);

      const response: PaymentResponse = {
        transactionHash: decoded.transactionHash || decoded.txHash,
        network: decoded.network || this.chainId,
        amount: decoded.amount || '0',
        asset: decoded.asset || decoded.token,
        timestamp: decoded.timestamp || Date.now(),
        payer: decoded.payer || decoded.from,
        payee: decoded.payee || decoded.to,
        rawHeader: headerValue,
      };

      return response;
    } catch (error) {
      throw new PaymentError(
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
    return !!(this.walletClient?.account?.address);
  }

  /**
   * 获取钱包地址
   */
  getAddress(): string | null {
    return this.walletClient?.account?.address || null;
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
      console.log(`[EvmPaymentProcessor] ${message}`, data || '');
    }
  }
}

/**
 * 导出类型，便于使用
 */
export type { WalletClient };
