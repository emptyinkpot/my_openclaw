#!/usr/bin/env node
/**
 * 飞书指令文档自动生成器
 * 
 * 从 feishu-handler.js 自动提取指令和回复，更新文档
 * 
 * 用法：
 *   node update-feishu-docs.js
 * 
 * 功能：
 * - 扫描 feishu-handler.js 中的指令解析逻辑
 * - 提取支持的网站和指令
 * - 生成指令手册文档
 * - 更新 docs/FEISHU-COMMANDS.md
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/workspace/projects';
const HANDLER_PATH = path.join(PROJECT_ROOT, 'workspace/skills/website-automation/scripts/feishu-handler.js');
const DOCS_PATH = path.join(PROJECT_ROOT, 'docs/FEISHU-COMMANDS.md');

/**
 * 从代码中提取对象定义
 */
function extractObject(code, varName) {
  const regex = new RegExp(`const ${varName} = \\{([\\s\\S]*?)\\};`);
  const match = code.match(regex);
  if (match) {
    try {
      // 简单解析，处理字符串键值对
      const content = match[1];
      const obj = {};
      const pairs = content.match(/['"`]([^'"`]+)['"`]:\s*['"`]([^'"`]+)['"`]/g);
      if (pairs) {
        pairs.forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim().replace(/['"`]/g, ''));
          obj[key] = value;
        });
      }
      return obj;
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 提取函数中的 switch/case 逻辑
 */
function extractCommands(code) {
  const commands = [];
  
  // 查找 parseMessage 函数中的指令逻辑
  const parseFuncMatch = code.match(/function parseMessage[\s\S]*?return \{[^}]+\};/);
  if (parseFuncMatch) {
    const funcCode = parseFuncMatch[0];
    
    // 提取列表指令
    if (funcCode.includes('列表') || funcCode.includes('作品')) {
      commands.push({
        name: '作品列表',
        triggers: ['列表', '作品', 'list', 'works'],
        command: 'works',
        hasArgs: false,
        description: '查看网站上的作品列表'
      });
    }
    
    // 提取进入指令
    if (funcCode.includes('进入')) {
      commands.push({
        name: '进入作品',
        triggers: ['进入', 'enter', '打开', 'open'],
        command: 'enter',
        hasArgs: true,
        argName: '编号',
        description: '进入指定的作品详情页'
      });
    }
    
    // 提取登录指令
    if (funcCode.includes('登录') || funcCode.includes('login')) {
      commands.push({
        name: '登录',
        triggers: ['登录', '扫码', 'login'],
        command: 'login',
        hasArgs: false,
        description: '执行登录操作（需要在服务器上手动执行）'
      });
    }
    
    // 提取检查指令
    if (funcCode.includes('检查') || funcCode.includes('状态') || funcCode.includes('check')) {
      commands.push({
        name: '检查状态',
        triggers: ['检查', '状态', 'check', 'status'],
        command: 'check',
        hasArgs: false,
        description: '检查当前登录状态'
      });
    }
  }
  
  return commands;
}

/**
 * 提取帮助文本
 */
function extractHelpText(code) {
  const helpMatch = code.match(/function getHelp\(\) \{[\s\S]*?return `([\s\S]*?)`;\s*\}/);
  if (helpMatch) {
    return helpMatch[1].trim();
  }
  return null;
}

/**
 * 提取 formatResult 中的回复模板
 */
function extractResponseTemplates(code) {
  const templates = {};
  
  // 提取 case 语句中的回复格式
  const formatMatch = code.match(/function formatResult[\s\S]*?switch \(site\.command\) \{([\s\S]*?)\}\s*\}/);
  if (formatMatch) {
    const switchCode = formatMatch[1];
    
    // 提取 works 回复
    const worksMatch = switchCode.match(/case 'works':([\s\S]*?)(?=case|default)/);
    if (worksMatch) {
      templates.works = '返回作品列表，包含作品数量和名称';
    }
    
    // 提取 enter 回复
    const enterMatch = switchCode.match(/case 'enter':([\s\S]*?)(?=case|default)/);
    if (enterMatch) {
      templates.enter = '返回已进入作品的成功提示';
    }
    
    // 提取 check 回复
    const checkMatch = switchCode.match(/case 'check':([\s\S]*?)(?=case|default)/);
    if (checkMatch) {
      templates.check = '返回登录状态检查结果';
    }
    
    // 提取 login 回复
    const loginMatch = switchCode.match(/case 'login':([\s\S]*?)(?=case|default)/);
    if (loginMatch) {
      templates.login = '返回登录成功提示';
    }
  }
  
  return templates;
}

/**
 * 提取网站映射
 */
function extractSiteMappings(code) {
  const mappings = {};
  const match = code.match(/const siteMappings = \{([\s\S]*?)\};/);
  if (match) {
    const content = match[1];
    // 提取 '前缀': 'siteName'
    const pairs = content.match(/['"`]([^'"`]+)['"`]:\s*['"`]([^'"`]+)['"`]/g);
    if (pairs) {
      pairs.forEach(pair => {
        const parts = pair.split(':').map(s => s.trim().replace(/['"`]/g, ''));
        if (parts.length === 2) {
          if (!mappings[parts[1]]) {
            mappings[parts[1]] = [];
          }
          mappings[parts[1]].push(parts[0]);
        }
      });
    }
  }
  return mappings;
}

/**
 * 生成指令文档
 */
function generateCommandDoc(siteName, siteLabels, commands, templates) {
  let doc = `### ${siteLabels.join('/')} (${siteName})\n\n`;
  
  commands.forEach((cmd, index) => {
    const num = index + 1;
    doc += `#### ${num}. ${cmd.name}\n\n`;
    
    // 触发指令
    doc += `**触发指令**：\n`;
    siteLabels.forEach(label => {
      cmd.triggers.forEach(trigger => {
        if (cmd.hasArgs) {
          doc += `- \`${label} ${trigger} <编号>\`\n`;
        } else {
          doc += `- \`${label} ${trigger}\`\n`;
        }
      });
    });
    doc += `\n`;
    
    // 参数
    if (cmd.hasArgs) {
      doc += `**参数**：\n`;
      doc += `- \`<${cmd.argName}>\`: ${cmd.description}\n\n`;
    }
    
    // 回复示例
    const template = templates[cmd.command];
    if (template) {
      doc += `**机器人回复示例**：\n`;
      doc += '```\n';
      
      switch (cmd.command) {
        case 'works':
          doc += `📚 作品列表（共3个）：\n1. 作品一名称\n2. 作品二名称\n3. 作品三名称\n\n💡 回复"${siteLabels[0]} 进入 <编号>"查看详情\n`;
          break;
        case 'enter':
          doc += `✅ 已进入作品: 作品名称\n`;
          break;
        case 'check':
          doc += `✅ ${siteName} 已登录\n`;
          doc += `或\n❌ ${siteName} 未登录，请发送"${siteLabels[0]} 登录"\n`;
          break;
        case 'login':
          doc += `✅ 登录成功！${template}\n`;
          break;
        default:
          doc += `${template}\n`;
      }
      
      doc += '```\n\n';
    }
    
    // 截图说明
    if (['works', 'enter', 'login'].includes(cmd.command)) {
      doc += `**截图**：会附带相关页面的截图\n\n`;
    }
    
    doc += `---\n\n`;
  });
  
  // 帮助指令
  doc += `#### ${commands.length + 1}. 帮助\n\n`;
  doc += `**触发指令**：\n`;
  doc += '- `帮助`\n';
  doc += '- `help`\n';
  doc += '- `?`\n\n';
  doc += `**机器人回复**：显示所有支持的指令列表\n\n---\n\n`;
  
  return doc;
}

/**
 * 更新文档文件
 */
function updateDocs(siteMappings, commands, templates, helpText) {
  if (!fs.existsSync(DOCS_PATH)) {
    console.error('❌ 文档文件不存在:', DOCS_PATH);
    return false;
  }
  
  let content = fs.readFileSync(DOCS_PATH, 'utf8');
  
  // 更新时间
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /> 📅 最后更新: .*/,
    `> 📅 最后更新: ${today}`
  );
  
  // 生成新的指令列表
  let newCommandsSection = '<!-- AUTO-GENERATED: 指令列表开始 -->\n\n';
  
  for (const [siteName, labels] of Object.entries(siteMappings)) {
    newCommandsSection += generateCommandDoc(siteName, labels, commands, templates);
  }
  
  // 添加通用指令
  newCommandsSection += `### 通用指令\n\n`;
  newCommandsSection += `#### 未识别指令\n\n`;
  newCommandsSection += `**触发**：发送任何不包含上述关键词的消息\n\n`;
  newCommandsSection += `**机器人回复示例**：\n`;
  newCommandsSection += '```\n🤖 收到: xxx\n\n[显示帮助信息]\n```\n\n';
  
  newCommandsSection += '<!-- AUTO-GENERATED: 指令列表结束 -->';
  
  // 替换指令列表部分
  content = content.replace(
    /<!-- AUTO-GENERATED: 指令列表开始 -->[\s\S]*?<!-- AUTO-GENERATED: 指令列表结束 -->/,
    newCommandsSection
  );
  
  // 更新更新记录
  const newRecord = `| ${today} | 1.${today.split('-')[2]} | 自动更新指令文档 |`;
  content = content.replace(
    /(<!-- AUTO-GENERATED: 更新记录开始 -->[\s\S]*?\| 日期 \| 版本 \| 更新内容 \|[\s\S]*?)<!-- AUTO-GENERATED: 更新记录结束 -->/,
    `$1${newRecord}\n<!-- AUTO-GENERATED: 更新记录结束 -->`
  );
  
  // 写入文件
  fs.writeFileSync(DOCS_PATH, content);
  console.log('✅ 文档已更新:', DOCS_PATH);
  
  return true;
}

/**
 * 主函数
 */
function main() {
  console.log('🤖 飞书指令文档自动生成器\n');
  
  // 检查文件是否存在
  if (!fs.existsSync(HANDLER_PATH)) {
    console.error('❌ 找不到处理器文件:', HANDLER_PATH);
    process.exit(1);
  }
  
  // 读取代码
  const code = fs.readFileSync(HANDLER_PATH, 'utf8');
  
  console.log('📖 解析指令处理器...');
  
  // 提取信息
  const siteMappings = extractSiteMappings(code);
  console.log('  ✓ 发现网站:', Object.keys(siteMappings).join(', '));
  
  const commands = extractCommands(code);
  console.log('  ✓ 发现指令:', commands.map(c => c.name).join(', '));
  
  const templates = extractResponseTemplates(code);
  console.log('  ✓ 发现回复模板:', Object.keys(templates).join(', '));
  
  const helpText = extractHelpText(code);
  console.log('  ✓ 提取帮助文本:', helpText ? '是' : '否');
  
  // 更新文档
  console.log('\n📝 更新文档...');
  const success = updateDocs(siteMappings, commands, templates, helpText);
  
  if (success) {
    console.log('\n✨ 完成!');
    console.log(`📄 文档位置: ${DOCS_PATH}`);
  } else {
    console.log('\n❌ 更新失败');
    process.exit(1);
  }
}

main();
