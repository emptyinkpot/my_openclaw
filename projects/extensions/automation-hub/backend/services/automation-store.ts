import type {
  AutomationFeishuConfig,
  AutomationFeishuMessage,
  AutomationSchedule,
} from '../../contracts';
import { createDefaultFeishuConfig, normalizeFeishuConfig } from '../../core/defaults';

let schedules: AutomationSchedule[] = [];
let feishuConfig: AutomationFeishuConfig = createDefaultFeishuConfig();
let feishuMessages: AutomationFeishuMessage[] = [];

export function getSchedules(): AutomationSchedule[] {
  return [...schedules];
}

export function setSchedules(nextSchedules: AutomationSchedule[]): void {
  schedules = [...nextSchedules];
}

export function getFeishuConfig(): AutomationFeishuConfig {
  return {
    ...feishuConfig,
    bot: { ...feishuConfig.bot },
    settings: { ...feishuConfig.settings },
    templates: [...feishuConfig.templates],
    commands: [...feishuConfig.commands],
    webhooks: [...feishuConfig.webhooks],
  };
}

export function setFeishuConfig(nextConfig: unknown): void {
  feishuConfig = normalizeFeishuConfig(nextConfig);
}

export function getFeishuMessages(limit?: number): AutomationFeishuMessage[] {
  const items = [...feishuMessages];

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    return items.slice(-limit);
  }

  return items;
}

export function addFeishuMessage(message: AutomationFeishuMessage): void {
  feishuMessages.push(message);
}

export function clearFeishuMessages(): void {
  feishuMessages = [];
}
