#!/usr/bin/env node
/**
 * 瀵煎叆绔犺妭缁嗙翰锛堜紭鍖栫増锛? * 鍙搷浣渃hapter_outlines琛紝涓嶅姩chapters姝ｆ枃
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

async function importOutlines(jsonFile, workId) {
  const db = await new NovelDB(dbConfig).connect();
  
  try {
    const outlines = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`鍑嗗瀵煎叆 ${outlines.length} 绔犵粏绾插埌浣滃搧ID=${workId}\n`);
    
    // 鍓嶇疆妫€鏌?    const status = await db.checkWorkStatus(workId);
    console.log('鐜版湁鏁版嵁鐘舵€?');
    console.log(`  鎬荤珷鑺? ${status.totalChapters}`);
    console.log(`  鏈夋鏂? ${status.withContent}绔燻);
    console.log(`  绌虹珷鑺? ${status.emptyChapters}绔燻);
    console.log(`  缁嗙翰鏁? ${status.outlineCount}鏉n`);
    
    if (status.withContent > 0) {
      console.log(`鈿狅笍 璀﹀憡: 璇ヤ綔鍝佸凡鏈?${status.withContent} 绔犳鏂囧唴瀹筦);
      console.log('鉁?鏈剼鏈彧鏇存柊缁嗙翰锛屼笉浼氬姩姝ｆ枃\n');
    }
    
    // 瀵煎叆缁嗙翰锛堝彧鎿嶄綔chapter_outlines琛級
    let inserted = 0;
    for (const ol of outlines) {
      const volNum = Math.ceil(ol.number / 40); // 姣?0绔犱竴鍗?      await db.upsertOutline(workId, {
        number: ol.number,
        title: ol.title,
        plotSummary: ol.plot_summary,
        characters: ol.characters,
        volumeNum: volNum
      });
      inserted++;
    }
    
    console.log(`鉁?宸插鍏?鏇存柊 ${inserted} 绔犵粏绾瞏);
    
    // 楠岃瘉
    const newStatus = await db.checkWorkStatus(workId);
    console.log(`\n楠岃瘉: chapter_outlines琛ㄧ幇鍦ㄦ湁 ${newStatus.outlineCount} 鏉¤褰昤);
    console.log(`       chapters琛ㄦ鏂囨湭鍔? ${newStatus.withContent}绔燻);
    
  } catch (err) {
    console.error('鉂?閿欒:', err.message);
  } finally {
    await db.close();
  }
}

// 鐢ㄦ硶: node import-outlines.js <json鏂囦欢> <workId>
const [,, jsonFile, workId] = process.argv;
if (!jsonFile || !workId) {
  console.log('鐢ㄦ硶: node import-outlines.js <json鏂囦欢> <浣滃搧ID>');
  process.exit(1);
}

importOutlines(jsonFile, parseInt(workId));

