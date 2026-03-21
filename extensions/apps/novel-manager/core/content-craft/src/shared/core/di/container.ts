/**
 * 依赖注入容器
 * 
 * 提供服务注册和解析能力，支持：
 * - 单例模式：全局唯一实例
 * - 工厂模式：每次创建新实例
 * - 懒加载：首次使用时创建
 * 
 * @module core/di/container
 */

/**
 * 服务工厂函数类型
 */
type ServiceFactory<T = unknown> = () => T;

/**
 * 服务注册信息
 */
interface ServiceRegistration<T = unknown> {
  /** 实例（单例模式） */
  instance?: T;
  /** 工厂函数（工厂模式） */
  factory?: ServiceFactory<T>;
  /** 是否为单例 */
  isSingleton: boolean;
}

/**
 * 依赖注入容器
 * 
 * 使用示例：
 * ```ts
 * const container = DIContainer.getInstance();
 * 
 * // 注册单例
 * container.registerSingleton(Token.QUOTE_PROTECTOR, new QuoteProtector());
 * 
 * // 注册工厂
 * container.registerFactory(Token.LLM_CLIENT, () => new OpenAIClient());
 * 
 * // 解析服务
 * const protector = container.resolve<IQuoteProtector>(Token.QUOTE_PROTECTOR);
 * ```
 */
export class DIContainer {
  private static instance: DIContainer;
  private services: Map<symbol, ServiceRegistration> = new Map();
  private resolving: Set<symbol> = new Set(); // 防止循环依赖
  
  private constructor() {}
  
  /**
   * 获取容器单例
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
  
  /**
   * 重置容器（仅用于测试）
   */
  static reset(): void {
    DIContainer.instance = new DIContainer();
  }
  
  // ==========================================
  // 注册方法
  // ==========================================
  
  /**
   * 注册单例服务
   * 
   * @param token 服务标识
   * @param instance 服务实例
   * @example
   * ```ts
   * container.registerSingleton(
   *   ServiceTokens.QUOTE_PROTECTOR, 
   *   new QuoteProtector()
   * );
   * ```
   */
  registerSingleton<T>(token: symbol, instance: T): void {
    this.services.set(token, {
      instance,
      isSingleton: true,
    });
  }
  
  /**
   * 注册工厂服务
   * 
   * 工厂服务每次 resolve 都会创建新实例
   * 
   * @param token 服务标识
   * @param factory 创建实例的工厂函数
   * @example
   * ```ts
   * container.registerFactory(
   *   ServiceTokens.LLM_CLIENT,
   *   () => new OpenAIClient({ apiKey: process.env.OPENAI_KEY })
   * );
   * ```
   */
  registerFactory<T>(token: symbol, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      isSingleton: false,
    });
  }
  
  /**
   * 注册懒加载单例
   * 
   * 首次 resolve 时通过工厂创建实例，之后复用
   * 
   * @param token 服务标识
   * @param factory 创建实例的工厂函数
   */
  registerLazySingleton<T>(token: symbol, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      isSingleton: true,
    });
  }
  
  // ==========================================
  // 解析方法
  // ==========================================
  
  /**
   * 解析服务
   * 
   * @param token 服务标识
   * @returns 服务实例
   * @throws 服务未注册或循环依赖
   * @example
   * ```ts
   * const client = container.resolve<ILLMClient>(ServiceTokens.LLM_CLIENT);
   * ```
   */
  resolve<T>(token: symbol): T {
    const registration = this.services.get(token);
    
    if (!registration) {
      throw new ServiceNotFoundError(
        `Service not found: ${token.toString()}`
      );
    }
    
    // 检查循环依赖
    if (this.resolving.has(token)) {
      throw new CircularDependencyError(
        `Circular dependency detected: ${token.toString()}`
      );
    }
    
    // 单例且已有实例，直接返回
    if (registration.isSingleton && registration.instance !== undefined) {
      return registration.instance as T;
    }
    
    // 没有工厂，抛出错误
    if (!registration.factory) {
      throw new Error(
        `Invalid registration for ${token.toString()}: no instance or factory`
      );
    }
    
    // 使用工厂创建实例
    this.resolving.add(token);
    try {
      const instance = registration.factory() as T;
      
      // 单例模式：保存实例
      if (registration.isSingleton) {
        registration.instance = instance;
      }
      
      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }
  
  /**
   * 尝试解析服务（不抛出异常）
   * 
   * @param token 服务标识
   * @returns 服务实例或 undefined
   */
  tryResolve<T>(token: symbol): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch {
      return undefined;
    }
  }
  
  // ==========================================
  // 查询方法
  // ==========================================
  
  /**
   * 检查服务是否已注册
   */
  has(token: symbol): boolean {
    return this.services.has(token);
  }
  
  /**
   * 获取所有已注册的服务标识
   */
  getRegisteredTokens(): symbol[] {
    return Array.from(this.services.keys());
  }
  
  /**
   * 移除服务注册
   */
  remove(token: symbol): boolean {
    return this.services.delete(token);
  }
  
  /**
   * 清空所有服务（仅用于测试）
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
  }
}

// ==========================================
// 自定义错误
// ==========================================

/**
 * 服务未找到错误
 */
export class ServiceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * 循环依赖错误
 */
export class CircularDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircularDependencyError';
  }
}

// ==========================================
// 全局容器实例
// ==========================================

/**
 * 全局容器实例
 * 
 * 使用此实例进行服务注册和解析
 */
export const container = DIContainer.getInstance();
