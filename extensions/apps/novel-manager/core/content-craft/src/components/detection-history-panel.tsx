'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  History,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface DetectionRecord {
  id: string;
  textHash: string;
  textLength: number;
  score: number;
  features: Record<string, number>;
  suggestions: string[];
  timestamp: string;
  metadata?: {
    source?: string;
    optimized?: boolean;
    originalScore?: number;
    improvement?: number;
  };
}

interface HistoryStats {
  total: number;
  avgScore: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  improvements: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// 历史记录卡片
// ============================================================================

function HistoryCard({ record, onDelete }: { record: DetectionRecord; onDelete: (id: string) => void }) {
  const [showDetails, setShowDetails] = useState(false);

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive" className="text-[10px]">高风险</Badge>;
    if (score >= 55) return <Badge variant="default" className="text-[10px]">中等风险</Badge>;
    return <Badge variant="secondary" className="text-[10px]">低风险</Badge>;
  };

  const getIcon = (score: number) => {
    if (score >= 70) return <ShieldAlert className="w-4 h-4 text-red-500" />;
    if (score >= 55) return <Shield className="w-4 h-4 text-amber-500" />;
    return <ShieldCheck className="w-4 h-4 text-green-500" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getIcon(record.score)}
          <span className="text-lg font-bold">{record.score}</span>
          {getRiskBadge(record.score)}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(record.timestamp)}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span>长度: {record.textLength}字</span>
        <span>来源: {record.metadata?.source || '未知'}</span>
        {record.metadata?.improvement && record.metadata.improvement > 0 && (
          <span className="text-green-600 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            降{record.metadata.improvement}分
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Progress value={record.score} className="flex-1 h-1.5" />
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              详情
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">检测详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-2">分数: {record.score}</div>
                <Progress value={record.score} className="h-2" />
              </div>
              
              {Object.keys(record.features).length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2">特征分布</div>
                  <div className="space-y-1.5">
                    {Object.entries(record.features).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium">{value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {record.suggestions.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-2">优化建议</div>
                  <ul className="space-y-1">
                    {record.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                        <Sparkles className="w-3 h-3 mt-0.5 text-violet-500" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full">
                    <Trash2 className="w-3 h-3 mr-1" />
                    删除记录
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销，确定要删除这条检测记录吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(record.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ============================================================================
// 统计信息面板
// ============================================================================

function StatsPanel({ stats }: { stats: HistoryStats }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
          {stats.total}
        </div>
        <div className="text-[10px] text-muted-foreground">总检测</div>
      </div>
      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
        <div className="text-2xl font-bold text-green-600">
          {stats.lowRisk}
        </div>
        <div className="text-[10px] text-muted-foreground">低风险</div>
      </div>
      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
        <div className="text-2xl font-bold text-red-600">
          {stats.highRisk}
        </div>
        <div className="text-[10px] text-muted-foreground">高风险</div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function DetectionHistoryPanel() {
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    total: 0,
    avgScore: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    improvements: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // 加载历史记录
  const loadHistory = useCallback(async (offset: number = 0) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/detection-history?limit=${pagination.limit}&offset=${offset}`
      );
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.data.records);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit]);

  // 删除记录
  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/detection-history?id=${id}`, { method: 'DELETE' });
      loadHistory(pagination.offset);
    } catch (error) {
      console.error('删除记录失败:', error);
    }
  }, [loadHistory, pagination.offset]);

  // 清空所有记录
  const handleClearAll = useCallback(async () => {
    try {
      await fetch('/api/detection-history', { method: 'DELETE' });
      loadHistory(0);
    } catch (error) {
      console.error('清空记录失败:', error);
    }
  }, [loadHistory]);

  // 初始加载
  useEffect(() => {
    loadHistory(0);
  }, []);

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="py-2.5 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-violet-500" />
            检测历史
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadHistory(pagination.offset)}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清空历史记录</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除所有检测历史记录，且无法撤销。确定要继续吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    清空
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        {/* 统计信息 */}
        <StatsPanel stats={stats} />

        {/* 历史记录列表 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2" />
            <p className="text-xs">加载中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">暂无检测记录</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {records.map(record => (
              <HistoryCard
                key={record.id}
                record={record}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* 分页 */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.offset === 0}
              onClick={() => loadHistory(pagination.offset - pagination.limit)}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} / {pagination.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore}
              onClick={() => loadHistory(pagination.offset + pagination.limit)}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
