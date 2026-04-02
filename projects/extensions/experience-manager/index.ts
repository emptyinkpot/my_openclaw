import { createApp, start } from './backend/app';
import { ExperienceRepository, experienceRepo } from './core/ExperienceRepository';
import { NoteRepository, noteRepo } from './core/NoteRepository';
import { memorySync, searchRelatedExperiences, syncExperienceToMemory } from './core/MemorySync';
import { getCloudSyncStatus, syncAllToCloud, syncExperienceToCloud, syncNoteToCloud } from './core/CloudSync';

export const version = '1.0.0';

export { createApp, start };
export { createExperienceRouter } from './backend/routes/experience-routes';
export { ExperienceRepository, experienceRepo };
export { NoteRepository, noteRepo };
export { memorySync, searchRelatedExperiences, syncExperienceToMemory };
export { getCloudSyncStatus, syncAllToCloud, syncExperienceToCloud, syncNoteToCloud };

export type {
  ExperienceData,
  ExperienceRecord,
  ExperienceStats,
} from './core/ExperienceRepository';

export type {
  NoteData,
  NoteRecord,
} from './core/NoteRepository';

export type {
  CloudExperienceEnvelope,
  CloudNoteEnvelope,
  CloudSyncBatch,
  CloudSyncConfig,
  CloudSyncResult,
  CloudSyncStatus,
} from './core/CloudSync';

const moduleApi = {
  version,
  createApp,
  start,
  ExperienceRepository,
  experienceRepo,
  NoteRepository,
  noteRepo,
};

export default moduleApi;

if (require.main === module) {
  start().catch((error) => {
    console.error('[experience-manager] 启动失败:', error);
    process.exit(1);
  });
}
