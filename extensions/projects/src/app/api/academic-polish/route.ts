/**
 * ============================================================================
 * 学术润色 API
 * ============================================================================
 * 
 * 基于 awesome-ai-research 风格实现的学术润色功能
 * 支持中英互译、润色、缩写、扩写等
 */

import { NextRequest } from "next/server";
import { LLMClientManager, invokeLLMWithProgress } from "@/lib";
import type { AcademicPolishType } from "@/types";
import { ACADEMIC_POLISH_TEMPLATES } from "@/types";

// ============================================================================
// 请求类型
// ============================================================================

interface AcademicPolishRequest {
  text: string;
  type: AcademicPolishType;
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AcademicPolishRequest;

    if (!body.text?.trim()) {
      return new Response(
        JSON.stringify({ error: "请输入要处理的文本" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 获取模板
    const template = ACADEMIC_POLISH_TEMPLATES.find(t => t.id === body.type);
    if (!template) {
      return new Response(
        JSON.stringify({ error: "未知的处理类型" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 构建提示词
    const wordCount = body.text.length;
    const prompt = template.promptTemplate
      .replace('{input}', body.text)
      .replace('{word_count}', String(wordCount));

    const llmClient = LLMClientManager.createFromRequest(request);
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const send = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            const fullContent = await invokeLLMWithProgress(
              llmClient,
              [{ role: "user", content: prompt }],
              {
                model: "doubao-seed-2-0-lite-260215",
                temperature: 0.3,
                onProgress: (progress, text) => {
                  if (text) {
                    send({ text, progress });
                  }
                },
                startProgress: 0,
                endProgress: 100,
              }
            );

            send({ text: fullContent, progress: 100, done: true, type: body.type });
            controller.close();
          } catch (error) {
            send({ error: error instanceof Error ? error.message : "处理失败" });
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
    console.error("Academic polish error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "处理失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
