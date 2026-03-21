
/**
 * 简单的数据库修改脚本
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com',
  port: 22295,
  user: 'openclaw',
  password: 'Lgp15237257500',
  database: 'cloudbase-4glvyyq9f61b19cd',
};

const sqlStatements = [
  // 1. 修改 works 表的 status 字段
  `ALTER TABLE works MODIFY COLUMN status VARCHAR(50) DEFAULT 'outline' COMMENT '作品状态（outline/pending/audited/published）'`,
  
  // 2. 修改 chapters 表的 status 字段
  `ALTER TABLE chapters MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending' COMMENT '章节状态（outline/pending/audited/published）'`,
];

async function checkAndAddColumn(connection, tableName, columnName, columnDefinition) {
  try {
    // 先检查列是否存在
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `, [tableName, columnName]);
    
    const exists = rows[0].count > 0;
    
    if (exists) {
      console.log(`✅ 列 ${tableName}.${columnName} 已存在，跳过`);
      return true;
    }
    
    // 列不存在，添加
    console.log(`🔧 添加列 ${tableName}.${columnName}...`);
    await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`✅ 列 ${tableName}.${columnName} 添加成功`);
    return true;
    
  } catch (error) {
    console.error(`❌ 处理列 ${tableName}.${columnName} 失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 开始执行数据库修改...\n`;
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 1. 执行简单的 ALTER TABLE 语句
    for (const sql of sqlStatements) {
      try {
        console.log(`执行: ${sql.substring(0, 80)}...`);
        await connection.execute(sql);
        console.log('✅ 执行成功\n');
      } catch (error) {
        console.log(`⚠️  执行失败（可能已存在）: ${error.message}\n`);
      }
    }
    
    // 2. 添加审核相关字段
    console.log('🔧 添加审核相关字段...\n');
    
    await checkAndAddColumn(
      connection,
      'chapters',
      'audit_status',
      "VARCHAR(50) DEFAULT 'pending' COMMENT '审核状态（pending/reviewing/passed/failed）'
    );
    
    await checkAndAddColumn(
      connection,
      'chapters',
      'audit_issues',
      "JSON COMMENT '审核问题列表'"
    );
    
    await checkAndAddColumn(
      connection,
      'chapters',
      'suggested_action',
      "VARCHAR(50) DEFAULT 'none' COMMENT '建议操作（auto_fix/manual/none）'
    );
    
    // 3. 验证结果
    console.log('\n📊 验证修改结果...');
    
    console.log('\n--- works 表结构 ---');
    const [worksColumns] = await connection.execute('DESCRIBE works');
    console.table(worksColumns);
    
    console.log('\n--- chapters 表结构 ---');
    const [chaptersColumns] = await connection.execute('DESCRIBE chapters');
    console.table(chaptersColumns);
    
    console.log('\n🎉 数据库修改完成！');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();

