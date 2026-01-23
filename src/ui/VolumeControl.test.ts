/**
 * VolumeControl class tests - Volume slider and mute functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VolumeControl, type VolumeControlConfig } from './VolumeControl';
import type { Player } from '@player/Player';

/**
 * Mock player interface for testing
 */
interface MockPlayer {
  getVolume: ReturnType<typeof vi.fn<[], unknown>>;
  setVolume: ReturnType<typeof vi.fn<[], unknown>>;
  isMuted: ReturnType<typeof vi.fn<[], unknown>>;
  mute: ReturnType<typeof vi.fn<[], unknown>>;
  unmute: ReturnType<typeof vi.fn<[], unknown>>;
  on: (event: string, listener: (data: unknown) => void) => void;
  off: (event: string, listener: (data: unknown) => void) => void;
  triggerEvent: (event: string, data: unknown) => void;
}

// Create mock player
const createMockPlayer = (): MockPlayer => {
  const eventListeners = new Map<string, Set<(data: unknown) => void>>();

  return {
    getVolume: vi.fn().mockReturnValue(1.0),
    setVolume: vi.fn(),
    isMuted: vi.fn().mockReturnValue(false),
    mute: vi.fn(),
    unmute: vi.fn(),
    on: vi.fn((event: string, listener: (data: unknown) => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(listener);
    }),
    off: vi.fn((event: string, listener: (data: unknown) => void) => {
      eventListeners.get(event)?.delete(listener);
    }),
    triggerEvent: (event: string, data: unknown) => {
      eventListeners.get(event)?.forEach((listener) => listener(data));
    },
  };
};

describe('VolumeControl', () => {
  let volumeControl: VolumeControl;
  let mockPlayer: MockPlayer;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockPlayer = createMockPlayer();

    const config: VolumeControlConfig = {
      player: mockPlayer as unknown as Player,
      container,
    };

    volumeControl = new VolumeControl(config);
  });

  afterEach(() => {
    volumeControl.dispose();
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create volume control element on init', () => {
      volumeControl.init();

      const element = container.querySelector('.volume-control');
      expect(element).not.toBeNull();
    });

    it('should create mute button', () => {
      volumeControl.init();

      const button = container.querySelector('.volume-mute-button');
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should create volume slider', () => {
      volumeControl.init();

      const slider = container.querySelector('.volume-slider');
      expect(slider).not.toBeNull();
      expect(slider?.getAttribute('type')).toBe('range');
    });

    it('should set slider range to 0-100', () => {
      volumeControl.init();

      const slider = volumeControl.getSlider();
      expect(slider?.min).toBe('0');
      expect(slider?.max).toBe('100');
    });

    it('should set initial slider value based on volume', () => {
      mockPlayer.getVolume.mockReturnValue(0.5);
      volumeControl.init();

      const slider = volumeControl.getSlider();
      expect(slider?.value).toBe('50');
    });

    it('should attach event listeners', () => {
      volumeControl.init();

      expect(mockPlayer.on).toHaveBeenCalledWith('volumechange', expect.any(Function));
    });
  });

  describe('mute button behavior', () => {
    it('should call mute() when clicked and not muted', () => {
      mockPlayer.isMuted.mockReturnValue(false);
      volumeControl.init();

      const button = volumeControl.getMuteButton();
      button?.click();

      expect(mockPlayer.mute).toHaveBeenCalled();
    });

    it('should call unmute() when clicked and muted', () => {
      mockPlayer.isMuted.mockReturnValue(true);
      volumeControl.init();

      const button = volumeControl.getMuteButton();
      button?.click();

      expect(mockPlayer.unmute).toHaveBeenCalled();
    });

    it('should restore previous volume when unmuting from 0', () => {
      mockPlayer.isMuted.mockReturnValue(false);
      mockPlayer.getVolume.mockReturnValue(0.7);
      volumeControl.init();

      // Mute
      volumeControl.getMuteButton()?.click();

      // Setup for unmute
      mockPlayer.isMuted.mockReturnValue(true);
      mockPlayer.getVolume.mockReturnValue(0);

      // Unmute
      volumeControl.getMuteButton()?.click();

      expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.7);
    });
  });

  describe('slider behavior', () => {
    it('should call setVolume when slider changes', () => {
      volumeControl.init();

      const slider = volumeControl.getSlider();
      if (slider) {
        slider.value = '50';
        slider.dispatchEvent(new Event('input'));
      }

      expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.5);
    });

    it('should unmute when slider is adjusted while muted', () => {
      mockPlayer.isMuted.mockReturnValue(true);
      volumeControl.init();

      const slider = volumeControl.getSlider();
      if (slider) {
        slider.value = '30';
        slider.dispatchEvent(new Event('input'));
      }

      expect(mockPlayer.unmute).toHaveBeenCalled();
    });

    it('should not unmute when slider is set to 0', () => {
      mockPlayer.isMuted.mockReturnValue(true);
      volumeControl.init();

      const slider = volumeControl.getSlider();
      if (slider) {
        slider.value = '0';
        slider.dispatchEvent(new Event('input'));
      }

      expect(mockPlayer.unmute).not.toHaveBeenCalled();
    });

    it('should update slider when volume changes externally', () => {
      volumeControl.init();

      mockPlayer.getVolume.mockReturnValue(0.3);
      mockPlayer.isMuted.mockReturnValue(false);
      mockPlayer.triggerEvent('volumechange', { volume: 0.3 });

      const slider = volumeControl.getSlider();
      expect(slider?.value).toBe('30');
    });
  });

  describe('icon updates', () => {
    it('should show volume high icon at full volume', () => {
      mockPlayer.getVolume.mockReturnValue(1.0);
      mockPlayer.isMuted.mockReturnValue(false);
      volumeControl.init();

      const button = volumeControl.getMuteButton();
      expect(button?.getAttribute('aria-label')).toBe('Mute');
    });

    it('should show muted icon when muted', () => {
      mockPlayer.isMuted.mockReturnValue(true);
      volumeControl.init();

      const button = volumeControl.getMuteButton();
      expect(button?.getAttribute('aria-label')).toBe('Unmute');
    });

    it('should show muted icon when volume is 0', () => {
      mockPlayer.getVolume.mockReturnValue(0);
      mockPlayer.isMuted.mockReturnValue(false);
      volumeControl.init();

      const button = volumeControl.getMuteButton();
      expect(button?.innerHTML).toContain('svg');
    });

    it('should update icon on volume change', () => {
      volumeControl.init();

      mockPlayer.isMuted.mockReturnValue(true);
      mockPlayer.triggerEvent('volumechange', { volume: 0, muted: true });

      const button = volumeControl.getMuteButton();
      expect(button?.getAttribute('aria-label')).toBe('Unmute');
    });
  });

  describe('getters', () => {
    it('should return null for element before init', () => {
      expect(volumeControl.getElement()).toBeNull();
    });

    it('should return element after init', () => {
      volumeControl.init();

      expect(volumeControl.getElement()).toBeInstanceOf(HTMLElement);
    });

    it('should return null for mute button before init', () => {
      expect(volumeControl.getMuteButton()).toBeNull();
    });

    it('should return mute button after init', () => {
      volumeControl.init();

      expect(volumeControl.getMuteButton()).toBeInstanceOf(HTMLButtonElement);
    });

    it('should return null for slider before init', () => {
      expect(volumeControl.getSlider()).toBeNull();
    });

    it('should return slider after init', () => {
      volumeControl.init();

      expect(volumeControl.getSlider()).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('dispose()', () => {
    it('should remove element from container', () => {
      volumeControl.init();

      volumeControl.dispose();

      expect(container.querySelector('.volume-control')).toBeNull();
    });

    it('should remove event listeners', () => {
      volumeControl.init();

      volumeControl.dispose();

      expect(mockPlayer.off).toHaveBeenCalledWith('volumechange', expect.any(Function));
    });

    it('should set references to null', () => {
      volumeControl.init();

      volumeControl.dispose();

      expect(volumeControl.getElement()).toBeNull();
      expect(volumeControl.getMuteButton()).toBeNull();
      expect(volumeControl.getSlider()).toBeNull();
    });
  });
});
