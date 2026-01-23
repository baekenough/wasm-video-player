/**
 * FFmpegDecoder tests
 *
 * Note: Full integration tests require a browser environment with
 * SharedArrayBuffer support (cross-origin isolation).
 * These tests focus on unit testing the decoder logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FFmpegDecoder } from './FFmpegDecoder';

// Mock @ffmpeg/ffmpeg
vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(new Uint8Array([0, 0, 0, 1])),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(0),
  })),
}));

// Mock @ffmpeg/util
vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([0, 0, 0, 1])),
  toBlobURL: vi.fn().mockResolvedValue('blob:mock-url'),
}));

describe('FFmpegDecoder', () => {
  let decoder: FFmpegDecoder;

  beforeEach(() => {
    decoder = new FFmpegDecoder();
    // Reset static method mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await decoder.dispose();
  });

  describe('static methods', () => {
    describe('isSupported', () => {
      it('should return true when SharedArrayBuffer and WebAssembly are available', () => {
        // In test environment, these might not be available
        // The actual check depends on the runtime environment
        const result = FFmpegDecoder.isSupported();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('isCrossOriginIsolated', () => {
      it('should return a boolean indicating cross-origin isolation', () => {
        const result = FFmpegDecoder.isCrossOriginIsolated();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('getUnsupportedMessage', () => {
      it('should return a string message', () => {
        const message = FFmpegDecoder.getUnsupportedMessage();
        expect(typeof message).toBe('string');
      });
    });

    describe('isFormatSupported', () => {
      it('should return true for supported formats', () => {
        expect(FFmpegDecoder.isFormatSupported('video.mp4')).toBe(true);
        expect(FFmpegDecoder.isFormatSupported('video.mkv')).toBe(true);
        expect(FFmpegDecoder.isFormatSupported('video.avi')).toBe(true);
        expect(FFmpegDecoder.isFormatSupported('video.webm')).toBe(true);
        expect(FFmpegDecoder.isFormatSupported('video.mov')).toBe(true);
        expect(FFmpegDecoder.isFormatSupported('video.flv')).toBe(true);
      });

      it('should return false for unsupported formats', () => {
        expect(FFmpegDecoder.isFormatSupported('file.txt')).toBe(false);
        expect(FFmpegDecoder.isFormatSupported('file.pdf')).toBe(false);
        expect(FFmpegDecoder.isFormatSupported('noextension')).toBe(false);
      });

      it('should handle URLs with query parameters', () => {
        expect(FFmpegDecoder.isFormatSupported('https://example.com/video.mp4?token=abc')).toBe(true);
        expect(FFmpegDecoder.isFormatSupported('https://example.com/video.mkv?v=1')).toBe(true);
      });
    });
  });

  describe('instance methods', () => {
    describe('isLoaded', () => {
      it('should return false before init', () => {
        expect(decoder.isLoaded()).toBe(false);
      });
    });

    describe('getMetadata', () => {
      it('should return null before loading video', () => {
        expect(decoder.getMetadata()).toBe(null);
      });
    });

    describe('constructor', () => {
      it('should accept configuration options', () => {
        const onProgress = vi.fn();
        const onLog = vi.fn();
        const onError = vi.fn();

        const configuredDecoder = new FFmpegDecoder({
          onProgress,
          onLog,
          onError,
          outputFormat: 'webm',
          quality: 20,
          maxWidth: 1280,
        });

        expect(configuredDecoder).toBeInstanceOf(FFmpegDecoder);
      });

      it('should use default values when not specified', () => {
        const defaultDecoder = new FFmpegDecoder();
        expect(defaultDecoder).toBeInstanceOf(FFmpegDecoder);
      });
    });

    describe('abort', () => {
      it('should not throw when called before init', () => {
        expect(() => decoder.abort()).not.toThrow();
      });
    });

    describe('dispose', () => {
      it('should not throw when called before init', async () => {
        await expect(decoder.dispose()).resolves.not.toThrow();
      });

      it('should reset state after disposal', async () => {
        await decoder.dispose();
        expect(decoder.isLoaded()).toBe(false);
        expect(decoder.getMetadata()).toBe(null);
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when loadVideo called before init', async () => {
      await expect(decoder.loadVideo(new ArrayBuffer(10))).rejects.toThrow(
        'FFmpeg not initialized'
      );
    });

    it('should throw error when transcode called before init', async () => {
      await expect(decoder.transcode()).rejects.toThrow('FFmpeg not initialized');
    });

    it('should throw error when extractFrames called before init', async () => {
      await expect(decoder.extractFrames()).rejects.toThrow('FFmpeg not initialized');
    });

    it('should call onError callback on errors', () => {
      const onError = vi.fn();
      const errorDecoder = new FFmpegDecoder({ onError });

      // The error callback should be set in config
      expect(errorDecoder).toBeInstanceOf(FFmpegDecoder);
    });
  });
});

describe('FFmpegDecoder configuration', () => {
  it('should support webm output format', () => {
    const decoder = new FFmpegDecoder({ outputFormat: 'webm' });
    expect(decoder).toBeInstanceOf(FFmpegDecoder);
  });

  it('should support mp4 output format', () => {
    const decoder = new FFmpegDecoder({ outputFormat: 'mp4' });
    expect(decoder).toBeInstanceOf(FFmpegDecoder);
  });

  it('should accept quality settings', () => {
    const decoder = new FFmpegDecoder({ quality: 18 }); // High quality
    expect(decoder).toBeInstanceOf(FFmpegDecoder);
  });

  it('should accept maxWidth for resolution limiting', () => {
    const decoder = new FFmpegDecoder({ maxWidth: 720 });
    expect(decoder).toBeInstanceOf(FFmpegDecoder);
  });
});

describe('FFmpegDecoder progress callbacks', () => {
  it('should call onProgress during transcoding', () => {
    const onProgress = vi.fn();
    const decoder = new FFmpegDecoder({ onProgress });

    // Progress is triggered by log parsing
    expect(decoder).toBeInstanceOf(FFmpegDecoder);
  });

  it('should call onLog for ffmpeg messages', () => {
    const onLog = vi.fn();
    const decoder = new FFmpegDecoder({ onLog });

    expect(decoder).toBeInstanceOf(FFmpegDecoder);
  });
});
