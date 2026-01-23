/**
 * SubtitleManager Tests
 *
 * TDD tests for subtitle management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubtitleManager } from './SubtitleManager';
import type { SubtitleTrack } from './types';

/**
 * Helper to create a test track
 */
function createTrack(entries: Array<{ start: number; end: number; text: string }>): SubtitleTrack {
  return {
    format: 'srt',
    entries: entries.map((e) => ({
      startTime: e.start,
      endTime: e.end,
      text: e.text,
    })),
  };
}

/**
 * Create a mock File object with text() method
 */
function createMockFile(content: string, name: string): File {
  const file = {
    name,
    type: 'text/plain',
    size: content.length,
    text: vi.fn().mockResolvedValue(content),
  } as unknown as File;
  return file;
}

describe('SubtitleManager', () => {
  let manager: SubtitleManager;

  beforeEach(() => {
    manager = new SubtitleManager();
  });

  describe('loadFile', () => {
    it('loads external SRT file', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,500 --> 00:00:08,000
Second subtitle
`;
      const file = createMockFile(srtContent, 'test.srt');

      const track = await manager.loadFile(file);

      expect(track.format).toBe('srt');
      expect(track.entries.length).toBeGreaterThan(0);
      expect(track.entries[0].text).toBe('Hello, world!');
    });

    it('detects format from file extension', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Test
`;
      const file = createMockFile(srtContent, 'subtitle.srt');

      const track = await manager.loadFile(file);

      expect(track.format).toBe('srt');
    });

    it('throws error for unsupported format', async () => {
      const file = createMockFile('content', 'test.xyz');

      await expect(manager.loadFile(file)).rejects.toThrow('Unsupported subtitle format');
    });
  });

  describe('loadTrack', () => {
    it('loads a subtitle track', () => {
      const track = createTrack([{ start: 1000, end: 4000, text: 'Test' }]);

      manager.loadTrack(track);

      expect(manager.getTrackList()).toHaveLength(1);
    });

    it('sets first track as active by default', () => {
      const track = createTrack([{ start: 1000, end: 4000, text: 'Test' }]);

      manager.loadTrack(track);

      expect(manager.getActiveTrackIndex()).toBe(0);
    });
  });

  describe('getActiveEntries', () => {
    it('gets active entries for current time', () => {
      manager.loadTrack(
        createTrack([
          { start: 1000, end: 4000, text: 'First' },
          { start: 5000, end: 8000, text: 'Second' },
        ]),
      );

      const entries = manager.getActiveEntries(2000);

      expect(entries).toHaveLength(1);
      expect(entries[0].text).toBe('First');
    });

    it('returns empty when no active subtitle', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));

      const entries = manager.getActiveEntries(5000);

      expect(entries).toHaveLength(0);
    });

    it('returns empty when time is before first subtitle', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));

      const entries = manager.getActiveEntries(500);

      expect(entries).toHaveLength(0);
    });

    it('returns entry at exact start time', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));

      const entries = manager.getActiveEntries(1000);

      expect(entries).toHaveLength(1);
    });

    it('returns empty at exact end time', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));

      const entries = manager.getActiveEntries(4000);

      expect(entries).toHaveLength(0);
    });

    it('returns multiple entries for overlapping subtitles', () => {
      manager.loadTrack(
        createTrack([
          { start: 1000, end: 5000, text: 'First' },
          { start: 3000, end: 7000, text: 'Second' },
        ]),
      );

      const entries = manager.getActiveEntries(4000);

      expect(entries).toHaveLength(2);
    });

    it('returns empty when no track loaded', () => {
      const entries = manager.getActiveEntries(1000);

      expect(entries).toHaveLength(0);
    });

    it('returns empty when active track is null', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));
      manager.setActiveTrack(null);

      const entries = manager.getActiveEntries(2000);

      expect(entries).toHaveLength(0);
    });
  });

  describe('setTimingOffset', () => {
    it('applies positive timing offset (subtitles appear earlier)', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));
      manager.setTimingOffset(500);

      // Original 1000-4000, with +500 offset means subtitle appears 500ms earlier
      // effectiveTime = currentTime + offset = 600 + 500 = 1100
      // 1100 >= 1000 && 1100 < 4000 -> true
      const entries = manager.getActiveEntries(600);

      expect(entries).toHaveLength(1);
    });

    it('applies negative timing offset (subtitles appear later)', () => {
      manager.loadTrack(createTrack([{ start: 1000, end: 4000, text: 'First' }]));
      manager.setTimingOffset(-500);

      // With -500 offset, subtitle appears 500ms later
      // At time 1000, effectiveTime = 1000 + (-500) = 500
      // 500 >= 1000 -> false, not visible
      const entries = manager.getActiveEntries(1000);
      expect(entries).toHaveLength(0);

      // At time 1600, effectiveTime = 1600 + (-500) = 1100
      // 1100 >= 1000 && 1100 < 4000 -> true
      const entries2 = manager.getActiveEntries(1600);
      expect(entries2).toHaveLength(1);
    });

    it('getTimingOffset returns current offset', () => {
      manager.setTimingOffset(250);

      expect(manager.getTimingOffset()).toBe(250);
    });

    it('resets offset to zero', () => {
      manager.setTimingOffset(500);
      manager.setTimingOffset(0);

      expect(manager.getTimingOffset()).toBe(0);
    });
  });

  describe('track management', () => {
    it('manages multiple tracks', () => {
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 2' }]));

      expect(manager.getTrackList()).toHaveLength(2);
    });

    it('setActiveTrack changes active track', () => {
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 2' }]));

      manager.setActiveTrack(1);

      expect(manager.getActiveEntries(500)[0].text).toBe('Track 2');
    });

    it('setActiveTrack to null disables subtitles', () => {
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));

      manager.setActiveTrack(null);

      expect(manager.getActiveTrackIndex()).toBeNull();
      expect(manager.getActiveEntries(500)).toHaveLength(0);
    });

    it('throws error for invalid track index', () => {
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));

      expect(() => manager.setActiveTrack(5)).toThrow('Invalid track index');
    });

    it('getTrackList returns track info', () => {
      const track1: SubtitleTrack = {
        format: 'srt',
        language: 'en',
        title: 'English',
        entries: [{ startTime: 0, endTime: 1000, text: 'Test' }],
      };
      const track2: SubtitleTrack = {
        format: 'srt',
        language: 'ko',
        title: 'Korean',
        entries: [{ startTime: 0, endTime: 1000, text: 'Test' }],
      };

      manager.loadTrack(track1);
      manager.loadTrack(track2);

      const list = manager.getTrackList();

      expect(list[0].language).toBe('en');
      expect(list[0].title).toBe('English');
      expect(list[1].language).toBe('ko');
      expect(list[1].title).toBe('Korean');
    });

    it('removeTrack removes a track', () => {
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 2' }]));

      manager.removeTrack(0);

      expect(manager.getTrackList()).toHaveLength(1);
      expect(manager.getActiveEntries(500)[0].text).toBe('Track 2');
    });

    it('clearTracks removes all tracks', () => {
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 1' }]));
      manager.loadTrack(createTrack([{ start: 0, end: 1000, text: 'Track 2' }]));

      manager.clearTracks();

      expect(manager.getTrackList()).toHaveLength(0);
      expect(manager.getActiveTrackIndex()).toBeNull();
    });
  });

  describe('getActiveTrack', () => {
    it('returns the active track', () => {
      const track = createTrack([{ start: 0, end: 1000, text: 'Test' }]);
      track.language = 'en';
      manager.loadTrack(track);

      const activeTrack = manager.getActiveTrack();

      expect(activeTrack).not.toBeNull();
      expect(activeTrack?.language).toBe('en');
    });

    it('returns null when no active track', () => {
      expect(manager.getActiveTrack()).toBeNull();
    });
  });
});
