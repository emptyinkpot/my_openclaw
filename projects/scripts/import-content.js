#!/usr/bin/env node
/**
 * 瀵煎叆绔犺妭姝ｆ枃锛堜紭鍖栫増锛? * 鍙洿鏂癱ontent瀛楁锛屼笉鍒犻櫎浠讳綍鏁版嵁
 */
const { NovelDB } = require('../utils/db-helper');
const fs = require('fs');

const dbConfig = {
  host: '127.0.0.1',
  port: 22295,
  user: 'openclaw',
  password: 'CHANGE_ME_DB_PASSWORD',
  database: 'app_db',
  charset: 'utf8mb4'
};

async function importContent(jsonFile, workId) {
  const db = await new NovelDB(dbConfig).connect();
  
  try {
    const chapters = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`鍑嗗瀵煎叆姝ｆ枃鍒颁綔鍝両D=${workId}\n`);
    
    // 鍓嶇疆妫€鏌?    const status = await db.checkWorkStatus(workId);
    console.log('鐜版湁鏁版嵁鐘舵€?');
    console.log(`  鎬荤珷鑺? ${status.totalChapters}`);
    console.log(`  鏈夋鏂? ${status.withContent}绔燻);
    console.log(`  绌虹珷鑺? ${status.emptyChapters}绔燶n`);
    
    // 纭繚绔犺妭璁板綍瀛樺湪锛堝垱寤哄崰浣嶏級
    console.log('纭繚绔犺妭璁板綍瀛樺湪...');
    for (const ch of chapters) {
      const volNum = Math.ceil(ch.number / 40);
      await db.ensureChapterExists(workId, ch.number, ch.title, volNum);
    }
    
    // 瀵煎叆姝ｆ枃
    console.log('瀵煎叆姝ｆ枃鍐呭...\n');
    const result = await db.importContentSafe(workId, chapters);
    
    console.log(`\n鉁?瀹屾垚:`);
    console.log(`  宸叉洿鏂? ${result.updated}绔燻);
    console.log(`  璺宠繃(鍐呭杩囩煭): ${result.skipped}绔燻);
    
    // 鏇存柊浣滃搧鐘舵€?    const newStatus = await db.checkWorkStatus(workId);
    await db.conn.execute(
      'UPDATE works SET current_chapters = ?, status = ? WHERE id = ?',
      [newStatus.withContent, 'ongoing', workId]
    );
    
    console.log(`\n浣滃搧鐘舵€佹洿鏂? ${newStatus.withContent}绔犳鏂嘸);
    
  } catch (err) {
    console.error('鉂?閿欒:', err.message);
  } finally {
    await db.close();
  }
}

// 鐢ㄦ硶: node import-content.js <json鏂囦欢> <workId>
const [,, jsonFile, workId] = process.argv;
if (!jsonFile || !workId) {
  console.log('鐢ㄦ硶: node import-content.js <json鏂囦欢> <浣滃搧ID>');
  process.exit(1);
}

importContent(jsonFile, parseInt(workId));

