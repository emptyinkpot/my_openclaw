/**
 * 统一导航栏组件
 * 
 * 所有页面共享同一个导航栏，避免重复代码
 */

(function() {
  'use strict';

  // 导航栏配置
  const NAV_ITEMS = [
    { 
      id: 'settings', 
      label: '⚙️ 设置', 
      isSpecial: true
    },
    { id: 'novel', label: '📚 小说管理', path: '/novel/' },
    { id: 'auto', label: '⚙️ 自动化', path: '/auto.html' },
    { id: 'experience', label: '🧠 经验', path: '/experience.html' },
    { id: 'cache', label: '💾 缓存', path: '/cache.html' },
    { id: 'native', label: '🎯 原生界面', path: '/' }
  ];

  // 当前页面路径映射
  const PATH_TO_PAGE = {
    '/novel/': 'novel',
    '/novel': 'novel',
    '/auto.html': 'auto',
    '/experience.html': 'experience',
    '/cache.html': 'cache',
    '/': 'native'
  };

  // 获取当前页面ID
  function getCurrentPageId() {
    const path = window.location.pathname;
    return PATH_TO_PAGE[path] || 'novel';
  }

  // 生成导航栏HTML
  function generateNavbarHTML() {
    const currentPage = getCurrentPageId();
    
    const itemsHTML = NAV_ITEMS.map(function(item) {
      const isActive = item.id === currentPage;
      const activeClass = isActive ? 'on' : '';
      
      if (item.isSpecial) {
        return '<a href="javascript:void(0)" onclick="Navbar.handleSettingsClick()" style="padding: 6px 14px; border-radius: 4px; color: #8b949e; text-decoration: none;">' + item.label + '</a>';
      }
      
      return '<a href="' + item.path + '" class="' + activeClass + '">' + item.label + '</a>';
    }).join('');

    return '<div class="nav-bar">' + itemsHTML + '</div>';
  }

  // 注入导航栏到页面
  function injectNavbar() {
    // 检查是否已经有导航栏
    const existingNav = document.querySelector('.nav-bar');
    if (existingNav) {
      existingNav.outerHTML = generateNavbarHTML();
    } else {
      // 创建新的导航栏并插入到body最前面
      const navDiv = document.createElement('div');
      navDiv.innerHTML = generateNavbarHTML();
      
      // 确保插入到最前面
      if (document.body.firstChild) {
        document.body.insertBefore(navDiv.firstElementChild, document.body.firstChild);
      } else {
        document.body.appendChild(navDiv.firstElementChild);
      }
    }
  }

  // 处理设置按钮点击
  function handleSettingsClick() {
    // 如果在小说管理页面，直接打开设置弹窗
    if (window.location.pathname === '/novel/' || window.location.pathname === '/novel') {
      if (typeof showView === 'function') {
        showView('settings');
      } else {
        window.location.href = '/novel/';
      }
    } else {
      // 否则跳转到小说管理页面
      window.location.href = '/novel/';
    }
  }

  // 初始化导航栏
  function init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectNavbar);
    } else {
      injectNavbar();
    }
  }

  // 导出到全局
  window.Navbar = {
    init: init,
    inject: injectNavbar,
    handleSettingsClick: handleSettingsClick,
    getCurrentPageId: getCurrentPageId
  };

  // 自动初始化
  init();

})();
