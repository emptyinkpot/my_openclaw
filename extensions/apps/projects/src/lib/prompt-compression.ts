/**
 * ============================================================================
 * 资源库压缩函数
 * ============================================================================
 * 
 * 将大量资源数据压缩为高效的 Prompt 格式
 */

import type { ResourceItem, LiteratureResource } from '@/types';

// ============================================================================
// 类型转换
// ============================================================================

/** 统一转换为 ResourceItem 格式 */
export function toResourceItems(
  items: (ResourceItem | string)[], 
  type: 'vocabulary' | 'meme' = 'vocabulary'
): ResourceItem[] {
  if (!items || items.length === 0) return [];
  return items.map((v, i) => 
    typeof v === 'string' 
      ? { id: `${type}-${i}`, content: v, type, category: '其他', createdAt: 0 }
      : v
  );
}

// ============================================================================
// 压缩函数
// ============================================================================

/**
 * 词汇库压缩
 * 格式：分类显示，便于 LLM 理解词汇用途
 */
export function compressVocabulary(vocabulary: (ResourceItem | string)[]): string {
  const items = toResourceItems(vocabulary, 'vocabulary');
  if (items.length === 0) return "";
  
  // 按分类分组
  const grouped: Record<string, string[]> = {};
  items.forEach(item => {
    const cat = item.category || '其他';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item.content);
  });
  
  // 构建分类输出
  const lines: string[] = [];
  lines.push(`共 ${items.length} 条高级词汇可用：`);
  lines.push('');
  
  Object.entries(grouped).forEach(([category, words]) => {
    lines.push(`【${category}】(${words.length}条)`);
    // 每行最多显示8个词，避免单行过长
    for (let i = 0; i < words.length; i += 8) {
      lines.push(`  ${words.slice(i, i + 8).join('、')}`);
    }
  });
  
  return lines.join('\n');
}

/**
 * 禁用词库压缩
 * 简洁格式：禁用词 → 替换建议
 */
export function compressBannedWords(
  bannedWords: Array<{ 
    content: string; 
    alternative?: string; 
    reason: string;
    type?: string;
    category?: string;
  }>
): string {
  if (!bannedWords || bannedWords.length === 0) return "";
  
  const lines: string[] = [];
  lines.push(`【禁用词列表】共 ${bannedWords.length} 条：`);
  
  bannedWords.forEach(item => {
    const alt = item.alternative ? ` → 用"${item.alternative}"风格替换` : '';
    lines.push(`  ${item.content}${alt}`);
  });
  
  lines.push('');
  lines.push('⚠️ 注意：专有名词中的禁用词不替换（如"科技公司"中的"公司"）');
  
  return lines.join('\n');
}

/** 获取替换词类型的具体指引 */
function getReplacementTypeGuide(type: string): string {
  const guides: Record<string, string> = {
    '水文': '河流、水流、波澜、漩涡、暗流、涌动、奔腾',
    '天文': '星辰、星云、宇宙、星系、引力、轨道',
    '神学': '神明、信仰、救赎、启示、神性、灵性',
    '风云': '风暴、云涌、雷电、变幻、气势、席卷',
    '命运': '宿命、天意、轮回、注定、劫数、运数',
    '自然': '山川、草木、风雨、季节、生命、生长',
    '建筑': '基石、结构、架构、框架、建造、构筑',
  };
  return guides[type] || `使用${type}相关表达`;
}

/**
 * 梗资源压缩
 * 格式：分类:梗1,梗2,梗3...
 */
export function compressMemes(memes: (ResourceItem | string)[]): string {
  const items = toResourceItems(memes, 'meme');
  if (items.length === 0) return "";
  
  const grouped: Record<string, string[]> = {};
  items.forEach(item => {
    const cat = item.category || '网络梗';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item.content.replace(/[,:|]/g, ' ')); // 清理分隔符
  });
  
  return Object.entries(grouped)
    .map(([cat, memes]) => `${cat}:${memes.join('|')}`)
    .join('\n');
}

/**
 * 文献资源压缩
 * 格式：书名(作者)|书名(作者)|...
 */
export function compressLiterature(literature: LiteratureResource[]): string {
  if (!literature || literature.length === 0) return "";
  
  const books = literature.filter(l => l.type === 'book');
  const contents = literature.filter(l => l.type === 'content');
  
  let result = "";
  
  if (books.length > 0) {
    result += `【书名引用】${books.map(b => `《${b.title}》${b.author ? `(${b.author})` : ''}`).join('|')}\n`;
  }
  
  if (contents.length > 0) {
    result += `【直接引用】\n`;
    contents.forEach(c => {
      const preview = c.content?.slice(0, 50) || '';
      result += `• ${c.title}: ${preview}...\n`;
    });
  }
  
  return result;
}
