/**
 * TimeDisplay - Time indicator component
 *
 * Shows current playback time and total duration in HH:MM:SS format.
 */

/**
 * TimeDisplay configuration
 */
export interface TimeDisplayConfig {
  container: HTMLElement;
}

/**
 * TimeDisplay class
 */
export class TimeDisplay {
  private readonly container: HTMLElement;
  private element: HTMLElement | null = null;
  private currentTimeElement: HTMLSpanElement | null = null;
  private totalTimeElement: HTMLSpanElement | null = null;
  private currentTime: number = 0;
  private totalTime: number = 0;

  constructor(config: TimeDisplayConfig) {
    this.container = config.container;
  }

  /**
   * Initialize the time display
   */
  init(): void {
    this.createElement();
  }

  /**
   * Create the display element
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'time-display';

    this.currentTimeElement = document.createElement('span');
    this.currentTimeElement.className = 'time-current';
    this.currentTimeElement.textContent = '00:00:00';

    const separator = document.createElement('span');
    separator.className = 'time-separator';
    separator.textContent = ' / ';

    this.totalTimeElement = document.createElement('span');
    this.totalTimeElement.className = 'time-total';
    this.totalTimeElement.textContent = '00:00:00';

    this.element.appendChild(this.currentTimeElement);
    this.element.appendChild(separator);
    this.element.appendChild(this.totalTimeElement);

    this.container.appendChild(this.element);
  }

  /**
   * Format seconds to HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const totalSeconds = Math.floor(Math.max(0, seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':');
  }

  /**
   * Update the time display
   */
  update(current: number, total: number): void {
    this.currentTime = current;
    this.totalTime = total;

    if (this.currentTimeElement) {
      this.currentTimeElement.textContent = this.formatTime(current);
    }

    if (this.totalTimeElement) {
      this.totalTimeElement.textContent = this.formatTime(total);
    }
  }

  /**
   * Get current time value
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Get total time value
   */
  getTotalTime(): number {
    return this.totalTime;
  }

  /**
   * Get the display element
   */
  getElement(): HTMLElement | null {
    return this.element;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.element && this.container.contains(this.element)) {
      this.container.removeChild(this.element);
    }

    this.element = null;
    this.currentTimeElement = null;
    this.totalTimeElement = null;
  }
}
