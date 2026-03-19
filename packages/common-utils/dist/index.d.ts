/**
 * OpenClaw 公共工具库 - 统一入口
 *
 * @package @openclaw/common-utils
 * @version 1.0.0
 */
export { getPool, closePool, closeAllPools, getConnection, withTransaction, defaultDbConfig, } from './database';
export type { DatabaseConfig, Pool, PoolConnection, QueryResult, FieldPacket, RowDataPacket, OkPacket, } from './database';
export { PROJECT_PATHS, getProjectRoot, getModulePaths, ensurePaths, ensureModulePaths, } from './config';
//# sourceMappingURL=index.d.ts.map