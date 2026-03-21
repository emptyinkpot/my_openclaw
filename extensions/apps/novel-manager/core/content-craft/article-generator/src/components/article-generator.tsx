/**
 * ============================================================================
 * 文章生成器组件
 * ============================================================================
 * 
 * 基于历史叙事生成器设计文档实现
 * 四部分配置：核心理念预设、叙事视角与角色设定、叙事技法与结构控制、风格与输出控制
 */

"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown, ChevronUp, Brain, User, PenTool, Palette,
  Sparkles, Settings, Info, BookOpen, Target, Eye, Zap,
  RotateCcw, Save, Download, Upload
} from "lucide-react";

import type { ArticleGeneratorSettings } from "@/types";
import {
  DEFAULT_ARTICLE_GENERATOR_SETTINGS,
  HISTORICAL_PERSPECTIVE_OPTIONS,
  ULTIMATE_GOAL_OPTIONS,
  NARRATIVE_PERSPECTIVE_OPTIONS,
  FACTION_OPTIONS,
  CHARACTER_TAG_OPTIONS,
  INFORMATION_COCOON_OPTIONS,
  OPENING_TYPE_OPTIONS,
  DEVELOPMENT_PATH_OPTIONS,
  ENDING_TYPE_OPTIONS,
  METAPHOR_PREFERENCE_OPTIONS,
} from "@/types";

// ============================================================================
// 组件 Props
// ============================================================================

interface ArticleGeneratorProps {
  settings: ArticleGeneratorSettings;
  onSettingsChange: (settings: ArticleGeneratorSettings) => void;
  onGenerate: () => void;
  isLoading?: boolean;
  outputText?: string;
  onCopy?: () => void;
  copied?: boolean;
}

// ============================================================================
// 子组件：核心理念预设
// ============================================================================

function CorePhilosophySection({
  settings,
  onSettingsChange,
}: {
  settings: ArticleGeneratorSettings;
  onSettingsChange: (settings: ArticleGeneratorSettings) => void;
}) {
  const { corePhilosophy } = settings;

  const updateCorePhilosophy = (updates: Partial<typeof corePhilosophy>) => {
    onSettingsChange({
      ...settings,
      corePhilosophy: { ...corePhilosophy, ...updates },
    });
  };

  const updateIdeologicalSpectrum = (updates: Partial<typeof corePhilosophy.ideologicalSpectrum>) => {
    updateCorePhilosophy({
      ideologicalSpectrum: { ...corePhilosophy.ideologicalSpectrum, ...updates },
    });
  };

  const updateDriveKernel = (updates: Partial<typeof corePhilosophy.driveKernel>) => {
    updateCorePhilosophy({
      driveKernel: { ...corePhilosophy.driveKernel, ...updates },
    });
  };

  // 计算总比例，确保总和为100%
  const totalSpectrum = 
    corePhilosophy.ideologicalSpectrum.heterodoxRightWing +
    corePhilosophy.ideologicalSpectrum.orientalHistoriography +
    corePhilosophy.ideologicalSpectrum.greaterEastAsia;

  return (
    <div className="space-y-4">
      {/* 核心史观模式 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          核心史观模式
        </Label>
        <Select
          value={corePhilosophy.perspectiveMode}
          onValueChange={(value) => updateCorePhilosophy({ perspectiveMode: value as typeof corePhilosophy.perspectiveMode })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HISTORICAL_PERSPECTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 思想底色光谱 */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">思想底色光谱混合</Label>
        
        {/* 异端右翼内核 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>异端右翼内核</span>
            <span className="text-muted-foreground">{corePhilosophy.ideologicalSpectrum.heterodoxRightWing}%</span>
          </div>
          <Slider
            value={[corePhilosophy.ideologicalSpectrum.heterodoxRightWing]}
            onValueChange={([value]) => updateIdeologicalSpectrum({ heterodoxRightWing: value })}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* 东洋史学 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>东洋史学/结构分析框架</span>
            <span className="text-muted-foreground">{corePhilosophy.ideologicalSpectrum.orientalHistoriography}%</span>
          </div>
          <Slider
            value={[corePhilosophy.ideologicalSpectrum.orientalHistoriography]}
            onValueChange={([value]) => updateIdeologicalSpectrum({ orientalHistoriography: value })}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* 大东亚使命 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>大东亚/使命史观渲染</span>
            <span className="text-muted-foreground">{corePhilosophy.ideologicalSpectrum.greaterEastAsia}%</span>
          </div>
          <Slider
            value={[corePhilosophy.ideologicalSpectrum.greaterEastAsia]}
            onValueChange={([value]) => updateIdeologicalSpectrum({ greaterEastAsia: value })}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* 总和提示 */}
        <div className={`text-xs p-2 rounded ${totalSpectrum === 100 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          总和: {totalSpectrum}% {totalSpectrum !== 100 && '(建议调整为100%)'}
        </div>
      </div>

      {/* 驱动内核 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">驱动内核</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">理想驱动</span>
            <Switch
              checked={corePhilosophy.driveKernel.idealDriven}
              onCheckedChange={(checked) => updateDriveKernel({ idealDriven: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">恐惧驱动</span>
              <Badge variant="secondary" className="text-xs">强制</Badge>
            </div>
            <Switch
              checked={corePhilosophy.driveKernel.fearDriven}
              disabled
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">混合驱动</span>
            <Switch
              checked={corePhilosophy.driveKernel.mixedDriven}
              onCheckedChange={(checked) => updateDriveKernel({ mixedDriven: checked })}
            />
          </div>
        </div>
      </div>

      {/* 终极目标 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          终极目标
        </Label>
        <Select
          value={corePhilosophy.ultimateGoal}
          onValueChange={(value) => updateCorePhilosophy({ ultimateGoal: value as typeof corePhilosophy.ultimateGoal })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ULTIMATE_GOAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：叙事视角与角色设定
// ============================================================================

function CharacterSection({
  settings,
  onSettingsChange,
}: {
  settings: ArticleGeneratorSettings;
  onSettingsChange: (settings: ArticleGeneratorSettings) => void;
}) {
  const { character } = settings;

  const updateCharacter = (updates: Partial<typeof character>) => {
    onSettingsChange({
      ...settings,
      character: { ...character, ...updates },
    });
  };

  const toggleCharacterTag = (tagId: string) => {
    const newTags = character.characterTags.includes(tagId as typeof character.characterTags[number])
      ? character.characterTags.filter((t) => t !== tagId)
      : [...character.characterTags, tagId as typeof character.characterTags[number]];
    updateCharacter({ characterTags: newTags });
  };

  const toggleInformationCocoon = (cocoonId: string) => {
    const newCocoons = character.informationCocoon.includes(cocoonId as typeof character.informationCocoon[number])
      ? character.informationCocoon.filter((c) => c !== cocoonId)
      : [...character.informationCocoon, cocoonId as typeof character.informationCocoon[number]];
    updateCharacter({ informationCocoon: newCocoons });
  };

  return (
    <div className="space-y-4">
      {/* 人称与视角 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" />
          人称与视角
        </Label>
        <Select
          value={character.perspective}
          onValueChange={(value) => updateCharacter({ perspective: value as typeof character.perspective })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NARRATIVE_PERSPECTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 阵营/语境 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">阵营/语境</Label>
        <Select
          value={character.faction}
          onValueChange={(value) => updateCharacter({ faction: value as typeof character.faction })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 角色标签 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">角色标签（可多选）</Label>
        <div className="flex flex-wrap gap-2">
          {CHARACTER_TAG_OPTIONS.map((tag) => (
            <Badge
              key={tag.id}
              variant={character.characterTags.includes(tag.id as typeof character.characterTags[number]) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleCharacterTag(tag.id)}
            >
              {tag.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* 信息茧房 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">信息茧房设定（可多选）</Label>
        <div className="flex flex-wrap gap-2">
          {INFORMATION_COCOON_OPTIONS.map((cocoon) => (
            <Badge
              key={cocoon.id}
              variant={character.informationCocoon.includes(cocoon.id as typeof character.informationCocoon[number]) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleInformationCocoon(cocoon.id)}
            >
              {cocoon.label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* 文本输入区域 */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">具体恐惧</Label>
          <Textarea
            placeholder="例：帝国覆灭、文明被同化、阶级敌人颠覆..."
            value={character.specificFears}
            onChange={(e) => updateCharacter({ specificFears: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">宣称的理想</Label>
          <Textarea
            placeholder="例：建立「王道乐土」、实现「昭和维新」..."
            value={character.declaredIdeals}
            onChange={(e) => updateCharacter({ declaredIdeals: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">恐惧如何催生理性化路径</Label>
          <Textarea
            placeholder="例：为免于覆灭，必须夺取「生存空间」..."
            value={character.fearRationalizationPath}
            onChange={(e) => updateCharacter({ fearRationalizationPath: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">关键记忆闪回提示</Label>
          <Textarea
            placeholder="例：童年目睹的混乱、一次成功的冒险、崇拜的榜样..."
            value={character.keyMemoryFlashback}
            onChange={(e) => updateCharacter({ keyMemoryFlashback: e.target.value })}
            className="min-h-[80px] text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：叙事技法与结构控制
// ============================================================================

function NarrativeStructureSection({
  settings,
  onSettingsChange,
}: {
  settings: ArticleGeneratorSettings;
  onSettingsChange: (settings: ArticleGeneratorSettings) => void;
}) {
  const { narrativeStructure } = settings;

  const updateNarrativeStructure = (updates: Partial<typeof narrativeStructure>) => {
    onSettingsChange({
      ...settings,
      narrativeStructure: { ...narrativeStructure, ...updates },
    });
  };

  const updateTechniques = (updates: Partial<typeof narrativeStructure.techniques>) => {
    updateNarrativeStructure({
      techniques: { ...narrativeStructure.techniques, ...updates },
    });
  };

  const updateArgumentStrategy = (updates: Partial<typeof narrativeStructure.argumentStrategy>) => {
    updateNarrativeStructure({
      argumentStrategy: { ...narrativeStructure.argumentStrategy, ...updates },
    });
  };

  return (
    <div className="space-y-4">
      {/* 开端类型 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <PenTool className="w-4 h-4 text-green-500" />
          开端/切入点
        </Label>
        <Select
          value={narrativeStructure.openingType}
          onValueChange={(value) => updateNarrativeStructure({ openingType: value as typeof narrativeStructure.openingType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPENING_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="请简要描述切入点内容..."
          value={narrativeStructure.openingDescription}
          onChange={(e) => updateNarrativeStructure({ openingDescription: e.target.value })}
          className="min-h-[60px] text-sm"
        />
      </div>

      {/* 展开路径 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">主体展开路径</Label>
        <Select
          value={narrativeStructure.developmentPath}
          onValueChange={(value) => updateNarrativeStructure({ developmentPath: value as typeof narrativeStructure.developmentPath })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVELOPMENT_PATH_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 双线交织权重 */}
        {narrativeStructure.developmentPath === 'dual_thread_weave' && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>宏观线权重</span>
                <span className="text-muted-foreground">{narrativeStructure.macroWeight}%</span>
              </div>
              <Slider
                value={[narrativeStructure.macroWeight]}
                onValueChange={([value]) => updateNarrativeStructure({ macroWeight: value, microWeight: 100 - value })}
                max={100}
                step={10}
                className="w-full"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              微观线权重: {narrativeStructure.microWeight}%
            </div>
          </div>
        )}
      </div>

      {/* 叙事技法 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">叙事技法</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">门罗式细节穿刺</span>
              <p className="text-xs text-muted-foreground">在宏观论述中，随机插入极度微观的细节描写</p>
            </div>
            <Switch
              checked={narrativeStructure.techniques.enableMunroDetailPuncture}
              onCheckedChange={(checked) => updateTechniques({ enableMunroDetailPuncture: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">石黑一雄式闪回</span>
              <p className="text-xs text-muted-foreground">在角色决策压力最大时，触发记忆闪回</p>
            </div>
            <Switch
              checked={narrativeStructure.techniques.enableIshiguroFlashback}
              onCheckedChange={(checked) => updateTechniques({ enableIshiguroFlashback: checked })}
            />
          </div>
        </div>
      </div>

      {/* 论述策略 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">论述与说服策略</Label>
        <div className="space-y-2">
          {[
            { id: 'internalConsistency', label: '内部逻辑自洽', desc: '为角色的激进选择构建一套基于其世界观、看似严密的推理' },
            { id: 'emotionalMobilization', label: '情感动员与悲情渲染', desc: '使用崇高、悲壮的语言，描绘危机，激发使命感' },
            { id: 'exclusionUniqueness', label: '通过排除法确立唯一性', desc: '论证其他所有路径的不可行，凸显"别无选择"' },
            { id: 'showCostWithoutReflection', label: '展现代价，但不反思', desc: '冷静描述代价，但口吻是"必要之恶"或"伟大阵痛"' },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <span className="text-sm">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={narrativeStructure.argumentStrategy[item.id as keyof typeof narrativeStructure.argumentStrategy]}
                onCheckedChange={(checked) => updateArgumentStrategy({ [item.id]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 结尾类型 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">结尾/收束</Label>
        <Select
          value={narrativeStructure.endingType}
          onValueChange={(value) => updateNarrativeStructure({ endingType: value as typeof narrativeStructure.endingType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENDING_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm">呼应开篇意象</span>
          <Switch
            checked={narrativeStructure.echoOpening}
            onCheckedChange={(checked) => updateNarrativeStructure({ echoOpening: checked })}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：风格与输出控制
// ============================================================================

function StyleSection({
  settings,
  onSettingsChange,
}: {
  settings: ArticleGeneratorSettings;
  onSettingsChange: (settings: ArticleGeneratorSettings) => void;
}) {
  const { style } = settings;

  const updateStyle = (updates: Partial<typeof style>) => {
    onSettingsChange({
      ...settings,
      style: { ...style, ...updates },
    });
  };

  const toggleMetaphor = (metaphorId: string) => {
    const newPrefs = style.metaphorPreferences.includes(metaphorId as typeof style.metaphorPreferences[number])
      ? style.metaphorPreferences.filter((m) => m !== metaphorId)
      : [...style.metaphorPreferences, metaphorId as typeof style.metaphorPreferences[number]];
    updateStyle({ metaphorPreferences: newPrefs });
  };

  return (
    <div className="space-y-4">
      {/* 文白比例 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-500" />
          文白比例
        </Label>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>文言 {style.classicalRatio.classical}%</span>
            <span>白话 {style.classicalRatio.vernacular}%</span>
          </div>
          <Slider
            value={[style.classicalRatio.classical]}
            onValueChange={([value]) => updateStyle({
              classicalRatio: { classical: value, vernacular: 100 - value },
            })}
            max={100}
            step={10}
            className="w-full"
          />
        </div>
      </div>

      {/* 比喻系统偏好 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">比喻系统偏好（可多选）</Label>
        <div className="grid grid-cols-2 gap-2">
          {METAPHOR_PREFERENCE_OPTIONS.map((meta) => (
            <div
              key={meta.id}
              className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                style.metaphorPreferences.includes(meta.id as typeof style.metaphorPreferences[number])
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleMetaphor(meta.id)}
            >
              <div className="text-sm font-medium">{meta.label}</div>
              <div className="text-xs text-muted-foreground">{meta.examples}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 文献典故植入 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">文献与典故植入</Label>
            <p className="text-xs text-muted-foreground">自然化用思想家言论、历史文献、文学作品句子</p>
          </div>
          <Switch
            checked={style.embedLiteraryAllusions}
            onCheckedChange={(checked) => updateStyle({ embedLiteraryAllusions: checked })}
          />
        </div>
        {style.embedLiteraryAllusions && (
          <Textarea
            placeholder="请指定1-2个方向（例：石原莞尔论述、李煜诗词、马基雅维利观点）..."
            value={style.literaryAllusionDirections}
            onChange={(e) => updateStyle({ literaryAllusionDirections: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        )}
      </div>

      {/* 文章长度 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">目标文章长度（字数）</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={style.targetLength}
            onChange={(e) => updateStyle({ targetLength: parseInt(e.target.value) || 2000 })}
            className="w-32"
            min={500}
            max={10000}
            step={100}
          />
          <span className="text-sm text-muted-foreground">字</span>
        </div>
        <div className="flex gap-2">
          {[1500, 2000, 2500, 3000].map((len) => (
            <Badge
              key={len}
              variant={style.targetLength === len ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => updateStyle({ targetLength: len })}
            >
              {len}字
            </Badge>
          ))}
        </div>
      </div>

      {/* AI 模型选择 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          AI 模型
        </Label>
        <Select
          value={settings.aiModel}
          onValueChange={(value) => onSettingsChange({ ...settings, aiModel: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doubao-seed-2-0-pro-260115">Doubao Pro（推荐）</SelectItem>
            <SelectItem value="doubao-seed-2-0-lite-260115">Doubao Lite（快速）</SelectItem>
            <SelectItem value="kimi-k2-5-260127">Kimi K2.5（长文本）</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function ArticleGenerator({
  settings,
  onSettingsChange,
  onGenerate,
  isLoading,
  outputText,
  onCopy,
  copied,
}: ArticleGeneratorProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    corePhilosophy: true,
    character: true,
    narrativeStructure: false,
    style: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const resetToDefault = useCallback(() => {
    onSettingsChange(DEFAULT_ARTICLE_GENERATOR_SETTINGS);
  }, [onSettingsChange]);

  const sections = [
    {
      id: 'corePhilosophy',
      title: '核心理念预设',
      description: '史观模式、思想底色、驱动内核',
      icon: Brain,
      color: 'purple',
      component: <CorePhilosophySection settings={settings} onSettingsChange={onSettingsChange} />,
    },
    {
      id: 'character',
      title: '叙事视角与角色设定',
      description: '人称视角、阵营立场、信息茧房',
      icon: User,
      color: 'blue',
      component: <CharacterSection settings={settings} onSettingsChange={onSettingsChange} />,
    },
    {
      id: 'narrativeStructure',
      title: '叙事技法与结构控制',
      description: '开端展开、技法策略、结尾收束',
      icon: PenTool,
      color: 'green',
      component: <NarrativeStructureSection settings={settings} onSettingsChange={onSettingsChange} />,
    },
    {
      id: 'style',
      title: '风格与输出控制',
      description: '文白比例、比喻系统、文章长度',
      icon: Palette,
      color: 'pink',
      component: <StyleSection settings={settings} onSettingsChange={onSettingsChange} />,
    },
  ];

  return (
    <div className="space-y-3">
      {/* 头部操作区 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {settings.character.faction === 'japanese_right_wing' ? '日方' :
             settings.character.faction === 'chinese_resistance' ? '中方' :
             settings.character.faction === 'manchukuo_puppet' ? '伪满' :
             settings.character.faction === 'soviet_left_wing' ? '苏俄' : '西方'}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {settings.style.targetLength}字
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefault}
          className="h-7 px-2 text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          重置
        </Button>
      </div>

      {/* 配置面板 */}
      <ScrollArea className="h-[calc(100vh-280px)] pr-2">
        <div className="space-y-2">
          {sections.map((section) => (
            <Collapsible
              key={section.id}
              open={openSections[section.id]}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors ${openSections[section.id] ? 'bg-slate-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-${section.color}-100 text-${section.color}-600`}>
                      <section.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{section.title}</div>
                      <div className="text-xs text-muted-foreground">{section.description}</div>
                    </div>
                  </div>
                  {openSections[section.id] ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 border-x border-b rounded-b-lg bg-white">
                  {section.component}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* 生成按钮 */}
      <div className="pt-3 border-t">
        <Button
          onClick={onGenerate}
          disabled={isLoading || !settings.character.specificFears || !settings.character.declaredIdeals}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-10"
        >
          {isLoading ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成文章
            </>
          )}
        </Button>
        {!settings.character.specificFears && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            请先填写"具体恐惧"和"宣称的理想"
          </p>
        )}
      </div>
    </div>
  );
}

export default ArticleGenerator;
