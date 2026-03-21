/**
 * ============================================================================
 * 智能联想 API
 * ============================================================================
 * 根据已有资源库推测可能相关的词汇/禁用词/文献，扩展资源覆盖面
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClientManager, invokeLLM } from '@/lib';

// 联想结果类型
interface AssociateResult {
  vocabulary: string[];      // 联想出的词汇
  bannedWords: string[];     // 联想出的禁用词
  literature: string[];      // 联想出的文献
}

// 联想提示词构建
function buildAssociatePrompt(
  vocabulary: string[],
  bannedWords: string[],
  literature: string[],
  text?: string
): { system: string; user: string } {
  const systemPrompt = `你是语言分析和词汇联想专家。
你的任务是根据已有的资源库，推测用户可能还需要哪些类似的词汇/禁用词/文献。

【联想规则】
1. 词汇联想：根据已有词汇的风格、主题、情感色彩，联想同类词汇
   - 例：已有"凛冽"→可联想"萧瑟"、"肃杀"、"冷峻"
   - 例：已有"踌躇"→可联想"徘徊"、"彷徨"、"踟蹰"

2. 禁用词联想：根据已有禁用词的风格偏好，联想用户可能厌恶的其他表达
   - 例：已有禁用"因此"→可能也厌恶"故而"、"由此可见"
   - 例：已有禁用"十分"→可能也厌恶"非常"、"极其"、"格外"

3. 文献联想：根据已有文献的主题和作者偏好，联想相关文献
   - 例：已有《君主论》→可能需要《利维坦》、《社会契约论》
   - 例：已有石原莞尔的作品→可能需要板垣征四郎、土肥原贤二的言论

【输出格式】
返回JSON格式：
{
  "vocabulary": ["词1", "词2", "词3"],
  "bannedWords": ["禁用词1", "禁用词2"],
  "literature": ["《书名》作者", "《书名2》作者"]
}

只输出JSON，不要解释。每类最多联想10个。`;

  let userPrompt = `【已有资源库】
词汇库样本（前50条）：${vocabulary.slice(0, 50).join('、')}
禁用词库样本（前30条）：${bannedWords.slice(0, 30).join('、')}
文献库样本（前20条）：${literature.slice(0, 20).join('、')}
`;

  if (text) {
    userPrompt += `\n【待处理文本片段】
${text.slice(0, 500)}
请根据文本内容，联想可能需要用到的词汇和文献。`;
  }

  userPrompt += `\n请进行智能联想，返回JSON。`;

  return { system: systemPrompt, user: userPrompt };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vocabulary = [], bannedWords = [], literature = [], text } = body;

    // 如果没有任何资源，返回空结果
    if (vocabulary.length === 0 && bannedWords.length === 0 && literature.length === 0) {
      return NextResponse.json({
        success: true,
        result: { vocabulary: [], bannedWords: [], literature: [] }
      });
    }

    // 创建LLM客户端
    const llmClient = LLMClientManager.createFromRequest(request);

    // 构建联想提示词
    const { system, user } = buildAssociatePrompt(
      vocabulary.map((v: any) => typeof v === 'string' ? v : v.content),
      bannedWords.map((b: any) => typeof b === 'string' ? b : b.content),
      literature.map((l: any) => typeof l === 'string' ? l : `${l.title}${l.author ? `(${l.author})` : ''}`),
      text
    );

    // 调用LLM进行联想
    const result = await invokeLLM(llmClient, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { temperature: 0.7 }); // 较高温度增加创意性

    // 解析结果
    let associateResult: AssociateResult = {
      vocabulary: [],
      bannedWords: [],
      literature: []
    };

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        associateResult = {
          vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary.slice(0, 20) : [],
          bannedWords: Array.isArray(parsed.bannedWords) ? parsed.bannedWords.slice(0, 15) : [],
          literature: Array.isArray(parsed.literature) ? parsed.literature.slice(0, 10) : []
        };
      }
    } catch (parseError) {
      console.error('Failed to parse associate result:', parseError);
    }

    return NextResponse.json({
      success: true,
      result: associateResult
    });
  } catch (error) {
    console.error('Smart associate error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '联想失败'
    }, { status: 500 });
  }
}
