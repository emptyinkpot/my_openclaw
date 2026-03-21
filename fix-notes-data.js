const fs = require('fs');
const path = require('path');

const notesPath = './extensions/apps/experience-manager/data/notes.json';

console.log('读取当前笔记数据...');
const currentData = JSON.parse(fs.readFileSync(notesPath, 'utf-8'));

console.log(`当前数据类型: ${Array.isArray(currentData) ? '数组' : '对象'}`);
console.log(`当前数据长度: ${Array.isArray(currentData) ? currentData.length : 'N/A'}`);

// 转换格式
let fixedData;
if (Array.isArray(currentData)) {
  // 转换字段名
  const notes = currentData.map(note => ({
    id: `db_note_${note.id}`,
    title: note.title,
    content: note.content,
    category: note.category,
    tags: note.tags,
    created_at: note.createdAt,
    updated_at: note.updatedAt
  }));
  
  fixedData = {
    notes,
    version: '1.0'
  };
  
  console.log('\n已转换为正确格式!');
  console.log(`笔记数量: ${notes.length}`);
} else if (currentData.notes) {
  console.log('\n数据格式已经是正确的!');
  fixedData = currentData;
} else {
  console.log('\n未知数据格式!');
  fixedData = { notes: [], version: '1.0' };
}

// 保存修复后的数据
fs.writeFileSync(notesPath, JSON.stringify(fixedData, null, 2));
console.log(`\n已保存到: ${notesPath}`);
