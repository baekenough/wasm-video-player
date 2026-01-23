/**
 * Player class tests - State transitions and playback control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Player, PlayerState, type PlayerConfig } from './Player';
import type { WasmBridge, VideoMetadata, VideoFrame } from './WasmBridge';
import type { WebGLRenderer } from '@renderer/WebGLRenderer';
import type { AudioPlayer } from './AudioPlayer';

// Mock implementations
const createMockWasmBridge = (): WasmBridge => ({
  init: vi.fn().mockResolvedValue(undefined),
  isInitialized: vi.fn().mockReturnValue(true),
  loadVideo: vi.fn().mockResolvedValue(undefined),
  getMetadata: vi.fn().mockReturnValue({
    width: 1920,
    height: 1080,
    duration: 120,
    frameRate: 30,
    codec: 'h264',
  } as VideoMetadata),
  decodeFrame: vi.fn().mockReturnValue({
    data: new Uint8Array(1920 * 1080 * 4),
    width: 1920,
    height: 1080,
    timestamp: 0,
    keyframe: true,
  } as VideoFrame),
  seek: vi.fn().mockResolvedValue(undefined),
  flush: vi.fn(),
  dispose: vi.fn(),
  needsSampleReload: vi.fn().mockReturnValue(false),
  reloadSamples: vi.fn().mockResolvedValue(undefined),
}) as unknown as WasmBridge;

const createMockRenderer = (): WebGLRenderer =>
  ({
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    render: vi.fn(),
    clear: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }) as unknown as WebGLRenderer;

const createMockAudioPlayer = (): AudioPlayer =>
  ({
    init: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    setVolume: vi.fn(),
    getVolume: vi.fn().mockReturnValue(1.0),
    mute: vi.fn(),
    unmute: vi.fn(),
    isMuted: vi.fn().mockReturnValue(false),
    dispose: vi.fn(),
  }) as unknown as AudioPlayer;

describe('Player', () => {
  let player: Player;
  let mockWasmBridge: WasmBridge;
  let mockRenderer: WebGLRenderer;
  let mockAudioPlayer: AudioPlayer;

  beforeEach(() => {
    mockWasmBridge = createMockWasmBridge();
    mockRenderer = createMockRenderer();
    mockAudioPlayer = createMockAudioPlayer();

    const config: PlayerConfig = {
      wasmBridge: mockWasmBridge,
      renderer: mockRenderer,
      audioPlayer: mockAudioPlayer,
    };

    player = new Player(config);

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    player.dispose();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start in Idle state', () => {
      expect(player.getState()).toBe(PlayerState.Idle);
    });

    it('should have zero current time', () => {
      expect(player.getCurrentTime()).toBe(0);
    });

    it('should have zero duration', () => {
      expect(player.getDuration()).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('should transition from Idle to Loading when loading', async () => {
      const stateChanges: PlayerState[] = [];
      player.on('statechange', (data: unknown) => {
        const { newState } = data as { newState: PlayerState };
        stateChanges.push(newState);
      });

      await player.load('test.mp4');

      expect(stateChanges).toContain(PlayerState.Loading);
      expect(stateChanges).toContain(PlayerState.Ready);
    });

    it('should transition from Ready to Playing when play is called', async () => {
      await player.load('test.mp4');

      const stateChanges: PlayerState[] = [];
      player.on('statechange', (data: unknown) => {
        const { newState } = data as { newState: PlayerState };
        stateChanges.push(newState);
      });

      await player.play();

      expect(stateChanges).toContain(PlayerState.Playing);
    });

    it('should transition from Playing to Paused when pause is called', async () => {
      await player.load('test.mp4');
      await player.play();

      player.pause();

      expect(player.getState()).toBe(PlayerState.Paused);
    });

    it('should transition to Seeking state during seek', async () => {
      await player.load('test.mp4');

      const stateChanges: PlayerState[] = [];
      player.on('statechange', (data: unknown) => {
        const { newState } = data as { newState: PlayerState };
        stateChanges.push(newState);
      });

      await player.seek(30);

      expect(stateChanges).toContain(PlayerState.Seeking);
    });

    it('should transition to Error state on load failure', async () => {
      vi.mocked(mockWasmBridge.loadVideo).mockRejectedValue(new Error('Load failed'));

      let errorState = false;
      player.on('statechange', (data: unknown) => {
        const { newState } = data as { newState: PlayerState };
        if (newState === PlayerState.Error) {
          errorState = true;
        }
      });

      await expect(player.load('invalid.mp4')).rejects.toThrow();
      expect(errorState).toBe(true);
    });
  });

  describe('playback control', () => {
    it('should throw error when playing without loaded video', async () => {
      await expect(player.play()).rejects.toThrow('No video loaded');
    });

    it('should not change state when already playing', async () => {
      await player.load('test.mp4');
      await player.play();

      const initialState = player.getState();
      await player.play();

      expect(player.getState()).toBe(initialState);
    });

    it('should resume audio when playing', async () => {
      await player.load('test.mp4');
      await player.play();

      expect(mockAudioPlayer.resume).toHaveBeenCalled();
    });

    it('should pause audio when pausing', async () => {
      await player.load('test.mp4');
      await player.play();
      player.pause();

      expect(mockAudioPlayer.pause).toHaveBeenCalled();
    });

    it('should reset to Ready state when stopped', async () => {
      await player.load('test.mp4');
      await player.play();
      player.stop();

      expect(player.getState()).toBe(PlayerState.Ready);
      expect(player.getCurrentTime()).toBe(0);
    });
  });

  describe('volume control', () => {
    it('should set volume correctly', () => {
      player.setVolume(0.5);

      expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0.5);
    });

    it('should clamp volume to valid range', () => {
      player.setVolume(1.5);
      expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(1);

      player.setVolume(-0.5);
      expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0);
    });

    it('should get volume from audio player', () => {
      player.getVolume();

      expect(mockAudioPlayer.getVolume).toHaveBeenCalled();
    });

    it('should mute and unmute', () => {
      player.mute();
      expect(mockAudioPlayer.mute).toHaveBeenCalled();

      player.unmute();
      expect(mockAudioPlayer.unmute).toHaveBeenCalled();
    });

    it('should check muted state', () => {
      player.isMuted();
      expect(mockAudioPlayer.isMuted).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should emit statechange events', async () => {
      const listener = vi.fn();
      player.on('statechange', listener);

      await player.load('test.mp4');

      expect(listener).toHaveBeenCalled();
    });

    it('should emit durationchange when video is loaded', async () => {
      const listener = vi.fn();
      player.on('durationchange', listener);

      await player.load('test.mp4');

      expect(listener).toHaveBeenCalledWith({ duration: 120 });
    });

    it('should emit volumechange when volume is set', () => {
      const listener = vi.fn();
      player.on('volumechange', listener);

      player.setVolume(0.5);

      expect(listener).toHaveBeenCalledWith({ volume: 0.5 });
    });

    it('should emit error events on failure', async () => {
      vi.mocked(mockWasmBridge.loadVideo).mockRejectedValue(new Error('Test error'));

      const listener = vi.fn();
      player.on('error', listener);

      await expect(player.load('test.mp4')).rejects.toThrow();

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const listener = vi.fn();
      player.on('statechange', listener);
      player.off('statechange', listener);

      await player.load('test.mp4');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should throw error when seeking without loaded video', async () => {
      await expect(player.seek(10)).rejects.toThrow('No video loaded');
    });

    it('should update current time after seek', async () => {
      await player.load('test.mp4');
      await player.seek(30);

      expect(player.getCurrentTime()).toBe(30);
    });

    it('should resume playing state after seek if was playing', async () => {
      await player.load('test.mp4');
      await player.play();

      await player.seek(30);

      expect(player.getState()).toBe(PlayerState.Playing);
    });

    it('should return to paused state after seek if was paused', async () => {
      await player.load('test.mp4');
      await player.play();
      player.pause();

      await player.seek(30);

      expect(player.getState()).toBe(PlayerState.Paused);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      player.dispose();

      expect(mockRenderer.dispose).toHaveBeenCalled();
      expect(mockAudioPlayer.dispose).toHaveBeenCalled();
      expect(player.getState()).toBe(PlayerState.Idle);
    });
  });
});
