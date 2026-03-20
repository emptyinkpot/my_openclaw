import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// 类型定义
// ============================================================================

interface TrainingData {
  id: string;
  text: string;
  textHash: string;
  features: Record<string, number>;
  label: 'ai' | 'human' | 'mixed';
  confidence: number;
  source: string;
  timestamp: string;
  metadata?: {
    model?: string;
    prompt?: string;
    domain?: string;
    language?: string;
    wordCount?: number;
  };
}

interface ModelStats {
  totalSamples: number;
  aiSamples: number;
  humanSamples: number;
  mixedSamples: number;
  avgConfidence: number;
  featureStats: Record<string, { mean: number; std: number }>;
}

// ============================================================================
// 内存存储 (生产环境应使用数据库)
// ============================================================================

const globalForTraining = global as unknown as {
  trainingData: TrainingData[] | undefined;
  modelVersion: string | undefined;
  modelWeights: Record<string, number> | undefined;
};

const trainingData: TrainingData[] = globalForTraining.trainingData || [];
let modelVersion = globalForTraining.modelVersion || 'v1.0.0';
let modelWeights = globalForTraining.modelWeights || {
  vocabulary_diversity: 0.15,
  sentence_variety: 0.12,
  transitional_density: 0.18,
  average_sentence_length: 0.08,
  rare_word_usage: 0.10,
  personal_pronoun_usage: 0.10,
  emotion_indicator: 0.12,
  structure_uniformity: 0.15,
};

if (!globalForTraining.trainingData) {
  globalForTraining.trainingData = trainingData;
  globalForTraining.modelVersion = modelVersion;
  globalForTraining.modelWeights = modelWeights;
}

// 生成ID
function generateId(): string {
  return `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 哈希文本
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// 计算特征统计
function calculateFeatureStats(): Record<string, { mean: number; std: number }> {
  if (trainingData.length === 0) return {};

  const featureKeys = Object.keys(trainingData[0].features);
  const stats: Record<string, { mean: number; std: number }> = {};

  for (const key of featureKeys) {
    const values = trainingData.map(d => d.features[key] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    stats[key] = { mean, std: Math.sqrt(variance) };
  }

  return stats;
}

// ============================================================================
// GET: 获取训练数据统计
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 获取模型信息
    if (action === 'model') {
      return NextResponse.json({
        success: true,
        data: {
          version: modelVersion,
          weights: modelWeights,
          featureStats: calculateFeatureStats(),
          lastUpdated: trainingData.length > 0 
            ? trainingData[trainingData.length - 1].timestamp 
            : null,
        },
      });
    }

    // 获取训练数据样本
    const label = searchParams.get('label') as 'ai' | 'human' | 'mixed' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredData = [...trainingData];
    if (label) {
      filteredData = filteredData.filter(d => d.label === label);
    }

    const paginatedData = filteredData.slice(offset, offset + limit);

    // 统计信息
    const stats: ModelStats = {
      totalSamples: trainingData.length,
      aiSamples: trainingData.filter(d => d.label === 'ai').length,
      humanSamples: trainingData.filter(d => d.label === 'human').length,
      mixedSamples: trainingData.filter(d => d.label === 'mixed').length,
      avgConfidence: trainingData.length > 0
        ? trainingData.reduce((sum, d) => sum + d.confidence, 0) / trainingData.length
        : 0,
      featureStats: calculateFeatureStats(),
    };

    return NextResponse.json({
      success: true,
      data: {
        samples: paginatedData,
        stats,
        pagination: {
          total: filteredData.length,
          limit,
          offset,
          hasMore: offset + limit < filteredData.length,
        },
      },
    });
  } catch (error) {
    console.error('获取训练数据失败:', error);
    return NextResponse.json(
      { error: '获取训练数据失败' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: 添加训练数据
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      features, 
      label, 
      confidence,
      source,
      metadata,
    } = body;

    if (!text || !features || !label) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证标签
    if (!['ai', 'human', 'mixed'].includes(label)) {
      return NextResponse.json(
        { error: '无效的标签类型' },
        { status: 400 }
      );
    }

    // 创建训练数据
    const data: TrainingData = {
      id: generateId(),
      text,
      textHash: hashText(text),
      features,
      label,
      confidence: confidence || 0.8,
      source: source || 'user',
      timestamp: new Date().toISOString(),
      metadata: {
        wordCount: text.length,
        ...metadata,
      },
    };

    // 检查重复
    const exists = trainingData.some(d => d.textHash === data.textHash);
    if (exists) {
      return NextResponse.json({
        success: false,
        message: '数据已存在',
      });
    }

    trainingData.push(data);

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        label: data.label,
        timestamp: data.timestamp,
      },
    });
  } catch (error) {
    console.error('添加训练数据失败:', error);
    return NextResponse.json(
      { error: '添加训练数据失败' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT: 训练模型 (更新权重)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { method = 'gradient' } = body;

    if (trainingData.length < 10) {
      return NextResponse.json(
        { error: '训练数据不足，至少需要10条样本' },
        { status: 400 }
      );
    }

    // 简单的梯度下降训练模拟
    // 实际生产环境应使用专业ML框架
    const learningRate = 0.01;
    const epochs = 10;
    const featureKeys = Object.keys(modelWeights);

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const data of trainingData) {
        const expectedScore = data.label === 'ai' ? 80 : data.label === 'human' ? 30 : 55;
        let currentScore = 0;
        
        for (const key of featureKeys) {
          currentScore += (data.features[key] || 0) * modelWeights[key];
        }

        const error = (expectedScore - currentScore) / 100;

        // 更新权重
        for (const key of featureKeys) {
          const gradient = (data.features[key] || 0) * error;
          modelWeights[key] += learningRate * gradient;
          // 限制权重范围
          modelWeights[key] = Math.max(0.05, Math.min(0.3, modelWeights[key]));
        }
      }
    }

    // 归一化权重
    const totalWeight = Object.values(modelWeights).reduce((a, b) => a + b, 0);
    for (const key of featureKeys) {
      modelWeights[key] /= totalWeight;
      modelWeights[key] *= 100; // 放大以便分数在0-100范围
    }

    // 更新版本号
    const versionParts = modelVersion.split('.');
    versionParts[2] = String(parseInt(versionParts[2]) + 1);
    modelVersion = versionParts.join('.');

    globalForTraining.modelVersion = modelVersion;
    globalForTraining.modelWeights = modelWeights;

    const stats: ModelStats = {
      totalSamples: trainingData.length,
      aiSamples: trainingData.filter(d => d.label === 'ai').length,
      humanSamples: trainingData.filter(d => d.label === 'human').length,
      mixedSamples: trainingData.filter(d => d.label === 'mixed').length,
      avgConfidence: trainingData.reduce((sum, d) => sum + d.confidence, 0) / trainingData.length,
      featureStats: calculateFeatureStats(),
    };

    return NextResponse.json({
      success: true,
      data: {
        version: modelVersion,
        weights: modelWeights,
        stats,
        message: `模型训练完成，使用 ${trainingData.length} 条数据`,
      },
    });
  } catch (error) {
    console.error('模型训练失败:', error);
    return NextResponse.json(
      { error: '模型训练失败' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: 删除训练数据
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const index = trainingData.findIndex(d => d.id === id);
      if (index !== -1) {
        trainingData.splice(index, 1);
      }
    } else {
      // 清空所有数据
      trainingData.length = 0;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除训练数据失败:', error);
    return NextResponse.json(
      { error: '删除训练数据失败' },
      { status: 500 }
    );
  }
}
