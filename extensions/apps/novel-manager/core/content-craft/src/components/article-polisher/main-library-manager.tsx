/**
 * ============================================================================
 * 主库资源管理组件 - 云端版本
 * ============================================================================
 * 统一的主库管理界面，完全使用云端 API
 */

"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Trash2, Download, Upload, Check, Edit3, Search,
  ChevronLeft, ChevronRight, CheckCircle2, Loader2, X,
  Sparkles, Database, AlertCircle,
  RotateCcw, Archive, Info, Cloud, CloudOff
} from "lucide-react";

import type { ResourceItem } from "@/types";
import { autoDetectCategory } from "@/lib/vocabulary-classifier";

// ============================================================================
// API 客户端
// ============================================================================

const Api = {
  // 获取所有词汇
  getAll: async (): Promise<ResourceItem[]> => {
    try {
      const res = await fetch('/api/main-library');
      const data = await res.json();
      return data.success ? data.items : [];
    } catch {
      return [];
    }
  },

  // 获取统计
  getStats: async () => {
    try {
      const res = await fetch('/api/main-library?action=stats');
      const data = await res.json();
      return data.success ? data.stats : null;
    } catch {
      return null;
    }
  },

  // 批量添加
  addItems: async (items: ResourceItem[]): Promise<{ success: boolean; added: number }> => {
    try {
      const res = await fetch('/api/main-library', {
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

  // 检查重复
  checkDuplicates: async (contents: string[]): Promise<Map<string, boolean>> => {
    const result = new Map<string, boolean>();
    try {
      const res = await fetch('/api/main-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-duplicates', contents }),
      });
      const data = await res.json();
      if (data.success && data.duplicates) {
        for (const [k, v] of Object.entries(data.duplicates)) {
          result.set(k, v as boolean);
        }
      }
    } catch {}
    return result;
  },

  // 去重
  deduplicate: async (): Promise<{ removed: number; message: string }> => {
    try {
      const res = await fetch('/api/main-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deduplicate' }),
      });
      const data = await res.json();
      return data.success && data.data ? data.data : { removed: 0, message: '去重失败' };
    } catch {
      return { removed: 0, message: '去重操作失败' };
    }
  },

  // 编辑
  editItem: async (id: string, updates: Partial<ResourceItem>): Promise<boolean> => {
    try {
      const res = await fetch('/api/main-library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', id, ...updates }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  },

  // 删除
  deleteItem: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/main-library?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  },

  // 重置
  reset: async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/main-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// 常量
// ============================================================================

const PAGE_SIZE = 100;
const CATEGORIES = ['宏大叙事', '政权制度', '日方语境', '中方语境', '苏联语境', '古典语境', '历史术语', '比喻系统', '人之情态', '物之境观', '思辨言说', '社会身份', '语法连接', '偏好词汇', '其他'];

// ============================================================================
// 子组件
// ============================================================================

const CategoryCard = memo(function CategoryCard({
  category,
  count,
  isSelected,
  onClick
}: {
  category: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
        isSelected 
          ? "ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30" 
          : "hover:bg-slate-50 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
      }`}
    >
      <span className="font-medium">{category}</span>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </button>
  );
});

const ResourceItemRow = memo(function ResourceItemRow({
  item,
  isEditing,
  editContent,
  editCategory,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditContentChange,
  onEditCategoryChange
}: {
  item: ResourceItem;
  isEditing: boolean;
  editContent: string;
  editCategory: string;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditContentChange: (content: string) => void;
  onEditCategoryChange: (category: string) => void;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <Input
          value={editContent}
          onChange={(e) => onEditContentChange(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Select value={editCategory} onValueChange={onEditCategoryChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onSaveEdit} disabled={!editContent.trim()}>
          <Check className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelEdit}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-sm truncate">{item.content}</span>
        <Badge variant="outline" className="text-xs shrink-0">
          {item.category}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600" title="编辑">
          <Edit3 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-red-400 hover:text-red-600" title="删除">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

interface MainLibraryManagerProps {
  onResourcesChange?: (items: ResourceItem[]) => void;
}

export function MainLibraryManager({ onResourcesChange }: MainLibraryManagerProps) {
  // --- 状态 ---
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("list");
  
  // 对话框状态
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showDedupeDialog, setShowDedupeDialog] = useState(false);
  
  // 云端状态
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'offline'>('synced');
  const [stats, setStats] = useState<{
    systemCount: number;
    visibleSystemCount: number;
    hiddenSystemCount: number;
    userCount: number;
    totalCount: number;
  } | null>(null);
  
  // 去重状态
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [dedupeResult, setDedupeResult] = useState<{ removed: number; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 加载数据
  const loadData = useCallback(async () => {
    setIsSyncing(true);
    setSyncStatus('synced');
    
    try {
      const [itemsData, statsData] = await Promise.all([
        Api.getAll(),
        Api.getStats()
      ]);
      
      setItems(itemsData);
      setStats(statsData);
      if (onResourcesChange) {
        onResourcesChange(itemsData);
      }
    } catch (error) {
      console.error('Load error:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 初始化
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 过滤和搜索
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.content.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, selectedCategory, searchQuery]);
  
  // 分类统计
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);
  
  // 分页
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);
  
  // 重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);
  
  // 编辑操作
  const handleEdit = useCallback((item: ResourceItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditCategory(item.category);
  }, []);
  
  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return;
    
    const success = await Api.editItem(editingId, {
      content: editContent.trim(),
      category: editCategory
    });
    
    if (success) {
      await loadData();
    }
    setEditingId(null);
  }, [editingId, editContent, editCategory, loadData]);
  
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);
  
  // 删除操作
  const handleDelete = useCallback(async (item: ResourceItem) => {
    const confirmMsg = `确定删除词汇"${item.content}"吗？`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const success = await Api.deleteItem(item.id);
      if (success) {
        await loadData();
      } else {
        alert('删除失败，请稍后重试');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败，请稍后重试');
    }
  }, [loadData]);
  
  // 批量导入
  const handleBatchImport = useCallback(async () => {
    if (!batchInput.trim()) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    const lines = batchInput.split("\n").map(line => line.trim()).filter(Boolean);
    
    // 检查重复
    const duplicateMap = await Api.checkDuplicates(lines);
    const newLines = lines.filter(line => !duplicateMap.get(line));
    
    if (newLines.length === 0) {
      alert('所有词汇都已存在，无需添加');
      setIsProcessing(false);
      return;
    }
    
    // 准备数据
    const newItems: ResourceItem[] = newLines.map(line => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      content: line,
      type: 'vocabulary' as const,
      category: autoDetectCategory(line),
      createdAt: Date.now()
    }));
    
    setProgress(50);
    
    // 添加到云端
    const result = await Api.addItems(newItems);
    
    setProgress(100);
    
    if (result.success) {
      await loadData();
      setBatchInput("");
      const skipped = lines.length - newLines.length;
      alert(`成功添加 ${result.added} 条词汇${skipped > 0 ? `，跳过 ${skipped} 条重复词汇` : ''}`);
    } else {
      alert('添加失败，请稍后重试');
    }
    
    setIsProcessing(false);
    setProgress(0);
  }, [batchInput, loadData]);
  
  // 重置
  const handleReset = useCallback(async () => {
    const success = await Api.reset();
    if (success) {
      await loadData();
      setShowResetDialog(false);
    }
  }, [loadData]);
  
  // 导出
  const handleExport = useCallback(async () => {
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      type: "main-library-backup",
      userItems: items.filter(i => !i.id.startsWith('vocab-'))
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `词汇主库备份_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);
  
  // 导入
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (data.type !== "main-library-backup") {
          alert("无效的备份文件格式");
          return;
        }
        
        if (Array.isArray(data.userItems) && data.userItems.length > 0) {
          await Api.addItems(data.userItems);
        }
        
        await loadData();
        alert(`成功恢复 ${data.userItems?.length || 0} 条用户词汇`);
        setShowBackupDialog(false);
      } catch {
        alert("备份文件解析失败");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [loadData]);
  
  // 去重
  const handleDeduplicate = useCallback(async () => {
    setIsDeduplicating(true);
    setDedupeResult(null);
    
    try {
      const result = await Api.deduplicate();
      setDedupeResult(result);
      
      if (result.removed > 0) {
        await loadData();
      }
    } catch (error) {
      setDedupeResult({
        removed: 0,
        message: '去重操作失败，请稍后重试'
      });
    } finally {
      setIsDeduplicating(false);
    }
  }, [loadData]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Database className="w-5 h-5" />
            </div>
            词汇主库
            <Badge variant="secondary">{stats?.totalCount?.toLocaleString() || 0} 条</Badge>
            {stats?.userCount && stats.userCount > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                +{stats.userCount} 用户词汇
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 items-center">
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
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setDedupeResult(null); setShowDedupeDialog(true); }} 
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-1" /> 去重
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBackupDialog(true)}>
              <Archive className="w-4 h-4 mr-1" /> 备份
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} className="text-red-500">
              <RotateCcw className="w-4 h-4 mr-1" /> 重置
            </Button>
          </div>
        </div>
        
        {/* 统计信息 */}
        {stats && (
          <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
            <span>系统预设：<Badge variant="secondary">{stats.visibleSystemCount}</Badge></span>
            <span>用户添加：<Badge variant="secondary" className="bg-green-100 text-green-700">{stats.userCount}</Badge></span>
            <span>已隐藏：<Badge variant="secondary" className="bg-orange-100 text-orange-700">{stats.hiddenSystemCount}</Badge></span>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">词汇列表</TabsTrigger>
            <TabsTrigger value="import">批量添加</TabsTrigger>
          </TabsList>
          
          {/* 词汇列表 */}
          <TabsContent value="list" className="space-y-4">
            {/* 搜索和分类过滤 */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索词汇..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {selectedCategory && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                  <X className="w-4 h-4 mr-1" /> 清除筛选
                </Button>
              )}
            </div>
            
            {/* 分类卡片 */}
            <div className="flex flex-wrap gap-2">
              <CategoryCard
                category="全部"
                count={items.length}
                isSelected={selectedCategory === null}
                onClick={() => setSelectedCategory(null)}
              />
              {Object.entries(categoryStats)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <CategoryCard
                    key={category}
                    category={category}
                    count={count}
                    isSelected={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
            </div>
            
            {/* 列表 */}
            <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
              {paginatedItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>没有找到匹配的词汇</p>
                </div>
              ) : (
                paginatedItems.map(item => (
                  <ResourceItemRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editContent={editContent}
                    editCategory={editCategory}
                    onEdit={() => handleEdit(item)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(item)}
                    onEditContentChange={setEditContent}
                    onEditCategoryChange={setEditCategory}
                  />
                ))
              )}
            </div>
            
            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  共 {filteredItems.length} 条，第 {currentPage}/{totalPages} 页
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
          
          {/* 批量添加 */}
          <TabsContent value="import" className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <p className="font-medium mb-1">批量添加说明：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>每行一个词汇，系统会自动分类</li>
                  <li>已存在的词汇会自动跳过</li>
                  <li>添加的词汇标记为"用户"，可随时删除</li>
                </ul>
              </div>
            </div>
            
            <Textarea
              placeholder="输入要添加的词汇，每行一个..."
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={10}
              className="font-mono"
            />
            
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  正在处理... {progress}%
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleBatchImport} 
              disabled={!batchInput.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 处理中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> 开始添加</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* 重置对话框 */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              重置主库
            </DialogTitle>
            <DialogDescription>
              此操作将删除所有用户词汇和隐藏记录，恢复为系统预设状态。
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">当前状态：</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 系统预设：{stats?.systemCount || 0} 条</li>
              <li>• 用户词汇：{stats?.userCount || 0} 条 <span className="text-red-500">（将被删除）</span></li>
              <li>• 已隐藏：{stats?.hiddenSystemCount || 0} 条 <span className="text-orange-500">（将被恢复）</span></li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 备份对话框 */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-500" />
              备份与恢复
            </DialogTitle>
            <DialogDescription>
              导出主库数据为JSON文件，或从备份文件恢复
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                导出备份
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                将当前主库数据导出为JSON文件，包含用户词汇和隐藏记录
              </p>
              <Button onClick={handleExport} className="w-full">
                导出备份文件
              </Button>
            </div>
            
            <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                从备份恢复
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                从JSON备份文件恢复主库数据，将覆盖当前数据
              </p>
              <label className="block">
                <Button variant="outline" className="w-full" asChild>
                  <span>选择备份文件</span>
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 去重对话框 */}
      <Dialog open={showDedupeDialog} onOpenChange={setShowDedupeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Sparkles className="w-5 h-5" />
              词汇去重
            </DialogTitle>
            <DialogDescription>
              检测并删除主库中的重复词汇，保留系统预设词汇优先
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
              <h4 className="font-medium mb-2">去重规则：</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 按【原文内容】检测重复</li>
                <li>• 系统预设词汇优先保留</li>
                <li>• 仅删除用户添加的重复词汇</li>
                <li>• 当前主库共有 <strong>{items.length}</strong> 条词汇</li>
              </ul>
            </div>
            
            {isDeduplicating && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                <span className="ml-2">正在检测重复...</span>
              </div>
            )}
            
            {dedupeResult && (
              <div className={`p-4 rounded-lg border ${
                dedupeResult.removed > 0 
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200' 
                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  {dedupeResult.removed > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-500" />
                  )}
                  <span className="font-medium">{dedupeResult.message}</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDedupeDialog(false);
              setDedupeResult(null);
            }}>
              关闭
            </Button>
            <Button 
              onClick={handleDeduplicate} 
              disabled={isDeduplicating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isDeduplicating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 处理中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> 开始去重</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
