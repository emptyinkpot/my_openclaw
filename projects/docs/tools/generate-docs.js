#!/usr/bin/env node
/**
 * 文档自动生成脚本
 * 
 * 功能：
 * - 扫描代码文件，提取注释生成 API 文档
 * - 更新脚本文档索引
 * - 生成变更日志
 * 
 * 用法：
 *   node generate-docs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR = '/workspace/projects/docs';
const PROJECT_ROOT = '/workspace/projects';

/**
 * 扫描脚本目录，生成脚本清单
 */
function scanScripts() {
  const scripts = [];
  
  // 扫描 skills 目录
  const skillsDir = path.join(PROJECT_ROOT, 'workspace/skills');
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir);
    for (const skill of skills) {
      const skillPath = path.join(skillsDir, skill);
      const stat = fs.statSync(skillPath);
      if (stat.isDirectory()) {
        scripts.push({
          name: skill,
          path: `workspace/skills/${skill}`,
          type: 'skill'
        });
      }
    }
  }
  
  // 扫描 scripts 目录
  const scriptsDir = path.join(PROJECT_ROOT, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const files = fs.readdirSync(scriptsDir);
    for (const file of files) {
      scripts.push({
        name: file,
        path: `scripts/${file}`,
        type: 'script'
      });
    }
  }
  
  return scripts;
}

/**
 * 生成脚本文档
 */
function generateScriptsDoc() {
  const scripts = scanScripts();
  const scriptsDir = path.join(DOCS_DIR, '02-scripts');
  
  // 生成索引表格
  let content = `# 脚本文档\n\n`;
  content += `**生成时间**: ${new Date().toISOString()}\n\n`;
  content += `## 脚本清单\n\n`;
  content += `| 名称 | 路径 | 类型 |\n`;
  content += `|------|------|------|\n`;
  
  for (const script of scripts) {
    content += `| ${script.name} | ${script.path} | ${script.type} |\n`;
  }
  
  content += `\n## 详细信息\n\n`;
  
  // 为每个脚本生成详细文档
  for (const script of scripts) {
    const fullPath = path.join(PROJECT_ROOT, script.path);
    if (fs.existsSync(fullPath)) {
      content += `### ${script.name}\n\n`;
      content += `- **路径**: ${script.path}\n`;
      content += `- **类型**: ${script.type}\n`;
      
      // 尝试提取 JSDoc 注释
      if (fs.statSync(fullPath).isFile() && fullPath.endsWith('.js')) {
        const code = fs.readFileSync(fullPath, 'utf8');
        const comments = extractJSDoc(code);
        if (comments.length > 0) {
          content += `- **文档**: \n\n`;
          for (const comment of comments.slice(0, 3)) {
            content += `  ${comment}\n`;
          }
        }
      }
      
      content += `\n`;
    }
  }
  
  // 写入文件
  const outputPath = path.join(scriptsDir, 'INDEX.md');
  fs.writeFileSync(outputPath, content);
  console.log(`✅ 生成脚本文档: ${outputPath}`);
}

/**
 * 提取 JSDoc 注释
 */
function extractJSDoc(code) {
  const comments = [];
  const regex = /\/\*\*[\s\S]*?\*\//g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const comment = match[0]
      .replace(/\/\*\*|\*\//g, '')
      .replace(/^\s*\*\s?/gm, '')
      .trim()
      .split('\n')[0];
    if (comment && !comment.includes('@')) {
      comments.push(comment);
    }
  }
  return comments;
}

/**
 * 生成变更日志
 */
function generateChangelog() {
  try {
    const gitLog = execSync(
      'git log --oneline --since="7 days ago"',
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    );
    
    const changelogPath = path.join(DOCS_DIR, 'CHANGELOG.md');
    let content = `# 变更日志\n\n`;
    content += `**最近更新**: ${new Date().toISOString()}\n\n`;
    content += `## 最近提交\n\n`;
    content += gitLog.split('\n')
      .filter(line => line.trim())
      .map(line => `- ${line}`)
      .join('\n');
    
    fs.writeFileSync(changelogPath, content);
    console.log(`✅ 生成变更日志: ${changelogPath}`);
  } catch (e) {
    console.log('⚠️  无法获取 git 日志:', e.message);
  }
}

/**
 * 生成 TODO 列表
 */
function generateTodoList() {
  const todoPath = path.join(DOCS_DIR, '07-todos/TODO.md');
  
  // 扫描代码中的 TODO 注释
  const todos = [];
  const scanDir = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        scanDir(fullPath);
      } else if (stat.isFile() && fullPath.endsWith('.js')) {
        const code = fs.readFileSync(fullPath, 'utf8');
        const lines = code.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('TODO') || line.includes('FIXME') || line.includes('XXX')) {
            todos.push({
              file: fullPath.replace(PROJECT_ROOT, ''),
              line: index + 1,
              content: line.trim()
            });
          }
        });
      }
    }
  };
  
  try {
    scanDir(PROJECT_ROOT);
  } catch (e) {
    console.log('⚠️  扫描 TODO 失败:', e.message);
  }
  
  let content = `# 任务列表\n\n`;
  content += `**生成时间**: ${new Date().toISOString()}\n\n`;
  content += `## 代码中的 TODO/FIXME\n\n`;
  
  if (todos.length === 0) {
    content += '暂无待办事项\n';
  } else {
    content += `| 文件 | 行号 | 内容 |\n`;
    content += `|------|------|------|\n`;
    for (const todo of todos) {
      content += `| ${todo.file} | ${todo.line} | ${todo.content.slice(0, 50)}... |\n`;
    }
  }
  
  fs.writeFileSync(todoPath, content);
  console.log(`✅ 生成任务列表: ${todoPath}`);
}

// 主函数
function main() {
  console.log('📝 开始生成文档...\n');
  
  generateScriptsDoc();
  generateChangelog();
  generateTodoList();
  
  console.log('\n✨ 文档生成完成!');
  console.log(`📁 文档位置: ${DOCS_DIR}`);
}

main();
