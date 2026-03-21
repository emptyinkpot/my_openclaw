/**
 * ============================================================================
 * 历史叙事精校 API（重构优化版）
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import {
  LLMClientManager,
  invokeLLM,
  invokeLLMWithProgressAndRetry,
  isLLMResponseAbnormal,
  QuoteProtector,
  TextProcessor,
  buildPrompt,
  verifyVocabularyUsage,
  verifyBannedWordsClean,
  selectModelByTextLength,
  needsSegmentedProcessing,
  splitTextIntoSegments,
  LONG_TEXT_THRESHOLD,
  VERY_LONG_TEXT_THRESHOLD,
} from "@/lib";
import { generateReplacements, analyzeDetailedChanges } from "@/lib/text-diff";
import type { HistoricalNarrativeRequest, DetectedContext } from "@/types";

// ============================================================================
// 报告生成器
// ============================================================================

const ReportGenerator = {
  generate(
    stepIds: string[],
    settings: HistoricalNarrativeRequest["settings"],
    detectedContext: DetectedContext
  ): Array<{ step: string; report: string }> {
    const reports: Array<{ step: string; report: string }> = [];
    const subOptions = settings?.subOptions || {
      enableChinesize: true,
      enableLLMSmart: true,
      memeSatire: false,
    };

    // 自动识别报告
    reports.push({
      step: "自动识别",
      report: `角色=${detectedContext.perspective || "未识别"}，年代=${detectedContext.era || "未识别"}，阵营=${detectedContext.faction || "未识别"}`,
    });

    // 步骤报告映射（精简版，只显示核心步骤）
    const stepReportMap: Record<string, (settings: any) => { step: string; report: string }> = {
      polish: (s) => ({
        step: "词汇润色",
        report: `词汇库 ${s.vocabulary?.length || 0} 条${subOptions.enableChinesize ? " + 中文化" : ""}`,
      }),
      bannedWords: (s) => ({
        step: "禁用词净化",
        report: `处理 ${s.bannedWords?.length || 0} 条`,
      }),
      memeFuse: (s) => ({
        step: "梗融合",
        report: `${subOptions.memeSatire ? "反讽优先" : "自然融合"}，${s.memes?.length || 0} 条`,
      }),
      sentencePatterns: (s) => ({
        step: "句式逻辑净化",
        report: `处理 ${s.sentencePatterns?.length || 0} 条`,
      }),
      classicalApply: () => ({
        step: "文言化应用",
        report: `${settings?.classicalRatio || 0}% 程度`,
      }),
    };

    // 只为启用的核心步骤生成报告
    stepIds.forEach((id) => {
      if (stepReportMap[id]) {
        reports.push(stepReportMap[id](settings));
      }
    });

    return reports;
  },
};

// ============================================================================
// 智能联想 - 优化版：添加超时和快速失败
// ============================================================================

/** 超时包装器 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`超时（${timeoutMs}ms）`)), timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.log(`[smart-associate] 快速失败，使用原始设置:`, error);
    return fallback;
  }
}

async function expandResourcesWithAssociation(
  settings: HistoricalNarrativeRequest["settings"],
  protectedText: string,
  requestUrl: string
): Promise<HistoricalNarrativeRequest["settings"]> {
  const enableSmartAssociate = settings.subOptions?.enableSmartAssociate;
  if (!enableSmartAssociate) return settings;

  // 智能联想超时时间：3秒（快速失败，不影响主流程）
  const ASSOCIATE_TIMEOUT = 3000;
  
  try {
    const associatePromise = async () => {
      const response = await fetch(new URL("/api/smart-associate", requestUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vocabulary: settings.vocabulary || [],
          bannedWords: settings.bannedWords || [],
          literature: settings.literatureResources || [],
          text: protectedText.slice(0, 1000),
        }),
      });

      const data = await response.json();
      if (!data.success || !data.result) return settings;

      const { vocabulary: assocVocab, bannedWords: assocBanned, literature: assocLit } = data.result;
      const expanded = { ...settings };

      // 合并词汇
      if (assocVocab?.length > 0) {
        const existing = new Set((settings.vocabulary || []).map((v: any) => (typeof v === "string" ? v : v.content)));
        const newItems = assocVocab
          .filter((v: string) => !existing.has(v))
          .map((v: string) => ({ id: `assoc-${Date.now()}-${Math.random()}`, content: v, type: "vocabulary", category: "智能联想" }));
        expanded.vocabulary = [...(settings.vocabulary || []), ...newItems];
        console.log(`[smart-associate] +${newItems.length} 条词汇`);
      }

      // 合并禁用词
      if (assocBanned?.length > 0) {
        const existing = new Set((settings.bannedWords || []).map((b: any) => b.content));
        const newItems = assocBanned
          .filter((b: string) => !existing.has(b))
          .map((b: string) => ({ content: b, reason: "智能联想", alternative: "" }));
        expanded.bannedWords = [...(settings.bannedWords || []), ...newItems];
        console.log(`[smart-associate] +${newItems.length} 条禁用词`);
      }

      // 合并文献
      if (assocLit?.length > 0) {
        const existing = new Set((settings.literatureResources || []).map((l: any) => l.title));
        const newItems = assocLit
          .filter((l: string) => {
            const title = l.match(/《(.+?)》/)?.[1] || l;
            return !existing.has(title);
          })
          .map((l: string) => ({
            id: `lit-assoc-${Date.now()}-${Math.random()}`,
            type: "book" as const,
            title: l.match(/《(.+?)》/)?.[1] || l,
            author: l.match(/\((.+?)\)$/)?.[1] || "",
            priority: 3,
            note: "智能联想",
          }));
        expanded.literatureResources = [...(settings.literatureResources || []), ...newItems];
        console.log(`[smart-associate] +${newItems.length} 条文献`);
      }

      return expanded;
    };
    
    return await withTimeout(associatePromise(), ASSOCIATE_TIMEOUT, settings);
  } catch (error) {
    console.error("[smart-associate] 失败:", error);
    return settings;
  }
}

// ============================================================================
// API 入口
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: HistoricalNarrativeRequest = await request.json();
    const { text, settings } = body;

    if (!text) {
      return NextResponse.json({ error: "请提供有效的文本内容" }, { status: 400 });
    }

    // 初始化
    const stepOrder = settings?.stepOrder || [];
    const steps = settings?.steps || {};
    const enabledSteps = stepOrder.filter((id) => steps[id]?.enabled);
    const llmClient = LLMClientManager.createFromRequest(request);
    const encoder = new TextEncoder();

    const stepMessages: Record<string, string> = {
      // 前置配置阶段
      properNounCheck: "专有名词检查中...",
      narrativePerspective: "叙事视角调整中...",
      classicalApply: "文言化处理中...",
      citationApply: "引用处理中...",
      particleApply: "虚词限制中...",
      punctuationApply: "标点规范中...",
      quoteProtect: "引用保护中...",
      // 核心处理阶段
      polish: "词汇润色中...",
      bannedWords: "反感词净化中...",
      sentencePatterns: "句式逻辑净化中...",
      memeFuse: "梗融合中...",
      styleForge: "风格熔铸中...",
      // 后处理阶段
      markdownClean: "格式净化中...",
      titleExtract: "标题提取中...",
      // 审稿验证阶段
      semanticCheck: "语义检查中...",
      finalReview: "综合审稿中...",
      wordUsageCheck: "用词审查中...",
      smartFix: "智能微调中...",
      breathSegment: "呼吸感分段中...",
    };

    // ========================================================================
    // 进度管理器 - 线性进度分配
    // ========================================================================
    
    // 进度阶段定义（基于预估处理时间权重）
    const PROGRESS_PHASES = {
      init: { start: 0, end: 5, weight: 1 },           // 初始化
      protect: { start: 5, end: 8, weight: 1 },        // 保护引用
      associate: { start: 8, end: 12, weight: 2 },     // 智能联想
      buildPrompt: { start: 12, end: 15, weight: 1 },  // 构建Prompt
      llmProcess: { start: 15, end: 70, weight: 50 },  // LLM处理（主要时间）
      parse: { start: 70, end: 75, weight: 2 },        // 解析结果
      restore: { start: 75, end: 78, weight: 1 },      // 恢复引用
      verify: { start: 78, end: 88, weight: 5 },       // 验证（词汇+禁用词）
      postProcess: { start: 88, end: 95, weight: 3 },  // 后处理
      report: { start: 95, end: 100, weight: 2 },      // 生成报告
    };

    return new Response(
      new ReadableStream({
        async start(controller) {
          const startTime = Date.now();
          const send = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          
          // 当前进度
          let currentProgress = 0;
          
          // 平滑更新进度的函数
          const sendProgress = (phase: keyof typeof PROGRESS_PHASES, message: string) => {
            const phaseConfig = PROGRESS_PHASES[phase];
            // 平滑过渡到目标进度范围的中间值
            currentProgress = Math.max(currentProgress, phaseConfig.start);
            send({ progress: Math.round(currentProgress), message });
          };

          try {
            // ================================================================
            // 阶段1：初始化（0-5%）
            // ================================================================
            sendProgress('init', "准备处理...");
            currentProgress = 3;
            send({ progress: 3, message: "初始化处理环境..." });

            // ================================================================
            // 阶段2：保护引用（5-8%）- 根据开关决定是否执行
            // ================================================================
            currentProgress = 5;
            const isQuoteProtectEnabled = enabledSteps.includes("quoteProtect");
            let protectedText: string;
            let quoteMap: Map<string, string>;
            
            if (isQuoteProtectEnabled) {
              send({ progress: 5, message: "保护引用内容..." });
              const protectResult = QuoteProtector.protect(text);
              protectedText = protectResult.text;
              quoteMap = protectResult.map;
              currentProgress = 8;
              send({ progress: 8, message: `引用保护完成（${quoteMap.size} 处）` });
            } else {
              // 未启用引用保护，直接使用原文
              protectedText = text;
              quoteMap = new Map();
              currentProgress = 8;
              send({ progress: 8, message: "跳过引用保护" });
            }

            // ================================================================
            // 阶段2.5：专有名词检查（8-12%）- 在引用保护之后进行
            // ================================================================
            const PROPER_NOUNS = {
              // 日本年号
              eras: ['昭和', '明治', '大正', '平成', '令和', '庆应', '元治', '文久', '安政', '嘉永'],
              // 中国朝代
              dynasties: ['唐朝', '宋代', '宋朝', '明代', '明朝', '清代', '清朝', '汉代', '汉朝', '唐代', '元代', '元朝', '晋代', '晋朝', '隋朝', '秦朝', '战国', '春秋'],
              // 国家/地区（近代称呼）
              countries: ['法兰西', '英吉利', '德意志', '美利坚', '俄罗斯', '意大利', '奥地利', '普鲁士', '日本国', '大日本', '中华民国', '满洲国'],
              // 特定地名（日本）
              japanPlaces: ['东京', '京都', '大阪', '横滨', '名古屋', '神户', '广岛', '长崎', '冲绳', '北海道', '九州', '四国', '本州', '关东', '关西', '东北', '北陆', '中国地区', '山手线', '新干线'],
              // 中国古地名
              chinaPlaces: ['长安', '洛阳', '开封', '临安', '建康', '汴京', '燕京', '大都', '盛京', '金陵'],
              // 特定历史人物称谓
              titles: ['天皇', '幕府', '将军', '大名', '武士', '忍者', '大名', '藩主', '藩国'],
              // 现代技术/概念
              modern: ['因特网', '互联网', '手机', '电脑', '电视', '冰箱', '空调', '汽车', '飞机', '高铁', '地铁', '核武器', '原子弹', '卫星', '航天', '登月'],
            };
            
            // 检测文本中的专有名词
            const detectProperNouns = (text: string): string[] => {
              const found: string[] = [];
              const allNouns = Object.values(PROPER_NOUNS).flat();
              allNouns.forEach(noun => {
                if (text.includes(noun) && !found.includes(noun)) {
                  found.push(noun);
                }
              });
              return found;
            };
            
            let textForProcessing = protectedText;
            let properNounReplacements: Array<{ original: string; replaced: string; reason: string }> = [];
            
            if (enabledSteps.includes("properNounCheck")) {
              send({ progress: 9, message: "检查专有名词..." });
              const foundNouns = detectProperNouns(protectedText);
              
              if (foundNouns.length > 0) {
                send({ progress: 10, message: `发现 ${foundNouns.length} 个专有名词，正在替换...` });
                
                try {
                  // 根据文本长度选择处理方式
                  let replacedText: string;
                  
                  // 安全的替换规则 Prompt
                  const buildNounPrompt = (text: string) => `你是一位文学编辑，请将文本中的特定名称改为通用表达。

【需要改写的名称】
${foundNouns.join('、')}

【原文】
${text}

【改写要求】
1. 将年号改为"那年"、"当年"等时间词
2. 将朝代名改为"前朝"、"古时"等
3. 将国名改为"邻国"、"异国"等
4. 将地名改为"京城"、"都城"等
5. 将现代物品改为通用称呼
6. 保持文意不变，语句通顺
7. 直接输出改写后的文本

【改写后的文本】`;

                  if (protectedText.length > 3000) {
                    // 长文本：分段替换专有名词
                    const textSegments = splitTextIntoSegments(protectedText, 3000);
                    const replacedSegments: string[] = [];
                    
                    for (let i = 0; i < textSegments.length; i++) {
                      const seg = textSegments[i];
                      const segNum = i + 1;
                      send({ progress: 10 + (i / textSegments.length) * 2, message: `专有名词替换 ${segNum}/${textSegments.length}...` });
                      
                      const segResult = await invokeLLM(
                        llmClient,
                        [{ role: "user", content: buildNounPrompt(seg) }],
                        { model: settings.aiModel, temperature: 0.2 }
                      );
                      replacedSegments.push(segResult || seg);
                    }
                    replacedText = replacedSegments.join('\n\n');
                  } else {
                    // 短文本：直接处理
                    replacedText = await invokeLLM(
                      llmClient,
                      [{ role: "user", content: buildNounPrompt(protectedText) }],
                      { model: settings.aiModel, temperature: 0.2 }
                    );
                  }
                  
                  if (replacedText && replacedText.length > 0) {
                    // 分析替换了哪些词
                    foundNouns.forEach(noun => {
                      if (!replacedText.includes(noun)) {
                        properNounReplacements.push({
                          original: noun,
                          replaced: '已替换',
                          reason: '专有名词净化'
                        });
                      }
                    });
                    
                    textForProcessing = replacedText;
                    send({ progress: 12, message: `专有名词替换完成（${properNounReplacements.length} 处）` });
                  }
                } catch (nounError) {
                  console.warn('[historical-narrative] 专有名词替换失败:', nounError);
                  // 替换失败时继续使用原文
                  send({ progress: 12, message: "专有名词替换跳过（安全过滤）" });
                }
              } else {
                send({ progress: 12, message: "未发现专有名词" });
              }
            } else {
              send({ progress: 12, message: "跳过专有名词检查" });
            }

            // ================================================================
            // 阶段3：智能联想（12-16%）
            // ================================================================
            sendProgress('associate', "智能联想扩展资源...");
            const expandedSettings = await expandResourcesWithAssociation(settings, textForProcessing, request.url);
            currentProgress = 16;
            send({ progress: 16, message: "资源扩展完成" });

            // ================================================================
            // 阶段4：构建Prompt（12-15%）
            // ================================================================
            sendProgress('buildPrompt', "构建处理指令...");
            
            // 调试日志：验证传递的资源
            console.log('[historical-narrative] 资源验证:', {
              vocabularyCount: expandedSettings.vocabulary?.length || 0,
              bannedWordsCount: expandedSettings.bannedWords?.length || 0,
              replacementStyle: (expandedSettings as any).replacementStyle,
              vocabularySample: (expandedSettings.vocabulary || []).slice(0, 5).map((v: any) => v.content || v),
              bannedWordsSample: (expandedSettings.bannedWords || []).slice(0, 5).map((b: any) => b.content),
              enabledSteps,
              stepsConfig: expandedSettings.steps,
            });
            
            const { system, user } = buildPrompt(textForProcessing, expandedSettings as any, enabledSteps);
            
            // 调试日志：验证 Prompt 中是否包含专有名词保护
            console.log('[historical-narrative] Prompt 验证:', {
              systemLength: system.length,
              hasProperNounProtection: system.includes('必须保护的专有名词'),
              hasTechCompany: system.includes('科技公司'),
              hasVocabularySection: system.includes('【词汇润色'),
              hasBannedWordsSection: system.includes('【反感词净化') || system.includes('【禁用词净化'),
              properNounSnippet: system.match(/⛔ 【必须保护的专有名词[\s\S]{0,200}/)?.[0] || '未找到',
            });
            currentProgress = 15;
            send({ progress: 15, message: "指令构建完成" });

            // ================================================================
            // 阶段5：LLM处理（15-70%）- 主要处理时间
            // ================================================================
            const processingMessage = enabledSteps.find((id) => id !== "detect" && stepMessages[id])
              ? stepMessages[enabledSteps.find((id) => id !== "detect")!]
              : "执行精校处理...";
            
            // 根据文本长度选择合适的模型
            const selectedModel = selectModelByTextLength(text.length, settings.aiModel);
            console.log('[historical-narrative] 模型选择:', { 
              textLength: text.length, 
              selectedModel, 
              quoteCount: quoteMap.size,
              needsSegmented: needsSegmentedProcessing(text.length),
            });

            let result: string;
            
            // 检查是否需要分段处理
            if (needsSegmentedProcessing(text.length)) {
              // 分段处理模式
              send({ progress: 15, message: `文本较长(${text.length}字)，启动分段处理...` });
              
              const segments = splitTextIntoSegments(textForProcessing);
              const totalSegments = segments.length;
              const segmentResults: string[] = [];
              
              // 每段分配的进度范围：15-65（预留5%给最终合并）
              const progressPerSegment = 50 / totalSegments;
              
              for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const segmentNum = i + 1;
                // 更新当前进度
                currentProgress = 15 + i * progressPerSegment;
                send({ 
                  progress: Math.round(currentProgress), 
                  message: `处理第 ${segmentNum}/${totalSegments} 段 (${segment.length}字)...` 
                });
                
                // 为每段构建Prompt
                const { system: segSystem, user: segUser } = buildPrompt(segment, expandedSettings as any, enabledSteps);
                
                // 使用 try-catch 处理每段，失败时使用原文
                let segmentResult: string;
                try {
                  segmentResult = await invokeLLMWithProgressAndRetry(
                    llmClient,
                    [
                      { role: "system", content: segSystem },
                      { role: "user", content: segUser },
                    ],
                    {
                      model: selectedModel,
                      temperature: 0.3,
                      onProgress: (progress, message) => {
                        // 分段内的进度映射到总进度的相应范围
                        const baseProgress = 15 + i * progressPerSegment;
                        const adjustedProgress = Math.round(baseProgress + (progress / 100) * progressPerSegment * 0.8);
                        currentProgress = Math.max(currentProgress, adjustedProgress);
                        send({ progress: Math.round(currentProgress), message: `段${segmentNum}: ${message}` });
                      },
                      startProgress: 15,
                      endProgress: 70,
                      stageName: `第${segmentNum}段`,
                    }
                  );
                } catch (segError) {
                  // 某段处理失败时使用原文
                  console.warn(`[historical-narrative] 分段 ${segmentNum}/${totalSegments} 处理失败，使用原文:`, segError instanceof Error ? segError.message : String(segError));
                  send({ progress: Math.round(currentProgress + progressPerSegment * 0.8), message: `段${segmentNum} 处理受限，保留原文` });
                  segmentResult = segment;
                }
                
                segmentResults.push(segmentResult);
                console.log(`[historical-narrative] 分段 ${segmentNum}/${totalSegments} 完成, 输出长度: ${segmentResult.length}`);
              }
              
              // 合并所有段的结果
              currentProgress = 65;
              send({ progress: 65, message: "合并各段处理结果..." });
              result = segmentResults.join('\n\n');
              console.log(`[historical-narrative] 分段处理完成, 总输出长度: ${result.length}`);
              
            } else {
              // 单次处理模式 - 使用更平滑的进度回调
              result = await invokeLLMWithProgressAndRetry(
                llmClient,
                [
                  { role: "system", content: system },
                  { role: "user", content: user },
                ],
                {
                  model: selectedModel,
                  temperature: 0.3,
                  onProgress: (progress, message) => {
                    currentProgress = Math.max(currentProgress, progress);
                    send({ progress: Math.round(currentProgress), message });
                  },
                  startProgress: 15,
                  endProgress: 70,
                  stageName: processingMessage.replace('中...', ''),
                }
              );
            }
            
            // 调试日志：检查 LLM 返回结果
            console.log('[historical-narrative] LLM 返回:', {
              resultLength: result?.length || 0,
              resultPreview: result?.substring(0, 200),
              isEmpty: !result,
            });

            // ================================================================
            // 阶段6：解析结果（70-75%）
            // ================================================================
            currentProgress = 70;
            send({ progress: 70, message: "解析处理结果..." });
            const { detectedContext, text: processedText } = TextProcessor.parseDetectionResult(result);
            currentProgress = 75;
            send({ progress: 75, message: "结果解析完成" });

            // ================================================================
            // 阶段7：恢复引用（75-78%）- 根据开关决定是否执行
            // ================================================================
            let finalText: string;
            
            if (isQuoteProtectEnabled && quoteMap.size > 0) {
              send({ progress: 75, message: "恢复引用内容..." });
              finalText = QuoteProtector.restore(processedText, quoteMap);
              
              // 检查输出是否被截断
              const truncationCheck = QuoteProtector.checkOutputTruncation(finalText, quoteMap);
              if (truncationCheck.isTruncated) {
                console.warn('[historical-narrative] 警告：输出可能被截断', {
                  restoredCount: truncationCheck.restoredCount,
                  totalCount: truncationCheck.totalCount,
                  missing: truncationCheck.missingPlaceholders.slice(0, 5)
                });
                // 发送警告给前端
                send({ 
                  progress: 78, 
                  message: `⚠️ 输出可能不完整（${truncationCheck.restoredCount}/${truncationCheck.totalCount} 引用已恢复）` 
                });
              }
            } else {
              // 未启用引用保护，直接使用处理后的文本
              finalText = processedText;
            }
            currentProgress = 78;

            // ================================================================
            // 阶段8：词汇验证（78-83%）
            // ================================================================
            if (enabledSteps.includes("polish") && (expandedSettings.vocabulary?.length || 0) > 0) {
              const vocabResult = await verifyVocabularyUsage(
                finalText,
                expandedSettings.vocabulary || [],
                llmClient,
                settings.aiModel,
                (progress, message) => {
                  // 将词汇验证进度映射到78-83范围
                  const mappedProgress = 78 + (progress / 100) * 5;
                  currentProgress = Math.max(currentProgress, mappedProgress);
                  send({ progress: Math.round(currentProgress), message });
                }
              );
              finalText = vocabResult.text;
            }
            currentProgress = 83;

            // ================================================================
            // 阶段9：禁用词检查（83-88%）
            // ================================================================
            if (enabledSteps.includes("bannedWords") && (expandedSettings.bannedWords?.length || 0) > 0) {
              const bannedResult = await verifyBannedWordsClean(
                finalText,
                expandedSettings.bannedWords || [],
                llmClient,
                settings.aiModel,
                (progress, message) => {
                  // 将禁用词验证进度映射到83-88范围
                  const mappedProgress = 83 + (progress / 100) * 5;
                  currentProgress = Math.max(currentProgress, mappedProgress);
                  send({ progress: Math.round(currentProgress), message });
                }
              );
              finalText = bannedResult.text;
            }
            currentProgress = 88;

            // ================================================================
            // 阶段10：后处理（88-95%）
            // ================================================================
            send({ progress: 88, message: "后处理优化..." });
            finalText = TextProcessor.postProcess(finalText, {
              enableBreathing: enabledSteps.includes("step7"),
              punctuation: {
                banColon: settings.punctuation?.banColon ?? true,
                banParentheses: settings.punctuation?.banParentheses ?? true,
                banDash: settings.punctuation?.banDash ?? true,
                useJapaneseQuotes: settings.punctuation?.useJapaneseQuotes ?? false,
                useJapaneseBookMarks: settings.punctuation?.useJapaneseBookMarks ?? false,
                banMarkdown: settings.punctuation?.banMarkdown ?? false,
              },
            });
            currentProgress = 92;
            send({ progress: 92, message: "后处理完成" });

            // ================================================================
            // 阶段11：生成报告（92-95%）
            // ================================================================
            send({ progress: 92, message: "生成报告..." });
            const reports = ReportGenerator.generate(enabledSteps, expandedSettings, detectedContext);
            currentProgress = 95;

            // ================================================================
            // 阶段12：生成替换记录（95-98%）
            // ================================================================
            send({ progress: 95, message: "分析修改记录..." });
            
            // 获取原始文本（如果启用了引用保护，需要恢复）
            const originalText = isQuoteProtectEnabled && quoteMap.size > 0 
              ? QuoteProtector.restore(protectedText, quoteMap) 
              : protectedText;
            
            // 分析详细变更
            const detailedChanges = analyzeDetailedChanges(
              originalText,
              finalText,
              (expandedSettings.vocabulary || []).map((v: any) => typeof v === 'string' ? v : v.content),
              (expandedSettings.bannedWords || []).map((b: any) => b.content)
            );
            
            // 使用新的步骤记录
            const stepRecords = detailedChanges.stepRecords;
            
            // 合并所有替换记录
            const allReplacements = [
              ...properNounReplacements,
              ...detailedChanges.vocabularyReplacements,
              ...detailedChanges.bannedWordReplacements,
              ...detailedChanges.otherChanges
            ];
            
            console.log('[historical-narrative] 替换统计:', {
              properNouns: properNounReplacements.length,
              vocabulary: detailedChanges.vocabularyReplacements.length,
              bannedWords: detailedChanges.bannedWordReplacements.length,
              other: detailedChanges.otherChanges.length,
              total: allReplacements.length,
              stepRecords: stepRecords.length
            });

            // 仅在启用引用保护时检查未恢复的占位符
            if (isQuoteProtectEnabled && quoteMap.size > 0) {
              const unrestored = QuoteProtector.findUnrestoredPlaceholders(finalText, quoteMap);
              if (unrestored.length > 0) {
                console.warn('[historical-narrative] 警告：发现未恢复的占位符:', unrestored);
                // 尝试再次恢复
                finalText = QuoteProtector.restore(finalText, quoteMap);
              }
              
              // 恢复原文中已有的占位符格式
              finalText = QuoteProtector.restoreOriginalPlaceholders(finalText);
              
              // 最终检查：移除任何残留的占位符格式（这是兜底，不应该发生）
              const finalCheck = finalText.match(/【Q\d+】/g);
              if (finalCheck) {
                console.error('[historical-narrative] 错误：仍有残留占位符:', finalCheck);
                // 尝试从map中查找并恢复
                finalCheck.forEach(p => {
                  if (quoteMap.has(p)) {
                    finalText = finalText.replace(p, quoteMap.get(p)!);
                  }
                });
              }
            }

            // ================================================================
            // 阶段11：标题提取（可选，默认关闭）
            // ================================================================
            let outputTitle = "";
            let outputText = finalText;
            
            if (enabledSteps.includes("titleExtract")) {
              send({ progress: 95, message: "提取标题..." });
              
              // 标题提取函数：优先使用正则匹配，更准确高效
              const extractTitle = (text: string): { title: string; content: string } => {
                // 阿拉伯数字转中文数字
                const numberToChinese = (num: number): string => {
                  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
                  const units = ['', '十', '百', '千', '万'];
                  
                  if (num === 0) return '零';
                  if (num <= 10) return digits[num];
                  if (num < 20) return '十' + (num === 10 ? '' : digits[num - 10]);
                  if (num < 100) {
                    const tens = Math.floor(num / 10);
                    const ones = num % 10;
                    return digits[tens] + '十' + (ones > 0 ? digits[ones] : '');
                  }
                  if (num < 1000) {
                    const hundreds = Math.floor(num / 100);
                    const remainder = num % 100;
                    let result = digits[hundreds] + '百';
                    if (remainder > 0) {
                      if (remainder < 10) {
                        result += '零' + digits[remainder];
                      } else if (remainder < 20) {
                        result += '一十' + (remainder === 10 ? '' : digits[remainder - 10]);
                      } else {
                        const tens = Math.floor(remainder / 10);
                        const ones = remainder % 10;
                        result += digits[tens] + '十' + (ones > 0 ? digits[ones] : '');
                      }
                    }
                    return result;
                  }
                  if (num < 10000) {
                    const thousands = Math.floor(num / 1000);
                    const remainder = num % 1000;
                    let result = digits[thousands] + '千';
                    if (remainder > 0) {
                      const hundreds = Math.floor(remainder / 100);
                      if (hundreds > 0) {
                        result += digits[hundreds] + '百';
                      } else {
                        result += '零';
                      }
                      const tensRemainder = remainder % 100;
                      if (tensRemainder > 0) {
                        if (tensRemainder < 10) {
                          result += digits[tensRemainder];
                        } else {
                          const tens = Math.floor(tensRemainder / 10);
                          const ones = tensRemainder % 10;
                          result += digits[tens] + '十' + (ones > 0 ? digits[ones] : '');
                        }
                      }
                    }
                    return result;
                  }
                  // 万以上
                  const wan = Math.floor(num / 10000);
                  const remainder = num % 10000;
                  let result = numberToChinese(wan) + '万';
                  if (remainder > 0) {
                    if (remainder < 1000) result += '零';
                    result += numberToChinese(remainder);
                  }
                  return result;
                };
                
                // 将标题中的阿拉伯数字转换为中文数字
                const convertTitleNumbers = (title: string): string => {
                  return title.replace(/第(\d+)([章节回卷部])/g, (match, numStr, suffix) => {
                    const num = parseInt(numStr, 10);
                    if (isNaN(num)) return match;
                    return '第' + numberToChinese(num) + suffix;
                  });
                };
                
                const lines = text.split('\n');
                let titleLines: string[] = [];
                let contentStartIndex = 0;
                
                // 常见标题格式正则
                const titlePatterns = [
                  // Markdown 标题 + 章节格式：### 第六十六章 或 ### 第六十六章：xxx（仅中文数字）
                  /^#+\s*第[零一二三四五六七八九十百千万]+[章节回卷部][：:·\s]?.*$/,
                  // 章节格式：第六十六章 或 第六十六章：xxx（仅中文数字）
                  /^第[零一二三四五六七八九十百千万]+[章节回卷部][：:·\s]?.*$/,
                  // 带书名号：《xxx》
                  /^《[^》]+》$/,
                  // 英文章节：Chapter 1
                  /^Chapter\s*\d+.*$/i,
                ];
                
                // 跳过开头的空行
                let firstContentLine = 0;
                while (firstContentLine < lines.length && lines[firstContentLine].trim() === '') {
                  firstContentLine++;
                }
                
                // 从第一个非空行开始检查
                for (let i = firstContentLine; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (line === '') {
                    // 空行可能是标题和正文的分隔，检查下一行
                    if (i + 1 < lines.length) {
                      const nextLine = lines[i + 1].trim();
                      // 如果下一行不是标题格式，说明标题结束
                      const isNextTitle = titlePatterns.some(p => p.test(nextLine));
                      if (!isNextTitle && titleLines.length > 0) {
                        contentStartIndex = i + 1;
                        break;
                      }
                    }
                    continue;
                  }
                  
                  // 检查是否匹配标题格式
                  const isTitle = titlePatterns.some(p => p.test(line));
                  
                  if (isTitle) {
                    // 去掉 Markdown 标记（### 等）
                    const cleanLine = line.replace(/^#+\s*/, '');
                    titleLines.push(cleanLine);
                    contentStartIndex = i + 1;
                  } else if (titleLines.length > 0) {
                    // 已经有标题了，遇到非标题行，说明标题结束
                    contentStartIndex = i;
                    break;
                  } else {
                    // 第一行就不是标题格式，说明没有标题
                    break;
                  }
                }
                
                if (titleLines.length === 0) {
                  return { title: "", content: text };
                }
                
                // 合并标题行，去重（如 "第六十六章" 和 "第六十六章：xxx" 重复）
                let title = titleLines.join('\n').trim();
                
                // 如果有两行标题，且第二行包含第一行，只保留第二行
                if (titleLines.length >= 2) {
                  const first = titleLines[0];
                  const second = titleLines[1];
                  if (second.includes(first)) {
                    title = second;
                  }
                }
                
                // 将标题中的阿拉伯数字转换为中文数字
                title = convertTitleNumbers(title);
                
                // 提取正文
                const content = lines.slice(contentStartIndex).join('\n').trim();
                
                return { title, content };
              };
              
              try {
                const result = extractTitle(finalText);
                outputTitle = result.title;
                outputText = result.content || finalText;
                
                if (outputTitle) {
                  send({ progress: 98, message: `标题：${outputTitle.slice(0, 30)}${outputTitle.length > 30 ? '...' : ''}` });
                } else {
                  send({ progress: 98, message: "未识别到章节标题" });
                }
              } catch (titleError) {
                console.warn('[historical-narrative] 标题提取失败:', titleError);
                outputTitle = "";
                outputText = finalText;
              }
            }

            // 完成
            send({
              progress: 100,
              text: outputText,
              title: outputTitle,
              reports,
              analysis: {
                replacements: allReplacements,
                stepRecords: stepRecords,
                summary: detailedChanges.summary,
              },
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "请求错误" },
      { status: 500 }
    );
  }
}
