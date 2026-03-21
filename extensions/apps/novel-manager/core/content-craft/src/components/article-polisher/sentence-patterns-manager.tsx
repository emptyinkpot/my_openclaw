/**
 * ============================================================================
 * 句子逻辑禁用库管理组件
 * ============================================================================
 * 
 * 核心功能：
 * 1. 管理禁用句式逻辑列表（增删改查）
 * 2. AI智能生成原因和多个替换建议
 * 3. AI智能分析文本中的问题表述
 * 
 * 设计理念：
 * - 支持禁用特定的句式逻辑表达
 * - 支持多个替换建议，根据上下文选择
 * - AI 智能生成原因和替换建议
 */

"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Trash2, Download, Upload, Ban, Check, Edit3, Search,
  ChevronLeft, ChevronRight, Loader2, X, Cloud, CloudOff, Sparkles, Brain, Wand2
} from "lucide-react";

import type { SentencePatternItem } from "@/types";

// ============================================================================
// API 客户端
// ============================================================================

const Api = {
  /** 获取所有禁用句式 */
  getAll: async (): Promise<SentencePatternItem[]> => {
    try {
      const res = await fetch('/api/sentence-patterns');
      const data = await res.json();
      return data.success ? data.items : [];
    } catch {
      return [];
    }
  },

  /** 获取统计信息 */
  getStats: async () => {
    try {
      const res = await fetch('/api/sentence-patterns?action=stats');
      const data = await res.json();
      return data.success ? data.stats : null;
    } catch {
      return null;
    }
  },

  /** 批量添加 */
  addItems: async (items: Omit<SentencePatternItem, 'id' | 'createdAt'>[]): Promise<{ success: boolean; added: number }> => {
    try {
      const res = await fetch('/api/sentence-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', items }),
      });
      const data = await res.json();
      return { success: data.success, added: data.added || 0 };
    } catch {
      return { success: false, added: 0 };
    }
  },

  /** 去重 */
  deduplicate: async (): Promise<{ success: boolean; removed: number; message: string }> => {
    try {
      const res = await fetch('/api/sentence-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deduplicate' }),
      });
      const data = await res.json();
      return data.success ? data : { success: false, removed: 0, message: '去重失败' };
    } catch {
      return { success: false, removed: 0, message: '去重操作失败' };
    }
  },

  /** 合并（合并相同内容的替换词）*/
  merge: async (): Promise<{ success: boolean; merged: number; removed: number; message: string }> => {
    try {
      const res = await fetch('/api/sentence-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge' }),
      });
      const data = await res.json();
      return data.success ? data : { success: false, merged: 0, removed: 0, message: '合并失败' };
    } catch {
      return { success: false, merged: 0, removed: 0, message: '合并操作失败' };
    }
  },

  /** 更新 */
  update: async (id: string, updates: Partial<SentencePatternItem>): Promise<boolean> => {
    try {
      const res = await fetch('/api/sentence-patterns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  },

  /** 删除 */
  delete: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sentence-patterns?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  },

  /** AI智能生成原因和替换建议 */
  aiGenerate: async (contents: string[]): Promise<{ 
    success: boolean; 
    results?: Array<{ content: string; reason: string; replacements: string[] }>;
    added?: number;
    message?: string;
  }> => {
    try {
      const res = await fetch('/api/sentence-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_generate', contents }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { success: false, message: 'AI生成操作失败' };
    }
  },

  /** AI分析文本中的问题表述 */
  analyzeText: async (text: string): Promise<{ 
    success: boolean; 
    problems?: Array<{ content: string; reason: string; replacements: string[] }> 
  }> => {
    try {
      const res = await fetch('/api/sentence-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_text', text }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { success: false };
    }
  },
};

// ============================================================================
// 常量
// ============================================================================

const PAGE_SIZE = 50;

// ============================================================================
// 子组件
// ============================================================================

/** 禁用句式行组件 */
const SentencePatternRow = memo(function SentencePatternRow({
  item,
  isEditing,
  editContent,
  editReplacements,
  editReason,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditContentChange,
  onEditReplacementsChange,
  onEditReasonChange,
}: {
  item: SentencePatternItem;
  isEditing: boolean;
  editContent: string;
  editReplacements: string;
  editReason: string;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditContentChange: (v: string) => void;
  onEditReplacementsChange: (v: string) => void;
  onEditReasonChange: (v: string) => void;
}) {
  if (isEditing) {
    return (
      <div className="p-3 border-b bg-slate-50 dark:bg-slate-800/50 space-y-2">
        <div className="flex gap-2">
          <Input
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="flex-1"
            placeholder="禁用表述"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onSaveEdit}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Input
          value={editReplacements}
          onChange={(e) => onEditReplacementsChange(e.target.value)}
          placeholder="替换建议（多个用 / 分隔）"
        />
        <Input
          value={editReason}
          onChange={(e) => onEditReasonChange(e.target.value)}
          placeholder="禁用原因"
        />
      </div>
    );
  }

  return (
    <div className="p-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{item.content}</p>
          {item.replacements && item.replacements.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.replacements.map((r, i) => (
                <Badge key={i} variant="outline" className="text-xs text-green-600 border-green-300">
                  {r}
                </Badge>
              ))}
            </div>
          )}
          {item.reason && (
            <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

interface SentencePatternsManagerProps {
  onItemsChange: (items: SentencePatternItem[]) => void;
}

export function SentencePatternsManager({ onItemsChange }: SentencePatternsManagerProps) {
  // --- 状态 ---
  const [items, setItems] = useState<SentencePatternItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editReplacements, setEditReplacements] = useState("");
  const [editReason, setEditReason] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [newItemInput, setNewItemInput] = useState("");
  const [newItemReplacements, setNewItemReplacements] = useState("");
  const [newItemReason, setNewItemReason] = useState("");
  
  // 云端状态
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error'>('synced');
  const [stats, setStats] = useState<{ totalCount: number } | null>(null);
  
  // AI 状态
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [analyzeInput, setAnalyzeInput] = useState("");
  const [analyzeResults, setAnalyzeResults] = useState<Array<{ content: string; reason: string; replacements: string[] }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 加载数据 ---
  const loadData = useCallback(async () => {
    setIsSyncing(true);
    setSyncStatus('synced');
    
    try {
      const [itemsData, statsData] = await Promise.all([
        Api.getAll(),
        Api.getStats(),
      ]);
      
      setItems(itemsData);
      onItemsChange(itemsData);
      setStats(statsData);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [onItemsChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- 计算属性 ---
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.replacements?.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- 操作 ---
  const handleAddSingle = useCallback(async () => {
    if (!newItemInput.trim() || !newItemReplacements.trim()) return;
    
    const replacements = newItemReplacements.split('/').map(s => s.trim()).filter(Boolean);
    
    const result = await Api.addItems([{
      content: newItemInput.trim(),
      replacements,
      reason: newItemReason.trim(),
    }]);
    
    if (result.success) {
      setNewItemInput("");
      setNewItemReplacements("");
      setNewItemReason("");
      await loadData();
    }
  }, [newItemInput, newItemReplacements, newItemReason, loadData]);

  const handleDelete = useCallback(async (item: SentencePatternItem) => {
    const success = await Api.delete(item.id);
    if (success) {
      await loadData();
    }
  }, [loadData]);

  const handleEdit = useCallback((item: SentencePatternItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditReplacements(item.replacements?.join(' / ') || "");
    setEditReason(item.reason);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return;
    
    const replacements = editReplacements.split('/').map(s => s.trim()).filter(Boolean);
    
    const success = await Api.update(editingId, {
      content: editContent.trim(),
      replacements,
      reason: editReason.trim(),
    });
    
    if (success) {
      await loadData();
    }
    setEditingId(null);
  }, [editingId, editContent, editReplacements, editReason, loadData]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // 批量导入
  const handleBatchImport = useCallback(async () => {
    if (!batchInput.trim()) return;
    
    setIsProcessing(true);

    const lines = batchInput.split(/\n+/).filter(l => l.trim());
    const parsedItems: Array<{
      content: string;
      replacements: string[];
      reason: string;
    }> = [];
    
    for (const line of lines) {
      const parts = line.split('|');
      const content = parts[0]?.trim();
      const replacementsStr = parts[1]?.trim();
      const reason = parts[2]?.trim();
      
      if (content && replacementsStr) {
        parsedItems.push({
          content,
          replacements: replacementsStr.split('/').map(s => s.trim()).filter(Boolean),
          reason: reason || '',
        });
      }
    }

    if (parsedItems.length > 0) {
      const result = await Api.addItems(parsedItems);
      if (result.success) {
        setBatchInput("");
        setActiveTab("list");
        await loadData();
      }
    }
    
    setIsProcessing(false);
  }, [batchInput, loadData]);

  // AI 智能生成
  const handleAIGenerate = useCallback(async () => {
    if (!batchInput.trim()) return;
    
    const lines = batchInput.split(/\n+/).filter(l => l.trim());
    if (lines.length === 0) return;
    
    setIsAIGenerating(true);
    try {
      const result = await Api.aiGenerate(lines);
      if (result.success) {
        setBatchInput("");
        setActiveTab("list");
        await loadData();
        if (result.added) {
          alert(`AI 已生成 ${result.added} 条记录`);
        }
      } else {
        alert(result.message || 'AI生成失败');
      }
    } catch {
      alert('AI生成操作失败');
    } finally {
      setIsAIGenerating(false);
    }
  }, [batchInput, loadData]);

  // 去重
  const handleDeduplicate = useCallback(async () => {
    setIsProcessing(true);
    const result = await Api.deduplicate();
    setIsProcessing(false);
    
    if (result.success && result.removed > 0) {
      await loadData();
      alert(`已删除 ${result.removed} 条重复记录`);
    }
  }, [loadData]);

  // 合并（合并相同内容的替换词）
  const handleMerge = useCallback(async () => {
    setIsProcessing(true);
    const result = await Api.merge();
    setIsProcessing(false);
    
    if (result.success) {
      await loadData();
      if (result.merged > 0) {
        alert(`已合并 ${result.merged} 组重复记录，删除了 ${result.removed} 条冗余记录`);
      } else {
        alert('没有发现需要合并的记录');
      }
    } else {
      alert(result.message || '合并失败');
    }
  }, [loadData]);

  // 导出
  const handleExport = useCallback(() => {
    const data = { items, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentence-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // 导入
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.items && Array.isArray(data.items)) {
        const itemsToAdd = data.items.map((item: SentencePatternItem) => ({
          content: item.content,
          replacements: item.replacements || [],
          reason: item.reason || '',
        }));
        
        const result = await Api.addItems(itemsToAdd);
        if (result.success) {
          await loadData();
          alert(`成功导入 ${result.added} 条记录`);
        }
      }
    } catch {
      alert("导入失败：文件格式不正确");
    }
    
    e.target.value = "";
  }, [loadData]);

  // AI 分析文本
  const handleAIAnalyze = useCallback(async () => {
    if (!analyzeInput.trim()) return;
    
    setIsAIGenerating(true);
    try {
      const result = await Api.analyzeText(analyzeInput);
      if (result.success && result.problems) {
        setAnalyzeResults(result.problems);
        if (result.problems.length === 0) {
          alert('未发现明显的句式逻辑问题');
        }
      } else {
        alert('AI分析失败，请稍后重试');
      }
    } catch {
      alert('AI分析操作失败');
    } finally {
      setIsAIGenerating(false);
    }
  }, [analyzeInput]);

  // 添加分析结果
  const handleAddAnalyzeResult = useCallback(async (item: { content: string; reason: string; replacements: string[] }) => {
    const result = await Api.addItems([{
      content: item.content,
      replacements: item.replacements,
      reason: item.reason,
    }]);
    
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
              <Ban className="w-5 h-5" />
            </div>
            句子逻辑禁用库
            <Badge variant="secondary">{stats?.totalCount || 0} 条</Badge>
          </CardTitle>
          <div className="flex gap-2 items-center flex-wrap">
            {/* 云端同步状态 */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800">
              {isSyncing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> 同步中...</>
              ) : syncStatus === 'synced' ? (
                <><Cloud className="w-3.5 h-3.5 text-green-500" /> 已同步</>
              ) : (
                <><CloudOff className="w-3.5 h-3.5 text-orange-500" /> 离线</>
              )}
            </div>
            
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> 导入
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
              <Download className="w-4 h-4 mr-1" /> 导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeduplicate} disabled={isProcessing || items.length === 0}>
              去重
            </Button>
            <Button variant="outline" size="sm" onClick={handleMerge} disabled={isProcessing || items.length === 0} className="text-purple-600 border-purple-300 hover:bg-purple-50">
              合并
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="list">禁用列表</TabsTrigger>
            <TabsTrigger value="import">批量导入</TabsTrigger>
            <TabsTrigger value="analyze">AI 分析</TabsTrigger>
          </TabsList>

          {/* 禁用列表 */}
          <TabsContent value="list" className="space-y-4">
            {/* 搜索和添加 */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索禁用表述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="禁用表述"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="替换建议（多个用 / 分隔）"
                    value={newItemReplacements}
                    onChange={(e) => setNewItemReplacements(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="禁用原因（可选）"
                    value={newItemReason}
                    onChange={(e) => setNewItemReason(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddSingle} disabled={!newItemInput.trim() || !newItemReplacements.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </div>

            {/* 列表 */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {paginatedItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  暂无禁用句式，请添加或导入
                </div>
              ) : (
                paginatedItems.map(item => (
                  <SentencePatternRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editContent={editContent}
                    editReplacements={editReplacements}
                    editReason={editReason}
                    onEdit={() => handleEdit(item)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(item)}
                    onEditContentChange={setEditContent}
                    onEditReplacementsChange={setEditReplacements}
                    onEditReasonChange={setEditReason}
                  />
                ))
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  共 {filteredItems.length} 条
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">{currentPage} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 批量导入 */}
          <TabsContent value="import" className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>格式一（手动输入）：</strong><code>禁用表述|替换建议1/替换建议2|原因</code>
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                多个替换建议用 <code>/</code> 分隔，原因可省略
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                <strong>格式二（AI生成）：</strong>每行一个禁用表述，点击「AI生成」自动生成原因和替换建议
              </p>
            </div>
            <Textarea
              placeholder="不仅...而且...|不仅...同时.../除此之外|逻辑冗余&#10;众所周知&#10;不得不说"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={10}
            />
            <div className="flex gap-2">
              <Button onClick={handleBatchImport} disabled={!batchInput.trim() || isProcessing}>
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 导入中...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1" /> 手动导入</>
                )}
              </Button>
              <Button 
                onClick={handleAIGenerate} 
                disabled={!batchInput.trim() || isAIGenerating}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                {isAIGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 生成中...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-1" /> AI生成</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setBatchInput("")}>
                清空
              </Button>
            </div>
          </TabsContent>

          {/* AI 分析 */}
          <TabsContent value="analyze" className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-blue-500" />
                <span className="font-medium">AI 智能分析</span>
              </div>
              <p className="text-sm text-muted-foreground">
                粘贴一段文本，AI 将自动识别其中的句式逻辑问题，并生成原因和多个替换建议
              </p>
            </div>
            <Textarea
              placeholder="粘贴需要分析的文本..."
              value={analyzeInput}
              onChange={(e) => setAnalyzeInput(e.target.value)}
              rows={8}
            />
            <Button 
              onClick={handleAIAnalyze} 
              disabled={!analyzeInput.trim() || isAIGenerating}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isAIGenerating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 分析中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" /> 开始分析</>
              )}
            </Button>
            
            {/* 分析结果 */}
            {analyzeResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">分析结果 ({analyzeResults.length} 条问题)</h4>
                <div className="border rounded-lg divide-y">
                  {analyzeResults.map((item, index) => (
                    <div key={index} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.content}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.replacements.map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs text-green-600 border-green-300">
                                {r}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddAnalyzeResult(item)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> 添加
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
