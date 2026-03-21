/**
 * ============================================================================
 * 预设文献库数据
 * ============================================================================
 * 基于用户提供的引用与化用素材库整理
 */

import type { LiteratureResource } from '@/types';

/** 预设文献数据 */
export const PRESET_LITERATURE: LiteratureResource[] = [
  // ========== 核心思想家、战略家与历史行动者言论 ==========
  
  // 日方/右翼视角
  {
    id: 'lit-石原莞尔',
    type: 'book',
    title: '最终战争论',
    author: '石原莞尔',
    preferredAuthors: ['石原莞尔'],
    tags: ['历史', '军事', '日本'],
    priority: 5,
    note: '关东军核心战略思想，"满蒙乃日本之生命线"等论述',
    createdAt: Date.now(),
  },
  {
    id: 'lit-战争史大观',
    type: 'book',
    title: '战争史大观',
    author: '石原莞尔',
    preferredAuthors: ['石原莞尔'],
    tags: ['历史', '军事', '日本'],
    priority: 5,
    note: '"未来战争乃代表东方王道之日本与西方霸道之美国之决战"',
    createdAt: Date.now(),
  },
  {
    id: 'lit-日本改造法案大纲',
    type: 'book',
    title: '日本改造法案大纲',
    author: '北一辉',
    preferredAuthors: ['北一辉'],
    tags: ['历史', '政治', '日本'],
    priority: 5,
    note: '核心概念："国家改造"、"昭和维新"、"尊皇讨奸"',
    createdAt: Date.now(),
  },
  {
    id: 'lit-犹存社',
    type: 'content',
    title: '犹存社亚洲主义论述',
    author: '大川周明',
    preferredAuthors: ['大川周明'],
    content: '亚洲主义、"解放亚洲"论。用于构建右翼思想家的逻辑与自我辩护。',
    tags: ['历史', '政治', '日本'],
    priority: 4,
    note: '用于展现日本内部的思想复杂性',
    createdAt: Date.now(),
  },
  {
    id: 'lit-文装的武备',
    type: 'content',
    title: '文装的武备理论',
    author: '后藤新平',
    preferredAuthors: ['后藤新平'],
    content: '以经济、文化手段达成战略目的。可配合展示残酷的经济掠夺现实，形成反讽。',
    tags: ['历史', '政治', '日本'],
    priority: 5,
    note: '用于揭示伪饰：引用理论后展示现实，形成反讽',
    createdAt: Date.now(),
  },
  {
    id: 'lit-橘朴',
    type: 'content',
    title: '自治主义论述',
    author: '橘朴',
    preferredAuthors: ['橘朴'],
    content: '中国研究、乡村调查，其"自治主义"论述常被挪用为"满洲独立"之"学理依据"。',
    tags: ['历史', '政治', '日本'],
    priority: 4,
    note: '用于展现伪满独立的"学理依据"',
    createdAt: Date.now(),
  },
  
  // 中国/内部视角
  {
    id: 'lit-汪精卫',
    type: 'content',
    title: '汪精卫言论与电文',
    author: '汪精卫',
    preferredAuthors: ['汪精卫'],
    content: '"和平运动"、"曲线救国"、"保存国家元气"。"兆铭此心，可质天日，惟求国土少遭糜烂，人民稍得苏息。"',
    tags: ['历史', '政治', '中国'],
    priority: 5,
    note: '用于展现"汉奸"的复杂性与悲情自辩',
    createdAt: Date.now(),
  },
  {
    id: 'lit-郑孝胥',
    type: 'content',
    title: '郑孝胥日记/诗文',
    author: '郑孝胥',
    preferredAuthors: ['郑孝胥'],
    content: '遗老心态，对"王道政治"的复杂寄托与幻灭。"忽喇喇似大厦倾，昏惨惨似灯将尽。"（化用《红楼梦》以自况）',
    tags: ['历史', '文学', '中国'],
    priority: 5,
    note: '用于展现遗老的幻灭心态',
    createdAt: Date.now(),
  },
  {
    id: 'lit-我的前半生',
    type: 'book',
    title: '我的前半生',
    author: '溥仪',
    preferredAuthors: ['溥仪'],
    tags: ['历史', '传记', '中国'],
    priority: 5,
    note: '"我曾一心想着恢复祖业，但龙椅下的基石，早已被换成他人的图纸。"',
    createdAt: Date.now(),
  },
  {
    id: 'lit-地方实力派',
    type: 'content',
    title: '地方实力派私下算计',
    content: '"识时务者为俊杰。""在这乱世，先得保住眼前这片基业和弟兄们。"',
    tags: ['历史', '政治', '中国'],
    priority: 4,
    note: '用于展现地方军阀的生存盘算',
    createdAt: Date.now(),
  },
  
  // 西方/古典视角
  {
    id: 'lit-君主论',
    type: 'book',
    title: '君主论',
    author: '马基雅维利',
    preferredAuthors: ['马基雅维利'],
    tags: ['哲学', '政治', '西方'],
    priority: 5,
    note: '"君主应效法狐狸与狮子。""造就伟大事业者，不在命运眷顾，而在其能驾驭命运之能力。"',
    createdAt: Date.now(),
  },
  {
    id: 'lit-战争论',
    type: 'book',
    title: '战争论',
    author: '克劳塞维茨',
    preferredAuthors: ['克劳塞维茨'],
    tags: ['军事', '哲学', '西方'],
    priority: 5,
    note: '"战争是政治通过另一种手段的继续。"',
    createdAt: Date.now(),
  },
  {
    id: 'lit-伯罗奔尼撒战争史',
    type: 'book',
    title: '伯罗奔尼撒战争史',
    author: '修昔底德',
    preferredAuthors: ['修昔底德'],
    tags: ['历史', '军事', '西方'],
    priority: 5,
    note: '"强者行其所能为，弱者忍其所必受。"',
    createdAt: Date.now(),
  },
  
  // ========== 关键历史文献、报告、宣言 ==========
  {
    id: 'lit-田中奏折',
    type: 'content',
    title: '田中奏折',
    content: '"惟欲征服支那，必先征服满蒙；如欲征服世界，必先征服支那。"',
    tags: ['历史', '日本', '文件'],
    priority: 5,
    note: '无论真伪，作为叙事证据使用',
    createdAt: Date.now(),
  },
  {
    id: 'lit-李顿调查团报告',
    type: 'content',
    title: '李顿调查团报告',
    content: '承认日本特殊权益，但否认满洲国合法性的矛盾结论，展现国际社会的绥靖与无力。',
    tags: ['历史', '国际', '文件'],
    priority: 4,
    note: '用于展现国际社会的绥靖与无力',
    createdAt: Date.now(),
  },
  {
    id: 'lit-满洲国建国宣言',
    type: 'content',
    title: '满洲国建国宣言',
    content: '官方辞令与实质条款的对比，是"傀儡戏码"的绝佳剧本。',
    tags: ['历史', '伪满', '文件'],
    priority: 5,
    note: '配合日满议定书及其密约使用',
    createdAt: Date.now(),
  },
  {
    id: 'lit-满铁调查报告',
    type: 'content',
    title: '满铁调查报告系列',
    content: '《满洲旧惯调查报告》、《经济调查》系列，冰冷、详尽的数据，佐证殖民经营的"精密"与"科学性"。',
    tags: ['历史', '经济', '文件'],
    priority: 4,
    note: '用于佐证殖民经营的"精密"与"科学性"',
    createdAt: Date.now(),
  },
  
  // ========== 文学作品、诗歌、艺术意象 ==========
  {
    id: 'lit-红楼梦',
    type: 'book',
    title: '红楼梦',
    author: '曹雪芹',
    preferredAuthors: ['曹雪芹'],
    tags: ['文学', '古典', '中国'],
    priority: 5,
    note: '"好一似食尽鸟投林，落了片白茫茫大地真干净。"表现末世虚无与沧桑',
    createdAt: Date.now(),
  },
  {
    id: 'lit-李煜词',
    type: 'content',
    title: '李煜词选',
    author: '李煜',
    preferredAuthors: ['李煜'],
    content: '"故国不堪回首月明中"，表现末世悲凉、故国之思。',
    tags: ['文学', '诗词', '中国'],
    priority: 5,
    note: '表现末世悲凉、故国之思',
    createdAt: Date.now(),
  },
  {
    id: 'lit-杜甫诗',
    type: 'content',
    title: '杜甫诗选',
    author: '杜甫',
    preferredAuthors: ['杜甫'],
    content: '"国破山河在"，表现故国之痛。',
    tags: ['文学', '诗词', '中国'],
    priority: 4,
    note: '表现故国之痛',
    createdAt: Date.now(),
  },
  {
    id: 'lit-岳飞词',
    type: 'content',
    title: '满江红',
    author: '岳飞',
    preferredAuthors: ['岳飞'],
    content: '"待从头，收拾旧山河"，表现豪情与悲壮。',
    tags: ['文学', '诗词', '中国'],
    priority: 4,
    note: '表现豪情与悲壮',
    createdAt: Date.now(),
  },
  {
    id: 'lit-文天祥诗',
    type: 'content',
    title: '过零丁洋',
    author: '文天祥',
    preferredAuthors: ['文天祥'],
    content: '"人生自古谁无死"，表现气节与悲壮。',
    tags: ['文学', '诗词', '中国'],
    priority: 4,
    note: '表现气节与悲壮',
    createdAt: Date.now(),
  },
  {
    id: 'lit-神奈川冲浪里',
    type: 'content',
    title: '神奈川冲浪里',
    author: '葛饰北斋',
    content: '巨浪与扁舟，象征自然/历史之力与个人的渺小。',
    tags: ['艺术', '日本', '意象'],
    priority: 4,
    note: '绘画意象，用于情感升华',
    createdAt: Date.now(),
  },
  {
    id: 'lit-静静的顿河',
    type: 'book',
    title: '静静的顿河',
    author: '肖洛霍夫',
    preferredAuthors: ['肖洛霍夫'],
    tags: ['文学', '苏联', '小说'],
    priority: 4,
    note: '大时代中普通哥萨克的悲剧，适用于微观线',
    createdAt: Date.now(),
  },
  {
    id: 'lit-人的境遇',
    type: 'book',
    title: '人的境遇',
    author: '马尔罗',
    preferredAuthors: ['马尔罗'],
    tags: ['文学', '法国', '小说'],
    priority: 4,
    note: '革命、暴力与存在主义式的抉择',
    createdAt: Date.now(),
  },
  
  // ========== 象征性语句 ==========
  {
    id: 'lit-历史宿命感',
    type: 'content',
    title: '历史宿命感语句集',
    content: '"历史的车轮开始转动，无人能够使其停止。""他们播下了风的种子，却幻想着收获宁静。"',
    tags: ['象征', '开头', '结尾'],
    priority: 5,
    note: '用于开篇定调或章节转折',
    createdAt: Date.now(),
  },
  {
    id: 'lit-理想与现实',
    type: 'content',
    title: '理想与现实断裂语句集',
    content: '"所有通往天堂的路，都曾铺设着地狱的砖石。""他们试图建造巴别塔，却只得到了语言的混乱和彼此的诅咒。"',
    tags: ['象征', '哲理'],
    priority: 5,
    note: '用于哲理性点评',
    createdAt: Date.now(),
  },
  {
    id: 'lit-个体的徒劳',
    type: 'content',
    title: '个体徒劳与牺牲语句集',
    content: '"如同一滴水投入熔炉，瞬间蒸发，未留下任何痕迹，除了那一声轻微的、无人听见的嘶响。""他以为自己在下棋，后来才发现，自己不过是棋盘上一枚过了河的卒子。"',
    tags: ['象征', '悲剧'],
    priority: 5,
    note: '用于刻画个体在历史洪流中的命运',
    createdAt: Date.now(),
  },
  {
    id: 'lit-文明的幻觉',
    type: 'content',
    title: '文明幻觉语句集',
    content: '"所谓文明，不过是精致一点的野蛮，披上了礼服，戴上了怀表。""他们用最新的机器耕种土地，却播下了最古老的仇恨。"',
    tags: ['象征', '文明'],
    priority: 4,
    note: '用于揭示文明与野蛮的悖论',
    createdAt: Date.now(),
  },
  {
    id: 'lit-悬置与虚无',
    type: 'content',
    title: '悬置与虚无语句集',
    content: '"当一切喧嚣散去，只剩下那片土地，沉默地承载着记忆、谎言和慢慢渗入土壤的铁锈与鲜血。""故事没有结局，只有叙述的中断。就像一场没有终点的航行，船已离港，而灯塔，从未真正亮起。"',
    tags: ['象征', '结尾'],
    priority: 5,
    note: '用于结尾收束，留下余韵',
    createdAt: Date.now(),
  },
  
  // ========== 偏好文献（新增）==========
  // 后藤新平相关
  {
    id: 'lit-pref-日俄战后经营策论',
    type: 'book',
    title: '日俄战后经营策论',
    author: '后藤新平',
    preferredAuthors: ['后藤新平'],
    tags: ['历史', '政治', '日本', '殖民'],
    priority: 5,
    note: '后藤新平关于满洲经营的核心论述',
    createdAt: Date.now(),
  },
  {
    id: 'lit-pref-满洲旧惯调查报告',
    type: 'book',
    title: '满洲旧惯调查报告',
    author: '后藤新平',
    preferredAuthors: ['后藤新平'],
    tags: ['历史', '社会学', '日本', '满洲'],
    priority: 5,
    note: '满洲社会调查，殖民治理的重要参考资料',
    createdAt: Date.now(),
  },
  {
    id: 'lit-pref-关东州资源志',
    type: 'book',
    title: '关东州资源志',
    author: '后藤新平',
    preferredAuthors: ['后藤新平'],
    tags: ['历史', '经济', '日本', '满洲'],
    priority: 4,
    note: '关东州资源调查，殖民掠夺的依据',
    createdAt: Date.now(),
  },
  // 关东军相关
  {
    id: 'lit-pref-关东军司令部条例',
    type: 'content',
    title: '关东军司令部条例',
    author: '关东军',
    preferredAuthors: ['关东军'],
    content: '关东军组织架构与职权规定，独立于陆军省的指挥体系',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 5,
    note: '关东军"独走"的制度依据',
    createdAt: Date.now(),
  },
  {
    id: 'lit-pref-关东军占领满蒙计划',
    type: 'content',
    title: '关东军占领满蒙计划',
    author: '关东军',
    preferredAuthors: ['关东军'],
    content: '关东军内部制定的满洲占领计划',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 5,
    note: '九一八事变的前奏与预谋',
    createdAt: Date.now(),
  },
  {
    id: 'lit-pref-昭和六年度满洲匪贼讨伐作战概要',
    type: 'content',
    title: '昭和六年度满洲匪贼讨伐作战概要',
    author: '关东军',
    preferredAuthors: ['关东军'],
    content: '关东军对东北抗日武装的"讨伐"作战记录',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 4,
    note: '关东军镇压抗日武装的官方记录',
    createdAt: Date.now(),
  },
  {
    id: 'lit-pref-日满密约',
    type: 'content',
    title: '日满密约（秋山密约）',
    author: '关东军',
    preferredAuthors: ['关东军'],
    content: '日本与伪满洲国之间的秘密协定',
    tags: ['历史', '政治', '日本', '满洲国'],
    priority: 5,
    note: '伪满洲国作为日本附庸的条约依据',
    createdAt: Date.now(),
  },
  // 石原莞尔相关
  {
    id: 'lit-pref-扭转国运之根本国策',
    type: 'content',
    title: '扭转国运之根本国策',
    author: '石原莞尔',
    preferredAuthors: ['石原莞尔'],
    content: '石原莞尔关于满洲占领与国家战略的论述',
    tags: ['历史', '政治', '日本', '满洲'],
    priority: 5,
    note: '关东军核心战略思想',
    createdAt: Date.now(),
  },
  // 田中义一相关
  {
    id: 'lit-pref-对支政策纲领',
    type: 'content',
    title: '对支政策纲领',
    author: '田中义一',
    preferredAuthors: ['田中义一'],
    content: '东方会议后出台的对华政策纲领，确立"满蒙分离"方针',
    tags: ['历史', '政治', '日本', '侵华'],
    priority: 5,
    note: '日本对华政策的重要文件',
    createdAt: Date.now(),
  },
  // 河本大作、花谷正
  {
    id: 'lit-pref-河本大作',
    type: 'content',
    title: '河本大作供述与回忆',
    author: '河本大作',
    preferredAuthors: ['河本大作'],
    content: '皇姑屯事件策划者，后参与满洲经营',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 4,
    note: '关东军激进派的代表人物',
    createdAt: Date.now(),
  },
  {
    id: 'lit-pref-花谷正',
    type: 'content',
    title: '花谷正证言',
    author: '花谷正',
    preferredAuthors: ['花谷正'],
    content: '九一八事变策划者之一，柳条湖事件执行者',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 4,
    note: '九一八事变亲历者证言',
    createdAt: Date.now(),
  },
  // 板垣征四郎
  {
    id: 'lit-pref-板垣征四郎',
    type: 'content',
    title: '板垣征四郎言论',
    author: '板垣征四郎',
    preferredAuthors: ['板垣征四郎'],
    content: '九一八事变策划者，关东军参谋，后任陆相',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 4,
    note: '关东军核心人物',
    createdAt: Date.now(),
  },
  // 矢野仁一
  {
    id: 'lit-pref-满洲非支那领土论',
    type: 'content',
    title: '满洲非支那领土论',
    author: '矢野仁一',
    preferredAuthors: ['矢野仁一'],
    content: '京都大学教授，为日本侵略提供"学术依据"',
    tags: ['历史', '学术', '日本', '满洲'],
    priority: 4,
    note: '日本学术界为侵略辩护的代表',
    createdAt: Date.now(),
  },
  // 大川周明
  {
    id: 'lit-pref-复兴亚洲的若干问题',
    type: 'content',
    title: '复兴亚洲的若干问题',
    author: '大川周明',
    preferredAuthors: ['大川周明'],
    content: '亚洲主义、泛伊斯兰主义论述',
    tags: ['历史', '政治', '日本'],
    priority: 4,
    note: '日本右翼思想家的亚洲主义',
    createdAt: Date.now(),
  },
  // 草地贞吾
  {
    id: 'lit-pref-关东军战力现状评估报告',
    type: 'content',
    title: '关东军战力现状评估报告',
    author: '草地贞吾',
    preferredAuthors: ['草地贞吾'],
    content: '关东军内部关于军力的评估报告',
    tags: ['历史', '军事', '日本', '满洲'],
    priority: 4,
    note: '关东军内部军事评估',
    createdAt: Date.now(),
  },
  // 满洲日日新闻
  {
    id: 'lit-pref-满洲日日新闻',
    type: 'content',
    title: '满洲日日新闻报道',
    author: '满洲日日新闻',
    preferredAuthors: ['满洲日日新闻'],
    content: '满洲日系报纸，记录殖民统治期间的新闻与舆论',
    tags: ['历史', '新闻', '日本', '满洲'],
    priority: 3,
    note: '殖民统治期间的舆论机器',
    createdAt: Date.now(),
  },
  // 哈雷特·阿本德
  {
    id: 'lit-pref-纽约时报',
    type: 'content',
    title: '纽约时报远东报道',
    author: '哈雷特·阿本德',
    preferredAuthors: ['哈雷特·阿本德', '纽约时报'],
    content: '《纽约时报》驻华记者，满洲事变期间的现场报道',
    tags: ['历史', '新闻', '美国', '满洲'],
    priority: 4,
    note: '西方记者对满洲事变的观察',
    createdAt: Date.now(),
  },
  // 火野苇平
  {
    id: 'lit-pref-麦与士兵',
    type: 'book',
    title: '麦与士兵',
    author: '火野苇平',
    preferredAuthors: ['火野苇平'],
    tags: ['文学', '战争', '日本'],
    priority: 3,
    note: '侵华战争时期日本作家的战场小说，展现战争中的"人性"',
    createdAt: Date.now(),
  },
  // 托马斯·霍布斯
  {
    id: 'lit-pref-利维坦',
    type: 'book',
    title: '利维坦',
    author: '托马斯·霍布斯',
    preferredAuthors: ['托马斯·霍布斯'],
    tags: ['政治哲学', '西方'],
    priority: 4,
    note: '"利维坦"意象可用于描述现代国家机器的冷酷与高效',
    createdAt: Date.now(),
  },
  // 波茨坦公告
  {
    id: 'lit-pref-波茨坦公告',
    type: 'content',
    title: '波茨坦公告',
    author: '盟军',
    preferredAuthors: ['盟军'],
    content: '1945年7月26日发布，要求日本无条件投降',
    tags: ['历史', '政治', '二战'],
    priority: 5,
    note: '日本投降的国际法依据',
    createdAt: Date.now(),
  },
  // 莫洛托夫
  {
    id: 'lit-pref-莫洛托夫',
    type: 'content',
    title: '莫洛托夫对日宣战声明',
    author: '莫洛托夫',
    preferredAuthors: ['莫洛托夫'],
    content: '1945年8月8日苏联对日宣战',
    tags: ['历史', '政治', '苏联', '二战'],
    priority: 4,
    note: '苏联出兵东北的外交文件',
    createdAt: Date.now(),
  },
  // 佐藤尚武
  {
    id: 'lit-pref-佐藤尚武',
    type: 'content',
    title: '佐藤尚武外交记录',
    author: '佐藤尚武',
    preferredAuthors: ['佐藤尚武'],
    content: '日本驻苏大使，记录苏日外交谈判',
    tags: ['历史', '政治', '日本', '苏联'],
    priority: 3,
    note: '苏日外交的关键人物',
    createdAt: Date.now(),
  },
];

/** 获取文献统计 */
export function getLiteratureStats() {
  const stats: Record<string, number> = {};
  PRESET_LITERATURE.forEach(item => {
    item.tags?.forEach(tag => {
      stats[tag] = (stats[tag] || 0) + 1;
    });
  });
  return stats;
}

/** 智能匹配文献 - 根据书名或作者名匹配预设库 */
export function matchPresetLiterature(input: string): Partial<LiteratureResource> | null {
  if (!input || typeof input !== 'string') return null;
  
  const trimmedInput = input.trim();
  if (!trimmedInput) return null;
  
  // 尝试精确匹配书名
  let match = PRESET_LITERATURE.find(item => 
    item.title === trimmedInput || 
    item.title.includes(trimmedInput) ||
    trimmedInput.includes(item.title)
  );
  
  // 尝试匹配作者名
  if (!match) {
    match = PRESET_LITERATURE.find(item => 
      item.author === trimmedInput ||
      item.preferredAuthors?.some(author => 
        author === trimmedInput || 
        author.includes(trimmedInput) ||
        trimmedInput.includes(author)
      )
    );
  }
  
  // 尝试模糊匹配
  if (!match) {
    const lowerInput = trimmedInput.toLowerCase();
    match = PRESET_LITERATURE.find(item => {
      const titleMatch = item.title.toLowerCase().includes(lowerInput) || 
                         lowerInput.includes(item.title.toLowerCase());
      const authorMatch = item.author?.toLowerCase().includes(lowerInput) ||
                          lowerInput.includes((item.author || '').toLowerCase());
      return titleMatch || authorMatch;
    });
  }
  
  if (match) {
    return {
      type: match.type,
      title: match.title,
      author: match.author,
      preferredAuthors: match.preferredAuthors,
      tags: match.tags,
      priority: match.priority,
      note: match.note,
      content: match.content,
    };
  }
  
  // 没有匹配到，尝试智能推断
  return inferLiteratureInfo(trimmedInput);
}

/** 智能推断文献信息 - 基于关键词推断分类 */
function inferLiteratureInfo(input: string): Partial<LiteratureResource> {
  const result: Partial<LiteratureResource> = {
    type: 'book',
    title: input,
    priority: 3,
    tags: [],
  };
  
  // 推断分类
  const tagPatterns: Array<{ pattern: RegExp; tags: string[] }> = [
    { pattern: /史记|汉书|三国|红楼|水浒|西游|金瓶|儒林|聊斋|唐诗|宋词|元曲/i, tags: ['文学', '古典', '中国'] },
    { pattern: /日本|昭和|明治|大正|幕府|武士|皇国|关东军|满铁/i, tags: ['历史', '日本'] },
    { pattern: /苏联|俄|斯大林|列宁|托洛茨基|革命/i, tags: ['历史', '苏联'] },
    { pattern: /罗马|希腊|柏拉图|亚里士多德|西塞罗/i, tags: ['历史', '古典', '西方'] },
    { pattern: /君主论|战争论|国富论|资本论|理想国/i, tags: ['哲学', '政治'] },
    { pattern: /诗|词|赋|曲|文选|文集|全集/i, tags: ['文学', '古典'] },
    { pattern: /史|志|纪|传|录/i, tags: ['历史'] },
    { pattern: /论|学|原理|概论/i, tags: ['学术'] },
    { pattern: /战争|战役|军事/i, tags: ['军事', '历史'] },
    { pattern: /回忆录|日记|书信|自传|传记/i, tags: ['传记', '历史'] },
  ];
  
  for (const { pattern, tags } of tagPatterns) {
    if (pattern.test(input)) {
      result.tags = [...new Set([...(result.tags || []), ...tags])];
    }
  }
  
  // 如果没有匹配到任何分类，默认添加文学标签
  if (!result.tags || result.tags.length === 0) {
    result.tags = ['文学'];
  }
  
  return result;
}
