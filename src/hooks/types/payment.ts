/**
 * 支付处理器接口定义
 *
 * 目的：定义网络无关的支付处理接口
 * 支持：EVM (Base) 和 Solana 链上支付
 *
 * 使用方式：
 *   - EvmPaymentProcessor: 基于 wagmi + EIP-3009
 *   - SolanaPaymentProcessor: 基于 @solana/wallet-adapter + Solana message signing
 */

/**
 * 支付响应类型
 * 由网关返回，包含支付确认信息
 */
export interface PaymentResponse {
  /** 交易/签名哈希 */
  transactionHash: string;

  /** 网络标识 (base, solana-devnet, solana-mainnet 等) */
  network: string;

  /** 支付金额 (原始单位，例如 6 位小数的 USDC) */
  amount: string;

  /** 代币地址或 mint */
  asset: string;

  /** 支付时间戳 */
  timestamp: number;

  /** 支付者地址 */
  payer?: string;

  /** 收款地址 */
  payee?: string;

  /** 原始响应头值（用于调试） */
  rawHeader?: string;
}

/**
 * 查询请求类型
 * 客户端发送给后端 API 的请求
 */
export interface QueryRequest {
  /** 用户提出的自然语言问题 */
  question: string;

  /** 可选：链标识，用于路由到正确的网关 */
  chainId?: string;
}

/**
 * 查询响应类型
 * 后端返回的查询结果
 */
export interface QueryResponse<T = any> {
  /** 是否成功 */
  success: boolean;

  /** AI 生成的 SQL 查询 */
  sqlQuery?: string;

  /** 数据库查询结果 */
  dbResults?: T[];

  /** 支付确认信息 */
  paymentInfo?: PaymentResponse;

  /** 执行时间（毫秒） */
  durationMs?: number;

  /** 错误信息（如果失败） */
  error?: string;

  /** 原始响应（调试用） */
  raw?: any;
}

/**
 * 支付处理器接口
 *
 * 定义了网络特定的支付处理逻辑
 * 实现类需要处理链上的支付验证和签名
 */
export interface PaymentProcessor {
  /**
   * 初始化支付处理器
   *
   * @param client 网络特定的客户端对象
   *   - EVM: wagmi walletClient
   *   - Solana: @solana/wallet-adapter useWallet() 返回值
   */
  initialize(client: any): void;

  /**
   * 执行支付包装的 fetch 请求
   *
   * 流程：
   * 1. 发送初始请求
   * 2. 如果收到 402 Payment Required 响应
   * 3. 提示用户签署支付授权
   * 4. 自动重试请求 + 支付证明
   * 5. 返回最终结果
   *
   * @param url 请求 URL
   * @param options fetch 选项
   * @returns 解析后的响应数据
   *
   * @example
   * const result = await processor.fetchWithPayment(
   *   '/api/query',
   *   {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ question: '...' })
   *   }
   * );
   */
  fetchWithPayment<T = QueryResponse>(
    url: string,
    options: RequestInit
  ): Promise<T>;

  /**
   * 解析支付响应头
   *
   * x402 协议返回的 X-Payment-Response 头包含
   * base64 编码的支付确认信息，本方法负责解码和解析
   *
   * @param headerValue X-Payment-Response 头的值
   * @returns 解析后的支付信息
   *
   * @throws 如果无法解析会抛出错误
   */
  decodePaymentResponse(headerValue: string): PaymentResponse;

  /**
   * 检查是否连接了钱包
   *
   * @returns true 表示钱包已连接且可用
   */
  isConnected(): boolean;

  /**
   * 获取当前连接的钱包地址
   *
   * @returns 钱包地址字符串，未连接返回 null
   */
  getAddress(): string | null;

  /**
   * 获取网络标识
   *
   * @returns 网络标识 (base, solana-devnet, solana-mainnet 等)
   */
  getChainId(): string;
}

/**
 * 支付处理器初始化选项
 */
export interface PaymentProcessorOptions {
  /** 网关 URL */
  gatewayUrl: string;

  /** 网络标识 */
  chainId: string;

  /** 网络特定的客户端 */
  client?: any;

  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * 支付错误类型
 * 支付流程中可能出现的各类错误
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * 支付错误代码
 */
export const PaymentErrorCode = {
  /** 钱包未连接 */
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',

  /** 钱包拒绝签署 */
  WALLET_REJECTED: 'WALLET_REJECTED',

  /** 余额不足 */
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',

  /** 支付请求失败 */
  PAYMENT_REQUEST_FAILED: 'PAYMENT_REQUEST_FAILED',

  /** 支付验证失败 */
  PAYMENT_VERIFICATION_FAILED: 'PAYMENT_VERIFICATION_FAILED',

  /** 支付响应解析失败 */
  PAYMENT_RESPONSE_PARSE_FAILED: 'PAYMENT_RESPONSE_PARSE_FAILED',

  /** 网络错误 */
  NETWORK_ERROR: 'NETWORK_ERROR',

  /** 超时 */
  TIMEOUT: 'TIMEOUT',

  /** 未知错误 */
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  /** 初始状态，等待连接钱包 */
  IDLE = 'idle',

  /** 等待用户授权签署 */
  PENDING_SIGNATURE = 'pending_signature',

  /** 正在提交支付 */
  SUBMITTING = 'submitting',

  /** 支付成功 */
  SUCCESS = 'success',

  /** 支付失败 */
  FAILED = 'failed',
}

/**
 * 支付事件侦听器
 * 用于跟踪支付流程的各个阶段
 */
export interface PaymentEventListener {
  /** 钱包连接状态变化 */
  onConnectionChange?(connected: boolean, address: string | null): void;

  /** 支付状态变化 */
  onStatusChange?(status: PaymentStatus): void;

  /** 支付流程各阶段的进度 */
  onProgress?(step: string, details?: any): void;

  /** 错误事件 */
  onError?(error: PaymentError): void;

  /** 支付成功 */
  onSuccess?(response: PaymentResponse): void;
}
