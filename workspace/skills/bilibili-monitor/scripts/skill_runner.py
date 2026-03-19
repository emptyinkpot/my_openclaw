#!/usr/bin/env python3
"""
Skill执行脚本
作为OpenClaw TypeScript接口和Python模块之间的桥梁
"""

import sys
import asyncio
import json
from pathlib import Path

# 添加lib目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from bilibili_api import BilibiliAPI, get_video_summary
from sentiment_analyzer import PublicOpinionAnalyzer
from database import MonitorDatabase


async def init_database():
    """初始化数据库"""
    db = MonitorDatabase()
    await db.connect()
    await db.close()
    print("✅ 数据库初始化完成")


async def analyze_video(bvid: str):
    """分析视频舆情"""
    print(f"🔍 正在分析视频: {bvid}")
    
    # 获取视频数据
    async with BilibiliAPI() as api:
        video_info = await api.get_video_info(bvid)
        if not video_info:
            print(f"❌ 无法获取视频信息: {bvid}")
            return
        
        print(f"📺 {video_info.title}")
        print(f"   UP主: {video_info.owner.get('name', '未知')}")
        print(f"   播放量: {video_info.play_count} | 点赞: {video_info.like_count} | 评论: {video_info.comment_count}")
        print()
        
        # 获取评论
        comments = await api.get_comments(bvid, page=1, page_size=50)
        print(f"💬 获取到 {len(comments)} 条评论")
        print()
        
        # 保存视频数据到数据库
        db = MonitorDatabase()
        await db.connect()
        
        await db.save_video({
            'bvid': bvid,
            'mid': video_info.owner.get('mid', 0),
            'title': video_info.title,
            'description': video_info.desc,
            'pubdate': video_info.pubdate,
            'duration': video_info.duration,
            'view_count': video_info.play_count,
            'like_count': video_info.like_count,
            'coin_count': video_info.coin_count,
            'share_count': video_info.share_count,
            'reply_count': video_info.comment_count,
            'subtitle_text': None,
            'analyzed': 0
        })
        
        # 分析舆情
        analyzer = PublicOpinionAnalyzer()
        report = analyzer.analyze_video_comments(
            {'bvid': bvid, 'title': video_info.title},
            [{'content': c.content, 'uname': c.uname, 'like': c.like, 
              'rpid': c.rpid, 'mid': c.mid, 'ctime': c.ctime} for c in comments]
        )
        
        # 保存评论和报告
        await db.save_comments(
            [{'content': c.content, 'uname': c.uname, 'like': c.like,
              'rpid': c.rpid, 'mid': c.mid, 'ctime': c.ctime,
              'sentiment_score': s.score, 'sentiment_label': s.label}
             for c, s in zip(comments, 
                           [analyzer.sentiment_analyzer.analyze(c.content) for c in comments])],
            bvid
        )
        
        report_dict = {
            'bvid': report.bvid,
            'title': report.title,
            'overall_sentiment': report.overall_sentiment,
            'sentiment_score': report.sentiment_score,
            'comment_count': report.comment_count,
            'negative_ratio': len(report.negative_comments) / report.comment_count if report.comment_count else 0,
            'warning_level': report.warning_level,
            'hot_keywords': report.hot_keywords,
            'report_text': analyzer.generate_report_text(report)
        }
        await db.save_sentiment_report(report_dict)
        
        # 如果有警告，创建告警
        if report.warning_level != 'none'::
            await db.create_alert(
                bvid, 
                'sentiment_warning',
                report.warning_level,
                f"视频《{video_info.title}》出现{report.warning_level}级别负面舆情"
            )
        
        await db.mark_video_analyzed(bvid)
        await db.close()
        
        # 输出报告
        print(analyzer.generate_report_text(report))


async def monitor_up(mid: str, name: str = ""):
    """添加UP主监控"""
    db = MonitorDatabase()
    await db.connect()
    
    # 获取UP主信息
    async with BilibiliAPI() as api:
        up_info = await api.get_up_info(int(mid))
        if up_info:
            name = up_info.name
            print(f"📺 UP主: {name}")
            print(f"   粉丝: {up_info.follower}")
            print(f"   签名: {up_info.sign[:50]}..." if len(up_info.sign) > 50 else f"   签名: {up_info.sign}")
    
    success = await db.add_up_monitor(int(mid), name)
    await db.close()
    
    if success:
        print(f"✅ 已添加监控: {name or mid}")
        print(f"   检查间隔: 5分钟")
    else:
        print(f"❌ 添加监控失败")


async def list_monitors():
    """列出监控的UP主"""
    db = MonitorDatabase()
    await db.connect()
    
    monitors = await db.get_active_up_monitors()
    await db.close()
    
    if not monitors:
        print("📭 暂无监控的UP主")
        return
    
    print(f"📺 监控中的UP主 ({len(monitors)}个):\n")
    for m in monitors:
        last_check = m.get('last_check_time', 0)
        last_check_str = "从未" if last_check == 0 else f"{last_check}"
        print(f"• {m.get('name', '未知')} (UID: {m['mid']})")
        print(f"  检查间隔: {m.get('check_interval', 300)}秒")
        print(f"  最后检查: {last_check_str}")
        print()


async def remove_monitor(mid: str):
    """移除UP主监控"""
    db = MonitorDatabase()
    await db.connect()
    
    success = await db.remove_up_monitor(int(mid))
    await db.close()
    
    if success:
        print(f"✅ 已移除监控: {mid}")
    else:
        print(f"❌ 移除监控失败")


async def get_reports(limit: int = 5):
    """获取舆情报告"""
    db = MonitorDatabase()
    await db.connect()
    
    reports = await db.get_latest_reports(limit)
    await db.close()
    
    if not reports:
        print("📭 暂无舆情报告")
        return
    
    print(f"📊 最新舆情报告 (共{len(reports)}条):\n")
    
    for i, r in enumerate(reports, 1):
        warning_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢', 'none': '⚪'}
        emoji = warning_emoji.get(r.get('warning_level', 'none'), '⚪')
        
        print(f"{i}. {emoji} {r.get('title', '未知')}")
        print(f"   BV: {r.get('bvid')}")
        print(f"   情感: {r.get('overall_sentiment')} | 得分: {r.get('sentiment_score', 0):.2f}")
        print(f"   评论数: {r.get('comment_count', 0)}")
        
        # 解析关键词
        try:
            keywords = json.loads(r.get('hot_keywords', '[]'))
            if keywords:
                kw_str = ', '.join([k['word'] for k in keywords[:3]])
                print(f"   关键词: {kw_str}")
        except:
            pass
        
        print()


async def get_alerts():
    """获取未读告警"""
    db = MonitorDatabase()
    await db.connect()
    
    alerts = await db.get_unread_alerts()
    await db.close()
    
    if not alerts:
        print("✅ 暂无未读告警")
        return
    
    print(f"🔔 未读告警 ({len(alerts)}条):\n")
    
    for a in alerts:
        level_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        emoji = level_emoji.get(a.get('alert_level', 'low'), '⚪')
        
        print(f"{emoji} [{a.get('alert_level', 'unknown').upper()}] {a.get('alert_type')}")
        print(f"   {a.get('message')}")
        print(f"   BV: {a.get('bvid')}")
        print()


async def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python skill_runner.py <command> [args...]")
        print("")
        print("命令:")
        print("  init                    - 初始化数据库")
        print("  analyze <bvid>          - 分析视频舆情")
        print("  monitor <mid> [name]    - 添加UP主监控")
        print("  list                    - 列出监控的UP主")
        print("  remove <mid>            - 移除UP主监控")
        print("  reports [limit]         - 获取舆情报告")
        print("  alerts                  - 获取未读告警")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == 'init':
            await init_database()
        
        elif command == 'analyze':
            if len(sys.argv) < 3:
                print("❌ 请提供BV号")
                sys.exit(1)
            await analyze_video(sys.argv[2])
        
        elif command == 'monitor':
            if len(sys.argv) < 3:
                print("❌ 请提供UID")
                sys.exit(1)
            name = sys.argv[3] if len(sys.argv) > 3 else ""
            await monitor_up(sys.argv[2], name)
        
        elif command == 'list':
            await list_monitors()
        
        elif command == 'remove':
            if len(sys.argv) < 3:
                print("❌ 请提供UID")
                sys.exit(1)
            await remove_monitor(sys.argv[2])
        
        elif command == 'reports':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            await get_reports(limit)
        
        elif command == 'alerts':
            await get_alerts()
        
        else:
            print(f"❌ 未知命令: {command}")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
