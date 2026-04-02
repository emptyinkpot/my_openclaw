import {
  SUPERSET_BRIDGE_API_PREFIX,
  SUPERSET_BRIDGE_PAGE_ROUTES,
  SUPERSET_BRIDGE_PROXY_PREFIX,
  configureSupersetBridgeRuntime,
  disposeSupersetBridgeRuntime,
  handleSupersetBridgeApi,
  handleSupersetBridgePage,
  handleSupersetBridgeProxy,
} from '../backend/routes/http';

const plugin = {
  id: 'superset-bridge',
  name: 'Superset BI',
  version: '1.0.0',
  description: '在 OpenClaw 中桥接 Superset Web',

  register(api: any) {
    console.log('[superset-bridge] register');

    configureSupersetBridgeRuntime(api);

    if (!api?.registerHttpRoute) {
      return;
    }

    for (const route of SUPERSET_BRIDGE_PAGE_ROUTES) {
      api.registerHttpRoute({
        path: route,
        match: 'exact' as const,
        handler: handleSupersetBridgePage,
        auth: 'plugin',
      });
    }

    api.registerHttpRoute({
      path: SUPERSET_BRIDGE_PROXY_PREFIX,
      match: 'prefix' as const,
      handler: handleSupersetBridgeProxy,
      auth: 'plugin',
    });

    api.registerHttpRoute({
      path: SUPERSET_BRIDGE_API_PREFIX,
      match: 'prefix' as const,
      handler: handleSupersetBridgeApi,
      auth: 'plugin',
    });
  },

  activate() {
    console.log('[superset-bridge] activate');
  },

  deactivate() {
    disposeSupersetBridgeRuntime();
  },
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
export const deactivate = plugin.deactivate;
