/**
 * ============================================================================
 * 精校配置组件
 * ============================================================================
 * 
 * 优化说明：
 * - 扁平化设计：常用设置直接展示，减少折叠层级
 * - 功能分组：按用户意图分组而非技术阶段
 * - 引用保护：作为独立功能模块突出显示
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, ChevronUp, Settings, 
  Cpu, Sparkles, RotateCcw, Shield,
  Zap, Bookmark, BookmarkCheck, Eye, User,
  Check, Wand2, AlertTriangle, Palette, Laugh, FileCheck, Search, Languages, BookOpen, Type, Pencil, Ban, CheckCircle, Bug, Wrench, FileX, AlignJustify, FileText, Pen
} from "lucide-react";

import type { HistoricalNarrativeSettings } from "@/types";
import { 
  AI_MODELS, 
  PERSPECTIVE_OPTIONS,
  PUNCTUATION_OPTIONS,
  EMOTIONAL_TONES,
  STEP_DEFINITIONS,
  DEFAULT_STEP_ORDER,
  createDefaultSteps,
  DEFAULT_PARTICLE_SETTINGS,
  DEFAULT_PARTICLES,
  migrateLegacySteps,
  migrateLegacyStepOrder,
} from "@/constants";

// ============================================================================
// localStorage 存储键
// ============================================================================

const STORAGE_KEY_SETTINGS = "polish-default-settings";
const STORAGE_KEY_PRESET = "polish-user-preset-v1";

// 需要保存的库资源键
const LIBRARY_STORAGE_KEYS = {
  mainLibrary: "main-vocabulary-library",
  memeCategories: "meme-categories",
  bannedWordStyle: "banned-word-replacement-style",
};

// ============================================================================
// 预设类型定义
// ============================================================================

interface UserPreset {
  version: number;
  savedAt: string;
  name: string;
  settings: HistoricalNarrativeSettings;
  libraries: {
    mainLibrary: unknown;
    memeCategories: unknown;
    bannedWordStyle: string | null;
  };
}

// ============================================================================
// 图标映射
// ============================================================================

const ICON_MAP: Record<string, typeof Settings> = {
  Search, Languages, BookOpen, Type, Pencil, Sparkles, AlertTriangle, 
  Laugh, Ban, Palette, FileCheck, CheckCircle, Bug, Wrench, FileX, 
  AlignJustify, Shield, Wand2
};

// ============================================================================
// 步骤功能分组（按用户意图）
// ============================================================================

const STEP_GROUPS = {
  protect: {
    title: "内容保护",
    description: "保护重要内容不被修改",
    icon: Shield,
    color: "emerald",
    steps: ["quoteProtect"]
  },
  style: {
    title: "风格调整",
    description: "调整文章的语言风格",
    icon: Sparkles,
    color: "amber",
    steps: ["classicalApply", "particleApply"]
  },
  polish: {
    title: "内容润色",
    description: "词汇替换与句式优化",
    icon: Wand2,
    color: "indigo",
    steps: ["polish", "styleForge"]
  },
  clean: {
    title: "内容净化",
    description: "移除不当表述与格式",
    icon: AlertTriangle,
    color: "red",
    steps: ["properNounCheck", "bannedWords", "sentencePatterns", "punctuationApply", "markdownClean"]
  },
  review: {
    title: "审稿验证",
    description: "检查结果质量",
    icon: FileCheck,
    color: "green",
    steps: ["semanticCheck", "finalReview", "wordUsageCheck", "smartFix", "breathSegment"]
  },
  output: {
    title: "输出处理",
    description: "标题提取与格式化输出",
    icon: FileText,
    color: "blue",
    steps: ["titleExtract"]
  }
} as const;

// ============================================================================
// 系统默认设置
// ============================================================================

const SYSTEM_DEFAULT_SETTINGS: HistoricalNarrativeSettings = {
  narrativePerspective: "limited-omniscient",
  classicalRatio: 20,
  perspective: "",
  era: "",
  faction: "",
  aiModel: AI_MODELS[0].id,
  stepOrder: DEFAULT_STEP_ORDER,
  steps: createDefaultSteps(),
  subOptions: { enableChinesize: true, enableLLMSmart: true, memeSatire: false, enableDialogueFormat: false },
  emotionalTone: "",
  punctuation: { 
    banColon: true, 
    banParentheses: true, 
    banDash: true, 
    useJapaneseQuotes: true, 
    useJapaneseBookMarks: true,
    banMarkdown: true, 
  },
  particleSettings: DEFAULT_PARTICLE_SETTINGS,
};

// ============================================================================
// 主组件
// ============================================================================

interface Props {
  settings: HistoricalNarrativeSettings;
  onSettingsChange: (settings: HistoricalNarrativeSettings) => void;
  vocabCount?: number;
}

export function PolishConfig({ settings, onSettingsChange, vocabCount = 0 }: Props) {
  const [localSettings, setLocalSettings] = useState(SYSTEM_DEFAULT_SETTINGS);
  const [hasUserDefault, setHasUserDefault] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasPreset, setHasPreset] = useState(false);
  const [presetSaveSuccess, setPresetSaveSuccess] = useState(false);
  const [presetRestoreSuccess, setPresetRestoreSuccess] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    protect: true,  // 引用保护默认展开
    style: false,
    polish: false,
    clean: false,
    review: false,
    output: false,
  });

  // 使用外部传入的 settings
  const currentSettings = settings || localSettings;

  // ==================== 初始化 ====================
  
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      
      if (savedSettings) {
        let parsedSettings = JSON.parse(savedSettings) as HistoricalNarrativeSettings;
        
        // 数据迁移
        parsedSettings.stepOrder = migrateLegacyStepOrder(parsedSettings.stepOrder);
        parsedSettings.steps = migrateLegacySteps(parsedSettings.steps);
        
        // 确保包含所有新步骤
        const missingSteps = DEFAULT_STEP_ORDER.filter(id => !parsedSettings.stepOrder.includes(id));
        if (missingSteps.length > 0) {
          const newOrder = [...parsedSettings.stepOrder];
          missingSteps.forEach(missingId => {
            const defaultIdx = DEFAULT_STEP_ORDER.indexOf(missingId);
            if (defaultIdx > 0) {
              const prevId = DEFAULT_STEP_ORDER[defaultIdx - 1];
              const prevIdx = newOrder.indexOf(prevId);
              if (prevIdx !== -1) {
                newOrder.splice(prevIdx + 1, 0, missingId);
              } else {
                newOrder.push(missingId);
              }
            } else {
              newOrder.unshift(missingId);
            }
          });
          parsedSettings.stepOrder = newOrder;
        }
        
        // 确保所有步骤状态存在
        const defaultSteps = createDefaultSteps();
        Object.keys(defaultSteps).forEach(stepId => {
          if (!parsedSettings.steps[stepId]) {
            parsedSettings.steps[stepId] = defaultSteps[stepId];
          }
        });
        
        delete (parsedSettings as any).citationRatio;
        delete (parsedSettings as any).memeRatio;
        
        setLocalSettings(parsedSettings);
        onSettingsChange(parsedSettings);
        setHasUserDefault(true);
      }
      
      // 检查是否存在预设
      const savedPreset = localStorage.getItem(STORAGE_KEY_PRESET);
      setHasPreset(!!savedPreset);
    } catch (error) {
      console.error("读取默认设置失败:", error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== 设置操作 ====================

  const updateSettings = useCallback((updates: Partial<HistoricalNarrativeSettings>) => {
    const newSettings = { ...currentSettings, ...updates };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  const updateStep = useCallback((stepId: string, enabled: boolean) => {
    updateSettings({
      steps: { ...currentSettings.steps, [stepId]: { enabled } }
    });
  }, [currentSettings.steps, updateSettings]);

  const updateSubOption = useCallback((key: string, value: boolean) => {
    updateSettings({
      subOptions: { ...currentSettings.subOptions, [key]: value }
    });
  }, [currentSettings.subOptions, updateSettings]);

  const saveAsDefault = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(currentSettings));
      setHasUserDefault(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("保存默认设置失败:", error);
    }
  }, [currentSettings]);

  const restoreSystemDefault = useCallback(() => {
    if (!confirm("确定恢复系统默认设置吗？")) return;
    try {
      localStorage.removeItem(STORAGE_KEY_SETTINGS);
      setLocalSettings(SYSTEM_DEFAULT_SETTINGS);
      onSettingsChange(SYSTEM_DEFAULT_SETTINGS);
      setHasUserDefault(false);
    } catch (error) {
      console.error("恢复默认设置失败:", error);
    }
  }, [onSettingsChange]);

  // ==================== 预设操作 ====================

  // 保存完整预设（设置 + 所有库资源）
  const saveAsPreset = useCallback(() => {
    try {
      const preset: UserPreset = {
        version: 1,
        savedAt: new Date().toISOString(),
        name: "我的预设",
        settings: currentSettings,
        libraries: {
          mainLibrary: localStorage.getItem(LIBRARY_STORAGE_KEYS.mainLibrary) 
            ? JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEYS.mainLibrary)!) 
            : null,
          memeCategories: localStorage.getItem(LIBRARY_STORAGE_KEYS.memeCategories)
            ? JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEYS.memeCategories)!)
            : null,
          bannedWordStyle: localStorage.getItem(LIBRARY_STORAGE_KEYS.bannedWordStyle),
        }
      };
      
      localStorage.setItem(STORAGE_KEY_PRESET, JSON.stringify(preset));
      setHasPreset(true);
      setPresetSaveSuccess(true);
      setTimeout(() => setPresetSaveSuccess(false), 2000);
    } catch (error) {
      console.error("保存预设失败:", error);
      alert("保存预设失败，请检查浏览器存储空间");
    }
  }, [currentSettings]);

  // 恢复预设（设置 + 所有库资源）
  const restorePreset = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRESET);
      if (!saved) {
        alert("未找到已保存的预设");
        return;
      }
      
      const preset = JSON.parse(saved) as UserPreset;
      
      // 恢复设置
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(preset.settings));
      setLocalSettings(preset.settings);
      onSettingsChange(preset.settings);
      setHasUserDefault(true);
      
      // 恢复库资源
      if (preset.libraries.mainLibrary) {
        localStorage.setItem(LIBRARY_STORAGE_KEYS.mainLibrary, JSON.stringify(preset.libraries.mainLibrary));
      }
      if (preset.libraries.memeCategories) {
        localStorage.setItem(LIBRARY_STORAGE_KEYS.memeCategories, JSON.stringify(preset.libraries.memeCategories));
      }
      if (preset.libraries.bannedWordStyle) {
        localStorage.setItem(LIBRARY_STORAGE_KEYS.bannedWordStyle, preset.libraries.bannedWordStyle);
      }
      
      setPresetRestoreSuccess(true);
      setTimeout(() => setPresetRestoreSuccess(false), 2000);
      
      // 刷新页面以应用库资源
      window.location.reload();
    } catch (error) {
      console.error("恢复预设失败:", error);
      alert("恢复预设失败");
    }
  }, [onSettingsChange]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // ==================== 计算值 ====================

  const enabledCount = Object.values(currentSettings.steps).filter(s => s.enabled).length;

  // ==================== 渲染 ====================

  return (
    <Card className="shadow-lg border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-5 h-5 text-indigo-500" />
              处理配置
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              已启用 {enabledCount} 个处理步骤
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 保存设置按钮 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={saveAsDefault}
              className="h-8 text-xs gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600">已保存</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">保存</span>
                </>
              )}
            </Button>
            
            {/* 保存完整预设按钮 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={saveAsPreset}
              className="h-8 text-xs gap-1.5 border-amber-300 hover:bg-amber-50"
              title="保存当前设置和所有库资源"
            >
              {presetSaveSuccess ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600">已存预设</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">存预设</span>
                </>
              )}
            </Button>
            
            {/* 恢复预设按钮 */}
            {hasPreset && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={restorePreset}
                className="h-8 text-xs gap-1.5 border-blue-300 hover:bg-blue-50"
                title="恢复预设设置和库资源"
              >
                {presetRestoreSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-600">已恢复</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">恢复预设</span>
                  </>
                )}
              </Button>
            )}
            
            {hasUserDefault && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={restoreSystemDefault}
                className="h-8 text-xs gap-1.5 text-muted-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">重置</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* ================================================================ */}
        {/* AI模型选择 - 扁平化展示 */}
        {/* ================================================================ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">AI 模型</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {AI_MODELS.find(m => m.id === currentSettings.aiModel)?.name}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {AI_MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => updateSettings({ aiModel: model.id })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  currentSettings.aiModel === model.id 
                    ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-400" 
                    : "border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-sm font-medium">{model.name}</span>
                  {model.id.includes("lite") && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">快速</Badge>
                  )}
                  {model.id.includes("pro") && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">高质量</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{model.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* 叙事视角 - 开关 + 三选一 */}
        {/* ================================================================ */}
        <div className="space-y-2">
          {/* 开关控制 */}
          <div className={`p-3 rounded-lg border-2 transition-all ${
            currentSettings.steps.narrativePerspective?.enabled 
              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" 
              : "border-slate-200 bg-slate-50 dark:bg-slate-800/50"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  currentSettings.steps.narrativePerspective?.enabled 
                    ? "bg-blue-100 dark:bg-blue-900" 
                    : "bg-slate-200 dark:bg-slate-700"
                }`}>
                  <Eye className={`w-4 h-4 ${
                    currentSettings.steps.narrativePerspective?.enabled 
                      ? "text-blue-600" 
                      : "text-slate-400"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">叙事视角</span>
                    {currentSettings.steps.narrativePerspective?.enabled && (
                      <Badge className="text-[10px] bg-blue-500">已启用</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentSettings.steps.narrativePerspective?.enabled 
                      ? "调整文本的叙事视角" 
                      : "不修改叙事视角"}
                  </p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSettings.steps.narrativePerspective?.enabled ?? false}
                  onChange={(e) => updateStep("narrativePerspective", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </div>
          
          {/* 三选一选项 - 仅在启用时显示 */}
          {currentSettings.steps.narrativePerspective?.enabled && (
            <div className="grid grid-cols-3 gap-2 pl-2">
              {PERSPECTIVE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateSettings({ narrativePerspective: opt.id })}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    currentSettings.narrativePerspective === opt.id 
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-400" 
                      : "border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <opt.icon className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <span className="text-xs font-medium block">{opt.title}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 文言化程度 - 扁平化展示 */}
        {/* ================================================================ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">文言风格</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {currentSettings.classicalRatio}%
            </Badge>
          </div>
          
          <div className="px-1">
            <Slider 
              value={[currentSettings.classicalRatio]} 
              onValueChange={([v]) => updateSettings({ classicalRatio: v })} 
              max={100} 
              step={5} 
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>白话</span>
              <span>半文半白</span>
              <span>古文</span>
            </div>
          </div>
          
          {/* 虚词智能模式 */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 mt-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs">虚词智能模式</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentSettings.particleSettings?.enableSmart ?? true}
                onChange={(e) => updateSettings({ 
                  particleSettings: { 
                    ...currentSettings.particleSettings,
                    enableSmart: e.target.checked 
                  } 
                })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 引用保护 - 独立突出显示 */}
        {/* ================================================================ */}
        <div className={`p-3 rounded-lg border-2 transition-all ${
          currentSettings.steps.quoteProtect?.enabled 
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" 
            : "border-slate-200 bg-slate-50 dark:bg-slate-800/50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                currentSettings.steps.quoteProtect?.enabled 
                  ? "bg-emerald-100 dark:bg-emerald-900" 
                  : "bg-slate-200 dark:bg-slate-700"
              }`}>
                <Shield className={`w-4 h-4 ${
                  currentSettings.steps.quoteProtect?.enabled 
                    ? "text-emerald-600" 
                    : "text-slate-400"
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">引用保护</span>
                  {currentSettings.steps.quoteProtect?.enabled && (
                    <Badge className="text-[10px] bg-emerald-500">已启用</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  保护引号「」" "和书名号《》内的内容不被修改
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentSettings.steps.quoteProtect?.enabled ?? true}
                onChange={(e) => updateStep("quoteProtect", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 处理步骤分组 */}
        {/* ================================================================ */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wand2 className="w-4 h-4" />
            <span>处理步骤</span>
          </div>
          
          {Object.entries(STEP_GROUPS).map(([groupId, group]) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups[groupId];
            const groupSteps = group.steps.filter(id => STEP_DEFINITIONS[id]);
            const enabledInGroup = groupSteps.filter(id => currentSettings.steps[id]?.enabled).length;
            
            return (
              <div key={groupId} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* 分组标题 */}
                <button
                  onClick={() => toggleGroup(groupId)}
                  className={`w-full flex items-center justify-between p-3 transition-all ${
                    group.color === "emerald" ? "bg-emerald-50 dark:bg-emerald-950/30" :
                    group.color === "amber" ? "bg-amber-50 dark:bg-amber-950/30" :
                    group.color === "indigo" ? "bg-indigo-50 dark:bg-indigo-950/30" :
                    group.color === "red" ? "bg-red-50 dark:bg-red-950/30" :
                    group.color === "blue" ? "bg-blue-50 dark:bg-blue-950/30" :
                    "bg-green-50 dark:bg-green-950/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className={`w-4 h-4 ${
                      group.color === "emerald" ? "text-emerald-600" :
                      group.color === "amber" ? "text-amber-600" :
                      group.color === "indigo" ? "text-indigo-600" :
                      group.color === "red" ? "text-red-600" :
                      group.color === "blue" ? "text-blue-600" :
                      "text-green-600"
                    }`} />
                    <span className="text-sm font-medium">{group.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {enabledInGroup}/{groupSteps.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                {/* 步骤列表 */}
                {isExpanded && (
                  <div className="p-2 space-y-1 bg-white dark:bg-slate-900">
                    {groupSteps.map(stepId => {
                      const step = STEP_DEFINITIONS[stepId];
                      if (!step) return null;
                      
                      const StepIcon = step.icon;
                      const isEnabled = currentSettings.steps[stepId]?.enabled;
                      const isFixed = step.fixed;
                      
                      return (
                        <div 
                          key={stepId}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                            isEnabled 
                              ? "bg-slate-50 dark:bg-slate-800" 
                              : "opacity-50"
                          }`}
                        >
                          <div className={`p-1.5 rounded ${
                            step.color === "amber" ? "bg-amber-100 text-amber-600" :
                            step.color === "blue" ? "bg-blue-100 text-blue-600" :
                            step.color === "indigo" ? "bg-indigo-100 text-indigo-600" :
                            step.color === "orange" ? "bg-orange-100 text-orange-600" :
                            step.color === "purple" ? "bg-purple-100 text-purple-600" :
                            step.color === "teal" ? "bg-teal-100 text-teal-600" :
                            step.color === "red" ? "bg-red-100 text-red-600" :
                            step.color === "green" ? "bg-green-100 text-green-600" :
                            step.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                            step.color === "rose" ? "bg-rose-100 text-rose-600" :
                            step.color === "violet" ? "bg-violet-100 text-violet-600" :
                            step.color === "cyan" ? "bg-cyan-100 text-cyan-600" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            <StepIcon className="w-3.5 h-3.5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{step.title}</span>
                              {isFixed && (
                                <Badge variant="outline" className="text-[10px] px-1">必选</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {step.description}
                            </p>
                          </div>
                          
                          {/* 子选项 */}
                          {step.subOptions && step.subOptions.length > 0 && isEnabled && (
                            <div className="hidden sm:flex flex-wrap gap-1">
                              {step.subOptions.map(sub => (
                                <label 
                                  key={sub.id}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={currentSettings.subOptions[sub.id as keyof typeof currentSettings.subOptions] as boolean}
                                    onChange={(e) => updateSubOption(sub.id, e.target.checked)}
                                    className="w-2.5 h-2.5 rounded"
                                  />
                                  {sub.label}
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {/* 开关 */}
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => updateStep(stepId, e.target.checked)}
                            disabled={isFixed}
                            className="w-4 h-4 rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* 标点符号设置 - 完整版 */}
        {/* ================================================================ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Pencil className="w-4 h-4 text-orange-500" />
              <span>标点符号</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {[
                currentSettings.punctuation.banColon && "冒号",
                currentSettings.punctuation.banParentheses && "括号", 
                currentSettings.punctuation.banDash && "破折号",
                currentSettings.punctuation.useJapaneseQuotes && "日文引号",
                currentSettings.punctuation.useJapaneseBookMarks && "日文书名号",
                currentSettings.punctuation.banMarkdown && "清理Markdown"
              ].filter(Boolean).length || 0} 项
            </Badge>
          </div>
          
          {/* 禁用类选项 */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground px-1">禁用标点</span>
            <div className="flex flex-wrap gap-2">
              {PUNCTUATION_OPTIONS.filter(opt => opt.id.startsWith('ban') && opt.id !== 'banMarkdown').map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    currentSettings.punctuation[opt.id]
                      ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30"
                      : "border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={currentSettings.punctuation[opt.id]}
                    onChange={(e) => updateSettings({
                      punctuation: { ...currentSettings.punctuation, [opt.id]: e.target.checked }
                    })}
                    className="sr-only"
                  />
                  <span className="font-medium">{opt.label.replace('禁用', '')}</span>
                  {opt.desc && <span className="text-[10px] text-muted-foreground">({opt.desc})</span>}
                </label>
              ))}
            </div>
          </div>
          
          {/* 日文选项 */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground px-1">日文标点</span>
            <div className="flex flex-wrap gap-2">
              {PUNCTUATION_OPTIONS.filter(opt => opt.id.startsWith('use')).map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    currentSettings.punctuation[opt.id]
                      ? "border-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-950/30"
                      : "border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={currentSettings.punctuation[opt.id]}
                    onChange={(e) => updateSettings({
                      punctuation: { ...currentSettings.punctuation, [opt.id]: e.target.checked }
                    })}
                    className="sr-only"
                  />
                  <span className="font-medium">{opt.label.replace('使用', '')}</span>
                  {opt.desc && <span className="text-[10px] text-muted-foreground">({opt.desc})</span>}
                </label>
              ))}
            </div>
          </div>
          
          {/* 格式清理 */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground px-1">格式清理</span>
            <div className="flex flex-wrap gap-2">
              {PUNCTUATION_OPTIONS.filter(opt => opt.id === 'banMarkdown').map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    currentSettings.punctuation[opt.id]
                      ? "border-teal-400 bg-teal-50 text-teal-700 dark:bg-teal-950/30"
                      : "border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={currentSettings.punctuation[opt.id]}
                    onChange={(e) => updateSettings({
                      punctuation: { ...currentSettings.punctuation, [opt.id]: e.target.checked }
                    })}
                    className="sr-only"
                  />
                  <span className="font-medium">{opt.label}</span>
                  {opt.desc && <span className="text-[10px] text-muted-foreground">({opt.desc})</span>}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 增强选项 - 精选数据集成 */}
        {/* ================================================================ */}
        <div className="space-y-2">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/40 dark:hover:to-purple-900/40 transition-all">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium">增强选项</span>
                  <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-300">
                    精选数据
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-violet-400" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 space-y-3 border border-t-0 border-violet-200 rounded-b-lg bg-white dark:bg-slate-900">
                {/* 同义词替换 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs">同义词替换</span>
                    <Badge variant="outline" className="text-[10px]">高频词</Badge>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSettings.enhanceOptions?.enableSynonym ?? false}
                      onChange={(e) => updateSettings({ 
                        enhanceOptions: { 
                          ...currentSettings.enhanceOptions,
                          enableSynonym: e.target.checked 
                        } 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                {/* AI特征对抗 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs">AI检测对抗</span>
                    <Badge variant="outline" className="text-[10px]">14+特征</Badge>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSettings.enhanceOptions?.enableAntiAI ?? false}
                      onChange={(e) => updateSettings({ 
                        enhanceOptions: { 
                          ...currentSettings.enhanceOptions,
                          enableAntiAI: e.target.checked 
                        } 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* 学术规范 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs">学术规范</span>
                    <Badge variant="outline" className="text-[10px]">口语→正式</Badge>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSettings.enhanceOptions?.enableAcademic ?? false}
                      onChange={(e) => updateSettings({ 
                        enhanceOptions: { 
                          ...currentSettings.enhanceOptions,
                          enableAcademic: e.target.checked 
                        } 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 低质量清理 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs">低质量清理</span>
                    <Badge variant="outline" className="text-[10px]">冗余表达</Badge>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSettings.enhanceOptions?.enableCleanLowQuality ?? false}
                      onChange={(e) => updateSettings({ 
                        enhanceOptions: { 
                          ...currentSettings.enhanceOptions,
                          enableCleanLowQuality: e.target.checked 
                        } 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* 文言风格 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <Pen className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-xs">文言风格</span>
                    <Badge variant="outline" className="text-[10px]">40+词汇</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={currentSettings.enhanceOptions?.classicalLevel ?? 'literary'}
                      onChange={(e) => updateSettings({ 
                        enhanceOptions: { 
                          ...currentSettings.enhanceOptions,
                          classicalLevel: e.target.value as 'literary' | 'classical'
                        } 
                      })}
                      className="text-xs px-2 py-1 rounded border bg-white dark:bg-slate-700"
                      disabled={!currentSettings.enhanceOptions?.enableClassical}
                    >
                      <option value="literary">文学</option>
                      <option value="classical">古典</option>
                    </select>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentSettings.enhanceOptions?.enableClassical ?? false}
                        onChange={(e) => updateSettings({ 
                          enhanceOptions: { 
                            ...currentSettings.enhanceOptions,
                            enableClassical: e.target.checked 
                          } 
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                    </label>
                  </div>
                </div>

                {/* 强度选择 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-xs">改写强度</span>
                  </div>
                  <div className="flex gap-1">
                    {(['light', 'medium', 'heavy'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => updateSettings({ 
                          enhanceOptions: { 
                            ...currentSettings.enhanceOptions,
                            intensity: level 
                          } 
                        })}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          (currentSettings.enhanceOptions?.intensity ?? 'medium') === level
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'
                        }`}
                      >
                        {level === 'light' ? '轻度' : level === 'medium' ? '中度' : '重度'}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground px-2">
                  💡 增强选项使用精选数据集，与核心润色功能独立运行
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* ================================================================ */}
        {/* 资源统计 */}
        {/* ================================================================ */}
        {vocabCount > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200">
            <span className="text-sm">📚</span>
            <span className="text-xs text-muted-foreground">词汇资源</span>
            <Badge variant="secondary" className="ml-auto text-xs">{vocabCount}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
