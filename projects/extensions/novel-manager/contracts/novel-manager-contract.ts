export interface NovelManagerModuleContract {
  moduleId: 'novel-manager';
  pageRoute: '/novel';
  apiPrefix: '/api/novel';
  capabilities: readonly [
    'content-craft',
    'audit-auto',
    'publish-auto',
    'smart-scheduler',
    'resource-library'
  ];
}

export type NovelChapterStatus =
  | 'outline'
  | 'first_draft'
  | 'polished'
  | 'audited'
  | 'published';

export interface NovelManagerHealthSnapshot {
  ok: boolean;
  module: 'novel-manager';
  timestamp: string;
}
