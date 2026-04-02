import {
  AUTOMATION_API_PREFIX,
  AUTOMATION_PAGE_ROUTES,
  handleAutomationApi,
  handleLegacyAutomationAlias,
  handleAutomationPage,
} from '../backend/routes/http';

const plugin = {
  id: 'automation-hub',
  name: '自动化中心',
  version: '1.0.0',
  description: '自动化中心页面与接口',

  register(api: any) {
    console.log('[automation-hub] register');

    if (!api?.registerHttpRoute) return;

    for (const route of AUTOMATION_PAGE_ROUTES) {
      api.registerHttpRoute({
        path: route,
        match: 'exact' as const,
        handler: handleAutomationPage,
        auth: 'plugin',
      });
    }

    api.registerHttpRoute({
      path: AUTOMATION_API_PREFIX,
      match: 'prefix' as const,
      handler: handleAutomationApi,
      auth: 'plugin',
    });
  },

  activate() {
    console.log('[automation-hub] activate');
  },
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
