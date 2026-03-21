/**
 * ============================================================================
 * 大纲分析 API
 * ============================================================================
 * 
 * AI分析文章大纲，自动推荐叙事配置和风格参数
 */

import { NextRequest } from "next/server";
import { LLMClientManager, invokeLLMWithProgress } from "@/lib";
import type { StyleFingerprint } from "@/types";
import { PRESET_TEMPLATES } from "@/types";

// ============================================================================
// 请求类型
// ============================================================================

interface AnalyzeRequest {
  outline: string;
  targetLength: number;
}

// ============================================================================
// 构建分析提示词
// ============================================================================

function buildAnalyzePrompt(outline: string, targetLength: number): string {
  const templateList = PRESET_TEMPLATES.map(t => 
    `- ${t.metadata.id}: ${t.metadata.name} (${t.metadata.styleTags?.join(', ') || '通用'})`
  ).join('\n');

  return `你是一位文学创作顾问，请分析以下文章大纲，推荐最佳的创作配置。

## 文章大纲
${outline}

## 目标字数
${targetLength}字

## 可用模板
${templateList}

## 请分析并返回JSON配置

请返回以下格式的JSON（只返回JSON，不要其他内容）：

{
  "summary": "一句话概括推荐的创作方向",
  "narrative": {
    "perspectiveMode": "thorough_situationalism | limited_situationalism | experimental_comparison",
    "openingType": "symbolic_scene | decisive_moment | news_event | private_moment",
    "developmentPath": "dual_thread_weave | core_contradiction",
    "endingType": "suspended_image | contradiction_juxtaposed | open_question",
    "macroWeight": 50,
    "faction": "japanese_right_wing | chinese_resistance | manchukuo_puppet | soviet_left_wing | western_classical",
    "specificFears": "角色设定描述",
    "metaphorPreferences": ["mechanical_engineering", "biological_medical", "drama_chess", "hydrological_geographic", "architectural", "theological"]
  },
  "style": {
    "templateId": "模板ID或空字符串",
    "templateName": "模板名称或空字符串",
    "classicalRatio": 20,
    "fingerprint": {
      "rationalEmotional": 0.5,
      "conciseElaborate": 0.5,
      "directImplicit": 0.5,
      "objectiveSubjective": 0.5,
      "classicalModern": 0.5,
      "seriousPlayful": 0.5,
      "tenseRelaxed": 0.5,
      "concreteAbstract": 0.5
    }
  }
}

## 分析原则

1. **史观模式**：
   - 历史题材用 thorough_situationalism
   - 现代题材用 limited_situationalism
   - 对比论证用 experimental_comparison

2. **阵营选择**：根据主题倾向选择，默认用 western_classical

3. **展开路径**：
   - 复杂议题用 dual_thread_weave（双线交织）
   - 单一矛盾用 core_contradiction（核心矛盾）

4. **比喻系统**：选择2-3个最贴合主题的

5. **风格指纹**：
   - 理性文章：rationalEmotional 偏低
   - 抒情文章：rationalEmotional 偏高
   - 学术文章：conciseElaborate 偏低
   - 文学文章：conciseElaborate 偏高

6. **模板选择**：选择风格标签最匹配的模板

请分析并返回JSON：`;
}

// ============================================================================
// 解析AI响应
// ============================================================================

function parseConfigResponse(text: string) {
  try {
    // 尝试提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
  
  // 返回默认配置
  return {
    summary: "基于文章大纲推荐通用配置",
    narrative: {
      perspectiveMode: "limited_situationalism",
      openingType: "symbolic_scene",
      developmentPath: "dual_thread_weave",
      endingType: "suspended_image",
      macroWeight: 60,
      faction: "western_classical",
      specificFears: "",
      metaphorPreferences: ["mechanical_engineering", "architectural"],
    },
    style: {
      templateId: "",
      templateName: "",
      classicalRatio: 20,
      fingerprint: {
        rationalEmotional: 0.5,
        conciseElaborate: 0.5,
        directImplicit: 0.5,
        objectiveSubjective: 0.5,
        classicalModern: 0.5,
        seriousPlayful: 0.5,
        tenseRelaxed: 0.5,
        concreteAbstract: 0.5,
      },
    },
  };
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalyzeRequest;

    if (!body.outline?.trim()) {
      return new Response(
        JSON.stringify({ error: "请输入文章大纲" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = buildAnalyzePrompt(body.outline, body.targetLength || 5000);
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
                onProgress: () => {},
                startProgress: 0,
                endProgress: 100,
              }
            );

            const config = parseConfigResponse(fullContent);
            send({ config });
            controller.close();
          } catch (error) {
            send({ error: error instanceof Error ? error.message : "分析失败" });
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
    console.error("Analyze outline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "分析失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
