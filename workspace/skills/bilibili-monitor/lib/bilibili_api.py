"""
B站API封装模块
提供视频、评论、UP主数据的统一接口
"""

import asyncio
import json
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# 尝试导入bilibili-api
# 如果不存在，使用备用HTTP方案
try:
    from bilibili_api import video, user, comment, Credential
    from bilibili_api.exceptions import ResponseCodeException
    BILI_API_AVAILABLE = True
except ImportError:
    BILI_API_AVAILABLE = False
    print("⚠️ bilibili-api-python 未安装，使用备用HTTP方案")

import aiohttp
import aiofiles


@dataclass
class VideoInfo:
    """视频信息数据类"""
    bvid: str
    title: str
    desc: str
    owner: Dict[str, Any]
    stat: Dict[str, int]
    duration: int
    pubdate: int
    subtitle_url: Optional[str] = None
    subtitle_text: Optional[str] = None
    
    @property
    def play_count(self) -> int:
        return self.stat.get('view', 0)
    
    @property
    def like_count(self) -> int:
        return self.stat.get('like', 0)
    
    @property
    def coin_count(self) -> int:
        return self.stat.get('coin', 0)
    
    @property
    def share_count(self) -> int:
        return self.stat.get('share', 0)
    
    @property
    def comment_count(self) -> int:
        return self.stat.get('reply', 0)


@dataclass
class CommentInfo:
    """评论信息数据类"""
    rpid: int
    mid: int
    uname: str
    content: str
    ctime: int
    like: int
    replies: List['CommentInfo'] = None
    
    def __post_init__(self):
        if self.replies is None:
            self.replies = []


@dataclass
class UPInfo:
    """UP主信息数据类"""
    mid: int
    name: str
    face: str
    sign: str
    follower: int
    following: int


class BilibiliAPI:
    """B站API客户端"""
    
    def __init__(self, sessdata: str = "", bili_jct: str = "", buvid3: str = ""):
        self.credential = None
        if sessdata and BILI_API_AVAILABLE:
            self.credential = Credential(
                sessdata=sessdata,
                bili_jct=bili_jct,
                buvid3=buvid3
            )
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.bilibili.com'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_video_info(self, bvid: str) -> Optional[VideoInfo]:
        """获取视频基本信息"""
        try:
            if BILI_API_AVAILABLE and self.credential:
                v = video.Video(bvid=bvid, credential=self.credential)
                info = await v.get_info()
                return VideoInfo(
                    bvid=bvid,
                    title=info.get('title', ''),
                    desc=info.get('desc', ''),
                    owner=info.get('owner', {}),
                    stat=info.get('stat', {}),
                    duration=info.get('duration', 0),
                    pubdate=info.get('pubdate', 0)
                )
            else:
                # 备用HTTP方案
                return await self._get_video_info_http(bvid)
        except Exception as e:
            print(f"获取视频信息失败: {e}")
            return None
    
    async def _get_video_info_http(self, bvid: str) -> Optional[VideoInfo]:
        """HTTP方式获取视频信息"""
        url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
        async with self.session.get(url) as resp:
            data = await resp.json()
            if data.get('code') == 0:
                info = data['data']
                return VideoInfo(
                    bvid=bvid,
                    title=info.get('title', ''),
                    desc=info.get('desc', ''),
                    owner=info.get('owner', {}),
                    stat=info.get('stat', {}),
                    duration=info.get('duration', 0),
                    pubdate=info.get('pubdate', 0)
                )
            return None
    
    async def get_video_subtitle(self, bvid: str) -> Optional[str]:
        """获取视频字幕/CC字幕"""
        try:
            if BILI_API_AVAILABLE and self.credential:
                v = video.Video(bvid=bvid, credential=self.credential)
                subtitles = await v.get_subtitle()
                
                if subtitles and 'subtitles' in subtitles and subtitles['subtitles']:
                    # 获取第一个字幕
                    sub_url = subtitles['subtitles'][0]['subtitle_url']
                    # 下载字幕内容
                    async with self.session.get(sub_url) as resp:
                        sub_data = await resp.json()
                        # 提取所有字幕文本
                        texts = [item['content'] for item in sub_data.get('body', [])]
                        return '\n'.join(texts)
            return None
        except Exception as e:
            print(f"获取字幕失败: {e}")
            return None
    
    async def get_comments(self, bvid: str, page: int = 1, 
                          page_size: int = 20) -> List[CommentInfo]:
        """获取视频评论"""
        try:
            if BILI_API_AVAILABLE and self.credential:
                v = video.Video(bvid=bvid, credential=self.credential)
                comments_data = await v.get_comments(page_index=page)
                return self._parse_comments(comments_data)
            else:
                return await self._get_comments_http(bvid, page, page_size)
        except Exception as e:
            print(f"获取评论失败: {e}")
            return []
    
    async def _get_comments_http(self, bvid: str, page: int, 
                                  page_size: int) -> List[CommentInfo]:
        """HTTP方式获取评论"""
        url = f"https://api.bilibili.com/x/v2/reply?type=1&oid={bvid}&pn={page}&ps={page_size}"
        async with self.session.get(url) as resp:
            data = await resp.json()
            if data.get('code') == 0:
                return self._parse_comments(data['data'])
            return []
    
    def _parse_comments(self, data: Dict) -> List[CommentInfo]:
        """解析评论数据"""
        comments = []
        replies = data.get('replies', [])
        
        for item in replies:
            content = item.get('content', {}).get('message', '')
            member = item.get('member', {})
            
            comment = CommentInfo(
                rpid=item.get('rpid', 0),
                mid=item.get('mid', 0),
                uname=member.get('uname', ''),
                content=content,
                ctime=item.get('ctime', 0),
                like=item.get('like', 0),
                replies=[]
            )
            
            # 解析二级评论
            sub_replies = item.get('replies', [])
            for sub in sub_replies:
                sub_content = sub.get('content', {}).get('message', '')
                sub_member = sub.get('member', {})
                comment.replies.append(CommentInfo(
                    rpid=sub.get('rpid', 0),
                    mid=sub.get('mid', 0),
                    uname=sub_member.get('uname', ''),
                    content=sub_content,
                    ctime=sub.get('ctime', 0),
                    like=sub.get('like', 0)
                ))
            
            comments.append(comment)
        
        return comments
    
    async def get_up_videos(self, mid: int, page: int = 1, 
                           page_size: int = 30) -> List[Dict]:
        """获取UP主视频列表"""
        try:
            if BILI_API_AVAILABLE and self.credential:
                u = user.User(uid=mid, credential=self.credential)
                videos_data = await u.get_videos(page=page)
                return videos_data.get('list', [])
            else:
                return await self._get_up_videos_http(mid, page, page_size)
        except Exception as e:
            print(f"获取UP主视频失败: {e}")
            return []
    
    async def _get_up_videos_http(self, mid: int, page: int, 
                                   page_size: int) -> List[Dict]:
        """HTTP方式获取UP主视频"""
        url = f"https://api.bilibili.com/x/space/wbi/arc/search?mid={mid}&pn={page}&ps={page_size}"
        async with self.session.get(url) as resp:
            data = await resp.json()
            if data.get('code') == 0:
                return data['data'].get('list', {}).get('vlist', [])
            return []
    
    async def get_up_info(self, mid: int) -> Optional[UPInfo]:
        """获取UP主信息"""
        try:
            if BILI_API_AVAILABLE and self.credential:
                u = user.User(uid=mid, credential=self.credential)
                info = await u.get_user_info()
                return UPInfo(
                    mid=mid,
                    name=info.get('name', ''),
                    face=info.get('face', ''),
                    sign=info.get('sign', ''),
                    follower=info.get('follower', 0),
                    following=info.get('following', 0)
                )
            else:
                return await self._get_up_info_http(mid)
        except Exception as e:
            print(f"获取UP主信息失败: {e}")
            return None
    
    async def _get_up_info_http(self, mid: int) -> Optional[UPInfo]:
        """HTTP方式获取UP主信息"""
        url = f"https://api.bilibili.com/x/space/acc/info?mid={mid}"
        async with self.session.get(url) as resp:
            data = await resp.json()
            if data.get('code') == 0:
                info = data['data']
                # 获取粉丝数
                stat_url = f"https://api.bilibili.com/x/relation/stat?vmid={mid}"
                async with self.session.get(stat_url) as stat_resp:
                    stat_data = await stat_resp.json()
                    if stat_data.get('code') == 0:
                        stat = stat_data['data']
                        return UPInfo(
                            mid=mid,
                            name=info.get('name', ''),
                            face=info.get('face', ''),
                            sign=info.get('sign', ''),
                            follower=stat.get('follower', 0),
                            following=stat.get('following', 0)
                        )
            return None


# 便捷函数
async def get_video_summary(bvid: str, credential: Optional[Credential] = None) -> Dict:
    """获取视频摘要信息"""
    async with BilibiliAPI() as api:
        info = await api.get_video_info(bvid)
        if not info:
            return {"error": "无法获取视频信息"}
        
        # 获取字幕
        subtitle = await api.get_video_subtitle(bvid)
        
        # 获取评论（前20条）
        comments = await api.get_comments(bvid, page=1)
        
        return {
            "title": info.title,
            "bvid": bvid,
            "up_name": info.owner.get('name', ''),
            "up_mid": info.owner.get('mid', 0),
            "description": info.desc,
            "statistics": {
                "play": info.play_count,
                "like": info.like_count,
                "coin": info.coin_count,
                "share": info.share_count,
                "comment": info.comment_count
            },
            "subtitle": subtitle,
            "comments_sample": [
                {
                    "user": c.uname,
                    "content": c.content,
                    "likes": c.like
                } for c in comments[:5]
            ]
        }


# 测试
if __name__ == "__main__":
    async def test():
        bvid = "BV1xx411c7mD"  # 测试视频
        result = await get_video_summary(bvid)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    asyncio.run(test())
