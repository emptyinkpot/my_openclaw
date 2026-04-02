import {
  AGHUB_BRIDGE_API_PREFIX,
  AGHUB_BRIDGE_PAGE_ROUTES,
  AGHUB_BRIDGE_PROXY_PREFIX,
  configureAghubBridgeRuntime,
  disposeAghubBridgeRuntime,
  handleAghubBridgeApi,
  handleAghubBridgePage,
  handleAghubBridgeProxy,
} from '../backend/routes/http';

const plugin = {
  id: 'aghub-bridge',
  name: 'AGHub',
  version: '1.0.0',
  description: '在 OpenClaw 中桥接 AGHub（MCP/Skill 管理）',

  register(api: any) {
    console.log('[aghub-bridge] register');

    configureAghubBridgeRuntime(api);

    if (!api?.registerHttpRoute) {
      return;
    }

    for (const route of AGHUB_BRIDGE_PAGE_ROUTES) {
      api.registerHttpRoute({
        path: route,
        match: 'exact' as const,
        handler: handleAghubBridgePage,
        auth: 'plugin',
      });
    }

    api.registerHttpRoute({
      path: AGHUB_BRIDGE_PROXY_PREFIX,
      match: 'prefix' as const,
      handler: handleAghubBridgeProxy,
      auth: 'plugin',
    });

    api.registerHttpRoute({
      path: AGHUB_BRIDGE_API_PREFIX,
      match: 'prefix' as const,
      handler: handleAghubBridgeApi,
      auth: 'plugin',
    });
  },

  activate() {
    console.log('[aghub-bridge] activate');
  },

  deactivate() {
    disposeAghubBridgeRuntime();
  },
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
export const deactivate = plugin.deactivate;
