/**
 * 润色API - 模块化版本
 * 
 * POST /api/polish/v2
 * 
 * 使用新的模块化架构重构后的API入口
 * 
 * @module app/api/polish/v2/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { container, ServiceTokens } from '@/core/di';
import { bootstrapServices } from '@/core/di/bootstrap';
import type { 
  PolishInput, 
  PolishProgress,
  PolishOutput,
  PolishSettings,
} from '@/modules/polish';
import type { IPolishPipeline } from '@/core/di/types';

// 确保服务已注册
bootstrapServices();

/**
 * 请求体类型
 */
interface RequestBody {
  text: string;
  settings: PolishSettings;
}

/**
 * SSE事件类型
 */
interface SSEEvent {
  type: 'progress' | 'result' | 'error';
  data: unknown;
}

/**
 * POST /api/polish/v2
 * 
 * 润色文本处理API
 * 
 * @param request Next.js请求对象
 * @returns SSE流响应
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json() as RequestBody;
    const { text, settings } = body;
    
    // 验证输入
    if (!text?.trim()) {
      return NextResponse.json(
        { error: '请提供有效的文本内容' },
        { status: 400 }
      );
    }
    
    if (text.length > 100000) {
      return NextResponse.json(
        { error: '文本长度超过限制（最多10万字）' },
        { status: 400 }
      );
    }
    
    // 获取流水线实例
    const pipeline = container.resolve<IPolishPipeline>(ServiceTokens.POLISH_PIPELINE);
    
    // 验证配置
    if (!pipeline.validateConfig(settings)) {
      return NextResponse.json(
        { error: '无效的配置参数' },
        { status: 400 }
      );
    }
    
    // 创建SSE流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: SSEEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };
        
        try {
          const output = await pipeline.execute(
            { text, settings },
            (progress: PolishProgress) => {
              // 发送进度更新
              sendEvent({
                type: 'progress',
                data: progress,
              });
            }
          );
          
          // 发送最终结果
          sendEvent({
            type: 'result',
            data: output,
          });
          
          controller.close();
          
        } catch (error) {
          // 发送错误事件
          sendEvent({
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : '处理失败',
              stack: process.env.NODE_ENV === 'development' 
                ? error instanceof Error ? error.stack : undefined 
                : undefined,
            },
          });
          
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
      },
    });
    
  } catch (error) {
    console.error('[api/polish/v2] Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/polish/v2
 * 
 * 获取可用的处理步骤列表
 */
export async function GET() {
  const pipeline = container.resolve<IPolishPipeline>(ServiceTokens.POLISH_PIPELINE);
  const steps = pipeline.getAvailableSteps();
  
  return NextResponse.json({
    steps,
    version: '2.0.0',
    description: '模块化润色API',
  });
}
