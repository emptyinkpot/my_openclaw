/**
 * ============================================================================
 * 模板生成器 API
 * ============================================================================
 * 
 * 根据模板风格、主题和要点生成新文章
 */

import { NextRequest } from "next/server";
import {
  LLMClientManager,
  isLLMResponseAbnormal,
  invokeLLMWithProgress,
} from "@/lib";
import type { ArticleTemplate } from "@/types";

// ============================================================================
// 风格指纹转换为提示词
// ============================================================================

function fingerprintToPrompt(fp: ArticleTemplate["styleFingerprint"]): string {
  const parts: string[] = [];

  // 感性程度
  if (fp.rationalEmotional < 0.3) {
    parts.push("保持冷静理性的叙述风格");
  } else if (fp.rationalEmotional > 0.7) {
    parts.push("使用富有感情色彩的感性表达");
  }

  // 繁复程度
  if (fp.conciseElaborate < 0.3) {
    parts.push("行文简洁明快，避免冗余");
  } else if (fp.conciseElaborate > 0.7) {
    parts.push("行文细腻繁复，善用铺陈");
  }

  // 现代程度
  if (fp.classicalModern < 0.3) {
    parts.push("使用古典雅致的表达方式");
  } else if (fp.classicalModern > 0.7) {
    parts.push("使用现代通俗的表达方式");
  }

  // 戏谑程度
  if (fp.seriousPlayful < 0.3) {
    parts.push("保持严肃认真的基调");
  } else if (fp.seriousPlayful > 0.7) {
    parts.push("使用戏谑调侃的表达风格");
  }

  return parts.join("；");
}

// ============================================================================
// 生成文章内容
// ============================================================================

function buildPrompt(
  template: ArticleTemplate,
  topic: string,
  keyPoints: string[],
  targetLength: number
): string {
  const styleGuide = fingerprintToPrompt(template.styleFingerprint);
  const styleTags = template.metadata.styleTags?.join("、") || "通用";

  const prompt = `你是一位专业的文学创作者，请根据以下要求创作一篇文章。

## 模板风格要求

### 整体风格
- 文言比例：${(template.vocabulary.classicalRatio * 100).toFixed(0)}%
- 平均句长：${template.sentence.avgLength}字左右
- 篇章结构：${template.chapter.structure}
- 风格标签：${styleTags}
${styleGuide ? `- 风格特征：${styleGuide}` : ""}

### 句式特点
${template.sentence.patterns.map((p) => `- ${p.pattern}`).join("\n")}

## 创作要求

### 主题
${topic}

### 要点
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

### 字数要求
${targetLength}字左右

## 输出要求

1. 直接输出文章正文，不要输出标题
2. 严格按照上述风格要求写作
3. 确保内容完整、逻辑连贯
4. 使用分段结构，每段不宜过长

请开始创作：`;

  return prompt;
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, topic, keyPoints, targetLength } = body as {
      template: ArticleTemplate;
      topic: string;
      keyPoints: string[];
      targetLength: number;
    };

    if (!template || !topic) {
      return new Response(
        JSON.stringify({ error: "缺少必要参数" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 构建提示词
    const prompt = buildPrompt(
      template,
      topic,
      keyPoints || [],
      targetLength || 2000
    );

    // 创建 LLM 客户端
    const llmClient = LLMClientManager.createFromRequest(request);
    const encoder = new TextEncoder();

    // 创建流式响应
    return new Response(
      new ReadableStream({
        async start(controller) {
          const send = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            send({ progress: 0, message: "准备生成..." });

            // 调用 LLM
            const fullContent = await invokeLLMWithProgress(
              llmClient,
              [{ role: "user", content: prompt }],
              {
                model: "doubao-seed-2-0-lite-260215",
                temperature: 0.7,
                onProgress: (progress, message) => {
                  send({ progress, message });
                },
                startProgress: 10,
                endProgress: 90,
                stageName: "创作中",
              }
            );

            send({ progress: 90, message: "解析结果..." });

            // 检查结果是否正常
            if (isLLMResponseAbnormal(fullContent)) {
              throw new Error("生成内容异常，请重试");
            }

            send({ progress: 100, message: "生成完成" });
            send({ text: fullContent, done: true });
            controller.close();
          } catch (error) {
            send({
              error: error instanceof Error ? error.message : "生成失败"
            });
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
    console.error("Template generator error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "生成失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
