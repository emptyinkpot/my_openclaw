'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface QuickScore {
  score: number;
  isAI: boolean;
}

interface RealtimeDetectorProps {
  text: string;
  originalScore?: number;
  onScoreChange?: (score: number) => void;
  onFullDetect?: () => void;
}

// ============================================================================
// 实时检测 Hook
// ============================================================================

function useRealtimeDetect(text: string, minLength: number = 50) {
  const [score, setScore] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const detect = useCallback(async (inputText: string) => {
    if (inputText.length < minLength) {
      setScore(null);
      return;
    }

    setIsDetecting(true);
    try {
      // 快速检测 - 只获取分数
      const response = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          options: { detailed: false, suggestions: false },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setScore(data.score);
      }
    } catch (error) {
      console.error('Quick detect failed:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [minLength]);

  // 防抖检测
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length >= minLength) {
      debounceRef.current = setTimeout(() => {
        detect(text);
      }, 800); // 停止打字800ms后检测
    } else {
      setScore(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text, minLength, detect]);

  return { score, isDetecting, detect };
}

// ============================================================================
// 迷你分数指示器
// ============================================================================

function MiniScoreIndicator({ 
  score, 
  isDetecting,
  originalScore 
}: { 
  score: number | null; 
  isDetecting: boolean;
  originalScore?: number;
}) {
  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">检测中...</span>
      </div>
    );
  }

  if (score === null) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span className="text-xs">输入文本后自动检测</span>
      </div>
    );
  }

  const getColor = () => {
    if (score >= 70) return 'text-red-500';
    if (score >= 55) return 'text-amber-500';
    return 'text-green-500';
  };

  const getBgColor = () => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 55) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getIcon = () => {
    if (score >= 70) return <ShieldAlert className="w-4 h-4" />;
    if (score >= 55) return <Shield className="w-4 h-4" />;
    return <ShieldCheck className="w-4 h-4" />;
  };

  // 计算分数变化
  const scoreChange = originalScore !== undefined ? originalScore - score : null;
  const isImproved = scoreChange !== null && scoreChange > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${score >= 70 ? 'bg-red-100' : score >= 55 ? 'bg-amber-100' : 'bg-green-100'}`}>
            <div className={getColor()}>{getIcon()}</div>
          </div>
          <span className={`text-sm font-bold ${getColor()}`}>{score}</span>
          {score >= 70 && <Badge variant="destructive" className="text-[10px] h-4">高风险</Badge>}
          {score >= 55 && score < 70 && <Badge variant="default" className="text-[10px] h-4">中等风险</Badge>}
          {score < 55 && <Badge variant="secondary" className="text-[10px] h-4">低风险</Badge>}
        </div>
        
        {isImproved && (
          <div className="flex items-center gap-1 text-green-600">
            <TrendingDown className="w-3 h-3" />
            <span className="text-xs font-medium">-{scoreChange}</span>
          </div>
        )}
      </div>
      
      <Progress value={score} className={`h-1.5 [&>div]:${getBgColor()}`} />
    </div>
  );
}

// ============================================================================
// 对比展示组件
// ============================================================================

function ScoreComparison({ 
  original, 
  optimized 
}: { 
  original: number; 
  optimized: number;
}) {
  const improvement = original - optimized;
  const percentage = Math.round((improvement / original) * 100);
  const isGood = improvement > 0;

  return (
    <div className="p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">优化效果对比</span>
        <Badge variant={isGood ? 'default' : 'destructive'} className="text-xs">
          {isGood ? `降低 ${percentage}%` : '需进一步优化'}
        </Badge>
      </div>
      
      <div className="flex items-center gap-3">
        {/* 原始分数 */}
        <div className="flex-1 text-center">
          <div className="text-xs text-muted-foreground mb-1">优化前</div>
          <div className={`text-2xl font-bold ${original >= 70 ? 'text-red-500' : original >= 55 ? 'text-amber-500' : 'text-green-500'}`}>
            {original}
          </div>
        </div>
        
        {/* 箭头 */}
        <div className="flex flex-col items-center">
          <ArrowRight className="w-5 h-5 text-violet-500" />
          {isGood && (
            <span className="text-xs text-green-600 font-medium mt-1">
              -{improvement}
            </span>
          )}
        </div>
        
        {/* 优化后分数 */}
        <div className="flex-1 text-center">
          <div className="text-xs text-muted-foreground mb-1">优化后</div>
          <div className={`text-2xl font-bold ${optimized >= 70 ? 'text-red-500' : optimized >= 55 ? 'text-amber-500' : 'text-green-500'}`}>
            {optimized}
          </div>
        </div>
      </div>
      
      {/* 进度条对比 */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-12 text-right">原:</span>
          <Progress value={original} className="flex-1 h-1" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-12 text-right">新:</span>
          <Progress value={optimized} className="flex-1 h-1" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function RealtimeAIDetector({ 
  text, 
  originalScore,
  onScoreChange,
  onFullDetect 
}: RealtimeDetectorProps) {
  const { score, isDetecting } = useRealtimeDetect(text);
  const [showComparison, setShowComparison] = useState(false);

  // 通知父组件分数变化
  useEffect(() => {
    if (score !== null && onScoreChange) {
      onScoreChange(score);
    }
  }, [score, onScoreChange]);

  // 显示对比（当有原始分数且当前分数不同时）
  useEffect(() => {
    if (originalScore !== undefined && score !== null && originalScore !== score) {
      setShowComparison(true);
    }
  }, [originalScore, score]);

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="py-2.5 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500" />
            实时AI检测
          </CardTitle>
          {score !== null && !isDetecting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFullDetect}
              className="h-6 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              详细分析
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-3 space-y-3">
        {/* 迷你分数指示器 */}
        <MiniScoreIndicator 
          score={score} 
          isDetecting={isDetecting}
          originalScore={originalScore}
        />

        {/* 对比展示 */}
        {showComparison && originalScore !== undefined && score !== null && (
          <ScoreComparison original={originalScore} optimized={score} />
        )}

        {/* 提示信息 */}
        {score !== null && score >= 55 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {score >= 70 
                  ? '文本具有明显AI特征，建议使用"一键对抗"优化'
                  : '文本存在部分AI特征，可考虑优化'}
              </p>
              {onFullDetect && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={onFullDetect}
                  className="h-auto p-0 mt-1 text-xs text-amber-600"
                >
                  查看详细分析 →
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 低分提示 */}
        {score !== null && score < 55 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-300">
              文本AI特征较少，可读性较好
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
