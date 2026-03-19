/**
 * 小说管理模块 - OpenClaw 插件
 */
declare const plugin: {
    id: string;
    name: string;
    description: string;
    version: string;
    configSchema: {
        type: string;
        additionalProperties: boolean;
        properties: {};
    };
    register(api: any): void;
    activate(): void;
};
export default plugin;
export declare const register: (api: any) => void;
export declare const activate: () => void;
//# sourceMappingURL=index.d.ts.map