/**
 * 小说数据服务
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getDatabaseManager, withTransaction } from '../core/database';
import { ContentPipeline } from '../core/ContentPipeline';
import { broadcastProgress } from '../core/pipeline/ProgressManager';
export class NovelService {
    constructor() {
        this.db = getDatabaseManager();
        this.initialized = false;
    }
    /**
     * 初始化数据库表
     */
    initTables() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized)
                return;
            try {
                // 不要删除表，保留数据！使用 IF NOT EXISTS 创建
                // await this.db.execute(`DROP TABLE IF EXISTS fanqie_works`).catch(() => {});
                // 创建fanqie_works表 - 使用utf8mb4字符集（如果不存在）
                yield this.db.execute(`
        CREATE TABLE IF NOT EXISTS fanqie_works (
          id INT PRIMARY KEY AUTO_INCREMENT,
          account_id INT NOT NULL DEFAULT 1,
          work_id VARCHAR(100) NOT NULL,
          title VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          author VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          cover_url TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          chapter_count INT DEFAULT 0,
          word_count VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          status VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ongoing',
          last_synced_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_account_work (account_id, work_id),
          INDEX idx_account (account_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `).catch(() => { });
                // 创建experience_records表
                yield this.db.execute(`
        CREATE TABLE IF NOT EXISTS experience_records (
          id INT PRIMARY KEY AUTO_INCREMENT,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          user_query TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          solution TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          experience_applied JSON,
          experience_gained JSON,
          tags JSON,
          difficulty INT DEFAULT 1,
          xp_gained INT DEFAULT 50,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_type (type),
          INDEX idx_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `).catch(() => { });
                this.initialized = true;
            }
            catch (e) {
                console.error('[NovelService] 初始化表失败:', e);
            }
        });
    }
    /**
     * 获取所有作品
     */
    getWorks(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = `
      SELECT w.*, 
        COUNT(c.id) as chapter_count,
        SUM(CASE WHEN c.content IS NOT NULL AND LENGTH(c.content) > 100 THEN 1 ELSE 0 END) as has_content_count
      FROM works w
      LEFT JOIN chapters c ON w.id = c.work_id
    `;
            const conditions = [];
            const params = [];
            if (filter === null || filter === void 0 ? void 0 : filter.status) {
                conditions.push('w.status = ?');
                params.push(filter.status);
            }
            if (filter === null || filter === void 0 ? void 0 : filter.platform) {
                conditions.push('w.platform = ?');
                params.push(filter.platform);
            }
            if (filter === null || filter === void 0 ? void 0 : filter.search) {
                conditions.push('(w.title LIKE ? OR w.description LIKE ?)');
                params.push(`%${filter.search}%`, `%${filter.search}%`);
            }
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            sql += ' GROUP BY w.id ORDER BY w.id';
            return yield this.db.query(sql, params);
        });
    }
    /**
     * 获取作品详情
     */
    getWorkById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const work = yield this.db.queryOne(`
      SELECT w.*, COUNT(c.id) as chapter_count
      FROM works w
      LEFT JOIN chapters c ON w.id = c.work_id
      WHERE w.id = ?
      GROUP BY w.id
    `, [id]);
            if (!work)
                return null;
            // 获取章节列表
            const chapters = yield this.db.query(`
      SELECT * FROM chapters WHERE work_id = ? ORDER BY chapter_number
    `, [id]);
            // 获取角色列表
            const characters = yield this.db.query(`
      SELECT * FROM characters WHERE work_id = ? ORDER BY id
    `, [id]);
            // 获取卷纲
            const volumes = yield this.db.query(`
      SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number
    `, [id]);
            return Object.assign(Object.assign({}, work), { chapters,
                characters,
                volumes });
        });
    }
    /**
     * 获取章节详情
     */
    getChapterById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.db.queryOne(`
      SELECT * FROM chapters WHERE id = ?
    `, [id]);
        });
    }
    /**
     * 获取作品的所有章节
     */
    getChaptersByWorkId(workId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.db.query(`
      SELECT id, chapter_number, title, word_count, status, created_at, updated_at
      FROM chapters WHERE work_id = ? ORDER BY chapter_number
    `, [workId]);
        });
    }
    /**
     * 获取作品的所有角色
     */
    getCharactersByWorkId(workId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.db.query(`
      SELECT * FROM characters WHERE work_id = ? ORDER BY id
    `, [workId]);
        });
    }
    /**
     * 获取统计信息
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [workStats] = yield this.db.query('SELECT COUNT(*) as count FROM works');
            const [chapterStats] = yield this.db.query('SELECT COUNT(*) as count FROM chapters');
            const [wordStats] = yield this.db.query('SELECT SUM(LENGTH(content)) as total FROM chapters WHERE content IS NOT NULL');
            const [hasContentStats] = yield this.db.query('SELECT COUNT(*) as count FROM chapters WHERE content IS NOT NULL AND LENGTH(content) > 100');
            const [characterStats] = yield this.db.query('SELECT COUNT(*) as count FROM characters');
            return {
                works: parseInt((workStats === null || workStats === void 0 ? void 0 : workStats.count) || '0'),
                chapters: parseInt((chapterStats === null || chapterStats === void 0 ? void 0 : chapterStats.count) || '0'),
                totalWords: parseInt((wordStats === null || wordStats === void 0 ? void 0 : wordStats.total) || '0'),
                has_content: parseInt((hasContentStats === null || hasContentStats === void 0 ? void 0 : hasContentStats.count) || '0'),
                outlines: 0,
                characters: parseInt((characterStats === null || characterStats === void 0 ? void 0 : characterStats.count) || '0'),
            };
        });
    }
    /**
     * 导入章节
     */
    importChapters(workId, chapters) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield withTransaction((conn) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let imported = 0;
                for (const ch of chapters) {
                    const [existing] = yield conn.execute(`
          SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?
        `, [workId, ch.number]);
                    if (existing.length === 0) {
                        yield conn.execute(`
            INSERT INTO chapters (work_id, chapter_number, title, content, word_count, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'draft', NOW(), NOW())
          `, [
                            workId,
                            ch.number,
                            ch.title || null,
                            ch.content || null,
                            ch.word_count || ((_a = ch.content) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        ]);
                        imported++;
                    }
                }
                // 更新作品章节数
                yield conn.execute(`
        UPDATE works SET current_chapters = (
          SELECT COUNT(*) FROM chapters WHERE work_id = ?
        ), updated_at = NOW() WHERE id = ?
      `, [workId, workId]);
                return imported;
            }));
        });
    }
    /**
     * 删除作品
     */
    deleteWork(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield withTransaction((conn) => __awaiter(this, void 0, void 0, function* () {
                // 删除关联数据
                yield conn.execute('DELETE FROM chapters WHERE work_id = ?', [id]);
                yield conn.execute('DELETE FROM characters WHERE work_id = ?', [id]);
                yield conn.execute('DELETE FROM volume_outlines WHERE work_id = ?', [id]);
                yield conn.execute('DELETE FROM chapter_outlines WHERE work_id = ?', [id]);
                yield conn.execute('DELETE FROM world_settings WHERE work_id = ?', [id]);
                // 删除作品
                yield conn.execute('DELETE FROM works WHERE id = ?', [id]);
                return true;
            }));
        });
    }
    /**
     * 更新章节
     */
    updateChapter(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.db.execute(`
      UPDATE chapters SET ${updates.join(', ')} WHERE id = ?
    `, params);
        });
    }
    /**
     * 根据卷纲生成章节
     */
    generateChaptersFromVolumes(workId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const volumes = yield this.db.query(`
      SELECT * FROM volume_outlines WHERE work_id = ? ORDER BY volume_number
    `, [workId]);
            let generated = 0;
            for (const vol of volumes) {
                const rangeMatch = (_a = vol.chapter_range) === null || _a === void 0 ? void 0 : _a.match(/(\d+)-(\d+)/);
                if (!rangeMatch)
                    continue;
                const start = parseInt(rangeMatch[1]);
                const end = parseInt(rangeMatch[2]);
                for (let num = start; num <= end; num++) {
                    // 检查是否已存在
                    const existing = yield this.db.queryOne(`
          SELECT id FROM chapters WHERE work_id = ? AND chapter_number = ?
        `, [workId, num]);
                    if (!existing) {
                        yield this.db.execute(`
            INSERT INTO chapters (work_id, chapter_number, title, content, word_count, status, created_at, updated_at)
            VALUES (?, ?, ?, NULL, 0, 'pending', NOW(), NOW())
          `, [workId, num, `第${num}章`]);
                        generated++;
                    }
                }
            }
            // 更新作品章节数
            const total = yield this.db.queryOne(`
      SELECT COUNT(*) as count FROM chapters WHERE work_id = ?
    `, [workId]);
            yield this.db.execute(`
      UPDATE works SET current_chapters = ?, updated_at = NOW() WHERE id = ?
    `, [(total === null || total === void 0 ? void 0 : total.count) || 0, workId]);
            return { generated, total: (total === null || total === void 0 ? void 0 : total.count) || 0 };
        });
    }
    /**
     * 获取番茄作品列表
     */
    getFanqieWorks() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                return yield this.db.query(`
        SELECT * FROM fanqie_works ORDER BY updated_at DESC
      `);
            }
            catch (e) {
                // 表不存在时返回空数组
                if ((_a = e.message) === null || _a === void 0 ? void 0 : _a.includes("doesn't exist")) {
                    return [];
                }
                throw e;
            }
        });
    }
    /**
     * 获取番茄作品列表（按账号）
     */
    getFanqieWorksByAccount(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                return yield this.db.query(`
        SELECT * FROM fanqie_works WHERE account_id = ? ORDER BY updated_at DESC
      `, [accountId]);
            }
            catch (e) {
                // 表不存在时返回空数组
                if ((_a = e.message) === null || _a === void 0 ? void 0 : _a.includes("doesn't exist")) {
                    return [];
                }
                throw e;
            }
        });
    }
    /**
     * 扫描番茄作品 - 调用 FanqieScanner
     */
    scanFanqieWorks(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log('[NovelService] 扫描番茄作品, accountId:', accountId);
            try {
                // 动态导入 FanqieScanner
                const { getFanqieScanner } = require('../core/pipeline/FanqieScanner');
                const scanner = getFanqieScanner();
                // 调用真实扫描
                const result = yield scanner.scan({
                    accountId,
                    headed: false
                });
                // 保存到数据库
                if (result.success && result.works && result.works.length > 0) {
                    for (const work of result.works) {
                        try {
                            // 将账号ID转换为数字 (account_1 -> 1, account_2 -> 2)
                            const accountNum = parseInt((work.accountId || 'account_1').replace('account_', ''), 10) || 1;
                            yield this.db.execute(`
              INSERT INTO fanqie_works (account_id, work_id, title, chapter_count, word_count, status, last_synced_at)
              VALUES (?, ?, ?, ?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE 
                title = VALUES(title),
                chapter_count = VALUES(chapter_count),
                word_count = VALUES(word_count),
                status = VALUES(status),
                last_synced_at = NOW()
            `, [
                                accountNum,
                                work.workId || work.title,
                                work.title,
                                work.totalChapters || 0,
                                work.wordCount || '',
                                work.status || 'ongoing'
                            ]);
                        }
                        catch (e) {
                            console.error('[NovelService] 保存番茄作品失败:', e);
                        }
                    }
                }
                return {
                    success: result.success,
                    message: result.error || `扫描完成，找到 ${((_a = result.works) === null || _a === void 0 ? void 0 : _a.length) || 0} 个作品`,
                    works: result.works || []
                };
            }
            catch (e) {
                console.error('[NovelService] 扫描失败:', e);
                // 尝试读取缓存
                try {
                    const { getFanqieScanner } = require('../core/pipeline/FanqieScanner');
                    const scanner = getFanqieScanner();
                    const cachedWorks = scanner.readCache(accountId);
                    if (cachedWorks && cachedWorks.length > 0) {
                        return {
                            success: true,
                            message: `从缓存读取到 ${cachedWorks.length} 个作品`,
                            works: cachedWorks
                        };
                    }
                }
                catch (_b) { }
                return {
                    success: false,
                    message: `扫描失败: ${e.message}`,
                    works: []
                };
            }
        });
    }
    /**
     * 启动番茄发布
     */
    startFanqiePublish(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let { workId, startChapter, endChapter, headless = true, dryRun = false, skipAudit = true, progressId, autoNext } = options;
            // 自动模式：扫描第一个作品，获取番茄最新章节，发布下一章
            if (autoNext || workId === 'auto') {
                console.log('[Pipeline] 自动模式：扫描作品...');
                if (progressId) {
                    broadcastProgress(progressId, {
                        status: 'running', step: 'scan', stepLabel: '扫描',
                        current: 0, total: 0, task: '正在扫描番茄作品...', percent: 0, results: []
                    });
                }
                // 扫描作品
                const scanResult = yield this.scanFanqieWorks('account_1');
                if (!scanResult.success || !((_a = scanResult.works) === null || _a === void 0 ? void 0 : _a.length)) {
                    const errorMsg = '未找到番茄作品';
                    if (progressId) {
                        broadcastProgress(progressId, {
                            status: 'error', step: 'scan', stepLabel: '扫描',
                            current: 0, total: 0, task: errorMsg, error: errorMsg, percent: 0, results: []
                        });
                    }
                    return { success: false, message: errorMsg };
                }
                const firstWork = scanResult.works[0];
                workId = firstWork.workId;
                console.log('[Pipeline] 自动选择作品:', firstWork.title, 'workId:', workId);
                if (progressId) {
                    broadcastProgress(progressId, {
                        status: 'running', step: 'scan', stepLabel: '扫描',
                        current: 1, total: 1, task: `已选择: ${firstWork.title}`, percent: 10, results: []
                    });
                }
            }
            // 查找本地作品ID（workId 可能是番茄的字符串ID，需要转换为本地ID）
            let localWorkId = typeof workId === 'number' ? workId : parseInt(workId, 10);
            // 如果 workId 是字符串（番茄ID），通过标题匹配本地作品
            if (typeof workId === 'string' && workId.length > 10) {
                // 从 fanqie_works 表查找作品标题
                console.log('[Pipeline] 查询 fanqie_works, workId:', workId);
                const fanqieWorks = yield this.db.query(`
        SELECT title FROM fanqie_works WHERE work_id = ? LIMIT 1
      `, [workId]);
                console.log('[Pipeline] fanqieWorks 结果:', fanqieWorks);
                if (fanqieWorks && fanqieWorks.length > 0) {
                    const fanqieTitle = fanqieWorks[0].title;
                    console.log('[Pipeline] 番茄作品:', fanqieTitle);
                    // 通过标题匹配本地作品
                    const localWorks = yield this.db.query(`
          SELECT id, title FROM works WHERE title = ? OR title LIKE ? LIMIT 1
        `, [fanqieTitle, `%${fanqieTitle}%`]);
                    console.log('[Pipeline] localWorks 结果:', localWorks);
                    if (localWorks && localWorks.length > 0) {
                        localWorkId = localWorks[0].id;
                        console.log('[Pipeline] 匹配到本地作品:', localWorks[0].title, 'ID:', localWorkId);
                    }
                    else {
                        // 没有匹配的本地作品
                        if (progressId) {
                            broadcastProgress(progressId, {
                                status: 'error',
                                step: 'init',
                                stepLabel: '初始化',
                                current: 0,
                                total: 0,
                                task: '未找到匹配的本地作品',
                                error: `番茄作品 "${fanqieTitle}" 没有对应的本地作品数据`,
                                percent: 0,
                                results: [],
                            });
                        }
                        return {
                            success: false,
                            message: '未找到匹配的本地作品',
                            note: `番茄作品 "${fanqieTitle}" 需要先在本地创建对应的作品`
                        };
                    }
                }
            }
            // 创建流水线实例
            const pipeline = new ContentPipeline();
            // 进度回调
            const onProgress = (event) => {
                console.log('[Pipeline] 进度:', event.step, event.task, event.percent + '%');
                if (progressId) {
                    broadcastProgress(progressId, event);
                }
            };
            // 异步执行发布流程
            pipeline.publishToFanqie({
                workId: localWorkId,
                startChapter,
                endChapter,
                headless,
                dryRun,
                skipStatusCheck: skipAudit,
                onProgress,
            }).then(results => {
                const successCount = results.filter(r => r.success).length;
                console.log(`[Pipeline] 发布完成: 成功 ${successCount}/${results.length}`);
            }).catch(error => {
                console.error('[Pipeline] 发布失败:', error);
                if (progressId) {
                    broadcastProgress(progressId, {
                        status: 'error',
                        step: 'done',
                        stepLabel: '完成',
                        current: 0,
                        total: 0,
                        task: '发布失败',
                        error: error.message,
                        percent: 0,
                        results: [],
                    });
                }
            });
            return {
                success: true,
                message: '流水线已启动',
                note: '请通过 SSE 订阅进度更新: /novel/sse/progress/' + progressId + '?token=YOUR_TOKEN',
                progressId
            };
        });
    }
    /**
     * 获取经验记录
     */
    getExperienceRecords() {
        return __awaiter(this, void 0, void 0, function* () {
            // 先尝试从数据库读取
            try {
                const records = yield this.db.query(`
        SELECT * FROM experience_records ORDER BY timestamp DESC LIMIT 100
      `);
                if (records && records.length > 0) {
                    return records;
                }
            }
            catch (e) {
                console.log('[NovelService] 数据库无经验记录，尝试读取文件');
            }
            // 从experience-manager读取JSON文件
            const fs = require('fs');
            const path = require('path');
            const expPath = '/workspace/projects/extensions/experience-manager/data/experiences.json';
            try {
                if (fs.existsSync(expPath)) {
                    const content = fs.readFileSync(expPath, 'utf-8');
                    const data = JSON.parse(content);
                    return data.records || [];
                }
            }
            catch (e) {
                console.error('[NovelService] 读取经验文件失败:', e);
            }
            return [];
        });
    }
    /**
     * 添加经验记录
     */
    addExperienceRecord(record) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.db.execute(`
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
            return Object.assign({ id: result.insertId }, record);
        });
    }
    /**
     * 获取缓存文件列表
     */
    getCacheFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheDir = '/workspace/projects/workspace/storage';
            const fs = yield import('fs');
            const path = yield import('path');
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
        });
    }
    /**
     * 获取缓存文件内容
     */
    getCacheFileContent(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const fs = yield import('fs');
            const path = yield import('path');
            const cacheDir = '/workspace/projects/workspace/storage';
            const filePath = path.join(cacheDir, name);
            if (!fs.existsSync(filePath)) {
                throw new Error('文件不存在');
            }
            return fs.readFileSync(filePath, 'utf-8');
        });
    }
    /**
     * 保存缓存文件内容
     */
    saveCacheFileContent(name, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const fs = yield import('fs');
            const path = yield import('path');
            const cacheDir = '/workspace/projects/workspace/storage';
            const filePath = path.join(cacheDir, name);
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        });
    }
    /**
     * 调试：检查章节详情
     */
    debugChapter(workId, chapterNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db.query(`
      SELECT 
        chapter_number, 
        title, 
        word_count,
        LENGTH(content) as content_length,
        content IS NULL as content_null,
        publish_status,
        polish_status,
        status
      FROM chapters 
      WHERE work_id = ? AND chapter_number = ?
    `, [workId, chapterNumber]);
            return rows[0] || null;
        });
    }
    /**
     * 调试：测试查询待发布章节
     */
    debugPendingChapters(workId, startChapter, endChapter) {
        return __awaiter(this, void 0, void 0, function* () {
            const sql = `
      SELECT 
        c.chapter_number,
        c.title,
        LENGTH(c.content) as content_length,
        c.publish_status
      FROM chapters c
      WHERE c.content IS NOT NULL 
        AND LENGTH(c.content) > 100
        AND c.work_id = ?
        AND c.chapter_number BETWEEN ? AND ?
        AND (c.publish_status IS NULL OR c.publish_status != 'published')
      ORDER BY c.chapter_number
    `;
            const rows = yield this.db.query(sql, [workId, startChapter, endChapter]);
            return { sql, params: [workId, startChapter, endChapter], count: rows.length, rows };
        });
    }
}
