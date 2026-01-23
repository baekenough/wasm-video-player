/**
 * Default Settings - Default values for all settings
 *
 * These values are used when settings are not persisted
 * or when resetting to defaults.
 */

import type { SettingsData } from './types';

/**
 * Default seek settings
 */
export const DEFAULT_SEEK_SETTINGS = {
  shortInterval: 5,
  longInterval: 60,
} as const;

/**
 * Default subtitle settings
 */
export const DEFAULT_SUBTITLE_SETTINGS = {
  fontSize: 24,
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  timingOffset: 0,
  enabled: true,
} as const;

/**
 * Default playback settings
 */
export const DEFAULT_PLAYBACK_SETTINGS = {
  autoPlay: true,
  loop: false,
  speed: 1.0,
} as const;

/**
 * Default UI settings
 */
export const DEFAULT_UI_SETTINGS = {
  controlBarTimeout: 3000,
} as const;

/**
 * Default audio settings
 */
export const DEFAULT_AUDIO_SETTINGS = {
  volume: 1.0,
  muted: false,
} as const;

/**
 * Complete default settings
 */
export const DEFAULT_SETTINGS: SettingsData = {
  seek: { ...DEFAULT_SEEK_SETTINGS },
  subtitle: { ...DEFAULT_SUBTITLE_SETTINGS },
  playback: { ...DEFAULT_PLAYBACK_SETTINGS },
  ui: { ...DEFAULT_UI_SETTINGS },
  audio: { ...DEFAULT_AUDIO_SETTINGS },
};

/**
 * Settings validation ranges
 */
export const SETTINGS_RANGES = {
  seek: {
    shortInterval: { min: 1, max: 60 },
    longInterval: { min: 5, max: 300 },
  },
  subtitle: {
    fontSize: { min: 8, max: 72 },
    timingOffset: { min: -10000, max: 10000 },
  },
  playback: {
    speed: { min: 0.25, max: 4.0 },
  },
  ui: {
    controlBarTimeout: { min: 1000, max: 30000 },
  },
  audio: {
    volume: { min: 0, max: 1 },
  },
} as const;

/**
 * Create a fresh copy of default settings
 */
export function createDefaultSettings(): SettingsData {
  return {
    seek: { ...DEFAULT_SEEK_SETTINGS },
    subtitle: { ...DEFAULT_SUBTITLE_SETTINGS },
    playback: { ...DEFAULT_PLAYBACK_SETTINGS },
    ui: { ...DEFAULT_UI_SETTINGS },
    audio: { ...DEFAULT_AUDIO_SETTINGS },
  };
}
