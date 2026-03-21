/**
 * ============================================================================
 * 统一文章生成器 API
 * ============================================================================
 * 
 * 融合历史叙事配置和模板风格配置，一次生成同时使用两种参数
 */

import { NextRequest } from "next/server";
import {
  LLMClientManager,
  isLLMResponseAbnormal,
  invokeLLMWithProgress,
} from "@/lib";
import type { StyleFingerprint } from "@/types";

// ============================================================================
// 请求类型
// ============================================================================

interface UnifiedGeneratorRequest {
  // 叙事参数
  narrative: {
    perspectiveMode: string;
    openingType: string;
    developmentPath: string;
    endingType: string;
    macroWeight: number;
    faction: string;
    characterTags: string[];
    specificFears: string;
    declaredIdeals: string;
    metaphorPreferences: string[];
  };
  // 风格参数
  style: {
    enableTemplate: boolean;
    fingerprint: StyleFingerprint;
    classicalRatio: number;
    templateId?: string;
    templateName?: string;
  };
  // 内容参数
  content: {
    topic: string;
    keyPoints: string[];
    targetLength: number;
  };
}

// ============================================================================
// 阵营词汇映射
// ============================================================================

const FACTION_VOCAB: Record<string, string[]> = {
  japanese_right_wing: ['国运', '统制', '牺牲', '大义', '生存竞争', '精密蓝图', '昭和维新', '王道乐土'],
  chinese_resistance: ['抗战', '民族', '救亡', '复兴', '血战', '坚持', '胜利', '团结'],
  manchukuo_puppet: ['建国', '协和', '王道', '共荣', '新秩序', '建国精神', '日满一体'],
  soviet_left_wing: ['革命', '阶级', '斗争', '解放', '同志', '组织', '路线', '正确'],
  western_classical: ['文明', '秩序', '理性', '传统', '荣誉', '责任', '牺牲', '使命'],
};

const METAPHOR_VOCAB: Record<string, string[]> = {
  mechanical_engineering: ['机器', '齿轮', '蓝图', '机械', '装置', '系统', '运转'],
  biological_medical: ['肌体', '毒瘤', '血脉', '细胞', '感染', '病灶', '手术'],
  drama_chess: ['舞台', '演员', '棋手', '棋子', '幕布', '剧本', '角色'],
  hydrological_geographic: ['洪流', '暗流', '土壤', '潮汐', '冲击', '沉积', '源泉'],
  architectural: ['大厦', '基石', '废墟', '建筑', '结构', '栋梁', '崩塌'],
  theological: ['圣殿', '天启', '救赎', '祭坛', '命运', '审判', '启示'],
};

// ============================================================================
// 风格指纹转提示词
// ============================================================================

function fingerprintToPrompt(fp: StyleFingerprint): string {
  const parts: string[] = [];

  if (fp.rationalEmotional < 0.3) parts.push("保持冷静理性的叙述风格");
  else if (fp.rationalEmotional > 0.7) parts.push("使用富有感情色彩的感性表达");

  if (fp.conciseElaborate < 0.3) parts.push("行文简洁明快");
  else if (fp.conciseElaborate > 0.7) parts.push("行文细腻繁复，善用铺陈");

  if (fp.classicalModern < 0.3) parts.push("使用古典雅致的表达");
  else if (fp.classicalModern > 0.7) parts.push("使用现代通俗的表达");

  if (fp.seriousPlayful < 0.3) parts.push("保持严肃认真的基调");
  else if (fp.seriousPlayful > 0.7) parts.push("使用戏谑调侃的表达风格");

  return parts.join("；");
}

// ============================================================================
// 构建提示词
// ============================================================================

function buildPrompt(req: UnifiedGeneratorRequest): string {
  const { narrative, style, content } = req;

  // 阵营词汇
  const factionWords = FACTION_VOCAB[narrative.faction] || [];
  
  // 比喻词汇
  const metaphorWords = narrative.metaphorPreferences
    .flatMap(p => METAPHOR_VOCAB[p] || [])
    .slice(0, 10);

  // 风格描述
  const styleDesc = fingerprintToPrompt(style.fingerprint);
  const classicalPercent = Math.round(style.classicalRatio * 100);

  // 核心史观描述
  const perspectiveDesc: Record<string, string> = {
    thorough_situationalism: '严格禁锢于角色当时的认知、信息与情感。未来是真正的未知，所有判断基于"当时何以可能"。彻底抛弃后见之明与上帝视角。',
    limited_situationalism: '基本遵循历史情境主义，但允许在章节末以极简形式提供后续结果作为背景参考。',
    experimental_comparison: '生成平行文本对比不同视角。',
  };

  // 开端描述
  const openingDesc: Record<string, string> = {
    symbolic_scene: '从一个象征性的场景或物品切入',
    decisive_moment: '从决定性的历史瞬间切入',
    news_event: '从一则新闻事件或流言切入',
    private_moment: '从角色的私密时刻切入',
  };

  // 展开描述
  const developmentDesc: Record<string, string> = {
    dual_thread_weave: `采用双线交织结构：宏观线（${narrative.macroWeight}%）与微观线（${100 - narrative.macroWeight}%）交替出现。`,
    core_contradiction: '聚焦一个核心矛盾，从不同视角反复切入，呈现"罗生门"效应。',
  };

  // 结尾描述
  const endingDesc: Record<string, string> = {
    suspended_image: '终结于一个充满未完成感的象征画面，不给出结论。',
    contradiction_juxtaposed: '将宏伟蓝图与残酷现实并置，自然形成反讽。',
    open_question: '以角色内心一个无解的问题收尾。',
  };

  const prompt = `# 角色设定

你是一位精通历史叙事的作家，擅长运用"历史情境主义"方法创作深度叙事散文。

# 核心创作原则

## 史观模式
${perspectiveDesc[narrative.perspectiveMode] || perspectiveDesc.thorough_situationalism}

## 叙事技法
- 开端：${openingDesc[narrative.openingType] || openingDesc.symbolic_scene}
- 展开：${developmentDesc[narrative.developmentPath] || developmentDesc.dual_thread_weave}
- 结尾：${endingDesc[narrative.endingType] || endingDesc.suspended_image}

# 风格要求

## 语言风格
- 文言比例：${classicalPercent}%
${style.enableTemplate && styleDesc ? `- 风格特征：${styleDesc}` : ''}
${style.enableTemplate && style.templateName ? `- 参考模板：${style.templateName}` : ''}

## 特色词汇（适度使用）
${factionWords.length > 0 ? `- 阵营词汇：${factionWords.join('、')}` : ''}
${metaphorWords.length > 0 ? `- 比喻词汇：${metaphorWords.join('、')}` : ''}

# 创作要求

## 主题
${content.topic}

## 要点
${content.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 角色设定
${narrative.specificFears || '默认设定'}

## 字数要求
${content.targetLength}字左右

# 输出要求

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
    const body = await request.json() as UnifiedGeneratorRequest;

    if (!body.content?.topic) {
      return new Response(
        JSON.stringify({ error: "缺少文章主题" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 构建提示词
    const prompt = buildPrompt(body);

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
    console.error("Unified generator error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "生成失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
