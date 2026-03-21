/**
 * 配置管理器 - 实现开关设置记忆功能
 * 
 * @module modules/polish/config-manager
 */

import type { PolishSettings, PolishStepConfig } from './types';
import { StepRegistry } from './steps/registry';

/**
 * 默认配置
 */
const DEFAULT_SETTINGS: PolishSettings = {
  steps: {},
  global: {
    style: 'literary',
    temperature: 0.7,
    maxLength: 100000,
  },
  resources: {},
};

/**
 * 配置管理器
 * 
 * 功能：
 * 1. 保存用户设置到本地存储
 * 2. 从本地存储加载用户设置
 * 3. 提供默认设置
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private settings: PolishSettings; // 不再是 null
  private readonly STORAGE_KEY = 'content_craft_settings';
  
  private constructor() {
    this.settings = this.getDefaultSettings(); // 初始化默认值
    this.loadSettings();
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * 获取默认设置
   */
  getDefaultSettings(): PolishSettings {
    const defaultSettings: PolishSettings = { ...DEFAULT_SETTINGS };
    
    // 初始化所有步骤的默认设置
    StepRegistry.initialize();
    const allSteps = StepRegistry.getAll();
    
    allSteps.forEach(step => {
      defaultSettings.steps[step.id] = {
        ...step.defaultSettings,
        enabled: !step.fixed, // 非固定步骤默认启用
      };
    });
    
    return defaultSettings;
  }
  
  /**
   * 加载设置
   */
  loadSettings(): PolishSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        // 浏览器环境
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          this.settings = JSON.parse(saved);
          console.log('[ConfigManager] 从 localStorage 加载设置成功');
          return this.settings;
        }
      } else {
        // Node.js 环境，尝试从文件加载
        try {
          const fs = require('fs');
          const path = require('path');
          const configPath = path.join(process.cwd(), '.content-craft-config.json');
          
          if (fs.existsSync(configPath)) {
            const saved = fs.readFileSync(configPath, 'utf8');
            this.settings = JSON.parse(saved);
            console.log('[ConfigManager] 从文件加载设置成功');
            return this.settings;
          }
        } catch (e) {
          console.warn('[ConfigManager] 无法从文件加载设置:', e);
        }
      }
    } catch (e) {
      console.warn('[ConfigManager] 加载设置失败，使用默认设置:', e);
    }
    
    // 使用默认设置
    this.settings = this.getDefaultSettings();
    return this.settings;
  }
  
  /**
   * 保存设置
   */
  saveSettings(settings: PolishSettings): void {
    this.settings = settings;
    
    try {
      if (typeof localStorage !== 'undefined') {
        // 浏览器环境
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
        console.log('[ConfigManager] 保存设置到 localStorage 成功');
      } else {
        // Node.js 环境，保存到文件
        try {
          const fs = require('fs');
          const path = require('path');
          const configPath = path.join(process.cwd(), '.content-craft-config.json');
          
          fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
          console.log('[ConfigManager] 保存设置到文件成功');
        } catch (e) {
          console.warn('[ConfigManager] 无法保存设置到文件:', e);
        }
      }
    } catch (e) {
      console.error('[ConfigManager] 保存设置失败:', e);
    }
  }
  
  /**
   * 获取当前设置
   */
  getSettings(): PolishSettings {
    return this.settings;
  }
  
  /**
   * 更新单个步骤设置
   */
  updateStepSetting(stepId: string, settings: Partial<{ enabled: boolean; [key: string]: unknown }>): void {
    const currentSettings = this.getSettings();
    
    if (!currentSettings.steps[stepId]) {
      currentSettings.steps[stepId] = { enabled: true };
    }
    
    currentSettings.steps[stepId] = {
      ...currentSettings.steps[stepId],
      ...settings,
    };
    
    this.saveSettings(currentSettings);
  }
  
  /**
   * 更新全局设置
   */
  updateGlobalSetting(globalSettings: Partial<PolishSettings['global']>): void {
    const currentSettings = this.getSettings();
    
    currentSettings.global = {
      ...currentSettings.global,
      ...globalSettings,
    };
    
    this.saveSettings(currentSettings);
  }
  
  /**
   * 重置为默认设置
   */
  resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings(this.settings);
  }
  
  /**
   * 获取所有步骤配置（用于UI显示）
   */
  getAllStepConfigs(): PolishStepConfig[] {
    StepRegistry.initialize();
    return StepRegistry.getAllConfigs();
  }
}

// 导出单例
export const configManager = ConfigManager.getInstance();