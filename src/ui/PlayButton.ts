/**
 * PlayButton - Play/Pause toggle button component
 *
 * Displays appropriate icon based on player state and
 * triggers play/pause actions on click.
 */

import type { Player } from '@player/Player';
import { PlayerState } from '@player/Player';

/**
 * Play button icons (SVG paths)
 */
const ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
} as const;

/**
 * PlayButton configuration
 */
export interface PlayButtonConfig {
  player: Player;
  container: HTMLElement;
}

/**
 * PlayButton class
 */
export class PlayButton {
  private readonly player: Player;
  private readonly container: HTMLElement;
  private button: HTMLButtonElement | null = null;
  private boundHandleClick: () => void;
  private boundHandleStateChange: (data: unknown) => void;

  constructor(config: PlayButtonConfig) {
    this.player = config.player;
    this.container = config.container;

    // Bind event handlers
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleStateChange = this.handleStateChange.bind(this);
  }

  /**
   * Initialize the play button
   */
  init(): void {
    this.createButton();
    this.attachEventListeners();
    this.updateIcon();
  }

  /**
   * Create the button element
   */
  private createButton(): void {
    this.button = document.createElement('button');
    this.button.className = 'play-button';
    this.button.setAttribute('aria-label', 'Play');
    this.button.type = 'button';
    this.container.appendChild(this.button);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.button?.addEventListener('click', this.boundHandleClick);
    this.player.on('statechange', this.boundHandleStateChange);
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    this.button?.removeEventListener('click', this.boundHandleClick);
    this.player.off('statechange', this.boundHandleStateChange);
  }

  /**
   * Handle button click
   */
  private handleClick(): void {
    const state = this.player.getState();

    if (state === PlayerState.Playing) {
      this.player.pause();
    } else if (
      state === PlayerState.Ready ||
      state === PlayerState.Paused
    ) {
      void this.player.play();
    }
  }

  /**
   * Handle player state changes
   */
  private handleStateChange(_data: unknown): void {
    this.updateIcon();
  }

  /**
   * Update button icon based on player state
   */
  private updateIcon(): void {
    if (!this.button) {
      return;
    }

    const state = this.player.getState();
    const isPlaying = state === PlayerState.Playing;

    this.button.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    this.button.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  }

  /**
   * Get the button element
   */
  getButton(): HTMLButtonElement | null {
    return this.button;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detachEventListeners();

    if (this.button && this.container.contains(this.button)) {
      this.container.removeChild(this.button);
    }

    this.button = null;
  }
}
