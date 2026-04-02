import {
  FILE_MANAGER_API_PREFIX,
  FILE_MANAGER_PAGE_ROUTES,
  configureFileManagerRuntime,
  disposeFileManagerRuntime,
  handleFileManagerApi,
  handleLegacyFileManagerApiAlias,
  handleFileManagerPage,
} from '../backend/routes/http';

const plugin = {
  id: 'file-manager',
  name: '文件管理',
  version: '1.0.0',
  description: '工作区文件浏览、预览与监听模块',

  register(api: any) {
    console.log('[file-manager] register');

    configureFileManagerRuntime(api);

    if (!api?.registerHttpRoute) {
      return;
    }

    for (const route of FILE_MANAGER_PAGE_ROUTES) {
      api.registerHttpRoute({
        path: route,
        match: 'exact' as const,
        handler: handleFileManagerPage,
        auth: 'plugin',
      });
    }

    api.registerHttpRoute({
      path: FILE_MANAGER_API_PREFIX,
      match: 'prefix' as const,
      handler: handleFileManagerApi,
      auth: 'plugin',
    });

    if (api.registerCli) {
      api.registerCli({
        name: 'file-manager',
        description: '打开文件管理页面',
        handler: () => {
          console.log('[file-manager] 打开路径: /file-manager');
        },
      });
    }
  },

  activate() {
    console.log('[file-manager] activate');
  },

  deactivate() {
    disposeFileManagerRuntime();
  },
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
export const deactivate = plugin.deactivate;

