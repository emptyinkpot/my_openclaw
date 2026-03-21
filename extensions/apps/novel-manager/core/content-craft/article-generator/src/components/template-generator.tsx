/**
 * ============================================================================
 * 模板生成器组件
 * ============================================================================
 * 
 * 从模板库选择模板，结合资源库生成新文章
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Sparkles, Loader2, Copy, Check, Database,
  ChevronDown, ChevronUp, Target, Settings
} from "lucide-react";

import type {
  ArticleTemplate,
  StyleFingerprint,
  ResourceItem,
  BannedWordItem,
} from "@/types";
import { PRESET_TEMPLATES, DEFAULT_STYLE_FINGERPRINT } from "@/types";

// ============================================================================
// 存储键
// ============================================================================

const STORAGE_KEY = "article-templates-v1";

// ============================================================================
// 组件 Props
// ============================================================================

interface TemplateGeneratorProps {
  vocabularyItems?: ResourceItem[];
  bannedWordsItems?: BannedWordItem[];
}

// ============================================================================
// 风格调整面板
// ============================================================================

function StyleAdjustPanel({
  fingerprint,
  onChange,
}: {
  fingerprint: StyleFingerprint;
  onChange: (fp: StyleFingerprint) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const dimensions = [
    { key: 'rationalEmotional', label: '感性程度' },
    { key: 'conciseElaborate', label: '繁复程度' },
    { key: 'classicalModern', label: '现代程度' },
    { key: 'seriousPlayful', label: '戏谑程度' },
  ] as const;

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">风格微调</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      {isOpen && (
        <div className="p-3 border-t space-y-2">
          {dimensions.map((dim) => (
            <div key={dim.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{dim.label}</span>
                <span>{(fingerprint[dim.key] * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[fingerprint[dim.key] * 100]}
                onValueChange={([value]) => {
                  onChange({ ...fingerprint, [dim.key]: value / 100 });
                }}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function TemplateGenerator({
  vocabularyItems = [],
  bannedWordsItems = [],
}: TemplateGeneratorProps) {
  // 模板列表
  const [templates, setTemplates] = useState<ArticleTemplate[]>(PRESET_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ArticleTemplate | null>(null);
  const [adjustedFingerprint, setAdjustedFingerprint] = useState<StyleFingerprint>(DEFAULT_STYLE_FINGERPRINT);

  // 生成参数
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [targetLength, setTargetLength] = useState(2000);

  // 生成状态
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);

  // 加载存储的模板
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const customTemplates = JSON.parse(saved);
        setTemplates([...PRESET_TEMPLATES, ...customTemplates]);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }, []);

  // 选择模板时同步风格指纹
  useEffect(() => {
    if (selectedTemplate) {
      setAdjustedFingerprint(selectedTemplate.styleFingerprint);
    }
  }, [selectedTemplate]);

  // 生成文章
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !topic.trim()) return;

    setGenerating(true);
    setGeneratedText("");

    try {
      const response = await fetch("/api/template-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            ...selectedTemplate,
            styleFingerprint: adjustedFingerprint,
          },
          topic,
          keyPoints: keyPoints.split('\n').filter(Boolean),
          targetLength,
        }),
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
              if (data.text) {
                setGeneratedText(data.text);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error("Generate error:", error);
      alert("生成失败");
    } finally {
      setGenerating(false);
    }
  }, [selectedTemplate, adjustedFingerprint, topic, keyPoints, targetLength]);

  // 复制
  const handleCopy = useCallback(async () => {
    if (generatedText) {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedText]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* 左侧：配置面板 */}
      <div className="lg:col-span-2 space-y-4">
        {/* 模板选择 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm">选择模板</span>
              {selectedTemplate && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTemplate.metadata.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <Select
              value={selectedTemplate?.metadata.id || ""}
              onValueChange={(id) => {
                const t = templates.find((t) => t.metadata.id === id);
                setSelectedTemplate(t || null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择一个模板..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.metadata.id} value={t.metadata.id}>
                    <div className="flex items-center gap-2">
                      <span>{t.metadata.name}</span>
                      {t.metadata.styleTags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 模板预览 */}
            {selectedTemplate && (
              <div className="mt-3 p-2 bg-slate-50 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">文言比例</span>
                  <span>{(selectedTemplate.vocabulary.classicalRatio * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均句长</span>
                  <span>{selectedTemplate.sentence.avgLength}字</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">篇章结构</span>
                  <span>{selectedTemplate.chapter.structure}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 内容配置 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="font-medium text-sm">内容配置</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">文章主题 *</Label>
              <Input
                placeholder="如：论科技对人性的影响"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">内容要点（每行一个）</Label>
              <Textarea
                placeholder="科技带来便利&#10;科技导致疏离&#10;需要平衡"
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">目标字数</Label>
              <div className="flex gap-2">
                {[1500, 2000, 2500, 3000].map((len) => (
                  <Badge
                    key={len}
                    variant={targetLength === len ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setTargetLength(len)}
                  >
                    {len}字
                  </Badge>
                ))}
              </div>
            </div>

            {/* 风格微调 */}
            {selectedTemplate && (
              <StyleAdjustPanel
                fingerprint={adjustedFingerprint}
                onChange={setAdjustedFingerprint}
              />
            )}

            {/* 资源库调用提示 */}
            {(vocabularyItems.length > 0 || bannedWordsItems.length > 0) && (
              <div className="p-2 bg-purple-50 rounded text-xs">
                <div className="flex items-center gap-1 text-purple-600 font-medium mb-1">
                  <Database className="w-3 h-3" />
                  资源库已关联
                </div>
                <div className="text-purple-500">
                  词汇库 {vocabularyItems.length} 条 · 禁用词 {bannedWordsItems.length} 条
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedTemplate || !topic.trim() || generating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
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
          </CardContent>
        </Card>
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
            <div className="min-h-[450px] max-h-[calc(100vh-300px)] overflow-y-auto rounded-lg border bg-slate-50/50 dark:bg-slate-800/30 p-4">
              {generatedText ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{generatedText}</div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
                  <FileText className="w-10 h-10 mb-3 opacity-30" />
                  <span className="text-sm">选择模板并输入主题后生成</span>
                  <span className="text-xs mt-1">系统将按模板风格创作新文章</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TemplateGenerator;
