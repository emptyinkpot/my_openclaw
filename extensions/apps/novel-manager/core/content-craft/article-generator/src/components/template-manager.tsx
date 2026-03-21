/**
 * ============================================================================
 * 模板管理组件
 * ============================================================================
 * 
 * 支持模板库浏览、文章解析为模板、基于模板生成新文章
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown, ChevronUp, FileText, Sparkles, Download, Upload,
  BookOpen, Settings, Zap, Copy, Check, Loader2, Plus, Trash2,
  BarChart3, LineChart, Target
} from "lucide-react";

import type {
  ArticleTemplate,
  StyleFingerprint,
  VocabularyLayerParams,
  SentenceLayerParams,
  ParagraphLayerParams,
  ChapterLayerParams,
} from "@/types";
import {
  PRESET_TEMPLATES,
  createDefaultTemplate,
  DEFAULT_STYLE_FINGERPRINT,
} from "@/types";

// ============================================================================
// 组件 Props
// ============================================================================

interface TemplateManagerProps {
  onSelectTemplate?: (template: ArticleTemplate) => void;
  onGenerateFromTemplate?: (template: ArticleTemplate, topic: string, keyPoints: string[]) => void;
}

// ============================================================================
// 风格指纹编辑器
// ============================================================================

function StyleFingerprintEditor({
  fingerprint,
  onChange,
}: {
  fingerprint: StyleFingerprint;
  onChange: (fp: StyleFingerprint) => void;
}) {
  const dimensions = [
    { key: 'rationalEmotional', label: '理性-感性', left: '理性', right: '感性' },
    { key: 'conciseElaborate', label: '简洁-繁复', left: '简洁', right: '繁复' },
    { key: 'directImplicit', label: '直白-含蓄', left: '直白', right: '含蓄' },
    { key: 'objectiveSubjective', label: '客观-主观', left: '客观', right: '主观' },
    { key: 'classicalModern', label: '古典-现代', left: '古典', right: '现代' },
    { key: 'seriousPlayful', label: '严肃-戏谑', left: '严肃', right: '戏谑' },
    { key: 'tenseRelaxed', label: '紧凑-舒缓', left: '紧凑', right: '舒缓' },
    { key: 'concreteAbstract', label: '具体-抽象', left: '具体', right: '抽象' },
  ] as const;

  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <div key={dim.key} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{dim.left}</span>
            <span className="font-medium">{dim.label}</span>
            <span className="text-muted-foreground">{dim.right}</span>
          </div>
          <Slider
            value={[fingerprint[dim.key] * 100]}
            onValueChange={([value]) => {
              onChange({
                ...fingerprint,
                [dim.key]: value / 100,
              });
            }}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 模板卡片
// ============================================================================

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onDelete,
}: {
  template: ArticleTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const genreLabels: Record<string, string> = {
    novel: '小说',
    essay: '散文',
    paper: '论文',
    news: '新闻',
    poetry: '诗歌',
    prose: '随笔',
  };

  const difficultyLabels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-slate-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{template.metadata.name}</span>
            {template.metadata.genre && (
              <Badge variant="outline" className="text-xs">
                {genreLabels[template.metadata.genre] || template.metadata.genre}
              </Badge>
            )}
          </div>
          {template.metadata.styleTags && template.metadata.styleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {template.metadata.styleTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>文言{(template.vocabulary.classicalRatio * 100).toFixed(0)}%</span>
            <span>·</span>
            <span>句长{template.sentence.avgLength}字</span>
            {template.metadata.difficulty && (
              <>
                <span>·</span>
                <span>{difficultyLabels[template.metadata.difficulty]}</span>
              </>
            )}
          </div>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 风格雷达图（简化版）
// ============================================================================

function StyleRadarChart({ fingerprint }: { fingerprint: StyleFingerprint }) {
  const dimensions = [
    { key: 'rationalEmotional', label: '感性' },
    { key: 'conciseElaborate', label: '繁复' },
    { key: 'classicalModern', label: '现代' },
    { key: 'seriousPlayful', label: '戏谑' },
    { key: 'tenseRelaxed', label: '舒缓' },
    { key: 'concreteAbstract', label: '抽象' },
    { key: 'directImplicit', label: '含蓄' },
    { key: 'objectiveSubjective', label: '主观' },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-2">
      {dimensions.map((dim) => (
        <div key={dim.key} className="text-center">
          <div className="text-xs text-muted-foreground mb-1">{dim.label}</div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: `${fingerprint[dim.key] * 100}%` }}
            />
          </div>
          <div className="text-xs font-mono mt-1">{(fingerprint[dim.key] * 100).toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function TemplateManager({
  onSelectTemplate,
  onGenerateFromTemplate,
}: TemplateManagerProps) {
  // 模板列表
  const [templates, setTemplates] = useState<ArticleTemplate[]>(PRESET_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ArticleTemplate | null>(null);
  const [editingFingerprint, setEditingFingerprint] = useState<StyleFingerprint>(DEFAULT_STYLE_FINGERPRINT);

  // 解析状态
  const [parseText, setParseText] = useState("");
  const [parseName, setParseName] = useState("");
  const [parsing, setParsing] = useState(false);

  // 生成状态
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateKeyPoints, setGenerateKeyPoints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);

  // 当前编辑标签页
  const [activeTab, setActiveTab] = useState("library");

  // 选择模板时同步指纹
  useEffect(() => {
    if (selectedTemplate) {
      setEditingFingerprint(selectedTemplate.styleFingerprint);
    }
  }, [selectedTemplate]);

  // 解析文章为模板
  const handleParse = useCallback(async () => {
    if (!parseText.trim()) return;

    setParsing(true);
    try {
      const response = await fetch("/api/article-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: parseText,
          templateName: parseName || "自定义模板",
        }),
      });

      const data = await response.json();
      if (data.success && data.template) {
        setTemplates((prev) => [...prev, data.template]);
        setSelectedTemplate(data.template);
        setParseText("");
        setParseName("");
        setActiveTab("library");
      } else {
        alert(data.error || "解析失败");
      }
    } catch (error) {
      console.error("Parse error:", error);
      alert("解析失败");
    } finally {
      setParsing(false);
    }
  }, [parseText, parseName]);

  // 基于模板生成
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !generateTopic.trim()) return;

    setGenerating(true);
    setGeneratedText("");

    try {
      const response = await fetch("/api/template-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: {
            ...selectedTemplate,
            styleFingerprint: editingFingerprint,
          },
          topic: generateTopic,
          keyPoints: generateKeyPoints.split('\n').filter(Boolean),
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
  }, [selectedTemplate, editingFingerprint, generateTopic, generateKeyPoints]);

  // 复制生成的文本
  const handleCopy = useCallback(async () => {
    if (generatedText) {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedText]);

  // 删除自定义模板
  const handleDeleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.metadata.id !== id));
    if (selectedTemplate?.metadata.id === id) {
      setSelectedTemplate(null);
    }
  }, [selectedTemplate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 左侧：模板库 */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-sm">模板库</span>
                <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.metadata.id}
                    template={template}
                    isSelected={selectedTemplate?.metadata.id === template.metadata.id}
                    onSelect={() => {
                      setSelectedTemplate(template);
                      onSelectTemplate?.(template);
                    }}
                    onDelete={
                      !PRESET_TEMPLATES.find((t) => t.metadata.id === template.metadata.id)
                        ? () => handleDeleteTemplate(template.metadata.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 右侧：模板详情与操作 */}
      <div className="lg:col-span-2 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="library" className="text-sm">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              模板详情
            </TabsTrigger>
            <TabsTrigger value="parse" className="text-sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              解析文章
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              生成文章
            </TabsTrigger>
          </TabsList>

          {/* 模板详情 */}
          <TabsContent value="library" className="space-y-4 mt-4">
            {selectedTemplate ? (
              <>
                {/* 风格指纹 */}
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-sm">风格指纹</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <StyleRadarChart fingerprint={editingFingerprint} />
                    <Separator className="my-4" />
                    <StyleFingerprintEditor
                      fingerprint={editingFingerprint}
                      onChange={setEditingFingerprint}
                    />
                  </CardContent>
                </Card>

                {/* 参数摘要 */}
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4 border-b">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm">参数摘要</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">词汇层</div>
                        <div className="mt-1 space-y-1">
                          <div>复杂度: {(selectedTemplate.vocabulary.complexity * 100).toFixed(0)}%</div>
                          <div>文言比例: {(selectedTemplate.vocabulary.classicalRatio * 100).toFixed(0)}%</div>
                          <div>比喻密度: {selectedTemplate.vocabulary.metaphorDensity}/千字</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">句子层</div>
                        <div className="mt-1 space-y-1">
                          <div>平均句长: {selectedTemplate.sentence.avgLength}字</div>
                          <div>疑问句: {(selectedTemplate.sentence.questionRatio * 100).toFixed(0)}%</div>
                          <div>排比频率: {(selectedTemplate.sentence.parallelismFrequency * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">段落层</div>
                        <div className="mt-1 space-y-1">
                          <div>平均段长: {selectedTemplate.paragraph.avgLength}字</div>
                          <div>论述段: {(selectedTemplate.paragraph.functionDistribution.argument * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">篇章层</div>
                        <div className="mt-1 space-y-1">
                          <div>结构: {selectedTemplate.chapter.structure}</div>
                          <div>视角: {selectedTemplate.chapter.perspective.main}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 mb-3 opacity-30" />
                <span className="text-sm">请从左侧选择一个模板</span>
              </div>
            )}
          </TabsContent>

          {/* 解析文章 */}
          <TabsContent value="parse" className="space-y-4 mt-4">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm">解析文章为模板</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">模板名称（可选）</Label>
                  <Input
                    placeholder="输入模板名称，如：鲁迅风格散文"
                    value={parseName}
                    onChange={(e) => setParseName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">粘贴文章内容</Label>
                  <Textarea
                    placeholder="粘贴一篇文章，系统将自动解析其写作风格和结构特征..."
                    value={parseText}
                    onChange={(e) => setParseText(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {parseText.length} 字
                  </div>
                </div>
                <Button
                  onClick={handleParse}
                  disabled={!parseText.trim() || parsing}
                  className="w-full"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      开始解析
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 生成文章 */}
          <TabsContent value="generate" className="space-y-4 mt-4">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">
                    {selectedTemplate ? `基于「${selectedTemplate.metadata.name}」生成` : '生成文章'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">文章主题 *</Label>
                  <Input
                    placeholder="输入文章主题，如：论科技对人性的影响"
                    value={generateTopic}
                    onChange={(e) => setGenerateTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">内容要点（每行一个）</Label>
                  <Textarea
                    placeholder="输入要点，每行一个，如：&#10;科技带来便利&#10;科技导致疏离&#10;需要平衡"
                    value={generateKeyPoints}
                    onChange={(e) => setGenerateKeyPoints(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedTemplate || !generateTopic.trim() || generating}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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

                {/* 生成结果 */}
                {generatedText && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">生成结果</span>
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
                    </div>
                    <div className="max-h-[300px] overflow-y-auto rounded-lg border bg-slate-50 p-3">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{generatedText}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TemplateManager;
