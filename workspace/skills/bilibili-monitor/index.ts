/**
 * B站舆情监控 Skill - OpenClaw入口
 * 
 * 功能：
 * - 监控B站UP主新视频
 * - 分析视频评论舆情
 * - 生成舆情报告
 * - 告警负面舆情
 */

import { spawn } from 'child_process';
import { join } from 'path';

const SKILL_DIR = '/workspace/projects/workspace/skills/bilibili-monitor';
const PYTHON_SCRIPT = join(SKILL_DIR, 'scripts', 'skill_runner.py');

/**
 * 执行Python脚本并返回结果
 */
function runPython(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [PYTHON_SCRIPT, ...args], {
      cwd: SKILL_DIR,
      env: {
        ...process.env,
        PYTHONPATH: SKILL_DIR
      }
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python脚本错误: ${error || '未知错误'}`));
        return;
      }
      resolve(output.trim());
    });

    python.on('error', (err) => {
      reject(new Error(`无法执行Python: ${err.message}`));
    });
  });
}

/**
 * 分析B站视频舆情
 * @param bvid - 视频BV号
 */
export async function analyze_video(bvid: string): Promise<string> {
  try {
    // 清理BV号
    const cleanBvid = bvid.replace(/BV:?\s*/i, '').trim();
    if (!cleanBvid || cleanBvid.length < 5) {
      return '❌ 请提供有效的BV号，例如: BV1xx411c7mD';
    }

    const result = await runPython(['analyze', cleanBvid]);
    return result;
  } catch (error) {
    return `❌ 分析失败: ${error}`;
  }
}

/**
 * 添加UP主监控
 * @param mid - UP主UID
 * @param name - UP主名称（可选）
 */
export async function monitor_up(mid: string, name: string = ''): Promise<string> {
  try {
    const cleanMid = mid.replace(/UID:?\s*/i, '').trim();
    if (!cleanMid || isNaN(Number(cleanMid))) {
      return '❌ 请提供有效的UID，例如: 123456';
    }

    const result = await runPython(['monitor', cleanMid, name]);
    return result;
  } catch (error) {
    return `❌ 添加监控失败: ${error}`;
  }
}

/**
 * 列出监控的UP主
 */
export async function list_monitors(): Promise<string> {
  try {
    const result = await runPython(['list']);
    return result;
  } catch (error) {
    return `❌ 获取监控列表失败: ${error}`;
  }
}

/**
 * 获取最新舆情报告
 * @param limit - 报告数量
 */
export async function get_reports(limit: number = 5): Promise<string> {
  try {
    const result = await runPython(['reports', String(limit)]);
    return result;
  } catch (error) {
    return `❌ 获取报告失败: ${error}`;
  }
}

/**
 * 获取未读告警
 */
export async function get_alerts(): Promise<string> {
  try {
    const result = await runPython(['alerts']);
    return result;
  } catch (error) {
    return `❌ 获取告警失败: ${error}`;
  }
}

/**
 * 移除UP主监控
 * @param mid - UP主UID
 */
export async function remove_monitor(mid: string): Promise<string> {
  try {
    const cleanMid = mid.replace(/UID:?\s*/i, '').trim();
    if (!cleanMid || isNaN(Number(cleanMid))) {
      return '❌ 请提供有效的UID';
    }

    const result = await runPython(['remove', cleanMid]);
    return result;
  } catch (error) {
    return `❌ 移除监控失败: ${error}`;
  }
}

/**
 * 初始化数据库
 */
export async function init_database(): Promise<string> {
  try {
    const result = await runPython(['init']);
    return result;
  } catch (error) {
    return `❌ 初始化失败: ${error}`;
  }
}

/**
 * 获取Skill帮助信息
 */
export async function get_help(): Promise<string> {
  return `🎬 B站舆情监控 Skill

📌 功能：
  • 分析B站视频评论舆情
  • 监控UP主新视频发布
  • 自动情感分析 & 关键词提取
  • 负面舆情告警

📖 使用方法：

1️⃣ 分析视频舆情：
   analyze_video("BV1xx411c7mD")
   
2️⃣ 添加UP主监控：
   monitor_up("123456", "UP主名称")
   
3️⃣ 查看监控列表：
   list_monitors()
   
4️⃣ 获取舆情报告：
   get_reports(5)
   
5️⃣ 查看未读告警：
   get_alerts()
   
6️⃣ 移除监控：
   remove_monitor("123456")

⚠️ 注意：
  • 首次使用请先运行 init_database()
  • 需要安装依赖: pip install bilibili-api-python jieba aiosqlite
`;
}
