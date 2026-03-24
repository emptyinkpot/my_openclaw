(function () {
  const modalId = 'globalSettingsModal';

  function getModal() {
    return document.getElementById(modalId);
  }

  function openGlobalSettingsModal() {
    const modal = getModal();
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  function closeGlobalSettingsModal() {
    const modal = getModal();
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function testGlobalDBConnection() {
    alert('🔎 测试数据库连接...\n（模拟成功）');
  }

  function saveGlobalSettings() {
    alert('💾 设置已保存！');
    closeGlobalSettingsModal();
  }

  function resetGlobalSettings() {
    if (confirm('确定重置所有设置？')) {
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
      if (modal && e.target === modal) {
        closeGlobalSettingsModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeGlobalSettingsModal();
      }
    });
  }

  window.openGlobalSettingsModal = openGlobalSettingsModal;
  window.closeGlobalSettingsModal = closeGlobalSettingsModal;
  window.testGlobalDBConnection = testGlobalDBConnection;
  window.saveGlobalSettings = saveGlobalSettings;
  window.resetGlobalSettings = resetGlobalSettings;
  window.OpenClawNavBarApplyActiveState = applyActiveState;

  bindGlobalListeners();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyActiveState, { once: true });
  } else {
    applyActiveState();
  }
})();
