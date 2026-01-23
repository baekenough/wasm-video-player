/**
 * Subtitle Types
 *
 * Type definitions for subtitle system.
 */

/**
 * Subtitle text style configuration
 */
export interface SubtitleStyle {
  /** Font family name */
  fontFamily?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font weight (normal, bold, etc.) */
  fontWeight?: 'normal' | 'bold';
  /** Font style (normal, italic) */
  fontStyle?: 'normal' | 'italic';
  /** Primary text color (CSS color string) */
  color?: string;
  /** Text outline/stroke color */
  outlineColor?: string;
  /** Outline width in pixels */
  outlineWidth?: number;
  /** Background color for text */
  backgroundColor?: string;
  /** Horizontal alignment */
  alignment?: 'left' | 'center' | 'right';
  /** Vertical position from bottom (percentage) */
  verticalPosition?: number;
}

/**
 * Single subtitle entry
 */
export interface SubtitleEntry {
  /** Start time in milliseconds */
  startTime: number;
  /** End time in milliseconds */
  endTime: number;
  /** Subtitle text content (may include HTML tags) */
  text: string;
  /** Optional style overrides */
  style?: SubtitleStyle;
}

/**
 * Supported subtitle formats
 */
export type SubtitleFormat = 'srt' | 'vtt' | 'ass';

/**
 * Subtitle track containing all entries
 */
export interface SubtitleTrack {
  /** Subtitle format type */
  format: SubtitleFormat;
  /** Language code (ISO 639-1) */
  language?: string;
  /** Track title/name */
  title?: string;
  /** Whether this is an embedded track */
  embedded?: boolean;
  /** Subtitle entries sorted by start time */
  entries: SubtitleEntry[];
  /** Default style for ASS tracks */
  defaultStyle?: SubtitleStyle;
}

/**
 * Subtitle renderer options
 */
export interface SubtitleRendererOptions {
  /** Font family for rendering */
  fontFamily?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Text color */
  color?: string;
  /** Outline color for better visibility */
  outlineColor?: string;
  /** Outline width */
  outlineWidth?: number;
  /** Bottom margin in pixels */
  bottomMargin?: number;
  /** Line height multiplier */
  lineHeight?: number;
}

/**
 * Default renderer options
 */
export const DEFAULT_RENDERER_OPTIONS: Required<SubtitleRendererOptions> = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 24,
  color: '#ffffff',
  outlineColor: '#000000',
  outlineWidth: 2,
  bottomMargin: 40,
  lineHeight: 1.4,
};
