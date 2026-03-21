#!/usr/bin/env node

const { getChapterRepository } = require('./extensions/apps/novel-manager/dist/core/fanqie-simple-pipeline/ChapterRepository');

async function check() {
  const repo = getChapterRepository();
  
  const workInfo = await repo.getWorkInfo(9);
  console.log('作品:', workInfo?.title);
  
  const ch100 = await repo.getChapterByNumber(9, 100);
  console.log('第100章:', ch100 ? '存在' : '不存在');
  
  const ch101 = await repo.getChapterByNumber(9, 101);
  console.log('第101章:', ch101 ? '存在' : '不存在');
  
  if (ch101) {
    console.log('第101章字数:', ch101.wordCount);
    console.log('第101章标题:', ch101.title);
  }
}

check();
