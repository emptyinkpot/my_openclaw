(function () {
  const settingsKey = 'openclaw.control.settings.v1';
  const bootstrapTokenKey = 'openclaw.control.bootstrap.token.v1';
  const bootstrapGatewayKey = 'openclaw.control.bootstrap.gateway.v1';
  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const storedToken = (() => {
    try {
      return (localStorage.getItem(bootstrapTokenKey) || '').trim();
    } catch {
      return '';
    }
  })();
  let token = (params.get('token') || hashParams.get('token') || storedToken || '').trim();
  const rootGatewayUrl = (params.get('gatewayUrl') || hashParams.get('gatewayUrl') || `ws://${location.host}`).trim().replace(/\/+$/, '');
  const basePath = location.pathname.replace(/\/[^/]*$/, '') || '';
  const pathGatewayUrl = `ws://${location.host}${basePath}`.replace(/\/+$/, '');
  const pageGatewayUrl = `ws://${location.host}${location.pathname.replace(/\/+$/, '')}`.replace(/\/+$/, '');
  const tokenKeys = [rootGatewayUrl, pathGatewayUrl, pageGatewayUrl];
  try {
    if (token || rootGatewayUrl) {
      window.name = JSON.stringify({
        token,
        gatewayUrl: rootGatewayUrl,
        source: 'openclaw-control-launch',
        createdAt: Date.now(),
      });
    }
  } catch (err) {
    console.error('[OpenClaw Control Launcher] failed to seed window.name:', err);
  }

  const defaults = {
    gatewayUrl: rootGatewayUrl,
    sessionKey: 'main',
    lastActiveSessionKey: 'main',
    theme: 'claw',
    themeMode: 'system',
    chatFocusMode: false,
    chatShowThinking: true,
    splitRatio: 0.6,
    navCollapsed: false,
    navWidth: 220,
    navGroupsCollapsed: {},
  };
  const installTokenFallback = () => {
    if (window.__OPENCLAW_CONTROL_TOKEN_FALLBACK_INSTALLED__) return;
    const storageProto = globalThis.Storage?.prototype;
    if (!storageProto || typeof storageProto.getItem !== 'function') return;
    const originalGetItem = storageProto.getItem;
    storageProto.getItem = function (key) {
      const value = originalGetItem.call(this, key);
      if ((value === null || value === undefined) && typeof key === 'string' && key.startsWith('openclaw.control.token.v1')) {
        try {
          return localStorage.getItem(bootstrapTokenKey) || '';
        } catch {
          return '';
        }
      }
      return value;
    };
    window.__OPENCLAW_CONTROL_TOKEN_FALLBACK_INSTALLED__ = true;
  };

  try {
    if (token) {
      localStorage.setItem(bootstrapTokenKey, token);
      localStorage.setItem(bootstrapGatewayKey, rootGatewayUrl);
      for (const gatewayUrl of tokenKeys) {
        sessionStorage.setItem(`openclaw.control.token.v1:${gatewayUrl}`, token);
      }
    }
    installTokenFallback();
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(settingsKey) || 'null') || {};
      } catch {
        return {};
      }
    })();
    localStorage.setItem(settingsKey, JSON.stringify({
      ...defaults,
      ...existing,
      gatewayUrl: rootGatewayUrl,
      token: token || existing.token || storedToken || '',
    }));
  } catch (err) {
    console.error('[OpenClaw launcher] failed to prepare login state:', err);
  }

  location.replace('./index.html' + (location.hash || ''));
})();
