#!/usr/bin/env python3
"""
监控守护进程
定时检查UP主新视频并分析舆情
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from bilibili_api import BilibiliAPI
from sentiment_analyzer import PublicOpinionAnalyzer
from database import MonitorDatabase


class MonitorDaemon:
    """监控守护进程"""
    
    def __init__(self, check_interval: int = 300):
        self.check_interval = check_interval
        self.db = MonitorDatabase()
        self.analyzer = PublicOpinionAnalyzer()
        self.running = False
    
    async def start(self):
        """启动守护进程"""
        await self.db.connect()
        self.running = True
        
        print(f"🚀 B站舆情监控守护进程启动")
        print(f"   检查间隔: {self.check_interval}秒")
        print()
        
        while self.running:
            try:
                await self._check_cycle()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                print(f"❌ 检查周期出错: {e}")
                await asyncio.sleep(60)  # 出错后1分钟再试
    
    async def stop(self):
        """停止守护进程"""
        self.running = False
        await self.db.close()
        print("🛑 守护进程已停止")
    
    async def _check_cycle(self):
        """执行一次检查周期"""
        monitors = await self.db.get_active_up_monitors()
        
        if not monitors:
            print(f"[{datetime.now()}] 暂无监控任务")
            return
        
        print(f"[{datetime.now()}] 检查 {len(monitors)} 个UP主")
        
        async with BilibiliAPI() as api:
            for monitor in monitors:
                mid = monitor['mid']
                name = monitor.get('name', f'UID:{mid}')
                
                try:
                    print(f"  🔍 检查: {name}")
                    
                    # 获取UP主最新视频
                    videos = await api.get_up_videos(mid, page=1, page_size=5)
                    
                    if not videos:
                        print(f"     无视频")
                        continue
                    
                    # 检查是否有新视频
                    new_videos = []
                    for v in videos:
                        bvid = v.get('bvid')
                        existing = await self.db.get_video(bvid)
                        if not existing:
                            new_videos.append(v)
                    
                    if new_videos:
                        print(f"     发现 {len(new_videos)} 个新视频!")
                        
                        for v in new_videos:
                            await self._analyze_new_video(api, v)
                    else:
                        print(f"     无新视频")
                    
                    # 更新检查时间
                    await self.db.update_up_check_time(mid)
                    
                except Exception as e:
                    print(f"     ❌ 检查失败: {e}")
    
    async def _analyze_new_video(self, api: BilibiliAPI, video_data: dict):
        """分析新视频"""
        bvid = video_data.get('bvid')
        title = video_data.get('title', '未知')
        
        print(f"     📺 {title[:50]}...")
        
        # 保存视频信息
        await self.db.save_video({
            'bvid': bvid,
            'mid': video_data.get('mid', 0),
            'title': title,
            'description': video_data.get('description', ''),
            'pubdate': video_data.get('created', 0),
            'duration': video_data.get('length', 0),
            'view_count': 0,
            'like_count': 0,
            'coin_count': 0,
            'share_count': 0,
            'reply_count': 0,
            'subtitle_text': None,
            'analyzed': 0
        })
        
        # 等待一段时间再分析（让评论积累）
        print(f"     ⏳ 等待评论积累...")
        await asyncio.sleep(10)
        
        # 获取评论
        comments = await api.get_comments(bvid, page=1, page_size=50)
        
        if not comments:
            print(f"     ⚠️ 暂无评论")
            await self.db.mark_video_analyzed(bvid)
            return
        
        print(f"     💬 {len(comments)} 条评论")
        
        # 分析舆情
        report = self.analyzer.analyze_video_comments(
            {'bvid': bvid, 'title': title},
            [{'content': c.content, 'uname': c.uname, 'like': c.like,
              'rpid': c.rpid, 'mid': c.mid, 'ctime': c.ctime} for c in comments]
        )
        
        # 保存评论
        comment_data = []
        for c in comments:
            sentiment = self.analyzer.sentiment_analyzer.analyze(c.content)
            comment_data.append({
                'content': c.content,
                'uname': c.uname,
                'like': c.like,
                'rpid': c.rpid,
                'mid': c.mid,
                'ctime': c.ctime,
                'sentiment_score': sentiment.score,
                'sentiment_label': sentiment.label
            })
        await self.db.save_comments(comment_data, bvid)
        
        # 保存报告
        report_dict = {
            'bvid': report.bvid,
            'title': report.title,
            'overall_sentiment': report.overall_sentiment,
            'sentiment_score': report.sentiment_score,
            'comment_count': report.comment_count,
            'negative_ratio': len(report.negative_comments) / report.comment_count if report.comment_count else 0,
            'warning_level': report.warning_level,
            'hot_keywords': report.hot_keywords,
            'report_text': self.analyzer.generate_report_text(report)
        }
        await self.db.save_sentiment_report(report_dict)
        
        # 告警
        if report.warning_level != 'none'::
            await self.db.create_alert(
                bvid,
                'new_video_sentiment_warning',
                report.warning_level,
                f"新视频《{title}》出现{report.warning_level}级别负面舆情"
            )
            print(f"     🚨 {report.warning_level.upper()} 告警!")
        
        await self.db.mark_video_analyzed(bvid)
        print(f"     ✅ 分析完成")


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='B站舆情监控守护进程')
    parser.add_argument('--interval', '-i', type=int, default=300,
                       help='检查间隔（秒），默认300秒')
    parser.add_argument('--once', '-o', action='store_true',
                       help='只执行一次检查')
    
    args = parser.parse_args()
    
    daemon = MonitorDaemon(check_interval=args.interval)
    
    if args.once:
        # 单次执行
        await daemon.db.connect()
        await daemon._check_cycle()
        await daemon.db.close()
    else:
        # 守护进程模式
        try:
            await daemon.start()
        except KeyboardInterrupt:
            await daemon.stop()


if __name__ == '__main__':
    asyncio.run(main())
