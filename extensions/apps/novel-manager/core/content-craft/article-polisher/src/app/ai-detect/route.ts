/**
 * ============================================================================
 * AI 文本检测 API
 * ============================================================================
 * 
 * 功能：检测文本是否为AI生成，并提供详细分析
 * 
 * 特点：
 * - 多维度特征分析
 * - 可解释的检测结果
 * - 优化建议生成
 * - 支持自定义模型权重
 * - 自动保存检测历史
 */

import { NextRequest, NextResponse } from "next/server";
import { AIDetector, FeatureExtractor, type AIDetectionResult } from "@/lib/ai-detector";

// ============================================================================
// 类型定义
// ============================================================================

interface DetectRequest {
  text: string;
  options?: {
    detailed?: boolean;       // 是否返回详细分析
    suggestions?: boolean;    // 是否生成优化建议
    saveHistory?: boolean;    // 是否保存到历史记录
    source?: string;          // 来源标识
  };
}

// ============================================================================
// 获取模型权重
// ============================================================================

async function getModelWeights(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/model-training?action=model`);
    const data = await response.json();
    if (data.success && data.data.weights) {
      return data.data.weights;
    }
    return null;
  } catch (error) {
    console.error('[AI Detect] Failed to get model weights:', error);
    return null;
  }
}

// ============================================================================
// 保存检测历史
// ============================================================================

async function saveDetectionHistory(data: {
  text: string;
  score: number;
  features: Record<string, number>;
  suggestions: string[];
  source?: string;
  originalScore?: number;
}): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/detection-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('[AI Detect] Failed to save history:', error);
  }
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as DetectRequest;
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { success: false, error: "缺少文本内容" },
        { status: 400 }
      );
    }

    const text = body.text;
    const options = {
      detailed: body.options?.detailed ?? true,
      suggestions: body.options?.suggestions ?? true,
      saveHistory: body.options?.saveHistory ?? false,
      source: body.options?.source ?? 'api',
    };

    // 获取最新的模型权重
    const customWeights = await getModelWeights() ?? undefined;

    // 创建检测器
    const detector = new AIDetector({
      modelType: 'ensemble',
      confidence: 0.7,
      customWeights,
    });

    // 执行检测
    const result = detector.detect(text);

    // 提取特征
    const features = FeatureExtractor.extract(text);

    // 构建响应
    const response: {
      success: boolean;
      score: number;
      isAI: boolean;
      confidence: number;
      analysis?: AIDetectionResult['analysis'];
      features?: typeof features;
      suggestions?: AIDetectionResult['suggestions'];
    } = {
      success: true,
      score: result.score,
      isAI: result.isAI,
      confidence: result.confidence,
    };

    // 添加详细分析
    if (options.detailed) {
      response.analysis = result.analysis;
      response.features = features;
    }

    // 添加优化建议
    if (options.suggestions) {
      response.suggestions = result.suggestions;
    }

    // 保存到历史记录
    if (options.saveHistory) {
      // 扁平化特征
      const flatFeatures: Record<string, number> = {
        vocabulary_diversity: (features as any).lexical?.typeTokenRatio || 0,
        sentence_variety: (features as any).stylistic?.burstiness || 0,
        transitional_density: (features as any).syntactic?.transitionCount || 0,
        average_sentence_length: (features as any).lexical?.avgSentenceLength || 0,
      };
      
      saveDetectionHistory({
        text,
        score: result.score,
        features: flatFeatures,
        suggestions: (result.suggestions || []).map(s => s.description),
        source: options.source,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[AI Detect API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "检测失败" 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET 方法 - 获取检测器信息
// ============================================================================

export async function GET() {
  // 获取当前模型信息
  let modelInfo = null;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/model-training?action=model`);
    const data = await response.json();
    if (data.success) {
      modelInfo = {
        version: data.data.version,
        weights: data.data.weights,
        lastUpdated: data.data.lastUpdated,
      };
    }
  } catch (error) {
    console.error('[AI Detect] Failed to get model info:', error);
  }

  return NextResponse.json({
    success: true,
    info: {
      name: "AI 文本检测器",
      version: modelInfo?.version || "1.0.0",
      description: "基于多维度特征的AI生成文本检测",
      features: [
        "词汇特征分析",
        "句法特征分析",
        "风格特征分析",
        "统计特征分析",
        "AI模式匹配",
        "支持自定义模型权重",
      ],
      thresholds: {
        high: "> 70 分 - 高概率AI生成",
        medium: "55-70 分 - 可能是AI生成",
        low: "< 55 分 - 可能是人类写作",
      },
      modelInfo,
    },
  });
}
