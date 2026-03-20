#!/usr/bin/env node

/**
 * 直接查询 MySQL 数据库，查看表结构
 */

console.log('🔍 查询 MySQL 数据库表结构...\n');

const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
    port: 22295,
    user: 'openclaw',
    password: 'Lgp15237257500',
    database: 'cloudbase-4glvyyq9f61b19cd',
  });

  try {
    // 1. 获取所有表
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 数据库表列表:');
    const tableNames = tables.map((t: any) => Object.values(t)[0]);
    tableNames.forEach((name: string, i: number) => {
      console.log(`   ${i + 1}. ${name}`);
    });

    // 2. 查看每个表的结构
    console.log('\n' + '='.repeat(80));
    console.log('📊 详细表结构:');
    console.log('='.repeat(80));

    for (const tableName of tableNames) {
      console.log(`\n📄 表: ${tableName}`);
      console.log('-'.repeat(80));

      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.log('   字段列表:');
      (columns as any[]).forEach((col: any) => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY: ${col.Key}` : ''} ${col.Default ? `DEFAULT: ${col.Default}` : ''}`);
      });

      // 查看前3条数据
      console.log('\n   示例数据 (前3条):');
      try {
        const [rows] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
        if ((rows as any[]).length > 0) {
          console.log('   ' + JSON.stringify(rows, null, 6).replace(/\n/g, '\n   '));
        } else {
          console.log('   (无数据)');
        }
      } catch (e) {
        console.log('   (查询示例数据失败)');
      }
    }

  } finally {
    await connection.end();
  }
}

checkSchema().catch(console.error);
