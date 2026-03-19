"""
数据库操作模块
管理监控数据、评论数据、舆情报告
"""

import aiosqlite
import json
from typing import List, Dict, Optional, Any
from datetime import datetime
from dataclasses import asdict
import asyncio


class MonitorDatabase:
    """监控数据库"""
    
    def __init__(self, db_path: str = "data/monitor.db"):
        self.db_path = db_path
        self._connection: Optional[aiosqlite.Connection] = None
    
    async def connect(self):
        """连接数据库"""
        self._connection = await aiosqlite.connect(self.db_path)
        await self._create_tables()
    
    async def close(self):
        """关闭连接"""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    async def _create_tables(self):
        """创建表结构"""
        await self._connection.executescript("""
            CREATE TABLE IF NOT EXISTS up_monitors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mid INTEGER UNIQUE NOT NULL,
                name TEXT,
                check_interval INTEGER DEFAULT 300,
                last_check_time INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bvid TEXT UNIQUE NOT NULL,
                mid INTEGER,
                title TEXT,
                description TEXT,
                pubdate INTEGER,
                duration INTEGER,
                view_count INTEGER DEFAULT 0,
                like_count INTEGER DEFAULT 0,
                coin_count INTEGER DEFAULT 0,
                share_count INTEGER DEFAULT 0,
                reply_count INTEGER DEFAULT 0,
                subtitle_text TEXT,
                analyzed INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rpid INTEGER,
                bvid TEXT,
                mid INTEGER,
                uname TEXT,
                content TEXT,
                ctime INTEGER,
                like_count INTEGER DEFAULT 0,
                sentiment_score REAL DEFAULT 0,
                sentiment_label TEXT DEFAULT 'neutral',
                is_hot INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            
            CREATE TABLE IF NOT EXISTS sentiment_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bvid TEXT NOT NULL,
                title TEXT,
                overall_sentiment TEXT,
                sentiment_score REAL,
                comment_count INTEGER,
                negative_ratio REAL,
                warning_level TEXT,
                hot_keywords TEXT,  -- JSON array
                report_text TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bvid TEXT,
                alert_type TEXT,
                alert_level TEXT,
                message TEXT,
                is_read INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_videos_bvid ON videos(bvid);
            CREATE INDEX IF NOT EXISTS idx_comments_bvid ON comments(bvid);
            CREATE INDEX IF NOT EXISTS idx_reports_bvid ON sentiment_reports(bvid);
            CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);
        """)
        await self._connection.commit()
    
    # UP主监控相关
    async def add_up_monitor(self, mid: int, name: str = "", 
                            check_interval: int = 300) -> bool:
        """添加UP主监控"""
        try:
            await self._connection.execute(
                """INSERT OR REPLACE INTO up_monitors 
                   (mid, name, check_interval, last_check_time, is_active)
                   VALUES (?, ?, ?, 0, 1)""",
                (mid, name, check_interval)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            print(f"添加UP主监控失败: {e}")
            return False
    
    async def remove_up_monitor(self, mid: int) -> bool:
        """移除UP主监控"""
        try:
            await self._connection.execute(
                "UPDATE up_monitors SET is_active = 0 WHERE mid = ?",
                (mid,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            print(f"移除UP主监控失败: {e}")
            return False
    
    async def get_active_up_monitors(self) -> List[Dict]:
        """获取活跃的UP主监控列表"""
        cursor = await self._connection.execute(
            "SELECT * FROM up_monitors WHERE is_active = 1"
        )
        rows = await cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
    async def update_up_check_time(self, mid: int):
        """更新UP主检查时间"""
        await self._connection.execute(
            "UPDATE up_monitors SET last_check_time = strftime('%s', 'now') WHERE mid = ?",
            (mid,)
        )
        await self._connection.commit()
    
    # 视频数据相关
    async def save_video(self, video_data: Dict) -> bool:
        """保存视频数据"""
        try:
            await self._connection.execute(
                """INSERT OR REPLACE INTO videos 
                   (bvid, mid, title, description, pubdate, duration,
                    view_count, like_count, coin_count, share_count, reply_count,
                    subtitle_text, analyzed, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))""",
                (
                    video_data.get('bvid'),
                    video_data.get('mid'),
                    video_data.get('title'),
                    video_data.get('description'),
                    video_data.get('pubdate'),
                    video_data.get('duration'),
                    video_data.get('view_count', 0),
                    video_data.get('like_count', 0),
                    video_data.get('coin_count', 0),
                    video_data.get('share_count', 0),
                    video_data.get('reply_count', 0),
                    video_data.get('subtitle_text'),
                    video_data.get('analyzed', 0)
                )
            )
            await self._connection.commit()
            return True
        except Exception as e:
            print(f"保存视频数据失败: {e}")
            return False
    
    async def get_video(self, bvid: str) -> Optional[Dict]:
        """获取视频数据"""
        cursor = await self._connection.execute(
            "SELECT * FROM videos WHERE bvid = ?",
            (bvid,)
        )
        row = await cursor.fetchone()
        if row:
            columns = [description[0] for description in cursor.description]
            return dict(zip(columns, row))
        return None
    
    async def get_unanalyzed_videos(self, limit: int = 10) -> List[Dict]:
        """获取未分析的视频"""
        cursor = await self._connection.execute(
            "SELECT * FROM videos WHERE analyzed = 0 LIMIT ?",
            (limit,)
        )
        rows = await cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
    async def mark_video_analyzed(self, bvid: str):
        """标记视频已分析"""
        await self._connection.execute(
            "UPDATE videos SET analyzed = 1 WHERE bvid = ?",
            (bvid,)
        )
        await self._connection.commit()
    
    # 评论数据相关
    async def save_comments(self, comments: List[Dict], bvid: str) -> int:
        """批量保存评论"""
        count = 0
        for comment in comments:
            try:
                await self._connection.execute(
                    """INSERT OR REPLACE INTO comments 
                       (rpid, bvid, mid, uname, content, ctime, like_count,
                        sentiment_score, sentiment_label)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        comment.get('rpid'),
                        bvid,
                        comment.get('mid'),
                        comment.get('uname'),
                        comment.get('content'),
                        comment.get('ctime'),
                        comment.get('like', 0),
                        comment.get('sentiment_score', 0),
                        comment.get('sentiment_label', 'neutral')
                    )
                )
                count += 1
            except Exception as e:
                print(f"保存评论失败: {e}")
        
        await self._connection.commit()
        return count
    
    async def get_comments_by_video(self, bvid: str, 
                                    sentiment: str = None) -> List[Dict]:
        """获取视频的评论"""
        if sentiment:
            cursor = await self._connection.execute(
                "SELECT * FROM comments WHERE bvid = ? AND sentiment_label = ?",
                (bvid, sentiment)
            )
        else:
            cursor = await self._connection.execute(
                "SELECT * FROM comments WHERE bvid = ?",
                (bvid,)
            )
        rows = await cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
    # 舆情报告相关
    async def save_sentiment_report(self, report: Dict) -> bool:
        """保存舆情报告"""
        try:
            await self._connection.execute(
                """INSERT INTO sentiment_reports 
                   (bvid, title, overall_sentiment, sentiment_score,
                    comment_count, negative_ratio, warning_level,
                    hot_keywords, report_text)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    report.get('bvid'),
                    report.get('title'),
                    report.get('overall_sentiment'),
                    report.get('sentiment_score'),
                    report.get('comment_count'),
                    report.get('negative_ratio', 0),
                    report.get('warning_level'),
                    json.dumps([{'word': k.word, 'weight': k.weight} 
                               for k in report.get('hot_keywords', [])]),
                    report.get('report_text')
                )
            )
            await self._connection.commit()
            return True
        except Exception as e:
            print(f"保存舆情报告失败: {e}")
            return False
    
    async def get_latest_reports(self, limit: int = 10) -> List[Dict]:
        """获取最新的舆情报告"""
        cursor = await self._connection.execute(
            """SELECT * FROM sentiment_reports 
               ORDER BY created_at DESC LIMIT ?""",
            (limit,)
        )
        rows = await cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
    # 告警相关
    async def create_alert(self, bvid: str, alert_type: str, 
                          alert_level: str, message: str) -> bool:
        """创建告警"""
        try:
            await self._connection.execute(
                """INSERT INTO alerts (bvid, alert_type, alert_level, message)
                   VALUES (?, ?, ?, ?)""",
                (bvid, alert_type, alert_level, message)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            print(f"创建告警失败: {e}")
            return False
    
    async def get_unread_alerts(self) -> List[Dict]:
        """获取未读告警"""
        cursor = await self._connection.execute(
            """SELECT * FROM alerts WHERE is_read = 0 
               ORDER BY created_at DESC"""
        )
        rows = await cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    
    async def mark_alert_read(self, alert_id: int):
        """标记告警已读"""
        await self._connection.execute(
            "UPDATE alerts SET is_read = 1 WHERE id = ?",
            (alert_id,)
        )
        await self._connection.commit()


# 便捷函数
async def init_database(db_path: str = "data/monitor.db"):
    """初始化数据库"""
    db = MonitorDatabase(db_path)
    await db.connect()
    await db.close()
    print(f"数据库初始化完成: {db_path}")


# 测试
if __name__ == "__main__":
    asyncio.run(init_database())
