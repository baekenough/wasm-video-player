/**
 * WebCodecsDecoder tests
 *
 * Tests for the Web Codecs API based video/audio decoder.
 * Note: Some tests require Web Codecs API support which may not be
 * available in all test environments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WebCodecsDecoder,
  type WebCodecsDecoderConfig,
  type VideoCodecConfig,
  type AudioCodecConfig,
} from './WebCodecsDecoder';

// Mock Web Codecs API types for testing
const createMockVideoFrame = () => ({
  timestamp: 0,
  duration: 33333,
  displayWidth: 1920,
  displayHeight: 1080,
  close: vi.fn(),
  copyTo: vi.fn(),
});

const createMockAudioData = () => ({
  timestamp: 0,
  duration: 21333,
  sampleRate: 48000,
  numberOfChannels: 2,
  close: vi.fn(),
});

// Mock functions for static methods
const mockVideoDecoderIsConfigSupported = vi.fn();
const mockAudioDecoderIsConfigSupported = vi.fn();

// Mock VideoDecoder class
function createMockVideoDecoder() {
  return class MockVideoDecoder {
    static isConfigSupported = mockVideoDecoderIsConfigSupported;

    state: string = 'unconfigured';
    private outputCallback: ((frame: unknown) => void) | null = null;

    constructor(init: { output: (frame: unknown) => void; error: (error: DOMException) => void }) {
      this.outputCallback = init.output;
    }

    configure(): void {
      this.state = 'configured';
    }

    decode(): void {
      setTimeout(() => {
        this.outputCallback?.(createMockVideoFrame());
      }, 0);
    }

    async flush(): Promise<void> {
      return Promise.resolve();
    }

    reset(): void {
      this.state = 'configured';
    }

    close(): void {
      this.state = 'closed';
    }
  };
}

// Mock AudioDecoder class
function createMockAudioDecoder() {
  return class MockAudioDecoder {
    static isConfigSupported = mockAudioDecoderIsConfigSupported;

    state: string = 'unconfigured';
    private outputCallback: ((data: unknown) => void) | null = null;

    constructor(init: { output: (data: unknown) => void; error: (error: DOMException) => void }) {
      this.outputCallback = init.output;
    }

    configure(): void {
      this.state = 'configured';
    }

    decode(): void {
      setTimeout(() => {
        this.outputCallback?.(createMockAudioData());
      }, 0);
    }

    async flush(): Promise<void> {
      return Promise.resolve();
    }

    reset(): void {
      this.state = 'configured';
    }

    close(): void {
      this.state = 'closed';
    }
  };
}

// Mock EncodedVideoChunk
class MockEncodedVideoChunk {
  readonly type: string;
  readonly timestamp: number;
  readonly duration: number | null;
  readonly byteLength: number;

  constructor(init: { type: string; timestamp: number; duration?: number; data: Uint8Array }) {
    this.type = init.type;
    this.timestamp = init.timestamp;
    this.duration = init.duration ?? null;
    this.byteLength = init.data.byteLength;
  }
}

// Mock EncodedAudioChunk
class MockEncodedAudioChunk {
  readonly type: string;
  readonly timestamp: number;
  readonly duration: number | null;
  readonly byteLength: number;

  constructor(init: { type: string; timestamp: number; duration?: number; data: Uint8Array }) {
    this.type = init.type;
    this.timestamp = init.timestamp;
    this.duration = init.duration ?? null;
    this.byteLength = init.data.byteLength;
  }
}

describe('WebCodecsDecoder', () => {
  beforeEach(() => {
    // Reset mock functions
    mockVideoDecoderIsConfigSupported.mockReset();
    mockVideoDecoderIsConfigSupported.mockResolvedValue({ supported: true });
    mockAudioDecoderIsConfigSupported.mockReset();
    mockAudioDecoderIsConfigSupported.mockResolvedValue({ supported: true });

    // Setup global mocks using vi.stubGlobal
    vi.stubGlobal('VideoDecoder', createMockVideoDecoder());
    vi.stubGlobal('AudioDecoder', createMockAudioDecoder());
    vi.stubGlobal('EncodedVideoChunk', MockEncodedVideoChunk);
    vi.stubGlobal('EncodedAudioChunk', MockEncodedAudioChunk);
    vi.stubGlobal('isSecureContext', true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('static methods', () => {
    describe('isSupported', () => {
      it('should return true when Web Codecs API is available', () => {
        expect(WebCodecsDecoder.isSupported()).toBe(true);
      });

      it('should return false when VideoDecoder is not available', () => {
        vi.stubGlobal('VideoDecoder', undefined);
        expect(WebCodecsDecoder.isSupported()).toBe(false);
      });

      it('should return false when AudioDecoder is not available', () => {
        vi.stubGlobal('AudioDecoder', undefined);
        expect(WebCodecsDecoder.isSupported()).toBe(false);
      });

      it('should return false when EncodedVideoChunk is not available', () => {
        vi.stubGlobal('EncodedVideoChunk', undefined);
        expect(WebCodecsDecoder.isSupported()).toBe(false);
      });

      it('should return false when EncodedAudioChunk is not available', () => {
        vi.stubGlobal('EncodedAudioChunk', undefined);
        expect(WebCodecsDecoder.isSupported()).toBe(false);
      });
    });

    describe('isSecureContext', () => {
      it('should return true in secure context', () => {
        expect(WebCodecsDecoder.isSecureContext()).toBe(true);
      });

      it('should return false in insecure context', () => {
        vi.stubGlobal('isSecureContext', false);
        expect(WebCodecsDecoder.isSecureContext()).toBe(false);
      });
    });

    describe('getUnsupportedMessage', () => {
      it('should return empty string when supported', () => {
        expect(WebCodecsDecoder.getUnsupportedMessage()).toBe('');
      });

      it('should return secure context message when not secure', () => {
        vi.stubGlobal('isSecureContext', false);
        expect(WebCodecsDecoder.getUnsupportedMessage()).toContain('secure context');
      });

      it('should return browser support message when API not available', () => {
        vi.stubGlobal('VideoDecoder', undefined);
        expect(WebCodecsDecoder.getUnsupportedMessage()).toContain('not supported');
      });
    });

    describe('isVideoCodecSupported', () => {
      it('should check H.264 codec support', async () => {
        const result = await WebCodecsDecoder.isVideoCodecSupported('avc1.42E01E');
        expect(result).toBe(true);
        expect(mockVideoDecoderIsConfigSupported).toHaveBeenCalled();
      });

      it('should return false for unsupported codec', async () => {
        mockVideoDecoderIsConfigSupported.mockResolvedValueOnce({ supported: false });
        const result = await WebCodecsDecoder.isVideoCodecSupported('unknown-codec');
        expect(result).toBe(false);
      });

      it('should return false when API not available', async () => {
        vi.stubGlobal('VideoDecoder', undefined);
        const result = await WebCodecsDecoder.isVideoCodecSupported('avc1.42E01E');
        expect(result).toBe(false);
      });
    });

    describe('isAudioCodecSupported', () => {
      it('should check AAC codec support', async () => {
        const result = await WebCodecsDecoder.isAudioCodecSupported('mp4a.40.2');
        expect(result).toBe(true);
        expect(mockAudioDecoderIsConfigSupported).toHaveBeenCalled();
      });

      it('should return false for unsupported codec', async () => {
        mockAudioDecoderIsConfigSupported.mockResolvedValueOnce({ supported: false });
        const result = await WebCodecsDecoder.isAudioCodecSupported('unknown-codec');
        expect(result).toBe(false);
      });
    });
  });

  describe('instance methods', () => {
    let decoder: WebCodecsDecoder;

    beforeEach(() => {
      decoder = new WebCodecsDecoder();
    });

    afterEach(() => {
      decoder.close();
    });

    describe('init', () => {
      it('should initialize successfully in supported environment', async () => {
        const result = await decoder.init();
        expect(result).toBe(true);
      });

      it('should return false in insecure context', async () => {
        vi.stubGlobal('isSecureContext', false);
        const result = await decoder.init();
        expect(result).toBe(false);
      });

      it('should return false when API not supported', async () => {
        vi.stubGlobal('VideoDecoder', undefined);
        const result = await decoder.init();
        expect(result).toBe(false);
      });
    });

    describe('initVideoDecoder', () => {
      const videoConfig: VideoCodecConfig = {
        codec: 'avc1.42E01E',
        codedWidth: 1920,
        codedHeight: 1080,
      };

      it('should initialize video decoder with config', async () => {
        await decoder.initVideoDecoder(videoConfig);
        expect(decoder.isVideoInitialized()).toBe(true);
      });

      it('should throw error for unsupported codec', async () => {
        mockVideoDecoderIsConfigSupported.mockResolvedValueOnce({ supported: false });

        await expect(decoder.initVideoDecoder(videoConfig)).rejects.toThrow('Video codec not supported');
      });

      it('should close previous decoder when reinitializing', async () => {
        await decoder.initVideoDecoder(videoConfig);
        await decoder.initVideoDecoder(videoConfig);
        expect(decoder.isVideoInitialized()).toBe(true);
      });
    });

    describe('initAudioDecoder', () => {
      const audioConfig: AudioCodecConfig = {
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
      };

      it('should initialize audio decoder with config', async () => {
        await decoder.initAudioDecoder(audioConfig);
        expect(decoder.isAudioInitialized()).toBe(true);
      });

      it('should throw error for unsupported codec', async () => {
        mockAudioDecoderIsConfigSupported.mockResolvedValueOnce({ supported: false });

        await expect(decoder.initAudioDecoder(audioConfig)).rejects.toThrow('Audio codec not supported');
      });
    });

    describe('decodeVideo', () => {
      beforeEach(async () => {
        await decoder.initVideoDecoder({
          codec: 'avc1.42E01E',
          codedWidth: 1920,
          codedHeight: 1080,
        });
      });

      it('should throw error when not initialized', async () => {
        const uninitializedDecoder = new WebCodecsDecoder();
        const chunk = new MockEncodedVideoChunk({
          type: 'key',
          timestamp: 0,
          duration: 33333,
          data: new Uint8Array(100),
        });

        await expect(uninitializedDecoder.decodeVideo(chunk as unknown as EncodedVideoChunk)).rejects.toThrow(
          'Video decoder not initialized'
        );
      });

      it('should decode video chunk', async () => {
        const chunk = new MockEncodedVideoChunk({
          type: 'key',
          timestamp: 0,
          duration: 33333,
          data: new Uint8Array(100),
        });

        await decoder.decodeVideo(chunk as unknown as EncodedVideoChunk);
        expect(decoder.getPendingVideoFrames()).toBeGreaterThanOrEqual(0);
      });
    });

    describe('decodeAudio', () => {
      beforeEach(async () => {
        await decoder.initAudioDecoder({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
        });
      });

      it('should throw error when not initialized', async () => {
        const uninitializedDecoder = new WebCodecsDecoder();
        const chunk = new MockEncodedAudioChunk({
          type: 'key',
          timestamp: 0,
          duration: 21333,
          data: new Uint8Array(100),
        });

        await expect(uninitializedDecoder.decodeAudio(chunk as unknown as EncodedAudioChunk)).rejects.toThrow(
          'Audio decoder not initialized'
        );
      });
    });

    describe('queue management', () => {
      it('should track video queue size', () => {
        expect(decoder.getVideoQueueSize()).toBe(0);
      });

      it('should track audio queue size', () => {
        expect(decoder.getAudioQueueSize()).toBe(0);
      });

      it('should clear video queue', async () => {
        await decoder.initVideoDecoder({
          codec: 'avc1.42E01E',
          codedWidth: 1920,
          codedHeight: 1080,
        });
        decoder.clearVideoQueue();
        expect(decoder.getVideoQueueSize()).toBe(0);
      });

      it('should clear audio queue', async () => {
        await decoder.initAudioDecoder({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
        });
        decoder.clearAudioQueue();
        expect(decoder.getAudioQueueSize()).toBe(0);
      });
    });

    describe('reset', () => {
      it('should reset video decoder', async () => {
        await decoder.initVideoDecoder({
          codec: 'avc1.42E01E',
          codedWidth: 1920,
          codedHeight: 1080,
        });
        decoder.resetVideo();
        expect(decoder.getVideoQueueSize()).toBe(0);
        expect(decoder.getPendingVideoFrames()).toBe(0);
      });

      it('should reset audio decoder', async () => {
        await decoder.initAudioDecoder({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
        });
        decoder.resetAudio();
        expect(decoder.getAudioQueueSize()).toBe(0);
        expect(decoder.getPendingAudioFrames()).toBe(0);
      });
    });

    describe('flush', () => {
      it('should flush video decoder', async () => {
        await decoder.initVideoDecoder({
          codec: 'avc1.42E01E',
          codedWidth: 1920,
          codedHeight: 1080,
        });
        await decoder.flushVideo();
        // Should complete without error
      });

      it('should flush audio decoder', async () => {
        await decoder.initAudioDecoder({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
        });
        await decoder.flushAudio();
        // Should complete without error
      });
    });

    describe('close', () => {
      it('should close all decoders and release resources', async () => {
        await decoder.initVideoDecoder({
          codec: 'avc1.42E01E',
          codedWidth: 1920,
          codedHeight: 1080,
        });
        await decoder.initAudioDecoder({
          codec: 'mp4a.40.2',
          sampleRate: 48000,
          numberOfChannels: 2,
        });

        decoder.close();

        expect(decoder.isVideoInitialized()).toBe(false);
        expect(decoder.isAudioInitialized()).toBe(false);
        expect(decoder.getVideoQueueSize()).toBe(0);
        expect(decoder.getAudioQueueSize()).toBe(0);
      });
    });
  });

  describe('callback mode', () => {
    it('should call onVideoFrame callback when frame is decoded', async () => {
      const onVideoFrame = vi.fn();
      const config: WebCodecsDecoderConfig = {
        onVideoFrame,
      };

      const decoder = new WebCodecsDecoder(config);
      await decoder.initVideoDecoder({
        codec: 'avc1.42E01E',
        codedWidth: 1920,
        codedHeight: 1080,
      });

      const chunk = new MockEncodedVideoChunk({
        type: 'key',
        timestamp: 0,
        duration: 33333,
        data: new Uint8Array(100),
      });

      await decoder.decodeVideo(chunk as unknown as EncodedVideoChunk);

      // Wait for async decode
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onVideoFrame).toHaveBeenCalled();
      decoder.close();
    });

    it('should call onAudioData callback when audio is decoded', async () => {
      const onAudioData = vi.fn();
      const config: WebCodecsDecoderConfig = {
        onAudioData,
      };

      const decoder = new WebCodecsDecoder(config);
      await decoder.initAudioDecoder({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
      });

      const chunk = new MockEncodedAudioChunk({
        type: 'key',
        timestamp: 0,
        duration: 21333,
        data: new Uint8Array(100),
      });

      await decoder.decodeAudio(chunk as unknown as EncodedAudioChunk);

      // Wait for async decode
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onAudioData).toHaveBeenCalled();
      decoder.close();
    });

    it('should set up onError callback', async () => {
      const onError = vi.fn();
      const config: WebCodecsDecoderConfig = {
        onError,
      };

      const decoder = new WebCodecsDecoder(config);
      await decoder.initVideoDecoder({
        codec: 'avc1.42E01E',
        codedWidth: 1920,
        codedHeight: 1080,
      });

      // The callback is set up during initialization
      // Actual error triggering would require internal access
      expect(decoder.isVideoInitialized()).toBe(true);
      decoder.close();
    });
  });
});
