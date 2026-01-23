/**
 * KeyboardHandler - Keyboard shortcut management
 *
 * Handles keyboard input for video player controls including
 * seek, play/pause, mute, and fullscreen operations.
 */

import type { SettingsData } from '@settings/types';

/**
 * Key codes for common shortcuts
 */
const KEY_CODES = {
  SEEK_FORWARD: 'ArrowRight',
  SEEK_BACKWARD: 'ArrowLeft',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  TOGGLE_PLAY: 'Space',
  TOGGLE_MUTE: 'KeyM',
  TOGGLE_FULLSCREEN: 'KeyF',
} as const;

/**
 * Volume change step (5%)
 */
const VOLUME_STEP = 0.05;

/**
 * Callbacks for keyboard actions
 */
export interface KeyboardCallbacks {
  /** Called for seek forward (delta in seconds, isLongSeek flag) */
  onSeekForward: (delta: number, isLongSeek: boolean) => void;
  /** Called for seek backward (delta in seconds, isLongSeek flag) */
  onSeekBackward: (delta: number, isLongSeek: boolean) => void;
  /** Called to increase volume (delta 0-1) */
  onVolumeUp: (delta: number) => void;
  /** Called to decrease volume (delta 0-1) */
  onVolumeDown: (delta: number) => void;
  /** Called to toggle play/pause */
  onTogglePlay: () => void;
  /** Called to toggle mute */
  onToggleMute: () => void;
  /** Called to toggle fullscreen */
  onToggleFullscreen: () => void;
}

/**
 * Configuration for KeyboardHandler
 */
export interface KeyboardHandlerConfig {
  /** Application settings with seek intervals */
  settings: SettingsData;
  /** Callback functions for keyboard actions */
  callbacks: KeyboardCallbacks;
}

/**
 * KeyboardHandler class
 *
 * Manages keyboard shortcuts with:
 * - Configurable seek intervals from settings
 * - Short and long seek intervals (Shift modifier)
 * - preventDefault for handled keys
 * - Enable/disable support
 */
export class KeyboardHandler {
  private readonly settings: SettingsData;
  private readonly callbacks: KeyboardCallbacks;

  private element: HTMLElement | null = null;
  private enabled: boolean = true;
  private readonly boundHandleKeydown: (event: KeyboardEvent) => void;

  constructor(config: KeyboardHandlerConfig) {
    this.settings = config.settings;
    this.callbacks = config.callbacks;
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * Attach keyboard listener to an element
   *
   * @param element - DOM element to listen for keyboard events
   */
  attach(element: HTMLElement): void {
    // Detach from previous element if any
    this.detach();

    this.element = element;
    // Use capture phase to intercept events before they reach other elements (like buttons)
    this.element.addEventListener('keydown', this.boundHandleKeydown, true);
  }

  /**
   * Detach keyboard listener from current element
   */
  detach(): void {
    if (this.element) {
      this.element.removeEventListener('keydown', this.boundHandleKeydown, true);
      this.element = null;
    }
  }

  /**
   * Enable or disable keyboard handling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if keyboard handling is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Handle keydown events
   */
  private handleKeydown(event: KeyboardEvent): void {
    console.log('[KeyboardHandler] keydown:', event.key, event.code, 'enabled:', this.enabled);

    if (!this.enabled) {
      console.log('[KeyboardHandler] disabled, ignoring');
      return;
    }

    // Ignore events with Ctrl, Alt, or Meta modifiers (except Shift)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      console.log('[KeyboardHandler] modifier key, ignoring');
      return;
    }

    // Ignore events from input elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      console.log('[KeyboardHandler] input element, ignoring');
      return;
    }

    const handled = this.processKey(event);
    console.log('[KeyboardHandler] handled:', handled);

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Process a key event and trigger appropriate callback
   *
   * @returns true if the key was handled
   */
  private processKey(event: KeyboardEvent): boolean {
    const { key, code, shiftKey } = event;
    const { seek } = this.settings;

    // Seek forward (ArrowRight)
    if (key === KEY_CODES.SEEK_FORWARD || code === KEY_CODES.SEEK_FORWARD) {
      const delta = shiftKey ? seek.longInterval : seek.shortInterval;
      this.callbacks.onSeekForward(delta, shiftKey);
      return true;
    }

    // Seek backward (ArrowLeft)
    if (key === KEY_CODES.SEEK_BACKWARD || code === KEY_CODES.SEEK_BACKWARD) {
      const delta = shiftKey ? seek.longInterval : seek.shortInterval;
      this.callbacks.onSeekBackward(delta, shiftKey);
      return true;
    }

    // Volume up (ArrowUp)
    if (key === KEY_CODES.VOLUME_UP || code === KEY_CODES.VOLUME_UP) {
      this.callbacks.onVolumeUp(VOLUME_STEP);
      return true;
    }

    // Volume down (ArrowDown)
    if (key === KEY_CODES.VOLUME_DOWN || code === KEY_CODES.VOLUME_DOWN) {
      this.callbacks.onVolumeDown(VOLUME_STEP);
      return true;
    }

    // Toggle play/pause (Space)
    if (code === KEY_CODES.TOGGLE_PLAY || key === ' ') {
      this.callbacks.onTogglePlay();
      return true;
    }

    // Toggle mute (M)
    if (code === KEY_CODES.TOGGLE_MUTE || key.toLowerCase() === 'm') {
      this.callbacks.onToggleMute();
      return true;
    }

    // Toggle fullscreen (F)
    if (code === KEY_CODES.TOGGLE_FULLSCREEN || key.toLowerCase() === 'f') {
      this.callbacks.onToggleFullscreen();
      return true;
    }

    return false;
  }
}
