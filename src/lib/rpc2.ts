/**
 * RPC2 客户端类
 * 支持通过 WebSocket 和 HTTP POST 调用 JSON-RPC 2.0 接口
 */
//#region RPC2Client
export class RPC2Client {
  private ws: WebSocket | null = null;
  private connectionState: RPC2ConnectionStateType = RPC2ConnectionState.DISCONNECTED;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timeout?: NodeJS.Timeout;
  }>();
  private reconnectAttempts = 0;
  private reconnectTimeout?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;
  private eventListeners: RPC2EventListeners = {};
 
  private readonly baseUrl: string;
  private readonly options: Required<RPC2ConnectionOptions>;

  constructor(
    baseUrl = "/api/rpc2",
    options: RPC2ConnectionOptions = {}
  ) {
    this.baseUrl = baseUrl;
    this.options = {
      autoConnect: true,
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      requestTimeout: 30000,
      enableHeartbeat: true,
      heartbeatInterval: 15000,
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    };

    // 自动建立连接
    if (this.options.autoConnect) {
      this.autoConnect();
    }
  }

  /**
   * 获取当前连接状态
   */
  get state(): RPC2ConnectionStateType {
    return this.connectionState;
  }

  /**
   * 设置事件监听器
   */
  setEventListeners(listeners: RPC2EventListeners): void {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }

  /**
   * 建立 WebSocket 连接
   */
  async connect(): Promise<void> {
    if (this.connectionState === RPC2ConnectionState.CONNECTED || 
        this.connectionState === RPC2ConnectionState.CONNECTING) {
      return;
    }

    this.setConnectionState(RPC2ConnectionState.CONNECTING);

    try {
      const wsUrl = this.getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      this.setupWebSocketHandlers();

      // 等待连接建立（不覆盖已设置的处理器，避免丢失心跳与状态更新）
      await new Promise<void>((resolve, reject) => {
        const handleOpen = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error("WebSocket 连接失败"));
        };
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("WebSocket 连接超时"));
        }, 10000);

        const cleanup = () => {
          clearTimeout(timeout);
          ws.removeEventListener("open", handleOpen);
          ws.removeEventListener("error", handleError);
        };

        ws.addEventListener("open", handleOpen, { once: true });
        ws.addEventListener("error", handleError, { once: true });
      });
    } catch (error) {
      this.setConnectionState(RPC2ConnectionState.ERROR);
      this.eventListeners.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 自动建立连接（非阻塞）
   */
  private autoConnect(): void {
    if (this.connectionState !== RPC2ConnectionState.DISCONNECTED) {
      return;
    }

    // 异步尝试连接，不阻塞构造函数
    this.connect().catch((error) => {
      console.warn("自动连接失败:", error.message);
      // 连接失败时，如果启用了自动重连，会在 onclose 处理器中进行重连
    });
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.options.autoReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    // 清理心跳包定时器
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState(RPC2ConnectionState.DISCONNECTED);
    this.clearPendingRequests(new Error("连接已断开"));
  }

  /**
   * 通过 WebSocket 调用 RPC 方法
   */
  async callViaWebSocket<TParams = any, TResult = any>(
    method: string,
    params?: TParams,
    options: RPC2CallOptions = {}
  ): Promise<TResult> {
    if (this.connectionState !== RPC2ConnectionState.CONNECTED) {
      throw new Error("WebSocket 未连接");
    }

    const request: JSONRPC2Request<TParams> = {
      jsonrpc: "2.0",
      method,
      params,
      id: options.notification ? undefined : this.generateRequestId(),
    };

    if (options.notification) {
      // 通知请求，不期望响应
      this.sendMessage(request);
      return undefined as TResult;
    }

    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id!);
        reject(new Error(`请求超时: ${method}`));
      }, options.timeout || this.options.requestTimeout);

      this.pendingRequests.set(request.id!, {
        resolve,
        reject,
        timeout,
      });

      this.sendMessage(request);
    });
  }

  /**
   * 通过 HTTP POST 调用 RPC 方法
   */
  async callViaHTTP<TParams = any, TResult = any>(
    method: string,
    params?: TParams,
    options: RPC2CallOptions = {}
  ): Promise<TResult> {
    const request: JSONRPC2Request<TParams> = {
      jsonrpc: "2.0",
      method,
      params,
      id: options.notification ? undefined : this.generateRequestId(),
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.options.headers,
        body: JSON.stringify(request),
        signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (options.notification) {
        return undefined as TResult;
      }

      const jsonResponse: JSONRPC2Response<TResult> = await response.json();
      
      if ("error" in jsonResponse) {
        throw new Error(`RPC Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`);
      }

      return jsonResponse.result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`请求失败: ${method}`);
    }
  }

  /**
   * 批量调用（仅支持 HTTP）
   */
  async batchCall(requests: Array<{
    method: string;
    params?: any;
    notification?: boolean;
  }>): Promise<any[]> {
    const batchRequest: JSONRPC2BatchRequest = requests.map(req => ({
      jsonrpc: "2.0",
      method: req.method,
      params: req.params,
      id: req.notification ? undefined : this.generateRequestId(),
    }));

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.options.headers,
        body: JSON.stringify(batchRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonResponse: JSONRPC2BatchResponse = await response.json();
      
      return jsonResponse.map(res => {
        if ("error" in res) {
          throw new Error(`RPC Error ${res.error.code}: ${res.error.message}`);
        }
        return res.result;
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("批量请求失败");
    }
  }

  /**
   * 自动选择调用方式（优先使用 WebSocket）
   */
  async call<TParams = any, TResult = any>(
    method: string,
    params?: TParams,
    options: RPC2CallOptions = {}
  ): Promise<TResult> {
    // 如果启用了自动连接，且当前未连接，尝试建立连接（不阻塞使用 HTTP 回退）
    if (this.options.autoConnect && 
        this.connectionState === RPC2ConnectionState.DISCONNECTED) {
      this.autoConnect();
    }

    // 策略：
    // 1) WS 已连接 → 尝试 WS；失败则回退一次 HTTP
    // 2) 其他状态（未连/连接中/重连中/错误）→ 直接 HTTP
    if (this.connectionState === RPC2ConnectionState.CONNECTED) {
      try {
        return await this.callViaWebSocket(method, params, options);
      } catch (wsErr) {
        // 回退一次 HTTP
        try {
          return await this.callViaHTTP(method, params, options);
        } catch (httpErr) {
          // HTTP 也失败，抛出 HTTP 错误（信息更贴近最终失败原因）
          throw httpErr;
        }
      }
    }

    // 未连或重连等情况下，直接使用 HTTP
    return this.callViaHTTP(method, params, options);
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}${this.baseUrl}`;
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setConnectionState(RPC2ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat(); // 启动心跳包
      this.eventListeners.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
        this.eventListeners.onMessage?.(data);
      } catch (error) {
        console.error("解析 WebSocket 消息失败:", error);
      }
    };

    this.ws.onclose = () => {
      this.setConnectionState(RPC2ConnectionState.DISCONNECTED);
      this.stopHeartbeat(); // 停止心跳包
      this.eventListeners.onDisconnect?.();
      
      if (this.options.autoReconnect && 
          this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket 错误:", error);
      this.eventListeners.onError?.(new Error("WebSocket 连接错误"));
    };
  }

  private handleMessage(data: JSONRPC2Response): void {
    if (!data.id) return; // 忽略通知响应

    const pending = this.pendingRequests.get(data.id);
    if (!pending) return;

    this.pendingRequests.delete(data.id);
    
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }

    if ("error" in data) {
      pending.reject(new Error(`RPC Error ${data.error.code}: ${data.error.message}`));
    } else {
      pending.resolve(data.result);
    }
  }

  private sendMessage(message: JSONRPC2Request): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket 未连接");
    }

    this.ws.send(JSON.stringify(message));
  }

  private setConnectionState(state: RPC2ConnectionStateType): void {
    this.connectionState = state;
  }

  private generateRequestId(): number {
    return ++this.requestId;
  }

  private clearPendingRequests(error: Error): void {
    for (const [, pending] of this.pendingRequests) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * 启动心跳包
   */
  private startHeartbeat(): void {
    // 如果未启用心跳包，则不启动
    if (!this.options.enableHeartbeat) {
      return;
    }
    
    // 先清理之前的心跳包定时器
    this.stopHeartbeat();
    
    // 按配置的间隔发送心跳包
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          // 发送心跳包作为通知请求（不期望响应）
          const heartbeatRequest: JSONRPC2Request = {
            jsonrpc: "2.0",
            method: "rpc.ping",
            params: { timestamp: Date.now() }
          };
          this.ws.send(JSON.stringify(heartbeatRequest));
        } catch (error) {
          console.warn("发送心跳包失败:", error);
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 停止心跳包
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    this.setConnectionState(RPC2ConnectionState.RECONNECTING);
    this.eventListeners.onReconnecting?.(this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        // 重连失败会触发 onclose，从而继续重连或停止
      });
    }, this.options.reconnectInterval);
  }
}

// 注意：避免在模块级别创建默认实例，以免在多处导入时重复建立 WebSocket 连接。
// 请通过 RPC2Provider + useRPC2Call/useRPC2 使用该客户端，或在需要的地方手动创建实例。
//#endregion


//#region Types
/**
 * JSON-RPC 2.0 标准类型定义
 * 基于规范：https://www.jsonrpc.org/specification
 */

/**
 * JSON-RPC 2.0 请求对象
 */
export interface JSONRPC2Request<T = any> {
  /** JSON-RPC 版本，必须为 "2.0" */
  jsonrpc: "2.0";
  /** 调用的方法名 */
  method: string;
  /** 调用参数（可选） */
  params?: T;
  /** 请求ID，如果为空则为通知请求 */
  id?: string | number | null;
}

/**
 * JSON-RPC 2.0 响应对象（成功）
 */
export interface JSONRPC2SuccessResponse<T = any> {
  /** JSON-RPC 版本，必须为 "2.0" */
  jsonrpc: "2.0";
  /** 调用结果 */
  result: T;
  /** 请求ID */
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 错误对象
 */
export interface JSONRPC2Error {
  /** 错误代码 */
  code: number;
  /** 错误消息 */
  message: string;
  /** 错误详细信息（可选） */
  data?: any;
}

/**
 * JSON-RPC 2.0 响应对象（错误）
 */
export interface JSONRPC2ErrorResponse {
  /** JSON-RPC 版本，必须为 "2.0" */
  jsonrpc: "2.0";
  /** 错误信息 */
  error: JSONRPC2Error;
  /** 请求ID */
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 响应联合类型
 */
export type JSONRPC2Response<T = any> = JSONRPC2SuccessResponse<T> | JSONRPC2ErrorResponse;

/**
 * JSON-RPC 2.0 批量请求
 */
export type JSONRPC2BatchRequest = JSONRPC2Request[];

/**
 * JSON-RPC 2.0 批量响应
 */
export type JSONRPC2BatchResponse = JSONRPC2Response[];

/**
 * 预定义的错误代码
 */
export const JSONRPC2ErrorCode = {
  /** 解析错误 - 服务器收到无效的JSON */
  PARSE_ERROR: -32700,
  /** 无效请求 - 发送的JSON不是有效的请求对象 */
  INVALID_REQUEST: -32600,
  /** 方法未找到 - 所调用的方法不存在或不可用 */
  METHOD_NOT_FOUND: -32601,
  /** 无效参数 - 无效的方法参数 */
  INVALID_PARAMS: -32602,
  /** 内部错误 - JSON-RPC内部错误 */
  INTERNAL_ERROR: -32603,
} as const;

export type JSONRPC2ErrorCodeType = typeof JSONRPC2ErrorCode[keyof typeof JSONRPC2ErrorCode];

/**
 * RPC 连接状态
 */
export const RPC2ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
} as const;

export type RPC2ConnectionStateType = typeof RPC2ConnectionState[keyof typeof RPC2ConnectionState];

/**
 * RPC 连接选项
 */
export interface RPC2ConnectionOptions {
  /** 自动建立连接 */
  autoConnect?: boolean;
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 请求超时时间（毫秒） */
  requestTimeout?: number;
  /** 启用心跳包 */
  enableHeartbeat?: boolean;
  /** 心跳包间隔（毫秒） */
  heartbeatInterval?: number;
  /** 自定义headers（仅用于POST请求） */
  headers?: Record<string, string>;
}

/**
 * RPC 调用选项
 */
export interface RPC2CallOptions {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 是否为通知请求（不期望响应） */
  notification?: boolean;
}

/**
 * 事件监听器类型
 */
export interface RPC2EventListeners {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onMessage?: (data: any) => void;
}

//#endregion Types

