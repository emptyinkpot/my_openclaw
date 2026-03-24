// QMD 工具定义 - 用于 OpenClaw 集成

/**
 * 使用 QMD 搜索文档
 * @param {string} query - 搜索查询
 * @param {string} collection - 集合名称（可选）
 * @param {number} limit - 结果数量限制（默认10）
 * @param {number} minScore - 最小分数阈值（默认0.3）
 * @returns {Promise<Array>} 搜索结果
 */
async function qmdSearch(query, collection = null, limit = 10, minScore = 0.3) {
    let cmd = `npx @tobilu/qmd search "${query.replace(/"/g, '\\"')}" --json -n ${limit}`;
    
    if (collection) {
        cmd += ` -c ${collection}`;
    }
    
    const result = await exec(cmd);
    const documents = JSON.parse(result.stdout || '[]');
    
    // 过滤低于阈值的文档
    return documents.filter(doc => doc.score >= minScore);
}

/**
 * 使用 QMD 高级查询（混合+重排序）
 * @param {string} query - 搜索查询
 * @param {string} collection - 集合名称（可选）
 * @param {boolean} all - 返回所有匹配项
 * @param {boolean} files - 返回文件路径
 * @param {number} minScore - 最小分数阈值
 * @returns {Promise<Array>} 查询结果
 */
async function qmdQuery(query, collection = null, all = false, files = false, minScore = 0.3) {
    let cmd = `npx @tobilu/qmd query "${query.replace(/"/g, '\\"')}" --json`;
    
    if (collection) {
        cmd += ` -c ${collection}`;
    }
    
    if (all) {
        cmd += ' --all';
    }
    
    if (files) {
        cmd += ' --files';
    }
    
    cmd += ` --min-score ${minScore}`;
    
    const result = await exec(cmd);
    return JSON.parse(result.stdout || '[]');
}

/**
 * 获取特定文档
 * @param {string} docPath - 文档路径或 docid
 * @param {boolean} full - 返回完整内容
 * @returns {Promise<string>} 文档内容
 */
async function qmdGet(docPath, full = false) {
    let cmd = `npx @tobilu/qmd get "${docPath}"`;
    
    if (full) {
        cmd += ' --full';
    }
    
    const result = await exec(cmd);
    return result.stdout;
}

/**
 * 批量获取文档
 * @param {string} pattern - 文件模式或逗号分隔的列表
 * @param {number} maxBytes - 最大字节数限制
 * @returns {Promise<Array>} 文档列表
 */
async function qmdMultiGet(pattern, maxBytes = null) {
    let cmd = `npx @tobilu/qmd multi-get "${pattern}" --json`;
    
    if (maxBytes) {
        cmd += ` --max-bytes ${maxBytes}`;
    }
    
    const result = await exec(cmd);
    return JSON.parse(result.stdout || '[]');
}

/**
 * 检查 QMD 状态
 * @returns {Promise<Object>} 状态信息
 */
async function qmdStatus() {
    const result = await exec('npx @tobilu/qmd status --json');
    return JSON.parse(result.stdout || '{}');
}

/**
 * 初始化 QMD 集合
 * @param {string} path - 目录路径
 * @param {string} name - 集合名称
 * @returns {Promise<string>} 执行结果
 */
async function qmdCollectionAdd(path, name) {
    const result = await exec(`npx @tobilu/qmd collection add "${path}" --name "${name}"`);
    return result.stdout;
}

/**
 * 添加上下文描述
 * @param {string} collection - 集合引用
 * @param {string} description - 上下文描述
 * @returns {Promise<string>} 执行结果
 */
async function qmdContextAdd(collection, description) {
    const result = await exec(`npx @tobilu/qmd context add "${collection}" "${description}"`);
    return result.stdout;
}

/**
 * 生成嵌入向量
 * @returns {Promise<string>} 执行结果
 */
async function qmdEmbed() {
    const result = await exec('npx @tobilu/qmd embed');
    return result.stdout;
}

// 导出工具
module.exports = {
    qmdSearch,
    qmdQuery,
    qmdGet,
    qmdMultiGet,
    qmdStatus,
    qmdCollectionAdd,
    qmdContextAdd,
    qmdEmbed
};