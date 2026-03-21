/**
 * ============================================================================
 * 统一文章生成器组件
 * ============================================================================
 * 
 * 粘贴大纲自动分析填充配置，所有配置项可手动修改
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FileText, Sparkles, Loader2, Copy, Check, Database,
  PenTool, Wand2, Brain, Palette, Settings, Shield
} from "lucide-react";

import type {
  ArticleTemplate,
  StyleFingerprint,
  ResourceItem,
  BannedWordItem,
  AcademicPolishType,
  AntiDetectionConfig,
  SixDimensionStyle,
  WritingMode,
} from "@/types";
import {
  PRESET_TEMPLATES,
  HISTORICAL_PERSPECTIVE_OPTIONS,
  FACTION_OPTIONS,
  OPENING_TYPE_OPTIONS,
  DEVELOPMENT_PATH_OPTIONS,
  ENDING_TYPE_OPTIONS,
  METAPHOR_PREFERENCE_OPTIONS,
  WRITING_MODE_CONFIGS,
  STYLE_DIMENSIONS,
  STYLE_PRESETS,
  DEFAULT_SIX_DIMENSION_STYLE,
} from "@/types";

// ============================================================================
// 存储键
// ============================================================================

const TEMPLATE_STORAGE_KEY = "article-templates-v1";

// ============================================================================
// 组件 Props
// ============================================================================

interface UnifiedGeneratorProps {
  vocabularyItems?: ResourceItem[];
  bannedWordsItems?: BannedWordItem[];
}

// ============================================================================
// 配置类型
// ============================================================================

interface NarrativeConfig {
  perspectiveMode: string;
  openingType: string;
  developmentPath: string;
  endingType: string;
  macroWeight: number;
  faction: string;
  specificFears: string;
  metaphorPreferences: string[];
}

interface StyleConfig {
  enableTemplate: boolean;
  templateId: string;
  templateName: string;
  classicalRatio: number;
  fingerprint: StyleFingerprint;
}

// ============================================================================
// 主组件
// ============================================================================

export function UnifiedGenerator({
  vocabularyItems = [],
  bannedWordsItems = [],
}: UnifiedGeneratorProps) {
  // ==================== 大纲输入 ====================
  const [outline, setOutline] = useState("");
  const [targetLength, setTargetLength] = useState(5000);
  
  // ==================== 分析状态 ====================
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== 叙事配置（所有配置项都展示）====================
  const [narrative, setNarrative] = useState<NarrativeConfig>({
    perspectiveMode: "limited_situationalism",
    openingType: "symbolic_scene",
    developmentPath: "dual_thread_weave",
    endingType: "suspended_image",
    macroWeight: 60,
    faction: "western_classical",
    specificFears: "",
    metaphorPreferences: [],
  });

  // ==================== 风格配置 ====================
  const [style, setStyle] = useState<StyleConfig>({
    enableTemplate: false,
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
  });

  // ==================== 风格模板数据 ====================
  const [templates, setTemplates] = useState<ArticleTemplate[]>(PRESET_TEMPLATES);

  // ==================== 生成状态 ====================
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [copied, setCopied] = useState(false);

  // ==================== 增强功能状态 ====================
  const [writingMode, setWritingMode] = useState<WritingMode>("hybrid");
  const [sixDimensionStyle, setSixDimensionStyle] = useState<SixDimensionStyle>(DEFAULT_SIX_DIMENSION_STYLE);
  const [enhancedLoading, setEnhancedLoading] = useState<string | null>(null);

  // ==================== 加载模板 ====================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (saved) {
        const customTemplates = JSON.parse(saved);
        setTemplates([...PRESET_TEMPLATES, ...customTemplates]);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }, []);

  // ==================== 自动分析（粘贴大纲后自动触发）====================
  const handleAnalyze = useCallback(async (outlineText: string) => {
    if (!outlineText.trim() || analyzing) return;

    setAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline: outlineText, targetLength }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.config) {
                // 自动填入配置
                if (data.config.narrative) {
                  setNarrative(data.config.narrative);
                }
                if (data.config.style) {
                  setStyle(prev => ({
                    ...prev,
                    ...data.config.style,
                  }));
                }
              }
              if (data.error) {
                console.error("分析错误:", data.error);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error("Analyze error:", error);
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, targetLength]);

  // 大纲变化时自动分析（防抖）
  const handleOutlineChange = useCallback((value: string) => {
    setOutline(value);
    
    // 清除之前的定时器
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }
    
    // 设置新的定时器，1.5秒后自动分析
    if (value.trim().length > 10) {
      analyzeTimeoutRef.current = setTimeout(() => {
        handleAnalyze(value);
      }, 1500);
    }
  }, [handleAnalyze]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, []);

  // ==================== 生成文章 ====================
  const handleGenerate = useCallback(async () => {
    if (!outline.trim()) {
      alert("请输入文章大纲");
      return;
    }

    setGenerating(true);
    setGeneratedText("");
    setGeneratedTitle("");

    try {
      const body = {
        narrative,
        style: {
          ...style,
          classicalRatio: style.classicalRatio / 100,
        },
        content: {
          topic: outline.split('\n')[0],
          keyPoints: outline.split('\n').filter(Boolean),
          targetLength,
        },
      };

      const response = await fetch("/api/unified-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("生成请求失败");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setGeneratedText(data.text);
                if (data.title) setGeneratedTitle(data.title);
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error("Generate error:", error);
      alert("生成失败：" + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setGenerating(false);
    }
  }, [outline, targetLength, narrative, style]);

  // 复制
  const handleCopy = useCallback(async () => {
    if (generatedText) {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedText]);

  // 更新叙事配置
  const updateNarrative = useCallback(<K extends keyof NarrativeConfig>(
    key: K,
    value: NarrativeConfig[K]
  ) => {
    setNarrative(prev => ({ ...prev, [key]: value }));
  }, []);

  // 更新风格配置
  const updateStyle = useCallback(<K extends keyof StyleConfig>(
    key: K,
    value: StyleConfig[K]
  ) => {
    setStyle(prev => ({ ...prev, [key]: value }));
  }, []);

  // 更新风格指纹
  const updateFingerprint = useCallback(<K extends keyof StyleFingerprint>(
    key: K,
    value: number
  ) => {
    setStyle(prev => ({
      ...prev,
      fingerprint: { ...prev.fingerprint, [key]: value },
    }));
  }, []);

  // 切换比喻偏好
  const toggleMetaphor = useCallback((id: string) => {
    setNarrative(prev => {
      const prefs = prev.metaphorPreferences || [];
      return {
        ...prev,
        metaphorPreferences: prefs.includes(id)
          ? prefs.filter(p => p !== id)
          : [...prefs, id],
      };
    });
  }, []);

  // ==================== 增强功能处理 ====================

  /** 翻译处理 */
  const handleTranslate = useCallback(async (text: string, sourceLang: string, targetLang: string) => {
    setGeneratedText("");
    setGeneratedTitle("");
    setEnhancedLoading("translate");

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang, targetLang, style: 'academic' }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) setGeneratedText(data.text);
              if (data.error) throw new Error(data.error);
            } catch (e) { /* 忽略 */ }
          }
        }
      }
    } catch (error) {
      console.error("Translate error:", error);
      alert("翻译失败：" + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setEnhancedLoading(null);
    }
  }, []);

  /** 学术润色处理 */
  const handleAcademicPolish = useCallback(async (text: string, type: AcademicPolishType) => {
    setGeneratedText("");
    setGeneratedTitle("");
    setEnhancedLoading("academic");

    try {
      const response = await fetch("/api/academic-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) setGeneratedText(data.text);
              if (data.error) throw new Error(data.error);
            } catch (e) { /* 忽略 */ }
          }
        }
      }
    } catch (error) {
      console.error("Academic polish error:", error);
      alert("处理失败：" + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setEnhancedLoading(null);
    }
  }, []);

  /** AI检测对抗处理 */
  const handleAntiDetection = useCallback(async (text: string, config: AntiDetectionConfig) => {
    setGeneratedText("");
    setGeneratedTitle("");
    setEnhancedLoading("antiDetection");

    try {
      const response = await fetch("/api/anti-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, config }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) setGeneratedText(data.text);
              if (data.error) throw new Error(data.error);
            } catch (e) { /* 忽略 */ }
          }
        }
      }
    } catch (error) {
      console.error("Anti-detection error:", error);
      alert("处理失败：" + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setEnhancedLoading(null);
    }
  }, []);

  /** 6维风格更新 */
  const handleSixDimensionChange = useCallback((key: keyof SixDimensionStyle, value: number) => {
    setSixDimensionStyle(prev => ({ ...prev, [key]: value }));
  }, []);

  /** 风格预设应用 */
  const handleStylePreset = useCallback((presetId: string) => {
    const preset = STYLE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSixDimensionStyle(preset.style);
    }
  }, []);

  // ==================== 渲染 ====================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* 左侧：输入和配置 */}
      <div className="lg:col-span-2 space-y-3">
        
        {/* ========== 大纲输入 ========== */}
        <Card className="shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm">文章大纲</span>
                {analyzing && (
                  <Badge variant="secondary" className="text-[10px] animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
                    分析中
                  </Badge>
                )}
              </div>
              <Select
                value={String(targetLength)}
                onValueChange={(v) => setTargetLength(Number(v))}
              >
                <SelectTrigger className="w-20 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2000">2000字</SelectItem>
                  <SelectItem value="3000">3000字</SelectItem>
                  <SelectItem value="5000">5000字</SelectItem>
                  <SelectItem value="8000">8000字</SelectItem>
                  <SelectItem value="10000">1万字</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <Textarea
              placeholder="粘贴文章大纲，AI将自动分析并填充配置...&#10;&#10;例如：&#10;论科技对人性的异化&#10;一、科技带来的便利与依赖&#10;二、人际关系的疏离&#10;三、思考能力的退化&#10;四、寻找平衡之道"
              value={outline}
              onChange={(e) => handleOutlineChange(e.target.value)}
              className="min-h-[120px] text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              粘贴大纲后1.5秒自动分析，配置自动填充
            </p>
          </CardContent>
        </Card>

        {/* ========== 叙事配置（全部展示）========== */}
        <Card className="shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">叙事配置</span>
              <Badge variant="outline" className="text-[10px] ml-auto">自动填充后可修改</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* 史观模式 */}
            <div className="space-y-1">
              <Label className="text-xs">史观模式</Label>
              <Select
                value={narrative.perspectiveMode}
                onValueChange={(v) => updateNarrative("perspectiveMode", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HISTORICAL_PERSPECTIVE_OPTIONS.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 阵营 */}
            <div className="space-y-1">
              <Label className="text-xs">叙事阵营</Label>
              <Select
                value={narrative.faction}
                onValueChange={(v) => updateNarrative("faction", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTION_OPTIONS.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 展开路径 + 结尾类型 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">展开路径</Label>
                <Select
                  value={narrative.developmentPath}
                  onValueChange={(v) => updateNarrative("developmentPath", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVELOPMENT_PATH_OPTIONS.map(o => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">结尾类型</Label>
                <Select
                  value={narrative.endingType}
                  onValueChange={(v) => updateNarrative("endingType", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENDING_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 开场类型 */}
            <div className="space-y-1">
              <Label className="text-xs">开场类型</Label>
              <Select
                value={narrative.openingType}
                onValueChange={(v) => updateNarrative("openingType", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENING_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 宏观权重 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">宏观叙事权重</Label>
                <span className="text-xs text-muted-foreground">{narrative.macroWeight}%</span>
              </div>
              <Slider
                value={[narrative.macroWeight]}
                onValueChange={([v]) => updateNarrative("macroWeight", v)}
                max={100}
                step={5}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>微观叙事</span>
                <span>宏观叙事</span>
              </div>
            </div>

            {/* 特定恐惧 */}
            <div className="space-y-1">
              <Label className="text-xs">角色设定 / 特定恐惧</Label>
              <Textarea
                placeholder="描述角色特征或恐惧..."
                value={narrative.specificFears}
                onChange={(e) => updateNarrative("specificFears", e.target.value)}
                className="min-h-[50px] text-xs"
              />
            </div>

            {/* 比喻偏好 */}
            <div className="space-y-1">
              <Label className="text-xs">比喻系统偏好</Label>
              <div className="flex flex-wrap gap-1">
                {METAPHOR_PREFERENCE_OPTIONS.map(o => (
                  <Badge
                    key={o.id}
                    variant={narrative.metaphorPreferences?.includes(o.id) ? "default" : "outline"}
                    className="cursor-pointer text-[10px] px-2 py-0.5"
                    onClick={() => toggleMetaphor(o.id)}
                  >
                    {o.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== 风格配置 ========== */}
        <Card className="shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm">风格配置</span>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* 启用模板开关 */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">启用风格模板</Label>
              <Switch
                checked={style.enableTemplate}
                onCheckedChange={(v) => updateStyle("enableTemplate", v)}
              />
            </div>

            {/* 模板选择 */}
            {style.enableTemplate && (
              <div className="space-y-1">
                <Label className="text-xs">选择模板</Label>
                <Select
                  value={style.templateId}
                  onValueChange={(v) => {
                    const t = templates.find(t => t.metadata.id === v);
                    updateStyle("templateId", v);
                    updateStyle("templateName", t?.metadata.name || "");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="选择风格模板" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.metadata.id} value={t.metadata.id} className="text-xs">
                        {t.metadata.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 文言比例 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">文言比例</Label>
                <span className="text-xs text-muted-foreground">{style.classicalRatio}%</span>
              </div>
              <Slider
                value={[style.classicalRatio]}
                onValueChange={([v]) => updateStyle("classicalRatio", v)}
                max={100}
                step={5}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>现代白话</span>
                <span>文言典雅</span>
              </div>
            </div>

            {/* 风格指纹 */}
            <div className="space-y-2">
              <Label className="text-xs">风格指纹</Label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {[
                  { key: "rationalEmotional", left: "理性", right: "感性" },
                  { key: "conciseElaborate", left: "简洁", right: "详尽" },
                  { key: "directImplicit", left: "直白", right: "含蓄" },
                  { key: "objectiveSubjective", left: "客观", right: "主观" },
                  { key: "classicalModern", left: "古典", right: "现代" },
                  { key: "seriousPlayful", left: "严肃", right: "诙谐" },
                  { key: "tenseRelaxed", left: "紧张", right: "松弛" },
                  { key: "concreteAbstract", left: "具体", right: "抽象" },
                ].map(({ key, left, right }) => (
                  <div key={key} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{left}</span>
                      <span>{right}</span>
                    </div>
                    <Slider
                      value={[Math.round(style.fingerprint[key as keyof StyleFingerprint] * 100)]}
                      onValueChange={([v]) => updateFingerprint(key as keyof StyleFingerprint, v / 100)}
                      max={100}
                      step={10}
                      className="py-0.5 h-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 资源库状态 */}
        {(vocabularyItems.length > 0 || bannedWordsItems.length > 0) && (
          <div className="p-2 rounded border bg-slate-50 text-xs flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-muted-foreground">资源库：</span>
            <span>词汇 {vocabularyItems.length}</span>
            <span>禁用词 {bannedWordsItems.length}</span>
          </div>
        )}

        {/* ========== 增强功能面板 ========== */}
        <Card className="shadow-sm">
          <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm">增强功能</span>
              <Badge variant="outline" className="text-[10px] ml-auto">新特性</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* 写作模式 */}
            <div className="space-y-1.5">
              <Label className="text-xs">写作模式</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(WRITING_MODE_CONFIGS) as WritingMode[]).map((mode) => (
                  <div
                    key={mode}
                    className={`p-1.5 rounded border cursor-pointer transition-all text-center ${
                      writingMode === mode
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setWritingMode(mode)}
                  >
                    <span className="text-[10px] font-medium">
                      {mode === 'coach' ? '教练' : mode === 'fast' ? '快速' : '混合'}
                    </span>
                    <span className="text-[9px] text-muted-foreground block">
                      {WRITING_MODE_CONFIGS[mode].aiInvolvement}%AI
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6维风格 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">6维风格</Label>
                <div className="flex gap-1">
                  {STYLE_PRESETS.slice(0, 3).map((preset) => (
                    <Badge
                      key={preset.id}
                      variant="outline"
                      className="cursor-pointer text-[9px] px-1.5"
                      onClick={() => handleStylePreset(preset.id)}
                    >
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                {STYLE_DIMENSIONS.map(({ key, leftLabel, rightLabel }) => (
                  <div key={key} className="space-y-0.5">
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{leftLabel}</span>
                      <span>{rightLabel}</span>
                    </div>
                    <Slider
                      value={[Math.round(sixDimensionStyle[key] * 100)]}
                      onValueChange={([v]) => handleSixDimensionChange(key, v / 100)}
                      max={100}
                      step={10}
                      className="py-0.5 h-2"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 快捷工具 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => outline && handleAcademicPolish(outline, 'polish')}
                disabled={enhancedLoading !== null || !outline.trim()}
              >
                {enhancedLoading === 'academic' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Brain className="w-3 h-3 mr-1" />
                )}
                学术润色
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => outline && handleTranslate(outline, 'zh', 'en')}
                disabled={enhancedLoading !== null || !outline.trim()}
              >
                {enhancedLoading === 'translate' ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3 mr-1" />
                )}
                中译英
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !outline.trim()}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-10"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成文章
            </>
          )}
        </Button>
      </div>

      {/* 右侧：输出结果 */}
      <div className="lg:col-span-3">
        <Card className="shadow-sm h-full">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-sm">生成结果</span>
                {generatedText.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{generatedText.length} 字</Badge>
                )}
              </div>
              {generatedText && (
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
            <div className="min-h-[500px] max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg border bg-slate-50/50 dark:bg-slate-800/30 p-4">
              {generatedText ? (
                <div className="space-y-4">
                  {generatedTitle && (
                    <div className="text-lg font-bold border-b pb-2">{generatedTitle}</div>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{generatedText}</div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
                  <Wand2 className="w-10 h-10 mb-3 opacity-30" />
                  <span className="text-sm">粘贴大纲 → 自动分析填充配置 → 生成文章</span>
                  <span className="text-xs mt-1">所有配置项均可手动修改</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default UnifiedGenerator;
