/**
 * ============================================================================
 * 模板存储组件
 * ============================================================================
 * 
 * 资源库中的模板存储功能：解析文章保存为模板、模板列表管理、导入导出
 */

"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Plus, Trash2, Download, Upload, Loader2,
  Database, Sparkles, Copy, Check
} from "lucide-react";

import type { ArticleTemplate } from "@/types";
import { PRESET_TEMPLATES, createDefaultTemplate } from "@/types";

// ============================================================================
// 存储键
// ============================================================================

const STORAGE_KEY = "article-templates-v1";

// ============================================================================
// 组件 Props
// ============================================================================

interface TemplateStorageProps {
  onTemplatesChange?: (templates: ArticleTemplate[]) => void;
}

// ============================================================================
// 模板卡片（简化版，只显示存储信息）
// ============================================================================

function TemplateStorageCard({
  template,
  onExport,
  onDelete,
}: {
  template: ArticleTemplate;
  onExport: () => void;
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

  return (
    <div className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{template.metadata.name}</span>
            {template.metadata.genre && (
              <Badge variant="outline" className="text-xs">
                {genreLabels[template.metadata.genre] || template.metadata.genre}
              </Badge>
            )}
          </div>
          {template.metadata.styleTags && template.metadata.styleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {template.metadata.styleTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>文言{(template.vocabulary.classicalRatio * 100).toFixed(0)}%</span>
            <span>句长{template.sentence.avgLength}字</span>
            <span>结构:{template.chapter.structure}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            创建于 {new Date(template.metadata.parsedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onExport}
          >
            <Download className="w-3 h-3 mr-1" />
            导出
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function TemplateStorage({ onTemplatesChange }: TemplateStorageProps) {
  // 模板列表
  const [templates, setTemplates] = useState<ArticleTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return [...PRESET_TEMPLATES, ...parsed];
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
    return PRESET_TEMPLATES;
  });

  // 解析状态
  const [parseText, setParseText] = useState("");
  const [parseName, setParseName] = useState("");
  const [parsing, setParsing] = useState(false);

  // 保存到 localStorage
  const saveTemplates = useCallback((newTemplates: ArticleTemplate[]) => {
    const customTemplates = newTemplates.filter(
      (t) => !PRESET_TEMPLATES.find((p) => p.metadata.id === t.metadata.id)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
    setTemplates(newTemplates);
    onTemplatesChange?.(newTemplates);
  }, [onTemplatesChange]);

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
        saveTemplates([...templates, data.template]);
        setParseText("");
        setParseName("");
      } else {
        alert(data.error || "解析失败");
      }
    } catch (error) {
      console.error("Parse error:", error);
      alert("解析失败");
    } finally {
      setParsing(false);
    }
  }, [parseText, parseName, templates, saveTemplates]);

  // 导出单个模板
  const handleExportOne = useCallback((template: ArticleTemplate) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${template.metadata.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // 导出所有模板
  const handleExportAll = useCallback(() => {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      templates: templates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `templates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [templates]);

  // 导入模板
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 支持单个模板或模板数组
      const imported = Array.isArray(data.templates) ? data.templates : [data];
      
      // 验证模板结构
      const validTemplates = imported.filter((t: any) => t.metadata && t.vocabulary);
      
      if (validTemplates.length > 0) {
        saveTemplates([...templates, ...validTemplates]);
        alert(`成功导入 ${validTemplates.length} 个模板`);
      } else {
        alert("未找到有效的模板数据");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("导入失败，请检查文件格式");
    }

    // 重置 input
    e.target.value = "";
  }, [templates, saveTemplates]);

  // 删除模板
  const handleDelete = useCallback((id: string) => {
    // 不允许删除预置模板
    if (PRESET_TEMPLATES.find((t) => t.metadata.id === id)) {
      alert("预置模板不能删除");
      return;
    }
    saveTemplates(templates.filter((t) => t.metadata.id !== id));
  }, [templates, saveTemplates]);

  // 预置模板数量
  const presetCount = PRESET_TEMPLATES.length;
  const customCount = templates.length - presetCount;

  return (
    <div className="space-y-4">
      {/* 头部操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{templates.length} 个模板</Badge>
          <span className="text-xs text-muted-foreground">
            ({presetCount} 预置 · {customCount} 自定义)
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            导出全部
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                导入
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左侧：解析新模板 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-500" />
              <span className="font-medium text-sm">解析新模板</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">模板名称</Label>
              <Input
                placeholder="如：鲁迅风格散文"
                value={parseName}
                onChange={(e) => setParseName(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">粘贴文章内容</Label>
              <Textarea
                placeholder="粘贴一篇文章，系统将自动解析其写作风格..."
                value={parseText}
                onChange={(e) => setParseText(e.target.value)}
                className="min-h-[150px] text-sm"
              />
              <div className="text-xs text-muted-foreground text-right">
                {parseText.length} 字 {parseText.length < 100 && "(至少100字)"}
              </div>
            </div>
            <Button
              onClick={handleParse}
              disabled={!parseText.trim() || parseText.length < 100 || parsing}
              className="w-full"
              size="sm"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  解析并保存
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 右侧：模板列表 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm">已存储模板</span>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {templates.map((template) => (
                  <TemplateStorageCard
                    key={template.metadata.id}
                    template={template}
                    onExport={() => handleExportOne(template)}
                    onDelete={
                      !PRESET_TEMPLATES.find((t) => t.metadata.id === template.metadata.id)
                        ? () => handleDelete(template.metadata.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TemplateStorage;
