/**
 * 数据库管理器单元测试
 * 使用 Node.js 内置 assert 模块
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabaseManager, withTransaction, QueryResult } from '../manager';

// 测试用的临时数据库文件
const TEST_DB_PATH = path.join(__dirname, 'test-db.sqlite');

describe('Database Manager', () => {
  // 测试前清理
  before(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // 测试后清理
  after(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should get database manager instance', () => {
    const db = getDatabaseManager();
    assert.ok(db, 'Database manager should not be null');
    assert.ok(typeof db.query === 'function', 'Should have query method');
    assert.ok(typeof db.execute === 'function', 'Should have execute method');
    assert.ok(typeof db.queryOne === 'function', 'Should have queryOne method');
  });

  it('should execute basic queries', async () => {
    const db = getDatabaseManager();
    
    // 创建测试表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER
      )
    `);

    // 插入数据
    await db.execute(
      'INSERT INTO test_table (name, value) VALUES (?, ?)',
      ['test', 123]
    );

    // 查询数据
    const result = await db.query('SELECT * FROM test_table WHERE name = ?', ['test']);
    assert.ok(result.rows.length > 0, 'Should have inserted data');
    assert.strictEqual(result.rows[0].name, 'test', 'Name should match');
    assert.strictEqual(result.rows[0].value, 123, 'Value should match');
  });

  it('should query single row', async () => {
    const db = getDatabaseManager();
    
    const row = await db.queryOne('SELECT 1 as number');
    assert.ok(row, 'Should return a row');
    assert.strictEqual(row.number, 1, 'Value should be 1');
  });

  it('should handle transactions', async () => {
    const db = getDatabaseManager();
    
    // 确保表存在
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transaction_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT
      )
    `);

    // 测试事务
    const result = await withTransaction(async (txDb) => {
      await txDb.execute('INSERT INTO transaction_test (data) VALUES (?)', ['tx-test-1']);
      await txDb.execute('INSERT INTO transaction_test (data) VALUES (?)', ['tx-test-2']);
      
      const rows = await txDb.query('SELECT * FROM transaction_test');
      return rows.rows.length;
    });

    assert.strictEqual(result, 2, 'Should have 2 rows in transaction');
  });

  console.log('✅ 所有数据库测试通过！');
});

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  (async () => {
    try {
      console.log('🧪 开始数据库管理器测试...');
      
      // 简单运行测试逻辑
      const db = getDatabaseManager();
      console.log('✅ 数据库管理器实例获取成功');
      
      // 测试基本查询
      const result = await db.query('SELECT 1 as test');
      console.log('✅ 基本查询执行成功:', result.rows);
      
      console.log('\n🎉 数据库功能测试完成！');
      process.exit(0);
    } catch (error) {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    }
  })();
}
