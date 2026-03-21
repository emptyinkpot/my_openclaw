/**
 * ============================================================================
 * 增强功能面板组件
 * ============================================================================
 * 
 * 整合开源项目优秀特性：
 * - 写作模式切换（Article Writer）
 * - 6维风格定制（Writing-Helper）
 * - 学术润色模板（awesome-ai-research）
 * - AI检测对抗（BypassAIGC）
 */

"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  PenTool, Sparkles, Loader2, Wand2, Shield, Languages,
  GraduationCap, Settings, Palette, Brain, Zap
} from "lucide-react";

import type {
  WritingMode,
  SixDimensionStyle,
  AcademicPolishType,
  AntiDetectionMode,
  AntiDetectionConfig,
} from "@/types";
import {
  WRITING_MODE_CONFIGS,
  STYLE_DIMENSIONS,
  STYLE_PRESETS,
  ACADEMIC_POLISH_TEMPLATES,
  ANTI_DETECTION_PRESETS,
  DEFAULT_SIX_DIMENSION_STYLE,
} from "@/types";

// ============================================================================
// 组件 Props
// ============================================================================

interface EnhancedFeaturesPanelProps {
  onTranslate?: (text: string, sourceLang: string, targetLang: string) => void;
  onAcademicPolish?: (text: string, type: AcademicPolishType) => void;
  onAntiDetection?: (text: string, config: AntiDetectionConfig) => void;
  onStyleChange?: (style: SixDimensionStyle) => void;
  onModeChange?: (mode: WritingMode) => void;
  inputText?: string;
}

// ============================================================================
// 主组件
// ============================================================================

export function EnhancedFeaturesPanel({
  onTranslate,
  onAcademicPolish,
  onAntiDetection,
  onStyleChange,
  onModeChange,
  inputText = "",
}: EnhancedFeaturesPanelProps) {
  
  // ==================== 状态 ====================
  const [writingMode, setWritingMode] = useState<WritingMode>("hybrid");
  const [sixDimensionStyle, setSixDimensionStyle] = useState<SixDimensionStyle>(DEFAULT_SIX_DIMENSION_STYLE);
  const [antiDetectionMode, setAntiDetectionMode] = useState<AntiDetectionMode>("medium");
  const [antiDetectionConfig, setAntiDetectionConfig] = useState<AntiDetectionConfig>(ANTI_DETECTION_PRESETS.medium);
  
  // 翻译状态
  const [translateSource, setTranslateSource] = useState("zh");
  const [translateTarget, setTranslateTarget] = useState("en");
  
  // 学术润色类型
  const [academicType, setAcademicType] = useState<AcademicPolishType>("polish");
  
  // 加载状态
  const [loading, setLoading] = useState<string | null>(null);

  // ==================== 处理函数 ====================

  const handleModeChange = useCallback((mode: WritingMode) => {
    setWritingMode(mode);
    onModeChange?.(mode);
  }, [onModeChange]);

  const handleStyleChange = useCallback((key: keyof SixDimensionStyle, value: number) => {
    const newStyle = { ...sixDimensionStyle, [key]: value };
    setSixDimensionStyle(newStyle);
    onStyleChange?.(newStyle);
  }, [sixDimensionStyle, onStyleChange]);

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = STYLE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSixDimensionStyle(preset.style);
      onStyleChange?.(preset.style);
    }
  }, [onStyleChange]);

  const handleAntiDetectionModeChange = useCallback((mode: AntiDetectionMode) => {
    setAntiDetectionMode(mode);
    setAntiDetectionConfig(ANTI_DETECTION_PRESETS[mode]);
  }, []);

  const handleTranslate = useCallback(() => {
    if (!inputText.trim()) {
      alert("请先输入文本");
      return;
    }
    setLoading("translate");
    onTranslate?.(inputText, translateSource, translateTarget);
  }, [inputText, translateSource, translateTarget, onTranslate]);

  const handleAcademicPolish = useCallback(() => {
    if (!inputText.trim()) {
      alert("请先输入文本");
      return;
    }
    setLoading("academic");
    onAcademicPolish?.(inputText, academicType);
  }, [inputText, academicType, onAcademicPolish]);

  const handleAntiDetection = useCallback(() => {
    if (!inputText.trim()) {
      alert("请先输入文本");
      return;
    }
    setLoading("antiDetection");
    onAntiDetection?.(inputText, antiDetectionConfig);
  }, [inputText, antiDetectionConfig, onAntiDetection]);

  // ==================== 渲染 ====================

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-sm">增强功能</span>
          <Badge variant="outline" className="text-[10px] ml-auto">新特性</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <Tabs defaultValue="mode" className="space-y-3">
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="mode" className="text-xs py-1">
              <PenTool className="w-3 h-3 mr-1" />
              模式
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs py-1">
              <Palette className="w-3 h-3 mr-1" />
              风格
            </TabsTrigger>
            <TabsTrigger value="academic" className="text-xs py-1">
              <GraduationCap className="w-3 h-3 mr-1" />
              学术
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs py-1">
              <Shield className="w-3 h-3 mr-1" />
              工具
            </TabsTrigger>
          </TabsList>

          {/* ========== 写作模式 ========== */}
          <TabsContent value="mode" className="space-y-3 mt-0">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(WRITING_MODE_CONFIGS) as WritingMode[]).map((mode) => {
                const config = WRITING_MODE_CONFIGS[mode];
                return (
                  <div
                    key={mode}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                      writingMode === mode
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleModeChange(mode)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {mode === 'coach' ? '教练' : mode === 'fast' ? '快速' : '混合'}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {config.aiInvolvement}%AI
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {config.recommendedScenarios[0]}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {WRITING_MODE_CONFIGS[writingMode].description}
            </p>
          </TabsContent>

          {/* ========== 6维风格定制 ========== */}
          <TabsContent value="style" className="space-y-3 mt-0">
            {/* 风格预设 */}
            <div className="space-y-1.5">
              <Label className="text-xs">风格预设</Label>
              <div className="flex flex-wrap gap-1">
                {STYLE_PRESETS.map((preset) => (
                  <Badge
                    key={preset.id}
                    variant="outline"
                    className="cursor-pointer text-[10px] hover:bg-indigo-50"
                    onClick={() => handlePresetSelect(preset.id)}
                  >
                    {preset.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 6维滑块 */}
            <div className="space-y-2">
              {STYLE_DIMENSIONS.map(({ key, leftLabel, rightLabel, description }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span>{leftLabel}</span>
                    <span className="text-muted-foreground">{description}</span>
                    <span>{rightLabel}</span>
                  </div>
                  <Slider
                    value={[Math.round(sixDimensionStyle[key] * 100)]}
                    onValueChange={([v]) => handleStyleChange(key, v / 100)}
                    max={100}
                    step={5}
                    className="py-0.5 h-2"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ========== 学术润色 ========== */}
          <TabsContent value="academic" className="space-y-3 mt-0">
            <div className="space-y-1.5">
              <Label className="text-xs">处理类型</Label>
              <Select value={academicType} onValueChange={(v) => setAcademicType(v as AcademicPolishType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_POLISH_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <p className="text-[10px] text-muted-foreground">
              {ACADEMIC_POLISH_TEMPLATES.find(t => t.id === academicType)?.description}
            </p>

            <Button
              onClick={handleAcademicPolish}
              disabled={loading !== null || !inputText.trim()}
              size="sm"
              className="w-full h-8 text-xs"
            >
              {loading === "academic" ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <GraduationCap className="w-3 h-3 mr-1" />
                  执行学术润色
                </>
              )}
            </Button>
          </TabsContent>

          {/* ========== 工具箱 ========== */}
          <TabsContent value="tools" className="space-y-3 mt-0">
            {/* 翻译工具 */}
            <div className="p-2.5 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium">快速翻译</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={translateSource} onValueChange={setTranslateSource}>
                  <SelectTrigger className="h-7 text-xs w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="en">英语</SelectItem>
                    <SelectItem value="ja">日语</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs">→</span>
                <Select value={translateTarget} onValueChange={setTranslateTarget}>
                  <SelectTrigger className="h-7 text-xs w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">英语</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日语</SelectItem>
                    <SelectItem value="de">德语</SelectItem>
                    <SelectItem value="fr">法语</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleTranslate}
                  disabled={loading !== null || !inputText.trim()}
                  size="sm"
                  className="h-7 text-xs ml-auto"
                >
                  {loading === "translate" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "翻译"
                  )}
                </Button>
              </div>
            </div>

            {/* AI检测对抗 */}
            <div className="p-2.5 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-medium">AI检测对抗</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                降低AI特征，使文本更接近人类写作风格
              </p>
              <div className="flex items-center gap-2">
                <Select value={antiDetectionMode} onValueChange={(v) => handleAntiDetectionModeChange(v as AntiDetectionMode)}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">轻度 - 微调表达</SelectItem>
                    <SelectItem value="medium">中度 - 重构句式</SelectItem>
                    <SelectItem value="heavy">重度 - 彻底改写</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAntiDetection}
                  disabled={loading !== null || !inputText.trim()}
                  size="sm"
                  className="h-7 text-xs"
                >
                  {loading === "antiDetection" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "处理"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default EnhancedFeaturesPanel;
