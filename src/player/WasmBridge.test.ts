/**
 * WasmBridge tests - WASM initialization and video operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WasmBridge } from './WasmBridge';
import {
  __setLoadVideoSuccess,
  __setSeekSuccess,
  __reset,
} from '../__mocks__/player_core';

describe('WasmBridge', () => {
  let bridge: WasmBridge;

  beforeEach(() => {
    __reset();
    bridge = new WasmBridge();
  });

  afterEach(() => {
    bridge.dispose();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should not be initialized initially', () => {
      expect(bridge.isInitialized()).toBe(false);
    });

    it('should initialize successfully', async () => {
      await bridge.init();
      expect(bridge.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await bridge.init();
      const initializedState = bridge.isInitialized();
      await bridge.init();

      expect(bridge.isInitialized()).toBe(true);
      expect(initializedState).toBe(true);
    });
  });

  describe('loadVideo', () => {
    beforeEach(async () => {
      await bridge.init();
    });

    it('should load video from ArrayBuffer', async () => {
      const buffer = new ArrayBuffer(100);
      await bridge.loadVideo(buffer);

      // Verify metadata is available after load
      expect(bridge.getMetadata()).not.toBeNull();
    });

    it('should load video from URL', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await bridge.loadVideo('http://example.com/video.mp4');

      expect(global.fetch).toHaveBeenCalledWith('http://example.com/video.mp4');
    });

    it('should throw error when fetch fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found',
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(bridge.loadVideo('http://example.com/video.mp4')).rejects.toThrow(
        'Failed to fetch video'
      );
    });

    it('should throw error when WASM load fails', async () => {
      __setLoadVideoSuccess(false);

      await expect(bridge.loadVideo(new ArrayBuffer(100))).rejects.toThrow(
        'Failed to load video in WASM decoder'
      );
    });

    it('should throw error when not initialized', async () => {
      const newBridge = new WasmBridge();
      await expect(newBridge.loadVideo(new ArrayBuffer(100))).rejects.toThrow(
        'Decoder not initialized'
      );
    });
  });

  describe('getMetadata', () => {
    it('should return null before video is loaded', async () => {
      await bridge.init();
      expect(bridge.getMetadata()).toBeNull();
    });

    it('should return metadata after video is loaded', async () => {
      await bridge.init();
      await bridge.loadVideo(new ArrayBuffer(100));

      const metadata = bridge.getMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.width).toBe(1920);
      expect(metadata?.height).toBe(1080);
      expect(metadata?.duration).toBe(120);
      expect(metadata?.frameRate).toBe(30);
      expect(metadata?.codec).toBe('h264');
    });
  });

  describe('decodeFrame', () => {
    beforeEach(async () => {
      await bridge.init();
      await bridge.loadVideo(new ArrayBuffer(100));
    });

    it('should decode frame successfully', () => {
      const frame = bridge.decodeFrame();

      expect(frame).not.toBeNull();
      expect(frame?.width).toBe(1920);
      expect(frame?.height).toBe(1080);
      expect(frame?.keyframe).toBe(true);
    });

    it('should throw error when not initialized', () => {
      const newBridge = new WasmBridge();
      expect(() => newBridge.decodeFrame()).toThrow('Decoder not initialized');
    });
  });

  describe('seek', () => {
    beforeEach(async () => {
      await bridge.init();
      await bridge.loadVideo(new ArrayBuffer(100));
    });

    it('should seek successfully', async () => {
      await expect(bridge.seek(30)).resolves.not.toThrow();
    });

    it('should throw error when seek fails', async () => {
      __setSeekSuccess(false);

      await expect(bridge.seek(30)).rejects.toThrow('Seek operation failed');
    });

    it('should throw error when not initialized', async () => {
      const newBridge = new WasmBridge();
      await expect(newBridge.seek(30)).rejects.toThrow('Decoder not initialized');
    });
  });

  describe('flush', () => {
    it('should flush decoder buffers', async () => {
      await bridge.init();
      await bridge.loadVideo(new ArrayBuffer(100));

      expect(() => bridge.flush()).not.toThrow();
    });

    it('should throw error when not initialized', () => {
      const newBridge = new WasmBridge();
      expect(() => newBridge.flush()).toThrow('Decoder not initialized');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await bridge.init();
      bridge.dispose();

      expect(bridge.isInitialized()).toBe(false);
      expect(bridge.getMetadata()).toBeNull();
    });

    it('should be safe to call dispose multiple times', async () => {
      await bridge.init();
      bridge.dispose();
      expect(() => bridge.dispose()).not.toThrow();
    });
  });
});
