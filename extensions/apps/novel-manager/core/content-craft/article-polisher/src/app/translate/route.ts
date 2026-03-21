/**
 * ============================================================================
 * 翻译 API
 * ============================================================================
 * 
 * 基于 GPT Academic 风格实现的翻译功能
 * 支持多语言翻译，学术风格优先
 */

import { NextRequest } from "next/server";
import { LLMClientManager, invokeLLMWithProgress } from "@/lib";
import type { TranslateRequest } from "@/types";

// ============================================================================
// 构建翻译提示词
// ============================================================================

function buildTranslatePrompt(request: TranslateRequest): string {
  const { text, sourceLang, targetLang, style = 'academic' } = request;
  
  const styleGuide = {
    academic: '使用正式的学术语言，保持专业术语的准确性，遵循学术写作惯例。',
    literary: '注重文学性表达，保持原文的艺术风格和情感色彩。',
    casual: '使用自然流畅的口语化表达，易于日常阅读理解。',
  };

  const languageNames: Record<string, string> = {
    zh: '中文',
    en: '英语',
    ja: '日语',
    de: '德语',
    fr: '法语',
  };

  return `你是一位专业的翻译专家，精通${languageNames[sourceLang]}和${languageNames[targetLang]}。

## 翻译要求

1. ${styleGuide[style]}
2. 保持原文的核心意思和情感色彩
3. 使用地道的${languageNames[targetLang]}表达
4. 确保翻译的自然流畅

## 原文（${languageNames[sourceLang]}）

${text}

请输出${languageNames[targetLang]}翻译：`;
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TranslateRequest;

    if (!body.text?.trim()) {
      return new Response(
        JSON.stringify({ error: "请输入要翻译的文本" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = buildTranslatePrompt(body);
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

            send({ text: fullContent, progress: 100, done: true });
            controller.close();
          } catch (error) {
            send({ error: error instanceof Error ? error.message : "翻译失败" });
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
    console.error("Translate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "翻译失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
