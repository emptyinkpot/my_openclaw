(function () {
  const SHARED_NAV_URL = '/shared/nav-bar.html';
  const SHARED_NAV_ATTR = 'data-openclaw-shared-nav';

  function getModal() {
    return document.getElementById('globalSettingsModal');
  }

  function openGlobalSettingsModal() {
    const modal = getModal();
    if (modal) modal.style.display = 'flex';
  }

  function closeGlobalSettingsModal() {
    const modal = getModal();
    if (modal) modal.style.display = 'none';
  }

  function testGlobalDBConnection() {
    alert('🔎 测试数据库连接..\n（模拟成功）');
  }

  function saveGlobalSettings() {
    alert('💾 设置已保存！');
    closeGlobalSettingsModal();
  }

  function resetGlobalSettings() {
    if (confirm('确定重置所有设置吗？')) {
      alert('♻️ 已重置！');
    }
  }

  function applyActiveState() {
    const navItems = document.querySelectorAll('.nav-bar a');
    if (navItems.length === 0) return;
    const currentPath = window.location.pathname;
    navItems.forEach((item) => {
      item.classList.remove('on');
      const href = item.getAttribute('href');
      if (href === 'javascript:void(0)' && currentPath.includes('settings')) {
        item.classList.add('on');
      } else if (currentPath === href || (currentPath === '/' && href === '/')) {
        item.classList.add('on');
      } else if (href && currentPath.startsWith(href) && href !== '/') {
        item.classList.add('on');
      }
    });
  }

  function bindGlobalListeners() {
    document.addEventListener('click', (e) => {
      const modal = getModal();
      if (modal && e.target === modal) closeGlobalSettingsModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeGlobalSettingsModal();
    });
  }

  async function loadSharedNavBar() {
    const response = await fetch(SHARED_NAV_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load shared nav bar: ${response.status}`);
    }
    const html = await response.text();
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
  }

  function appendStyleOnce(styleNode) {
    if (!styleNode || document.querySelector(`style[${SHARED_NAV_ATTR}]`)) return;
    const clone = styleNode.cloneNode(true);
    clone.setAttribute(SHARED_NAV_ATTR, 'true');
    document.head.appendChild(clone);
  }

  function replaceOrAppendNav(navNode) {
    if (!navNode) return false;

    const existingNav = document.querySelector('.nav-bar');
    if (existingNav) {
      existingNav.replaceWith(navNode.cloneNode(true));
      return true;
    }

    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer && !navbarContainer.children.length) {
      navbarContainer.replaceChildren(navNode.cloneNode(true));
      return true;
    }

    return false;
  }

  function replaceOrAppendModal(modalNode) {
    if (!modalNode) return;
    const existingModal = document.getElementById('globalSettingsModal');
    if (existingModal) existingModal.remove();
    document.body.appendChild(modalNode.cloneNode(true));
  }

  async function syncSharedNavBar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
      applyActiveState();
      return;
    }

    if (!document.querySelector('.nav-bar')) {
      applyActiveState();
      return;
    }

    try {
      const content = await loadSharedNavBar();
      const styleNode = content.querySelector('style');
      const navNode = content.querySelector('.nav-bar');
      const modalNode = content.querySelector('#globalSettingsModal');

      appendStyleOnce(styleNode);
      replaceOrAppendNav(navNode);
      replaceOrAppendModal(modalNode);
      applyActiveState();
    } catch (error) {
      console.warn('[OpenClaw] Failed to sync shared nav bar:', error);
      applyActiveState();
    }
  }

  window.openGlobalSettingsModal = openGlobalSettingsModal;
  window.closeGlobalSettingsModal = closeGlobalSettingsModal;
  window.testGlobalDBConnection = testGlobalDBConnection;
  window.saveGlobalSettings = saveGlobalSettings;
  window.resetGlobalSettings = resetGlobalSettings;
  window.OpenClawNavBarApplyActiveState = applyActiveState;

  bindGlobalListeners();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncSharedNavBar, { once: true });
  } else {
    syncSharedNavBar();
  }
})();
