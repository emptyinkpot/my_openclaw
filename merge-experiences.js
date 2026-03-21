const fs = require('fs');
const path = require('path');

// 读取数据库导出的经验记录
const dbExperiences = JSON.parse(fs.readFileSync('./db-experiences-full.json', 'utf-8'));

// 读取现有的经验记录
const existingPath = './extensions/apps/experience-manager/data/experiences.json';
let existingData;
try {
  existingData = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
} catch (e) {
  existingData = { records: [], version: '1.0' };
}

console.log(`数据库记录数: ${dbExperiences.length}`);
console.log(`现有记录数: ${existingData.records.length}`);

// 转换数据库记录格式
const convertedDBRecords = dbExperiences.map(dbRecord => {
  // 转换 type 字段
  let type = 'problem_solving';
  if (dbRecord.type === 'bug_fix') type = 'bug_fix';
  else if (dbRecord.type === 'feature_dev') type = 'feature_dev';
  else if (dbRecord.type === 'optimization') type = 'optimization';
  else if (dbRecord.type === 'learning') type = 'learning';
  else if (dbRecord.type === 'refactoring') type = 'refactoring';
  else if (dbRecord.type === 'fix') type = 'bug_fix';
  else if (dbRecord.type === 'debug') type = 'bug_fix';
  
  // 转换 timestamp
  let timestamp;
  if (typeof dbRecord.timestamp === 'string') {
    timestamp = new Date(dbRecord.timestamp).getTime();
  } else if (typeof dbRecord.timestamp === 'number') {
    timestamp = dbRecord.timestamp;
  } else {
    timestamp = Date.now();
  }
  
  return {
    id: `db_${dbRecord.id}`,
    timestamp,
    type,
    title: dbRecord.title || '',
    description: dbRecord.description || '',
    userQuery: dbRecord.userQuery || '',
    solution: dbRecord.solution || '',
    experienceApplied: dbRecord.experienceApplied || [],
    experienceGained: dbRecord.experienceGained || [],
    tags: dbRecord.tags || [],
    difficulty: dbRecord.difficulty || 1,
    xpGained: dbRecord.xpGained || 50
  };
});

// 合并记录 - 优先保留数据库记录（去重）
const existingIds = new Set(existingData.records.map(r => r.id));
const newRecords = [...convertedDBRecords];

// 添加现有的不重复记录
existingData.records.forEach(record => {
  if (!existingIds.has(record.id) || !convertedDBRecords.some(dbr => dbr.id === record.id)) {
    newRecords.push(record);
  }
});

// 按时间戳排序（最新的在前）
newRecords.sort((a, b) => b.timestamp - a.timestamp);

// 保存合并后的数据
const mergedData = {
  records: newRecords,
  version: '1.0'
};

fs.writeFileSync(existingPath, JSON.stringify(mergedData, null, 2));
console.log(`\n✅ 合并完成！总记录数: ${newRecords.length}`);
console.log(`   - 数据库记录: ${dbExperiences.length}`);
console.log(`   - 原有记录: ${existingData.records.length}`);
console.log(`   - 保存到: ${existingPath}`);

// 同时保存笔记数据
const notes = JSON.parse(fs.readFileSync('./db-notes.json', 'utf-8'));
const notesPath = './extensions/apps/experience-manager/data/notes.json';
fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
console.log(`\n✅ 笔记数据已保存: ${notes.length} 条`);
console.log(`   - 保存到: ${notesPath}`);
