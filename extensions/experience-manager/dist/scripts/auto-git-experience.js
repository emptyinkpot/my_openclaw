"use strict";
/**
 * Git自动积累经验功能
 * 在git commit时自动记录经验到经验模块
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAccumulateFromGit = autoAccumulateFromGit;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 数据文件路径 - 优先使用环境变量，否则使用默认路径
const DATA_PATH = process.env.EXPERIENCE_DATA_PATH ||
    path.resolve(__dirname, '../../data/experiences.json');
/**
 * 获取最近一次commit信息
 */
function getLastCommit() {
    const hash = (0, child_process_1.execSync)('git log -1 --pretty=format:%h', { encoding: 'utf-8' }).trim();
    const message = (0, child_process_1.execSync)('git log -1 --pretty=format:%s', { encoding: 'utf-8' }).trim();
    const author = (0, child_process_1.execSync)('git log -1 --pretty=format:%an', { encoding: 'utf-8' }).trim();
    const date = (0, child_process_1.execSync)('git log -1 --pretty=format:%ci', { encoding: 'utf-8' }).trim();
    const files = (0, child_process_1.execSync)('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .filter(f => f.length > 0);
    return { hash, message, author, date, files };
}
/**
 * 解析commit类型
 */
function parseCommitType(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.startsWith('fix:') || lowerMsg.startsWith('fix(')) {
        return {
            type: 'bug_fix',
            difficulty: 3,
            xp: 100,
            tags: ['bugfix', 'debug']
        };
    }
    if (lowerMsg.startsWith('feat:') || lowerMsg.startsWith('feat(')) {
        return {
            type: 'feature_dev',
            difficulty: 4,
            xp: 150,
            tags: ['feature', 'development']
        };
    }
    if (lowerMsg.startsWith('refactor:') || lowerMsg.startsWith('refactor(')) {
        return {
            type: 'refactoring',
            difficulty: 4,
            xp: 120,
            tags: ['refactor', 'cleanup']
        };
    }
    if (lowerMsg.startsWith('docs:') || lowerMsg.startsWith('docs(')) {
        return {
            type: 'learning',
            difficulty: 2,
            xp: 50,
            tags: ['documentation', 'learning']
        };
    }
    if (lowerMsg.startsWith('perf:') || lowerMsg.startsWith('perf(')) {
        return {
            type: 'optimization',
            difficulty: 5,
            xp: 200,
            tags: ['performance', 'optimization']
        };
    }
    return {
        type: 'problem_solving',
        difficulty: 3,
        xp: 80,
        tags: ['maintenance']
    };
}
/**
 * 从commit生成经验记录
 */
function generateExperienceFromCommit(commit) {
    const { type, difficulty, xp, tags } = parseCommitType(commit.message);
    const timestamp = new Date(commit.date).getTime();
    return {
        type,
        title: commit.message.replace(/^(fix|feat|refactor|docs|perf|chore)(\([^)]+\))?:\s*/, ''),
        description: `Git自动记录的提交。提交者: ${commit.author}, 文件变更: ${commit.files.length}个`,
        userQuery: 'Git自动积累',
        solution: commit.message,
        experienceApplied: ['Git工作流程', '代码提交'],
        experienceGained: ['版本控制', '自动化记录', ...tags],
        tags: ['git', 'auto', ...tags],
        difficulty,
        xpGained: xp,
        id: `exp_${timestamp}_${commit.hash}`,
        timestamp
    };
}
/**
 * 从文件加载数据
 */
function loadData() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
        }
    }
    catch (e) {
        console.error('[AutoGitExp] 加载失败:', e);
    }
    return { records: [], version: '1.0' };
}
/**
 * 保存数据到文件
 */
function saveData(data) {
    try {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    }
    catch (e) {
        console.error('[AutoGitExp] 保存失败:', e);
    }
}
/**
 * 主函数 - 自动积累本次commit的经验
 */
function autoAccumulateFromGit() {
    try {
        const commit = getLastCommit();
        const expRecord = generateExperienceFromCommit(commit);
        // 加载现有数据
        const data = loadData();
        // 添加新记录
        data.records.unshift(expRecord);
        // 保存数据
        saveData(data);
        console.log(`✅ 已自动积累经验: ${expRecord.title}`);
        console.log(`   类型: ${expRecord.type} | XP: +${expRecord.xpGained}`);
        console.log(`   提交: ${commit.hash}`);
    }
    catch (error) {
        console.error('❌ 自动积累经验失败:', error.message);
    }
}
// CLI入口
if (require.main === module) {
    autoAccumulateFromGit();
}
//# sourceMappingURL=auto-git-experience.js.map