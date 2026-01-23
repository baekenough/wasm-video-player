/**
 * Subtitle module
 *
 * Provides subtitle parsing, management, and rendering capabilities.
 */

// Types
export type {
  SubtitleStyle,
  SubtitleEntry,
  SubtitleFormat,
  SubtitleTrack,
  SubtitleRendererOptions,
} from './types';

export { DEFAULT_RENDERER_OPTIONS } from './types';

// Parsers
export { SrtParser } from './SrtParser';

// Manager
export { SubtitleManager } from './SubtitleManager';
export type { TrackInfo } from './SubtitleManager';

// Renderer
export { SubtitleRenderer } from './SubtitleRenderer';
