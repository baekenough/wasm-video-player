/**
 * SeekBar - Visual seek bar component
 *
 * Provides a draggable seek bar for video timeline navigation
 * with click-to-seek and drag support.
 */

/**
 * Configuration for SeekBar
 */
export interface SeekBarConfig {
  /** Callback when seek is requested (position 0-1) */
  onSeek: (position: number) => void;
}

/**
 * SeekBar class
 *
 * Renders a seek bar with:
 * - Click to seek to position
 * - Drag support for continuous seeking
 * - Visual progress indicator
 * - Touch device support
 * - Accessibility attributes
 */
export class SeekBar {
  private readonly onSeek: (position: number) => void;

  private container: HTMLElement | null = null;
  private seekBarElement: HTMLElement | null = null;
  private trackElement: HTMLElement | null = null;
  private fillElement: HTMLElement | null = null;
  private handleElement: HTMLElement | null = null;

  private enabled: boolean = true;
  private dragging: boolean = false;
  private _currentProgress: number = 0;

  // Bound event handlers for proper removal
  private readonly boundHandleClick: (event: MouseEvent) => void;
  private readonly boundHandleMouseDown: (event: MouseEvent) => void;
  private readonly boundHandleMouseMove: (event: MouseEvent) => void;
  private readonly boundHandleMouseUp: (event: MouseEvent) => void;
  private readonly boundHandleTouchStart: (event: TouchEvent) => void;
  private readonly boundHandleTouchMove: (event: TouchEvent) => void;
  private readonly boundHandleTouchEnd: (event: TouchEvent) => void;

  constructor(config: SeekBarConfig) {
    this.onSeek = config.onSeek;

    // Bind event handlers
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * Mount the seek bar to a container element
   */
  mount(container: HTMLElement): void {
    this.container = container;
    this.createElements();
    this.attachEventListeners();
  }

  /**
   * Remove the seek bar and clean up
   */
  dispose(): void {
    this.removeEventListeners();
    this.removeElements();
    this.container = null;
  }

  /**
   * Update the visual progress
   *
   * @param current - Current time in seconds
   * @param total - Total duration in seconds
   */
  setProgress(current: number, total: number): void {
    if (total <= 0) {
      this.updateVisualProgress(0);
      return;
    }

    const progress = Math.max(0, Math.min(1, current / total));
    this.updateVisualProgress(progress);
  }

  /**
   * Enable or disable interaction
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (this.seekBarElement) {
      if (enabled) {
        this.seekBarElement.classList.remove('seek-bar--disabled');
      } else {
        this.seekBarElement.classList.add('seek-bar--disabled');
      }
    }
  }

  /**
   * Check if interaction is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragging;
  }

  /**
   * Create DOM elements
   */
  private createElements(): void {
    if (!this.container) return;

    this.seekBarElement = document.createElement('div');
    this.seekBarElement.className = 'seek-bar';

    // Accessibility attributes
    this.seekBarElement.setAttribute('role', 'slider');
    this.seekBarElement.setAttribute('aria-valuemin', '0');
    this.seekBarElement.setAttribute('aria-valuemax', '100');
    this.seekBarElement.setAttribute('aria-valuenow', '0');
    this.seekBarElement.setAttribute('tabindex', '0');

    this.trackElement = document.createElement('div');
    this.trackElement.className = 'seek-bar-track';

    this.fillElement = document.createElement('div');
    this.fillElement.className = 'seek-bar-fill';

    this.handleElement = document.createElement('div');
    this.handleElement.className = 'seek-bar-handle';

    this.trackElement.appendChild(this.fillElement);
    this.seekBarElement.appendChild(this.trackElement);
    this.seekBarElement.appendChild(this.handleElement);
    this.container.appendChild(this.seekBarElement);
  }

  /**
   * Remove DOM elements
   */
  private removeElements(): void {
    if (this.seekBarElement && this.container) {
      this.container.removeChild(this.seekBarElement);
    }

    this.seekBarElement = null;
    this.trackElement = null;
    this.fillElement = null;
    this.handleElement = null;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.seekBarElement) return;

    // Mouse events
    this.seekBarElement.addEventListener('click', this.boundHandleClick);
    this.seekBarElement.addEventListener('mousedown', this.boundHandleMouseDown);

    // Touch events
    this.seekBarElement.addEventListener('touchstart', this.boundHandleTouchStart);

    // Document-level events for drag
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    document.addEventListener('touchmove', this.boundHandleTouchMove);
    document.addEventListener('touchend', this.boundHandleTouchEnd);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (this.seekBarElement) {
      this.seekBarElement.removeEventListener('click', this.boundHandleClick);
      this.seekBarElement.removeEventListener('mousedown', this.boundHandleMouseDown);
      this.seekBarElement.removeEventListener('touchstart', this.boundHandleTouchStart);
    }

    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    if (!this.enabled) return;

    const position = this.calculatePosition(event.clientX);
    this.onSeek(position);
  }

  /**
   * Handle mouse down for drag start
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.enabled) return;

    this.dragging = true;
    event.preventDefault();
  }

  /**
   * Handle mouse move during drag
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.dragging || !this.enabled) return;

    const position = this.calculatePosition(event.clientX);
    this.onSeek(position);
  }

  /**
   * Handle mouse up to end drag
   */
  private handleMouseUp(_event: MouseEvent): void {
    this.dragging = false;
  }

  /**
   * Handle touch start for drag
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.enabled) return;

    this.dragging = true;
    event.preventDefault();
  }

  /**
   * Handle touch move during drag
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.dragging || !this.enabled) return;

    const touch = event.touches[0] || event.changedTouches[0];
    if (touch) {
      const position = this.calculatePosition(touch.clientX);
      this.onSeek(position);
    }
  }

  /**
   * Handle touch end to stop drag
   */
  private handleTouchEnd(_event: TouchEvent): void {
    this.dragging = false;
  }

  /**
   * Calculate position (0-1) from client X coordinate
   */
  private calculatePosition(clientX: number): number {
    if (!this.seekBarElement) return 0;

    const rect = this.seekBarElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = x / rect.width;

    return Math.max(0, Math.min(1, position));
  }

  /**
   * Update visual progress display
   */
  /**
   * Get current progress value
   */
  getProgress(): number {
    return this._currentProgress;
  }

  /**
   * Update visual progress display
   */
  private updateVisualProgress(progress: number): void {
    this._currentProgress = progress;
    const percentage = progress * 100;

    if (this.fillElement) {
      this.fillElement.style.width = `${percentage}%`;
    }

    if (this.handleElement) {
      this.handleElement.style.left = `${percentage}%`;
    }

    if (this.seekBarElement) {
      this.seekBarElement.setAttribute('aria-valuenow', Math.round(percentage).toString());
    }
  }
}
