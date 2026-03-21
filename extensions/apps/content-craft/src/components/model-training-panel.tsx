'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Brain,
  Database,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface ModelInfo {
  version: string;
  weights: Record<string, number>;
  featureStats: Record<string, { mean: number; std: number }>;
  lastUpdated: string | null;
}

interface TrainingStats {
  totalSamples: number;
  aiSamples: number;
  humanSamples: number;
  mixedSamples: number;
  avgConfidence: number;
}

// ============================================================================
// 权重可视化
// ============================================================================

function WeightVisualization({ weights }: { weights: Record<string, number> }) {
  const sortedWeights = Object.entries(weights)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">特征权重分布</div>
      {sortedWeights.map(([key, value]) => {
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1">{label}</span>
              <span className="font-mono font-medium ml-2">{value.toFixed(2)}</span>
            </div>
            <Progress value={value * 10} className="h-1.5" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 添加训练数据对话框
// ============================================================================

function AddTrainingDataDialog({ onAdd }: { onAdd: (data: {
  text: string;
  label: 'ai' | 'human' | 'mixed';
  features: Record<string, number>;
}) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [label, setLabel] = useState<'ai' | 'human' | 'mixed'>('ai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      // 先提取特征
      const featureResponse = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          options: { detailed: true, suggestions: false },
        }),
      });
      
      const featureData = await featureResponse.json();
      
      if (featureData.success) {
        onAdd({
          text,
          label,
          features: featureData.features || {},
        });
        setText('');
        setLabel('ai');
        setOpen(false);
      }
    } catch (error) {
      console.error('添加训练数据失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          添加数据
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">添加训练数据</DialogTitle>
          <DialogDescription>
            添加已标注的文本数据用于模型训练
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">文本内容</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入文本内容..."
              className="mt-1.5 min-h-[100px] text-sm"
            />
          </div>
          
          <div>
            <Label className="text-xs">标签类型</Label>
            <Select value={label} onValueChange={(v) => setLabel(v as 'ai' | 'human' | 'mixed')}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">AI生成</SelectItem>
                <SelectItem value="human">人类写作</SelectItem>
                <SelectItem value="mixed">混合内容</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  处理中
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  确认添加
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function ModelTrainingPanel() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [stats, setStats] = useState<TrainingStats>({
    totalSamples: 0,
    aiSamples: 0,
    humanSamples: 0,
    mixedSamples: 0,
    avgConfidence: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<string | null>(null);

  // 加载模型信息
  const loadModelInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/model-training?action=model');
      const data = await response.json();
      
      if (data.success) {
        setModelInfo(data.data);
      }
    } catch (error) {
      console.error('加载模型信息失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载训练统计
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/model-training?limit=1');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  // 训练模型
  const handleTrain = async () => {
    setIsTraining(true);
    setTrainingResult(null);
    try {
      const response = await fetch('/api/model-training', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'gradient' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setModelInfo({
          version: data.data.version,
          weights: data.data.weights,
          featureStats: modelInfo?.featureStats || {},
          lastUpdated: new Date().toISOString(),
        });
        setTrainingResult(data.data.message);
        loadStats();
      } else {
        setTrainingResult(`训练失败: ${data.error}`);
      }
    } catch (error) {
      console.error('模型训练失败:', error);
      setTrainingResult('训练过程出错');
    } finally {
      setIsTraining(false);
    }
  };

  // 添加训练数据
  const handleAddData = async (data: {
    text: string;
    label: 'ai' | 'human' | 'mixed';
    features: Record<string, number>;
  }) => {
    try {
      const response = await fetch('/api/model-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source: 'user',
          confidence: 0.9,
        }),
      });
      
      if (response.ok) {
        loadStats();
      }
    } catch (error) {
      console.error('添加训练数据失败:', error);
    }
  };

  // 清空训练数据
  const handleClearData = async () => {
    try {
      await fetch('/api/model-training', { method: 'DELETE' });
      loadStats();
    } catch (error) {
      console.error('清空数据失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    loadModelInfo();
    loadStats();
  }, [loadModelInfo, loadStats]);

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="py-2.5 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-500" />
            模型训练
            {modelInfo && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {modelInfo.version}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadModelInfo}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-4">
        {/* 数据统计 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
            <div className="text-lg font-bold text-blue-600">{stats.totalSamples}</div>
            <div className="text-[10px] text-muted-foreground">总样本</div>
          </div>
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
            <div className="text-lg font-bold text-red-600">{stats.aiSamples}</div>
            <div className="text-[10px] text-muted-foreground">AI</div>
          </div>
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
            <div className="text-lg font-bold text-green-600">{stats.humanSamples}</div>
            <div className="text-[10px] text-muted-foreground">人类</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
            <div className="text-lg font-bold text-amber-600">{stats.mixedSamples}</div>
            <div className="text-[10px] text-muted-foreground">混合</div>
          </div>
        </div>

        {/* 权重可视化 */}
        {modelInfo && (
          <WeightVisualization weights={modelInfo.weights} />
        )}

        {/* 训练结果 */}
        {trainingResult && (
          <div className={`p-2 rounded-lg text-xs ${
            trainingResult.includes('完成') 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700'
          }`}>
            <div className="flex items-center gap-1">
              {trainingResult.includes('完成') ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {trainingResult}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <AddTrainingDataDialog onAdd={handleAddData} />
          
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-7 text-xs bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            onClick={handleTrain}
            disabled={isTraining || stats.totalSamples < 10}
          >
            {isTraining ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                训练中...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                开始训练
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清空训练数据</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除所有训练数据，且无法撤销。确定要继续吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* 提示信息 */}
        {stats.totalSamples < 10 && (
          <div className="text-xs text-muted-foreground text-center">
            <Sparkles className="w-3 h-3 inline mr-1" />
            至少需要10条样本才能开始训练
          </div>
        )}
      </CardContent>
    </Card>
  );
}
