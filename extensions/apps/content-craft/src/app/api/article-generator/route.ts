/**
 * ============================================================================
 * 文章生成器 API
 * ============================================================================
 * 
 * 基于历史叙事生成器设计文档实现
 * 支持流式输出进度和结果
 */

import { NextRequest } from "next/server";
import {
  LLMClientManager,
  isLLMResponseAbnormal,
  invokeLLMWithProgress,
} from "@/lib";
import type { ArticleGeneratorSettings } from "@/types";

// ============================================================================
// 请求类型
// ============================================================================

interface ArticleGeneratorRequest {
  settings: ArticleGeneratorSettings;
}

// ============================================================================
// Prompt 构建器
// ============================================================================

function buildArticlePrompt(settings: ArticleGeneratorSettings): string {
  const { corePhilosophy, character, narrativeStructure, style } = settings;

  // 核心史观模式描述
  const perspectiveModeDesc = {
    thorough_situationalism: '严格禁锢于角色当时的认知、信息与情感。未来是真正的未知，所有判断基于"当时何以可能"。必须彻底抛弃后见之明与上帝视角评判。',
    limited_situationalism: '基本遵循历史情境主义，但允许在章节末以"后世史家注"的形式提供极简的、事实性的后续结果，仅作背景参考。',
    experimental_comparison: '生成平行文本，一份遵循历史情境主义，另一份采用全知上帝视角。',
  };

  // 终极目标描述
  const ultimateGoalDesc = {
    empathy_void: '通过彻底沉浸角色逻辑，暴露其信念在现实前的脆弱与荒诞，导向悬置判断的苍凉感。',
    heavy_decision_process: '侧重于展示在信息迷雾中做决定的艰难与痛苦。',
    structural_irony: '侧重于计划与结果、口号与现实的残酷反差。',
  };

  // 阵营词汇映射
  const factionVocab = {
    japanese_right_wing: ['国运', '统制', '牺牲', '大义', '生存竞争', '精密蓝图', '昭和维新', '王道乐土', '共荣'],
    chinese_resistance: ['抗战', '民族', '救亡', '复兴', '血战', '坚持', '牺牲', '胜利', '团结'],
    manchukuo_puppet: ['建国', '协和', '王道', '共荣', '新秩序', '建国精神', '日满一体'],
    soviet_left_wing: ['革命', '阶级', '斗争', '解放', '同志', '组织', '路线', '正确'],
    western_classical: ['文明', '秩序', '理性', '传统', '荣誉', '责任', '牺牲', '使命'],
  };

  // 比喻系统词汇
  const metaphorVocab = {
    mechanical_engineering: ['机器', '齿轮', '蓝图', '机械', '装置', '系统', '运转'],
    biological_medical: ['肌体', '毒瘤', '血脉', '细胞', '感染', '病灶', '手术'],
    drama_chess: ['舞台', '演员', '棋手', '棋子', '幕布', '剧本', '角色'],
    hydrological_geographic: ['洪流', '暗流', '土壤', '潮汐', '冲击', '沉积', '源泉'],
    architectural: ['大厦', '基石', '废墟', '建筑', '结构', '栋梁', '崩塌'],
    theological: ['圣殿', '天启', '救赎', '祭坛', '命运', '审判', '启示'],
  };

  // 收集选中的比喻词汇
  const selectedMetaphors = style.metaphorPreferences
    .map(p => metaphorVocab[p])
    .flat();

  // 开端类型描述
  const openingDesc = {
    symbolic_scene: '从一个象征性的场景或物品切入',
    decisive_moment: '从决定性的历史瞬间切入',
    news_event: '从一则新闻事件或流言切入',
    private_moment: '从角色的私密时刻切入',
  };

  // 展开路径描述
  const developmentDesc = {
    dual_thread_weave: `采用双线交织结构：
- 宏观线（${narrativeStructure.macroWeight}%）：决策推演、会议争论、文件分析、战略计算。风格：冷静、精密、引述数据、充满逻辑。
- 微观线（${narrativeStructure.microWeight}%）：被决策影响的普通人遭遇、环境细节、感官描述。风格：白描、克制、充满"物哀"感。
两条线交替出现，形成张力。`,
    core_contradiction: '聚焦一个核心矛盾，从不同角色的视角反复切入，呈现"罗生门"效应。',
  };

  // 结尾类型描述
  const endingDesc = {
    suspended_image: '终结于一个充满未完成感的象征画面，不给出结论。',
    contradiction_juxtaposed: '将宏伟蓝图与残酷现实、公开宣言与私下算计并置，自然形成反讽。',
    open_question: '以角色内心一个无解的问题收尾。',
  };

  const prompt = `# 角色设定

你是一位精通历史叙事的作家，擅长运用"历史情境主义"方法创作深度叙事散文。你的写作风格融合了石黑一雄的记忆闪回技法、门罗的细节穿刺、以及"物哀"式的审美意境。

# 核心创作原则

## 1. 史观模式：${perspectiveModeDesc[corePhilosophy.perspectiveMode]}

## 2. 思想底色光谱
- 异端右翼内核 (${corePhilosophy.ideologicalSpectrum.heterodoxRightWing}%): 崇尚强力、秩序、整体利益、宏大工程
- 东洋史学/结构分析 (${corePhilosophy.ideologicalSpectrum.orientalHistoriography}%): 长时段、文明冲突、制度演进
- 大东亚/使命史观 (${corePhilosophy.ideologicalSpectrum.greaterEastAsia}%): 特殊使命、悲壮感、救世情结

## 3. 终极目标
${ultimateGoalDesc[corePhilosophy.ultimateGoal]}

# 角色设定

## 人称与视角
${character.perspective === 'first_person' ? '完全第一人称沉浸，以"我"叙述，严格受限' : 
  character.perspective === 'limited_omniscient' ? '有限上帝视角，第三人称，视角集中于核心角色' : 
  '全知上帝视角'}

## 阵营与立场
- 阵营：${FACTION_LABELS[character.faction]}
- 角色标签：${character.characterTags.map(t => CHARACTER_TAG_LABELS[t]).join('、')}

## 角色的核心驱动力
- 具体恐惧：${character.specificFears || '（未设定）'}
- 宣称的理想：${character.declaredIdeals || '（未设定）'}
- 恐惧催生的理性化路径：${character.fearRationalizationPath || '（未设定）'}

## 信息茧房
角色只能接触到以下信息：${character.informationCocoon.map(c => COCOON_LABELS[c]).join('、')}

## 关键记忆闪回
${character.keyMemoryFlashback || '（未设定）'}

# 叙事结构

## 开端
${openingDesc[narrativeStructure.openingType]}
${narrativeStructure.openingDescription ? `具体内容：${narrativeStructure.openingDescription}` : ''}

## 展开路径
${developmentDesc[narrativeStructure.developmentPath]}

## 叙事技法
${narrativeStructure.techniques.enableMunroDetailPuncture ? '- 启用"门罗式细节穿刺"：在宏观论述中，随机插入极度微观、感官化的细节描写\n' : ''}${narrativeStructure.techniques.enableIshiguroFlashback ? '- 启用"石黑一雄式闪回"：在角色决策压力最大时，触发记忆闪回\n' : ''}

## 论述策略
${narrativeStructure.argumentStrategy.internalConsistency ? '- 内部逻辑自洽：为角色的激进选择构建一套基于其世界观、看似严密的推理\n' : ''}${narrativeStructure.argumentStrategy.emotionalMobilization ? '- 情感动员与悲情渲染：使用崇高、悲壮的语言，描绘危机，激发使命感\n' : ''}${narrativeStructure.argumentStrategy.exclusionUniqueness ? '- 通过排除法确立唯一性：论证其他所有路径的不可行，凸显"别无选择"\n' : ''}${narrativeStructure.argumentStrategy.showCostWithoutReflection ? '- 展现代价，但不反思：冷静描述代价，但口吻是"必要之恶"或"伟大阵痛"\n' : ''}

## 结尾
${endingDesc[narrativeStructure.endingType]}${narrativeStructure.echoOpening ? '\n必须呼应开篇意象。' : ''}

# 风格要求

## 文白比例
文言 ${style.classicalRatio.classical}% / 白话 ${style.classicalRatio.vernacular}%

## 语境词汇（优先使用）
${factionVocab[character.faction].join('、')}

## 比喻系统（优先使用）
${selectedMetaphors.slice(0, 10).join('、')}

## 文献典故
${style.embedLiteraryAllusions ? `自然化用文献典故${style.literaryAllusionDirections ? `，方向：${style.literaryAllusionDirections}` : ''}` : '不植入文献典故'}

# 输出要求

## 文章长度
约 ${style.targetLength} 字

## 标题风格
凝练、象征性，避免直接结论。示例：《黑土上的蓝图与铁轨》、《杏花村的龙袍》

## 格式要求
- 输出完整的、连贯的叙事散文
- 禁止分点列表、小标题（除了主副标题）
- 段落长度：中长段落，适合沉浸式阅读

# 禁止事项

1. 禁止使用现代网络用语（如"硬核"、"绝了"等）
2. 禁止使用AI感的表述（如"然而"、"总的来说"、"综上所述"等）
3. 禁止直接评判角色（让读者自己感受）
4. 禁止超出角色认知的信息
5. 禁止使用"注："或"说明："等解释性标注

现在，请根据以上设定，创作一篇完整的历史叙事散文。`;

  return prompt;
}

// 标签映射
const FACTION_LABELS: Record<string, string> = {
  japanese_right_wing: '日方/右翼',
  chinese_resistance: '中方/抗战',
  manchukuo_puppet: '伪满/傀儡政权',
  soviet_left_wing: '苏俄/左翼',
  western_classical: '西方/古典',
};

const CHARACTER_TAG_LABELS: Record<string, string> = {
  decision_maker: '决策者',
  executor: '执行者',
  believer: '信仰者',
  opportunist: '投机者',
  disillusioned: '幻灭者',
  swept_along: '被裹挟者',
  observer: '观察者',
  technocrat: '技术官僚',
  idealist: '理想主义者',
};

const COCOON_LABELS: Record<string, string> = {
  internal_documents: '内部文件/宣传',
  street_rumors: '街头谣言与小道消息',
  personal_trauma: '个人经历与创伤记忆',
  limited_enemy_info: '有限的敌方信息',
  circle_pressure: '所属圈子的共识与压力',
  wrong_intelligence: '错误的情报或学术理论',
};

// ============================================================================
// API 处理
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ArticleGeneratorRequest;
    const { settings } = body;

    // 验证必要字段
    if (!settings.character.specificFears || !settings.character.declaredIdeals) {
      return new Response(
        JSON.stringify({ error: "请填写角色的具体恐惧和宣称的理想" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 创建 LLM 客户端
    const llmClient = LLMClientManager.createFromRequest(request);
    const encoder = new TextEncoder();

    // 进度阶段
    const PROGRESS_PHASES = {
      init: { start: 0, end: 5 },
      buildPrompt: { start: 5, end: 10 },
      llmProcess: { start: 10, end: 90 },
      parse: { start: 90, end: 95 },
      done: { start: 95, end: 100 },
    };

    return new Response(
      new ReadableStream({
        async start(controller) {
          const send = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            // 阶段1：初始化
            send({ progress: 0, message: "准备生成..." });

            // 阶段2：构建 Prompt
            send({ progress: 5, message: "构建创作指令..." });
            const prompt = buildArticlePrompt(settings);
            send({ progress: 10, message: "指令构建完成" });

            // 阶段3：调用 LLM（带进度回调）
            const fullContent = await invokeLLMWithProgress(
              llmClient,
              [{ role: "user", content: prompt }],
              {
                model: settings.aiModel,
                temperature: 0.8,
                onProgress: (progress, message) => {
                  send({ progress, message });
                },
                startProgress: 15,
                endProgress: 90,
                stageName: "创作中",
              }
            );

            send({ progress: 90, message: "解析结果..." });

            // 检查结果是否正常
            if (isLLMResponseAbnormal(fullContent)) {
              throw new Error("生成内容异常，请重试");
            }

            // 提取标题和正文
            let title = "";
            let content = fullContent;

            // 尝试提取标题（格式：《标题》或 # 标题）
            const titleMatch = fullContent.match(/^[#《]([^#》]+)[》\n]/);
            if (titleMatch) {
              title = titleMatch[1];
              content = fullContent.substring(titleMatch[0].length).trim();
            }

            send({ progress: 100, title, text: content, message: "生成完成" });
            controller.close();

          } catch (error) {
            console.error("[article-generator] Error:", error);
            send({
              error: error instanceof Error ? error.message : "生成失败",
              progress: 100,
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
    console.error("[article-generator] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "生成失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
