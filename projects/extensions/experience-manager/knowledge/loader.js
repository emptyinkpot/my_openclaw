/**
 * 知识库加载器
 * 用于加载和解析网站知识
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE = path.join(
  process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
  'knowledge'
);

/**
 * 加载网站配置
 * @param {string} siteName - 网站名称
 * @returns {object} 配置对象
 */
function loadSiteConfig(siteName) {
  const configPath = path.join(KNOWLEDGE_BASE, siteName, 'site.yaml');
  
  if (fs.existsSync(configPath)) {
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
  }
  
  return null;
}

/**
 * 加载知识文档
 * @param {string} siteName - 网站名称
 * @param {string} docName - 文档名称（不含扩展名）
 * @returns {string} 文档内容
 */
function loadDoc(siteName, docName) {
  const docPath = path.join(KNOWLEDGE_BASE, siteName, `${docName}.md`);
  
  if (fs.existsSync(docPath)) {
    return fs.readFileSync(docPath, 'utf8');
  }
  
  return null;
}

/**
 * 列出所有网站
 * @returns {string[]} 网站名称列表
 */
function listSites() {
  const sites = [];
  
  if (fs.existsSync(KNOWLEDGE_BASE)) {
    const entries = fs.readdirSync(KNOWLEDGE_BASE, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'common') {
        sites.push(entry.name);
      }
    }
  }
  
  return sites;
}

/**
 * 获取网站完整知识
 * @param {string} siteName - 网站名称
 * @returns {object} 完整知识对象
 */
function getSiteKnowledge(siteName) {
  const siteDir = path.join(KNOWLEDGE_BASE, siteName);
  
  if (!fs.existsSync(siteDir)) {
    return null;
  }
  
  const knowledge = {
    name: siteName,
    config: loadSiteConfig(siteName),
    docs: {}
  };
  
  const docFiles = fs.readdirSync(siteDir)
    .filter(f => f.endsWith('.md'));
  
  for (const file of docFiles) {
    const docName = file.replace('.md', '');
    knowledge.docs[docName] = fs.readFileSync(
      path.join(siteDir, file),
      'utf8'
    );
  }
  
  return knowledge;
}

module.exports = {
  loadSiteConfig,
  loadDoc,
  listSites,
  getSiteKnowledge,
  KNOWLEDGE_BASE
};
