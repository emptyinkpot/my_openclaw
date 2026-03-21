/**
 * ============================================================================
 * 词汇库管理组件
 * ============================================================================
 * 
 * 核心功能：
 * 1. 管理高级词汇列表（增删改查）
 * 2. AI智能联想 - 根据用户已有词汇的风格学习并生成新词汇
 * 3. AI智能分析 - 建立普通表达与高级词汇的映射关系
 * 
 * 设计理念：
 * - 不使用硬编码的映射规则
 * - AI学习用户的词汇风格偏好
 * - 动态建立映射关系，提高命中率
 */

"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Trash2, Download, BookOpen, Check, Edit3, Search,
  ChevronLeft, ChevronRight, Loader2, X, Tag, Sparkles, Wand2, Brain
} from "lucide-react";

import type { VocabularyItem } from "@/types";
import { autoDetectCategory, CATEGORY_RULES, getCategoryStats } from "@/lib/vocabulary-classifier";
import { VocabularyStorage } from "@/lib/storage";

// ============================================================================
// 常量
// ============================================================================

const PAGE_SIZE = 100;

// ============================================================================
// 子组件
// ============================================================================

/** 分类统计卡片 */
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
  const config = Object.values(CATEGORY_RULES).find(c => c.name === category);
  const Icon = config?.icon || Tag;
  const color = config?.color || "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isSelected 
          ? "ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30" 
          : "hover:bg-slate-50 dark:hover:bg-slate-800"
      } ${color}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{category}</span>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </button>
  );
});

/** 词汇项组件 */
const VocabularyItemRow = memo(function VocabularyItemRow({
  item,
  isEditing,
  editContent,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditContentChange
}: {
  item: VocabularyItem;
  isEditing: boolean;
  editContent: string;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditContentChange: (content: string) => void;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 border-b bg-slate-50 dark:bg-slate-800/50">
        <Input
          value={editContent}
          onChange={(e) => onEditContentChange(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button size="sm" onClick={onSaveEdit}>
          <Check className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelEdit}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <span className="flex-1 text-sm">{item.content}</span>
      <Badge variant="outline" className="text-xs">{item.category}</Badge>
      <Button size="sm" variant="ghost" onClick={onEdit}>
        <Edit3 className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-700">
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

interface VocabularyManagerProps {
  onVocabularyChange: (vocabulary: string[]) => void;
}

export function VocabularyManager({ onVocabularyChange }: VocabularyManagerProps) {
  // --- 状态 ---
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  
  // AI联想状态
  const [isAIAssociating, setIsAIAssociating] = useState(false);
  const [aiResult, setAIResult] = useState<string[] | null>(null);
  
  // AI智能分析状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mappings, setMappings] = useState<Array<{ common: string; advanced: string[] }> | null>(null);

  // --- 初始化 ---
  useEffect(() => {
    const saved = VocabularyStorage.get<VocabularyItem[] | null>(null);
    if (saved) {
      setItems(saved);
      onVocabularyChange(saved.map(item => item.content));
    }
  }, [onVocabularyChange]);

  // --- 计算属性 ---
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(item => 
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [items, selectedCategory, searchQuery]);

  const categoryStats = useMemo(() => getCategoryStats(items), [items]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // --- 操作 ---
  const saveItems = useCallback((newItems: VocabularyItem[]) => {
    setItems(newItems);
    VocabularyStorage.set(newItems);
    onVocabularyChange(newItems.map(item => item.content));
  }, [onVocabularyChange]);

  const addItem = useCallback((content: string) => {
    const newItem: VocabularyItem = {
      id: Date.now().toString(),
      content: content.trim(),
      type: "word",
      meaning: "",
      usage: "",
      category: autoDetectCategory(content.trim()),
      createdAt: Date.now()
    };
    saveItems([newItem, ...items]);
  }, [items, saveItems]);

  const deleteItem = useCallback((id: string) => {
    saveItems(items.filter(item => item.id !== id));
  }, [items, saveItems]);

  const startEdit = useCallback((item: VocabularyItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editContent.trim()) return;
    saveItems(items.map(item => 
      item.id === editingId 
        ? { ...item, content: editContent.trim(), category: autoDetectCategory(editContent.trim()) }
        : item
    ));
    setEditingId(null);
    setEditContent("");
  }, [editingId, editContent, items, saveItems]);

  // 批量导入
  const handleBatchImport = useCallback(async () => {
    if (!batchInput.trim()) return;
    
    setIsProcessing(true);

    const words = batchInput.split(/[\n,，、;；\s]+/).filter(w => w.trim());
    const newItems: VocabularyItem[] = words.map(word => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      content: word.trim(),
      type: "word",
      meaning: "",
      usage: "",
      category: autoDetectCategory(word.trim()),
      createdAt: Date.now()
    }));

    saveItems([...newItems, ...items]);
    setBatchInput("");
    setIsProcessing(false);
    setActiveTab("list");
  }, [batchInput, items, saveItems]);

  // 导出
  const handleExport = useCallback(() => {
    const content = items.map(item => item.content).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocabulary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // 清空所有
  const handleClearAll = useCallback(() => {
    if (confirm("确定清空所有词汇吗？此操作不可恢复。")) {
      saveItems([]);
    }
  }, [saveItems]);

  // 去重
  const handleDeduplicate = useCallback(() => {
    const seen = new Set<string>();
    const uniqueItems = items.filter(item => {
      if (seen.has(item.content)) return false;
      seen.add(item.content);
      return true;
    });
    if (uniqueItems.length < items.length) {
      saveItems(uniqueItems);
      alert(`已删除 ${items.length - uniqueItems.length} 个重复词汇`);
    }
  }, [items, saveItems]);

  /**
   * AI智能联想
   * 根据用户已有词汇的风格学习并生成新词汇
   */
  const handleAIAssociate = useCallback(async () => {
    if (items.length < 5) {
      alert('请先添加至少5个词汇，AI才能学习您的风格');
      return;
    }
    
    if (!confirm('AI 将分析您已有的词汇风格，生成风格相似的新词汇。确定继续吗？')) return;
    
    setIsAIAssociating(true);
    setAIResult(null);
    
    try {
      const response = await fetch('/api/vocabulary-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'associate',
          existingWords: items.map(item => item.content),
          count: 30,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.words?.length > 0) {
        setAIResult(data.words);
      } else {
        alert(data.error || 'AI 联想失败，请稍后重试');
      }
    } catch (error) {
      alert('AI 联想失败，请检查网络连接');
    } finally {
      setIsAIAssociating(false);
    }
  }, [items]);

  // 确认添加AI生成的词汇
  const handleConfirmAIResult = useCallback(() => {
    if (!aiResult || aiResult.length === 0) return;
    
    const newItems: VocabularyItem[] = aiResult.map(word => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      content: word.trim(),
      type: "word",
      meaning: "",
      usage: "",
      category: autoDetectCategory(word.trim()),
      createdAt: Date.now()
    }));
    
    saveItems([...newItems, ...items]);
    setAIResult(null);
  }, [aiResult, items, saveItems]);

  /**
   * AI智能分析
   * 分析词汇库，建立"普通表达→高级词汇"的映射关系
   */
  const handleAIAnalyze = useCallback(async () => {
    if (items.length < 3) {
      alert('请先添加至少3个词汇');
      return;
    }
    
    setIsAnalyzing(true);
    setMappings(null);
    
    try {
      const response = await fetch('/api/vocabulary-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_mapping',
          vocabulary: items.map(item => item.content),
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.mappings?.length > 0) {
        setMappings(data.mappings);
      } else {
        alert(data.error || 'AI 分析失败，请稍后重试');
      }
    } catch (error) {
      alert('AI 分析失败，请检查网络连接');
    } finally {
      setIsAnalyzing(false);
    }
  }, [items]);

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            词汇库管理
            <Badge variant="secondary">{items.length.toLocaleString()} 条</Badge>
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDeduplicate} disabled={items.length === 0}>
              去重
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
              <Download className="w-4 h-4 mr-1" /> 导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll} disabled={items.length === 0} className="text-red-500">
              <Trash2 className="w-4 h-4 mr-1" /> 清空
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
              <CategoryCard
                category="全部"
                count={items.length}
                isSelected={selectedCategory === null}
                onClick={() => setSelectedCategory(null)}
              />
              {Object.entries(categoryStats).map(([category, count]) => (
                <CategoryCard
                  key={category}
                  category={category}
                  count={count}
                  isSelected={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                />
              ))}
            </div>

            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索词汇..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* AI智能联想 */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">AI 智能联想</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI 会分析您已有词汇的风格，生成风格相似的新词汇
                  </p>
                </div>
                <Button
                  onClick={handleAIAssociate}
                  disabled={items.length < 5 || isAIAssociating}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {isAIAssociating ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 联想中...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-1" /> AI 联想</>
                  )}
                </Button>
              </div>
              
              {/* AI联想结果 */}
              {aiResult && aiResult.length > 0 && (
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">AI 为您联想了 {aiResult.length} 个新词汇</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleConfirmAIResult} className="bg-purple-600 hover:bg-purple-700">
                        <Check className="w-4 h-4 mr-1" /> 全部添加
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAIResult(null)}>
                        <X className="w-4 h-4 mr-1" /> 取消
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.map((word, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI智能分析 */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium">AI 智能分析</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    分析词汇库，建立"普通表达→高级词汇"的映射关系，提高润色命中率
                  </p>
                </div>
                <Button
                  onClick={handleAIAnalyze}
                  disabled={items.length < 3 || isAnalyzing}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 分析中...</>
                  ) : (
                    <><Brain className="w-4 h-4 mr-1" /> 分析映射</>
                  )}
                </Button>
              </div>
              
              {/* 映射结果 */}
              {mappings && mappings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">发现 {mappings.length} 个映射关系</span>
                    <Button size="sm" variant="outline" onClick={() => setMappings(null)}>
                      <X className="w-4 h-4 mr-1" /> 关闭
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {mappings.slice(0, 20).map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                        <span className="text-slate-600 dark:text-slate-400">{m.common}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{m.advanced.join('/')}</span>
                      </div>
                    ))}
                  </div>
                  {mappings.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      仅显示前20个，共 {mappings.length} 个映射关系
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 单条添加 */}
            <div className="flex gap-2">
              <Input
                placeholder="输入新词汇..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    addItem(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <Button onClick={() => {
                const input = document.querySelector('input[placeholder="输入新词汇..."]') as HTMLInputElement;
                if (input?.value.trim()) {
                  addItem(input.value);
                  input.value = "";
                }
              }}>
                <Plus className="w-4 h-4 mr-1" /> 添加
              </Button>
            </div>

            {/* 词汇列表 */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {paginatedItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  暂无词汇，请添加或导入
                </div>
              ) : (
                paginatedItems.map(item => (
                  <VocabularyItemRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editContent={editContent}
                    onEdit={() => startEdit(item)}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditContent("");
                    }}
                    onDelete={() => deleteItem(item.id)}
                    onEditContentChange={setEditContent}
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
          </TabsContent>

          {/* 批量导入 */}
          <TabsContent value="import" className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-muted-foreground">
                每行一个词汇，或用逗号、顿号分隔
              </p>
            </div>
            <Textarea
              placeholder="天命&#10;宿命&#10;鼎革、维新、肇建"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={10}
            />
            <div className="flex gap-2">
              <Button onClick={handleBatchImport} disabled={!batchInput.trim() || isProcessing}>
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 导入中...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-1" /> 开始导入</>
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
