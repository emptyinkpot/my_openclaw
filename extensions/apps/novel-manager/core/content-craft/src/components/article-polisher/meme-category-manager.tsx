/**
 * ============================================================================
 * 梗分类管理组件
 * ============================================================================
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, Trash2, Edit3, ChevronDown, ChevronRight, 
  Laugh, Swords, Lightbulb, Smile, TrendingUp, Quote, 
  BookOpen, Drama, HelpCircle, Info, Save, X
} from "lucide-react";

import type { MemeCategory } from "@/types";
import { 
  DEFAULT_MEME_CATEGORIES, 
  MEME_CATEGORY_RULES, 
  getMemeCategories as getCategoriesFromLib, 
  saveMemeCategories as saveCategoriesToLib 
} from "@/lib/meme-classifier";

// ============================================================================
// 图标映射
// ============================================================================

const CATEGORY_ICONS: Record<string, typeof Laugh> = {
  "反讽": Swords,
  "模板套句": Lightbulb,
  "幽默": Smile,
  "流行语": TrendingUp,
  "经典台词": Quote,
  "文学引用": BookOpen,
  "历史梗": Drama,
  "其他": HelpCircle,
};

// ============================================================================
// 子组件
// ============================================================================

/** 分类卡片 */
function CategoryCard({
  category,
  memeCount,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  isSystem
}: {
  category: MemeCategory;
  memeCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSystem: boolean;
}) {
  const IconComponent = CATEGORY_ICONS[category.name] || HelpCircle;
  
  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-700">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {category.name}
                    <Badge variant="secondary" className="text-xs">{memeCount}</Badge>
                    {isSystem && (
                      <Badge variant="outline" className="text-xs text-slate-500">系统</Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {category.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                {!isSystem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            {/* 使用场景 */}
            {category.usageScenario && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">使用场景</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {category.usageScenario}
                </p>
              </div>
            )}
            
            {/* 使用示例 */}
            {category.examples && category.examples.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Quote className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">使用示例</span>
                </div>
                <div className="space-y-1.5">
                  {category.examples.map((example, index) => (
                    <div 
                      key={index}
                      className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700/50 rounded px-2 py-1.5 border-l-2 border-purple-300"
                    >
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** 分类编辑对话框 */
function CategoryEditDialog({
  open,
  category,
  onSave,
  onCancel
}: {
  open: boolean;
  category: MemeCategory | null;
  onSave: (category: MemeCategory) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [usageScenario, setUsageScenario] = useState("");
  const [examples, setExamples] = useState<string[]>([""]);
  
  // 初始化表单
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setUsageScenario(category.usageScenario || "");
      setExamples(category.examples && category.examples.length > 0 ? [...category.examples, ""] : [""]);
    } else {
      setName("");
      setDescription("");
      setUsageScenario("");
      setExamples([""]);
    }
  }, [category, open]);
  
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      alert("请输入分类名称");
      return;
    }
    
    const filteredExamples = examples
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    const newCategory: MemeCategory = {
      id: category?.id || `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || name.trim(),
      usageScenario: usageScenario.trim() || undefined,
      examples: filteredExamples.length > 0 ? filteredExamples : undefined,
      createdAt: category?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    
    onSave(newCategory);
  }, [name, description, usageScenario, examples, category, onSave]);
  
  const updateExample = useCallback((index: number, value: string) => {
    setExamples(prev => {
      const newExamples = [...prev];
      newExamples[index] = value;
      // 如果最后一个示例不为空，添加新的空输入框
      if (index === newExamples.length - 1 && value.trim()) {
        newExamples.push("");
      }
      return newExamples;
    });
  }, []);
  
  const removeExample = useCallback((index: number) => {
    setExamples(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {category ? "编辑分类" : "添加新分类"}
          </DialogTitle>
          <DialogDescription>
            填写分类的详细信息，帮助更好地管理和使用梗资源
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 分类名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">分类名称 *</label>
            <Input
              placeholder="如：职场梗、游戏梗..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          {/* 分类描述 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">分类描述 *</label>
            <Input
              placeholder="简短描述这个分类的特点"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          {/* 使用场景 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">使用场景</label>
            <Textarea
              placeholder="描述这个分类适合在什么场景下使用..."
              value={usageScenario}
              onChange={(e) => setUsageScenario(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* 使用示例 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">使用示例</label>
            <p className="text-xs text-muted-foreground">添加该分类的典型示例，帮助理解使用方法</p>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    placeholder={`示例 ${index + 1}...`}
                    value={example}
                    onChange={(e) => updateExample(index, e.target.value)}
                    className="min-h-[40px] text-sm"
                  />
                  {index < examples.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExample(index)}
                      className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" /> 保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 主组件
// ============================================================================

interface MemeCategoryManagerProps {
  onCategoriesChange?: (categories: MemeCategory[]) => void;
  memeCounts?: Record<string, number>;
}

export function MemeCategoryManager({ 
  onCategoriesChange,
  memeCounts = {}
}: MemeCategoryManagerProps) {
  // --- 状态 ---
  const [categories, setCategories] = useState<MemeCategory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<MemeCategory | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // --- 初始化 ---
  useEffect(() => {
    setCategories(getCategoriesFromLib());
  }, []);
  
  // --- 操作 ---
  const saveCategories = useCallback((newCategories: MemeCategory[]) => {
    setCategories(newCategories);
    saveCategoriesToLib(newCategories);
    onCategoriesChange?.(newCategories);
  }, [onCategoriesChange]);
  
  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    setShowEditDialog(true);
  }, []);
  
  const handleEdit = useCallback((category: MemeCategory) => {
    setEditingCategory(category);
    setShowEditDialog(true);
  }, []);
  
  const handleDelete = useCallback((id: string) => {
    setDeleteCategoryId(id);
    setShowDeleteDialog(true);
  }, []);
  
  const confirmDelete = useCallback(() => {
    if (deleteCategoryId) {
      saveCategories(categories.filter(c => c.id !== deleteCategoryId));
      setDeleteCategoryId(null);
      setShowDeleteDialog(false);
    }
  }, [deleteCategoryId, categories, saveCategories]);
  
  const handleSaveCategory = useCallback((category: MemeCategory) => {
    const existIndex = categories.findIndex(c => c.id === category.id);
    
    if (existIndex >= 0) {
      // 编辑现有分类
      const newCategories = [...categories];
      newCategories[existIndex] = category;
      saveCategories(newCategories);
    } else {
      // 添加新分类
      saveCategories([...categories, category]);
    }
    
    setShowEditDialog(false);
    setEditingCategory(null);
  }, [categories, saveCategories]);
  
  const handleResetToDefault = useCallback(() => {
    if (confirm("确定要重置为默认分类吗？您的自定义分类将被删除。")) {
      saveCategories(DEFAULT_MEME_CATEGORIES);
    }
  }, [saveCategories]);
  
  // 判断是否是系统分类
  const isSystemCategory = useCallback((id: string) => {
    return DEFAULT_MEME_CATEGORIES.some(c => c.id === id);
  }, []);
  
  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <Laugh className="w-5 h-5" />
            </div>
            梗分类管理
            <Badge variant="secondary">{categories.length} 个</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetToDefault}>
              重置默认
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> 添加分类
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          管理梗资源的分类，设置使用场景和示例，帮助AI更好地理解和使用梗资源
        </p>
        
        {/* 分类列表 */}
        <div className="space-y-2">
          {categories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              memeCount={memeCounts[category.name] || 0}
              isExpanded={expandedId === category.id}
              onToggle={() => setExpandedId(expandedId === category.id ? null : category.id)}
              onEdit={() => handleEdit(category)}
              onDelete={() => handleDelete(category.id)}
              isSystem={isSystemCategory(category.id)}
            />
          ))}
        </div>
        
        {/* 编辑对话框 */}
        <CategoryEditDialog
          open={showEditDialog}
          category={editingCategory}
          onSave={handleSaveCategory}
          onCancel={() => {
            setShowEditDialog(false);
            setEditingCategory(null);
          }}
        />
        
        {/* 删除确认对话框 */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这个分类吗？该分类下的梗资源将自动移动到"其他"分类。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
