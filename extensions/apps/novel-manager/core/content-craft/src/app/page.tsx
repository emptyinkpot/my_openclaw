/**
 * ============================================================================
 * 智能文本润色工具 - 主页面
 * ============================================================================
 * 
 * 功能模块：
 * 1. 文章润色 - 主功能，支持词汇替换、梗融合、中文化转换
 * 2. 资源库 - 管理词汇资源和梗资源，支持导入导出
 * 
 * 布局说明：
 * - 三栏布局：输入文本 | 处理配置 | 输出结果
 * - 响应式设计：移动端纵向排列，桌面端三栏并排
 * - 所有区块支持折叠/展开，节省屏幕空间
 */

"use client";

import { useState, useCallback, useEffect, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinearProgress } from "@/components/ui/linear-progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, RefreshCw, Copy, Check, 
  Wand2, Loader2, ScrollText, Database, ArrowRightLeft,
  Info, Sparkles, BookOpen, MessageSquare, ChevronDown, ChevronUp,
  Download, Upload, Package, AlertTriangle, Zap, PenTool
} from "lucide-react";

import { ResourceManager } from "@/components/article-polisher/resource-manager";
import { MainLibraryManager } from "@/components/article-polisher/main-library-manager";
import { LiteratureManager } from "@/components/article-polisher/literature-manager";
import { BannedWordsManager } from "@/components/article-polisher/banned-words-manager";
import { SentencePatternsManager } from "@/components/article-polisher/sentence-patterns-manager";
import { PolishConfig } from "@/components/article-polisher/polish-config";
import { PresetResources } from "@/components/article-polisher/preset-resources";
import { AIDetectorPanel } from "@/components/article-polisher/ai-detector-panel";
import { RealtimeAIDetector } from "@/components/article-polisher/realtime-ai-detector";
import { DetectionHistoryPanel } from "@/components/article-polisher/detection-history-panel";
import { ModelTrainingPanel } from "@/components/article-polisher/model-training-panel";
import { useStreamRequest, useWordCount } from "@/hooks";
import type { Analysis, HistoricalNarrativeSettings, ResourceItem, LiteratureResource, FullExportData, BannedWordItem, SentencePatternItem } from "@/types";
import { EXPORT_VERSION } from "@/types";
import { 
  DEFAULT_STEP_ORDER, 
  createDefaultSteps, 
  DEFAULT_PARTICLE_SETTINGS, 
  migrateLegacySteps,
  migrateLegacyStepOrder,
} from "@/constants";
import { TemplateStorage } from "@/components/article-generator/template-storage";
import { UnifiedGenerator } from "@/components/article-generator/unified-generator";

// ============================================================================
// 进度组件 - 使用线性进度条
// ============================================================================

const ProgressSection = memo(function ProgressSection({ 
  progress, 
  message 
}: { 
  progress: number; 
  message: string;
}) {
  return (
    <LinearProgress 
      progress={progress} 
      message={message}
      showTimeEstimate={true}
      enableContinuousProgress={true}
    />
  );
});

// ============================================================================
// 帮助提示组件
// ============================================================================

const HelpCard = memo(function HelpCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: typeof Info; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900">
      <Icon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs font-medium text-blue-700 dark:text-blue-300">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>
      </div>
    </div>
  );
});

// ============================================================================
// 替换记录组件 - 支持展开/收起
// ============================================================================

interface ReplacementRecordsProps {
  analysis: Analysis;
}



const ReplacementRecords = memo(function ReplacementRecords({ analysis }: ReplacementRecordsProps) {
  
  // 按原因分类
  const categorizeReplacements = () => {
    const categories: Record<string, { items: typeof analysis.replacements; color: string; bgColor: string; borderColor: string; label: string }> = {};
    
    analysis.replacements?.forEach(r => {
      const reason = r.reason || '其他修改';
      if (!categories[reason]) {
        // 根据原因设置颜色
        if (reason.includes('专有名词')) {
          categories[reason] = { 
            items: [], 
            color: 'text-cyan-600 dark:text-cyan-400',
            bgColor: 'bg-cyan-50/50 dark:bg-cyan-950/20',
            borderColor: 'border-cyan-100 dark:border-cyan-900',
            label: '专有名词净化'
          };
        } else if (reason.includes('词汇库') || reason.includes('词汇替换')) {
          categories[reason] = { 
            items: [], 
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
            borderColor: 'border-blue-100 dark:border-blue-900',
            label: '词汇库替换'
          };
        } else if (reason.includes('禁用') || reason.includes('反感')) {
          categories[reason] = { 
            items: [], 
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50/50 dark:bg-red-950/20',
            borderColor: 'border-red-100 dark:border-red-900',
            label: '禁用词替换'
          };
        } else if (reason.includes('句式') || reason.includes('逻辑')) {
          categories[reason] = { 
            items: [], 
            color: 'text-rose-600 dark:text-rose-400',
            bgColor: 'bg-rose-50/50 dark:bg-rose-950/20',
            borderColor: 'border-rose-100 dark:border-rose-900',
            label: '句式逻辑净化'
          };
        } else if (reason.includes('风格')) {
          categories[reason] = { 
            items: [], 
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-50/50 dark:bg-violet-950/20',
            borderColor: 'border-violet-100 dark:border-violet-900',
            label: '风格熔铸'
          };
        } else {
          categories[reason] = { 
            items: [], 
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
            borderColor: 'border-purple-100 dark:border-purple-900',
            label: '其他润色'
          };
        }
      }
      categories[reason].items.push(r);
    });
    
    return categories;
  };
  
  const categories = categorizeReplacements();
  
  const totalChanges = analysis.replacements?.length || 0;
  
  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium">替换记录</span>
          <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {totalChanges} 处
          </Badge>
        </div>
        {analysis.summary && (
          <span className="text-xs text-muted-foreground max-w-[200px] truncate">
            {analysis.summary.split('\n')[0]}
          </span>
        )}
      </div>
      
      {/* 分类列表 */}
      <div className="space-y-2">
        {Object.entries(categories).map(([reason, category]) => {
          return (
            <div key={reason} className={`p-3 rounded-lg ${category.bgColor} border ${category.borderColor}`}>
              {/* 分类标题 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${category.color}`}>
                    {category.label}
                  </Badge>
                  <span className={`text-xs ${category.color}`}>
                    {category.items.length} 处
                  </span>
                </div>
              </div>
              
              {/* 替换项列表 */}
              <div className="mt-2 space-y-1">
                {category.items.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                    <span className="text-slate-500 line-through flex-shrink-0 max-w-[100px] truncate" title={r.original}>
                      {r.original}
                    </span>
                    <span className={`${category.color.replace('text-', 'text-').replace('-600', '-400')} flex-shrink-0`}>
                      →
                    </span>
                    <span className={`${category.color} truncate`} title={r.replaced}>
                      {r.replaced}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// 可折叠面板组件 - 用于输入/输出区域
// ============================================================================

interface CollapsiblePanelProps {
  title: string;
  description: string;
  icon: typeof FileText;
  iconBgColor: string;
  iconColor: string;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "outline";
  extraActions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsiblePanel = memo(function CollapsiblePanel({
  title,
  description,
  icon: Icon,
  iconBgColor,
  iconColor,
  badge,
  badgeVariant = "secondary",
  extraActions,
  defaultOpen = true,
  children,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* 面板头部 - 可点击折叠 */}
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 rounded-t-xl bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-800 dark:hover:to-slate-700 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconBgColor}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{title}</span>
                {badge !== undefined && (
                  <Badge variant={badgeVariant} className="font-mono text-xs">
                    {typeof badge === 'number' ? badge.toLocaleString() + ' 字' : badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {extraActions && <div onClick={(e) => e.stopPropagation()}>{extraActions}</div>}
            <div className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      
      {/* 面板内容 */}
      <CollapsibleContent>
        <div className="p-4 border-x border-b rounded-b-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

// ============================================================================
// 主页面
// ============================================================================

export default function Home() {
  // ==================== 状态管理 ====================
  
  // 文本状态
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [outputTitle, setOutputTitle] = useState("");
  
  // 资源状态
  const [vocabularyItems, setVocabularyItems] = useState<ResourceItem[]>([]);
  const [literatureItems, setLiteratureItems] = useState<LiteratureResource[]>([]);
  const [bannedWordsItems, setBannedWordsItems] = useState<BannedWordItem[]>([]);
  const [sentencePatternsItems, setSentencePatternsItems] = useState<SentencePatternItem[]>([]);
  
  // 资源加载状态
  const [resourcesLoaded, setResourcesLoaded] = useState({
    vocabulary: false,
    bannedWords: false,
    literature: false,
    sentencePatterns: false,
  });
  
  // 分析结果
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  // 增强处理状态
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceReplacements, setEnhanceReplacements] = useState<Array<{
    original: string;
    replaced: string;
    reason: string;
    type: string;
  }>>([]);
  const [enhanceStats, setEnhanceStats] = useState<{
    synonym: number;
    antiAI: number;
    academic: number;
    lowQuality: number;
    classical: number;
    total: number;
  } | null>(null);
  
  // 复制状态
  const [copied, setCopied] = useState(false);

  // 配置状态 - 默认配置
  const [settings, setSettings] = useState<HistoricalNarrativeSettings>({
    narrativePerspective: "limited-omniscient",
    classicalRatio: 20,
    perspective: "",
    era: "",
    faction: "",
    aiModel: "doubao-seed-2-0-lite-260215",
    stepOrder: DEFAULT_STEP_ORDER,
    steps: createDefaultSteps(),
    subOptions: { enableChinesize: true, enableLLMSmart: true, memeSatire: false },
    emotionalTone: "理性的悲怆",
    punctuation: { banColon: true, banParentheses: true, banDash: true, useJapaneseQuotes: true, useJapaneseBookMarks: true, banMarkdown: true },
    particleSettings: DEFAULT_PARTICLE_SETTINGS,
  });

  // 文件输入ref（一键导入）
  const importFileRef = useRef<HTMLInputElement>(null);
  
  // 所有资源是否加载完成
  const allResourcesLoaded = Object.values(resourcesLoaded).every(Boolean);

  // ==================== 预加载资源数据 ====================
  // 页面加载时立即加载所有资源，不依赖标签页切换
  
  useEffect(() => {
    // 预加载词汇库
    fetch('/api/main-library')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items) {
          setVocabularyItems(data.items);
        }
      })
      .catch(err => console.error('Failed to load vocabulary:', err))
      .finally(() => setResourcesLoaded(prev => ({ ...prev, vocabulary: true })));
    
    // 预加载禁用词
    fetch('/api/banned-words')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items) {
          setBannedWordsItems(data.items);
        }
      })
      .catch(err => console.error('Failed to load banned words:', err))
      .finally(() => setResourcesLoaded(prev => ({ ...prev, bannedWords: true })));
    
    // 预加载文献资源
    fetch('/api/literature')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items) {
          setLiteratureItems(data.items);
        }
      })
      .catch(err => console.error('Failed to load literature:', err))
      .finally(() => setResourcesLoaded(prev => ({ ...prev, literature: true })));
    
    // 预加载句子逻辑禁用库
    fetch('/api/sentence-patterns')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items) {
          setSentencePatternsItems(data.items);
        }
      })
      .catch(err => console.error('Failed to load sentence patterns:', err))
      .finally(() => setResourcesLoaded(prev => ({ ...prev, sentencePatterns: true })));
  }, []);

  // ==================== 一键导出/导入 ====================

  /** 一键导出所有资源 */
  const handleExportAll = useCallback(() => {
    // 获取用户设置
    const userSettings = (() => {
      if (typeof window === 'undefined') return undefined;
      try {
        const saved = localStorage.getItem('polish-default-settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            classicalRatio: parsed.classicalRatio,
            narrativePerspective: parsed.narrativePerspective,
            aiModel: parsed.aiModel,
          };
        }
        return undefined;
      } catch {
        return undefined;
      }
    })();

    // 构建完整导出数据
    const exportData: FullExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      source: "智能文本润色工具",
      vocabulary: vocabularyItems,
      literature: literatureItems,
      bannedWords: bannedWordsItems,
      userSettings,
    };

    // 导出为JSON文件
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polish-resources-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [vocabularyItems, literatureItems, bannedWordsItems]);

  /** 一键导入资源 */
  const handleImportAll = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as FullExportData;

      // 验证版本兼容性
      if (!data.version) {
        throw new Error("无效的导出文件格式");
      }

      // 统计导入数量
      const stats = {
        vocabulary: 0,
        literature: 0,
        bannedWords: 0,
      };

      // 导入词汇资源
      if (data.vocabulary && Array.isArray(data.vocabulary)) {
        const newItems = data.vocabulary.map(item => ({
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: item.createdAt || Date.now(),
        }));
        setVocabularyItems(prev => [...newItems, ...prev]);
        stats.vocabulary = newItems.length;
      }

      // 导入文献资源
      if (data.literature && Array.isArray(data.literature)) {
        const newItems = data.literature.map(item => ({
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: item.createdAt || Date.now(),
        }));
        setLiteratureItems(prev => [...newItems, ...prev]);
        stats.literature = newItems.length;
      }

      // 导入禁用词资源
      if (data.bannedWords && Array.isArray(data.bannedWords)) {
        const newItems = data.bannedWords.map(item => ({
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: item.createdAt || Date.now(),
        }));
        setBannedWordsItems(prev => [...newItems, ...prev]);
        stats.bannedWords = newItems.length;
      }

      // 导入降重规则
      // 导入用户设置（可选）
      if (data.userSettings) {
        const currentSettings = localStorage.getItem('polish-default-settings');
        if (currentSettings) {
          const parsed = JSON.parse(currentSettings);
          localStorage.setItem('polish-default-settings', JSON.stringify({
            ...parsed,
            ...data.userSettings,
          }));
        }
      }

      // 显示导入结果
      const message = [
        stats.vocabulary > 0 && `词汇 ${stats.vocabulary} 条`,
        stats.literature > 0 && `文献 ${stats.literature} 条`,
        stats.bannedWords > 0 && `禁用词 ${stats.bannedWords} 条`,
      ].filter(Boolean).join('、');

      alert(`导入成功！已导入：${message || '无新数据'}`);
    } catch (error) {
      console.error("导入失败:", error);
      alert(`导入失败：${error instanceof Error ? error.message : '文件格式不正确'}`);
    }

    // 清空文件输入
    if (importFileRef.current) {
      importFileRef.current.value = "";
    }
  }, [literatureItems, bannedWordsItems]);

  // ==================== Hooks ====================
  
  const { isLoading, progress, statusMessage, error, execute, reset } = useStreamRequest({
    url: "/api/historical-narrative",
    onText: setOutputText,
    onTitle: setOutputTitle,
    onAnalysis: setAnalysis,
  });

  const inputCount = useWordCount(inputText);
  const outputCount = useWordCount(outputText);
  const outputTitleCount = useWordCount(outputTitle);

  // ==================== 增强处理 ====================

  /**
   * 检查是否启用了任何增强选项
   */
  const hasEnhanceOptions = useCallback(() => {
    const opts = settings.enhanceOptions;
    if (!opts) return false;
    return (
      opts.enableSynonym ||
      opts.enableAntiAI ||
      opts.enableAcademic ||
      opts.enableCleanLowQuality ||
      opts.enableClassical
    );
  }, [settings.enhanceOptions]);

  /**
   * 应用增强处理
   */
  const applyEnhancement = useCallback(async (text: string) => {
    if (!hasEnhanceOptions() || !text.trim()) return;

    setIsEnhancing(true);
    try {
      const response = await fetch('/api/enhance-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          options: {
            enableSynonym: settings.enhanceOptions?.enableSynonym ?? false,
            enableAntiAI: settings.enhanceOptions?.enableAntiAI ?? false,
            enableAcademic: settings.enhanceOptions?.enableAcademic ?? false,
            enableCleanLowQuality: settings.enhanceOptions?.enableCleanLowQuality ?? false,
            enableClassical: settings.enhanceOptions?.enableClassical ?? false,
            classicalLevel: settings.enhanceOptions?.classicalLevel ?? 'literary',
            intensity: settings.enhanceOptions?.intensity ?? 'medium',
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOutputText(result.text);
        setEnhanceReplacements(result.replacements);
        setEnhanceStats(result.stats);

        // 合并增强替换记录到分析结果
        if (result.replacements.length > 0 && analysis) {
          setAnalysis(prev => prev ? {
            ...prev,
            replacements: [...(prev.replacements || []), ...result.replacements.map((r: any) => ({
              original: r.original,
              replaced: r.replaced,
              reason: r.reason,
            }))],
          } : null);
        }
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setIsEnhancing(false);
    }
  }, [settings.enhanceOptions, hasEnhanceOptions, analysis]);

  /**
   * 润色完成后自动应用增强处理
   */
  useEffect(() => {
    // 只在润色完成且输出有内容时触发
    if (!isLoading && outputText && hasEnhanceOptions() && !isEnhancing && enhanceReplacements.length === 0) {
      applyEnhancement(outputText);
    }
  }, [isLoading, outputText]); // 故意只依赖这些值，避免循环

  /**
   * 清空增强状态
   */
  const clearEnhancement = useCallback(() => {
    setEnhanceReplacements([]);
    setEnhanceStats(null);
  }, []);

  // ==================== 操作处理 ====================

  /**
   * 开始润色处理
   * 将输入文本、设置、词汇资源、梗资源、降重规则、禁用词合并后发送到API
   */
  const handleProcess = useCallback(() => {
    if (!inputText.trim()) return;
    setOutputText("");
    setOutputTitle("");
    setAnalysis(null);
    clearEnhancement(); // 清除增强状态
    reset();
    
    // 从 localStorage 读取替换词风格
    const replacementStyle = typeof window !== 'undefined' 
      ? (localStorage.getItem('banned-word-replacement-style') as 'classical_chinese' | 'japanese_chinese' | 'character_morphology' | 'mixed' || 'classical_chinese')
      : 'classical_chinese';
    
    execute({
      text: inputText,
      settings: {
        ...settings,
        replacementStyle,
        // 传递完整的资源对象（包含分类信息），以便全量压缩传递
        vocabulary: vocabularyItems.map(i => ({ 
          id: i.id,
          content: i.content, 
          type: i.type,
          category: i.category,
          createdAt: i.createdAt
        })),
        bannedWords: bannedWordsItems.map(b => ({ 
          content: b.content, 
          alternative: b.alternative, 
          reason: b.reason,
          type: b.type,
          category: b.category
        })),
        sentencePatterns: sentencePatternsItems.map(s => ({
          id: s.id,
          content: s.content,
          replacements: s.replacements,
          reason: s.reason,
          similarPatterns: s.similarPatterns,
        })),
        literatureResources: literatureItems
      }
    });
  }, [inputText, settings, vocabularyItems, bannedWordsItems, sentencePatternsItems, execute, reset]);

  /**
   * 清空所有内容
   */
  const handleClear = useCallback(() => {
    setInputText("");
    setOutputText("");
    setOutputTitle("");
    setAnalysis(null);
    clearEnhancement(); // 清除增强状态
    reset();
  }, [reset, clearEnhancement]);

  /**
   * 复制输出结果到剪贴板
   */
  const handleCopy = useCallback(async () => {
    if (outputText) {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [outputText]);

  /**
   * 将输出结果替换到输入框（用于连续润色）
   */
  const handleSwap = useCallback(() => {
    if (outputText) {
      setInputText(outputText);
      setOutputText("");
      setOutputTitle("");
      setAnalysis(null);
    }
  }, [outputText]);

  /**
   * 导入预置资源
   */
  const handleImportPresetResources = useCallback(async (data: {
    vocabulary: Array<{ content: string; type: string; category: string; note?: string }>;
    bannedWords: Array<{ content: string; type: string; category: string; reason: string; alternative?: string }>;
  }) => {
    // 导入词汇库
    if (data.vocabulary.length > 0) {
      const newItems: ResourceItem[] = data.vocabulary.map(item => ({
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content: item.content,
        type: 'vocabulary',
        category: item.category,
        note: item.note,
        createdAt: Date.now(),
      }));
      setVocabularyItems(prev => [...newItems, ...prev]);
    }

    // 导入禁用词库
    if (data.bannedWords.length > 0) {
      const newItems: BannedWordItem[] = data.bannedWords.map(item => ({
        id: `preset-banned-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content: item.content,
        type: 'ai_style',
        category: item.category,
        reason: item.reason,
        alternative: item.alternative,
        createdAt: Date.now(),
      }));
      setBannedWordsItems(prev => [...newItems, ...prev]);
    }

    // 统计导入数量
    const total = data.vocabulary.length + data.bannedWords.length;
    if (total > 0) {
      // 触发保存到数据库
      try {
        if (data.vocabulary.length > 0) {
          await fetch('/api/main-library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'add', 
              items: data.vocabulary.map(item => ({
                id: `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                content: item.content,
                type: 'vocabulary',
                category: item.category,
                note: item.note,
                createdAt: Date.now(),
              }))
            }),
          });
        }
        if (data.bannedWords.length > 0) {
          await fetch('/api/banned-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'add', 
              items: data.bannedWords.map(item => ({
                id: `preset-banned-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                content: item.content,
                type: 'ai_style',
                category: item.category,
                reason: item.reason,
                alternative: item.alternative,
                createdAt: Date.now(),
              }))
            }),
          });
        }
      } catch (error) {
        console.error('Failed to save preset resources:', error);
      }
    }
  }, []);

  // ==================== 渲染 ====================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        
        {/* ==================== 页面头部 - 简化版 ==================== */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  智能文本润色
                </h1>
                <p className="text-xs text-muted-foreground">
                  词汇润色 · 禁用词净化 · 文言风格 · 云端资源库
                </p>
              </div>
            </div>
            
            {/* 快捷操作 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">导出</span>
              </Button>
              <label className="cursor-pointer">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  asChild
                >
                  <span>
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">导入</span>
                  </span>
                </Button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportAll}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </header>

        {/* ==================== 主标签页 ==================== */}
        <Tabs defaultValue="polish" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-[400px] h-10">
            <TabsTrigger value="polish" className="flex items-center gap-2 text-sm">
              <ScrollText className="w-4 h-4" />
              润色
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4" />
              资源库
              {(vocabularyItems.length + bannedWordsItems.length) > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
                  {(vocabularyItems.length + bannedWordsItems.length).toLocaleString()}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2 text-sm">
              <PenTool className="w-4 h-4" />
              生成
            </TabsTrigger>
          </TabsList>

          {/* ==================== 文章润色 Tab ==================== */}
          <TabsContent value="polish" className="space-y-4">
            
            {/* 进度指示器 */}
            {isLoading && <ProgressSection progress={progress} message={statusMessage} />}
            
            {/* 错误提示 */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ==================== 两栏布局 ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              
              {/* ========== 左侧：输入输出区域 ========== */}
              <div className="lg:col-span-3 space-y-4">
                {/* 输入区域 */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                  <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-sm">输入文本</span>
                        {inputCount > 0 && (
                          <Badge variant="secondary" className="text-xs">{inputCount} 字</Badge>
                        )}
                      </div>
                      {inputText && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleClear} 
                          disabled={isLoading} 
                          className="h-7 px-2 text-xs text-muted-foreground"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />清空
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Textarea
                      placeholder="粘贴需要润色的文本内容...&#10;&#10;支持长篇文章、学术论文、文学作品等。启用「引用保护」后，引号和书名号内的内容不会被修改。"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="min-h-[200px] max-h-[350px] resize-none text-sm leading-relaxed"
                      disabled={isLoading}
                    />
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Button 
                        onClick={handleProcess} 
                        disabled={!inputText.trim() || isLoading || !allResourcesLoaded} 
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white h-9"
                      >
                        {!allResourcesLoaded ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            加载中...
                          </>
                        ) : isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            处理中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            开始润色
                          </>
                        )}
                      </Button>
                      
                      {outputText && (
                        <Button 
                          variant="outline"
                          onClick={handleSwap} 
                          className="h-9"
                          title="继续润色"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* 输出区域 */}
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                  <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-sm">输出结果</span>
                        {outputCount > 0 && (
                          <Badge variant="secondary" className="text-xs">{outputCount} 字</Badge>
                        )}
                      </div>
                      {outputText && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCopy} 
                          className="h-7 px-2 text-xs"
                        >
                          {copied ? (
                            <><Check className="w-3 h-3 mr-1 text-green-500" />已复制</>
                          ) : (
                            <><Copy className="w-3 h-3 mr-1" />复制</>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* 标题输出框 - 当启用标题提取且有标题时显示 */}
                    {outputTitle && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">标题</span>
                          {outputTitleCount > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4">{outputTitleCount} 字</Badge>
                          )}
                        </div>
                        <div className="min-h-[60px] max-h-[120px] overflow-y-auto rounded-lg border border-blue-200 bg-blue-50/30 dark:bg-blue-950/20 p-3">
                          <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{outputTitle}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* 正文输出框 */}
                    {outputTitle && (
                      <div className="flex items-center gap-2 mb-2">
                        <ScrollText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-medium text-muted-foreground">正文</span>
                      </div>
                    )}
                    <div className={`min-h-[200px] max-h-[350px] overflow-y-auto rounded-lg border bg-slate-50/50 dark:bg-slate-800/30 p-3 ${outputTitle ? 'border-indigo-200' : ''}`}>
                      {outputText ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{outputText}</div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                          <ScrollText className="w-8 h-8 mb-2 opacity-30" />
                          <span className="text-sm">润色结果将显示在这里</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 修改记录 */}
                    {analysis && analysis.replacements && analysis.replacements.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <ReplacementRecords analysis={analysis} />
                      </div>
                    )}
                    
                    {/* 增强处理状态 */}
                    {isEnhancing && (
                      <div className="mt-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                          <span className="text-sm text-violet-700 dark:text-violet-300">
                            正在应用增强处理...
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* 增强处理结果 */}
                    {!isEnhancing && enhanceStats && enhanceStats.total > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-500" />
                            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                              增强处理完成
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs bg-violet-100 text-violet-700">
                            {enhanceStats.total} 处优化
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {enhanceStats.synonym > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              同义词 {enhanceStats.synonym}
                            </Badge>
                          )}
                          {enhanceStats.antiAI > 0 && (
                            <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                              AI对抗 {enhanceStats.antiAI}
                            </Badge>
                          )}
                          {enhanceStats.academic > 0 && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                              学术规范 {enhanceStats.academic}
                            </Badge>
                          )}
                          {enhanceStats.lowQuality > 0 && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              低质量清理 {enhanceStats.lowQuality}
                            </Badge>
                          )}
                          {enhanceStats.classical > 0 && (
                            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                              文言风格 {enhanceStats.classical}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ========== 右侧：处理配置 ========== */}
              <div className="lg:col-span-2 space-y-4">
                <PolishConfig 
                  settings={settings}
                  onSettingsChange={setSettings}
                  vocabCount={vocabularyItems.length}
                />
                
                {/* 实时AI检测 */}
                <RealtimeAIDetector 
                  text={outputText || inputText}
                  originalScore={analysis?.aiScore}
                  onFullDetect={() => {
                    // 触发完整检测
                    const textToDetect = outputText || inputText;
                    if (textToDetect) {
                      fetch('/api/detection-history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: textToDetect,
                          score: 0, // 将被实际分数替换
                          source: 'polish',
                        }),
                      });
                    }
                  }}
                />
                
                {/* AI检测面板 */}
                <AIDetectorPanel 
                  text={outputText || inputText}
                  onEnhance={() => {
                    // 一键对抗：启用AI检测对抗选项并重新润色
                    setSettings(prev => ({
                      ...prev,
                      enhanceOptions: {
                        ...prev.enhanceOptions,
                        enableAntiAI: true,
                        enableCleanLowQuality: true,
                        intensity: 'heavy',
                      },
                    }));
                    // 如果有输出，应用增强处理
                    if (outputText) {
                      applyEnhancement(outputText);
                    }
                  }}
                  isEnhancing={isEnhancing}
                />
                
                {/* 检测历史 - 可折叠 */}
                <DetectionHistoryPanel />
              </div>
            </div>
          </TabsContent>

          {/* ==================== 资源库 Tab ==================== */}
          <TabsContent value="resources" className="space-y-4">
            {/* 一键导出/导入按钮 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <span className="text-sm font-medium">数据备份</span>
                  <p className="text-xs text-muted-foreground">一键导出/导入所有资源数据</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => importFileRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  一键导入
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleExportAll}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  一键导出
                </Button>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                onChange={handleImportAll}
                className="hidden"
              />
            </div>
            
            {/* 智能联想总开关 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500 text-white">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">智能联想</span>
                    <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300">
                      AI增强
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">根据已有资源库智能联想扩展，提升覆盖面</p>
                </div>
              </div>
              <button
                onClick={() => setSettings(prev => ({
                  ...prev,
                  subOptions: {
                    ...prev.subOptions,
                    enableSmartAssociate: !prev.subOptions?.enableSmartAssociate
                  }
                }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.subOptions?.enableSmartAssociate ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.subOptions?.enableSmartAssociate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <Tabs defaultValue="vocabulary">
              <TabsList className="grid w-full grid-cols-6 max-w-3xl mb-4 h-11">
                <TabsTrigger value="vocabulary" className="flex items-center gap-2 text-sm h-9">
                  <Database className="w-4 h-4" />
                  词汇
                  {vocabularyItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{vocabularyItems.length.toLocaleString()}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="bannedWords" className="flex items-center gap-2 text-sm h-9">
                  <AlertTriangle className="w-4 h-4" />
                  禁用词
                  {bannedWordsItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{bannedWordsItems.length.toLocaleString()}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sentencePatterns" className="flex items-center gap-2 text-sm h-9">
                  <MessageSquare className="w-4 h-4" />
                  句式库
                  {sentencePatternsItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{sentencePatternsItems.length.toLocaleString()}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="literature" className="flex items-center gap-2 text-sm h-9">
                  <BookOpen className="w-4 h-4" />
                  文献
                  {literatureItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{literatureItems.length.toLocaleString()}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2 text-sm h-9">
                  <FileText className="w-4 h-4" />
                  模板存储
                </TabsTrigger>
                <TabsTrigger value="training" className="flex items-center gap-2 text-sm h-9">
                  <Sparkles className="w-4 h-4" />
                  模型训练
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="vocabulary">
                <MainLibraryManager onResourcesChange={setVocabularyItems} />
              </TabsContent>
              
              <TabsContent value="bannedWords">
                <BannedWordsManager onItemsChange={setBannedWordsItems} />
              </TabsContent>
              
              <TabsContent value="sentencePatterns">
                <SentencePatternsManager onItemsChange={setSentencePatternsItems} />
              </TabsContent>
              
              <TabsContent value="literature">
                <LiteratureManager onResourcesChange={setLiteratureItems} />
              </TabsContent>

              <TabsContent value="templates">
                <TemplateStorage />
              </TabsContent>

              <TabsContent value="training">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ModelTrainingPanel />
                  <DetectionHistoryPanel />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ==================== 文章生成 Tab ==================== */}
          <TabsContent value="generator" className="space-y-4">
            <UnifiedGenerator
              vocabularyItems={vocabularyItems}
              bannedWordsItems={bannedWordsItems}
            />
          </TabsContent>
        </Tabs>
        
        {/* 预置资源库 - 页面底部 */}
        <div className="mt-6">
          <PresetResources onImport={handleImportPresetResources} />
        </div>

        {/* 页脚 */}
        <footer className="text-center mt-6 py-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 提示：资源库数据保存在浏览器本地，建议定期导出备份
          </p>
        </footer>
      </div>
    </div>
  );
}
