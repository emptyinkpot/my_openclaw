import { NextRequest, NextResponse } from 'next/server';
import { 
  getSynonyms, 
  batchSynonymReplace, 
  extractKeywords,
  calculateSimilarity 
} from '@/lib/synonym-utils';
import { 
  correctText, 
  fullTextCheck, 
  ErrorType,
  addCustomConfusion 
} from '@/lib/text-correction-utils';
import { evaluatePolish, generateComparison } from '@/lib/polish-evaluator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text, originalText, polishedText, options } = body;

    switch (action) {
      case 'getSynonyms': {
        const word = text as string;
        if (!word) {
          return NextResponse.json({ error: '缺少word参数' }, { status: 400 });
        }
        const result = getSynonyms(word);
        return NextResponse.json({ success: true, data: result });
      }

      case 'synonymReplace': {
        if (!text) {
          return NextResponse.json({ error: '缺少text参数' }, { status: 400 });
        }
        const result = batchSynonymReplace(text, options);
        return NextResponse.json({ 
          success: true, 
          data: {
            original: text,
            replaced: result.text,
            replacements: result.replacements,
            count: result.replacements.length,
          }
        });
      }

      case 'correctText': {
        if (!text) {
          return NextResponse.json({ error: '缺少text参数' }, { status: 400 });
        }
        const result = correctText(text, options);
        return NextResponse.json({ 
          success: true, 
          data: result
        });
      }

      case 'fullTextCheck': {
        if (!text) {
          return NextResponse.json({ error: '缺少text参数' }, { status: 400 });
        }
        const result = fullTextCheck(text);
        return NextResponse.json({ 
          success: true, 
          data: result
        });
      }

      case 'evaluatePolish': {
        if (!originalText || !polishedText) {
          return NextResponse.json({ error: '缺少originalText或polishedText参数' }, { status: 400 });
        }
        const result = evaluatePolish(originalText, polishedText);
        return NextResponse.json({ 
          success: true, 
          data: result
        });
      }

      case 'generateComparison': {
        if (!originalText || !polishedText) {
          return NextResponse.json({ error: '缺少originalText或polishedText参数' }, { status: 400 });
        }
        const evaluation = evaluatePolish(originalText, polishedText);
        const report = generateComparison(originalText, polishedText, evaluation);
        return NextResponse.json({ 
          success: true, 
          data: { report, evaluation }
        });
      }

      case 'extractKeywords': {
        if (!text) {
          return NextResponse.json({ error: '缺少text参数' }, { status: 400 });
        }
        const topK = options?.topK || 5;
        const keywords = extractKeywords(text, topK);
        return NextResponse.json({ 
          success: true, 
          data: { keywords }
        });
      }

      case 'calculateSimilarity': {
        const { sentence1, sentence2 } = body;
        if (!sentence1 || !sentence2) {
          return NextResponse.json({ error: '缺少sentence1或sentence2参数' }, { status: 400 });
        }
        const similarity = calculateSimilarity(sentence1, sentence2);
        return NextResponse.json({ 
          success: true, 
          data: { similarity }
        });
      }

      case 'addCustomConfusion': {
        const { wrong, correct } = body;
        if (!wrong || !correct) {
          return NextResponse.json({ error: '缺少wrong或correct参数' }, { status: 400 });
        }
        addCustomConfusion(wrong, correct);
        return NextResponse.json({ 
          success: true, 
          message: '自定义混淆项已添加'
        });
      }

      default:
        return NextResponse.json({ error: '未知的操作类型' }, { status: 400 });
    }
  } catch (error) {
    console.error('Text tools API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const word = searchParams.get('word');

  if (action === 'getSynonyms' && word) {
    const result = getSynonyms(word);
    return NextResponse.json({ success: true, data: result });
  }

  return NextResponse.json({ 
    success: true,
    message: 'Text Tools API',
    availableActions: [
      'getSynonyms',
      'synonymReplace', 
      'correctText',
      'fullTextCheck',
      'evaluatePolish',
      'generateComparison',
      'extractKeywords',
      'calculateSimilarity',
      'addCustomConfusion',
    ]
  });
}
