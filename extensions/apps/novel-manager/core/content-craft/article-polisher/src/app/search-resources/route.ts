/**
 * ============================================================================
 * 搜索开源资源库 API
 * ============================================================================
 * 
 * 搜索可增强项目功能的开源词汇库、禁用词库等资源
 */

import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// ============================================================================
// 搜索查询配置
// ============================================================================

const SEARCH_QUERIES = [
  // 中文词汇库
  "中文词汇库 开源 github",
  "中文同义词库 词汇替换 开源",
  "中文近义词词典 json 数据库",
  
  // 禁用词/敏感词库
  "中文敏感词库 禁用词 开源",
  "网络用语禁用词列表 文本处理",
  
  // AI写作优化
  "AI文本优化 词汇替换 github",
  "中文文本润色 词库 开源",
  "GPT润色词库 中文 开源",
  
  // 文学写作资源
  "中文文学词汇库 写作素材 开源",
  "文言文常用词汇 数据库",
  "中文修辞手法词汇库",
];

// ============================================================================
// API Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '中文词汇库 开源';
    const count = parseInt(searchParams.get('count') || '10');

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    const response = await client.webSearch(query, count, true);

    // 过滤和整理结果
    const results = (response.web_items || []).map(item => ({
      title: item.title,
      url: item.url,
      site: item.site_name,
      snippet: item.snippet?.substring(0, 200),
      summary: item.summary,
    }));

    return NextResponse.json({
      success: true,
      query,
      summary: response.summary,
      results,
      suggestions: [
        "中文词汇库 开源 - 搜索可替换的同义词、近义词资源",
        "中文敏感词库 - 搜索禁用词过滤资源",
        "AI文本优化词库 - 搜索润色优化相关资源",
        "文言文词汇库 - 搜索古典风格写作资源",
      ],
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "搜索失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queries } = body as { queries?: string[] };

    const searchQueries = queries || SEARCH_QUERIES;
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 并行搜索多个查询
    const searchPromises = searchQueries.slice(0, 5).map(async (query) => {
      try {
        const response = await client.webSearch(query, 5, false);
        return {
          query,
          results: (response.web_items || []).slice(0, 5).map(item => ({
            title: item.title,
            url: item.url,
            site: item.site_name,
            snippet: item.snippet?.substring(0, 150),
          })),
        };
      } catch {
        return { query, results: [] };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // 去重和整理
    const uniqueUrls = new Set<string>();
    const allResults: Array<{
      category: string;
      title: string;
      url: string;
      site: string;
      snippet: string;
    }> = [];

    for (const { query, results } of searchResults) {
      for (const item of results) {
        if (item.url && !uniqueUrls.has(item.url)) {
          uniqueUrls.add(item.url);
          allResults.push({
            category: categorizeQuery(query),
            title: item.title || '',
            url: item.url,
            site: item.site || '',
            snippet: item.snippet || '',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: allResults.length,
      results: allResults.slice(0, 30),
      categories: {
        vocabulary: "词汇库 - 同义词、近义词替换资源",
        banned: "禁用词库 - 敏感词、网络用语过滤",
        optimization: "优化词库 - AI润色、文本优化资源",
        literary: "文学词库 - 文言、修辞写作资源",
      },
    });
  } catch (error) {
    console.error("Batch search error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "搜索失败" },
      { status: 500 }
    );
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

function categorizeQuery(query: string): string {
  if (query.includes('敏感') || query.includes('禁用')) return 'banned';
  if (query.includes('润色') || query.includes('优化') || query.includes('AI')) return 'optimization';
  if (query.includes('文言') || query.includes('文学') || query.includes('修辞')) return 'literary';
  return 'vocabulary';
}
