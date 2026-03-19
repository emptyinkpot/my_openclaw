#!/usr/bin/env node
/**
 * 终极浏览器自动化 - 统一入口
 * 
 * 用法:
 *   node ultimate-browser.js open <url>           打开网页
 *   node ultimate-browser.js snapshot             获取页面快照
 *   node ultimate-browser.js click <ref>          点击元素
 *   node ultimate-browser.js fill <ref> <text>    填写表单
 *   node ultimate-browser.js scrape <url>         抓取网页
 *   node ultimate-browser.js search <query>       搜索网页
 *   node ultimate-browser.js crawl <url>          爬取网站
 *   node ultimate-browser.js screenshot [file]    截图
 *   node ultimate-browser.js record <start|stop>  录屏
 *   node ultimate-browser.js analyze              分析页面
 *   node ultimate-browser.js captcha <type>       解决验证码
 *   node ultimate-browser.js api <method> <url>   API 测试
 */

const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color] || '', ...args, colors.reset);
}

// 检查命令是否存在
function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// 执行 agent-browser 命令
function agentBrowser(...args) {
  if (!hasCommand('agent-browser')) {
    log('yellow', '⚠️  agent-browser 未安装，正在安装...');
    execSync('npm install -g agent-browser', { stdio: 'inherit' });
    execSync('agent-browser install', { stdio: 'inherit' });
  }
  
  log('cyan', `🌐 agent-browser ${args.join(' ')}`);
  try {
    const result = execSync(`agent-browser ${args.join(' ')}`, { 
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'inherit']
    });
    return result;
  } catch (e) {
    return e.stdout || e.message;
  }
}

// AnyCrawl API 调用
async function anycrawl(action, params) {
  const apiKey = process.env.ANYCRAWL_API_KEY;
  if (!apiKey) {
    log('red', '❌ 请设置 ANYCRAWL_API_KEY 环境变量');
    return null;
  }
  
  const endpoints = {
    scrape: '/scrape',
    search: '/search',
    crawl_start: '/crawl',
    crawl_status: '/crawl/status',
    crawl_results: '/crawl/results'
  };
  
  const endpoint = endpoints[action];
  if (!endpoint) {
    log('red', `❌ 未知操作: ${action}`);
    return null;
  }
  
  return new Promise((resolve) => {
    const data = JSON.stringify(params);
    const req = https.request({
      hostname: 'api.anycrawl.dev',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ error: body });
        }
      });
    });
    
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

// 2Captcha 解决验证码
async function solveCaptcha(type, params) {
  const apiKey = process.env.TWOCAPTCHA_API_KEY || 
    require('fs').readFileSync(`${process.env.HOME}/.config/2captcha/api-key`, 'utf-8').trim();
  
  if (!apiKey) {
    log('red', '❌ 请设置 TWOCAPTCHA_API_KEY 或创建 ~/.config/2captcha/api-key');
    return null;
  }
  
  const typeMap = {
    'image': 'image',
    'recaptcha2': 'userrecaptcha',
    'recaptcha3': 'userrecaptcha',
    'hcaptcha': 'hcaptcha',
    'turnstile': 'turnstile'
  };
  
  log('cyan', `🔐 解决验证码: ${type}`);
  // 实际调用 solve-captcha CLI
  try {
    let cmd = `solve-captcha ${type}`;
    for (const [k, v] of Object.entries(params)) {
      cmd += ` --${k} "${v}"`;
    }
    const result = execSync(cmd, { encoding: 'utf-8' });
    return result.trim();
  } catch (e) {
    log('yellow', '⚠️  solve-captcha 未安装，请安装: go install github.com/2captcha/2captcha-go/cmd/solve-captcha@latest');
    return null;
  }
}

// API 测试
async function apiTest(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// 显示帮助
function showHelp() {
  console.log(`
${colors.cyan}🚀 终极浏览器自动化系统${colors.reset}

${colors.yellow}用法:${colors.reset}
  node ultimate-browser.js <命令> [参数]

${colors.yellow}浏览器操作 (agent-browser):${colors.reset}
  open <url>              打开网页
  snapshot [-i]           获取页面快照 (-i 只显示可交互元素)
  click <ref>             点击元素 (@e1, @e2...)
  fill <ref> <text>       填写表单
  type <ref> <text>       追加输入
  press <key>             按键 (Enter, Tab, Escape...)
  scroll <direction> <px> 滚动页面
  wait <ref|ms|text>      等待元素/时间/文本
  screenshot [file]       截图
  record <start|stop> [file] 录屏
  close                   关闭浏览器

${colors.yellow}网页抓取 (anycrawl):${colors.reset}
  scrape <url>            抓取单个网页
  search <query>          搜索网页
  crawl <url>             爬取整个网站

${colors.yellow}验证码解决 (2captcha):${colors.reset}
  captcha image <file>    图片验证码
  captcha recaptcha2 <sitekey> <url>  reCAPTCHA v2
  captcha hcaptcha <sitekey> <url>    hCaptcha
  captcha turnstile <sitekey> <url>   Cloudflare Turnstile

${colors.yellow}API 测试:${colors.reset}
  api <GET|POST|PUT|DELETE> <url>  发送 HTTP 请求

${colors.yellow}页面分析:${colors.reset}
  analyze                 分析当前页面结构
  explore                 探索页面元素

${colors.yellow}示例:${colors.reset}
  # 打开网页并截图
  node ultimate-browser.js open https://example.com
  node ultimate-browser.js screenshot example.png
  
  # 抓取网页内容
  node ultimate-browser.js scrape https://example.com
  
  # 搜索并获取结果
  node ultimate-browser.js search "OpenAI GPT-5"
  
  # 自动化登录流程
  node ultimate-browser.js open https://login.example.com
  node ultimate-browser.js snapshot -i
  node ultimate-browser.js fill @e1 "user@example.com"
  node ultimate-browser.js fill @e2 "password"
  node ultimate-browser.js click @e3
`);
}

// 主入口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    showHelp();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    // 浏览器操作
    case 'open':
      log('green', '✓ 打开网页:', args[1]);
      console.log(agentBrowser('open', args[1]));
      break;
      
    case 'snapshot':
      console.log(agentBrowser('snapshot', ...args.slice(1)));
      break;
      
    case 'click':
      log('green', '✓ 点击元素:', args[1]);
      console.log(agentBrowser('click', args[1]));
      break;
      
    case 'fill':
      log('green', `✓ 填写表单: ${args[1]} = "${args[2]}"`);
      console.log(agentBrowser('fill', args[1], `"${args[2]}"`));
      break;
      
    case 'type':
      console.log(agentBrowser('type', args[1], `"${args[2]}"`));
      break;
      
    case 'press':
      console.log(agentBrowser('press', args[1]));
      break;
      
    case 'scroll':
      console.log(agentBrowser('scroll', args[1], args[2]));
      break;
      
    case 'wait':
      console.log(agentBrowser('wait', ...args.slice(1)));
      break;
      
    case 'screenshot':
      const file = args[1] || 'screenshot.png';
      log('green', '✓ 截图保存到:', file);
      console.log(agentBrowser('screenshot', file));
      break;
      
    case 'record':
      if (args[1] === 'start') {
        const file = args[2] || 'recording.webm';
        log('green', '✓ 开始录屏:', file);
        console.log(agentBrowser('record', 'start', file));
      } else if (args[1] === 'stop') {
        log('green', '✓ 停止录屏');
        console.log(agentBrowser('record', 'stop'));
      }
      break;
      
    case 'close':
      console.log(agentBrowser('close'));
      break;
      
    // 网页抓取
    case 'scrape':
      log('cyan', '📄 抓取网页:', args[1]);
      const scrapeResult = await anycrawl('scrape', { url: args[1] });
      console.log(JSON.stringify(scrapeResult, null, 2));
      break;
      
    case 'search':
      log('cyan', '🔍 搜索:', args.slice(1).join(' '));
      const searchResult = await anycrawl('search', { query: args.slice(1).join(' ') });
      console.log(JSON.stringify(searchResult, null, 2));
      break;
      
    case 'crawl':
      log('cyan', '🕷️ 爬取网站:', args[1]);
      const crawlResult = await anycrawl('crawl_start', { url: args[1] });
      console.log(JSON.stringify(crawlResult, null, 2));
      break;
      
    // 验证码
    case 'captcha':
      const captchaType = args[1];
      const captchaParams = {};
      if (captchaType === 'image') {
        captchaParams.file = args[2];
      } else {
        captchaParams.sitekey = args[2];
        captchaParams.url = args[3];
      }
      const captchaResult = await solveCaptcha(captchaType, captchaParams);
      console.log(captchaResult);
      break;
      
    // API 测试
    case 'api':
      log('cyan', `📡 API 测试: ${args[1]} ${args[2]}`);
      const apiResult = await apiTest(args[1], args[2]);
      console.log(JSON.stringify(apiResult, null, 2));
      break;
      
    // 页面分析
    case 'analyze':
      log('cyan', '🔍 分析页面');
      // 调用内置的 analyze-page
      try {
        const result = execSync('node ../analyze-page/scripts/analyze.js quick', {
          encoding: 'utf-8',
          cwd: __dirname
        });
        console.log(result);
      } catch (e) {
        log('yellow', '使用 agent-browser snapshot 代替');
        console.log(agentBrowser('snapshot', '-i'));
      }
      break;
      
    case 'explore':
      log('cyan', '🔍 探索页面');
      try {
        const result = execSync('node ../page-explorer/scripts/explore.js', {
          encoding: 'utf-8',
          cwd: __dirname
        });
        console.log(result);
      } catch (e) {
        log('yellow', '使用 agent-browser snapshot -i 代替');
        console.log(agentBrowser('snapshot', '-i'));
      }
      break;
      
    default:
      log('red', `❌ 未知命令: ${command}`);
      showHelp();
  }
}

main().catch(console.error);
