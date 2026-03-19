/**
 * HTTP客户端 - 公共模块 (占位实现)
 * @module @openclaw/common-utils/http
 */
import { AxiosRequestConfig, AxiosResponse } from 'axios';
export interface HttpClientOptions {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
}
export declare class HttpClient {
    private instance;
    constructor(options?: HttpClientOptions);
    get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}
export declare function createHttpClient(options?: HttpClientOptions): HttpClient;
export { AxiosResponse as HttpResponse, AxiosRequestConfig as HttpRequestConfig } from 'axios';
//# sourceMappingURL=index.d.ts.map