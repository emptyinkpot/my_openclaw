// nav-bar.js - 独立导航栏组件
// 直接把导航栏 HTML 插入到页面中
document.addEventListener('DOMContentLoaded', function() {
  const navBarHTML = `
    <style>
      .nav-bar {
        background: var(--bg-tertiary);
        border-bottom: 1px solid var(--border);
        padding: 8px 16px;
        display: flex;
        gap: 8px;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .nav-bar a {
        padding: 8px 16px;
        border-radius: 6px;
        text-decoration: none;
        color: var(--text);
        transition: all 0.2s;
        user-select: none;
        -webkit-user-select: none;
      }
      .nav-bar a:hover {
        background: var(--bg-hover);
      }
      .nav-bar a.active {
        background: var(--primary);
        color: white;
      }
    </style>
    <nav class="nav-bar">
      <a href="/novel-manager/" data-page="home" onclick="setActiveNav('home')">🏠 首页</a>
      <a href="/novel-manager/mysql.html" data-page="mysql" onclick="setActiveNav('mysql')">🗄️ MySQL数据</a>
      <a href="/novel-manager/fanqie.html" data-page="fanqie" onclick="setActiveNav('fanqie')">🍅 番茄扫描</a>
      <a href="/novel-manager/pipeline.html" data-page="pipeline" onclick="setActiveNav('pipeline')">🚀 发布流水线</a>
      <a href="/novel-manager/fanqie-simple.html" data-page="fanqie-simple" onclick="setActiveNav('fanqie-simple')">✍️ 简易发布</a>
      <a href="/novel-manager/accounts.html" data-page="accounts" onclick="setActiveNav('accounts')">👤 账号管理</a>
    </nav>
  `;
  
  // 把导航栏插入到 body 的最前面
  const body = document.body;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = navBarHTML;
  
  // 把 style 和 nav 插入到 body 开头
  while (tempDiv.firstChild) {
    body.insertBefore(tempDiv.firstChild, body.firstChild);
  }
  
  // 设置当前页面的 active 状态
  setActiveNavFromURL();
});

function setActiveNav(page) {
  // 移除所有 active 类
  document.querySelectorAll('.nav-bar a').forEach(link => {
    link.classList.remove('active');
  });
  
  // 给当前页面添加 active 类
  const activeLink = document.querySelector(\`.nav-bar a[data-page="\${page}"]\`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

function setActiveNavFromURL() {
  const path = window.location.pathname;
  let page = 'home';
  
  if (path.includes('mysql.html')) page = 'mysql';
  else if (path.includes('fanqie.html')) page = 'fanqie';
  else if (path.includes('pipeline.html')) page = 'pipeline';
  else if (path.includes('fanqie-simple.html')) page = 'fanqie-simple';
  else if (path.includes('accounts.html')) page = 'accounts';
  
  setActiveNav(page);
}
