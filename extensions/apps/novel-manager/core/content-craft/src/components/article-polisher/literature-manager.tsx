/**
 * ============================================================================
 * 文献资源管理组件 - 云端版本
 * ============================================================================
 */

"use client";

import { useState, useCallback, useEffect, useMemo, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, Trash2, Download, Upload, BookOpen, Check, Edit3, Search,
  ChevronLeft, ChevronRight, Loader2, X,
  Bookmark, FileText, Star, Tag, Info, User, Cloud, CloudOff
} from "lucide-react";

import type { LiteratureResource, LiteratureType } from "@/types";

// ============================================================================
// API 客户端
// ============================================================================

const Api = {
  getAll: async (): Promise<LiteratureResource[]> => {
    try {
      const res = await fetch('/api/literature');
      if (!res.ok) {
        console.error('API request failed:', res.status, res.statusText);
        return [];
      }
      const data = await res.json();
      return data.success ? data.items : [];
    } catch (error) {
      console.error('API getAll error:', error);
      return [];
    }
  },

  getStats: async () => {
    try {
      const res = await fetch('/api/literature?action=stats');
      if (!res.ok) {
        console.error('API stats request failed:', res.status);
        return null;
      }
      const data = await res.json();
      return data.success ? data.stats : null;
    } catch (error) {
      console.error('API getStats error:', error);
      return null;
    }
  },

  add: async (item: Omit<LiteratureResource, 'id' | 'createdAt'>): Promise<{ success: boolean; item?: LiteratureResource }> => {
    try {
      const res = await fetch('/api/literature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...item }),
      });
      const data = await res.json();
      return { success: data.success, item: data.item };
    } catch {
      return { success: false };
    }
  },

  addMany: async (items: Omit<LiteratureResource, 'id' | 'createdAt'>[]): Promise<{ success: boolean; added: number }> => {
    try {
      const res = await fetch('/api/literature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-many', items }),
      });
      const data = await res.json();
      return { success: data.success, added: data.added || 0 };
    } catch {
      return { success: false, added: 0 };
    }
  },

  update: async (id: string, updates: Partial<LiteratureResource>): Promise<boolean> => {
    try {
      const res = await fetch('/api/literature', {
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

  delete: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/literature?id=${id}`, { method: 'DELETE' });
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

const PAGE_SIZE = 50;

const PRESET_TAGS = [
  "历史", "文学", "哲学", "政治", "经济", "军事", "文化", "艺术",
  "科学", "宗教", "传记", "诗词", "小说", "散文", "戏剧", "其他"
];

const PRIORITY_CONFIG = [
  { value: 1, label: "低", desc: "偶尔引用", color: "bg-slate-100 text-slate-600" },
  { value: 2, label: "较低", desc: "次要引用", color: "bg-blue-100 text-blue-600" },
  { value: 3, label: "中等", desc: "均衡引用", color: "bg-indigo-100 text-indigo-600" },
  { value: 4, label: "较高", desc: "优先引用", color: "bg-purple-100 text-purple-600" },
  { value: 5, label: "高", desc: "重点引用", color: "bg-amber-100 text-amber-600" },
];

// ============================================================================
// 子组件
// ============================================================================

const LiteratureItemRow = memo(function LiteratureItemRow({
  item,
  isEditing,
  editData,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditDataChange
}: {
  item: LiteratureResource;
  isEditing: boolean;
  editData: Partial<LiteratureResource>;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditDataChange: (data: Partial<LiteratureResource>) => void;
}) {
  const isBook = item.type === 'book';
  const priorityConfig = PRIORITY_CONFIG.find(p => p.value === item.priority) || PRIORITY_CONFIG[2];
  
  if (isEditing) {
    return (
      <div className="p-4 border-b space-y-3 bg-slate-50 dark:bg-slate-800/50">
        {/* 类型选择 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={editData.type === 'book' ? 'default' : 'outline'}
            onClick={() => onEditDataChange({ type: 'book' })}
            className="flex-1"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1" /> 书名
          </Button>
          <Button
            size="sm"
            variant={editData.type === 'content' ? 'default' : 'outline'}
            onClick={() => onEditDataChange({ type: 'content' })}
            className="flex-1"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> 内容
          </Button>
        </div>
        
        {/* 标题 */}
        <Input
          placeholder="书名或标题..."
          value={editData.title || ''}
          onChange={(e) => onEditDataChange({ title: e.target.value })}
        />
        
        {/* 作者 */}
        <Input
          placeholder="作者（可选）"
          value={editData.author || ''}
          onChange={(e) => onEditDataChange({ author: e.target.value })}
        />
        
        {/* 内容（仅内容类型） */}
        {editData.type === 'content' && (
          <Textarea
            placeholder="文献内容..."
            value={editData.content || ''}
            onChange={(e) => onEditDataChange({ content: e.target.value })}
            rows={4}
          />
        )}
        
        {/* 标签 */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">标签：</span>
          <div className="flex flex-wrap gap-1">
            {PRESET_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  const currentTags = editData.tags || [];
                  const newTags = currentTags.includes(tag)
                    ? currentTags.filter(t => t !== tag)
                    : [...currentTags, tag];
                  onEditDataChange({ tags: newTags });
                }}
                className={`px-2 py-0.5 rounded text-xs border transition-all ${
                  (editData.tags || []).includes(tag)
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        {/* 优先级 */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">引用优先级：</span>
          <div className="flex gap-1">
            {PRIORITY_CONFIG.map(p => (
              <button
                key={p.value}
                onClick={() => onEditDataChange({ priority: p.value })}
                className={`flex-1 px-2 py-1 rounded text-xs border transition-all ${
                  editData.priority === p.value
                    ? 'ring-2 ring-indigo-500 border-indigo-300'
                    : 'border-slate-200 hover:border-indigo-300'
                } ${p.color}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* 使用说明 */}
        <Textarea
          placeholder="使用说明（可选）：描述什么场景下适合引用此文献..."
          value={editData.note || ''}
          onChange={(e) => onEditDataChange({ note: e.target.value })}
          rows={2}
        />
        
        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" onClick={onSaveEdit} className="flex-1">
            <Check className="w-4 h-4 mr-1" /> 保存
          </Button>
          <Button size="sm" variant="outline" onClick={onCancelEdit}>
            <X className="w-4 h-4 mr-1" /> 取消
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
      {/* 类型图标 */}
      <div className={`p-2 rounded-lg ${isBook ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
        {isBook ? (
          <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{item.title}</span>
          {item.author && (
            <span className="text-xs text-muted-foreground">— {item.author}</span>
          )}
          <Badge className={`text-[10px] px-1.5 ${priorityConfig.color}`}>
            <Star className="w-2.5 h-2.5 mr-0.5" />
            {priorityConfig.label}
          </Badge>
        </div>
        
        {item.type === 'content' && item.content && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {item.content.slice(0, 100)}...
          </p>
        )}
        
        <div className="flex items-center gap-2 flex-wrap">
          {isBook && (
            <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30">
              AI自动搜索
            </Badge>
          )}
          {item.preferredAuthors && item.preferredAuthors.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700">
              <User className="w-2.5 h-2.5 mr-0.5" />
              偏好: {item.preferredAuthors.slice(0, 2).join('、')}{item.preferredAuthors.length > 2 && '...'}
            </Badge>
          )}
          {item.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
        
        {item.note && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic">
            💡 {item.note}
          </p>
        )}
      </div>
      
      {/* 操作 */}
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit3 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-700">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

interface LiteratureManagerProps {
  onResourcesChange: (items: LiteratureResource[]) => void;
}

export function LiteratureManager({ onResourcesChange }: LiteratureManagerProps) {
  // --- 状态 ---
  const [items, setItems] = useState<LiteratureResource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<LiteratureType | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LiteratureResource>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // 云端状态
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error'>('synced');
  const [stats, setStats] = useState<{ totalCount: number; byType: { book: number; content: number } } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 加载数据 ---
  const loadData = useCallback(async () => {
    setIsSyncing(true);
    setSyncStatus('synced');
    
    try {
      const [itemsData, statsData] = await Promise.all([
        Api.getAll(),
        Api.getStats()
      ]);
      
      // 只有在成功获取到数据时才更新状态
      if (itemsData && itemsData.length >= 0) {
        // 如果返回空数组且当前有数据，可能是网络问题，不清空
        if (itemsData.length === 0) {
          console.log('API returned empty items array');
        }
        setItems(itemsData);
        if (onResourcesChange) {
          onResourcesChange(itemsData);
        }
      }
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Load error:', error);
      setSyncStatus('error');
      // 不清空已有数据，保持当前状态
    } finally {
      setIsSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 初始化 ---
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 计算属性 ---
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedType !== 'all') {
      result = result.filter(item => item.type === selectedType);
    }
    if (selectedTag) {
      result = result.filter(item => item.tags?.includes(selectedTag));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return result;
  }, [items, selectedType, selectedTag, searchQuery]);

  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    items.forEach(item => {
      item.tags?.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return stats;
  }, [items]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedTag]);

  // --- 操作 ---
  const handleEdit = useCallback((item: LiteratureResource) => {
    setEditingId(item.id);
    setEditData({ ...item });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editData.title?.trim()) return;
    
    if (editingId === 'new') {
      const result = await Api.add({
        type: editData.type || 'book',
        title: editData.title.trim(),
        content: editData.content?.trim(),
        author: editData.author?.trim(),
        preferredAuthors: editData.preferredAuthors,
        tags: editData.tags || [],
        priority: editData.priority || 3,
        note: editData.note?.trim(),
      });
      
      if (result.success) {
        await loadData();
      }
    } else {
      const success = await Api.update(editingId, editData);
      if (success) {
        await loadData();
      }
    }
    
    setEditingId(null);
    setEditData({});
    setShowAddDialog(false);
  }, [editingId, editData, loadData]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditData({});
    setShowAddDialog(false);
  }, []);

  const handleDelete = useCallback(async (item: LiteratureResource) => {
    if (confirm("确定删除这条文献吗？")) {
      const success = await Api.delete(item.id);
      if (success) {
        await loadData();
      }
    }
  }, [loadData]);

  const handleAdd = useCallback(() => {
    setEditingId('new');
    setEditData({
      type: 'book',
      title: '',
      author: '',
      preferredAuthors: [],
      tags: [],
      priority: 3,
      note: ''
    });
    setShowAddDialog(true);
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      type: "literature",
      items: items
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `文献备份_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.items && Array.isArray(data.items)) {
        const itemsToAdd = data.items.map((item: LiteratureResource) => ({
          type: item.type || 'book' as LiteratureType,
          title: item.title,
          content: item.content,
          author: item.author,
          preferredAuthors: item.preferredAuthors,
          tags: item.tags || [],
          priority: item.priority || 3,
          note: item.note,
        }));
        
        const result = await Api.addMany(itemsToAdd);
        if (result.success) {
          await loadData();
          alert(`成功导入 ${result.added} 条文献资源`);
        }
      }
    } catch {
      alert("导入失败：文件格式不正确");
    }
    
    e.target.value = "";
  }, [loadData]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            文献资源
            <Badge variant="secondary">{stats?.totalCount || 0} 条</Badge>
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
            
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> 导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
              <Download className="w-4 h-4 mr-1" /> 导出
            </Button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 使用说明 */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            <p className="font-medium mb-1">文献引用说明：</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li><strong>书名类型</strong>：只填写书名，AI会根据场景自动搜索引用</li>
              <li><strong>内容类型</strong>：直接添加想引用的具体段落或句子</li>
              <li><strong>引用偏好</strong>：优先级越高越容易被引用</li>
            </ul>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex flex-wrap gap-2">
          {/* 类型筛选 */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={selectedType === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedType('all')}
              className="h-8 text-xs"
            >
              全部
            </Button>
            <Button
              size="sm"
              variant={selectedType === 'book' ? 'default' : 'outline'}
              onClick={() => setSelectedType('book')}
              className="h-8 text-xs"
            >
              <Bookmark className="w-3 h-3 mr-1" /> 书名
            </Button>
            <Button
              size="sm"
              variant={selectedType === 'content' ? 'default' : 'outline'}
              onClick={() => setSelectedType('content')}
              className="h-8 text-xs"
            >
              <FileText className="w-3 h-3 mr-1" /> 内容
            </Button>
          </div>
          
          {/* 标签筛选 */}
          <div className="flex flex-wrap gap-1 flex-1">
            {Object.entries(tagStats).slice(0, 8).map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-1 rounded text-xs border transition-all ${
                  selectedTag === tag
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {tag} <span className="text-muted-foreground">({count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索文献..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 添加按钮 */}
        <Button onClick={handleAdd} className="w-full bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" /> 添加文献
        </Button>

        {/* 文献列表 */}
        <div className="border rounded-lg max-h-[400px] overflow-y-auto">
          {paginatedItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无文献资源</p>
              <p className="text-xs mt-1">添加书籍或文献内容，AI会根据场景智能引用</p>
            </div>
          ) : (
            paginatedItems.map(item => (
              <LiteratureItemRow
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                editData={editData}
                onEdit={() => handleEdit(item)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onDelete={() => handleDelete(item)}
                onEditDataChange={setEditData}
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
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
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

        {/* 添加对话框 */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          if (!open) handleCancelEdit();
          else setShowAddDialog(true);
        }}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                添加文献
              </DialogTitle>
              <DialogDescription>
                添加书籍名称或具体内容，AI会根据场景智能引用
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* 类型选择 */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={editData.type === 'book' ? 'default' : 'outline'}
                  onClick={() => setEditData({ ...editData, type: 'book' })}
                  className="flex-1"
                >
                  <Bookmark className="w-3.5 h-3.5 mr-1" /> 书名
                </Button>
                <Button
                  size="sm"
                  variant={editData.type === 'content' ? 'default' : 'outline'}
                  onClick={() => setEditData({ ...editData, type: 'content' })}
                  className="flex-1"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> 内容
                </Button>
              </div>
              
              {/* 标题 */}
              <Input
                placeholder="书名或标题..."
                value={editData.title || ''}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
              
              {/* 作者 */}
              <Input
                placeholder="作者（可选）"
                value={editData.author || ''}
                onChange={(e) => setEditData({ ...editData, author: e.target.value })}
              />
              
              {/* 内容（仅内容类型） */}
              {editData.type === 'content' && (
                <Textarea
                  placeholder="文献内容..."
                  value={editData.content || ''}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  rows={4}
                />
              )}
              
              {/* 标签 */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">标签：</span>
                <div className="flex flex-wrap gap-1">
                  {PRESET_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = editData.tags || [];
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter(t => t !== tag)
                          : [...currentTags, tag];
                        setEditData({ ...editData, tags: newTags });
                      }}
                      className={`px-2 py-0.5 rounded text-xs border transition-all ${
                        (editData.tags || []).includes(tag)
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 优先级 */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">引用优先级：</span>
                <div className="flex gap-1">
                  {PRIORITY_CONFIG.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setEditData({ ...editData, priority: p.value })}
                      className={`flex-1 px-2 py-1 rounded text-xs border transition-all ${
                        editData.priority === p.value
                          ? 'ring-2 ring-indigo-500 border-indigo-300'
                          : 'border-slate-200 hover:border-indigo-300'
                      } ${p.color}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 使用说明 */}
              <Textarea
                placeholder="使用说明（可选）：描述什么场景下适合引用此文献..."
                value={editData.note || ''}
                onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                rows={2}
              />
              
              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1 bg-amber-600 hover:bg-amber-700">
                  <Check className="w-4 h-4 mr-1" /> 保存
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-1" /> 取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
