/**
 * 灏忚绠＄悊妯″潡 - OpenClaw 鎻掍欢
 */
import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { NovelService } from '../backend/services/novel-service';
import { getConfig } from '../../core/config';
import { getDatabaseManager, getDailyPlanRepository } from '../../core/database';

// 瀵煎叆绂佺敤璇嶅鐞嗘楠?import { BannedWordsStep } from '../core/content-craft/src/steps/process/banned-words';
// 瀵煎叆閰嶇疆绠＄悊鍣?import { configManager } from '../core/content-craft/src/config-manager';
// 瀵煎叆鏂囨湰鐢熸垚鍔熻兘
import { GenerationPipeline } from '../core/content-craft/src/generation-pipeline';
// 瀵煎叆鏂囨湰娑﹁壊鍔熻兘
import { PolishPipeline } from '../core/content-craft/src/pipeline';
// 瀵煎叆鐣寗鍙戝竷鍔熻兘
import { FanqieSimplePipeline } from '../core/publishing/FanqieSimplePipeline';
// 瀵煎叆 content-craft 鑷姩澶勭悊鏈嶅姟
import { getContentCraftAutoService } from '../core/content-craft/src';
// 瀵煎叆瀹℃牳鑷姩澶勭悊鏈嶅姟
import { getAuditAutoService } from '../core/audit';
// 瀵煎叆鏅鸿兘璋冨害鍣?import { getSmartScheduler } from '../core/smart-scheduler';
// 瀵煎叆娲诲姩鏃ュ織
import { getActivityLog } from '../core/smart-scheduler';
// 瀵煎叆鑷姩鍙戝竷鏈嶅姟
import { getPublishAutoService } from '../core/publishing';
// 瀵煎叆鏁呬簨鐘舵€佺鐞嗗櫒
import { getStoryStateManager } from '../core/content-craft/src/story-state-manager';
// 瀵煎叆鍏宠仈绔犺妭绠＄悊鍣?import { getRelatedChaptersManager } from '../core/content-craft/src/related-chapters-manager';
// 瀵煎叆涓€鑷存€ф鏌ュ櫒
import { getConsistencyChecker } from '../core/content-craft/src/consistency-checker';

// 灏濊瘯瀵煎叆 registerPluginHttpRoute
let registerPluginHttpRoute: any;
try {
  // @ts-ignore
  registerPluginHttpRoute = require('@openclaw/plugin-sdk').registerPluginHttpRoute;
} catch (e) {
  console.log('[novel-manager] 鏃犳硶鍔犺浇 plugin-sdk锛屽皢浣跨敤澶囩敤鏂规');
}



// 鏈嶅姟瀹炰緥
let novelService: NovelService | null = null;
let htmlCache: string | null = null;

function resolveWorkspaceRoot(): string {
  const moduleRoot = getConfig().paths?.root;
  if (moduleRoot) {
    return path.resolve(moduleRoot, '..', '..');
  }

  const browserDir = getConfig().scheduler?.fanqieAccounts?.[0]?.browserDir;
  if (browserDir) {
    const normalized = path.normalize(browserDir);
    const runtimeToken = `${path.sep}.runtime${path.sep}extensions${path.sep}`;
    if (normalized.includes(runtimeToken)) {
      return path.resolve(browserDir, '..', '..', '..', '..');
    }

    return path.dirname(path.dirname(browserDir));
  }

  return path.resolve(__dirname, '..', '..', '..');
}

function getScreenshotDir(): string {
  return path.join(resolveWorkspaceRoot(), 'workspace', 'screenshots');
}

function getNovelService(): NovelService {
  if (!novelService) {
    novelService = new NovelService();
  }
  return novelService;
}

// 鑾峰彇椤圭洰缁撴瀯
async function getProjectStructure() {
  const projectRoot = path.join(__dirname, '..', '..', '..');
  
  // 鑾峰彇鎻掍欢鍒楄〃
  const pluginsDir = path.join(projectRoot, 'extensions', 'plugins');
  const plugins: string[] = [];
  try {
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        plugins.push(entry.name);
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 鑾峰彇鎻掍欢鍒楄〃澶辫触:', e);
  }

  // 鑾峰彇 API 璺敱鍒楄〃锛堜粠鏈枃浠朵腑鎻愬彇锛?  const apiRoutes: string[] = [];
  try {
    const content = fs.readFileSync(__filename, 'utf-8');
    const matches = content.match(/path === '\/api\/novel\/[^']+'/g);
    if (matches) {
      const uniqueRoutes = new Set<string>();
      matches.forEach(m => {
        const route = m.match(/'(\/api\/novel\/[^']+)'/)?.[1];
        if (route) uniqueRoutes.add(route);
      });
      apiRoutes.push(...Array.from(uniqueRoutes).sort());
    }
  } catch (e) {
    console.error('[ProjectStructure] 鑾峰彇API璺敱澶辫触:', e);
  }

  // 鑾峰彇鍐呭宸ヨ壓妯″潡鐨勬楠?  const contentCraftSteps: string[] = [];
  try {
    const stepsDir = path.join(__dirname, '..', '..', 'core', 'content-craft', 'src', 'steps');
    if (fs.existsSync(stepsDir)) {
      const entries = fs.readdirSync(stepsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          contentCraftSteps.push(entry.name);
        }
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 鑾峰彇鍐呭宸ヨ壓姝ラ澶辫触:', e);
  }

  // 鑾峰彇鏈嶅姟鍒楄〃
  const services: string[] = [];
  try {
    const servicesDir = path.join(__dirname, 'services');
    if (fs.existsSync(servicesDir)) {
      const entries = fs.readdirSync(servicesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          services.push(entry.name.replace(/\.(ts|js)$/, ''));
        }
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 鑾峰彇鏈嶅姟鍒楄〃澶辫触:', e);
  }

  // 鑾峰彇妯″潡鍐呭墠绔〉闈㈠垪琛紙宸蹭笉鍐嶄緷璧?extensions/public锛?  const customPages: string[] = [];
  try {
    const pagesDir = path.join(projectRoot, 'extensions', 'novel-manager', 'frontend', 'pages');
    if (fs.existsSync(pagesDir)) {
      const moduleEntries = fs.readdirSync(pagesDir, { withFileTypes: true });
      for (const moduleEntry of moduleEntries) {
        if (!moduleEntry.isDirectory()) {
          continue;
        }

        const modulePageDir = path.join(pagesDir, moduleEntry.name);
        const entries = fs.readdirSync(modulePageDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.html')) {
            customPages.push(`${moduleEntry.name}/${entry.name}`);
          }
        }
      }
    }
  } catch (e) {
    console.error('[ProjectStructure] 鑾峰彇鑷畾涔夐〉闈㈠垪琛ㄥけ璐?', e);
  }

  return {
    projectRoot,
    timestamp: new Date().toISOString(),
    modules: {
      plugins,
      apiRoutes,
      contentCraftSteps,
      services
    },
    structure: {
      frontend: {
        status: 'active',
        official: {
          name: 'OpenClaw 瀹樻柟 Dashboard',
          tech: 'React',
          description: 'OpenClaw 鑷甫鐨勬帶鍒堕潰鏉?,
          pages: ['index.html', 'launch.html', 'chat']
        },
        custom: {
          name: '椤圭洰鑷畾涔夐〉闈?,
          tech: '鍘熺敓 HTML/CSS/JS',
          description: '鎴戜滑閫氳繃鎻掍欢鑷畾涔夌殑椤甸潰',
          pages: customPages
        }
      },
      backend: {
        routing: {
          status: 'active',
          count: apiRoutes.length,
          routes: apiRoutes
        },
        services: {
          status: 'active',
          count: services.length,
          list: services
        },
        database: {
          status: 'active',
          description: 'SQLite 鏁版嵁搴?
        }
      },
      contentCraft: {
        status: 'active',
        steps: contentCraftSteps
      },
      plugins: {
        status: 'active',
        count: plugins.length,
        list: plugins
      }
    }
  };
}

// 鑾峰彇灏忚绠＄悊鐣岄潰HTML
function getNovelHtml(): string {
  if (htmlCache) return htmlCache;
  
  const htmlPath = path.join(__dirname, '..', 'frontend', 'pages', 'novel', 'index.html');
  try {
    htmlCache = fs.readFileSync(htmlPath, 'utf-8');
    return htmlCache;
  } catch (e) {
    console.error('[novel-manager] 鏃犳硶璇诲彇HTML鏂囦欢:', htmlPath);
    return '<html><body><h1>灏忚绠＄悊鐣岄潰鍔犺浇澶辫触</h1></body></html>';
  }
}

// JSON鍝嶅簲杈呭姪鍑芥暟
function jsonRes(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// 瑙ｆ瀽璇锋眰浣?async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 瑙ｆ瀽URL鍙傛暟
function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryString = url.split('?')[1] || '';
  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

function invokeLlmWithTimeout<T>(work: Promise<T>, timeoutMs = 15000): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`LLM_TIMEOUT_${timeoutMs}`)), timeoutMs);
    })
  ]);
}

function applyLiteralReplacements(
  text: string,
  rows: Array<{ word?: string; replacement?: string | null; reason?: string | null }>,
  options?: {
    defaultReplacement?: string;
    source?: string;
    defaultReason?: string;
  }
) {
  let resultText = text;
  const replacements: Array<{
    original: string;
    replaced: string;
    reason: string;
    source: string;
  }> = [];
  const seen = new Set<string>();

  const sortedRows = [...rows].sort((left, right) => {
    return (right.word?.length || 0) - (left.word?.length || 0);
  });

  for (const row of sortedRows) {
    const original = typeof row.word === 'string' ? row.word : '';
    if (!original || !resultText.includes(original)) {
      continue;
    }

    const replacement = (typeof row.replacement === 'string' ? row.replacement.trim() : '')
      || options?.defaultReplacement
      || '';

    if (replacement === original) {
      continue;
    }

    resultText = resultText.split(original).join(replacement);

    const key = `${original}=>${replacement}`;
    if (!seen.has(key)) {
      seen.add(key);
      replacements.push({
        original,
        replaced: replacement || '(宸茬Щ闄?',
        reason: row.reason || options?.defaultReason || '鏈湴鍏滃簳鏇挎崲',
        source: options?.source || 'local-fallback'
      });
    }
  }

  return {
    text: resultText,
    replacements
  };
}

// 鑾峰彇瀵艰埅鏍廐TML
function getNavBarHtml(): string {
  const navBarPath = path.join(__dirname, '..', '..', '..', 'shared', 'nav-bar.html');
  try {
    return fs.readFileSync(navBarPath, 'utf-8');
  } catch (e) {
    console.error('[novel-manager] 鏃犳硶璇诲彇瀵艰埅鏍忔枃浠?', navBarPath);
    return '<div class="nav-bar">瀵艰埅鏍忓姞杞藉け璐?/div>';
  }
}

// 娉ㄥ叆瀵艰埅鏍忓埌椤甸潰HTML涓?function injectNavBar(html: string, currentPage: string): string {
  let navBarHtml = getNavBarHtml();
  
  // 鏍规嵁褰撳墠椤甸潰缁欏搴旂殑閾炬帴娣诲姞 "on" 绫?  const pageToLinkMap: Record<string, string> = {
    'index.html': '/novel/'
  };
  
  const currentLink = pageToLinkMap[currentPage];
  if (currentLink) {
    // 缁欏綋鍓嶉摼鎺ユ坊鍔?"on" 绫?    const linkRegex = new RegExp(`href="${currentLink}"`, 'g');
    navBarHtml = navBarHtml.replace(linkRegex, `href="${currentLink}" class="on"`);
  }
  
  // 娣诲姞鍔ㄦ€佽缃鑸爮楂樺害鐨勮剼鏈?  const dynamicHeightScript = `
<script>
// 鍔ㄦ€佽缃鑸爮楂樺害
(function() {
  function setNavHeight() {
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      const height = navBar.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', height + 'px');
      
      // 缁?body 娣诲姞 padding-top
      document.body.style.paddingTop = 'var(--nav-height)';
    }
  }
  
  // 浣跨敤 MutationObserver 鐩戝惉瀵艰埅鏍忓姞杞?  const observer = new MutationObserver(function() {
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      observer.disconnect();
      setNavHeight();
    }
  });
  
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // 绔嬪嵆灏濊瘯鎵ц
  setNavHeight();
  
  // DOMContentLoaded 鏃跺啀娆℃墽琛?  document.addEventListener('DOMContentLoaded', setNavHeight);
  
  // load 鏃跺啀娆℃墽琛?  window.addEventListener('load', setNavHeight);
  
  // 鐩戝惉绐楀彛澶у皬鍙樺寲
  window.addEventListener('resize', setNavHeight);
})();
</script>
`;
  
  navBarHtml = navBarHtml + dynamicHeightScript;
  
  // 灏濊瘯鏇挎崲椤甸潰涓殑 <div class="nav-bar"> 閮ㄥ垎锛堟洿瀹芥澗鐨勫尮閰嶏級
  // 鍖归厤浠?<div class="nav-bar"> 鍒?</div>锛屽寘鎷彲鑳界殑绌虹櫧瀛楃
  const navBarRegex = /<div[^>]*class="[^"]*nav-bar[^"]*"[^>]*>[\s\S]*?<\/div>/;
  
  if (navBarRegex.test(html)) {
    return html.replace(navBarRegex, navBarHtml);
  }
  
  // 濡傛灉娌℃湁鎵惧埌锛屽皾璇曞湪 <body> 鏍囩鍚庢敞鍏?  if (html.includes('<body>')) {
    return html.replace('<body>', '<body>' + navBarHtml);
  }
  
  return html;
}

// 鑾峰彇椤甸潰HTML
function getPageHtml(_pageName: string): string {
  return injectNavBar(getNovelHtml(), 'index.html');
}

// 澶勭悊椤圭洰缁撴瀯椤甸潰
function getProjectStructureHtml(): string {
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>宸ョ▼缁撴瀯 - 椤圭洰鐩戣鍣?/title>
  <style>
    :root {
      --bg: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --card: #ffffff;
      --text: #1e293b;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --accent: #0969da;
      --accent-hover: #0550ae;
      --accent-light: #ddf4ff;
      --border: #d1d9e0;
      --border-light: #eaeef2;
      --success: #1a7f37;
      --success-bg: #dafbe1;
      --warning: #9a6700;
      --warning-bg: #fff8c5;
      --danger: #cf222e;
      --danger-bg: #ffebe9;
      --purple: #8250df;
      --purple-bg: #fbefff;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      min-height: 100vh;
      font-size: 14px;
      line-height: 1.5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-light);
    }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h1 .badge {
      font-size: 12px;
      font-weight: 500;
      background: var(--accent-light);
      color: var(--accent);
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid var(--accent);
    }
    .refresh-btn {
      padding: 6px 14px;
      background: var(--accent);
      color: white;
      border: 1px solid var(--accent);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .refresh-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    .refresh-btn:active { transform: scale(0.98); }
    .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 12px;
    }
    .card {
      background: var(--card);
      border-radius: 6px;
      padding: 12px;
      border: 1px solid var(--border-light);
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-light);
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }
    .status-active { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 2px;
      line-height: 1.1;
    }
    .stat-label {
      color: var(--text-secondary);
      font-size: 12px;
    }
    .list {
      max-height: 160px;
      overflow-y: auto;
      margin-top: 8px;
    }
    .list::-webkit-scrollbar { width: 6px; }
    .list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    .list-item {
      padding: 6px 0;
      border-bottom: 1px solid var(--border-light);
      font-size: 12px;
      color: var(--text-secondary);
    }
    .list-item:last-child { border-bottom: none; }
    .list-item code {
      background: var(--bg-tertiary);
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 11px;
      color: var(--purple);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .timestamp {
      color: var(--text-muted);
      font-size: 11px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .loading {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    /* 浜岀骇鏍囩瀵艰埅 */
    .sub-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      padding: 4px;
      background: var(--bg-secondary);
      border-radius: 6px;
      border: 1px solid var(--border-light);
    }
    .sub-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all 0.15s;
    }
    .sub-tab:hover {
      background: var(--bg-tertiary);
      color: var(--text);
    }
    .sub-tab.active {
      background: var(--accent);
      color: white;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    /* UI 璁捐鏍囩鍐呭 */
    .ui-section {
      margin-bottom: 16px;
    }
    .ui-section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ui-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .ui-item {
      background: var(--card);
      border: 1px solid var(--border-light);
      border-radius: 6px;
      padding: 12px;
    }
    .ui-item-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--accent);
    }
    .ui-item-desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .ui-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .ui-tag {
      font-size: 11px;
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: 12px;
      color: var(--text-secondary);
    }
    .ui-tag.accent {
      background: var(--accent-light);
      color: var(--accent);
    }
    .ui-progress {
      margin-top: 8px;
      height: 4px;
      background: var(--bg-tertiary);
      border-radius: 2px;
      overflow: hidden;
    }
    .ui-progress-bar {
      height: 100%;
      background: var(--accent);
      border-radius: 2px;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        馃彈锔?宸ョ▼缁撴瀯
        <span class="badge">椤圭洰绠＄悊</span>
      </h1>
      <button class="refresh-btn" id="refreshBtn" onclick="loadData()">
        <span>馃攧</span>
        鍒锋柊
      </button>
    </div>

    <!-- 浜岀骇鏍囩瀵艰埅 -->
    <div class="sub-tabs">
      <button class="sub-tab active" onclick="switchSubTab('overview')" id="tab-overview">
        馃搳 缁撴瀯姒傝
      </button>
      <button class="sub-tab" onclick="switchSubTab('ui')" id="tab-ui">
        馃帹 UI 璁捐
      </button>
    </div>

    <!-- 缁撴瀯姒傝鏍囩鍐呭 -->
    <div class="tab-content active" id="content-overview">
      <div id="content">
        <div class="loading">鍔犺浇涓?..</div>
      </div>
    </div>

    <!-- UI 璁捐鏍囩鍐呭 -->
    <div class="tab-content" id="content-ui">
      <div class="ui-section">
        <div class="ui-section-title">鉁?鎴戣兘鍋氬埌鐨?UI 璁捐</div>
        <div class="ui-grid">
          <div class="ui-item">
            <div class="ui-item-title">馃帹 棰滆壊鏂规璁捐</div>
            <div class="ui-item-desc">涓洪」鐩璁＄粺涓€鐨勯厤鑹叉柟妗堬紝鍖呮嫭涓昏壊璋冦€佽緟鍔╄壊銆佽儗鏅壊銆佹枃瀛楄壊绛?/div>
            <div class="ui-tags">
              <span class="ui-tag accent">閰嶈壊</span>
              <span class="ui-tag">涓昏壊璋?/span>
              <span class="ui-tag">娓愬彉</span>
            </div>
          </div>
          <div class="ui-item">
            <div class="ui-item-title">馃搻 甯冨眬涓庨棿璺?/div>
            <div class="ui-item-desc">璁捐鍚堢悊鐨勯〉闈㈠竷灞€銆佺綉鏍肩郴缁熴€侀棿璺濊鑼冿紝纭繚瑙嗚骞宠　</div>
            <div class="ui-tags">
              <span class="ui-tag accent">甯冨眬</span>
              <span class="ui-tag">缃戞牸</span>
              <span class="ui-tag">闂磋窛</span>
            </div>
          </div>
          <div class="ui-item">
            <div class="ui-item-title">馃柤锔?缁勪欢璁捐</div>
            <div class="ui-item-desc">璁捐鎸夐挳銆佸崱鐗囥€佽〃鍗曘€佸鑸瓑甯哥敤缁勪欢鐨勬牱寮忓拰浜や簰鏁堟灉</div>
            <div class="ui-tags">
              <span class="ui-tag accent">缁勪欢</span>
              <span class="ui-tag">鎸夐挳</span>
              <span class="ui-tag">鍗＄墖</span>
            </div>
          </div>
          <div class="ui-item">
            <div class="ui-item-title">鉁?鍔ㄦ晥涓庝氦浜?/div>
            <div class="ui-item-desc">娣诲姞杩囨浮鍔ㄧ敾銆佹偓鍋滄晥鏋溿€佺偣鍑诲弽棣堬紝鎻愬崌鐢ㄦ埛浣撻獙</div>
            <div class="ui-tags">
              <span class="ui-tag accent">鍔ㄦ晥</span>
              <span class="ui-tag">杩囨浮</span>
              <span class="ui-tag">浜や簰</span>
            </div>
          </div>
          <div class="ui-item">
            <div class="ui-item-title">馃摫 鍝嶅簲寮忚璁?/div>
            <div class="ui-item-desc">纭繚椤甸潰鍦ㄤ笉鍚屽睆骞曞昂瀵镐笅閮芥湁鑹ソ鐨勬樉绀烘晥鏋?/div>
            <div class="ui-tags">
              <span class="ui-tag accent">鍝嶅簲寮?/span>
              <span class="ui-tag">绉诲姩绔?/span>
              <span class="ui-tag">閫傞厤</span>
            </div>
          </div>
          <div class="ui-item">
            <div class="ui-item-title">馃敡 鏍峰紡閲嶆瀯</div>
            <div class="ui-item-desc">浼樺寲鐜版湁鏍峰紡锛岃椤甸潰鏇寸編瑙傘€佹洿绱у噾銆佹洿瀹炵敤</div>
            <div class="ui-tags">
              <span class="ui-tag accent">閲嶆瀯</span>
              <span class="ui-tag">浼樺寲</span>
              <span class="ui-tag">绱у噾</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ui-section">
        <div class="ui-section-title">馃幆 宸插畬鎴愮殑 UI 浼樺寲</div>
        <div class="grid">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">椤圭洰缁撴瀯椤甸潰</h3>
            </div>
            <div class="stat-value">100%</div>
            <div class="stat-label">宸插畬鎴?/div>
            <div class="ui-progress">
              <div class="ui-progress-bar" style="width: 100%;"></div>
            </div>
            <div class="list" style="margin-top: 8px;">
              <div class="list-item">鉁?娴呰壊鑳屾櫙璁捐</div>
              <div class="list-item">鉁?鏇寸揣鍑戠殑甯冨眬</div>
              <div class="list-item">鉁?鏇寸編瑙傜殑鏍峰紡</div>
              <div class="list-item">鉁?浜岀骇鏍囩瀵艰埅</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">缁忛獙绉疮涓績</h3>
            </div>
            <div class="stat-value">100%</div>
            <div class="stat-label">宸插畬鎴?/div>
            <div class="ui-progress">
              <div class="ui-progress-bar" style="width: 100%;"></div>
            </div>
            <div class="list" style="margin-top: 8px;">
              <div class="list-item">鉁?缁忛獙鍒楄〃</div>
              <div class="list-item">鉁?绗旇鍔熻兘</div>
              <div class="list-item">鉁?涓撴爮鍔熻兘</div>
              <div class="list-item">鉁?鍗＄墖寮忓竷灞€</div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">瀵艰埅鏍忕粺涓€</h3>
            </div>
            <div class="stat-value">100%</div>
            <div class="stat-label">宸插畬鎴?/div>
            <div class="ui-progress">
              <div class="ui-progress-bar" style="width: 100%;"></div>
            </div>
            <div class="list" style="margin-top: 8px;">
              <div class="list-item">鉁?缁熶竴 nav-bar.html</div>
              <div class="list-item">鉁?椤甸潰楂樹寒鏄剧ず</div>
              <div class="list-item">鉁?鍔ㄦ€侀珮搴﹁皟鏁?/div>
              <div class="list-item">鉁?璁剧疆寮圭獥闆嗘垚</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ui-section">
        <div class="ui-section-title">馃搵 UI 璁捐瑙勮寖</div>
        <div class="card full-width">
          <div class="list">
            <div class="list-item">
              <strong>閰嶈壊鍘熷垯锛?/strong>浣跨敤 GitHub 椋庢牸閰嶈壊锛屼富鑹茶皟 #0969da锛岃儗鏅壊 #ffffff
            </div>
            <div class="list-item">
              <strong>闂磋窛瑙勮寖锛?/strong>浣跨敤 4px 鍩哄噯鍗曚綅锛屽父鐢ㄩ棿璺?4/8/12/16/24px
            </div>
            <div class="list-item">
              <strong>鍦嗚瑙勮寖锛?/strong>灏忓厓绱?3/4px锛屽崱鐗?6/8px锛屾寜閽?6/12px
            </div>
            <div class="list-item">
              <strong>瀛椾綋瑙勮寖锛?/strong>绯荤粺瀛椾綋鏍堬紝鏍囬 16-20px锛屾鏂?13-14px锛屽皬瀛?11-12px
            </div>
            <div class="list-item">
              <strong>闃村奖瑙勮寖锛?/strong>杞诲井闃村奖 0 1px 3px rgba(0,0,0,0.04)
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = '/api/novel';
    const TOKEN = 'CHANGE_ME_GATEWAY_TOKEN';

    async function api(path, options = {}) {
      const res = await fetch(API_BASE + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + TOKEN,
          ...(options.headers || {})
        }
      });
      return res.json();
    }

    async function loadData() {
      const btn = document.getElementById('refreshBtn');
      btn.disabled = true;
      
      try {
        const result = await api('/project-structure');
        if (result.success) {
          renderData(result.data);
        } else {
          document.getElementById('content').innerHTML = \`
            <div class="loading">鍔犺浇澶辫触: \${result.error}</div>
          \`;
        }
      } catch (e) {
        document.getElementById('content').innerHTML = \`
          <div class="loading">缃戠粶閿欒: \${e.message}</div>
        \`;
      } finally {
        btn.disabled = false;
      }
    }

    // 浜岀骇鏍囩鍒囨崲
    function switchSubTab(tab) {
      // 鏇存柊鏍囩鏍峰紡
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      
      // 鏇存柊鍐呭鏄剧ず
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('content-' + tab).classList.add('active');
    }

    function renderData(data) {
      const { structure, timestamp } = data;
      
      document.getElementById('content').innerHTML = \`
        <div class="timestamp">
          <span>馃晲</span>
          鏈€鍚庢洿鏂? \${new Date(timestamp).toLocaleString('zh-CN')}
        </div>
        
        <div class="grid">
          <!-- OpenClaw 瀹樻柟 Dashboard -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">馃 瀹樻柟 Dashboard</h3>
              <span class="status-badge status-active">React</span>
            </div>
            <div class="stat-value">\${structure.frontend.official.pages.length}</div>
            <div class="stat-label">椤甸潰</div>
            <div class="list">
              \${structure.frontend.official.pages.slice(0, 6).map(p => \`<div class="list-item"><code>\${p}</code></div>\`).join('')}
              \${structure.frontend.official.pages.length > 6 ? \`<div class="list-item" style="color: var(--text-muted);">... 杩樻湁 \${structure.frontend.official.pages.length - 6} 涓?/div>\` : ''}
            </div>
          </div>

          <!-- 椤圭洰鑷畾涔夐〉闈?-->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">鉁?鑷畾涔夐〉闈?/h3>
              <span class="status-badge status-active">HTML/CSS/JS</span>
            </div>
            <div class="stat-value">\${structure.frontend.custom.pages.length}</div>
            <div class="stat-label">椤甸潰</div>
            <div class="list">
              \${structure.frontend.custom.pages.slice(0, 6).map(p => \`<div class="list-item"><code>\${p}</code></div>\`).join('')}
              \${structure.frontend.custom.pages.length > 6 ? \`<div class="list-item" style="color: var(--text-muted);">... 杩樻湁 \${structure.frontend.custom.pages.length - 6} 涓?/div>\` : ''}
            </div>
          </div>

          <!-- 鍚庣璺敱 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">馃攲 API 绔偣</h3>
            </div>
            <div class="stat-value">\${structure.backend.routing.count}</div>
            <div class="stat-label">鎺ュ彛</div>
          </div>

          <!-- 鍚庣鏈嶅姟 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">鈿欙笍 鏈嶅姟灞?/h3>
            </div>
            <div class="stat-value">\${structure.backend.services.count}</div>
            <div class="stat-label">鏈嶅姟</div>
            <div class="list">
              \${structure.backend.services.list.slice(0, 6).map(s => \`<div class="list-item"><code>\${s}</code></div>\`).join('')}
            </div>
          </div>

          <!-- 鍐呭宸ヨ壓 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">鉁忥笍 鍐呭宸ヨ壓</h3>
            </div>
            <div class="stat-value">\${structure.contentCraft.steps.length}</div>
            <div class="stat-label">姝ラ</div>
            <div class="list">
              \${structure.contentCraft.steps.slice(0, 6).map(s => \`<div class="list-item"><code>\${s}</code></div>\`).join('')}
            </div>
          </div>

          <!-- 鎻掍欢妯″潡 -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">馃攲 鎻掍欢</h3>
            </div>
            <div class="stat-value">\${structure.plugins.count}</div>
            <div class="stat-label">宸插惎鐢?/div>
            <div class="list">
              \${structure.plugins.list.map(p => \`<div class="list-item"><code>\${p}</code></div>\`).join('')}
            </div>
          </div>

          <!-- 蹇€熺粺璁?-->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">馃搳 姒傝</h3>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
              <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: var(--accent);">\${structure.frontend.official.pages.length + structure.frontend.custom.pages.length}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">鍓嶇椤甸潰</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: var(--success);">\${structure.backend.routing.count}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">API</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: var(--warning);">\${structure.backend.services.count}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">鏈嶅姟</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; color: var(--purple);">\${structure.plugins.count}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">鎻掍欢</div>
              </div>
            </div>
          </div>
        </div>

        <!-- API 璺敱璇︽儏 -->
        <div class="card full-width">
          <div class="card-header">
            <h3 class="card-title">馃搵 API 绔偣璇︽儏</h3>
          </div>
          <div class="list" style="max-height: 200px;">
            \${structure.backend.routing.routes.map(r => \`<div class="list-item"><code>\${r}</code></div>\`).join('')}
          </div>
        </div>
      \`;
    }

    loadData();
  </script>
</body>
</html>`;
  
  // 娉ㄥ叆瀵艰埅鏍?  html = injectNavBar(html, 'project-structure.html');
  return html;
}

// 璺敱澶勭悊鍣?- 澶勭悊椤甸潰璇锋眰锛堜笉闇€瑕佽璇侊級
async function handleNovelPage(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const urlPath = url.split('?')[0];

  // 椤甸潰璺敱鏄犲皠 - 鍘熺敓鐣岄潰浣滀负榛樿棣栭〉
  const pageMap: Record<string, string> = {
    '/novel': 'index.html',
    '/novel/': 'index.html'
  };



  const pageFile = pageMap[urlPath];
  if (pageFile) {
    // 鏍规嵁鏂囦欢绫诲瀷璁剧疆 Content-Type
    let contentType = 'text/html; charset=utf-8';
    if (pageFile.endsWith('.js')) {
      contentType = 'application/javascript; charset=utf-8';
    }
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(getPageHtml(pageFile));
    return true;
  }
  
  return false;
}

// SSE 澶勭悊鍣?- 澶勭悊杩涘害鎺ㄩ€侊紙浣跨敤 URL 鍙傛暟璁よ瘉锛?async function handleSse(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  const path = url.split('?')[0];
  const query = parseQuery(url);
  
  console.log('[SSE] 鏀跺埌璇锋眰:', method, path);
  
  // SSE 绔偣: /novel/sse/progress/:progressId
  const progressMatch = path.match(/^\/novel\/sse\/progress\/([^/]+)$/);
  if (progressMatch && method === 'GET') {
    const progressId = progressMatch[1];
    const token = query.token;
    
    // 楠岃瘉 token锛堜粠 URL 鍙傛暟锛?    const validToken = 'CHANGE_ME_GATEWAY_TOKEN';
    if (token !== validToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return true;
    }
    
    console.log('[SSE] 瀹㈡埛绔繛鎺?', progressId);
    
    // 璁剧疆 SSE 鍝嶅簲澶?    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // 绔嬪嵆鍙戦€佽繛鎺ョ‘璁ゆ秷鎭?    res.write(`data: ${JSON.stringify({ status: 'connected', message: 'SSE杩炴帴宸插缓绔?, progressId })}\n\n`);
    
    // 瀵煎叆杩涘害绠＄悊鍣?    const { registerClient } = require('./core/pipeline/ProgressManager');
    
    // 娉ㄥ唽瀹㈡埛绔?    const unregister = registerClient(progressId, (data: string) => {
      try {
        res.write(data);
      } catch (e) {
        console.error('[SSE] 鍐欏叆澶辫触:', e);
      }
    });
    
    // 蹇冭烦淇濇椿
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
        unregister();
      }
    }, 15000);
    
    // 杩炴帴鍏抽棴鏃舵竻鐞?    req.on('close', () => {
      console.log('[SSE] 瀹㈡埛绔柇寮€:', progressId);
      clearInterval(heartbeat);
      unregister();
    });
    
    return true;
  }
  
  return false;
}

// 璺敱澶勭悊鍣?- 澶勭悊 /api/novel/ API锛堥渶瑕佽璇侊級
async function handleNovelApi(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  const path = url.split('?')[0];
  const query = parseQuery(url);

  // 鍒濆鍖栨暟鎹簱琛?  const service = getNovelService();
  await service.initTables().catch(() => {});

  try {
    // CORS棰勬
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end();
      return true;
    }

    if (path === '/api/novel/health' && method === 'GET') {
      jsonRes(res, {
        success: true,
        status: 'ok',
        module: 'novel-manager',
        routeMode: 'minimal',
        pageSource: require('path').join(__dirname, '..', 'frontend', 'pages', 'novel', 'index.html'),
        pageRoutes: [
          '/novel',
          '/novel/'
        ]
      });
      return true;
    }

    // ====== 姣忔棩璁″垝API ======
    // 鍚屾姣忔棩璁″垝鍒版暟鎹簱
    if (path === '/api/novel/daily-plans/sync' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { plannedChapters, completedChapters, lastPlanDate } = body;
        const dailyPlanRepo = getDailyPlanRepository();
        
        // 杞崲鏍煎紡
        const plans: Array<{ work_id: number; chapter_number: number; plan_date: string | Date }> = [];
        if (plannedChapters && typeof plannedChapters === 'object') {
          for (const [workIdStr, chapters] of Object.entries(plannedChapters)) {
            const workId = parseInt(workIdStr);
            if (Array.isArray(chapters)) {
              for (const chapterNum of chapters) {
                // 涓嶉渶瑕佷紶閫?plan_date锛宻ave 鏂规硶浼氳嚜鍔ㄥ鐞?                plans.push({ work_id: workId, chapter_number: chapterNum, plan_date: new Date() });
              }
            }
          }
        }
        
        // 浣跨敤浠撳簱淇濆瓨
        await dailyPlanRepo.saveToday(plans);
        
        jsonRes(res, { success: true, message: '姣忔棩璁″垝宸插悓姝? });
      } catch (error) {
        console.error('[DailyPlanAPI] 鍚屾澶辫触:', error);
        jsonRes(res, { success: false, error: '鍚屾澶辫触' }, 500);
      }
      return true;
    }
    
    // 鑾峰彇浠婃棩璁″垝
    if (path === '/api/novel/daily-plans' && method === 'GET') {
      try {
        const dailyPlanRepo = getDailyPlanRepository();
        const todayPlans = await dailyPlanRepo.getToday();
        
        // 杞崲鏍煎紡
        const plannedChapters: Record<number, number[]> = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        todayPlans.forEach((plan: any) => {
          if (!plannedChapters[plan.work_id]) {
            plannedChapters[plan.work_id] = [];
          }
          plannedChapters[plan.work_id].push(plan.chapter_number);
        });
        
        jsonRes(res, { success: true, data: { plannedChapters, planDate: todayStr } });
      } catch (error) {
        console.error('[DailyPlanAPI] 鑾峰彇澶辫触:', error);
        jsonRes(res, { success: false, error: '鑾峰彇澶辫触' }, 500);
      }
      return true;
    }

    // ====== 閰嶇疆绠＄悊API ======
    // 鑾峰彇閰嶇疆
    if (path === '/api/novel/config' && method === 'GET') {
      try {
        const settings = configManager.getSettings();
        const stepConfigs = configManager.getAllStepConfigs();
        jsonRes(res, { 
          success: true, 
          data: { 
            settings, 
            stepConfigs 
          } 
        });
      } catch (error) {
        console.error('[ConfigAPI] 鑾峰彇閰嶇疆澶辫触:', error);
        jsonRes(res, { success: false, error: '鑾峰彇閰嶇疆澶辫触' }, 500);
      }
      return true;
    }

    // 淇濆瓨閰嶇疆
    if (path === '/api/novel/config' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { settings, stepConfigs } = body;
        if (settings) {
          configManager.saveSettings(settings);
        }
        // 濡傛灉鎻愪緵浜?stepConfigs锛屼篃淇濆瓨姣忎釜姝ラ鐨勯厤缃?        if (stepConfigs && Array.isArray(stepConfigs)) {
          stepConfigs.forEach((stepConfig: any) => {
            if (stepConfig.id && stepConfig.settings) {
              configManager.updateStepSetting(stepConfig.id, stepConfig.settings);
            }
          });
        }
        jsonRes(res, { success: true, message: '閰嶇疆淇濆瓨鎴愬姛' });
      } catch (error) {
        console.error('[ConfigAPI] 淇濆瓨閰嶇疆澶辫触:', error);
        jsonRes(res, { success: false, error: '淇濆瓨閰嶇疆澶辫触' }, 500);
      }
      return true;
    }

    // 鏇存柊鍗曚釜姝ラ閰嶇疆
    if (path === '/api/novel/config/step' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { stepId, settings } = body;
        if (stepId && settings) {
          configManager.updateStepSetting(stepId, settings);
        }
        jsonRes(res, { success: true, message: '姝ラ閰嶇疆鏇存柊鎴愬姛' });
      } catch (error) {
        console.error('[ConfigAPI] 鏇存柊姝ラ閰嶇疆澶辫触:', error);
        jsonRes(res, { success: false, error: '鏇存柊姝ラ閰嶇疆澶辫触' }, 500);
      }
      return true;
    }

    // 鏇存柊鍏ㄥ眬閰嶇疆
    if (path === '/api/novel/config/global' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { global } = body;
        if (global) {
          configManager.updateGlobalSetting(global);
        }
        jsonRes(res, { success: true, message: '鍏ㄥ眬閰嶇疆鏇存柊鎴愬姛' });
      } catch (error) {
        console.error('[ConfigAPI] 鏇存柊鍏ㄥ眬閰嶇疆澶辫触:', error);
        jsonRes(res, { success: false, error: '鏇存柊鍏ㄥ眬閰嶇疆澶辫触' }, 500);
      }
      return true;
    }

    // 閲嶇疆閰嶇疆
    if (path === '/api/novel/config/reset' && method === 'POST') {
      try {
        configManager.resetToDefaults();
        jsonRes(res, { success: true, message: '閰嶇疆宸查噸缃负榛樿鍊? });
      } catch (error) {
        console.error('[ConfigAPI] 閲嶇疆閰嶇疆澶辫触:', error);
        jsonRes(res, { success: false, error: '閲嶇疆閰嶇疆澶辫触' }, 500);
      }
      return true;
    }

    // ====== 鐣寗鍙戝竷API ======
    // 鍙戝竷绔犺妭
    if (path === '/api/novel/publish' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, headless = true, dryRun = false } = body;
        
        if (!workId) {
          jsonRes(res, { success: false, error: '缂哄皯蹇呰鍙傛暟锛歸orkId' }, 400);
          return true;
        }

        console.log('[PublishAPI] 鍚姩鐣寗鍙戝竷, workId:', workId, 'chapterNumber:', chapterNumber);

        // 鍒涘缓鐣寗鍙戝竷娴佹按绾?        const pipeline = new FanqieSimplePipeline();
        
        // 鐢熸垚 progressId锛堝彲閫夛級
        const progressId = body.progressId || `publish_${Date.now()}`;
        
        // 寮傛鎵ц鍙戝竷
        pipeline.publishToFanqie({
          workId: parseInt(workId as string, 10),
          chapterNumber: chapterNumber ? parseInt(chapterNumber as string, 10) : undefined,
          headless,
          dryRun,
          onProgress: (event) => {
            console.log('[PublishAPI] 杩涘害:', event.stepLabel, event.task, `${event.percent}%`);
            // 杩欓噷鍙互娣诲姞 SSE 骞挎挱
          }
        }).then((results) => {
          const successCount = results.filter(r => r.success).length;
          console.log(`[PublishAPI] 鍙戝竷瀹屾垚: 鎴愬姛 ${successCount}/${results.length}`);
        }).catch((error) => {
          console.error('[PublishAPI] 鍙戝竷澶辫触:', error);
        });

        jsonRes(res, { 
          success: true, 
          message: '鍙戝竷浠诲姟宸插惎鍔?, 
          progressId,
          note: '鍙戝竷浠诲姟姝ｅ湪鍚庡彴鎵ц涓?
        });
      } catch (error) {
        console.error('[PublishAPI] 鍙戝竷澶辫触:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '鍙戝竷澶辫触' }, 500);
      }
      return true;
    }

    // 鑾峰彇浣滃搧鍒楄〃锛堢敤浜庡彂甯冮€夋嫨锛?    if (path === '/api/novel/publish/works' && method === 'GET') {
      try {
        const service = getNovelService();
        const works = await service.getWorks();
        jsonRes(res, { success: true, data: works });
      } catch (error) {
        console.error('[PublishAPI] 鑾峰彇浣滃搧鍒楄〃澶辫触:', error);
        jsonRes(res, { success: false, error: '鑾峰彇浣滃搧鍒楄〃澶辫触' }, 500);
      }
      return true;
    }

    // 鑾峰彇浣滃搧绔犺妭鍒楄〃
    const chaptersMatch = path.match(/^\/api\/novel\/publish\/works\/(\d+)\/chapters$/);
    if (chaptersMatch && method === 'GET') {
      try {
        const workId = parseInt(chaptersMatch[1], 10);
        const service = getNovelService();
        const chapters = await service.getChaptersByWorkId(workId);
        jsonRes(res, { success: true, data: chapters });
      } catch (error) {
        console.error('[PublishAPI] 鑾峰彇绔犺妭鍒楄〃澶辫触:', error);
        jsonRes(res, { success: false, error: '鑾峰彇绔犺妭鍒楄〃澶辫触' }, 500);
      }
      return true;
    }

    // ====== 鏂囨湰娑﹁壊API锛堜紭鍖栫増锛?======
    // 浠庢暟鎹簱璇诲彇绔犺妭鍐呭骞舵鼎鑹?    if (path === '/api/novel/polish/from-db' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, settings } = body;
        
        if (!workId || !chapterNumber) {
          jsonRes(res, { success: false, error: '缂哄皯蹇呰鍙傛暟锛歸orkId, chapterNumber' }, 400);
          return true;
        }

        console.log('[PolishAPI] 浠庢暟鎹簱璇诲彇骞舵鼎鑹诧紝workId:', workId, 'chapter:', chapterNumber);

        // 1. 浠庢暟鎹簱璇诲彇绔犺妭鍐呭
        const db = getDatabaseManager();
        const chapter = await db.queryOne(
          'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?', 
          [workId, chapterNumber]
        );
        
        if (!chapter || !chapter.content) {
          jsonRes(res, { success: false, error: '鏈壘鍒扮珷鑺傚唴瀹? }, 404);
          return true;
        }

        // 2. 浣跨敤 PolishPipeline 娑﹁壊
        const polishPipeline = new PolishPipeline();
        const result = await polishPipeline.execute({
          text: chapter.content,
          settings: settings || configManager.getSettings()
        }, (progress) => {
          console.log(`[PolishAPI] [杩涘害] ${progress.currentStep || 'processing'}: ${progress.message} (${progress.progress}%)`);
        });

        // 3. 淇濆瓨娑﹁壊鍚庣殑鍐呭骞舵洿鏂扮姸鎬?        if (result.text) {
          const wordCount = result.text.length;
          await db.execute(
            'UPDATE chapters SET content = ?, word_count = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [result.text, wordCount, 'polished', chapter.id]
          );
        }
        
        jsonRes(res, { 
          success: true, 
          data: result 
        });
      } catch (error) {
        console.error('[PolishAPI] 娑﹁壊澶辫触:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '娑﹁壊澶辫触' }, 500);
      }
      return true;
    }

    // ====== 鏂囨湰鐢熸垚API锛堜粎淇濈暀鏍稿績绔偣锛?======
    // 浠庢暟鎹簱鐢熸垚鏂囨湰锛堝畬鏁存祦绋嬶細鐢熸垚 + 娑﹁壊锛?    if (path === '/api/novel/generation/generate-from-db' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, relatedChapterCount = 2, settings } = body;
        
        if (!workId || !chapterNumber) {
          jsonRes(res, { success: false, error: '缂哄皯蹇呰鍙傛暟锛歸orkId, chapterNumber' }, 400);
          return true;
        }

        console.log('[GenerationAPI] 浠庢暟鎹簱鐢熸垚锛寃orkId:', workId, 'chapter:', chapterNumber);

        const generator = new GenerationPipeline();
        const result = await generator.generateFromDatabase({
          workId,
          chapterNumber,
          relatedChapterCount,
          settings
        }, (progress) => {
          console.log(`[GenerationAPI] [杩涘害] ${progress.phase || 'generating'}: ${progress.message} (${progress.progress}%)`);
        });

        // 淇濆瓨鐢熸垚鍚庣殑鍐呭骞舵洿鏂扮姸鎬?        if (result.finalText) {
          // 鍏堣幏鍙栫珷鑺侷D
          const db = getDatabaseManager();
          const chapter = await db.queryOne(
            'SELECT * FROM chapters WHERE work_id = ? AND chapter_number = ?', 
            [workId, chapterNumber]
          );
          if (chapter) {
            const wordCount = result.finalText.length;
            await db.execute(
              'UPDATE chapters SET content = ?, word_count = ?, status = ?, updated_at = NOW() WHERE id = ?',
              [result.finalText, wordCount, 'polished', chapter.id]
            );
          }
        }
        
        jsonRes(res, { 
          success: true, 
          data: result 
        });
      } catch (error) {
        console.error('[GenerationAPI] 浠庢暟鎹簱鐢熸垚澶辫触:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '鐢熸垚澶辫触' }, 500);
      }
      return true;
    }

    // 娴嬭瘯娴忚鍣紙鎴浘鐗堟湰锛?    if (path === '/api/novel/test-browser' && method === 'POST') {
      try {
        console.log('[NovelManager] 娴嬭瘯娴忚鍣紙鎴浘鐗堟湰锛?..');
        const result = await getNovelService().testBrowser();
        jsonRes(res, result);
      } catch (error: any) {
        console.error('[NovelManager] 娴嬭瘯娴忚鍣ㄩ敊璇?', error);
        jsonRes(res, { success: false, message: error.message });
      }
      return true;
    }

    // 鎻愪緵鎴浘鏂囦欢
    const screenshotMatch = path.match(/^\/api\/novel\/screenshot\/(.+)$/);
    if (screenshotMatch && method === 'GET') {
      const filename = screenshotMatch[1];
      const screenshotPath = require('path').join(getScreenshotDir(), filename);
      
      if (fs.existsSync(screenshotPath)) {
        const content = fs.readFileSync(screenshotPath);
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': content.length
        });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end();
      }
      return true;
    }

    // 缁熻鏁版嵁
    if (path === '/api/novel/stats' && method === 'GET') {
      const stats = await getNovelService().getStats();
      jsonRes(res, { success: true, data: stats });
      return true;
    }

    // 浣滃搧鍒楄〃
    if (path === '/api/novel/works' && method === 'GET') {
      const filter = {
        status: query.status,
        platform: query.platform,
        search: query.search,
      };
      const works = await getNovelService().getWorks(filter);
      jsonRes(res, { success: true, data: works });
      return true;
    }

    // 浣滃搧璇︽儏
    const workDetailMatch = path.match(/^\/api\/novel\/works\/(\d+)$/);
    if (workDetailMatch && method === 'GET') {
      const id = parseInt(workDetailMatch[1]);
      const work = await getNovelService().getWorkById(id);
      if (!work) {
        jsonRes(res, { success: false, error: '浣滃搧涓嶅瓨鍦? }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: work });
      return true;
    }

    // 鍒犻櫎浣滃搧
    if (workDetailMatch && method === 'DELETE') {
      const id = parseInt(workDetailMatch[1]);
      await getNovelService().deleteWork(id);
      jsonRes(res, { success: true });
      return true;
    }

    // 鏇存柊浣滃搧
    if (workDetailMatch && method === 'PUT') {
      const id = parseInt(workDetailMatch[1]);
      const body = await parseBody(req);
      await getNovelService().updateWork(id, body);
      jsonRes(res, { success: true });
      return true;
    }

    // 绔犺妭璇︽儏
    const chapterMatch = path.match(/^\/api\/novel\/chapters\/(\d+)$/);
    if (chapterMatch && method === 'GET') {
      const id = parseInt(chapterMatch[1]);
      const chapter = await getNovelService().getChapterById(id);
      jsonRes(res, { success: true, data: chapter });
      return true;
    }

    // 鏇存柊绔犺妭
    if (chapterMatch && method === 'PUT') {
      const id = parseInt(chapterMatch[1]);
      const body = await parseBody(req);
      await getNovelService().updateChapter(id, body);
      jsonRes(res, { success: true });
      return true;
    }

    // 璋冭瘯锛氭鏌ョ珷鑺傚唴瀹?    const debugChapterMatch = path.match(/^\/api\/novel\/debug\/chapter\/(\d+)\/(\d+)$/);
    if (debugChapterMatch && method === 'GET') {
      const workId = parseInt(debugChapterMatch[1]);
      const chapterNumber = parseInt(debugChapterMatch[2]);
      const result = await getNovelService().debugChapter(workId, chapterNumber);
      jsonRes(res, { success: true, data: result });
      return true;
    }

    // 璋冭瘯锛氭祴璇曞緟鍙戝竷绔犺妭鏌ヨ
    const debugPendingMatch = path.match(/^\/api\/novel\/debug\/pending\/(\d+)\/(\d+)-(\d+)$/);
    if (debugPendingMatch && method === 'GET') {
      const workId = parseInt(debugPendingMatch[1]);
      const startChapter = parseInt(debugPendingMatch[2]);
      const endChapter = parseInt(debugPendingMatch[3]);
      const result = await getNovelService().debugPendingChapters(workId, startChapter, endChapter);
      jsonRes(res, { success: true, data: result });
      return true;
    }

    // 绔犺妭鍒楄〃锛堟寜浣滃搧ID锛?    const chaptersByWorkMatch = path.match(/^\/api\/novel\/works\/(\d+)\/chapters$/);
    if (chaptersByWorkMatch && method === 'GET') {
      const workId = parseInt(chaptersByWorkMatch[1]);
      const chapters = await getNovelService().getChaptersByWorkId(workId);
      jsonRes(res, { success: true, data: chapters });
      return true;
    }

    // 瑙掕壊鍒楄〃
    const charactersByWorkMatch = path.match(/^\/api\/novel\/works\/(\d+)\/characters$/);
    if (charactersByWorkMatch && method === 'GET') {
      const workId = parseInt(charactersByWorkMatch[1]);
      const characters = await getNovelService().getCharactersByWorkId(workId);
      jsonRes(res, { success: true, data: characters });
      return true;
    }

    // 鏍规嵁鍗风翰鐢熸垚绔犺妭
    const generateChaptersMatch = path.match(/^\/api\/novel\/works\/(\d+)\/generate-chapters-from-volumes$/);
    if (generateChaptersMatch && method === 'POST') {
      const id = parseInt(generateChaptersMatch[1]);
      const result = await getNovelService().generateChaptersFromVolumes(id);
      jsonRes(res, { success: true, ...result });
      return true;
    }

    // 鐣寗浣滃搧鍒楄〃
    if (path === '/api/novel/fanqie/works' && method === 'GET') {
      const works = await getNovelService().getFanqieWorks();
      jsonRes(res, { success: true, data: works });
      return true;
    }

    // 鐣寗浣滃搧鍒楄〃锛堟寜璐﹀彿锛?    const fanqieWorksByAccountMatch = path.match(/^\/api\/novel\/fanqie\/works\/([^/]+)$/);
    if (fanqieWorksByAccountMatch && method === 'GET') {
      const accountId = parseInt(fanqieWorksByAccountMatch[1], 10) || 0;
      const works = await getNovelService().getFanqieWorksByAccount(accountId);
      jsonRes(res, { success: true, data: works });
      return true;
    }

    // 鐣寗鎵弿
    if (path === '/api/novel/fanqie/scan' && method === 'POST') {
      const body = await parseBody(req);
      const result = await getNovelService().scanFanqieWorks(body.accountId);
      jsonRes(res, { success: true, data: result });
      return true;
    }

    // 鐣寗鍙戝竷锛堟殏鏃剁鐢級
    /*
    if (path === '/api/novel/fanqie/publish' && method === 'POST') {
      const body = await parseBody(req);
      const result = await getNovelService().startFanqiePublish(body);
      jsonRes(res, { success: true, message: result.message, note: result.note });
      return true;
    }
    */

    // 缂撳瓨鏂囦欢鍒楄〃
    if (path === '/api/novel/cache/files' && method === 'GET') {
      const files = await getNovelService().getCacheFiles();
      jsonRes(res, { success: true, data: files });
      return true;
    }

    // 鑾峰彇缂撳瓨鏂囦欢鍐呭
    const cacheFileMatch = path.match(/^\/api\/novel\/cache\/files\/([^/]+)$/);
    if (cacheFileMatch && method === 'GET') {
      const content = await getNovelService().getCacheFileContent(cacheFileMatch[1]);
      jsonRes(res, { success: true, data: content });
      return true;
    }

    // 淇濆瓨缂撳瓨鏂囦欢
    if (cacheFileMatch && method === 'PUT') {
      const body = await parseBody(req);
      await getNovelService().saveCacheFileContent(cacheFileMatch[1], body.content);
      jsonRes(res, { success: true });
      return true;
    }

    // ====== 鐣寗璐﹀彿鐩稿叧API ======
    if (path === '/api/novel/fanqie/accounts' && method === 'GET') {
      const config = getConfig();
      const accounts = config.scheduler.fanqieAccounts || [];
      jsonRes(res, { success: true, data: accounts });
      return true;
    }

    // ====== 娴佹按绾跨浉鍏矨PI ======
    if (path === '/api/novel/pipeline/start' && method === 'POST') {
      const body = await parseBody(req);
      const result = await getNovelService().startPipeline({
        workId: body.workId,
        accountId: body.accountId,
        dryRun: body.dryRun
      });
      jsonRes(res, result);
      return true;
    }

    if (path === '/api/novel/pipeline/stop' && method === 'POST') {
      const result = await getNovelService().stopPipeline();
      jsonRes(res, result);
      return true;
    }

    if (path === '/api/novel/pipeline/status' && method === 'GET') {
      const status = await getNovelService().getPipelineStatus();
      jsonRes(res, { success: true, data: status });
      return true;
    }

    // ==================== ContentCraft 鑷姩澶勭悊鏈嶅姟 API ====================
    // 鑾峰彇鑷姩澶勭悊鏈嶅姟鐘舵€?    if (path === '/api/novel/content-craft-auto/status' && method === 'GET') {
      try {
        const autoService = getContentCraftAutoService();
        const status = autoService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鑾峰彇鑷姩澶勭悊鏈嶅姟閰嶇疆
    if (path === '/api/novel/content-craft-auto/config' && method === 'GET') {
      try {
        const autoService = getContentCraftAutoService();
        const config = autoService.getConfig();
        jsonRes(res, { success: true, data: config });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鏇存柊鑷姩澶勭悊鏈嶅姟閰嶇疆
    if (path === '/api/novel/content-craft-auto/config' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const autoService = getContentCraftAutoService();
        autoService.updateConfig(body);
        const config = autoService.getConfig();
        const status = autoService.getStatus();
        jsonRes(res, { success: true, data: { config, status } });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍚姩鑷姩澶勭悊鏈嶅姟
    if (path === '/api/novel/content-craft-auto/start' && method === 'POST') {
      try {
        const autoService = getContentCraftAutoService();
        autoService.start();
        const status = autoService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍋滄鑷姩澶勭悊鏈嶅姟
    if (path === '/api/novel/content-craft-auto/stop' && method === 'POST') {
      try {
        const autoService = getContentCraftAutoService();
        autoService.stop();
        const status = autoService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ==================== 瀹℃牳鑷姩澶勭悊鏈嶅姟 API ====================
    // 鑾峰彇瀹℃牳鑷姩澶勭悊鏈嶅姟鐘舵€?    if (path === '/api/novel/audit-auto/status' && method === 'GET') {
      try {
        const auditAutoService = getAuditAutoService();
        const status = auditAutoService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鑾峰彇瀹℃牳鑷姩澶勭悊鏈嶅姟閰嶇疆
    if (path === '/api/novel/audit-auto/config' && method === 'GET') {
      try {
        const auditAutoService = getAuditAutoService();
        const config = auditAutoService.getConfig();
        jsonRes(res, { success: true, data: config });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鏇存柊瀹℃牳鑷姩澶勭悊鏈嶅姟閰嶇疆
    if (path === '/api/novel/audit-auto/config' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const auditAutoService = getAuditAutoService();
        auditAutoService.updateConfig(body);
        const config = auditAutoService.getConfig();
        const status = auditAutoService.getStatus();
        jsonRes(res, { success: true, data: { config, status } });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍚姩瀹℃牳鑷姩澶勭悊鏈嶅姟
    if (path === '/api/novel/audit-auto/start' && method === 'POST') {
      try {
        const auditAutoService = getAuditAutoService();
        auditAutoService.start();
        const status = auditAutoService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍋滄瀹℃牳鑷姩澶勭悊鏈嶅姟
    if (path === '/api/novel/audit-auto/stop' && method === 'POST') {
      try {
        const auditAutoService = getAuditAutoService();
        auditAutoService.stop();
        const status = auditAutoService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ==================== 鏁呬簨鐘舵€佺鐞?API ====================
    // 鑾峰彇浣滃搧鐨勫畬鏁存晠浜嬬姸鎬?    const storyStateMatch = path.match(/^\/api\/novel\/story-state\/works\/(\d+)$/);
    if (storyStateMatch && method === 'GET') {
      try {
        const workId = parseInt(storyStateMatch[1], 10);
        const storyStateManager = getStoryStateManager();
        await storyStateManager.initTables();
        const state = await storyStateManager.getStoryState(workId);
        jsonRes(res, { success: true, data: state });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鑾峰彇鏁呬簨鐘舵€佹憳瑕侊紙鐢ㄤ簬鐢熸垚涓婁笅鏂囷級
    if (storyStateMatch && path.includes('/summary') && method === 'GET') {
      try {
        const workId = parseInt(storyStateMatch[1], 10);
        const currentChapter = parseInt(query.currentChapter || '1', 10);
        const storyStateManager = getStoryStateManager();
        await storyStateManager.initTables();
        const summary = await storyStateManager.getContextSummary(workId, currentChapter);
        jsonRes(res, { success: true, data: { summary } });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 浠庣珷鑺傚唴瀹逛腑鎻愬彇骞舵洿鏂版晠浜嬬姸鎬?    if (path === '/api/novel/story-state/extract' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, content } = body;
        if (!workId || !chapterNumber || !content) {
          jsonRes(res, { success: false, error: '缂哄皯蹇呰鍙傛暟: workId, chapterNumber, content' }, 400);
          return true;
        }
        const storyStateManager = getStoryStateManager();
        await storyStateManager.initTables();
        await storyStateManager.extractAndUpdateState(workId, chapterNumber, content);
        jsonRes(res, { success: true, message: '鏁呬簨鐘舵€佸凡鏇存柊' });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ==================== 涓€鑷存€ф鏌?API ====================
    // 鐢熸垚鍓嶆鏌?    if (path === '/api/novel/consistency/pre-check' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, chapterOutline } = body;
        if (!workId || !chapterNumber) {
          jsonRes(res, { success: false, error: '缂哄皯蹇呰鍙傛暟: workId, chapterNumber' }, 400);
          return true;
        }
        const consistencyChecker = getConsistencyChecker();
        const report = await consistencyChecker.preGenerationCheck(workId, chapterNumber, chapterOutline);
        jsonRes(res, { success: true, data: report });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鐢熸垚鍚庨獙璇?    if (path === '/api/novel/consistency/post-validate' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { workId, chapterNumber, content } = body;
        if (!workId || !chapterNumber || !content) {
          jsonRes(res, { success: false, error: '缂哄皯蹇呰鍙傛暟: workId, chapterNumber, content' }, 400);
          return true;
        }
        const consistencyChecker = getConsistencyChecker();
        const report = await consistencyChecker.postGenerationValidate(workId, chapterNumber, content);
        jsonRes(res, { success: true, data: report });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ==================== 鏅鸿兘璋冨害鍣?API ====================
    // 鑾峰彇鏅鸿兘璋冨害鍣ㄧ姸鎬?    if (path === '/api/novel/smart-scheduler/status' && method === 'GET') {
      try {
        const scheduler = getSmartScheduler();
        const status = scheduler.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍚姩鏅鸿兘璋冨害鍣?    if (path === '/api/novel/smart-scheduler/start' && method === 'POST') {
      try {
        const scheduler = getSmartScheduler();
        scheduler.start();
        const status = scheduler.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍋滄鏅鸿兘璋冨害鍣?    if (path === '/api/novel/smart-scheduler/stop' && method === 'POST') {
      try {
        const scheduler = getSmartScheduler();
        scheduler.stop();
        const status = scheduler.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ==================== 鍙戝竷鑷姩鏈嶅姟 API ====================
    // 鑾峰彇鍙戝竷鑷姩鏈嶅姟鐘舵€?    if (path === '/api/novel/publish-auto/status' && method === 'GET') {
      try {
        const publishService = getPublishAutoService();
        const status = publishService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍚姩鍙戝竷鑷姩鏈嶅姟
    if (path === '/api/novel/publish-auto/start' && method === 'POST') {
      try {
        const publishService = getPublishAutoService();
        publishService.start();
        const status = publishService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鍋滄鍙戝竷鑷姩鏈嶅姟
    if (path === '/api/novel/publish-auto/stop' && method === 'POST') {
      try {
        const publishService = getPublishAutoService();
        publishService.stop();
        const status = publishService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鑾峰彇鍙戝竷鑷姩鏈嶅姟閰嶇疆
    if (path === '/api/novel/publish-auto/config' && method === 'GET') {
      try {
        const publishService = getPublishAutoService();
        const config = publishService.getConfig();
        jsonRes(res, { success: true, data: config });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 鏇存柊鍙戝竷鑷姩鏈嶅姟閰嶇疆
    if (path === '/api/novel/publish-auto/config' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const publishService = getPublishAutoService();
        publishService.updateConfig(body);
        const config = publishService.getConfig();
        jsonRes(res, { success: true, data: config });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 娓呴櫎鍙戝竷鑷姩鏈嶅姟鐨勪笉瀛樺湪浣滃搧缂撳瓨
    if (path === '/api/novel/publish-auto/clear-cache' && method === 'POST') {
      try {
        const publishService = getPublishAutoService();
        publishService.clearMissingWorksCache();
        const status = publishService.getStatus();
        jsonRes(res, { success: true, data: status });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ==================== 娲诲姩鏃ュ織 API ====================
    // 鑾峰彇娲诲姩鏃ュ織
    if (path === '/api/novel/activity-log' && method === 'GET') {
      try {
        const activityLog = getActivityLog();
        const logs = activityLog.getRecentLogs(parseInt(query.limit as string) || 50).map((log: any, index: number) => {
          if (typeof log.id === 'number' && Number.isFinite(log.id)) {
            return log;
          }

          const source = typeof log.id === 'string' && log.id
            ? log.id
            : `${log.timestamp || ''}-${log.type || 'log'}-${index}`;

          let hash = 0;
          for (let i = 0; i < source.length; i++) {
            hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
          }

          return {
            ...log,
            id: Math.abs(hash) + 1000000 + index
          };
        });
        jsonRes(res, { success: true, data: logs });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // 娓呯┖娲诲姩鏃ュ織
    if (path === '/api/novel/activity-log/clear' && method === 'POST') {
      try {
        const activityLog = getActivityLog();
        activityLog.clear();
        jsonRes(res, { success: true });
      } catch (e: any) {
        jsonRes(res, { success: false, error: e.message }, 500);
      }
      return true;
    }

    // ====== 璧勬簮搴撶浉鍏矨PI ======
    // 璧勬簮搴擄細璇嶆眹琛?    if (path === '/api/novel/main-library' && method === 'GET') {
      const db = getDatabaseManager();
      const rows = await db.query(`
        SELECT 
          id,
          content,
          category,
          tags,
          note,
          created_at,
          updated_at
        FROM vocabulary
        ORDER BY content ASC
      `);
      jsonRes(res, { success: true, items: rows });
      return true;
    }

    // 璧勬簮搴擄細鏂囩尞
    if (path === '/api/novel/literature' && method === 'GET') {
      const db = getDatabaseManager();
      const rows = await db.query(`
        SELECT 
          id,
          title,
          author,
          tags,
          note,
          content,
          priority,
          created_at,
          updated_at
        FROM literature
        ORDER BY title ASC
      `);
      jsonRes(res, { success: true, items: rows });
      return true;
    }

    // ====== 鐘舵€佹満鐩稿叧API ======
    // 鑾峰彇鐘舵€佺粺璁?    if (path === '/api/novel/state-machine/stats' && method === 'GET') {
      const db = getDatabaseManager();
      try {
        // 鐩存帴缁熻鍚勭姸鎬佺殑绔犺妭鏁?        const rows = await db.query(`
          SELECT 
            status,
            COUNT(*) as count
          FROM chapters
          GROUP BY status
        `);
        
        // 杞崲涓哄璞?        const stats = {
          outline: 0,
          first_draft: 0,
          polished: 0,
          audited: 0,
          published: 0
        };
        
        rows.forEach(row => {
          if (row.status && stats.hasOwnProperty(row.status)) {
            stats[row.status] = row.count;
          }
        });
        
        jsonRes(res, { success: true, data: stats });
      } catch (error) {
        console.error('[StateMachineAPI] 鑾峰彇鐘舵€佺粺璁″け璐?', error);
        jsonRes(res, { success: false, error: error.message });
      }
      return true;
    }
    
    // 璇婃柇鍜屼慨澶嶇珷鑺傜姸鎬?    if (path === '/api/novel/state-machine/diagnose-and-fix' && method === 'POST') {
      const db = getDatabaseManager();
      const { getChapterStateMachine } = require('../core/state-machine/ChapterStateMachine');
      const stateMachine = getChapterStateMachine();
      
      try {
        console.log('[StateMachineAPI] 寮€濮嬭瘖鏂拰淇绔犺妭鐘舵€?..');
        
        // 1. 鑾峰彇鎵€鏈夌珷鑺傦紙灏濊瘯鑾峰彇 polish_info 瀛楁锛屽鏋滀笉瀛樺湪鍒欎笉鑾峰彇锛?        let allChapters;
        try {
          allChapters = await db.query(`
            SELECT id, work_id, chapter_number, title, content, word_count, status, polish_info
            FROM chapters
            ORDER BY work_id, chapter_number
          `);
        } catch (e) {
          // polish_info 瀛楁涓嶅瓨鍦紝鍙幏鍙栧熀纭€瀛楁
          console.log('[StateMachineAPI] polish_info 瀛楁涓嶅瓨鍦紝浣跨敤鍩虹瀛楁');
          allChapters = await db.query(`
            SELECT id, work_id, chapter_number, title, content, word_count, status
            FROM chapters
            ORDER BY work_id, chapter_number
          `);
        }
        
        console.log(`[StateMachineAPI] 鎵惧埌 ${allChapters.length} 涓珷鑺俙);
        
        const results = {
          total: allChapters.length,
          fixed: 0,
          noChange: 0,
          errors: 0,
          details: []
        };
        
        // 2. 閫愪釜璇婃柇鍜屼慨澶嶏紙浣跨敤涓ユ牸瑙勫垯锛岀‘淇?100% 瑕嗙洊锛?        for (const chapter of allChapters) {
          const originalStatus = chapter.status;
          let newStatus = originalStatus;
          let fixed = false;
          let error = null;
          
          try {
            // 鍚堟硶鐘舵€佸垪琛紙纭繚鎵€鏈夌珷鑺傞兘鍦ㄨ繖涓垪琛ㄤ腑锛?            const LEGAL_STATUSES = ['outline', 'first_draft', 'polished', 'audited', 'published'];
            
            // 瑙勫垯0锛氱‘淇濈姸鎬佸湪鍚堟硶鍒楄〃涓?            if (!LEGAL_STATUSES.includes(chapter.status)) {
              console.warn(`[StateMachineAPI] 绔犺妭 ${chapter.work_id}-${chapter.chapter_number} 鐘舵€佷笉鍦ㄥ悎娉曞垪琛? ${chapter.status}锛屽皢寮哄埗淇`);
            }
            
            // 涓ユ牸鍒ゆ柇锛氭槸鍚︽湁鍐呭
            const hasContent = !!(
              chapter.content && 
              typeof chapter.content === 'string' && 
              chapter.content.trim().length > 0 &&
              chapter.word_count && 
              chapter.word_count > 0
            );
            
            // 涓ユ牸鍒ゆ柇锛氭槸鍚︾粡杩囨鼎鑹叉祦绋?            let hasBeenPolished = false;
            try {
              if (chapter.polish_info) {
                const polishInfo = typeof chapter.polish_info === 'string' 
                  ? JSON.parse(chapter.polish_info) 
                  : chapter.polish_info;
                hasBeenPolished = !!(polishInfo && polishInfo.hasBeenPolished === true);
              }
            } catch (e) {
              // 瑙ｆ瀽澶辫触鎴栧瓧娈典笉瀛樺湪锛岃涓烘湭缁忚繃娑﹁壊
              hasBeenPolished = false;
            }
            
            // ========== 寮哄埗褰掑叆姝ｇ‘鐘舵€侊紙纭繚 100% 瑕嗙洊锛屾病鏈変换浣曠珷鑺備笉鍦ㄧ姸鎬佹満鑼冪暣鍐咃級==========
            
            // 鎯呭喌 A锛氭病鏈夊唴瀹?鈫?蹇呴』鏄?outline
            if (!hasContent) {
              if (chapter.status !== 'outline') {
                newStatus = 'outline';
                fixed = true;
                console.log(`[StateMachineAPI] 绔犺妭 ${chapter.work_id}-${chapter.chapter_number} 鏃犲唴瀹癸紝寮哄埗淇: ${originalStatus} 鈫?outline`);
              }
            }
            
            // 鎯呭喌 B锛氭湁鍐呭浣嗘湭缁忚繃娑﹁壊 鈫?蹇呴』鏄?first_draft
            else if (hasContent && !hasBeenPolished) {
              if (chapter.status !== 'first_draft') {
                newStatus = 'first_draft';
                fixed = true;
                console.log(`[StateMachineAPI] 绔犺妭 ${chapter.work_id}-${chapter.chapter_number} 鏈夊唴瀹逛絾鏈鼎鑹诧紝寮哄埗淇: ${originalStatus} 鈫?first_draft`);
              }
            }
            
            // 鎯呭喌 C锛氭湁鍐呭涓旂粡杩囨鼎鑹?鈫?蹇呴』鏄?polished/audited/published 涓殑涓€涓?            else if (hasContent && hasBeenPolished) {
              if (!['polished', 'audited', 'published'].includes(chapter.status)) {
                newStatus = 'polished'; // 榛樿褰掑埌 polished
                fixed = true;
                console.log(`[StateMachineAPI] 绔犺妭 ${chapter.work_id}-${chapter.chapter_number} 宸叉鼎鑹蹭絾鐘舵€佷笉姝ｇ‘锛屽己鍒朵慨姝? ${originalStatus} 鈫?polished`);
              }
            }
            
            // 濡傛灉闇€瑕佷慨澶嶏紝鎵ц鏇存柊
            if (fixed && newStatus !== originalStatus) {
              await db.execute(`
                UPDATE chapters SET status = ?, updated_at = NOW() WHERE id = ?
              `, [newStatus, chapter.id]);
              results.fixed++;
            } else {
              results.noChange++;
            }
            
            results.details.push({
              chapterId: chapter.id,
              workId: chapter.work_id,
              chapterNumber: chapter.chapter_number,
              originalStatus,
              newStatus,
              fixed,
              error
            });
            
          } catch (err) {
            results.errors++;
            error = err.message;
            console.error(`[StateMachineAPI] 澶勭悊绔犺妭 ${chapter.id} 澶辫触:`, err);
            results.details.push({
              chapterId: chapter.id,
              workId: chapter.work_id,
              chapterNumber: chapter.chapter_number,
              originalStatus: chapter.status,
              newStatus: chapter.status,
              fixed: false,
              error: err.message
            });
          }
        }
        
        console.log(`[StateMachineAPI] 璇婃柇鍜屼慨澶嶅畬鎴? 鎬昏 ${results.total}, 淇 ${results.fixed}, 淇濇寔 ${results.noChange}, 閿欒 ${results.errors}`);
        
        jsonRes(res, { success: true, data: results });
      } catch (error) {
        console.error('[StateMachineAPI] 璇婃柇鍜屼慨澶嶅け璐?', error);
        jsonRes(res, { success: false, error: error.message });
      }
      return true;
    }
    
    // 鑾峰彇鐘舵€佽浆鎹㈡棩蹇?    if (path === '/api/novel/state-machine/transitions' && method === 'GET') {
      const db = getDatabaseManager();
      try {
        // 灏濊瘯鏌ヨ state_transition_logs 琛?        const rows = await db.query(`
          SELECT 
            stl.*,
            w.title as workTitle
          FROM state_transition_logs stl
          LEFT JOIN works w ON stl.work_id = w.id
          ORDER BY stl.timestamp DESC
          LIMIT 50
        `);
        
        jsonRes(res, { success: true, data: rows });
      } catch (error) {
        // 琛ㄥ彲鑳戒笉瀛樺湪锛岃繑鍥炵┖鏁版嵁
        console.log('[StateMachineAPI] state_transition_logs 琛ㄥ彲鑳戒笉瀛樺湪');
        jsonRes(res, { success: true, data: [] });
      }
      return true;
    }

    // 璧勬簮搴擄細绂佺敤璇?    if (path === '/api/novel/banned-words' && method === 'GET') {
      const db = getDatabaseManager();
      const rows = await db.query(`
        SELECT 
          id,
          content,
          type,
          category,
          reason,
          alternative,
          created_at,
          updated_at
        FROM banned_words
        ORDER BY content ASC
      `);
      jsonRes(res, { success: true, items: rows });
      return true;
    }

    // ====== 鏌ョ湅鎵€鏈夌鐢ㄨ瘝鏁版嵁锛堣皟璇曠敤锛?=====
    if (path === '/api/novel/banned-words-debug' && method === 'GET') {
      try {
        const db = getDatabaseManager();
        const bannedWords = await db.query(`
          SELECT content AS word, alternative AS replacement, reason
          FROM banned_words
          ORDER BY content ASC
        `);
        jsonRes(res, { success: true, data: bannedWords, count: bannedWords.length });
        return true;
      } catch (error) {
        console.error('[BannedWordsDebug] Error:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '澶勭悊澶辫触' }, 500);
        return true;
      }
    }
    if (path === '/api/novel/banned-words-replace' && method === 'POST') {
      const body = await parseBody(req);
      const { text } = body;
      
      if (!text?.trim()) {
        jsonRes(res, { success: false, error: '璇锋彁渚涜澶勭悊鐨勬枃鏈? }, 400);
        return true;
      }
      
      try {
        const db = getDatabaseManager();
        const bannedWords = await db.query(`
          SELECT content AS word, alternative AS replacement, reason
          FROM banned_words
          ORDER BY content ASC
        `);

        const matchedBannedWords = bannedWords.filter((item: any) => {
          return typeof item.word === 'string' && item.word && text.includes(item.word);
        });

        if (matchedBannedWords.length === 0) {
          jsonRes(res, {
            success: true,
            data: {
              text,
              replacements: [],
              totalBannedWords: bannedWords.length,
              mode: 'noop'
            }
          });
          return true;
        }

        const fallbackResult = applyLiteralReplacements(text, matchedBannedWords, {
          source: 'MySQL绂佺敤璇嶅簱鏈湴鍏滃簳',
          defaultReason: '绂佺敤璇嶆湰鍦板厹搴曟浛鎹?
        });

        let resultText = fallbackResult.text;
        let replacements = fallbackResult.replacements;
        let mode = 'fallback';

        try {
          const { LLMClient, Config } = require('coze-coding-dev-sdk');
          if (LLMClient && Config) {
            const config = new Config();
            const client = new LLMClient(config);
            const systemPrompt = `浣犳槸涓€涓笓涓氱殑鏂囨湰娑﹁壊涓撳锛屼笓闂ㄥ鐞嗙鐢ㄨ瘝鏇挎崲浠诲姟銆?浠诲姟瑕佹眰锛?1. 缁欏畾涓€娈垫枃鏈拰绂佺敤璇嶅垪琛紝灏嗘枃鏈腑鐨勭鐢ㄨ瘝鏇挎崲涓哄悎閫傜殑璇嶃€?2. 鏇挎崲鍚庣殑鏂囨湰蹇呴』璇箟閫氶『銆佹祦鐣呫€佹棤姝т箟锛屽苟淇濇寔鍘熸剰銆?3. 绂佺敤璇嶅垪琛ㄥ涓嬶細
${matchedBannedWords.map((item: any) => `- ${item.word}`).join('\n')}

璇风洿鎺ヨ繑鍥炴浛鎹㈠悗鐨勫畬鏁存枃鏈紝涓嶈娣诲姞浠讳綍瑙ｉ噴鎴栬鏄庛€俙;
            const messages = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text }
            ];
            const response: any = await invokeLlmWithTimeout<any>(
              client.invoke(messages, {
                temperature: 0.3,
                model: 'doubao-seed-1-8-251228'
              }),
              15000
            );
            const llmText = typeof response?.content === 'string' ? response.content.trim() : '';
            if (llmText) {
              resultText = llmText;
              replacements = matchedBannedWords
                .filter((item: any) => text.includes(item.word) && !llmText.includes(item.word))
                .map((item: any) => ({
                  original: item.word,
                  replaced: item.replacement || '(鏅鸿兘鏇挎崲)',
                  reason: item.reason || '绂佺敤璇嶆浛鎹?,
                  source: 'MySQL绂佺敤璇嶅簱 + LLM鏅鸿兘鏇挎崲'
                }));
              mode = 'llm';
            }
          }
        } catch (llmError) {
          console.warn('[BannedWordsReplace] LLM unavailable, use fallback:', llmError);
        }
        
        jsonRes(res, { 
          success: true, 
          data: { 
            text: resultText, 
            replacements,
            totalBannedWords: bannedWords.length,
            mode
          } 
        });
        return true;
      } catch (error) {
        console.error('[BannedWordsReplace] Error:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '澶勭悊澶辫触' }, 500);
        return true;
      }
    }
    if (path === '/api/novel/preferred-words-replace' && method === 'POST') {
      const body = await parseBody(req);
      const { text } = body;
      
      if (!text?.trim()) {
        jsonRes(res, { success: false, error: '璇锋彁渚涜澶勭悊鐨勬枃鏈? }, 400);
        return true;
      }
      
      try {
        const db = getDatabaseManager();
        const vocabulary = await db.query(`
          SELECT content AS word, category, tags, note
          FROM vocabulary
          ORDER BY content ASC
        `);

        let resultText = text;
        const replacements: any[] = [];
        let mode = 'fallback-skip';

        try {
          const { LLMClient, Config } = require('coze-coding-dev-sdk');
          if (LLMClient && Config) {
            const config = new Config();
            const client = new LLMClient(config);
            const systemPrompt = `浣犳槸涓€涓笓涓氱殑涓枃鏂囨湰娑﹁壊涓撳锛屼笓闂ㄥ鐞嗕紭閫夎瘝鏇挎崲浠诲姟銆?浠诲姟瑕佹眰锛?1. 缁欏畾涓€娈垫枃鏈拰浼橀€夎瘝搴擄紝灏嗘枃鏈腑鐨勬櫘閫氳瘝姹囨櫤鑳芥浛鎹负鏇村悎閫傜殑浼橀€夎瘝銆?2. 鏇挎崲鍚庣殑鏂囨湰蹇呴』璇箟閫氶『銆佹祦鐣呫€佽嚜鐒讹紝骞朵繚鎸佸師鎰忋€?3. 浼橀€夎瘝搴撶ず渚嬪涓嬶細
${vocabulary.slice(0, 50).map((item: any) => `- ${item.word}`).join('\n')}

璇风洿鎺ヨ繑鍥炴浛鎹㈠悗鐨勫畬鏁存枃鏈紝涓嶈娣诲姞浠讳綍瑙ｉ噴鎴栬鏄庛€俙;
            const messages = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text }
            ];
            const response: any = await invokeLlmWithTimeout<any>(
              client.invoke(messages, {
                temperature: 0.5,
                model: 'doubao-seed-1-8-251228'
              }),
              15000
            );
            const llmText = typeof response?.content === 'string' ? response.content.trim() : '';
            if (llmText) {
              resultText = llmText;
              mode = 'llm';
              if (llmText !== text) {
                replacements.push({
                  original: '(鍘熸枃鏈?',
                  replaced: '(鏅鸿兘娑﹁壊)',
                  reason: '浼橀€夎瘝鏅鸿兘鏇挎崲',
                  source: 'MySQL浼橀€夎瘝搴?+ LLM鏅鸿兘璇勪及'
                });
              }
            }
          }
        } catch (llmError) {
          console.warn('[PreferredWordsReplace] LLM unavailable, keep original text:', llmError);
        }
        
        jsonRes(res, { 
          success: true, 
          data: { 
            text: resultText, 
            replacements,
            vocabularyCount: vocabulary.length,
            mode
          } 
        });
        return true;
      } catch (error) {
        console.error('[PreferredWordsReplace] Error:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '澶勭悊澶辫触' }, 500);
        return true;
      }
    }
    if (path === '/api/novel/full-long-text-test' && method === 'POST') {
      try {
        console.log('[FullLongTextTest] 寮€濮嬪畬鏁撮暱鏂囨湰娴嬭瘯...');
        
        const { PolishPipeline } = require('./core/content-craft/src/pipeline');
        const pipeline = new PolishPipeline();
        
        // 鐢熸垚鐪熷疄鐨勯暱鏂囨湰锛?0000+瀛楋級
        const generateLongText = () => {
          const paragraphs = [];
          
          // 绗?娈碉細鑳屾櫙浠嬬粛
          paragraphs.push(`鏄ユ棩鐨勯槼鍏夐€忚繃绐楁埛娲掕繘鎴块棿锛岃惤鍦ㄦ涓婇偅鏈帤鍘氱殑涔︿笂銆傝繖鏄竴涓櫘閫氱殑鍛ㄦ湯鏃╂櫒锛屽皬鏄庡潗鍦ㄤ功妗屽墠锛屾墜閲屾嬁鐫€绗旓紝鍗磋繜杩熸病鏈夊啓涓嬬涓€涓瓧銆備粬鐨勮剳娴烽噷娴幇鍑烘槰澶╁彂鐢熺殑浜嬫儏锛岄偅浜涚敾闈㈠儚鏄數褰变竴鏍峰湪鐪煎墠鍥炴斁銆?
  鏄ㄥぉ涓嬪崍锛屽皬鏄庡幓浜嗗浘涔﹂銆傚浘涔﹂閲屼汉寰堝锛屽ぇ瀹堕兘鍦ㄥ畨闈欏湴鐪嬩功鎴栬€呭涔犮€傚皬鏄庢壘鍒颁簡鑷繁鎯宠鐨勪功锛屾壘浜嗕竴涓潬绐楃殑浣嶇疆鍧愪笅銆傚氨鍦ㄤ粬鍑嗗寮€濮嬬湅涔︾殑鏃跺€欙紝涓€涓コ瀛╄蛋浜嗚繃鏉ワ紝闂粬鏃佽竟鐨勪綅缃槸鍚︽湁浜恒€傚皬鏄庢憞鎽囧ご锛屽コ瀛╀究鍧愪簡涓嬫潵銆?
  濂冲鎵嬮噷鎷跨潃涓€鏈叧浜庡ぉ鏂囧鐨勪功锛岀湅寰楀緢璁ょ湡銆傚皬鏄庡伔鍋峰湴鐪嬩簡濂瑰嚑鐪硷紝濂圭殑渚ц劯寰堝ソ鐪嬶紝闃冲厜娲掑湪濂圭殑澶村彂涓婏紝娉涚潃閲戣壊鐨勫厜鑺掋€傚皬鏄庣殑蹇冭烦绐佺劧鍔犲揩浜嗭紝浠栬刀绱т綆涓嬪ご锛屽亣瑁呯湅涔︼紝浣嗗叾瀹炰竴涓瓧涔熸病鐪嬭繘鍘汇€?
  杩囦簡涓€浼氬効锛屽コ瀛╀技涔庢敞鎰忓埌浜嗗皬鏄庣殑鐩厜锛屽ス杞繃澶存潵锛屽灏忔槑绗戜簡绗戙€傚皬鏄庣殑鑴镐竴涓嬪瓙绾簡锛屼粬璧剁揣浣庝笅澶达紝鍋囪鍦ㄤ功涓婂仛绗旇銆傚コ瀛╃湅鍒颁粬杩欎釜鏍峰瓙锛屽繊涓嶄綇绗戝嚭浜嗗０銆傚皬鏄庡惉鍒扮瑧澹帮紝鏇村姞涓嶅ソ鎰忔€濅簡锛屼粬鎭ㄤ笉寰楁壘涓湴缂濋捇杩涘幓銆?
  灏卞湪杩欎釜鏃跺€欙紝鍥句功棣嗙殑绠＄悊鍛樿蛋浜嗚繃鏉ワ紝鎻愰啋澶у淇濇寔瀹夐潤銆傚コ瀛╄刀绱ф浣忎簡绗戝０锛屽灏忔槑鍋氫簡涓鑴革紝鐒跺悗缁х画鐪嬩功銆傚皬鏄庝篃鏉句簡涓€鍙ｆ皵锛屼粬鎶捣澶达紝瀵瑰コ瀛╃瑧浜嗙瑧锛岀劧鍚庝篃寮€濮嬬湅涔︺€?
  浠庨偅浠ュ悗锛屽皬鏄庡拰濂冲缁忓父鍦ㄥ浘涔﹂瑙侀潰銆備粬浠湁鏃跺€欎細涓€璧疯璁轰功涓殑鍐呭锛屾湁鏃跺€欎細涓€璧峰幓鍥句功棣嗛檮杩戠殑鍜栧暋搴楀枬鍜栧暋銆傚皬鏄庡彂鐜板コ瀛╀笉浠呴暱寰楀ソ鐪嬶紝鑰屼笖寰堣仾鏄庯紝寰堟湁鎬濇兂銆備粬瓒婃潵瓒婂枩娆㈣繖涓コ瀛╀簡銆俙);
          
          // 绗?娈碉細鎯呰妭鍙戝睍
          paragraphs.push(`鏈変竴澶╋紝灏忔槑缁堜簬榧撹捣鍕囨皵锛岀害濂冲鍘荤湅鐢靛奖銆傚コ瀛╂鐒剁瓟搴斾簡銆傜數褰辨槸涓€閮ㄦ氮婕殑鐖辨儏鐗囷紝鐪嬬潃鐪嬬潃锛屽皬鏄庡繊涓嶄綇鍋峰伔鍦版彙浣忎簡濂冲鐨勬墜銆傚コ瀛╂病鏈夋嫆缁濓紝濂逛篃鎻′綇浜嗗皬鏄庣殑鎵嬨€傚皬鏄庣殑蹇冮噷鐢滄粙婊嬬殑锛屼粬瑙夊緱鑷繁鏄笘鐣屼笂鏈€骞哥鐨勪汉銆?
  鐢靛奖缁撴潫鍚庯紝灏忔槑鍜屽コ瀛╀竴璧疯蛋鍦ㄥ洖瀹剁殑璺笂銆傛湀鍏夋磼鍦ㄤ粬浠韩涓婏紝鏄惧緱鏍煎娴极銆傚皬鏄庡仠涓嬫潵锛岃浆杩囪韩鐪嬬潃濂冲锛岃鐪熷湴璇达細"鎴戝枩娆綘锛屼綘鎰挎剰鍋氭垜鐨勫コ鏈嬪弸鍚楋紵"濂冲鐪嬬潃灏忔槑锛岀溂鐫涢噷闂儊鐫€鍏夎姃锛屽ス鐐逛簡鐐瑰ご锛岃锛?鎴戞効鎰忋€?灏忔槑婵€鍔ㄥ緱鎶婂コ瀛╂姳浜嗚捣鏉ワ紝杞簡濂藉嚑涓湀銆?
  浠庨偅浠ュ悗锛屽皬鏄庡拰濂冲鎴愪簡涓€瀵规亱浜恒€備粬浠竴璧蜂笂瀛︼紝涓€璧峰悆楗紝涓€璧风湅鐢靛奖锛屼竴璧峰仛寰堝寰堝浜嬫儏銆傚皬鏄庤寰楄嚜宸辩殑鐢熸椿鍙樺緱瓒婃潵瓒婄編濂戒簡锛屼粬姣忓ぉ閮借繃寰楀緢寮€蹇冦€?
  鐒惰€岋紝濂芥櫙涓嶉暱銆傛湁涓€澶╋紝濂冲绐佺劧鍛婅瘔灏忔槑锛屽ス瑕佸幓鍥藉鐣欏浜嗐€傚皬鏄庡惉鍒拌繖涓秷鎭紝涓€涓嬪瓙鎰ｄ綇浜嗐€備粬闂コ瀛╋細"浣犺鍘诲涔咃紵"濂冲璇达細"澶ф涓ゅ勾銆?灏忔槑娌夐粯浜嗭紝浠栦笉鐭ラ亾璇ヨ浠€涔堛€?
  濂冲鐪嬪埌灏忔槑杩欎釜鏍峰瓙锛屽績閲屼篃寰堥毦杩囥€傚ス鎻′綇灏忔槑鐨勬墜锛岃锛?鎴戠煡閬撹繖瀵逛綘鏉ヨ寰堥毦鎺ュ彈锛屼絾杩欐槸涓€涓緢濂界殑鏈轰細锛屾垜涓嶆兂閿欒繃銆?灏忔槑鐐圭偣澶达紝璇达細"鎴戠悊瑙ｏ紝浣犲幓鍚э紝鎴戜細绛変綘鐨勩€?濂冲鎰熷姩寰楀摥浜嗭紝濂规姳浣忓皬鏄庯紝璇达細"璋㈣阿浣狅紝鎴戜竴瀹氫細鍥炴潵鐨勩€?`);
          
          // 绗?娈碉細绂诲埆鍜屾€濆康
          paragraphs.push(`绂诲埆鐨勬棩瀛愮粓浜庡埌浜嗐€傚皬鏄庡幓鏈哄満閫佸コ瀛┿€傚湪瀹夋鍙ｏ紝濂冲绱х揣鍦版姳浣忓皬鏄庯紝璇达細"鎴戜細鎯充綘鐨勶紝浣犱竴瀹氳濂藉ソ鐓ч【鑷繁銆?灏忔槑涔熸姳浣忓コ瀛╋紝璇达細"鎴戜篃浼氭兂浣犵殑锛屼綘鍦ㄥ浗澶栦篃瑕佸ソ濂界収椤捐嚜宸憋紝鏈変粈涔堜簨鎯呬竴瀹氳鍛婅瘔鎴戙€?濂冲鐐逛簡鐐瑰ご锛岀劧鍚庢澗寮€浜嗗皬鏄庯紝杞韩璧拌繘浜嗗畨妫€鍙ｃ€?
  灏忔槑绔欏湪瀹夋鍙ｅ锛岀湅鐫€濂冲鐨勮儗褰辨秷澶卞湪浜虹兢涓紝蹇冮噷绌鸿惤钀界殑銆備粬鎷垮嚭鎵嬫満锛岀粰濂冲鍙戜簡涓€鏉℃秷鎭細"涓€璺钩瀹夛紝鎴戠瓑浣犲洖鏉ャ€?杩囦簡涓€浼氬効锛屽コ瀛╁洖浜嗘秷鎭細"璋㈣阿浣狅紝鎴戝埌浜嗕細缁欎綘鎵撶數璇濈殑銆?

  浠庨偅浠ュ悗锛屽皬鏄庡拰濂冲姣忓ぉ閮戒細閫氱數璇濇垨鑰呰棰戣亰澶┿€備粬浠細鍒嗕韩褰兼鐨勭敓娲伙紝浼氬憡璇夊鏂硅嚜宸遍亣鍒扮殑鏈夎叮鐨勪簨鎯呫€傝櫧鐒剁浉闅斾竾閲岋紝浣嗕粬浠殑蹇冨嵈绱х揣鍦拌繛鍦ㄤ竴璧枫€?
  鐒惰€岋紝鏃堕棿涔呬簡锛屽皬鏄庡紑濮嬭寰楁湁浜涗笉瀹夈€備粬涓嶇煡閬撳コ瀛╁湪鍥藉浼氫笉浼氶亣鍒颁粈涔堝洶闅撅紝浼氫笉浼氶亣鍒板叾浠栫殑浜恒€備粬寮€濮嬪彉寰楀鐤戯紝缁忓父浼氶棶濂冲涓€浜涘鎬殑闂銆傚コ瀛╁垰寮€濮嬭繕浼氳€愬績鍦拌В閲婏紝浣嗘椂闂翠箙浜嗭紝濂逛篃寮€濮嬭寰楁湁浜涗笉鑰愮儲浜嗐€?
  鏈変竴澶╋紝灏忔槑鍜屽コ瀛╁張鍥犱负涓€浠跺皬浜嬪惖浜嗚捣鏉ャ€傚皬鏄庣敓姘斿湴鎸備簡鐢佃瘽锛岀劧鍚庢妸鎵嬫満鍏虫満浜嗐€備粬韬哄湪搴婁笂锛屽績閲岃秺鎯宠秺闅捐繃锛岃秺鎯宠秺鐢熸皵銆備粬瑙夊緱濂冲鍙樹簡锛屼笉鍐嶅儚浠ュ墠閭ｆ牱鐖变粬浜嗐€俙);
          
          // 绗?娈碉細杞姌鍜屽弽鎬?          paragraphs.push(`灏辫繖鏍疯繃浜嗕竴涓槦鏈燂紝灏忔槑娌℃湁鍜屽コ瀛╄仈绯汇€備粬姣忓ぉ閮借繃寰楀緢鐥涜嫤锛屽緢鍚庢倲銆備粬鐭ラ亾鑷繁涓嶅簲璇ラ偅鏍峰濂冲锛屼粬鎯崇粰濂冲鎵撶數璇濋亾姝夛紝浣嗗張鎷変笉涓嬭劯銆?
  鏈変竴澶╋紝灏忔槑鏀跺埌浜嗗コ瀛╃殑涓€灏侀偖浠躲€傞偖浠堕噷锛屽コ瀛╁啓浜嗗緢澶氬緢澶氳瘽銆傚ス璇村ス鍦ㄥ浗澶栬繃寰楀緢濂斤紝瀛︿範涔熷緢椤哄埄锛屼絾濂瑰緢鎯冲皬鏄庯紝寰堟兂浠栦滑鍦ㄤ竴璧风殑鏃ュ瓙銆傚ス璇村ス鐭ラ亾灏忔槑鏈€杩戝績鎯呬笉濂斤紝濂逛篃寰堢悊瑙ｏ紝浣嗗ス甯屾湜灏忔槑鑳界浉淇″ス锛岀浉淇′粬浠殑鎰熸儏銆傚ス璇村ス浼氫竴鐩寸埍鐫€灏忔槑锛岀洿鍒版案杩溿€?
  灏忔槑鐪嬪畬閭欢锛屽繊涓嶄綇鍝簡銆備粬鐭ラ亾鑷繁閿欎簡锛屼粬涓嶅簲璇ユ€€鐤戝コ瀛╋紝涓嶅簲璇ラ偅鏍峰濂广€備粬绔嬪埢缁欏コ瀛╂墦浜嗙數璇濓紝鐢佃瘽鎺ラ€氬悗锛屽皬鏄庣涓€鍙ヨ瘽灏辨槸锛?瀵逛笉璧凤紝鎴戦敊浜嗐€?濂冲鍦ㄧ數璇濋偅澶翠篃鍝簡锛屽ス璇达細"鎴戜篃瀵逛笉璧蜂綘锛屾垜搴旇澶氬叧蹇冧綘鐨勬劅鍙椼€?

  浠庨偅浠ュ悗锛屽皬鏄庡拰濂冲鐨勬劅鎯呭彉寰楁洿濂戒簡銆備粬浠洿鍔犱俊浠诲郊姝わ紝鏇村姞鐞嗚В褰兼銆備粬浠瘡澶╅兘浼氶€氱數璇濓紝閮戒細鍛婅瘔瀵规柟鑷繁鐨勭敓娲汇€傚皬鏄庝篃涓嶅啀澶氱枒浜嗭紝浠栫煡閬撳コ瀛╂槸鐖变粬鐨勶紝浠栦篃浼氫竴鐩寸埍鐫€濂冲銆俙);
          
          // 绗?娈碉細閲嶉€㈠拰缁撳眬
          paragraphs.push(`涓ゅ勾鐨勬椂闂村緢蹇氨杩囧幓浜嗐€傚皬鏄庣粓浜庣瓑鍒颁簡濂冲鍥炴潵鐨勯偅涓€澶┿€備粬鏃╂棭鍦板氨鏉ュ埌浜嗘満鍦猴紝鎵嬮噷鎷跨潃涓€鏉熺帿鐟拌姳锛岀瓑寰呯潃濂冲鐨勫嚭鐜般€?
  缁堜簬锛屼粬鐪嬪埌浜嗗コ瀛┿€傚コ瀛╂瘮浠ュ墠鏇存紓浜簡锛屼篃鏇存垚鐔熶簡銆傚ス鐪嬪埌灏忔槑锛屾縺鍔ㄥ緱璺戜簡杩囨潵锛屾墤杩涗簡灏忔槑鐨勬€€閲屻€傚皬鏄庣揣绱у湴鎶变綇濂冲锛岃锛?浣犵粓浜庡洖鏉ヤ簡锛屾垜濂芥兂浣犮€?濂冲涔熸姳浣忓皬鏄庯紝璇达細"鎴戜篃濂芥兂浣犮€?

  浠庨偅浠ュ悗锛屽皬鏄庡拰濂冲鍐嶄篃娌℃湁鍒嗗紑杩囥€備粬浠竴璧峰姫鍔涘伐浣滐紝涓€璧峰缓璁句粬浠殑鏈潵銆傚皬鏄庣煡閬擄紝浠栬繖杈堝瓙鏈€姝ｇ‘鐨勫喅瀹氬氨鏄瓑濂冲鍥炴潵锛岃€屽コ瀛╀篃鐭ラ亾锛屽ス杩欒緢瀛愭渶骞哥鐨勪簨鎯呭氨鏄亣鍒颁簡灏忔槑銆?
  浠栦滑鐨勭埍鎯呮晠浜嬶紝灏卞儚涓€閮ㄦ氮婕殑鐢靛奖锛屾湁娆㈢瑧锛屾湁娉按锛屾湁绂诲埆锛屾湁閲嶉€€備絾鏈€缁堬紝浠栦滑杩樻槸璧板埌浜嗕竴璧凤紝骞哥鍦扮敓娲荤潃銆?
  杩欎釜鏁呬簨鍛婅瘔鎴戜滑锛岀埍鎯呴渶瑕佷俊浠伙紝闇€瑕佺悊瑙ｏ紝闇€瑕佺瓑寰呫€傚彧瑕佷綘鐪熷績鐖辩潃瀵规柟锛屽彧瑕佷綘鎰挎剰涓哄鏂逛粯鍑猴紝閭ｄ箞锛屼綘浠殑鐖辨儏涓€瀹氫細鏈変竴涓編濂界殑缁撳眬銆俙);
          
          // 缁х画澧炲姞鍐呭锛岀洿鍒拌揪鍒?0000瀛?          for (let i = 0; i < 15; i++) {
            paragraphs.push(`鍦ㄨ繖涓笘鐣屼笂锛屾湁寰堝寰堝缇庡ソ鐨勪簨鎯呯瓑寰呯潃鎴戜滑鍘诲彂鐜帮紝鍘讳綋楠屻€傜敓娲诲氨鍍忎竴鐩掑阀鍏嬪姏锛屼綘姘歌繙涓嶇煡閬撲笅涓€棰楁槸浠€涔堝懗閬撱€備絾鏃犺閬囧埌浠€涔堬紝鎴戜滑閮藉簲璇ヤ繚鎸佷箰瑙傜殑蹇冩€侊紝鍕囨暍鍦伴潰瀵圭敓娲讳腑鐨勬寫鎴樸€?
    灏忔槑鍜屽コ瀛╃殑鏁呬簨杩樺湪缁х画銆備粬浠瘡澶╅兘杩囧緱寰堝厖瀹烇紝寰堝揩涔愩€傚皬鏄庡湪宸ヤ綔涓彇寰椾簡寰堝ぇ鐨勬垚灏憋紝鑰屽コ瀛╀篃鍦ㄨ嚜宸辩殑棰嗗煙閲屽仛鍑轰簡涓€鐣簨涓氥€備粬浠簰鐩告敮鎸侊紝浜掔浉榧撳姳锛屼竴璧锋垚闀匡紝涓€璧疯繘姝ャ€?
    鍛ㄦ湯鐨勬椂鍊欙紝浠栦滑浼氫竴璧峰幓鍏洯鏁ｆ锛屼竴璧峰幓鐪嬬數褰憋紝涓€璧峰幓瓒呭競涔拌彍锛屼竴璧峰湪瀹跺仛楗€備粬浠殑鐢熸椿铏界劧骞虫贰锛屼絾鍗村厖婊′簡骞哥銆?
    鏈夋椂鍊欙紝浠栦滑涔熶細鍚垫灦銆備絾姣忔鍚垫灦鍚庯紝浠栦滑閮戒細鍐烽潤涓嬫潵锛岃鐪熷湴娌熼€氾紝鎵惧嚭闂鐨勬牴婧愶紝鐒跺悗涓€璧疯В鍐抽棶棰樸€備粬浠煡閬擄紝鍚垫灦骞朵笉鍙€曪紝鍙€曠殑鏄惖鏋跺悗涓嶆矡閫氾紝涓嶈В鍐抽棶棰樸€?
    灏忔槑鍜屽コ瀛╃殑鏈嬪弸浠兘寰堢尽鎱曚粬浠殑鎰熸儏銆備粬浠粡甯歌锛屽皬鏄庡拰濂冲鏄粬浠杩囩殑鏈€鑸厤鐨勪竴瀵广€傚皬鏄庡拰濂冲鍚埌杩欎簺璇濓紝蹇冮噷閮界敎婊嬫粙鐨勩€?
    鏈変竴澶╋紝灏忔槑绐佺劧鍚戝コ瀛╂眰濠氫簡銆備粬鍦ㄤ竴涓氮婕殑椁愬巺閲岋紝鍗曡啙璺湴锛屾嬁鍑轰竴鏋氭垝鎸囷紝璁ょ湡鍦拌锛?浣犳効鎰忓珌缁欐垜鍚楋紵"濂冲鐪嬬潃灏忔槑锛岀溂鐫涢噷闂儊鐫€娉姳锛屽ス鐐逛簡鐐瑰ご锛岃锛?鎴戞効鎰忋€?灏忔槑婵€鍔ㄥ緱鎶婃垝鎸囨埓鍦ㄤ簡濂冲鐨勬墜鎸囦笂锛岀劧鍚庢姳浣忓ス锛屽惢浜嗗ス銆?
    浠栦滑鐨勫绀煎姙寰楀緢闅嗛噸锛屽緢澶氫翰鏈嬪ソ鍙嬮兘鏉ュ弬鍔犱簡銆傚湪濠氱ぜ涓婏紝灏忔槑璇达細"鎴戣繖杈堝瓙鏈€骞歌繍鐨勪簨鎯呭氨鏄亣鍒颁簡鎴戠殑濡诲瓙锛屾槸濂硅鎴戠殑鐢熸椿鍙樺緱濡傛缇庡ソ銆傛垜浼氭案杩滅埍濂癸紝鐓ч【濂癸紝瀹堟姢濂广€?濂冲涔熻锛?鎴戣繖杈堝瓙鏈€骞哥鐨勪簨鎯呭氨鏄珌缁欎簡鎴戠殑涓堝か锛屾槸浠栬鎴戞槑鐧戒簡浠€涔堟槸鐪熸鐨勭埍鎯呫€傛垜浼氭案杩滅埍浠栵紝鏀寔浠栵紝闄即浠栥€?

    浠庨偅浠ュ悗锛屽皬鏄庡拰濂冲鎴愪簡涓€瀵瑰か濡汇€備粬浠殑鐢熸椿鏇村姞鐢滆湝浜嗭紝涔熸洿鍔犵ǔ瀹氫簡銆備粬浠竴璧蜂拱浜嗘埧瀛愶紝涓€璧疯淇紝涓€璧峰竷缃粬浠殑灏忓銆備粬浠殑瀹堕噷鍏呮弧浜嗘俯棣紝鍏呮弧浜嗙埍銆?
    涓嶄箙涔嬪悗锛屽コ瀛╂€€瀛曚簡銆傚皬鏄庨珮鍏村潖浜嗭紝浠栨瘡澶╅兘鏃犲井涓嶈嚦鍦扮収椤剧潃濂冲锛岀敓鎬曞ス鏈変竴鐐逛笉鑸掓湇銆傚崄涓湀鍚庯紝浠栦滑鐨勫瀛愬嚭鐢熶簡锛屾槸涓€涓仴搴风殑鐢峰銆傚皬鏄庢姳鐫€瀛╁瓙锛屾縺鍔ㄥ緱鍝簡銆備粬鐭ラ亾锛屼粬鐨勪汉鐢熶粠姝ゅ彉寰楁洿鍔犲畬鏁翠簡銆?
    瀛╁瓙鎱㈡參闀垮ぇ浜嗭紝浠栧緢鑱槑锛屽緢鍙埍銆傚皬鏄庡拰濂冲姣忓ぉ閮介櫔鐫€瀛╁瓙锛岀湅鐫€浠栦竴澶╁ぉ闀垮ぇ锛屽績閲屽厖婊′簡骞哥銆備粬浠煡閬擄紝杩欏氨鏄粬浠兂瑕佺殑鐢熸椿锛岃繖灏辨槸浠栦滑鐨勫垢绂忋€?
    宀佹湀鍖嗗寙锛屾椂鍏夎崗鑻掋€傚皬鏄庡拰濂冲閮芥參鎱㈠彉鑰佷簡锛屼絾浠栦滑鐨勬劅鎯呭嵈渚濈劧鍍忓勾杞绘椂閭ｆ牱鐢滆湝銆備粬浠瘡澶╀竴璧锋暎姝ワ紝涓€璧风湅鏃ュ嚭鏃ヨ惤锛屼竴璧峰洖蹇嗕粬浠勾杞绘椂鍊欑殑浜嬫儏銆備粬浠煡閬擄紝浠栦滑杩欒緢瀛愭病鏈夌櫧娲伙紝浠栦滑鎷ユ湁浜嗕笘鐣屼笂鏈€缇庡ソ鐨勪笢瑗库€斺€旂埍鎯呭拰瀹跺涵銆?
    杩欎釜鏁呬簨鍛婅瘔鎴戜滑锛屽垢绂忓叾瀹炲緢绠€鍗曘€傚畠涓嶉渶瑕佸お澶氱殑閲戦挶锛屼笉闇€瑕佸お澶氱殑鐗╄川锛屽畠鍙渶瑕佷袱涓汉鐪熷績鐩哥埍锛屼簰鐩镐俊浠伙紝浜掔浉鐞嗚В锛屼簰鐩告敮鎸併€傚彧瑕佷綘鎷ユ湁浜嗚繖浜涳紝浣犲氨鎷ユ湁浜嗗垢绂忋€?
    灏忔槑鍜屽コ瀛╃殑鏁呬簨杩樺湪缁х画锛屼粬浠殑骞哥涔熷湪缁х画銆備粬浠浉淇★紝鍙浠栦滑涓€鐩磋繖鏍风浉鐖变笅鍘伙紝浠栦滑鐨勭敓娲讳竴瀹氫細瓒婃潵瓒婄編濂斤紝浠栦滑鐨勫垢绂忎篃涓€瀹氫細瓒婃潵瓒婂銆俙);
          }
          
          return paragraphs.join('\n\n');
        };
        
        const longText = generateLongText();
        console.log(`[FullLongTextTest] 鐢熸垚鐨勯暱鏂囨湰闀垮害: ${longText.length} 瀛楃`);
        
        // 缁熻涓枃瀛楁暟
        const chineseChars = (longText.match(/[\u4e00-\u9fa5]/g) || []).length;
        console.log(`[FullLongTextTest] 涓枃瀛楁暟: ${chineseChars}`);
        
        // 鏁呮剰鍔犲叆涓€浜涚鐢ㄨ瘝娴嬭瘯
        const testText = longText + `
    
    娴嬭瘯绂佺敤璇嶆浛鎹細
    杩欎釜APP鐪熷ソ鐢紝浠ｇ爜鍐欏緱寰堟锛屽儚鍏徃涓€鏍烽珮鏁堛€?    杩欎釜浜у搧鐪熶笉閿欙紝鐢ㄦ埛浣撻獙寰堝ソ锛屽晢涓氭ā寮忓緢娓呮櫚銆?    `;
        
        console.log('[FullLongTextTest] 鎵ц瀹屾暣 pipeline 澶勭悊...');
        
        const settings = {
          steps: {
            detect: { enabled: true },
            'proper-noun': { enabled: true },
            'banned-words': { enabled: true },
            'preferred-words': { enabled: true },
            polish: { enabled: true },
            'sentence-patterns': { enabled: true },
            'semantic-check': { enabled: true },
            'final-review': { enabled: true },
            'word-usage-check': { enabled: true },
          },
          global: {
            strictness: 'conservative',
            style: 'literary',
          }
        };
        
        const result = await pipeline.execute({
          text: testText,
          settings
        }, (progress: any) => {
          console.log(`[FullLongTextTest] 杩涘害: ${progress.progress}% - ${progress.message}`);
        });
        
        console.log('[FullLongTextTest] 瀹屾暣闀挎枃鏈祴璇曞畬鎴?);
        
        jsonRes(res, {
          success: true,
          test: {
            inputLength: testText.length,
            inputChineseChars: chineseChars,
            outputLength: result.text.length,
            outputChineseChars: (result.text.match(/[\u4e00-\u9fa5]/g) || []).length,
            processingTime: result.metadata.processingTime,
            stepsExecuted: result.metadata.stepsExecuted,
            totalSteps: result.metadata.totalSteps,
            replacements: result.replacements.length,
            reports: result.reports.length,
          },
          reports: result.reports,
          sampleInput: testText.substring(0, 500) + '...',
          sampleOutput: result.text.substring(0, 500) + '...',
          result
        });
        return true;
        
      } catch (error) {
        console.error('[FullLongTextTest] 瀹屾暣闀挎枃鏈祴璇曞け璐?', error);
        jsonRes(res, { 
          success: false, 
          error: error instanceof Error ? error.message : '鏈煡閿欒' 
        }, 500);
        return true;
      }
    }

    // ====== 鏁版嵁搴撹〃缁撴瀯API ======
    if (path === '/api/novel/db/schema' && method === 'GET') {
      const db = getDatabaseManager();
      
      try {
        // 鑾峰彇鎵€鏈夎〃
        const tables = await db.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        const schemaData: Record<string, any> = {};
        
        for (const tableName of tableNames as string[]) {
          // 浣跨敤 SHOW FULL COLUMNS 鑾峰彇 COMMENT 娉ㄩ噴
          const columns = await db.query(`SHOW FULL COLUMNS FROM ${tableName}`);
          schemaData[tableName] = columns.map(col => ({
            name: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key,
            default: col.Default,
            extra: col.Extra,
            comment: col.Comment || '',
          }));
        }
        
        jsonRes(res, { success: true, data: schemaData });
        return true;
      } catch (error: any) {
        jsonRes(res, { success: false, error: error.message }, 500);
        return true;
      }
    }

    // ====== 绗旇API ======
    if (path === '/api/novel/notes' && method === 'GET') {
      const category = query.category;
      const notes = await getNovelService().getNotes(category);
      jsonRes(res, { success: true, data: notes });
      return true;
    }
    
    if (path === '/api/novel/notes/categories' && method === 'GET') {
      const categories = await getNovelService().getNoteCategories();
      jsonRes(res, { success: true, data: categories });
      return true;
    }
    
    const noteDetailMatch = path.match(/^\/api\/novel\/notes\/(\d+)$/);
    if (noteDetailMatch && method === 'GET') {
      const id = parseInt(noteDetailMatch[1]);
      const note = await getNovelService().getNoteById(id);
      if (!note) {
        jsonRes(res, { success: false, error: '绗旇涓嶅瓨鍦? }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: note });
      return true;
    }
    
    if (path === '/api/novel/notes' && method === 'POST') {
      const body = await parseBody(req);
      const note = await getNovelService().addNote(body);
      jsonRes(res, { success: true, data: note });
      return true;
    }
    
    if (noteDetailMatch && method === 'PUT') {
      const id = parseInt(noteDetailMatch[1]);
      const body = await parseBody(req);
      await getNovelService().updateNote(id, body);
      jsonRes(res, { success: true });
      return true;
    }
    
    if (noteDetailMatch && method === 'DELETE') {
      const id = parseInt(noteDetailMatch[1]);
      await getNovelService().deleteNote(id);
      jsonRes(res, { success: true });
      return true;
    }

    // ====== 缂撳瓨鏂囦欢API (鍗曟枃浠? ======
    if (path === '/api/novel/cache/file' && method === 'GET') {
      const filename = query.name;
      if (!filename) {
        jsonRes(res, { success: false, error: '缂哄皯鏂囦欢鍚嶅弬鏁? }, 400);
        return true;
      }
      const content = await getNovelService().getCacheFileContent(filename);
      jsonRes(res, { success: true, data: content });
      return true;
    }

    if (path === '/api/novel/cache/file' && method === 'PUT') {
      const filename = query.name;
      const body = await parseBody(req);
      if (!filename) {
        jsonRes(res, { success: false, error: '缂哄皯鏂囦欢鍚嶅弬鏁? }, 400);
        return true;
      }
      await getNovelService().saveCacheFileContent(filename, body.content);
      jsonRes(res, { success: true });
      return true;
    }

    if (path === '/api/novel/cache/file' && method === 'DELETE') {
      const filename = query.name;
      if (!filename) {
        jsonRes(res, { success: false, error: '缂哄皯鏂囦欢鍚嶅弬鏁? }, 400);
        return true;
      }
      await getNovelService().deleteCacheFile(filename);
      jsonRes(res, { success: true });
      return true;
    }

    if (path === '/api/novel/logs' && method === 'GET') {
      const logs = getActivityLog().getLogs(200).slice().reverse();
      const content = logs.length > 0
        ? logs.map((log) => {
            const timestamp = log.timestamp || new Date().toISOString();
            const level = (log.level || 'info').toUpperCase();
            const type = log.type || 'system';
            return `[${timestamp}] [${level}] [${type}] ${log.message}`;
          }).join('\n')
        : '鏆傛棤娲诲姩鏃ュ織';
      jsonRes(res, { success: true, data: content });
      return true;
    }

    // ====== 娴佹按绾胯繘搴?SSE ======
    // SSE 璺敱宸插崟鐙敞鍐岋紝杩欓噷涓嶅啀澶勭悊
    const progressMatch = path.match(/^\/api\/novel\/fanqie\/publish\/progress\/([^/]+)$/);
    if (progressMatch && method === 'GET') {
      // 杩斿洖 404锛岃鍗曠嫭鐨?SSE 璺敱澶勭悊
      jsonRes(res, { success: false, error: '璇蜂娇鐢?/api/novel/sse/progress/ 绔偣' }, 404);
      return true;
    }

    // ====== 椤圭洰缁撴瀯API ======
    // 鑾峰彇椤圭洰缁撴瀯
    if (path === '/api/novel/project-structure' && method === 'GET') {
      try {
        const structure = await getProjectStructure();
        jsonRes(res, { success: true, data: structure });
      } catch (error) {
        console.error('[ProjectStructureAPI] 鑾峰彇椤圭洰缁撴瀯澶辫触:', error);
        jsonRes(res, { success: false, error: '鑾峰彇椤圭洰缁撴瀯澶辫触' }, 500);
      }
      return true;
    }

    // 404
    jsonRes(res, { success: false, error: 'API璺敱涓嶅瓨鍦? }, 404);
    return true;

  } catch (err: any) {
    console.error('[novel-manager] API閿欒:', err);
    jsonRes(res, { success: false, error: err.message || '鏈嶅姟鍣ㄩ敊璇? }, 500);
    return true;
  }
}

// OpenClaw 鎻掍欢瀹氫箟
const plugin = {
  id: "novel-manager",
  name: "灏忚鏁版嵁绠＄悊",
  description: "灏忚鏁版嵁绠＄悊Web鐣岄潰",
  version: "1.0.0",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  register(api: any) {
    console.log('[novel-manager] Plugin registered, api:', typeof api, Object.keys(api || {}));
    
    // 椤甸潰璺敱閰嶇疆
    const pageRoutes = [
      { path: '/novel', match: 'exact' as const },
      { path: '/novel/', match: 'exact' as const }
    ];
    
    // 娉ㄥ唽椤甸潰璺敱 - 涓嶉渶瑕佽璇?    if (api?.registerHttpRoute) {
      console.log('[novel-manager] 浣跨敤 api.registerHttpRoute');
      pageRoutes.forEach(route => {
        api.registerHttpRoute({
          path: route.path,
          match: route.match,
          handler: handleNovelPage,
          auth: 'plugin'
        });
      });
      // 娉ㄥ唽API璺敱 - 闇€瑕佽璇?      api.registerHttpRoute({
        path: '/api/novel',
        match: 'prefix',
        handler: handleNovelApi,
        auth: 'gateway'
      });
      // 娉ㄥ唽 SSE 璺敱 - 涓嶉渶瑕佽璇侊紙浣跨敤 URL 鍙傛暟璁よ瘉锛?      api.registerHttpRoute({
        path: '/novel/sse',
        match: 'prefix',
        handler: handleSse,
        auth: 'plugin'
      });
    }
    // 灏濊瘯鐩存帴浣跨敤 registerPluginHttpRoute
    else if (registerPluginHttpRoute) {
      console.log('[novel-manager] 浣跨敤 registerPluginHttpRoute');
      pageRoutes.forEach(route => {
        registerPluginHttpRoute({
          path: route.path,
          match: route.match,
          handler: handleNovelPage,
          auth: 'plugin',
          pluginId: 'novel-manager'
        });
      });
      registerPluginHttpRoute({
        path: '/api/novel',
        match: 'prefix',
        handler: handleNovelApi,
        auth: 'gateway',
        pluginId: 'novel-manager'
      });
      // 娉ㄥ唽 SSE 璺敱
      registerPluginHttpRoute({
        path: '/novel/sse',
        match: 'prefix',
        handler: handleSse,
        auth: 'plugin',
        pluginId: 'novel-manager'
      });
    }
    // 澶囩敤锛氱洿鎺ユ敞鍐屽埌鍏ㄥ眬
    else {
      console.log('[novel-manager] 浣跨敤鍏ㄥ眬娉ㄥ唽');
      // @ts-ignore
      if (globalThis.__openclawHttpRoutes) {
        pageRoutes.forEach(route => {
          // @ts-ignore
          globalThis.__openclawHttpRoutes.push({
            path: route.path,
            match: route.match,
            handler: handleNovelPage,
            auth: 'plugin'
          });
        });
        // @ts-ignore
        globalThis.__openclawHttpRoutes.push({
          path: '/api/novel',
          match: 'prefix',
          handler: handleNovelApi,
          auth: 'gateway'
        });
        // SSE 璺敱
        // @ts-ignore
        globalThis.__openclawHttpRoutes.push({
          path: '/novel/sse',
          match: 'prefix',
          handler: handleSse,
          auth: 'plugin'
        });
      }
    }
    console.log('[novel-manager] API璺敱娉ㄥ唽瀹屾垚');
  },
  activate() {
    console.log('[novel-manager] Plugin activated');
    
    // 鍚姩鏃惰嚜鍔ㄨ瘖鏂拰淇绔犺妭鐘舵€侊紙寤惰繜鎵ц锛岀‘淇濇暟鎹簱杩炴帴宸插缓绔嬶級
    setTimeout(async () => {
      try {
        console.log('[novel-manager] 鍚姩鏃惰嚜鍔ㄨ瘖鏂拰淇绔犺妭鐘舵€?..');
        
        const db = getDatabaseManager();
        const { getChapterStateMachine } = require('../core/state-machine/ChapterStateMachine');
        const stateMachine = getChapterStateMachine();
        
        // 1. 鑾峰彇鎵€鏈夌珷鑺?        const allChapters = await db.query(`
          SELECT id, work_id, chapter_number, title, content, word_count, status
          FROM chapters
          ORDER BY work_id, chapter_number
        `);
        
        console.log(`[novel-manager] 鎵惧埌 ${allChapters.length} 涓珷鑺傦紝寮€濮嬫鏌?..`);
        
        let fixed = 0;
        
        // 2. 閫愪釜妫€鏌ュ拰淇
        for (const chapter of allChapters) {
          let newStatus = chapter.status;
          let needFix = false;
          
          try {
            // 瑙勫垯1锛氬鏋滄病鏈夊唴瀹癸紝蹇呴』鏄?outline
            if ((!chapter.content || chapter.content.length === 0 || !chapter.word_count || chapter.word_count === 0) && 
                chapter.status !== 'outline') {
              newStatus = 'outline';
              needFix = true;
            }
            
            // 瑙勫垯2锛氬鏋滄湁鍐呭涓旂姸鎬佹槸 outline锛屾敼涓?first_draft
            else if (chapter.content && chapter.content.length > 0 && 
                     chapter.word_count && chapter.word_count > 0 && 
                     chapter.status === 'outline') {
              newStatus = 'first_draft';
              needFix = true;
            }
            
            // 瑙勫垯3锛氬鏋滅姸鎬佹槸 polished锛屾鏌ユ槸鍚︾‘瀹炵粡杩囨鼎鑹叉祦绋?            else if (chapter.status === 'polished') {
              try {
                const hasBeenPolished = await stateMachine.hasBeenPolished(chapter.id);
                if (!hasBeenPolished) {
                  newStatus = 'first_draft';
                  needFix = true;
                }
              } catch (e) {
                // 妫€鏌ユ鼎鑹茬姸鎬佸け璐ワ紝鏆傛椂璺宠繃
              }
            }
            
            // 瑙勫垯4锛氭竻鐞嗘棫鐘舵€?pending
            if (chapter.status === 'pending') {
              if (!chapter.content || chapter.content.length === 0) {
                newStatus = 'outline';
              } else {
                newStatus = 'first_draft';
              }
              needFix = true;
            }
            
            // 濡傛灉闇€瑕佷慨澶嶏紝鎵ц鏇存柊
            if (needFix && newStatus !== chapter.status) {
              await db.execute(`
                UPDATE chapters SET status = ?, updated_at = NOW() WHERE id = ?
              `, [newStatus, chapter.id]);
              fixed++;
              console.log(`[novel-manager] 淇绔犺妭 ${chapter.work_id}-${chapter.chapter_number}: ${chapter.status} 鈫?${newStatus}`);
            }
          } catch (err) {
            console.error(`[novel-manager] 澶勭悊绔犺妭 ${chapter.id} 澶辫触:`, err);
          }
        }
        
        if (fixed > 0) {
          console.log(`[novel-manager] 鍚姩鏃惰嚜鍔ㄨ瘖鏂拰淇瀹屾垚锛屼慨澶嶄簡 ${fixed} 涓珷鑺俙);
        } else {
          console.log('[novel-manager] 鍚姩鏃惰嚜鍔ㄨ瘖鏂拰淇瀹屾垚锛屾墍鏈夌珷鑺傜姸鎬佹甯?);
        }
        
      } catch (err) {
        console.error('[novel-manager] 鍚姩鏃惰嚜鍔ㄨ瘖鏂拰淇澶辫触:', err);
      }
    }, 3000); // 寤惰繜3绉掓墽琛岋紝纭繚绯荤粺瀹屽叏鍚姩
  }
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;

// 瀵煎嚭 content-craft 妯″潡鐨勪富瑕佺被鍜屽嚱鏁?export { configManager, PolishPipeline } from '../core/content-craft/src';
export { GenerationPipeline } from '../core/content-craft/src/generation-pipeline';
export type { 
  GenerationInput, 
  GenerationOutput, 
  GenerationSettings,
  GenerateFromDbInput,
  Character,
  StoryBackground,
  ChapterOutline,
  RelatedChapter
} from '../core/content-craft/src/generation-types';
export type { 
  PolishInput, 
  PolishOutput, 
  PolishSettings 
} from '../core/content-craft/src/types';

