"use strict";
/**
 * Memory-LanceDB Pro 集成服务
 * 将经验记录同步到向量数据库，支持语义检索
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryService = exports.MemoryService = void 0;
/**
 * Memory 服务类
 * 通过 OpenClaw 工具调用与 memory-lancedb-pro 交互
 */
class MemoryService {
    constructor() {
        this.enabled = false;
        // 检查 memory-lancedb-pro 是否可用
        this.enabled = process.env.MEMORY_LANCEDB_ENABLED !== 'false';
    }
    static getInstance() {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }
    /**
     * 存储经验到 Memory
     */
    async storeExperience(exp) {
        if (!this.enabled) {
            console.log('[Memory] 插件未启用，跳过存储');
            return false;
        }
        try {
            // 构建存储内容
            const content = this.buildExperienceContent(exp);
            // 存储参数
            const params = {
                content,
                scope: 'experience',
                category: exp.type,
                importance: exp.difficulty / 5, // 0.2 - 1.0
                metadata: {
                    experienceId: exp.id,
                    type: exp.type,
                    title: exp.title,
                    tags: exp.tags,
                    difficulty: exp.difficulty,
                    xpGained: exp.xpGained,
                    timestamp: exp.timestamp,
                }
            };
            // 通过全局工具调用存储
            // @ts-ignore
            if (globalThis.__openclawTools?.memory_store) {
                // @ts-ignore
                await globalThis.__openclawTools.memory_store(params);
                console.log('[Memory] 经验已存储:', exp.id);
                return true;
            }
            // 备用：直接 HTTP 调用
            return await this.httpStore(params);
        }
        catch (e) {
            console.error('[Memory] 存储失败:', e);
            return false;
        }
    }
    /**
     * 语义搜索经验
     */
    async searchExperiences(query, limit = 10) {
        if (!this.enabled) {
            return [];
        }
        try {
            const params = {
                query,
                scope: 'experience',
                limit,
                minScore: 0.3,
            };
            // 通过全局工具调用检索
            // @ts-ignore
            if (globalThis.__openclawTools?.memory_recall) {
                // @ts-ignore
                const result = await globalThis.__openclawTools.memory_recall(params);
                return result.results || [];
            }
            // 备用：直接 HTTP 调用
            return await this.httpRecall(params);
        }
        catch (e) {
            console.error('[Memory] 检索失败:', e);
            return [];
        }
    }
    /**
     * 构建经验内容字符串
     */
    buildExperienceContent(exp) {
        const parts = [
            `# ${exp.title}`,
            ``,
            `## 类型: ${exp.type}`,
            `## 难度: ${'⭐'.repeat(exp.difficulty)}`,
            ``,
            `### 问题描述`,
            exp.description,
            ``,
            `### 用户查询`,
            exp.userQuery,
            ``,
            `### 解决方案`,
            exp.solution,
            ``,
        ];
        if (exp.experienceGained?.length > 0) {
            parts.push(`### 经验总结`);
            exp.experienceGained.forEach((g, i) => {
                parts.push(`${i + 1}. ${g}`);
            });
            parts.push('');
        }
        if (exp.tags?.length > 0) {
            parts.push(`### 标签: ${exp.tags.join(', ')}`);
        }
        return parts.join('\n');
    }
    /**
     * HTTP 方式存储（备用）
     */
    async httpStore(params) {
        try {
            const response = await fetch('http://localhost:5000/api/memory/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer e1647cdb-1b80-4eee-a975-7599160cc89b',
                },
                body: JSON.stringify(params),
            });
            const result = await response.json();
            return result.success === true;
        }
        catch (e) {
            console.error('[Memory] HTTP 存储失败:', e);
            return false;
        }
    }
    /**
     * HTTP 方式检索（备用）
     */
    async httpRecall(params) {
        try {
            const query = encodeURIComponent(params.query);
            const url = `http://localhost:5000/api/memory/recall?query=${query}&scope=${params.scope || 'experience'}&limit=${params.limit || 10}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer e1647cdb-1b80-4eee-a975-7599160cc89b',
                },
            });
            const result = await response.json();
            return result.results || [];
        }
        catch (e) {
            console.error('[Memory] HTTP 检索失败:', e);
            return [];
        }
    }
    /**
     * 批量同步经验到 Memory
     */
    async syncAllExperiences(records) {
        let synced = 0;
        let failed = 0;
        for (const record of records) {
            const success = await this.storeExperience(record);
            if (success) {
                synced++;
            }
            else {
                failed++;
            }
            // 避免过快请求
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log(`[Memory] 同步完成: ${synced} 成功, ${failed} 失败`);
        return { synced, failed };
    }
}
exports.MemoryService = MemoryService;
MemoryService.instance = null;
// 导出单例
exports.memoryService = MemoryService.getInstance();
//# sourceMappingURL=MemoryService.js.map