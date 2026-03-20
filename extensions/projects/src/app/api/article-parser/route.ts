/**
 * ============================================================================
 * 文章结构解析 API
 * ============================================================================
 * 
 * 将文章解析为结构化模板，提取写作DNA
 */

import { NextRequest, NextResponse } from "next/server";
import {
  LLMClientManager,
  invokeLLM,
} from "@/lib";
import type {
  ArticleTemplate,
  ParseArticleRequest,
  StyleFingerprint,
  VocabularyLayerParams,
  SentenceLayerParams,
  ParagraphLayerParams,
  ChapterLayerParams,
} from "@/types";
import {
  createDefaultTemplate,
  DEFAULT_STYLE_FINGERPRINT,
  DEFAULT_VOCABULARY_PARAMS,
  DEFAULT_SENTENCE_PARAMS,
  DEFAULT_PARAGRAPH_PARAMS,
  DEFAULT_CHAPTER_PARAMS,
  DEFAULT_PLACEHOLDERS,
  DEFAULT_CONSTRAINTS,
} from "@/types";

// ============================================================================
// 解析 Prompt 构建器
// ============================================================================

function buildParsePrompt(text: string): string {
  return `# 任务

你是一位专业的文章结构分析师。请对以下文章进行深度结构解析，提取其写作DNA。

# 文章内容

${text}

# 解析要求

请按以下维度进行解析，并输出JSON格式的结果：

## 1. 词汇层参数
分析文章的词汇特征：
- complexity: 词汇复杂度 (0-1，基于词频统计)
- classicalRatio: 文言比例 (0-1)
- terminologyDensity: 术语密度 (每千字专业术语数)
- metaphorDensity: 比喻密度 (每千字比喻数)
- emotionalWordRatio: 情感词比例 (0-1)
- forbiddenWords: 禁用词列表 (作者避免使用的词汇，数组)
- preferredWords: 偏好词列表 (作者偏好的词汇，数组)

## 2. 句子层参数
分析文章的句子特征：
- avgLength: 平均句长 (字数)
- lengthStdDev: 句长标准差
- longSentenceThreshold: 长句阈值
- shortSentenceThreshold: 短句阈值
- questionRatio: 疑问句比例 (0-1)
- exclamationRatio: 感叹句比例 (0-1)
- parallelismFrequency: 排比使用频率 (0-1)
- patterns: 高频句式模板库 (数组，每项包含 pattern, frequency, positionPreference)

## 3. 段落层参数
分析文章的段落特征：
- avgLength: 平均段长 (字数)
- functionDistribution: 段落功能分布 (introduction/argument/narrative/transition/climax/conclusion 各占比，总和为1)
- topicSentencePosition: 主题句位置 (start/middle/end/none)
- transitionWords: 段落衔接词库 (数组)

## 4. 篇章层参数
分析文章的整体结构：
- structure: 整体结构模式 (four_part/three_act/hero_journey/inverted_pyramid/spiral/multi_thread)
- structureNodes: 结构节点数组 (每项包含 position 0-1, function描述, emotionalIntensity 0-1, informationDensity 0-1)
- perspective: 视角设置 (main: first_person/limited_third/omniscient_third, switchPoints数组, switchType)
- rhythmCurve: 节奏曲线 (位置 -> 节奏值 0-1)
- emotionalCurve: 情感曲线 (位置 -> 情感值 -1到1)

## 5. 风格指纹
分析文章的8维风格特征 (每个维度 0-1)：
- rationalEmotional: 理性-感性 (0=理性, 1=感性)
- conciseElaborate: 简洁-繁复 (0=简洁, 1=繁复)
- directImplicit: 直白-含蓄 (0=直白, 1=含蓄)
- objectiveSubjective: 客观-主观 (0=客观, 1=主观)
- classicalModern: 古典-现代 (0=古典, 1=现代)
- seriousPlayful: 严肃-戏谑 (0=严肃, 1=戏谑)
- tenseRelaxed: 紧凑-舒缓 (0=紧凑, 1=舒缓)
- concreteAbstract: 具体-抽象 (0=具体, 1=抽象)

## 6. 约束规则
- mustInclude: 必须包含的元素 (数组)
- mustExclude: 禁止包含的元素 (数组)
- structureConstraints: 结构约束 (数组)
- styleConstraints: 风格约束 (数组)

# 输出格式

请严格按照以下JSON格式输出，不要添加任何解释：

\`\`\`json
{
  "vocabulary": { ... },
  "sentence": { ... },
  "paragraph": { ... },
  "chapter": { ... },
  "styleFingerprint": { ... },
  "constraints": { ... }
}
\`\`\`

# 注意事项

1. 所有比例值必须在0-1之间
2. 比例分布的总和应为1
3. 数值要基于文章实际内容计算，不要凭空猜测
4. 如果某项无法确定，使用合理的默认值`;
}

// ============================================================================
// 解析结果提取
// ============================================================================

function extractTemplateFromLLMResponse(
  response: string,
  templateName: string,
  genre?: string,
  styleTags?: string[]
): ArticleTemplate {
  // 尝试提取JSON
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                    response.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.warn("[article-parser] No JSON found in response, using default template");
    return createDefaultTemplate(templateName);
  }

  try {
    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    return {
      metadata: {
        id: `template-${Date.now()}`,
        name: templateName,
        parsedAt: new Date().toISOString(),
        version: '1.0',
        genre: genre as any,
        styleTags,
      },
      vocabulary: {
        ...DEFAULT_VOCABULARY_PARAMS,
        ...(parsed.vocabulary || {}),
        posDistribution: {
          ...DEFAULT_VOCABULARY_PARAMS.posDistribution,
          ...(parsed.vocabulary?.posDistribution || {}),
        },
      },
      sentence: {
        ...DEFAULT_SENTENCE_PARAMS,
        ...(parsed.sentence || {}),
        patterns: parsed.sentence?.patterns || [],
      },
      paragraph: {
        ...DEFAULT_PARAGRAPH_PARAMS,
        ...(parsed.paragraph || {}),
        functionDistribution: {
          ...DEFAULT_PARAGRAPH_PARAMS.functionDistribution,
          ...(parsed.paragraph?.functionDistribution || {}),
        },
        examplePattern: {
          ...DEFAULT_PARAGRAPH_PARAMS.examplePattern,
          ...(parsed.paragraph?.examplePattern || {}),
        },
      },
      chapter: {
        ...DEFAULT_CHAPTER_PARAMS,
        ...(parsed.chapter || {}),
        perspective: {
          ...DEFAULT_CHAPTER_PARAMS.perspective,
          ...(parsed.chapter?.perspective || {}),
        },
        rhythmCurve: parsed.chapter?.rhythmCurve || DEFAULT_CHAPTER_PARAMS.rhythmCurve,
        emotionalCurve: parsed.chapter?.emotionalCurve || DEFAULT_CHAPTER_PARAMS.emotionalCurve,
      },
      styleFingerprint: {
        ...DEFAULT_STYLE_FINGERPRINT,
        ...(parsed.styleFingerprint || {}),
      },
      placeholders: DEFAULT_PLACEHOLDERS,
      constraints: {
        ...DEFAULT_CONSTRAINTS,
        ...(parsed.constraints || {}),
      },
    };
  } catch (error) {
    console.error("[article-parser] JSON parse error:", error);
    return createDefaultTemplate(templateName);
  }
}

// ============================================================================
// API 处理
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ParseArticleRequest;
    const { text, templateName = "未命名模板", genre, styleTags } = body;

    if (!text || text.trim().length < 100) {
      return NextResponse.json({
        success: false,
        error: "文章内容太短，至少需要100字",
      }, { status: 400 });
    }

    // 创建 LLM 客户端
    const llmClient = LLMClientManager.createFromRequest(request);

    // 构建 Prompt 并调用 LLM
    const prompt = buildParsePrompt(text);
    const response = await invokeLLM(
      llmClient,
      [{ role: "user", content: prompt }],
      {
        model: "doubao-seed-2-0-pro-260115",
        temperature: 0.3,
      }
    );

    // 解析结果
    const template = extractTemplateFromLLMResponse(
      response,
      templateName,
      genre,
      styleTags
    );

    // 记录原文字数
    template.metadata.sourceWordCount = text.length;

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("[article-parser] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "解析失败",
    }, { status: 500 });
  }
}
