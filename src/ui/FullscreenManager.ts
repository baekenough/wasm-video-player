/**
 * FullscreenManager - Fullscreen API wrapper
 *
 * Provides a consistent interface for entering, exiting,
 * and toggling fullscreen mode across browsers.
 */

/**
 * Fullscreen event callback
 */
export type FullscreenChangeCallback = (isFullscreen: boolean) => void;

/**
 * FullscreenManager configuration
 */
export interface FullscreenManagerConfig {
  element: HTMLElement;
}

/**
 * FullscreenManager class
 */
export class FullscreenManager {
  private readonly element: HTMLElement;
  private changeCallbacks: Set<FullscreenChangeCallback> = new Set();
  private boundHandleFullscreenChange: () => void;

  constructor(config: FullscreenManagerConfig) {
    this.element = config.element;
    this.boundHandleFullscreenChange = this.handleFullscreenChange.bind(this);
  }

  /**
   * Initialize the fullscreen manager
   */
  init(): void {
    this.attachEventListeners();
  }

  /**
   * Attach fullscreen change event listeners
   */
  private attachEventListeners(): void {
    document.addEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.boundHandleFullscreenChange);
  }

  /**
   * Detach fullscreen change event listeners
   */
  private detachEventListeners(): void {
    document.removeEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.boundHandleFullscreenChange);
  }

  /**
   * Handle fullscreen change events
   */
  private handleFullscreenChange(): void {
    const isFullscreen = this.isFullscreen();
    this.changeCallbacks.forEach((callback) => callback(isFullscreen));
  }

  /**
   * Check if fullscreen is currently active
   */
  isFullscreen(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as WebkitDocument).webkitFullscreenElement ||
      (document as MozDocument).mozFullScreenElement ||
      (document as MSDocument).msFullscreenElement
    );
  }

  /**
   * Check if fullscreen is supported
   */
  isSupported(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as WebkitDocument).webkitFullscreenEnabled ||
      (document as MozDocument).mozFullScreenEnabled ||
      (document as MSDocument).msFullscreenEnabled
    );
  }

  /**
   * Enter fullscreen mode
   */
  async enter(): Promise<void> {
    if (this.isFullscreen()) {
      return;
    }

    const element = this.element as FullscreenElement;

    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    } else {
      throw new Error('Fullscreen not supported');
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exit(): Promise<void> {
    if (!this.isFullscreen()) {
      return;
    }

    const doc = document as FullscreenDocument;

    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    } else {
      throw new Error('Fullscreen not supported');
    }
  }

  /**
   * Toggle fullscreen mode
   */
  async toggle(): Promise<void> {
    if (this.isFullscreen()) {
      await this.exit();
    } else {
      await this.enter();
    }
  }

  /**
   * Register a fullscreen change callback
   */
  onChange(callback: FullscreenChangeCallback): void {
    this.changeCallbacks.add(callback);
  }

  /**
   * Unregister a fullscreen change callback
   */
  offChange(callback: FullscreenChangeCallback): void {
    this.changeCallbacks.delete(callback);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detachEventListeners();
    this.changeCallbacks.clear();
  }
}

/**
 * Vendor-prefixed type definitions
 */
interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
}

interface MozDocument extends Document {
  mozFullScreenElement?: Element;
  mozFullScreenEnabled?: boolean;
  mozCancelFullScreen?: () => Promise<void>;
}

interface MSDocument extends Document {
  msFullscreenElement?: Element;
  msFullscreenEnabled?: boolean;
  msExitFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}
