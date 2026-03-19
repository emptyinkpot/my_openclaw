/**
 * HTTP客户端 - 公共模块 (占位实现)
 * @module @openclaw/common-utils/http
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  private instance: AxiosInstance;

  constructor(options: HttpClientOptions = {}) {
    this.instance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      headers: options.headers,
    });
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }
}

export function createHttpClient(options?: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}

export { AxiosResponse as HttpResponse, AxiosRequestConfig as HttpRequestConfig } from 'axios';
