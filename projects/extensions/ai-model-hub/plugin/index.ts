import {
  AI_MODEL_HUB_API_PREFIX,
  AI_MODEL_HUB_PAGE_ROUTES,
  configureAIModelHubRuntime,
  disposeAIModelHubRuntime,
  handleAIModelHubApi,
  handleAIModelHubPage,
} from '../backend/routes/http';

const plugin = {
  id: 'ai-model-hub',
  name: '模型中心',
  version: '1.0.0',
  description: '本地模型、微调与安全沙盒模块',

  register(api: any) {
    console.log('[ai-model-hub] register');

    configureAIModelHubRuntime(api);

    if (!api?.registerHttpRoute) {
      return;
    }

    for (const route of AI_MODEL_HUB_PAGE_ROUTES) {
      api.registerHttpRoute({
        path: route,
        match: 'exact' as const,
        handler: handleAIModelHubPage,
        auth: 'plugin',
      });
    }

    api.registerHttpRoute({
      path: AI_MODEL_HUB_API_PREFIX,
      match: 'prefix' as const,
      handler: handleAIModelHubApi,
      auth: 'plugin',
    });
  },

  activate() {
    console.log('[ai-model-hub] activate');
  },

  deactivate() {
    disposeAIModelHubRuntime();
  },
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
export const deactivate = plugin.deactivate;
