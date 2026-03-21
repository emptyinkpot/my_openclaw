
/**
 * 执行数据库修改
 */

import { getDatabaseManager } from './extensions/apps/novel-manager/core/data-scan-storage/database';

async function main() {
  console.log('🔧 开始执行数据库修改...\n');
  
  const db = getDatabaseManager();
  
  try {
    // 1. 修改 works 表的 status 字段
    console.log('1️⃣  修改 works 表的 status 字段...');
    try {
      await db.execute(`
        ALTER TABLE works 
        MODIFY COLUMN status VARCHAR(50) 
        DEFAULT 'outline' 
        COMMENT '作品状态（outline/pending/audited/published）'
      `);
      console.log('✅ works 表 status 字段修改成功\n');
    } catch (error: any) {
      console.log(`⚠️  works 表修改失败（可能已修改过）: ${error.message}\n`);
    }
    
    // 2. 修改 chapters 表的 status 字段
    console.log('2️⃣  修改 chapters 表的 status 字段...');
    try {
      await db.execute(`
        ALTER TABLE chapters 
        MODIFY COLUMN status VARCHAR(50) 
        DEFAULT 'pending' 
        COMMENT '章节状态（outline/pending/audited/published）'
      `);
      console.log('✅ chapters 表 status 字段修改成功\n');
    } catch (error: any) {
      console.log(`⚠️  chapters 表修改失败（可能已修改过）: ${error.message}\n`);
    }
    
    // 3. 添加 audit_status 字段
    console.log('3️⃣  添加 audit_status 字段...');
    try {
      await db.execute(`
        ALTER TABLE chapters 
        ADD COLUMN audit_status VARCHAR(50) 
        DEFAULT 'pending' 
        COMMENT '审核状态（pending/reviewing/passed/failed）'
        AFTER status
      `);
      console.log('✅ audit_status 字段添加成功\n');
    } catch (error: any) {
      console.log(`⚠️  audit_status 字段添加失败（可能已存在）: ${error.message}\n`);
    }
    
    // 4. 添加 audit_issues 字段
    console.log('4️⃣  添加 audit_issues 字段...');
    try {
      await db.execute(`
        ALTER TABLE chapters 
        ADD COLUMN audit_issues JSON 
        COMMENT '审核问题列表'
        AFTER audit_status
      `);
      console.log('✅ audit_issues 字段添加成功\n');
    } catch (error: any) {
      console.log(`⚠️  audit_issues 字段添加失败（可能已存在）: ${error.message}\n`);
    }
    
    // 5. 添加 suggested_action 字段
    console.log('5️⃣  添加 suggested_action 字段...');
    try {
      await db.execute(`
        ALTER TABLE chapters 
        ADD COLUMN suggested_action VARCHAR(50) 
        DEFAULT 'none' 
        COMMENT '建议操作（auto_fix/manual/none）'
        AFTER audit_issues
      `);
      console.log('✅ suggested_action 字段添加成功\n');
    } catch (error: any) {
      console.log(`⚠️  suggested_action 字段添加失败（可能已存在）: ${error.message}\n`);
    }
    
    // 6. 验证结果
    console.log('6️⃣  验证修改结果...\n');
    
    console.log('--- works 表结构 ---');
    const worksColumns = await db.query('DESCRIBE works');
    console.table(worksColumns);
    
    console.log('\n--- chapters 表结构 ---');
    const chaptersColumns = await db.query('DESCRIBE chapters');
    console.table(chaptersColumns);
    
    console.log('\n🎉 数据库修改完成！');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  }
}

main();

