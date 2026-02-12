/**
 * AudioPlayer tests - Volume control and audio playback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioPlayer, type AudioConfig } from './AudioPlayer';

// Mock AudioContext
const createMockAudioContext = (): Partial<AudioContext> => {
  const mockGainNode = {
    gain: { value: 1.0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockSourceNode = {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockContext = {
    sampleRate: 48000,
    currentTime: 0,
    createGain: vi.fn().mockReturnValue(mockGainNode),
    createBuffer: vi.fn().mockReturnValue({
      getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
    }),
    createBufferSource: vi.fn().mockReturnValue(mockSourceNode),
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  // Make state property read-only with getter
  Object.defineProperty(mockContext, 'state', {
    get: vi.fn().mockReturnValue('running' as AudioContextState),
    configurable: true,
  });

  return mockContext;
};

describe('AudioPlayer', () => {
  let audioPlayer: AudioPlayer;
  let mockAudioContext: Partial<AudioContext>;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();

    // Mock global AudioContext
    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => mockAudioContext)
    );

    audioPlayer = new AudioPlayer();
  });

  afterEach(() => {
    audioPlayer.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should not be initialized initially', () => {
      expect(audioPlayer.isInitialized()).toBe(false);
    });

    it('should initialize successfully', async () => {
      await audioPlayer.init();
      expect(audioPlayer.isInitialized()).toBe(true);
    });

    it('should create AudioContext with correct sample rate', async () => {
      await audioPlayer.init();

      expect(AudioContext).toHaveBeenCalledWith({
        sampleRate: 48000,
      });
    });

    it('should create gain node for volume control', async () => {
      await audioPlayer.init();

      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should accept custom configuration', async () => {
      const customConfig: Partial<AudioConfig> = {
        sampleRate: 44100,
        channels: 1,
        bufferSize: 2048,
      };

      const customPlayer = new AudioPlayer(customConfig);
      await customPlayer.init();

      expect(AudioContext).toHaveBeenCalledWith({
        sampleRate: 44100,
      });

      customPlayer.dispose();
    });

    it('should not reinitialize if already initialized', async () => {
      await audioPlayer.init();
      await audioPlayer.init();

      expect(AudioContext).toHaveBeenCalledTimes(1);
    });

    it('should throw error when AudioContext creation fails', async () => {
      vi.stubGlobal(
        'AudioContext',
        vi.fn().mockImplementation(() => {
          throw new Error('AudioContext not supported');
        })
      );

      const failingPlayer = new AudioPlayer();
      await expect(failingPlayer.init()).rejects.toThrow('Audio initialization failed');
    });
  });

  describe('resume', () => {
    it('should initialize if not already initialized', async () => {
      await audioPlayer.resume();
      expect(audioPlayer.isInitialized()).toBe(true);
    });

    it('should resume suspended AudioContext', async () => {
      // Mock suspended state
      Object.defineProperty(mockAudioContext, 'state', {
        get: vi.fn().mockReturnValue('suspended' as AudioContextState),
        configurable: true,
      });

      await audioPlayer.init();
      await audioPlayer.resume();

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should not resume if already running', async () => {
      // Mock running state (default)
      Object.defineProperty(mockAudioContext, 'state', {
        get: vi.fn().mockReturnValue('running' as AudioContextState),
        configurable: true,
      });

      await audioPlayer.init();
      await audioPlayer.resume();

      expect(mockAudioContext.resume).not.toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should stop current source node', async () => {
      await audioPlayer.init();
      audioPlayer.playBuffer(new Float32Array(1024));
      audioPlayer.pause();

      const mockSource = mockAudioContext.createBufferSource!();
      expect(mockSource.stop).toHaveBeenCalled();
    });

    it('should not throw when no source is playing', async () => {
      await audioPlayer.init();
      expect(() => audioPlayer.pause()).not.toThrow();
    });
  });

  describe('volume control', () => {
    beforeEach(async () => {
      await audioPlayer.init();
    });

    it('should set volume correctly', () => {
      audioPlayer.setVolume(0.5);
      expect(audioPlayer.getVolume()).toBe(0.5);
    });

    it('should clamp volume to minimum 0', () => {
      audioPlayer.setVolume(-0.5);
      expect(audioPlayer.getVolume()).toBe(0);
    });

    it('should clamp volume to maximum 1', () => {
      audioPlayer.setVolume(1.5);
      expect(audioPlayer.getVolume()).toBe(1);
    });

    it('should update gain node value', () => {
      audioPlayer.setVolume(0.7);

      const mockGain = mockAudioContext.createGain!();
      expect(mockGain.gain.value).toBe(0.7);
    });

    it('should not update gain node when muted', () => {
      audioPlayer.mute();
      audioPlayer.setVolume(0.8);

      const mockGain = mockAudioContext.createGain!();
      expect(mockGain.gain.value).toBe(0);
    });

    it('should return correct volume even when muted', () => {
      audioPlayer.setVolume(0.6);
      audioPlayer.mute();

      expect(audioPlayer.getVolume()).toBe(0.6);
    });
  });

  describe('mute/unmute', () => {
    beforeEach(async () => {
      await audioPlayer.init();
      audioPlayer.setVolume(0.8);
    });

    it('should mute audio', () => {
      audioPlayer.mute();
      expect(audioPlayer.isMuted()).toBe(true);

      const mockGain = mockAudioContext.createGain!();
      expect(mockGain.gain.value).toBe(0);
    });

    it('should unmute audio and restore volume', () => {
      audioPlayer.mute();
      audioPlayer.unmute();

      expect(audioPlayer.isMuted()).toBe(false);

      const mockGain = mockAudioContext.createGain!();
      expect(mockGain.gain.value).toBe(0.8);
    });

    it('should not change state when already muted', () => {
      audioPlayer.mute();
      audioPlayer.setVolume(0.5);
      audioPlayer.mute();

      expect(audioPlayer.getVolume()).toBe(0.5);
    });

    it('should not change state when already unmuted', () => {
      audioPlayer.unmute();

      const mockGain = mockAudioContext.createGain!();
      expect(mockGain.gain.value).toBe(0.8);
    });
  });

  describe('playBuffer', () => {
    beforeEach(async () => {
      await audioPlayer.init();
    });

    it('should create and play audio buffer', () => {
      const audioData = new Float32Array(2048);
      audioPlayer.playBuffer(audioData);

      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();

      const mockSource = mockAudioContext.createBufferSource!();
      expect(mockSource.start).toHaveBeenCalled();
    });

    it('should throw error when not initialized', () => {
      const uninitializedPlayer = new AudioPlayer();
      expect(() => uninitializedPlayer.playBuffer(new Float32Array(1024))).toThrow(
        'AudioPlayer not initialized'
      );
    });

    it('should schedule buffers sequentially', () => {
      const audioData = new Float32Array(1024);

      // Play first buffer
      audioPlayer.playBuffer(audioData);
      const mockSource1 = mockAudioContext.createBufferSource!();
      const firstCallArgs = (mockSource1.start as ReturnType<typeof vi.fn>).mock.calls[0];

      // Play second buffer
      audioPlayer.playBuffer(audioData);
      const mockSource2 = mockAudioContext.createBufferSource!();
      const secondCallArgs = (mockSource2.start as ReturnType<typeof vi.fn>).mock.calls[1];

      // Second buffer should start after first buffer
      expect(mockSource1.start).toHaveBeenCalled();
      expect(mockSource2.start).toHaveBeenCalled();
      expect(firstCallArgs).toBeDefined();
      expect(secondCallArgs).toBeDefined();
    });
  });

  describe('getCurrentTime', () => {
    it('should return 0 when not initialized', () => {
      expect(audioPlayer.getCurrentTime()).toBe(0);
    });

    it('should return audio context current time', async () => {
      await audioPlayer.init();
      (mockAudioContext as { currentTime: number }).currentTime = 1.5;

      expect(audioPlayer.getCurrentTime()).toBe(1.5);
    });
  });

  describe('getState', () => {
    it('should return null when not initialized', () => {
      expect(audioPlayer.getState()).toBeNull();
    });

    it('should return audio context state', async () => {
      await audioPlayer.init();
      expect(audioPlayer.getState()).toBe('running');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await audioPlayer.init();
      audioPlayer.playBuffer(new Float32Array(1024));
      audioPlayer.dispose();

      expect(audioPlayer.isInitialized()).toBe(false);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should stop and disconnect source node', async () => {
      await audioPlayer.init();
      audioPlayer.playBuffer(new Float32Array(1024));

      const mockSource = mockAudioContext.createBufferSource!();
      audioPlayer.dispose();

      expect(mockSource.stop).toHaveBeenCalled();
      expect(mockSource.disconnect).toHaveBeenCalled();
    });

    it('should disconnect gain node', async () => {
      await audioPlayer.init();
      const mockGain = mockAudioContext.createGain!();

      audioPlayer.dispose();

      expect(mockGain.disconnect).toHaveBeenCalled();
    });

    it('should not throw when not initialized', () => {
      expect(() => audioPlayer.dispose()).not.toThrow();
    });
  });
});
