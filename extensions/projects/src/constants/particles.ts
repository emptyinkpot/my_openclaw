/**
 * ============================================================================
 * 古文虚词配置
 * ============================================================================
 */

import type { ParticleItem, ParticleSettings } from '@/types';

/** 默认虚词配置 */
export const DEFAULT_PARTICLES: ParticleItem[] = [
  { id: "zhi", label: "之", count: 5 },
  { id: "ran", label: "然", count: 3 },
  { id: "hu", label: "乎", count: 2 },
  { id: "zhe", label: "者", count: 4 },
  { id: "ye", label: "也", count: 3 },
  { id: "yi", label: "矣", count: 2 },
  { id: "yan", label: "焉", count: 1 },
  { id: "er", label: "而", count: 6 },
  { id: "nai", label: "乃", count: 2 },
  { id: "yi2", label: "以", count: 5 },
  { id: "qi", label: "其", count: 4 },
  { id: "suo", label: "所", count: 4 },
];

/** 默认虚词设置 */
export const DEFAULT_PARTICLE_SETTINGS: ParticleSettings = {
  enableSmart: true,
  particles: DEFAULT_PARTICLES,
};

/** 生成虚词限制字符串 */
export function buildParticleLimits(settings: ParticleSettings | undefined): string {
  if (!settings || !settings.particles) return "";
  return settings.particles
    .filter(p => p.count > 0)
    .map(p => `${p.label}≤${p.count}`)
    .join(",");
}
