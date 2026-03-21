/**
 * ============================================================================
 * 词汇分类器
 * ============================================================================
 */

import { User, MapPin, Building, Clock, Hash, Zap, Sparkles } from "lucide-react";
import type { VocabularyCategory } from '@/types';

/** 分类规则配置 */
export const CATEGORY_RULES: Record<string, {
  name: string;
  icon: typeof User;
  color: string;
  patterns: RegExp[];
}> = {
  // 人名类
  person: {
    name: "人名",
    icon: User,
    color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
    patterns: [
      // 常见姓氏开头的名字
      /^[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍卻璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公]/,
      // 名字后缀
      /^.{2,4}(公|君|子|先生|女士|夫人|老|爷|郎|娘|哥|姐|叔|伯|婶|母|父|子|女)$/,
    ],
  },

  // 地名类
  place: {
    name: "地名",
    icon: MapPin,
    color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300",
    patterns: [
      // 行政区划
      /(省|市|县|区|镇|乡|村|屯|寨|堡|城|州|郡|府|路|道|厅|旗|盟|苏木|嘎查)$/,
      // 自然地理
      /(山|河|湖|海|江|溪|沟|谷|峰|岭|坡|原|平原|盆地|高原|沙漠|草原|森林|岛屿|半岛|群岛)$/,
      // 建筑
      /(寺|庙|观|宫|殿|阁|楼|塔|桥|门|关|口|渡|港|码头|机场|车站|广场|公园)$/,
      // 方位词开头
      /^[北南东西中][京海华京疆藏蒙蜀滇黔桂粤闽浙苏鲁豫冀湘鄂赣皖陕甘宁青新川渝港澳台]/,
      // 古代地名后缀
      /(京|都|邑|郭|郊|野|原)$/,
    ],
  },

  // 机构类
  organization: {
    name: "机构",
    icon: Building,
    color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300",
    patterns: [
      // 政府机构
      /(部|委|局|厅|处|科|股|室|所|院|校|馆|站|中心|基地|公司|集团|企业|工厂|厂|店|社|会|协会|学会|基金会|报社|杂志社|出版社|电台|电视台|网络|银行|保险|证券|基金)/,
      // 教育医疗
      /(大学|学院|中学|小学|幼儿园|研究院|研究所|实验室|医院|诊所|药店)/,
      // 组织团体
      /(政府|机关|单位|团体|组织|机构)/,
    ],
  },

  // 时间类
  time: {
    name: "时间",
    icon: Clock,
    color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
    patterns: [
      // 中文数字日期
      /^[一二三四五六七八九十零〇百千万]+(年|月|日|时|分|秒|世纪|年代)$/,
      // 时间段
      /(朝|代|时期|时代|纪元|纪)$/,
      // 季节
      /^[春夏秋冬](季|天)$/,
      // 相对时间
      /^(今天|明天|昨天|前天|后天|大前天|大后天|现在|过去|未来|古代|近代|现代|当代)/,
      // 年号
      /^(民国|公元|公元前|康熙|乾隆|雍正|嘉庆|道光|咸丰|同治|光绪|宣统|贞观|开元|天宝|洪武|永乐|万历|崇祯)/,
    ],
  },

  // 数字量词类
  number: {
    name: "数量",
    icon: Hash,
    color: "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300",
    patterns: [
      // 数字+量词
      /^[0-9０-９一二三四五六七八九十百千万亿零〇]+[个只条件支张本架辆艘架台座把柄根枝朵片块颗粒滴点滴顿餐次回趟遍番场届期轮幅篇章部首卷册页行位列项条款项目种种样类门门项款批组套串双双对副帮伙批群堆排行层重级等辈品流品]/,
      // 纯数字
      /^[0-9０-９]+$/,
      /^[一二三四五六七八九十百千万亿零〇]+$/,
    ],
  },

  // 动作类
  action: {
    name: "动作",
    icon: Zap,
    color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300",
    patterns: [
      // 动词化后缀
      /.{0,2}(化|性|度|力|率|量|率|法|术|学|制|制|式|型|态|观|论|主义)$/,
      // 常见动词
      /^(进行|开展|实施|执行|完成|实现|达到|取得|获得|通过|经过|经过|开展|组织|安排|部署|落实|推进|加强|改善|提高|增加|减少|扩大|缩小|建设|发展|改革|创新|调整|优化)/,
    ],
  },

  // 形容类
  adjective: {
    name: "形容",
    icon: Sparkles,
    color: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300",
    patterns: [
      // 形容词后缀
      /.{0,2}(的|之|般|样|式|性|度)$/,
      // 常见形容词
      /^(伟大|重要|关键|主要|基本|核心|中心|根本|主要|重大|显著|明显|突出|优秀|良好|积极|消极|认真|努力|刻苦|勤奋|严谨|细致|全面|系统|深入|广泛|充分|适当|合理|科学|规范|标准|正确|准确|精确|完整|完善|健全|稳定|安全|可靠|有效|高效|快速|迅速|缓慢|逐渐|逐步|不断|持续|长期|短期|临时|永久|固定|灵活|多样|复杂|简单|困难|容易|方便|快捷|先进|现代|传统|古老|新兴|新型|特别|特殊|一般|普通|常见|罕见|稀有|珍贵|重要|必要|必需|主要|次要|直接|间接|明显|隐含|公开|秘密|正式|非正式)/,
    ],
  },
};

/** 自动识别词汇分类 */
export function autoDetectCategory(word: string): VocabularyCategory {
  for (const [categoryId, config] of Object.entries(CATEGORY_RULES)) {
    for (const pattern of config.patterns) {
      if (pattern.test(word)) {
        return config.name as VocabularyCategory;
      }
    }
  }
  return "其他";
}

/** 获取分类统计 */
export function getCategoryStats(items: Array<{ category: string }>): Record<string, number> {
  const stats: Record<string, number> = {};
  items.forEach(item => {
    stats[item.category] = (stats[item.category] || 0) + 1;
  });
  return stats;
}
