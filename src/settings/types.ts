/**
 * Settings Types - Type definitions for player settings
 *
 * Defines all configurable settings for the video player including
 * seek behavior, subtitle display, playback options, UI, and audio.
 */

/**
 * Seek settings for skip forward/backward
 */
export interface SeekSettings {
  /** Short skip interval in seconds (e.g., arrow keys) */
  shortInterval: number;
  /** Long skip interval in seconds (e.g., page up/down) */
  longInterval: number;
}

/**
 * Subtitle display settings
 */
export interface SubtitleSettings {
  /** Font size in pixels */
  fontSize: number;
  /** Text color (CSS color value) */
  color: string;
  /** Background color (CSS color value) */
  backgroundColor: string;
  /** Timing offset in milliseconds (positive = delayed, negative = early) */
  timingOffset: number;
  /** Whether subtitles are enabled */
  enabled: boolean;
}

/**
 * Playback behavior settings
 */
export interface PlaybackSettings {
  /** Auto-play when video is loaded */
  autoPlay: boolean;
  /** Loop video when it ends */
  loop: boolean;
  /** Playback speed multiplier (0.25 to 4.0) */
  speed: number;
}

/**
 * UI behavior settings
 */
export interface UISettings {
  /** Control bar auto-hide timeout in milliseconds */
  controlBarTimeout: number;
}

/**
 * Audio settings
 */
export interface AudioSettings {
  /** Volume level (0.0 to 1.0) */
  volume: number;
  /** Whether audio is muted */
  muted: boolean;
}

/**
 * Complete settings data structure
 */
export interface SettingsData {
  seek: SeekSettings;
  subtitle: SubtitleSettings;
  playback: PlaybackSettings;
  ui: UISettings;
  audio: AudioSettings;
}

/**
 * Settings section keys
 */
export type SettingsSection = keyof SettingsData;

/**
 * Deep partial type for partial updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Settings change event
 */
export interface SettingsChangeEvent {
  section: SettingsSection;
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Settings listener callback
 */
export type SettingsListener = (event: SettingsChangeEvent) => void;

/**
 * Storage adapter interface for persistence
 */
export interface StorageAdapter {
  load(): Promise<SettingsData | null>;
  save(data: SettingsData): Promise<void>;
  clear(): Promise<void>;
}
