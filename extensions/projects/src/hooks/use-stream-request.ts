/**
 * ============================================================================
 * SSE 流式请求 Hook
 * ============================================================================
 */

import { useState, useCallback, useRef } from "react";
import type { SSEMessage } from "@/types";

interface UseStreamRequestOptions<T> {
  url: string;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number, message: string) => void;
  onText?: (text: string) => void;
  onTitle?: (title: string) => void;
  onReports?: (reports: Array<{ step: string; report: string }>) => void;
  onAnalysis?: (analysis: any) => void;
}

interface UseStreamRequestReturn<T> {
  isLoading: boolean;
  progress: number;
  statusMessage: string;
  data: T | null;
  error: string | null;
  execute: (body: any) => Promise<void>;
  reset: () => void;
}

export function useStreamRequest<T = any>(
  options: UseStreamRequestOptions<T>
): UseStreamRequestReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (body: any) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setProgress(0);
    setStatusMessage("准备中...");
    setError(null);
    setData(null);

    try {
      const response = await fetch(options.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          if (message.startsWith("data: ")) {
            const jsonStr = message.slice(6).trim();
            if (!jsonStr) continue;
            
            try {
              const data: SSEMessage = JSON.parse(jsonStr);
              
              if (data.progress !== undefined) {
                setProgress(data.progress);
                options.onProgress?.(data.progress, data.message || "");
              }
              if (data.message) {
                setStatusMessage(data.message);
              }
              if (data.text) {
                options.onText?.(data.text);
              }
              if (data.title) {
                options.onTitle?.(data.title);
              }
              if (data.reports) {
                options.onReports?.(data.reports);
              }
              if (data.analysis) {
                options.onAnalysis?.(data.analysis);
              }
              if (data.error) {
                setError(data.error);
                options.onError?.(data.error);
              }
              if (data.status === "completed" && data.text) {
                setData(data as T);
                options.onSuccess?.(data as T);
              }
            } catch {
              // 解析失败，忽略
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 请求被取消，不处理
        return;
      }
      const errorMsg = err instanceof Error ? err.message : "处理失败";
      setError(errorMsg);
      options.onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setProgress(0);
    setStatusMessage("");
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    progress,
    statusMessage,
    data,
    error,
    execute,
    reset,
  };
}
