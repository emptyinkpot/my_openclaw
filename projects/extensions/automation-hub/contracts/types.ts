export type JsonRecord = Record<string, unknown>;

export interface AutomationSchedule extends JsonRecord {}

export interface AutomationFeishuConfig extends JsonRecord {
  enabled: boolean;
  bot: JsonRecord;
  settings: JsonRecord;
  templates: JsonRecord[];
  commands: JsonRecord[];
  webhooks: JsonRecord[];
}

export interface AutomationFeishuMessage extends JsonRecord {}
