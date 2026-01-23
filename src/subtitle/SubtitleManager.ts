/**
 * SubtitleManager - Subtitle track management
 *
 * Manages subtitle tracks, handles file loading, and provides
 * time-based subtitle lookup with timing offset support.
 */

import type { SubtitleTrack, SubtitleEntry, SubtitleFormat } from './types';
import { SrtParser } from './SrtParser';

/**
 * Track information for listing
 */
export interface TrackInfo {
  index: number;
  format: SubtitleFormat;
  language?: string;
  title?: string;
  embedded?: boolean;
}

/**
 * Subtitle track manager
 */
export class SubtitleManager {
  private tracks: SubtitleTrack[] = [];
  private activeTrackIndex: number | null = null;
  private timingOffset: number = 0;

  /**
   * Load subtitle file and add as a track
   *
   * @param file - Subtitle file to load
   * @returns Parsed subtitle track
   * @throws Error if format is unsupported
   */
  async loadFile(file: File): Promise<SubtitleTrack> {
    const format = this.detectFormat(file.name);
    if (!format) {
      throw new Error('Unsupported subtitle format');
    }

    const content = await file.text();
    const track = this.parseContent(content, format);

    // Infer language from filename if possible
    const languageMatch = file.name.match(/\.([a-z]{2,3})\.[^.]+$/i);
    if (languageMatch) {
      track.language = languageMatch[1].toLowerCase();
    }

    this.loadTrack(track);

    return track;
  }

  /**
   * Load a subtitle track
   *
   * @param track - Subtitle track to add
   */
  loadTrack(track: SubtitleTrack): void {
    this.tracks.push(track);

    // Set as active if it's the first track
    if (this.activeTrackIndex === null) {
      this.activeTrackIndex = 0;
    }
  }

  /**
   * Get active subtitle entries for current time
   *
   * @param currentTime - Current playback time in milliseconds
   * @returns Array of active subtitle entries
   */
  getActiveEntries(currentTime: number): SubtitleEntry[] {
    if (this.activeTrackIndex === null || this.tracks.length === 0) {
      return [];
    }

    const track = this.tracks[this.activeTrackIndex];
    if (!track) {
      return [];
    }

    // Apply timing offset
    // Positive offset shifts subtitles earlier in time
    // adjustedStartTime = originalStartTime - offset
    // At currentTime, we show subtitle if currentTime >= adjustedStartTime
    // i.e., currentTime >= startTime - offset
    // i.e., currentTime + offset >= startTime
    const effectiveTime = currentTime + this.timingOffset;

    return track.entries.filter(
      (entry) => effectiveTime >= entry.startTime && effectiveTime < entry.endTime,
    );
  }

  /**
   * Set timing offset for subtitles
   *
   * Positive values make subtitles appear earlier.
   * Negative values make subtitles appear later.
   *
   * @param ms - Offset in milliseconds
   */
  setTimingOffset(ms: number): void {
    this.timingOffset = ms;
  }

  /**
   * Get current timing offset
   *
   * @returns Current offset in milliseconds
   */
  getTimingOffset(): number {
    return this.timingOffset;
  }

  /**
   * Set active subtitle track by index
   *
   * @param index - Track index or null to disable subtitles
   * @throws Error if index is out of bounds
   */
  setActiveTrack(index: number | null): void {
    if (index !== null && (index < 0 || index >= this.tracks.length)) {
      throw new Error('Invalid track index');
    }
    this.activeTrackIndex = index;
  }

  /**
   * Get active track index
   *
   * @returns Active track index or null
   */
  getActiveTrackIndex(): number | null {
    return this.activeTrackIndex;
  }

  /**
   * Get active track
   *
   * @returns Active track or null
   */
  getActiveTrack(): SubtitleTrack | null {
    if (this.activeTrackIndex === null || this.activeTrackIndex >= this.tracks.length) {
      return null;
    }
    return this.tracks[this.activeTrackIndex];
  }

  /**
   * Get list of all tracks
   *
   * @returns Array of track info
   */
  getTrackList(): TrackInfo[] {
    return this.tracks.map((track, index) => {
      const info: TrackInfo = {
        index,
        format: track.format,
      };
      if (track.language !== undefined) {
        info.language = track.language;
      }
      if (track.title !== undefined) {
        info.title = track.title;
      }
      if (track.embedded !== undefined) {
        info.embedded = track.embedded;
      }
      return info;
    });
  }

  /**
   * Remove a track by index
   *
   * @param index - Track index to remove
   */
  removeTrack(index: number): void {
    if (index < 0 || index >= this.tracks.length) {
      return;
    }

    this.tracks.splice(index, 1);

    // Adjust active track index
    if (this.activeTrackIndex !== null) {
      if (this.activeTrackIndex === index) {
        // Removed active track, select next available or null
        this.activeTrackIndex = this.tracks.length > 0 ? Math.min(index, this.tracks.length - 1) : null;
      } else if (this.activeTrackIndex > index) {
        // Shift index down
        this.activeTrackIndex--;
      }
    }
  }

  /**
   * Clear all tracks
   */
  clearTracks(): void {
    this.tracks = [];
    this.activeTrackIndex = null;
    this.timingOffset = 0;
  }

  /**
   * Detect subtitle format from filename
   *
   * @param filename - File name
   * @returns Detected format or null
   */
  private detectFormat(filename: string): SubtitleFormat | null {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'srt':
        return 'srt';
      case 'vtt':
        return 'vtt';
      case 'ass':
      case 'ssa':
        return 'ass';
      default:
        return null;
    }
  }

  /**
   * Parse subtitle content based on format
   *
   * @param content - File content
   * @param format - Subtitle format
   * @returns Parsed track
   */
  private parseContent(content: string, format: SubtitleFormat): SubtitleTrack {
    switch (format) {
      case 'srt':
        return SrtParser.parse(content);
      case 'vtt':
        // VTT is similar to SRT, use SRT parser with minor adjustments
        // Remove WEBVTT header and parse
        const vttContent = content.replace(/^WEBVTT\s*\n/, '');
        const track = SrtParser.parse(vttContent);
        track.format = 'vtt';
        return track;
      case 'ass':
        // ASS parser not implemented yet - return empty track
        return {
          format: 'ass',
          entries: [],
        };
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}
