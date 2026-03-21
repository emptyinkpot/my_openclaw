/**
 * ============================================================================
 * 线性进度条组件
 * ============================================================================
 * 
 * 特点：
 * 1. 平滑动画过渡 - 进度不会跳跃
 * 2. 持续微增长 - 即使后端没有更新，进度也会缓慢增长
 * 3. 预估时间显示 - 显示当前步骤和预估剩余时间
 * 4. 阶段指示 - 清晰显示当前处理阶段
 */

"use client";

import { memo, useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

// ============================================================================
// 类型定义
// ============================================================================

export interface ProcessingPhase {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
}

export interface LinearProgressProps {
  /** 目标进度（0-100） */
  progress: number;
  /** 状态消息 */
  message: string;
  /** 当前阶段信息（可选，用于自动检测） */
  phase?: ProcessingPhase;
  /** 是否显示预估时间 */
  showTimeEstimate?: boolean;
  /** 是否启用持续微增长 */
  enableContinuousProgress?: boolean;
}

// ============================================================================
// 阶段检测
// ============================================================================

const PHASE_CONFIGS: Array<{
  keywords: string[];
  phase: ProcessingPhase;
}> = [
  {
    keywords: ["识别", "分析"],
    phase: {
      id: "detect",
      icon: "🔍",
      label: "自动识别",
      desc: "识别叙事角色、年代、阵营",
      color: "text-blue-600",
      bg: "from-blue-50 to-indigo-50",
    },
  },
  {
    keywords: ["保护引用", "联想", "构建"],
    phase: {
      id: "prepare",
      icon: "⚙️",
      label: "准备处理",
      desc: "准备资源和处理指令",
      color: "text-slate-600",
      bg: "from-slate-50 to-gray-50",
    },
  },
  {
    keywords: ["润色", "词汇"],
    phase: {
      id: "polish",
      icon: "✨",
      label: "词汇润色",
      desc: "匹配词汇库进行近义词替换",
      color: "text-indigo-600",
      bg: "from-indigo-50 to-purple-50",
    },
  },
  {
    keywords: ["反感", "禁用", "净化"],
    phase: {
      id: "banned",
      icon: "⚠️",
      label: "反感词净化",
      desc: "清除禁用词/反感词/劣质比喻",
      color: "text-red-600",
      bg: "from-red-50 to-orange-50",
    },
  },
  {
    keywords: ["句式", "逻辑"],
    phase: {
      id: "sentence",
      icon: "📝",
      label: "句式逻辑净化",
      desc: "替换禁用的句式逻辑表达",
      color: "text-rose-600",
      bg: "from-rose-50 to-pink-50",
    },
  },
  {
    keywords: ["梗", "融合"],
    phase: {
      id: "meme",
      icon: "😄",
      label: "梗融合",
      desc: "融合网络梗，增添趣味性",
      color: "text-purple-600",
      bg: "from-purple-50 to-pink-50",
    },
  },
  {
    keywords: ["风格", "熔铸"],
    phase: {
      id: "style",
      icon: "🎨",
      label: "风格熔铸",
      desc: "统一比喻风格，植入细节描写",
      color: "text-violet-600",
      bg: "from-violet-50 to-purple-50",
    },
  },
  {
    keywords: ["分段", "段"],
    phase: {
      id: "segment",
      icon: "📄",
      label: "分段处理",
      desc: "处理长文本分段",
      color: "text-cyan-600",
      bg: "from-cyan-50 to-teal-50",
    },
  },
  {
    keywords: ["解析", "恢复"],
    phase: {
      id: "parse",
      icon: "🔧",
      label: "后处理",
      desc: "解析和恢复处理结果",
      color: "text-amber-600",
      bg: "from-amber-50 to-yellow-50",
    },
  },
  {
    keywords: ["格式", "markdown", "Markdown"],
    phase: {
      id: "format",
      icon: "🧹",
      label: "格式净化",
      desc: "清理 Markdown 语法残留",
      color: "text-cyan-600",
      bg: "from-cyan-50 to-teal-50",
    },
  },
  {
    keywords: ["审稿", "审校", "语义", "审查", "检查"],
    phase: {
      id: "review",
      icon: "✅",
      label: "审稿验证",
      desc: "检查语义、风格、配置达成",
      color: "text-green-600",
      bg: "from-green-50 to-emerald-50",
    },
  },
  {
    keywords: ["生成", "报告", "分析"],
    phase: {
      id: "report",
      icon: "📊",
      label: "生成报告",
      desc: "生成处理报告和修改记录",
      color: "text-teal-600",
      bg: "from-teal-50 to-cyan-50",
    },
  },
];

function detectPhase(message: string, progress: number): ProcessingPhase {
  const msg = message.toLowerCase();
  
  for (const config of PHASE_CONFIGS) {
    if (config.keywords.some(kw => msg.includes(kw.toLowerCase()))) {
      return config.phase;
    }
  }
  
  // 默认阶段
  if (progress >= 90) {
    return {
      id: "complete",
      icon: "🎉",
      label: "处理完成",
      desc: "润色处理已完成",
      color: "text-green-600",
      bg: "from-green-50 to-emerald-50",
    };
  }
  
  return {
    id: "processing",
    icon: "⚙️",
    label: "处理中",
    desc: "正在处理文本...",
    color: "text-slate-600",
    bg: "from-slate-50 to-gray-50",
  };
}

// ============================================================================
// 线性进度条组件
// ============================================================================

export const LinearProgress = memo(function LinearProgress({
  progress,
  message,
  phase,
  showTimeEstimate = true,
  enableContinuousProgress = true,
}: LinearProgressProps) {
  // 显示进度（平滑过渡后的）
  const [displayProgress, setDisplayProgress] = useState(0);
  // 上一次更新时间
  const lastUpdateRef = useRef(Date.now());
  // 上一次接收到的进度
  const lastReceivedProgressRef = useRef(0);
  // 动画帧ID
  const animationRef = useRef<number | null>(null);
  // 开始时间
  const startTimeRef = useRef(Date.now());
  
  // 检测当前阶段
  const currentPhase = phase || detectPhase(message, progress);
  
  // 平滑进度动画
  useEffect(() => {
    const targetProgress = progress;
    lastReceivedProgressRef.current = targetProgress;
    lastUpdateRef.current = Date.now();
    
    // 如果目标进度小于显示进度，直接跳转（重置情况）
    if (targetProgress < displayProgress) {
      setDisplayProgress(targetProgress);
      startTimeRef.current = Date.now();
      return;
    }
    
    // 清除之前的动画
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // 动画过渡
    const animate = () => {
      setDisplayProgress(current => {
        const diff = targetProgress - current;
        
        if (Math.abs(diff) < 0.5) {
          return targetProgress;
        }
        
        // 平滑过渡：使用缓动函数
        const step = diff * 0.08;
        return current + step;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [progress, displayProgress]);
  
  // 持续微增长：当后端长时间没有更新时，进度条仍然保持微弱增长
  useEffect(() => {
    if (!enableContinuousProgress) return;
    
    const interval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      
      // 如果超过2秒没有新进度，且当前进度不到95%，启动微增长
      if (timeSinceLastUpdate > 2000 && displayProgress < 95 && displayProgress >= lastReceivedProgressRef.current) {
        // 微增长速率：每秒增加0.2%
        const increment = 0.002 * (timeSinceLastUpdate - 2000) / 1000;
        setDisplayProgress(current => Math.min(current + increment, 95));
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [displayProgress, enableContinuousProgress]);
  
  // 计算预估剩余时间
  const estimatedTimeRemaining = (() => {
    if (!showTimeEstimate) return null;
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000; // 秒
    const progressRate = displayProgress / elapsed;
    
    if (progressRate < 0.1 || displayProgress < 5) {
      return null; // 进度太少，无法预估
    }
    
    const remaining = (100 - displayProgress) / progressRate;
    
    if (remaining < 5) return "即将完成";
    if (remaining < 30) return `约 ${Math.ceil(remaining)} 秒`;
    if (remaining < 60) return `约 ${Math.ceil(remaining / 5) * 5} 秒`;
    return `约 ${Math.ceil(remaining / 60)} 分钟`;
  })();

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r ${currentPhase.bg} border shadow-sm`}>
      {/* 顶部：图标和标题 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow">
          <span className="text-2xl">{currentPhase.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <div>
              <span className={`text-sm font-semibold ${currentPhase.color}`}>{currentPhase.label}</span>
              {showTimeEstimate && estimatedTimeRemaining && (
                <span className="text-xs text-muted-foreground ml-2">
                  · {estimatedTimeRemaining}
                </span>
              )}
            </div>
            <span className="text-lg font-bold text-indigo-600">{Math.round(displayProgress)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">{currentPhase.desc}</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
      
      {/* 进度条 */}
      <div className="relative h-3 bg-white/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${displayProgress}%` }}
        >
          {/* 光效动画 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
        
        {/* 进度刻度标记 */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[25, 50, 75].map(mark => (
            <div
              key={mark}
              className="w-px h-full bg-white/20"
              style={{ marginLeft: `${mark - 1}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* 底部：详细消息 */}
      <div className="mt-2 text-xs text-muted-foreground truncate">
        {message}
      </div>
    </div>
  );
});

// ============================================================================
// 进度步骤指示器
// ============================================================================

export interface ProgressStep {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "active" | "completed";
}

export interface ProgressStepsProps {
  steps: ProgressStep[];
  currentStepId: string;
}

export const ProgressSteps = memo(function ProgressSteps({
  steps,
  currentStepId,
}: ProgressStepsProps) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((step, index) => {
        const isActive = step.id === currentStepId;
        const isCompleted = step.status === "completed";
        const isPast = steps.findIndex(s => s.id === currentStepId) > index;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`
                flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300
                ${isActive ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" : ""}
                ${isCompleted || isPast ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}
                ${!isActive && !isCompleted && !isPast ? "text-muted-foreground" : ""}
              `}
            >
              <span>{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-4 h-px mx-1 ${isPast ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
});

// ============================================================================
// 简洁版进度条（用于嵌入其他组件）
// ============================================================================

export const LinearProgressCompact = memo(function LinearProgressCompact({
  progress,
  message,
}: {
  progress: number;
  message: string;
}) {
  const [displayProgress, setDisplayProgress] = useState(0);
  
  useEffect(() => {
    const animate = () => {
      setDisplayProgress(current => {
        const diff = progress - current;
        if (Math.abs(diff) < 0.5) return progress;
        return current + diff * 0.1;
      });
    };
    
    const timer = setInterval(animate, 50);
    return () => clearInterval(timer);
  }, [progress]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-[200px]">{message}</span>
        <span className="font-medium text-indigo-600">{Math.round(displayProgress)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-200"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
});

export default LinearProgress;
