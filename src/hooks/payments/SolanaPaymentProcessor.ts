/**
 * Solana 支付处理器实现（私钥签名版）
 *
 * 目前 x402 官方 SDK 仅支持 KeyPairSigner 这种私钥签名器，
 * 因此这里使用 createSigner 创建的签名对象进行支付。
 * 该实现不依赖浏览器钱包适配器。
 */

import { wrapFetchWithPayment, decodeXPaymentResponse, type Signer, type X402Config } from 'x402-fetch';
import type { PaymentProcessor, PaymentResponse, QueryResponse } from '../types/payment';
import { PaymentError, PaymentErrorCode } from '../types/payment';

interface SolanaPaymentProcessorOptions {
  gatewayUrl: string;
  chainId: string;
  debug?: boolean;
  rpcUrl?: string;
}

export class SolanaPaymentProcessor implements PaymentProcessor {
  private readonly gatewayUrl: string;
  private readonly chainId: string;
  private readonly debug: boolean;
  private readonly config?: X402Config;

  private signer: Signer | null = null;
  private signerAddress: string | null = null;
  private wrappedFetch: ReturnType<typeof wrapFetchWithPayment> | null = null;

  constructor(options: SolanaPaymentProcessorOptions) {
    this.gatewayUrl = options.gatewayUrl;
    this.chainId = options.chainId;
    this.debug = options.debug ?? false;

    if (options.rpcUrl) {
      this.config = {
        svmConfig: {
          rpcUrl: options.rpcUrl,
        },
      };
    }

    this.log('初始化 SolanaPaymentProcessor', {
      gatewayUrl: this.gatewayUrl,
      chainId: this.chainId,
      hasCustomRpc: Boolean(options.rpcUrl),
    });
  }

  /**
   * 初始化处理器
   *
   * @param signer 通过 createSigner("solana-devnet", PRIVATE_KEY) 创建的签名器
   */
  initialize(signer: Signer): void {
    if (!signer) {
      throw new PaymentError('Signer 不能为空', PaymentErrorCode.WALLET_NOT_CONNECTED);
    }

    this.signer = signer;
    this.signerAddress = this.extractSignerAddress(signer);
    this.wrappedFetch = wrapFetchWithPayment(fetch, signer, undefined, undefined, this.config);

    this.log('签名器已初始化', {
      address: this.signerAddress ?? 'unknown',
    });
  }

  async fetchWithPayment<T = QueryResponse>(url: string, options: RequestInit): Promise<T> {
    if (!this.isConnected() || !this.wrappedFetch || !this.signer) {
      throw new PaymentError('签名器未就绪，请检查环境配置', PaymentErrorCode.WALLET_NOT_CONNECTED);
    }

    try {
      this.log('发送请求', {
        url,
        method: options.method ?? 'GET',
        address: this.signerAddress,
      });

      const response = await this.wrappedFetch(url, options);

      this.log('请求完成', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        if (response.status === 402) {
          // wrapFetchWithPayment 理论上不应该保留 402，若出现说明支付验证失败
          const errorBody = await response.json();
          this.log('网关返回 402，支付验证失败', errorBody);
          throw new PaymentError('支付验证失败', PaymentErrorCode.PAYMENT_VERIFICATION_FAILED, errorBody);
        }

        const text = await response.text();
        throw new PaymentError(`请求失败: ${response.status} ${response.statusText}`, PaymentErrorCode.PAYMENT_REQUEST_FAILED, text);
      }

      const data = await response.json();

      const headerValue =
        response.headers.get('X-Payment-Response') ||
        response.headers.get('x-payment-response');

      let paymentInfo: PaymentResponse | undefined;

      if (headerValue) {
        try {
          const decoded = decodeXPaymentResponse(headerValue) as Record<string, unknown>;
          const transactionHash =
            (decoded.transactionHash as string | undefined) ||
            (decoded.signature as string | undefined) ||
            (decoded.txHash as string | undefined) ||
            (decoded.transaction as string | undefined) ||
            'unknown';

          const timestamp =
            typeof decoded.timestamp === 'number'
              ? (decoded.timestamp as number)
              : Date.now();

          const payer =
            (decoded.payer as string | undefined) ||
            (decoded.from as string | undefined) ||
            this.signerAddress || undefined;

          const payee =
            (decoded.payee as string | undefined) ||
            (decoded.to as string | undefined);

          paymentInfo = {
            transactionHash,
            network: (decoded.network as string | undefined) || this.chainId,
            amount: (decoded.amount as string | undefined) || '0',
            asset:
              (decoded.asset as string | undefined) ||
              (decoded.mint as string | undefined) ||
              'unknown',
            timestamp,
            payer,
            payee,
            rawHeader: headerValue,
          };
          this.log('支付信息解析成功', paymentInfo);
        } catch (err) {
          this.log('支付响应解析失败', err);
        }
      }

      const result: QueryResponse = {
        success: data.success ?? true,
        sqlQuery: data.sqlQuery ?? data.sql_used ?? null,
        dbResults: Array.isArray(data.dbResults) ? data.dbResults : Array.isArray(data.data) ? data.data : [],
        paymentInfo,
        durationMs: data.durationMs,
        raw: data,
      };

      return result as T;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }

      throw new PaymentError(
        error instanceof Error ? error.message : String(error),
        PaymentErrorCode.UNKNOWN,
        error
      );
    }
  }

  decodePaymentResponse(headerValue: string): PaymentResponse {
    if (!headerValue) {
      throw new PaymentError('X-Payment-Response 为空', PaymentErrorCode.PAYMENT_RESPONSE_PARSE_FAILED);
    }

    try {
      const decoded = decodeXPaymentResponse(headerValue) as Record<string, unknown>;
      const transactionHash =
        (decoded.transactionHash as string | undefined) ||
        (decoded.signature as string | undefined) ||
        (decoded.txHash as string | undefined) ||
        (decoded.transaction as string | undefined) ||
        'unknown';

      const timestamp =
        typeof decoded.timestamp === 'number'
          ? (decoded.timestamp as number)
          : Date.now();

      const payer =
        (decoded.payer as string | undefined) ||
        (decoded.from as string | undefined) ||
        this.signerAddress || undefined;

      const payee =
        (decoded.payee as string | undefined) ||
        (decoded.to as string | undefined);

      return {
        transactionHash,
        network: (decoded.network as string | undefined) || this.chainId,
        amount: (decoded.amount as string | undefined) || '0',
        asset:
          (decoded.asset as string | undefined) ||
          (decoded.mint as string | undefined) ||
          'unknown',
        timestamp,
        payer,
        payee,
        rawHeader: headerValue,
      };
    } catch (error) {
      throw new PaymentError(
        `无法解析支付响应头: ${error instanceof Error ? error.message : String(error)}`,
        PaymentErrorCode.PAYMENT_RESPONSE_PARSE_FAILED,
        { headerValue, error }
      );
    }
  }

  isConnected(): boolean {
    return Boolean(this.signer);
  }

  getAddress(): string | null {
    return this.signerAddress;
  }

  getChainId(): string {
    return this.chainId;
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[SolanaPaymentProcessor] ${message}`, data ?? '');
    }
  }

  private extractSignerAddress(signer: Signer): string | null {
    const candidate = signer as { address?: string };
    if (candidate.address && typeof candidate.address === 'string') {
      return candidate.address;
    }

    const maybePublicKey = signer as { publicKey?: { toBase58?: () => string } };
    if (maybePublicKey.publicKey && typeof maybePublicKey.publicKey.toBase58 === 'function') {
      try {
        return maybePublicKey.publicKey.toBase58();
      } catch (error) {
        this.log('无法从 signer.publicKey 提取地址', error);
      }
    }

    return null;
  }
}
