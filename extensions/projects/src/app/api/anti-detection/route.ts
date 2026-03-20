/**
 * ============================================================================
 * AI检测对抗 API
 * ============================================================================
 * 
 * 基于 BypassAIGC 风格实现的文本人性化功能
 * 降低AI特征，对抗AI检测系统
 */

import { NextRequest } from "next/server";
import { LLMClientManager, invokeLLMWithProgress } from "@/lib";
import type { AntiDetectionConfig } from "@/types";
import { ANTI_DETECTION_PRESETS } from "@/types";

// ============================================================================
// 请求类型
// ============================================================================

interface AntiDetectionRequest {
  text: string;
  config?: Partial<AntiDetectionConfig>;
}

// ============================================================================
// 构建人性化提示词
// ============================================================================

function buildAntiDetectionPrompt(text: string, config: AntiDetectionConfig): string {
  const intensityGuide = {
    light: '保持原文大部分表达，仅微调明显AI特征的词汇和句式。',
    medium: '重构句式结构，增加表达变化，适度添加个人化色彩。',
    heavy: '大幅改写文本，彻底改变AI生成痕迹，最大化人类写作特征。',
  };

  const features: string[] = [];
  
  if (config.addHumanTouch) {
    features.push('- 添加主观判断和个人见解，如"我认为"、"在我看来"等');
  }
  if (config.personalize) {
    features.push('- 使用个人化表达，如"说实话"、"不瞒你说"等口语化连接');
  }
  if (config.addImperfections) {
    features.push('- 引入轻微的不完美，如偶尔的口语化表达、不那么工整的句式');
  }
  if (config.varyStructure) {
    features.push('- 变换句式结构，避免过于规律的"首先...其次...最后..."模式');
  }

  return `你是一位专业的文本人性化编辑。请将以下AI生成的文本改写为更具人类写作特征的版本。

## 改写强度
${intensityGuide[config.mode]}

## 具体要求
${features.join('\n')}

## 核心原则
1. 保持原文的主要观点和事实信息不变
2. 维持逻辑连贯性，但可以调整论述顺序
3. 避免过度修改导致语义失真

原文：
${text}

请输出人性化后的文本：`;
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AntiDetectionRequest;

    if (!body.text?.trim()) {
      return new Response(
        JSON.stringify({ error: "请输入要处理的文本" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 合并默认配置
    const mode = body.config?.mode || 'medium';
    const config: AntiDetectionConfig = {
      ...ANTI_DETECTION_PRESETS[mode],
      ...body.config,
    };

    const prompt = buildAntiDetectionPrompt(body.text, config);
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
                temperature: 0.7, // 较高温度增加变化
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
    console.error("Anti-detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "处理失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
