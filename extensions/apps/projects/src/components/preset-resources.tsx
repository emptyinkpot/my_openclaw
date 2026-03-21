/**
 * ============================================================================
 * 预置资源库组件
 * ============================================================================
 * 
 * 展示和导入预置的词汇库、禁用词库等资源
 * 增量式集成，不影响现有资源管理功能
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Download,
  Loader2,
  BookOpen,
  Shield,
  PenTool,
  Globe,
  GraduationCap,
  Check,
  ChevronRight,
} from "lucide-react";

// ============================================================================
// 类型定义
// ============================================================================

interface ResourceCategory {
  name: string;
  description: string;
  count: number;
  sample: Array<{
    original?: string;
    synonyms?: string[];
    modern?: string;
    literary?: string;
    phrase?: string;
    reason?: string;
    alternatives?: string[];
    slang?: string;
    formal?: string;
    informal?: string;
    formal_formal?: string;
  }>;
}

interface PresetResourcesData {
  stats: {
    synonymVocabulary: number;
    literaryVocabulary: number;
    aiCharacteristicWords: number;
    internetSlang: number;
    academicExpressions: number;
    total: number;
  };
  categories: Record<string, ResourceCategory>;
}

// ============================================================================
// 图标映射
// ============================================================================

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  synonym: BookOpen,
  literary: PenTool,
  aiWords: Shield,
  slang: Globe,
  academic: GraduationCap,
};

const CATEGORY_COLORS: Record<string, string> = {
  synonym: "text-blue-500",
  literary: "text-purple-500",
  aiWords: "text-red-500",
  slang: "text-orange-500",
  academic: "text-green-500",
};

// ============================================================================
// 主组件
// ============================================================================

interface PresetResourcesProps {
  onImport?: (data: {
    vocabulary: Array<{ content: string; type: string; category: string; note?: string }>;
    bannedWords: Array<{ content: string; type: string; category: string; reason: string; alternative?: string }>;
  }) => Promise<void>;
}

export function PresetResources({ onImport }: PresetResourcesProps) {
  const [data, setData] = useState<PresetResourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // 加载预置资源预览
  useEffect(() => {
    fetch('/api/preset-resources?format=preview')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result);
        }
      })
      .catch(err => console.error('Failed to load preset resources:', err))
      .finally(() => setLoading(false));
  }, []);

  // 切换分类选择
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // 执行导入
  const handleImport = useCallback(async () => {
    if (!onImport || selectedCategories.length === 0) return;

    setImporting(true);
    setImportSuccess(false);

    try {
      const response = await fetch('/api/preset-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: selectedCategories }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 调用父组件的导入函数
        await onImport({
          vocabulary: result.data.vocabulary || [],
          bannedWords: result.data.bannedWords || [],
        });
        setImportSuccess(true);
        setTimeout(() => {
          setShowImportDialog(false);
          setImportSuccess(false);
          setSelectedCategories([]);
        }, 1500);
      }
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  }, [onImport, selectedCategories]);

  // 全选/取消全选
  const toggleAll = useCallback(() => {
    if (!data) return;
    const allCategories = Object.keys(data.categories);
    if (selectedCategories.length === allCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(allCategories);
    }
  }, [data, selectedCategories.length]);

  // ==================== 渲染 ====================

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">加载预置资源...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-sm">预置资源库</span>
            <Badge variant="secondary" className="text-xs">
              {data.stats.total} 条
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowImportDialog(true)}
          >
            <Download className="w-3 h-3 mr-1" />
            导入资源
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-3">
          精选高质量词汇替换库、AI特征词识别库等，一键导入增强润色效果
        </p>

        {/* 资源分类列表 */}
        <div className="space-y-2">
          {Object.entries(data.categories).map(([id, category]) => {
            const Icon = CATEGORY_ICONS[id] || BookOpen;
            const colorClass = CATEGORY_COLORS[id] || "text-gray-500";

            return (
              <div
                key={id}
                className="p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => setShowImportDialog(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <span className="text-sm font-medium">{category.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {category.count} 条
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {category.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>导入预置资源</DialogTitle>
            <DialogDescription>
              选择要导入的资源分类，资源将添加到现有库中（不会覆盖已有数据）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 全选按钮 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">选择资源分类</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={toggleAll}
              >
                {selectedCategories.length === Object.keys(data.categories).length
                  ? '取消全选'
                  : '全选'}
              </Button>
            </div>

            {/* 分类选择 */}
            <div className="space-y-2">
              {Object.entries(data.categories).map(([id, category]) => {
                const Icon = CATEGORY_ICONS[id] || BookOpen;
                const colorClass = CATEGORY_COLORS[id] || "text-gray-500";

                return (
                  <div
                    key={id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCategories.includes(id)
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                        : 'hover:border-slate-300'
                    }`}
                    onClick={() => toggleCategory(id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCategories.includes(id)}
                        onCheckedChange={() => toggleCategory(id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${colorClass}`} />
                          <span className="text-sm font-medium">{category.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {category.count} 条
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {category.description}
                        </p>
                        {/* 示例 */}
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          示例：
                          {category.sample.slice(0, 2).map((s, i) => (
                            <span key={i} className="ml-1 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              {s.original || s.modern || s.phrase || s.slang || s.informal}
                              →
                              {s.synonyms?.[0] || s.literary || s.alternatives?.[0] || s.formal || s.formal_formal}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={importing}
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedCategories.length === 0}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {importSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  导入成功
                </>
              ) : importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  导入 ({selectedCategories.length} 类)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PresetResources;
