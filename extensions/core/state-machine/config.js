"use strict";
/**
 * 状态机模块 - 配置和规则定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_COLORS = exports.STATUS_LABELS = exports.STATE_TRANSITION_RULES = exports.DEFAULT_CONFIG = void 0;
// 默认状态机配置
exports.DEFAULT_CONFIG = {
    strictMode: true,
    logTransitions: true
};
// 状态转换规则定义
exports.STATE_TRANSITION_RULES = [
    {
        from: 'outline',
        to: ['first_draft'],
        description: '大纲 → 只能变成初稿（生成内容后）'
    },
    {
        from: 'first_draft',
        to: ['outline', 'polished'],
        description: '初稿 → 可以回大纲或去润色'
    },
    {
        from: 'polished',
        to: ['first_draft', 'audited'],
        description: '已润色 → 可以回初稿或去审核'
    },
    {
        from: 'audited',
        to: ['polished', 'published'],
        description: '已审核 → 可以回润色或去发布'
    },
    {
        from: 'published',
        to: ['audited'],
        description: '已发布 → 只能回已审核'
    }
];
// 状态显示名称
exports.STATUS_LABELS = {
    outline: '大纲',
    first_draft: '初稿',
    polished: '已润色',
    audited: '已审核',
    published: '已发布'
};
// 状态颜色
exports.STATUS_COLORS = {
    outline: '#9a6700', // 黄色-警告
    first_draft: '#6e7781', // 灰色
    polished: '#0969da', // 蓝色
    audited: '#1a7f37', // 绿色
    published: '#8250df' // 紫色
};
//# sourceMappingURL=config.js.map