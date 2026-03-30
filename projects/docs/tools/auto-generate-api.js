#!/usr/bin/env node
/**
 * 全自动 API 文档生成器
 * 
 * 从 JSDoc 注释生成完整 API 文档
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/workspace/projects';
const API_DOCS_DIR = '/workspace/projects/docs/04-api';

/**
 * 解析 JSDoc 注释
 */
function parseJSDoc(content) {
  const docs = [];
  const methodRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:async\s+)?(\w+)\s*\(/g;
  
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const comment = match[1];
    const methodName = match[2];
    
    const doc = {
      name: methodName,
      description: '',
      params: [],
      returns: null,
      example: ''
    };
    
    // 解析注释内容
    const lines = comment.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\*\s?/, '').trim();
      
      if (cleanLine.startsWith('@param')) {
        const paramMatch = cleanLine.match(/@param\s+(?:\{(.*?)\})?\s*(\w+)\s*-?\s*(.*)/);
        if (paramMatch) {
          doc.params.push({
            type: paramMatch[1] || 'any',
            name: paramMatch[2],
            description: paramMatch[3]
          });
        }
      } else if (cleanLine.startsWith('@returns')) {
        const returnsMatch = cleanLine.match(/@returns\s+(?:\{(.*?)\})?\s*(.*)/);
        if (returnsMatch) {
          doc.returns = {
            type: returnsMatch[1] || 'any',
            description: returnsMatch[2]
          };
        }
      } else if (cleanLine.startsWith('@example')) {
        // 收集示例代码
      } else if (!cleanLine.startsWith('@') && cleanLine) {
        doc.description += cleanLine + ' ';
      }
    }
    
    doc.description = doc.description.trim();
    docs.push(doc);
  }
  
  return docs;
}

/**
 * 生成类文档
 */
function generateClassDoc(className, filePath, methods) {
  let content = `# ${className}\n\n`;
  content += `**文件**: \`${filePath}\`\n\n`;
  content += `**生成时间**: ${new Date().toISOString()}\n\n`;
  
  content += `## 方法列表\n\n`;
  content += `| 方法 | 描述 |\n`;
  content += `|------|------|\n`;
  
  for (const method of methods) {
    content += `| ${method.name}() | ${method.description.slice(0, 50)}... |\n`;
  }
  
  content += `\n## 详细文档\n\n`;
  
  for (const method of methods) {
    content += `### ${method.name}()\n\n`;
    content += `${method.description}\n\n`;
    
    if (method.params.length > 0) {
      content += `**参数**:\n\n`;
      content += `| 名称 | 类型 | 描述 |\n`;
      content += `|------|------|------|\n`;
      for (const param of method.params) {
        content += `| ${param.name} | ${param.type} | ${param.description} |\n`;
      }
      content += `\n`;
    }
    
    if (method.returns) {
      content += `**返回**: ${method.returns.type} - ${method.returns.description}\n\n`;
    }
    
    content += `---\n\n`;
  }
  
  return content;
}

/**
 * 扫描并生成 API 文档
 */
function generateAPIDocs() {
  const targetFiles = [
    'workspace/skills/website-automation/scripts/automation.js',
    'workspace/skills/website-automation/scripts/cli.js'
  ];
  
  for (const file of targetFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(file, '.js');
    const methods = parseJSDoc(content);
    
    if (methods.length > 0) {
      const docContent = generateClassDoc(className, file, methods);
      const outputPath = path.join(API_DOCS_DIR, `${className}.md`);
      fs.writeFileSync(outputPath, docContent);
      console.log(`✅ 生成 API 文档: ${outputPath} (${methods.length} 个方法)`);
    }
  }
}

// 主函数
function main() {
  console.log('🤖 全自动 API 文档生成\n');
  
  // 确保目录存在
  if (!fs.existsSync(API_DOCS_DIR)) {
    fs.mkdirSync(API_DOCS_DIR, { recursive: true });
  }
  
  generateAPIDocs();
  
  console.log('\n✨ 完成!');
}

main();
