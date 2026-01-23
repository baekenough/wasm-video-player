/**
 * Settings module exports
 */

// Types
export type {
  SeekSettings,
  SubtitleSettings,
  PlaybackSettings,
  UISettings,
  AudioSettings,
  SettingsData,
  SettingsSection,
  DeepPartial,
  SettingsChangeEvent,
  SettingsListener,
  StorageAdapter,
} from './types';

// Defaults
export {
  DEFAULT_SEEK_SETTINGS,
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_PLAYBACK_SETTINGS,
  DEFAULT_UI_SETTINGS,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_SETTINGS,
  SETTINGS_RANGES,
  createDefaultSettings,
} from './defaults';

// Settings class
export { Settings } from './Settings';

// Storage adapter
export { LocalStorageAdapter } from './LocalStorageAdapter';
export type { LocalStorageAdapterConfig } from './LocalStorageAdapter';

// UI Panel
export { SettingsPanel } from './SettingsPanel';
export type { SettingsPanelConfig } from './SettingsPanel';
