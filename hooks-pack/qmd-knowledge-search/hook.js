/**
 * QMD Knowledge Search Hook
 * 在回复消息前自动调用 QMD 搜索相关经验
 * 
 * Hook 触发时机：pre-reply
 * 功能：提取问题关键词 → 调用 QMD API → 将搜索结果注入上下文 → 帮助回答
 * 
 * 改进：一次性提取精准关键词，一次搜索到位，提高效率
 */

module.exports = {
  name: 'qmd-knowledge-search',
  description: '自动调用 QMD 搜索相关经验，注入回答上下文',
  version: '1.1.0',
  author: 'OpenClaw',
  
  // 触发时机：回复前
  trigger: 'pre-reply',
  
  // hook 配置
  config: {
    enabled: true,
    apiUrl: 'http://localhost:3003/api/experience/search',
    maxResults: 5,      // 最多返回 5 条足够了
    minScore: 0.2,      // 稍微降低分数门槛
    timeout: 3000       // 缩短超时
  },
  
  /**
   * 停用词列表 - 过滤无意义的词
   */
  stopWords: new Set([
    '怎么', '如何', '为什么', '什么', '这个', '那个', '这样', '那样',
    '你', '我', '他', '她', '它', '们', '的', '了', '是', '在',
    '有', '会', '能', '可以', '一下', '一下', '吧', '呢', '啊', '哦',
    '吗', '呀', '嗯', '这', '那', '就', '要', '说', '问', '想',
    '知道', '了解', '告诉', '请问', '一下', '看看', '帮我', '给我',
    '一下', '就是', '还是', '不是', '但是', '如果', '而且', '所以'
  ]),

  /**
   * 智能提取问题关键词 - 只保留实词，提高搜索精度
   */
  extractKeywords(message) {
    const text = message.content || '';
    
    // 1. 清理文本：去掉标点和特殊符号
    let cleanText = text
      .replace(/[，。！？、；：""''（）《》{}[\]<>⚡✅❌💡⚠️🔧🚀🎯📋🧠]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 2. 分词
    const words = cleanText.split(/\s+/);
    
    // 3. 过滤停用词，只保留长度 > 1 的实词
    const keywords = words
      .filter(w => w.length > 1 && !this.stopWords.has(w))
      .slice(0, 6); // 最多取 6 个关键词
    
    // 4. 如果没有关键词，返回空
    if (keywords.length === 0) {
      return '';
    }
    
    // 5. 组合成搜索短语
    const result = keywords.join(' ');
    console.log(`[qmd-knowledge-search] 提取关键词: "${result}" (${keywords.length} 个)`);
    
    return result;
  },
  
  /**
   * 调用 QMD API 搜索 - 一次到位
   */
  async searchExperiences(keywords, config) {
    const url = `${config.apiUrl}?q=${encodeURIComponent(keywords)}&limit=${config.maxResults}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(config.timeout)
      });
      
      if (!response.ok) {
        console.warn(`[qmd-knowledge-search] API 请求失败: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        console.log(`[qmd-knowledge-search] 未找到相关经验`);
        return [];
      }
      
      // 过滤低分结果
      const results = data.data.filter(item => (!item.score || item.score >= config.minScore));
      
      console.log(`[qmd-knowledge-search] 找到 ${results.length} 条相关经验`);
      return results;
    } catch (error) {
      console.warn(`[qmd-knowledge-search] 搜索失败: ${error.message}`);
      return [];
    }
  },
  
  /**
   * 格式化搜索结果为上下文 - 精简格式，节省 token
   */
  formatResults(results) {
    if (results.length === 0) {
      return '';
    }
    
    let context = `\n\n---\n## 🧠 相关历史经验\n\n`;
    
    results.forEach((exp, index) => {
      context += `**${index + 1}. ${exp.title}**\n`;
      context += `- 类型: ${exp.type}\n`;
      if (exp.description) {
        context += `- 描述: ${exp.description.slice(0, 120)}${exp.description.length > 120 ? '...' : ''}\n`;
      }
      if (exp.experienceGained && exp.experienceGained.length > 0) {
        const points = exp.experienceGained.slice(0, 4);
        context += `- 要点: ${points.map(x => `• ${x}`).join(' ')}\n`;
      }
      context += '\n';
    });
    
    context += `请参考以上历史经验回答，如果问题相同或相似，请沿用历史解决方案。\n---\n`;
    
    return context;
  },
  
  /**
   * hook 主入口 - 一次搜索完成，不重复调用
   */
  async run(context, config) {
    // 合并配置
    const finalConfig = { ...this.config, ...config };
    
    if (!finalConfig.enabled) {
      return { continue: true, context: context };
    }
    
    // 获取当前消息
    const messages = context.messages || [];
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || !lastMessage.content) {
      return { continue: true, context: context };
    }
    
    // 一次性提取关键词
    const keywords = this.extractKeywords(lastMessage);
    
    if (!keywords || keywords.trim().length < 2) {
      return { continue: true, context: context };
    }
    
    // 一次搜索完成
    const results = await this.searchExperiences(keywords, finalConfig);
    
    if (results.length === 0) {
      return { continue: true, context: context };
    }
    
    // 将搜索结果注入到上下文
    const additionalContext = this.formatResults(results);
    
    if (context.systemPrompt) {
      context.systemPrompt += additionalContext;
    } else if (context.messages && context.messages.length > 0) {
      // 在用户消息前注入系统上下文
      context.messages.splice(context.messages.length - 1, 0, {
        role: 'system',
        content: additionalContext
      });
    }
    
    return {
      continue: true,
      context: context
    };
  }
};
