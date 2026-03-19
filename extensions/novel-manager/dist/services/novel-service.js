"use strict";
/**
 * 小说数据服务
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
exports.NovelService = void 0;
const database_1 = require("../core/database");
class NovelService {
    constructor() {
        this.db = (0, database_1.getDatabaseManager)();
    }
    /**
     * 获取所有作品
     */
    async getWorks(filter) {
        let sql = `
      SELECT w.*, 
        COUNT(c.id) as chapter_count,
        SUM(CASE WHEN c.content IS NOT NULL AND LENGTH(c.content) > 100 THEN 1 ELSE 0 END) as has_content_count
      FROM works w
      LEFT JOIN chapters c ON w.id = c.work_id
    `;
        const conditions = [];
        const params = [];
        if (filter?.status) {
            conditions.push('w.status = ?');
            params.push(filter.status);
        }
        if (filter?.platform) {
            conditions.push('w.platform = ?');
            params.push(filter.platform);
        }
        if (filter?.search) {
            conditions.push('(w.title LIKE ? OR w.description LIKE ?)');
            params.push(`%${filter.search}%`, `%${filter.search}%`);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' GROUP BY w.id ORDER BY w.id';
        return await this.db.query(sql, params);
    }
    /**
     * 获取作品详情
     */
    async getWorkById(id) {
        const work = await this.db.queryOne(`
      SELECT w.*, COUNT(c.id) as chapter_count
      FROM works w
      LEFT JOIN chapters c ON w.id = c.work_id
      WHERE w.id = ?
      GROUP BY w.id
    `, [id]);
        if (!work)
            return null;
        // 获取章节列表
        const chapters = await this.db.query(`
      SELECT * FROM chapters WHERE work_id = ? ORDER BY chapter_number
    `, [id]);
        // 获取角色列表
        const characters = await this.db.query(`
      SELECT * FROM characters WHERE work_id = ? ORDER BY id
    `, [id]);
        // 获取卷纲
        const volumes = await this.db.query(`
      SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number
    `, [id]);
        return {
            ...work,
            chapters,
            characters,
            volumes,
        };
    }
    /**
     * 获取章节详情
     */
    async getChapterById(id) {
        return await this.db.queryOne(`
      SELECT * FROM chapters WHERE id = ?
    `, [id]);
    }
    /**
     * 获取作品的所有章节
     */
    async getChaptersByWorkId(workId) {
        return await this.db.query(`
      SELECT id, chapter_number, title, word_count, status, created_at, updated_at
      FROM chapters WHERE work_id = ? ORDER BY chapter_number
    `, [workId]);
    }
    /**
     * 获取作品的所有角色
     */
    async getCharactersByWorkId(workId) {
        return await this.db.query(`
      SELECT * FROM characters WHERE work_id = ? ORDER BY id
    `, [workId]);
    }
    /**
     * 获取统计信息
     */
    async getStats() {
        const [workStats] = await this.db.query('SELECT COUNT(*) as count FROM works');
        const [chapterStats] = await this.db.query('SELECT COUNT(*) as count FROM chapters');
        const [wordStats] = await this.db.query('SELECT SUM(LENGTH(content)) as total FROM chapters WHERE content IS NOT NULL');
        const [hasContentStats] = await this.db.query('SELECT COUNT(*) as count FROM chapters WHERE content IS NOT NULL AND LENGTH(content) > 100');
        const [characterStats] = await this.db.query('SELECT COUNT(*) as count FROM characters');
        return {
            works: parseInt(workStats?.count || '0'),
            chapters: parseInt(chapterStats?.count || '0'),
            totalWords: parseInt(wordStats?.total || '0'),
            has_content: parseInt(hasContentStats?.count || '0'),
            outlines: 0,
            characters: parseInt(characterStats?.count || '0'),
        };
    }
    /**
     * 导入章节
     */
    async importChapters(workId, chapters) {
        return await (0, database_1.withTransaction)(async (conn) => {
            let imported = 0;
            for (const ch of chapters) {
                const [existing] = await conn.execute(`
          SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?
        `, [workId, ch.number]);
                if (existing.length === 0) {
                    await conn.execute(`
            INSERT INTO chapters (work_id, chapter_number, title, content, word_count, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'draft', NOW(), NOW())
          `, [
                        workId,
                        ch.number,
                        ch.title || null,
                        ch.content || null,
                        ch.word_count || ch.content?.length || 0,
                    ]);
                    imported++;
                }
            }
            // 更新作品章节数
            await conn.execute(`
        UPDATE works SET current_chapters = (
          SELECT COUNT(*) FROM chapters WHERE work_id = ?
        ), updated_at = NOW() WHERE id = ?
      `, [workId, workId]);
            return imported;
        });
    }
    /**
     * 删除作品
     */
    async deleteWork(id) {
        return await (0, database_1.withTransaction)(async (conn) => {
            // 删除关联数据
            await conn.execute('DELETE FROM chapters WHERE work_id = ?', [id]);
            await conn.execute('DELETE FROM characters WHERE work_id = ?', [id]);
            await conn.execute('DELETE FROM volume_outlines WHERE work_id = ?', [id]);
            await conn.execute('DELETE FROM chapter_outlines WHERE work_id = ?', [id]);
            await conn.execute('DELETE FROM world_settings WHERE work_id = ?', [id]);
            // 删除作品
            await conn.execute('DELETE FROM works WHERE id = ?', [id]);
            return true;
        });
    }
    /**
     * 更新章节
     */
    async updateChapter(id, data) {
        const updates = [];
        const params = [];
        if (data.title !== undefined) {
            updates.push('title = ?');
            params.push(data.title);
        }
        if (data.content !== undefined) {
            updates.push('content = ?');
            updates.push('word_count = ?');
            params.push(data.content, data.content.length);
        }
        if (data.status !== undefined) {
            updates.push('status = ?');
            params.push(data.status);
        }
        if (updates.length === 0)
            return;
        updates.push('updated_at = NOW()');
        params.push(id);
        await this.db.execute(`
      UPDATE chapters SET ${updates.join(', ')} WHERE id = ?
    `, params);
    }
    /**
     * 根据卷纲生成章节
     */
    async generateChaptersFromVolumes(workId) {
        const volumes = await this.db.query(`
      SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number
    `, [workId]);
        let generated = 0;
        for (const vol of volumes) {
            const rangeMatch = vol.chapter_range?.match(/(\d+)-(\d+)/);
            if (!rangeMatch)
                continue;
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            for (let num = start; num <= end; num++) {
                // 检查是否已存在
                const existing = await this.db.queryOne(`
          SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?
        `, [workId, num]);
                if (!existing) {
                    await this.db.execute(`
            INSERT INTO chapters (work_id, chapter_number, title, content, word_count, status, created_at, updated_at)
            VALUES (?, ?, ?, NULL, 0, 'pending', NOW(), NOW())
          `, [workId, num, `第${num}章`]);
                    generated++;
                }
            }
        }
        // 更新作品章节数
        const total = await this.db.queryOne(`
      SELECT COUNT(*) as count FROM chapters WHERE work_id = ?
    `, [workId]);
        await this.db.execute(`
      UPDATE works SET current_chapters = ?, updated_at = NOW() WHERE id = ?
    `, [total?.count || 0, workId]);
        return { generated, total: total?.count || 0 };
    }
    /**
     * 获取番茄作品列表
     */
    async getFanqieWorks() {
        return await this.db.query(`
      SELECT * FROM fanqie_works ORDER BY updated_at DESC
    `);
    }
    /**
     * 启动番茄发布
     */
    async startFanqiePublish(options) {
        // 这里应该调用 ContentPipeline
        return { success: true, message: '流水线已启动', note: '请查看后台日志' };
    }
    /**
     * 获取经验记录
     */
    async getExperienceRecords() {
        return await this.db.query(`
      SELECT * FROM experience_records ORDER BY timestamp DESC LIMIT 100
    `);
    }
    /**
     * 添加经验记录
     */
    async addExperienceRecord(record) {
        const result = await this.db.execute(`
      INSERT INTO experience_records (
        type, title, description, user_query, solution, 
        experience_applied, experience_gained, tags, difficulty, xp_gained, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
            record.type,
            record.title,
            record.description,
            record.userQuery,
            record.solution,
            JSON.stringify(record.experienceApplied || []),
            JSON.stringify(record.experienceGained || []),
            JSON.stringify(record.tags || []),
            record.difficulty,
            record.xpGained || record.difficulty * 50,
        ]);
        return { id: result.insertId, ...record };
    }
    /**
     * 获取缓存文件列表
     */
    async getCacheFiles() {
        const cacheDir = '/workspace/projects/workspace/storage';
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        if (!fs.existsSync(cacheDir)) {
            return [];
        }
        const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.json'));
        return files.map(f => ({
            name: f,
            path: path.join(cacheDir, f),
            size: fs.statSync(path.join(cacheDir, f)).size,
            modified: fs.statSync(path.join(cacheDir, f)).mtime,
        }));
    }
    /**
     * 获取缓存文件内容
     */
    async getCacheFileContent(name) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const cacheDir = '/workspace/projects/workspace/storage';
        const filePath = path.join(cacheDir, name);
        if (!fs.existsSync(filePath)) {
            throw new Error('文件不存在');
        }
        return fs.readFileSync(filePath, 'utf-8');
    }
    /**
     * 保存缓存文件内容
     */
    async saveCacheFileContent(name, content) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const cacheDir = '/workspace/projects/workspace/storage';
        const filePath = path.join(cacheDir, name);
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
}
exports.NovelService = NovelService;
//# sourceMappingURL=novel-service.js.map