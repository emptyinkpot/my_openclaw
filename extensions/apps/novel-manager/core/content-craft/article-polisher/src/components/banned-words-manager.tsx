/**
 * ============================================================================
 * 禁用词/反感词管理组件
 * ============================================================================
 * 
 * 核心功能：
 * 1. 管理禁用词列表（增删改查）
 * 2. AI智能生成替换词 - 根据用户已有的替换词风格学习并生成
 * 
 * 设计理念：
 * - 不使用硬编码的映射规则
 * - AI学习用户的风格偏好
 * - 智能联想生成替换词
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
  Plus, Trash2, Download, Upload, AlertTriangle, Check, Edit3, Search,
  ChevronLeft, ChevronRight, Loader2, X, Cloud, CloudOff, Sparkles
} from "lucide-react";

import type { BannedWordItem, BannedWordType } from "@/types";
import { BANNED_WORD_CATEGORIES, autoDetectBannedWordType } from "@/lib/preset-banned-words";

// ============================================================================
// API 客户端
// ============================================================================

const Api = {
  /** 获取所有禁用词 */
  getAll: async (): Promise<BannedWordItem[]> => {
    try {
      const res = await fetch('/api/banned-words');
      const data = await res.json();
      return data.success ? data.items : [];
    } catch {
      return [];
    }
  },

  /** 获取统计信息 */
  getStats: async () => {
    try {
      const res = await fetch('/api/banned-words?action=stats');
      const data = await res.json();
      return data.success ? data.stats : null;
    } catch {
      return null;
    }
  },

  /** 批量添加禁用词 */
  addItems: async (items: Omit<BannedWordItem, 'id' | 'createdAt'>[]): Promise<{ success: boolean; added: number }> => {
    try {
      const res = await fetch('/api/banned-words', {
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
      const res = await fetch('/api/banned-words', {
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

  /** 更新禁用词 */
  update: async (id: string, updates: Partial<BannedWordItem>): Promise<boolean> => {
    try {
      const res = await fetch('/api/banned-words', {
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

  /** 删除禁用词 */
  delete: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/banned-words?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  },

  /** 
   * AI智能生成替换词
   * 根据用户已有的替换词风格学习并生成新的替换词
   */
  aiGenerateAlternatives: async (): Promise<{ 
    success: boolean; 
    updated: number; 
    results?: Array<{ content: string; alternative: string }>;
    message: string 
  }> => {
    try {
      const res = await fetch('/api/banned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch_generate_with_llm' }),
      });
      const data = await res.json();
      return data.success ? data : { success: false, updated: 0, message: 'AI生成失败' };
    } catch {
      return { success: false, updated: 0, message: 'AI生成操作失败' };
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

/** 禁用词行组件 */
const BannedWordRow = memo(function BannedWordRow({
  item,
  isEditing,
  editContent,
  editReason,
  editAlternative,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditContentChange,
  onEditReasonChange,
  onEditAlternativeChange,
}: {
  item: BannedWordItem;
  isEditing: boolean;
  editContent: string;
  editReason: string;
  editAlternative: string;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditContentChange: (v: string) => void;
  onEditReasonChange: (v: string) => void;
  onEditAlternativeChange: (v: string) => void;
}) {
  const config = BANNED_WORD_CATEGORIES[item.type] || BANNED_WORD_CATEGORIES.modern;

  if (isEditing) {
    return (
      <div className="flex items-start gap-2 p-3 border-b bg-slate-50 dark:bg-slate-800/50">
        <Input
          value={editContent}
          onChange={(e) => onEditContentChange(e.target.value)}
          className="flex-1"
          placeholder="禁用词"
        />
        <Input
          value={editReason}
          onChange={(e) => onEditReasonChange(e.target.value)}
          className="flex-1"
          placeholder="禁用原因"
        />
        <Input
          value={editAlternative}
          onChange={(e) => onEditAlternativeChange(e.target.value)}
          className="flex-1"
          placeholder="替换词（可选）"
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
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.content}</p>
          <Badge variant="outline" className={`text-xs ${config.color}`}>
            {config.name}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
        {item.alternative && (
          <p className="text-xs text-green-600 mt-1">替换：{item.alternative}</p>
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
  );
});

// ============================================================================
// 主组件
// ============================================================================

interface BannedWordsManagerProps {
  onItemsChange: (items: BannedWordItem[]) => void;
}

export function BannedWordsManager({ onItemsChange }: BannedWordsManagerProps) {
  // --- 状态 ---
  const [items, setItems] = useState<BannedWordItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<BannedWordType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editAlternative, setEditAlternative] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [newItemInput, setNewItemInput] = useState("");
  
  // 云端状态
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error'>('synced');
  const [stats, setStats] = useState<{ totalCount: number; byType: Record<string, number> } | null>(null);
  
  // AI生成状态
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
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
    let result = items;
    if (selectedType) {
      result = result.filter(item => item.type === selectedType);
    }
    if (searchQuery) {
      result = result.filter(item => 
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.alternative?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return result;
  }, [items, selectedType, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType]);

  // --- 操作 ---
  const handleAddSingle = useCallback(async () => {
    if (!newItemInput.trim()) return;
    
    const detectedType = autoDetectBannedWordType(newItemInput.trim());
    const config = BANNED_WORD_CATEGORIES[detectedType];
    
    const result = await Api.addItems([{
      content: newItemInput.trim(),
      type: detectedType,
      category: config.name,
      reason: config.description,
    }]);
    
    if (result.success) {
      setNewItemInput("");
      await loadData();
    }
  }, [newItemInput, loadData]);

  const handleDelete = useCallback(async (item: BannedWordItem) => {
    const success = await Api.delete(item.id);
    if (success) {
      await loadData();
    }
  }, [loadData]);

  const handleEdit = useCallback((item: BannedWordItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditReason(item.reason);
    setEditAlternative(item.alternative || "");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return;
    
    const success = await Api.update(editingId, {
      content: editContent.trim(),
      reason: editReason.trim(),
      alternative: editAlternative.trim() || undefined,
    });
    
    if (success) {
      await loadData();
    }
    setEditingId(null);
  }, [editingId, editContent, editReason, editAlternative, loadData]);

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
      type: BannedWordType;
      category: string;
      reason: string;
    }> = [];
    
    for (const line of lines) {
      const parts = line.split('|');
      const content = parts[0]?.trim();
      
      if (content) {
        const type = autoDetectBannedWordType(content);
        const config = BANNED_WORD_CATEGORIES[type];
        parsedItems.push({
          content,
          type,
          category: config.name,
          reason: config.description,
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

  // 去重
  const handleDeduplicate = useCallback(async () => {
    setIsProcessing(true);
    const result = await Api.deduplicate();
    setIsProcessing(false);
    
    if (result.success && result.removed > 0) {
      await loadData();
      alert(`已删除 ${result.removed} 条重复禁用词`);
    }
  }, [loadData]);

  // 导出
  const handleExport = useCallback(() => {
    const data = { items, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banned-words-${new Date().toISOString().slice(0, 10)}.json`;
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
        const itemsToAdd = data.items.map((item: BannedWordItem) => ({
          content: item.content,
          type: item.type || 'modern' as BannedWordType,
          category: item.category || '现代词汇',
          reason: item.reason || '',
          alternative: item.alternative,
        }));
        
        const result = await Api.addItems(itemsToAdd);
        if (result.success) {
          await loadData();
          alert(`成功导入 ${result.added} 条禁用词`);
        }
      }
    } catch {
      alert("导入失败：文件格式不正确");
    }
    
    e.target.value = "";
  }, [loadData]);

  /**
   * AI智能生成替换词
   * 根据用户已有的替换词风格学习并生成
   */
  const handleAIGenerate = useCallback(async () => {
    if (items.length === 0) {
      alert('请先添加一些禁用词');
      return;
    }
    
    const hasAlternatives = items.some(item => item.alternative);
    const confirmMsg = hasAlternatives
      ? 'AI 将学习您已有的替换词风格，为没有替换词的禁用词生成新替换词。确定继续吗？'
      : 'AI 将为您的禁用词生成替换词。确定继续吗？';
    
    if (!confirm(confirmMsg)) return;
    
    setIsAIGenerating(true);
    try {
      const result = await Api.aiGenerateAlternatives();
      if (result.success) {
        alert(result.message);
        await loadData();
      } else {
        alert(result.message || 'AI生成失败');
      }
    } catch (error) {
      alert('AI生成操作失败，请稍后重试');
    } finally {
      setIsAIGenerating(false);
    }
  }, [items, loadData]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 text-white">
              <AlertTriangle className="w-5 h-5" />
            </div>
            禁用词/反感词库
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
            <Button variant="outline" size="sm" onClick={handleDeduplicate} disabled={isProcessing}>
              去重
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">词汇列表</TabsTrigger>
            <TabsTrigger value="import">批量导入</TabsTrigger>
          </TabsList>

          {/* 词汇列表 */}
          <TabsContent value="list" className="space-y-4">
            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedType === null ? "default" : "outline"}
                onClick={() => setSelectedType(null)}
              >
                全部 ({items.length})
              </Button>
              {Object.entries(BANNED_WORD_CATEGORIES).map(([key, config]) => {
                const count = items.filter(item => item.type === key).length;
                if (count === 0) return null;
                return (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedType === key ? "default" : "outline"}
                    onClick={() => setSelectedType(key as BannedWordType)}
                  >
                    {config.name} ({count})
                  </Button>
                );
              })}
            </div>

            {/* 搜索和添加 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索禁用词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Input
                placeholder="添加新禁用词..."
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSingle()}
                className="w-48"
              />
              <Button onClick={handleAddSingle} disabled={!newItemInput.trim()}>
                <Plus className="w-4 h-4 mr-1" /> 添加
              </Button>
            </div>

            {/* AI智能生成按钮 */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="font-medium">AI 智能生成替换词</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI 会学习您已有的替换词风格，为禁用词生成风格一致的替换词
                  </p>
                </div>
                <Button
                  onClick={handleAIGenerate}
                  disabled={items.length === 0 || isAIGenerating}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  {isAIGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 生成中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" /> AI 生成</>
                  )}
                </Button>
              </div>
            </div>

            {/* 列表 */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {paginatedItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  暂无禁用词，请添加或导入
                </div>
              ) : (
                paginatedItems.map(item => (
                  <BannedWordRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editContent={editContent}
                    editReason={editReason}
                    editAlternative={editAlternative}
                    onEdit={() => handleEdit(item)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(item)}
                    onEditContentChange={setEditContent}
                    onEditReasonChange={setEditReason}
                    onEditAlternativeChange={setEditAlternative}
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
                每行一个禁用词，格式：<code>禁用词</code> 或 <code>禁用词|类型|原因</code>
              </p>
              <p className="text-xs text-muted-foreground">
                类型可选：modern（现代词汇）、metaphor（廉价比喻）、ai_style（AI腔）等
              </p>
            </div>
            <Textarea
              placeholder="赋能&#10;落地&#10;闭环&#10;手术刀式|metaphor|廉价比喻"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={10}
            />
            <div className="flex gap-2">
              <Button onClick={handleBatchImport} disabled={!batchInput.trim() || isProcessing}>
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 导入中...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1" /> 开始导入</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setBatchInput("")}>
                清空
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
