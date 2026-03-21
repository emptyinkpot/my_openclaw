/**
 * ============================================================================
 * 预置资源库 API
 * ============================================================================
 * 
 * 提供预置的词汇库、禁用词库等资源
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SYNONYM_VOCABULARY,
  LITERARY_VOCABULARY,
  AI_CHARACTERISTIC_WORDS,
  INTERNET_SLANG,
  ACADEMIC_EXPRESSIONS,
  RESOURCE_STATS,
  convertToResourceItems,
  convertToBannedWords,
} from "@/lib/preset-resources";

// ============================================================================
// API Handler
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';
  const format = searchParams.get('format') || 'preview'; // preview | import

  // 预览模式 - 返回统计和示例
  if (format === 'preview') {
    return NextResponse.json({
      success: true,
      stats: RESOURCE_STATS,
      categories: {
        synonym: {
          name: "同义词替换库",
          description: "提升文本多样性，避免重复表达",
          count: SYNONYM_VOCABULARY.length,
          sample: SYNONYM_VOCABULARY.slice(0, 3),
        },
        literary: {
          name: "文学风格词汇库",
          description: "现代→文学→古典三层转换",
          count: LITERARY_VOCABULARY.length,
          sample: LITERARY_VOCABULARY.slice(0, 3),
        },
        aiWords: {
          name: "AI特征词识别库",
          description: "识别AI生成痕迹，提供替换方案",
          count: AI_CHARACTERISTIC_WORDS.length,
          sample: AI_CHARACTERISTIC_WORDS.slice(0, 3),
        },
        slang: {
          name: "网络用语净化库",
          description: "网络口语→正式表达转换",
          count: INTERNET_SLANG.length,
          sample: INTERNET_SLANG.slice(0, 3),
        },
        academic: {
          name: "学术写作优化库",
          description: "非正式→正式学术表达转换",
          count: ACADEMIC_EXPRESSIONS.length,
          sample: ACADEMIC_EXPRESSIONS.slice(0, 3),
        },
      },
    });
  }

  // 导入模式 - 返回可导入的数据
  const result: {
    vocabulary: ReturnType<typeof convertToResourceItems>;
    bannedWords: ReturnType<typeof convertToBannedWords>;
    literary: typeof LITERARY_VOCABULARY;
    academic: typeof ACADEMIC_EXPRESSIONS;
    slang: typeof INTERNET_SLANG;
  } = {
    vocabulary: [],
    bannedWords: [],
    literary: [],
    academic: [],
    slang: [],
  };

  if (type === 'all' || type === 'vocabulary') {
    result.vocabulary = convertToResourceItems(SYNONYM_VOCABULARY, 'vocabulary');
  }

  if (type === 'all' || type === 'bannedWords') {
    result.bannedWords = convertToBannedWords(AI_CHARACTERISTIC_WORDS);
  }

  if (type === 'all' || type === 'literary') {
    result.literary = LITERARY_VOCABULARY;
  }

  if (type === 'all' || type === 'academic') {
    result.academic = ACADEMIC_EXPRESSIONS;
  }

  if (type === 'all' || type === 'slang') {
    result.slang = INTERNET_SLANG;
  }

  return NextResponse.json({
    success: true,
    type,
    data: result,
    summary: {
      vocabulary: result.vocabulary.length,
      bannedWords: result.bannedWords.length,
      literary: result.literary.length,
      academic: result.academic.length,
      slang: result.slang.length,
    },
  });
}

// ============================================================================
// 批量导入
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categories } = body as { categories?: string[] };

    const selectedCategories = categories || ['vocabulary', 'bannedWords', 'literary', 'academic', 'slang'];

    const result = {
      vocabulary: selectedCategories.includes('vocabulary') ? convertToResourceItems(SYNONYM_VOCABULARY, 'vocabulary') : [],
      bannedWords: selectedCategories.includes('bannedWords') ? convertToBannedWords(AI_CHARACTERISTIC_WORDS) : [],
      literary: selectedCategories.includes('literary') ? LITERARY_VOCABULARY : [],
      academic: selectedCategories.includes('academic') ? ACADEMIC_EXPRESSIONS : [],
      slang: selectedCategories.includes('slang') ? INTERNET_SLANG : [],
    };

    return NextResponse.json({
      success: true,
      message: `已准备 ${result.vocabulary.length + result.bannedWords.length} 条资源`,
      data: result,
      stats: {
        vocabulary: result.vocabulary.length,
        bannedWords: result.bannedWords.length,
        literary: result.literary.length,
        academic: result.academic.length,
        slang: result.slang.length,
      },
    });
  } catch (error) {
    console.error("Import preset resources error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "导入失败" },
      { status: 500 }
    );
  }
}
