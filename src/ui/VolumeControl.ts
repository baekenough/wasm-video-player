/**
 * VolumeControl - Volume slider and mute button component
 *
 * Provides volume adjustment via slider and mute toggle.
 * Remembers previous volume when unmuting.
 */

import type { Player } from '@player/Player';

/**
 * Volume icons (SVG)
 */
const ICONS = {
  volumeHigh: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  volumeLow: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
  volumeMuted: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
} as const;

/**
 * VolumeControl configuration
 */
export interface VolumeControlConfig {
  player: Player;
  container: HTMLElement;
}

/**
 * VolumeControl class
 */
export class VolumeControl {
  private readonly player: Player;
  private readonly container: HTMLElement;
  private element: HTMLElement | null = null;
  private muteButton: HTMLButtonElement | null = null;
  private slider: HTMLInputElement | null = null;
  private previousVolume: number = 1.0;
  private boundHandleMuteClick: () => void;
  private boundHandleSliderInput: (e: Event) => void;
  private boundHandleVolumeChange: (data: unknown) => void;

  constructor(config: VolumeControlConfig) {
    this.player = config.player;
    this.container = config.container;

    // Bind event handlers
    this.boundHandleMuteClick = this.handleMuteClick.bind(this);
    this.boundHandleSliderInput = this.handleSliderInput.bind(this);
    this.boundHandleVolumeChange = this.handleVolumeChange.bind(this);
  }

  /**
   * Initialize the volume control
   */
  init(): void {
    this.createElement();
    this.attachEventListeners();
    this.updateUI();
  }

  /**
   * Create the volume control elements
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'volume-control';

    // Mute button
    this.muteButton = document.createElement('button');
    this.muteButton.className = 'volume-mute-button';
    this.muteButton.setAttribute('aria-label', 'Mute');
    this.muteButton.type = 'button';

    // Volume slider
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'volume-slider';
    this.slider.min = '0';
    this.slider.max = '100';
    this.slider.value = '100';
    this.slider.setAttribute('aria-label', 'Volume');

    this.element.appendChild(this.muteButton);
    this.element.appendChild(this.slider);

    this.container.appendChild(this.element);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.muteButton?.addEventListener('click', this.boundHandleMuteClick);
    this.slider?.addEventListener('input', this.boundHandleSliderInput);
    this.player.on('volumechange', this.boundHandleVolumeChange);
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    this.muteButton?.removeEventListener('click', this.boundHandleMuteClick);
    this.slider?.removeEventListener('input', this.boundHandleSliderInput);
    this.player.off('volumechange', this.boundHandleVolumeChange);
  }

  /**
   * Handle mute button click
   */
  private handleMuteClick(): void {
    if (this.player.isMuted()) {
      this.player.unmute();
      // Restore previous volume if it was 0
      if (this.player.getVolume() === 0 && this.previousVolume > 0) {
        this.player.setVolume(this.previousVolume);
      }
    } else {
      this.previousVolume = this.player.getVolume();
      this.player.mute();
    }
  }

  /**
   * Handle slider input
   */
  private handleSliderInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const volume = parseInt(target.value, 10) / 100;
    this.player.setVolume(volume);

    // Unmute if volume is being adjusted
    if (this.player.isMuted() && volume > 0) {
      this.player.unmute();
    }
  }

  /**
   * Handle player volume changes
   */
  private handleVolumeChange(_data: unknown): void {
    this.updateUI();
  }

  /**
   * Update UI based on current volume state
   */
  private updateUI(): void {
    const volume = this.player.getVolume();
    const isMuted = this.player.isMuted();

    // Update slider
    if (this.slider) {
      this.slider.value = isMuted ? '0' : String(Math.round(volume * 100));
    }

    // Update mute button icon
    if (this.muteButton) {
      let icon: string;
      if (isMuted || volume === 0) {
        icon = ICONS.volumeMuted;
      } else if (volume < 0.5) {
        icon = ICONS.volumeLow;
      } else {
        icon = ICONS.volumeHigh;
      }
      this.muteButton.innerHTML = icon;
      this.muteButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
    }
  }

  /**
   * Get the element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Get the mute button
   */
  getMuteButton(): HTMLButtonElement | null {
    return this.muteButton;
  }

  /**
   * Get the slider
   */
  getSlider(): HTMLInputElement | null {
    return this.slider;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detachEventListeners();

    if (this.element && this.container.contains(this.element)) {
      this.container.removeChild(this.element);
    }

    this.element = null;
    this.muteButton = null;
    this.slider = null;
  }
}
