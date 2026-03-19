"""
舆情分析模块
提供情感分析、关键词提取、热度计算等功能
"""

import re
import jieba
import jieba.analyse
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from collections import Counter
import asyncio


@dataclass
class SentimentResult:
    """情感分析结果"""
    score: float  # -1到1，负数为负面，正数为正面
    label: str    # 'positive', 'negative', 'neutral'
    confidence: float


@dataclass
class KeywordResult:
    """关键词结果"""
    word: str
    weight: float


@dataclass
class PublicOpinionReport:
    """舆情报告"""
    bvid: str
    title: str
    overall_sentiment: str
    sentiment_score: float
    hot_keywords: List[KeywordResult]
    comment_count: int
    negative_comments: List[Dict]
    positive_comments: List[Dict]
    warning_level: str  # 'high', 'medium', 'low', 'none'


class SentimentAnalyzer:
    """情感分析器（基于规则 + 词典）"""
    
    # 正面情感词典
    POSITIVE_WORDS = {
        '好', '棒', '赞', '优秀', '精彩', '喜欢', '爱', '支持', '期待',
        '厉害', '强', '完美', '不错', '可以', '行', '值得', '推荐',
        '感动', '开心', '快乐', '幸福', '满意', '舒服', '爽', '酷',
        '牛', '神', '绝', '美', '帅', '可爱', '有趣', '有用', '干货',
        '学到了', '受益匪浅', '感谢', '谢谢', '辛苦了', '加油'
    }
    
    # 负面情感词典
    NEGATIVE_WORDS = {
        '差', '烂', '糟', '垃圾', '恶心', '讨厌', '恨', '反对', '失望',
        '烂片', '水', '假', '骗', '坑', '垃圾', '废物', '不行', '不可以',
        '生气', '愤怒', '郁闷', '烦', '难受', '痛苦', '悲伤', '失望',
        '无语', '尴尬', '无聊', '浪费时间', '没意义', '没用', '什么鬼',
        '滚', '死', '烂', '差劲', '垃圾', '呸', '呵呵', '草', '操'
    }
    
    # 否定词
    NEGATION_WORDS = {'不', '没', '无', '非', '莫', '勿', '别', '未'}
    
    # 程度副词
    DEGREE_WORDS = {
        '很': 1.5, '非常': 2.0, '特别': 1.8, '十分': 1.6, '相当': 1.5,
        '太': 1.8, '极': 2.0, '最': 2.0, '真': 1.4, '好': 1.3,
        '有点': 0.6, '稍微': 0.5, '略微': 0.5, '比较': 0.8, '还算': 0.7
    }
    
    def analyze(self, text: str) -> SentimentResult:
        """分析文本情感"""
        if not text:
            return SentimentResult(0, 'neutral', 0)
        
        # 分词
        words = list(jieba.cut(text))
        
        sentiment_score = 0
        positive_count = 0
        negative_count = 0
        
        i = 0
        while i < len(words):
            word = words[i]
            
            # 检查程度副词
            degree = 1.0
            if word in self.DEGREE_WORDS and i + 1 < len(words):
                degree = self.DEGREE_WORDS[word]
                i += 1
                word = words[i]
            
            # 检查否定词
            negation = 1
            if word in self.NEGATION_WORDS and i + 1 < len(words):
                negation = -1
                i += 1
                word = words[i]
            
            # 检查情感词
            if word in self.POSITIVE_WORDS:
                sentiment_score += 1 * degree * negation
                positive_count += 1
            elif word in self.NEGATIVE_WORDS:
                sentiment_score -= 1 * degree * negation
                negative_count += 1
            
            i += 1
        
        # 归一化到 -1 到 1
        total_count = positive_count + negative_count
        if total_count == 0:
            return SentimentResult(0, 'neutral', 0.5)
        
        normalized_score = sentiment_score / (total_count * 2)
        normalized_score = max(-1, min(1, normalized_score))
        
        # 确定标签
        if normalized_score > 0.1:
            label = 'positive'
        elif normalized_score < -0.1:
            label = 'negative'
        else:
            label = 'neutral'
        
        confidence = min(abs(normalized_score) * 1.5 + 0.3, 1.0)
        
        return SentimentResult(normalized_score, label, confidence)


class KeywordExtractor:
    """关键词提取器"""
    
    # 停用词
    STOP_WORDS = {
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那'
    }
    
    def extract(self, texts: List[str], top_k: int = 10) -> List[KeywordResult]:
        """提取关键词"""
        if not texts:
            return []
        
        # 合并文本
        all_text = ' '.join(texts)
        
        # 使用TF-IDF提取关键词
        keywords = jieba.analyse.extract_tags(
            all_text, 
            topK=top_k, 
            withWeight=True,
            allowPOS=('n', 'nr', 'ns', 'nt', 'nw', 'nz', 'v', 'vd', 'vn', 'a', 'an', 'i')
        )
        
        return [KeywordResult(word, weight) for word, weight in keywords]


class PublicOpinionAnalyzer:
    """舆情分析器"""
    
    def __init__(self):
        self.sentiment_analyzer = SentimentAnalyzer()
        self.keyword_extractor = KeywordExtractor()
    
    def analyze_video_comments(self, video_info: Dict, 
                               comments: List[Dict]) -> PublicOpinionReport:
        """分析视频评论舆情"""
        bvid = video_info.get('bvid', '')
        title = video_info.get('title', '')
        
        if not comments:
            return PublicOpinionReport(
                bvid=bvid,
                title=title,
                overall_sentiment='neutral',
                sentiment_score=0,
                hot_keywords=[],
                comment_count=0,
                negative_comments=[],
                positive_comments=[],
                warning_level='none'
            )
        
        # 分析每条评论的情感
        sentiments = []
        negative_comments = []
        positive_comments = []
        comment_texts = []
        
        for comment in comments:
            content = comment.get('content', '')
            if not content:
                continue
            
            sentiment = self.sentiment_analyzer.analyze(content)
            sentiments.append(sentiment)
            comment_texts.append(content)
            
            comment_data = {
                'user': comment.get('uname', ''),
                'content': content[:100],  # 截断
                'likes': comment.get('like', 0),
                'sentiment_score': sentiment.score
            }
            
            if sentiment.label == 'negative' and sentiment.confidence > 0.6:
                negative_comments.append(comment_data)
            elif sentiment.label == 'positive' and sentiment.confidence > 0.6:
                positive_comments.append(comment_data)
        
        # 计算整体情感
        if sentiments:
            avg_score = sum(s.score for s in sentiments) / len(sentiments)
            if avg_score > 0.15:
                overall_sentiment = 'positive'
            elif avg_score < -0.15:
                overall_sentiment = 'negative'
            else:
                overall_sentiment = 'neutral'
        else:
            avg_score = 0
            overall_sentiment = 'neutral'
        
        # 提取关键词
        keywords = self.keyword_extractor.extract(comment_texts, top_k=10)
        
        # 确定警告级别
        negative_ratio = len(negative_comments) / len(comments) if comments else 0
        if negative_ratio > 0.3 or avg_score < -0.5:
            warning_level = 'high'
        elif negative_ratio > 0.15 or avg_score < -0.2:
            warning_level = 'medium'
        elif negative_ratio > 0.05:
            warning_level = 'low'
        else:
            warning_level = 'none'
        
        # 排序并截取
        negative_comments.sort(key=lambda x: abs(x['sentiment_score']), reverse=True)
        positive_comments.sort(key=lambda x: x['sentiment_score'], reverse=True)
        
        return PublicOpinionReport(
            bvid=bvid,
            title=title,
            overall_sentiment=overall_sentiment,
            sentiment_score=avg_score,
            hot_keywords=keywords,
            comment_count=len(comments),
            negative_comments=negative_comments[:5],
            positive_comments=positive_comments[:5],
            warning_level=warning_level
        )
    
    def generate_report_text(self, report: PublicOpinionReport) -> str:
        """生成报告文本"""
        lines = []
        lines.append(f"📊 B站视频舆情报告")
        lines.append(f"==================")
        lines.append("")
        lines.append(f"🎬 {report.title}")
        lines.append(f"   BV号: {report.bvid}")
        lines.append("")
        
        # 情感分析
        sentiment_emoji = {'positive': '😊', 'negative': '😠', 'neutral': '😐'}
        lines.append(f"{sentiment_emoji.get(report.overall_sentiment, '😐')} 整体情感: {report.overall_sentiment}")
        lines.append(f"   情感得分: {report.sentiment_score:.2f} (-1到1)")
        lines.append(f"   分析评论数: {report.comment_count}")
        lines.append("")
        
        # 告警
        if report.warning_level != 'none':
            warning_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
            lines.append(f"{warning_emoji.get(report.warning_level, '⚪')} 舆情告警: {report.warning_level.upper()}")
            lines.append("")
        
        # 热门关键词
        if report.hot_keywords:
            lines.append("🔥 热门关键词:")
            for kw in report.hot_keywords[:5]:
                lines.append(f"   • {kw.word} ({kw.weight:.3f})")
            lines.append("")
        
        # 负面评论
        if report.negative_comments:
            lines.append("😠 负面评论 (TOP 3):")
            for i, comment in enumerate(report.negative_comments[:3], 1):
                content = comment['content'][:50] + "..." if len(comment['content']) > 50 else comment['content']
                lines.append(f"   {i}. @{comment['user']}: {content}")
            lines.append("")
        
        # 正面评论
        if report.positive_comments:
            lines.append("😊 正面评论 (TOP 3):")
            for i, comment in enumerate(report.positive_comments[:3], 1):
                content = comment['content'][:50] + "..." if len(comment['content']) > 50 else comment['content']
                lines.append(f"   {i}. @{comment['user']}: {content}")
            lines.append("")
        
        return '\n'.join(lines)


# 便捷函数
def quick_analyze(comments: List[str]) -> Dict:
    """快速分析评论列表"""
    analyzer = PublicOpinionAnalyzer()
    
    # 构建mock数据
    mock_comments = [{'content': c, 'uname': '用户', 'like': 0} for c in comments]
    
    report = analyzer.analyze_video_comments(
        {'bvid': 'quick', 'title': '快速分析'},
        mock_comments
    )
    
    return {
        'sentiment': report.overall_sentiment,
        'score': report.sentiment_score,
        'keywords': [k.word for k in report.hot_keywords[:5]],
        'warning': report.warning_level
    }


# 测试
if __name__ == "__main__":
    analyzer = PublicOpinionAnalyzer()
    
    # 测试评论
    test_comments = [
        {'content': '这个视频太棒了，学到了很多！', 'uname': '用户A', 'like': 100},
        {'content': '讲得很好，支持UP主', 'uname': '用户B', 'like': 50},
        {'content': '没什么意思，浪费时间', 'uname': '用户C', 'like': 10},
        {'content': '垃圾视频，全是废话', 'uname': '用户D', 'like': 5},
        {'content': '还可以，期待下一期', 'uname': '用户E', 'like': 30},
    ]
    
    report = analyzer.analyze_video_comments(
        {'bvid': 'BV1xx411c7mD', 'title': '测试视频'},
        test_comments
    )
    
    print(analyzer.generate_report_text(report))
