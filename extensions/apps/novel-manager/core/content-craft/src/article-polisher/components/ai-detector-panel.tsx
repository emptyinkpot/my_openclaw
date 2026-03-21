'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  FileText,
  Hash
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface AIFeature {
  feature: string;
  value: number;
  weight: number;
}

interface AIDetectionResult {
  score: number;
  isAI: boolean;
  confidence: number;
  analysis: {
    aiFeatures: AIFeature[];
    humanFeatures: AIFeature[];
  };
  suggestions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface AIDetectorProps {
  text: string;
  onEnhance?: () => void;
  isEnhancing?: boolean;
}

// ============================================================================
// 分数指示器组件
// ============================================================================

function ScoreIndicator({ score }: { score: number }) {
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

  const getLabel = () => {
    if (score >= 70) return '高风险';
    if (score >= 55) return '中等风险';
    return '低风险';
  };

  const getIcon = () => {
    if (score >= 70) return <ShieldAlert className="w-5 h-5" />;
    if (score >= 55) return <Shield className="w-5 h-5" />;
    return <ShieldCheck className="w-5 h-5" />;
  };

  return (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-full ${score >= 70 ? 'bg-red-100' : score >= 55 ? 'bg-amber-100' : 'bg-green-100'}`}>
        <div className={getColor()}>{getIcon()}</div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">AI检测分数</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getColor()}`}>{score}</span>
            <Badge variant={score >= 70 ? 'destructive' : score >= 55 ? 'default' : 'secondary'}>
              {getLabel()}
            </Badge>
          </div>
        </div>
        <Progress value={score} className={`h-2 [&>div]:${getBgColor()}`} />
      </div>
    </div>
  );
}

// ============================================================================
// 特征列表组件
// ============================================================================

function FeatureList({ 
  title, 
  features, 
  type 
}: { 
  title: string; 
  features: AIFeature[]; 
  type: 'ai' | 'human' 
}) {
  if (features.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {type === 'ai' ? (
          <TrendingUp className="w-4 h-4 text-red-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-green-500" />
        )}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-1.5">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
            <span className="text-xs">{feature.feature}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {typeof feature.value === 'number' ? feature.value.toFixed(2) : feature.value}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${type === 'ai' ? 'border-red-300 text-red-600' : 'border-green-300 text-green-600'}`}
              >
                权重 {feature.weight}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 建议列表组件
// ============================================================================

function SuggestionList({ suggestions }: { suggestions: AIDetectionResult['suggestions'] }) {
  if (suggestions.length === 0) return null;

  const getIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium">优化建议</span>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className={`flex items-start gap-2 p-2 rounded-lg border ${getBgColor(suggestion.priority)}`}
          >
            {getIcon(suggestion.priority)}
            <div className="flex-1">
              <span className="text-xs">{suggestion.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function AIDetectorPanel({ text, onEnhance, isEnhancing }: AIDetectorProps) {
  const [result, setResult] = useState<AIDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 执行检测
  const handleDetect = useCallback(async () => {
    if (!text.trim()) {
      setError('请先输入文本');
      return;
    }

    setIsDetecting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          options: { detailed: true, suggestions: true },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          score: data.score,
          isAI: data.isAI,
          confidence: data.confidence,
          analysis: data.analysis,
          suggestions: data.suggestions,
        });
      } else {
        setError(data.error || '检测失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsDetecting(false);
    }
  }, [text]);

  // 自动检测（当文本变化且长度足够时）
  React.useEffect(() => {
    if (text.length > 50 && !result) {
      // 延迟自动检测
      const timer = setTimeout(() => {
        handleDetect();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500" />
            <CardTitle className="text-sm">AI检测</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Badge variant={result.isAI ? 'destructive' : 'secondary'} className="text-xs">
                {result.isAI ? '疑似AI生成' : '可能人类写作'}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          检测文本是否具有AI生成特征
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* 检测按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleDetect}
            disabled={!text.trim() || isDetecting}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                检测中...
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                检测文本
              </>
            )}
          </Button>
          
          {result && result.isAI && onEnhance && (
            <Button
              onClick={onEnhance}
              disabled={isEnhancing}
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  一键对抗
                </>
              )}
            </Button>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 text-xs">
            {error}
          </div>
        )}

        {/* 检测结果 */}
        {result && (
          <div className="space-y-4">
            {/* 分数指示器 */}
            <ScoreIndicator score={result.score} />
            
            {/* 快速统计 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] text-muted-foreground">AI特征</span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  {result.analysis.aiFeatures.length}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-muted-foreground">人类特征</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {result.analysis.humanFeatures.length}
                </span>
              </div>
            </div>

            <Separator />

            {/* AI特征 */}
            <FeatureList
              title="AI特征"
              features={result.analysis.aiFeatures}
              type="ai"
            />

            {/* 人类特征 */}
            <FeatureList
              title="人类特征"
              features={result.analysis.humanFeatures}
              type="human"
            />

            <Separator />

            {/* 优化建议 */}
            <SuggestionList suggestions={result.suggestions} />
          </div>
        )}

        {/* 空状态 */}
        {!result && !isDetecting && !error && (
          <div className="text-center text-muted-foreground py-4">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">输入文本后点击检测按钮</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
