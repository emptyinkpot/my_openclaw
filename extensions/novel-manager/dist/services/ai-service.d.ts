/**
 * AI内容生成服务
 */
export interface AIGenTask {
    id: string;
    workId: string;
    chapterId: string;
    chapterNumber: number;
    prompt?: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
    result?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
export interface AIImportConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
}
export declare class AIService {
    private config;
    constructor();
    getConfig(): AIImportConfig;
    /**
     * 模拟AI生成
     */
    generateContent(prompt: string): Promise<{
        content: string;
        error?: string;
    }>;
}
//# sourceMappingURL=ai-service.d.ts.map