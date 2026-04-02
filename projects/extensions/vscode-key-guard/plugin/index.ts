import {
  VSCODE_KEY_GUARD_API_PREFIX,
  VSCODE_KEY_GUARD_PAGE_ROUTES,
  handleVscodeKeyGuardApi,
  handleVscodeKeyGuardPage,
} from "../backend/routes/http.ts";

const plugin = {
  id: "vscode-key-guard",
  name: "VS Code Key Guard",
  version: "1.0.0",
  description: "Monitor Codex and Roo active API keys, usage, and controlled key switching.",

  register(api: any) {
    console.log("[vscode-key-guard] register");

    if (!api?.registerHttpRoute) {
      return;
    }

    for (const route of VSCODE_KEY_GUARD_PAGE_ROUTES) {
      const pageMatch =
        route.startsWith('/key-guard/chat') || route.startsWith('/vscode-key-guard')
          ? ('prefix' as const)
          : ('exact' as const);
      api.registerHttpRoute({
        path: route,
        match: pageMatch,
        handler: handleVscodeKeyGuardPage,
        auth: "plugin",
      });
    }

    api.registerHttpRoute({
      path: VSCODE_KEY_GUARD_API_PREFIX,
      match: "prefix" as const,
      handler: handleVscodeKeyGuardApi,
      auth: "plugin",
    });
  },

  activate() {
    console.log("[vscode-key-guard] activate");
  },

  deactivate() {
    console.log("[vscode-key-guard] deactivate");
  },
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;
export const deactivate = plugin.deactivate;
