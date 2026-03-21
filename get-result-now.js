#!/usr/bin/env node

/**
 * 快速获取润色结果
 */

const { PolishPipeline } = require('./extensions/apps/novel-manager/dist/core/content-craft/src/pipeline');
const { configManager } = require('./extensions/apps/novel-manager/dist/core/content-craft/src/config-manager');
const fs = require('fs');

console.log('=== 快速润色测试 ===\n');

// 用户提供的文本（前 2000 字符，确保能快速完成）
const testText = `一八八零年三月九日东京芝区红叶馆的空气中，悬浮着清炖鱼翅的醇厚与刺身酱油的咸腥。一场名为“兴亚会”成立恳亲的晚宴正在举行，菜单之上，“红烧甲鱼”与“鸡肉治部煮”并列，汉文誊写的菜名工整而矜持。这份菜单本身便是一份沉默的宣言，试图在杯盏与箸尖之间，为隔海相望的两个古老帝国，调配出一种基于肠胃共鸣的文化同盟想象。发起人曾根俊虎，这位前海军少尉，在日后编纂的《兴亚会报告》中，以汉文笔调挥就慷慨之词：“察宇内大势，欧罗巴诸邦凌驾六洲……我亚洲诸国，宜戮力同心，以御外侮。”席间有清国公使何如璋、副使张斯桂端坐，有日本贵族院议员敛衽，亦有未能列席却心向往之的朝鲜开化党人金玉均，在汉城宫廷的阴影下焦灼徘徊。此刻，清酒的热流似乎暂时融化了地缘的坚冰，“亚细亚”这个源于古希腊地理学的称谓，第一次在东方的语境中，被赋予了一种超越地理的、近乎血缘的情感温度与政治期许。然而，任何敏锐的观察者都能从菜单边缘那滴不慎滴落的、浓黑如墨的酱油污渍中，窥见这场联谊本质上的脆弱与悬浮。这污渍并非瑕疵，而是谶纬，它预示着这锅由理想主义、文化乡愁与战略算计共同熬煮的“兴亚”浓汤，终将蒸发殆尽，露出釜底冰冷坚硬的现实骨殖。亚细亚主义的思想史，便从这桌酒席的微妙气氛中，正式拉开了其充满悖论与病变的序幕。

若要追溯这思潮的源头，必须将目光投向更早的四分之一个世纪，投向一八五三年七月那几艘闯入江户湾的黑色舰影。马修·卡尔布雷思·佩里准将带来的，远不止美国总统的国书与通商要求。那喷吐着不祥黑烟的蒸汽明轮船，是一柄刺穿德川幕府二百年“泰平之眠”的冰冷锥刺，更是一面映照出整个东亚文明未来厄运的镜子。日本知识阶层的惊恐，很大程度上是一种“镜像式”的惊恐——他们对岸大陆的巨变，早已通过荷兰商馆的传闻与汉文译著的只言片语，勾勒出一幅令人战栗的图景。鸦片战争的炮火，魏源《海国图志》中“师夷长技以制夷”的疾呼与天朝崩塌的惨状，共同构成了一部鲜活而残酷的预演。日本骤然醒悟：自己并非西方殖民狂潮中孤独的特例，而是东亚文明圈整体性溃堤前，最先感知到洪水寒意的前沿堤坝。由此，一种最朴素的、基于生存本能的地缘政治意识开始萌发：唇亡齿寒。幕末志士吉田松阴在幽暗的野山狱中疾书：“我与清、朝鲜，地理最近，人情最相似，宜合力以抗西洋。”此种论调，彻底摒弃了丰臣秀吉时代“席卷大明四百州”的狂妄野心，转而强调一种防御性的、文化同源者的命运共同体。这可以说是亚细亚主义最原始也最洁净的胚胎，充满了在绝境中携手求生的道德正当性。然而，这个胚胎自孕育之初，便浸泡在由西方强权所定义的、弱肉强食的国际关系培养液中。当日本自身通过“明治维新”开始急速“西化”时，它对这一胚胎的看法，便发生了致命的裂变。`;

async function runQuick() {
  try {
    const pipeline = new PolishPipeline();
    const settings = configManager.getSettings();
    
    // 禁用一些耗时步骤以快速获取结果
    settings.steps.semanticCheck = { enabled: false };
    settings.steps.finalReview = { enabled: false };
    
    console.log('正在润色...\n');
    
    const result = await pipeline.execute(
      { text: testText, settings },
      (p) => {
        process.stdout.write(`\r进度: ${p.progress}% - ${p.message}`);
      }
    );
    
    console.log('\n\n✅ 润色完成！\n');
    console.log('='.repeat(80));
    console.log('📝 原始文本：');
    console.log('='.repeat(80));
    console.log(testText);
    console.log('\n');
    console.log('='.repeat(80));
    console.log('✨ 润色后文本：');
    console.log('='.repeat(80));
    console.log(result.text);
    console.log('\n');
    
    // 保存结果
    fs.writeFileSync('/workspace/projects/final-polish-result.txt', result.text, 'utf-8');
    console.log('✅ 结果已保存到 final-polish-result.txt');
    
  } catch (e) {
    console.error('错误:', e);
  }
}

runQuick();
