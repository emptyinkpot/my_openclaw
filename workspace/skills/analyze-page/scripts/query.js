#!/usr/bin/env node
/**
 * 快照查询工具
 * 
 * 用法:
 *   node scripts/query.js list                     # 列出所有快照
 *   node scripts/query.js search "登录"            # 搜索元素
 *   node scripts/query.js show fanqie default home # 显示指定快照
 *   node scripts/query.js elements fanqie default home # 只显示元素
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = '/workspace/projects';
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage/page-snapshots');

// ============================================================
// 列出所有快照
// ============================================================

function listAll() {
  console.log('\n📚 已采集的快照\n');
  
  const platforms = fs.readdirSync(STORAGE_ROOT).filter(f => {
    const stat = fs.statSync(path.join(STORAGE_ROOT, f));
    return stat.isDirectory() && f !== 'index.json';
  });
  
  for (const platform of platforms) {
    const platformPath = path.join(STORAGE_ROOT, platform);
    const accounts = fs.readdirSync(platformPath).filter(f => {
      return fs.statSync(path.join(platformPath, f)).isDirectory() && f !== 'index.json';
    });
    
    const platformName = platform === 'fanqie' ? '番茄小说' : platform === 'baimeng' ? '白梦写作' : platform;
    console.log(`\n## ${platformName} (${platform})`);
    
    for (const account of accounts) {
      console.log(`\n  账户: ${account}`);
      
      const accountPath = path.join(platformPath, account);
      const pageTypes = fs.readdirSync(accountPath).filter(f => {
        return fs.statSync(path.join(accountPath, f)).isDirectory() && f !== 'index.json';
      });
      
      for (const pageType of pageTypes) {
        const pagePath = path.join(accountPath, pageType);
        const files = fs.readdirSync(pagePath).filter(f => f.endsWith('-elements.json'));
        
        if (files.length > 0) {
          // 读取最新的
          const latest = files.sort().reverse()[0];
          const data = JSON.parse(fs.readFileSync(path.join(pagePath, latest), 'utf-8'));
          
          console.log(`    ${pageType}: ${data.elements.length} 个元素 (${data.meta.localTime})`);
        }
      }
    }
  }
  
  console.log('\n');
}

// ============================================================
// 搜索元素
// ============================================================

function searchElements(keyword) {
  console.log(`\n🔍 搜索 "${keyword}"\n`);
  
  const results = [];
  
  // 遍历所有快照
  const platforms = fs.readdirSync(STORAGE_ROOT).filter(f => {
    return fs.statSync(path.join(STORAGE_ROOT, f)).isDirectory();
  });
  
  for (const platform of platforms) {
    const platformPath = path.join(STORAGE_ROOT, platform);
    const accounts = fs.readdirSync(platformPath).filter(f => {
      return fs.statSync(path.join(platformPath, f)).isDirectory();
    });
    
    for (const account of accounts) {
      const accountPath = path.join(platformPath, account);
      const pageTypes = fs.readdirSync(accountPath).filter(f => {
        return fs.statSync(path.join(accountPath, f)).isDirectory();
      });
      
      for (const pageType of pageTypes) {
        const pagePath = path.join(accountPath, pageType);
        const files = fs.readdirSync(pagePath).filter(f => f.endsWith('-elements.json'));
        
        if (files.length > 0) {
          const latest = files.sort().reverse()[0];
          const data = JSON.parse(fs.readFileSync(path.join(pagePath, latest), 'utf-8'));
          
          const matches = data.elements.filter(el => {
            const searchStr = `${el.name} ${el.text || ''} ${el.placeholder || ''} ${el.selectors.join(' ')}`.toLowerCase();
            return searchStr.includes(keyword.toLowerCase());
          });
          
          if (matches.length > 0) {
            results.push({
              platform,
              account,
              pageType,
              url: data.meta.url,
              title: data.meta.title,
              matches,
            });
          }
        }
      }
    }
  }
  
  // 输出结果
  if (results.length === 0) {
    console.log('  未找到匹配元素');
  } else {
    for (const result of results) {
      console.log(`\n  📄 ${result.platform}/${result.account}/${result.pageType}`);
      console.log(`     ${result.title}`);
      console.log(`     匹配 ${result.matches.length} 个元素:`);
      
      for (const el of result.matches.slice(0, 5)) {
        const selector = el.selectors[0] || el.tag;
        const name = el.name ? ` "${el.name.substring(0, 30)}"` : '';
        console.log(`       [${el.type}] ${selector}${name}`);
      }
      
      if (result.matches.length > 5) {
        console.log(`       ... 还有 ${result.matches.length - 5} 个`);
      }
    }
  }
  
  console.log('\n');
}

// ============================================================
// 显示快照
// ============================================================

function showSnapshot(platform, account, pageType) {
  const pagePath = path.join(STORAGE_ROOT, platform, account, pageType);
  
  if (!fs.existsSync(pagePath)) {
    console.log(`❌ 快照不存在: ${platform}/${account}/${pageType}`);
    return;
  }
  
  const files = fs.readdirSync(pagePath).filter(f => f.endsWith('-elements.json'));
  if (files.length === 0) {
    console.log(`❌ 无元素数据`);
    return;
  }
  
  const latest = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(path.join(pagePath, latest), 'utf-8'));
  
  console.log('\n' + '═'.repeat(60));
  console.log(`📄 ${platform}/${account}/${pageType}`);
  console.log('═'.repeat(60));
  
  console.log(`\n📍 URL: ${data.meta.url}`);
  console.log(`📄 标题: ${data.meta.title}`);
  console.log(`🕐 时间: ${data.meta.localTime}`);
  console.log(`📊 元素: ${data.elements.length} 个`);
  
  // 按类型分组
  const grouped = {};
  for (const el of data.elements) {
    if (!grouped[el.type]) grouped[el.type] = [];
    grouped[el.type].push(el);
  }
  
  console.log('\n📊 类型分布:');
  for (const [type, elements] of Object.entries(grouped)) {
    console.log(`  ${type}: ${elements.length} 个`);
  }
  
  console.log('\n📋 元素列表:\n');
  
  for (const [type, elements] of Object.entries(grouped)) {
    console.log(`### ${type} (${elements.length} 个)\n`);
    for (const el of elements.slice(0, 10)) {
      const selector = el.selectors[0] || el.tag;
      const name = el.name ? ` "${el.name.substring(0, 40)}"` : '';
      const ph = el.placeholder ? ` [${el.placeholder}]` : '';
      console.log(`  ${selector}${name}${ph}`);
    }
    if (elements.length > 10) {
      console.log(`  ... 还有 ${elements.length - 10} 个`);
    }
    console.log('');
  }
}

// ============================================================
// 只显示元素
// ============================================================

function showElements(platform, account, pageType, filterType = null) {
  const pagePath = path.join(STORAGE_ROOT, platform, account, pageType);
  
  if (!fs.existsSync(pagePath)) {
    console.log(`❌ 快照不存在: ${platform}/${account}/${pageType}`);
    return;
  }
  
  const files = fs.readdirSync(pagePath).filter(f => f.endsWith('-elements.json'));
  if (files.length === 0) {
    console.log(`❌ 无元素数据`);
    return;
  }
  
  const latest = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(path.join(pagePath, latest), 'utf-8'));
  
  let elements = data.elements;
  if (filterType) {
    elements = elements.filter(el => el.type === filterType);
  }
  
  console.log(`\n📋 ${platform}/${account}/${pageType} - ${elements.length} 个元素\n`);
  
  for (const el of elements) {
    const selector = el.selectors[0] || el.tag;
    const name = el.name ? ` "${el.name}"` : '';
    console.log(`[${el.type}] ${selector}${name}`);
  }
  
  console.log('');
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  
  switch (command) {
    case 'list':
      listAll();
      break;
    case 'search':
      searchElements(args[1]);
      break;
    case 'show':
      showSnapshot(args[1], args[2], args[3]);
      break;
    case 'elements':
      showElements(args[1], args[2], args[3], args[4]);
      break;
    default:
      console.log(`
快照查询工具

用法:
  node scripts/query.js list                     # 列出所有快照
  node scripts/query.js search "关键词"          # 搜索元素
  node scripts/query.js show <platform> <account> <pageType>   # 显示快照
  node scripts/query.js elements <platform> <account> <pageType> [type]  # 只显示元素

示例:
  node scripts/query.js search "登录"
  node scripts/query.js show fanqie 墨水的灰色 home
  node scripts/query.js elements fanqie 墨水的灰色 home buttons
`);
  }
}

main();
