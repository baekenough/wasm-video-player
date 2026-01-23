/**
 * SrtParser - SRT subtitle format parser
 *
 * Parses SubRip Text (.srt) subtitle files.
 * Handles standard SRT format with timestamps and multi-line text.
 */

import type { SubtitleTrack, SubtitleEntry } from './types';

/**
 * Regular expression for SRT timestamp
 * Format: HH:MM:SS,mmm --> HH:MM:SS,mmm
 * Also supports period (.) as millisecond separator
 */
const TIMESTAMP_REGEX = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

/**
 * SRT subtitle parser
 */
export class SrtParser {
  /**
   * Parse SRT content into a SubtitleTrack
   *
   * @param content - Raw SRT file content
   * @returns Parsed subtitle track
   */
  static parse(content: string): SubtitleTrack {
    const entries: SubtitleEntry[] = [];

    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into blocks (entries are separated by empty lines)
    const blocks = normalizedContent.split(/\n\n+/);

    for (const block of blocks) {
      const entry = this.parseBlock(block.trim());
      if (entry) {
        entries.push(entry);
      }
    }

    return {
      format: 'srt',
      entries,
    };
  }

  /**
   * Parse a single SRT block into a SubtitleEntry
   *
   * @param block - Single subtitle block
   * @returns Parsed entry or null if invalid
   */
  private static parseBlock(block: string): SubtitleEntry | null {
    if (!block) {
      return null;
    }

    const lines = block.split('\n');

    // SRT format:
    // 1. Sequence number (optional for parsing)
    // 2. Timestamp line
    // 3+ Text lines

    // Find the timestamp line (could be first or second line)
    let timestampLineIndex = -1;
    let timestampMatch: RegExpMatchArray | null = null;

    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      const line = lines[i].trim();
      // Remove any position metadata after the timestamp
      const cleanedLine = line.replace(/\s+X\d+:\d+\s+X\d+:\d+\s+Y\d+:\d+\s+Y\d+:\d+.*$/, '');
      timestampMatch = cleanedLine.match(TIMESTAMP_REGEX);
      if (timestampMatch) {
        timestampLineIndex = i;
        break;
      }
    }

    if (!timestampMatch || timestampLineIndex === -1) {
      return null;
    }

    // Parse timestamps
    const startTime = this.parseTimestampParts(
      timestampMatch[1],
      timestampMatch[2],
      timestampMatch[3],
      timestampMatch[4],
    );
    const endTime = this.parseTimestampParts(
      timestampMatch[5],
      timestampMatch[6],
      timestampMatch[7],
      timestampMatch[8],
    );

    // Extract text (all lines after timestamp)
    const textLines = lines.slice(timestampLineIndex + 1);
    const text = textLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    if (!text) {
      return null;
    }

    return {
      startTime,
      endTime,
      text,
    };
  }

  /**
   * Parse timestamp string to milliseconds
   *
   * @param timestamp - Timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm)
   * @returns Milliseconds or null if invalid
   */
  static parseTimestamp(timestamp: string): number | null {
    const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
    if (!match) {
      return null;
    }

    return this.parseTimestampParts(match[1], match[2], match[3], match[4]);
  }

  /**
   * Parse timestamp parts to milliseconds
   */
  private static parseTimestampParts(
    hours: string,
    minutes: string,
    seconds: string,
    milliseconds: string,
  ): number {
    return (
      parseInt(hours, 10) * 3600000 +
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(milliseconds, 10)
    );
  }
}
