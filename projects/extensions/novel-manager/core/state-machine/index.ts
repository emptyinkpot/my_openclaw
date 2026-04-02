
/**
 * 状态机模块 - 统一入口
 * 
 * 功能：
 * - 集中管理章节状态转换
 * - 状态转换验证
 * - 状态转换日志记录
 */

export {
  ChapterStateMachine,
  getChapterStateMachine
} from './ChapterStateMachine';

export * from './types';
export * from './config';
