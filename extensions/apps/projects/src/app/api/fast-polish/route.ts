/**
 * ============================================================================
 * 快速润色 API - 高效处理流水线
 * ============================================================================
 * 
 * 优化策略：
 * 1. 单次 LLM 调用完成所有处理
 * 2. 智能跳过已优化的文本
 * 3. 快速检测 + 精准处理
 * 
 * 性能提升：
 * - 减少 LLM 调用次数（从 3+ 次降到 1 次）
 * - 缩短处理时间（预计提升 40-60%）
 */

import { NextRequest, NextResponse } from "next/server";
import {
  LLMClientManager,
  FastPipeline,
  selectModelByTextLength,
} from "@/lib";
import type { HistoricalNarrativeSettings } from "@/types";

// ============================================================================
// API 入口
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, settings, fastMode = true } = body as {
      text: string;
      settings: HistoricalNarrativeSettings;
      fastMode?: boolean;
    };

    if (!text) {
      return NextResponse.json({ error: "请提供有效的文本内容" }, { status: 400 });
    }

    const llmClient = LLMClientManager.createFromRequest(request);
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const startTime = Date.now();
          const send = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            // ================================================================
            // 阶段1：初始化（0-5%）
            // ================================================================
            send({ progress: 0, message: "初始化处理环境..." });

            // 构建处理设置
            const processSettings = {
              vocabulary: settings.vocabulary || [],
              bannedWords: settings.bannedWords || [],
              sentencePatterns: settings.sentencePatterns || [],
              classicalRatio: settings.classicalRatio || 20,
              aiModel: settings.aiModel,
              punctuation: settings.punctuation || {},
              subOptions: settings.subOptions || {},
            };

            // 初始化处理上下文
            const context = FastPipeline.init(text, processSettings);

            send({ progress: 5, message: "初始化完成" });

            // ================================================================
            // 阶段2：快速处理（5-95%）
            // ================================================================
            const selectedModel = selectModelByTextLength(text.length, settings.aiModel);

            const result = await FastPipeline.process(
              context,
              llmClient,
              selectedModel,
              (progress, message) => {
                send({ progress: Math.round(progress), message });
              }
            );

            // ================================================================
            // 阶段3：结果输出（95-100%）
            // ================================================================
            send({ progress: 95, message: "生成报告..." });

            // 构建报告
            const reports = [
              { step: "快速检测", report: `词汇使用率 ${result.stats.vocabUsed}，问题 ${result.stats.bannedReplaced + result.stats.patternsReplaced} 处` },
              { step: "LLM调用", report: `${result.stats.llmCalls} 次` },
              { step: "处理耗时", report: `${((result.stats.processingTime) / 1000).toFixed(1)}秒` },
            ];

            // 检查是否需要二次验证
            if (result.needsReview && !fastMode) {
              send({ progress: 96, message: "执行二次验证..." });
              
              const verifiedText = await FastPipeline.verify(
                result.text,
                context,
                llmClient,
                selectedModel,
                (progress, message) => {
                  send({ progress: 96 + Math.round(progress * 0.03), message });
                }
              );
              
              result.text = verifiedText;
            }

            // 完成
            send({
              progress: 100,
              text: result.text,
              reports,
              analysis: {
                replacements: [],
                summary: `LLM调用: ${result.stats.llmCalls}次，耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}秒`,
              },
              stats: result.stats,
              status: "completed",
              message: `完成！耗时 ${((Date.now() - startTime) / 1000).toFixed(1)}秒`,
            });

            controller.close();
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "处理失败";
            send({ error: errorMsg });
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
