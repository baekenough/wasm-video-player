/**
 * Main entry point tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initApp, getApp, disposeApp } from './main';

// Mock dependencies
vi.mock('@player/Player', () => ({
  Player: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    getState: vi.fn().mockReturnValue('idle'),
    on: vi.fn(),
    off: vi.fn(),
  })),
  PlayerState: {
    Idle: 'idle',
    Loading: 'loading',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Seeking: 'seeking',
    Buffering: 'buffering',
    Error: 'error',
  },
}));

vi.mock('@player/WasmBridge', () => ({
  WasmBridge: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('@renderer/WebGLRenderer', () => ({
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    dispose: vi.fn(),
  })),
}));

vi.mock('@player/AudioPlayer', () => ({
  AudioPlayer: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    setVolume: vi.fn(),
    getVolume: vi.fn().mockReturnValue(1.0),
    mute: vi.fn(),
    unmute: vi.fn(),
    isMuted: vi.fn().mockReturnValue(false),
    isInitialized: vi.fn().mockReturnValue(true),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getState: vi.fn().mockReturnValue('running'),
    resetSchedule: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('@ui/Controls', () => ({
  Controls: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    dispose: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  })),
}));

vi.mock('@ui/FullscreenManager', () => ({
  FullscreenManager: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    dispose: vi.fn(),
    toggle: vi.fn(),
  })),
}));

vi.mock('@settings/index', () => ({
  Settings: vi.fn().mockImplementation(() => ({
    setStorageAdapter: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockReturnValue({}),
    getAll: vi.fn().mockReturnValue({
      seek: { shortInterval: 5, longInterval: 30 },
      subtitle: { enabled: true, fontSize: 32, color: '#ffffff', timingOffset: 0 },
      playback: { autoPlay: false },
      audio: { volume: 1.0, muted: false },
    }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  })),
  LocalStorageAdapter: vi.fn().mockImplementation(() => ({})),
  SettingsPanel: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    dispose: vi.fn(),
    toggle: vi.fn(),
  })),
}));

vi.mock('@subtitle/index', () => ({
  SubtitleManager: vi.fn().mockImplementation(() => ({
    setTimingOffset: vi.fn(),
    getActiveEntries: vi.fn().mockReturnValue([]),
  })),
  SubtitleRenderer: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock('@ui/FileLoader', () => ({
  FileLoader: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
    isVisible: vi.fn().mockReturnValue(false),
  })),
}));

vi.mock('@input/KeyboardHandler', () => ({
  KeyboardHandler: vi.fn().mockImplementation(() => ({
    attach: vi.fn(),
    detach: vi.fn(),
  })),
}));

describe('main', () => {
  let appContainer: HTMLDivElement;
  let videoContainer: HTMLDivElement;
  let videoCanvas: HTMLCanvasElement;
  let subtitleCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock DOM structure
    appContainer = document.createElement('div');
    appContainer.id = 'app';

    videoContainer = document.createElement('div');
    videoContainer.id = 'video-container';

    videoCanvas = document.createElement('canvas');
    videoCanvas.id = 'video-canvas';

    subtitleCanvas = document.createElement('canvas');
    subtitleCanvas.id = 'subtitle-canvas';

    videoContainer.appendChild(videoCanvas);
    videoContainer.appendChild(subtitleCanvas);
    appContainer.appendChild(videoContainer);
    document.body.appendChild(appContainer);
  });

  afterEach(() => {
    disposeApp();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('getApp', () => {
    it('should return null before initialization', () => {
      expect(getApp()).toBeNull();
    });

    it('should return app instance after initialization', async () => {
      await initApp();
      expect(getApp()).not.toBeNull();
    });
  });

  describe('initApp', () => {
    it('should initialize the application successfully', async () => {
      const app = await initApp();
      expect(app).not.toBeNull();
    });

    it('should throw error when app container is not found', async () => {
      document.body.innerHTML = '';

      await expect(initApp()).rejects.toThrow('App container not found');
    });

    it('should warn and return existing app if already initialized', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const app1 = await initApp();
      const app2 = await initApp();

      expect(app1).toBe(app2);
      expect(consoleSpy).toHaveBeenCalledWith('App already initialized');

      consoleSpy.mockRestore();
    });
  });

  describe('disposeApp', () => {
    it('should dispose the app and clear the instance', async () => {
      await initApp();
      expect(getApp()).not.toBeNull();

      disposeApp();
      expect(getApp()).toBeNull();
    });

    it('should be safe to call when no app exists', () => {
      expect(() => disposeApp()).not.toThrow();
    });
  });
});
