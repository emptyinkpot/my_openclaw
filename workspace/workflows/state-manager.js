/**
 * 工作流状态管理器
 * 
 * 管理多阶段确认的状态，支持：
 * - 暂停/恢复工作流
 * - 跨会话状态持久化
 * - 超时处理
 * 
 * @module workflows/state-manager
 */

const fs = require('fs');
const path = require('path');
const { formatLocalTime, ensureDir, appendJsonl, readJsonl } = require('../lib/utils');

// ============================================================
// 配置
// ============================================================

const STATE_DIR = '/workspace/projects/storage/workflow-states';
const PENDING_FILE = path.join(STATE_DIR, 'pending-confirmations.jsonl');
const HISTORY_FILE = path.join(STATE_DIR, 'workflow-history.jsonl');

// 确保目录存在
ensureDir(STATE_DIR);

// ============================================================
// 状态管理类
// ============================================================

class WorkflowStateManager {
  constructor() {
    this.pendingConfirmations = new Map();
    this.activeWorkflow = null;
    this.loadPendingConfirmations();
  }
  
  // ============================================================
  // 持久化
  // ============================================================
  
  /**
   * 加载待确认的工作流
   */
  loadPendingConfirmations() {
    const records = readJsonl(PENDING_FILE, { maxAge: 24 * 60 * 60 * 1000 }); // 24小时有效
    
    for (const record of records) {
      if (record.status === 'pending') {
        this.pendingConfirmations.set(record.id, record);
      }
    }
    
    console.log(`[WorkflowState] 加载 ${this.pendingConfirmations.size} 个待确认工作流`);
  }
  
  /**
   * 保存待确认的工作流
   */
  savePendingConfirmation(id, state) {
    const record = {
      id,
      status: 'pending',
      state,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(), // 添加 timestamp 用于 readJsonl 过滤
      localTime: formatLocalTime(),
    };
    
    appendJsonl(PENDING_FILE, record);
    this.pendingConfirmations.set(id, record);
    
    console.log(`[WorkflowState] 保存待确认工作流: ${id}`);
  }
  
  /**
   * 更新确认状态
   */
  updateConfirmation(id, confirmed) {
    const record = this.pendingConfirmations.get(id);
    if (!record) {
      console.log(`[WorkflowState] 未找到工作流: ${id}`);
      return false;
    }
    
    record.status = confirmed ? 'confirmed' : 'cancelled';
    record.confirmedAt = new Date().toISOString();
    
    // 写入历史
    appendJsonl(HISTORY_FILE, record);
    
    // 从待确认中移除
    this.pendingConfirmations.delete(id);
    
    // 重写待确认文件，移除已处理的记录
    this.rewritePendingFile();
    
    console.log(`[WorkflowState] 工作流 ${id} 已${confirmed ? '确认' : '取消'}`);
    return true;
  }
  
  /**
   * 重写待确认文件
   */
  rewritePendingFile() {
    const pendingRecords = Array.from(this.pendingConfirmations.values());
    fs.writeFileSync(PENDING_FILE, pendingRecords.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
  }
  
  // ============================================================
  // 工作流控制
  // ============================================================
  
  /**
   * 创建新的工作流实例
   */
  createWorkflow(userRequest) {
    const id = `wf-${Date.now().toString(36)}`;
    
    const initialState = {
      userRequest,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    
    this.activeWorkflow = {
      id,
      state: initialState,
      currentNode: 'analyze',
    };
    
    console.log(`[WorkflowState] 创建工作流: ${id}`);
    return this.activeWorkflow;
  }
  
  /**
   * 获取当前工作流
   */
  getActiveWorkflow() {
    return this.activeWorkflow;
  }
  
  /**
   * 获取待确认的工作流
   */
  getPendingConfirmation(id) {
    return this.pendingConfirmations.get(id);
  }
  
  /**
   * 列出所有待确认的工作流
   */
  listPendingConfirmations() {
    return Array.from(this.pendingConfirmations.values());
  }
  
  /**
   * 暂停工作流（等待确认）
   */
  pauseWorkflow(id, state, confirmationMessage) {
    this.savePendingConfirmation(id, {
      ...state,
      confirmationMessage,
    });
    
    return {
      paused: true,
      id,
      message: confirmationMessage,
    };
  }
  
  /**
   * 恢复工作流
   */
  resumeWorkflow(id, confirmed) {
    const record = this.pendingConfirmations.get(id);
    if (!record) {
      return { error: '工作流不存在或已过期' };
    }
    
    this.updateConfirmation(id, confirmed);
    
    return {
      resumed: true,
      id,
      confirmed,
      state: record.state,
    };
  }
  
  // ============================================================
  // 清理
  // ============================================================
  
  /**
   * 清理过期的待确认
   */
  cleanupExpired(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, record] of this.pendingConfirmations) {
      const age = now - new Date(record.createdAt).getTime();
      if (age > maxAge) {
        this.pendingConfirmations.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[WorkflowState] 清理 ${cleaned} 个过期工作流`);
    }
    
    return cleaned;
  }
}

// ============================================================
// 导出单例
// ============================================================

const stateManager = new WorkflowStateManager();

module.exports = {
  WorkflowStateManager,
  stateManager,
};
