/**
 * SeekManager - Coordinates seek operations with debouncing
 *
 * Handles seek requests with debouncing to prevent excessive
 * decoder operations during rapid user input (e.g., arrow key holds).
 */

/**
 * Configuration for SeekManager
 */
export interface SeekManagerConfig {
  /** Total video duration in seconds */
  duration: number;
  /** Debounce delay in milliseconds */
  debounceMs: number;
  /** Callback when seek should be executed */
  onSeek: (timestamp: number) => void;
}

/**
 * SeekManager class
 *
 * Manages seek operations with:
 * - Debouncing to reduce decoder load
 * - Timestamp validation (0 to duration)
 * - Cancellation support
 * - Relative seeking
 */
export class SeekManager {
  private duration: number;
  private readonly debounceMs: number;
  private readonly onSeek: (timestamp: number) => void;

  private currentTime: number = 0;
  private pendingTimestamp: number | null = null;
  private debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SeekManagerConfig) {
    this.duration = config.duration;
    this.debounceMs = config.debounceMs;
    this.onSeek = config.onSeek;
  }

  /**
   * Seek to an absolute timestamp
   *
   * @param timestamp - Target time in seconds
   * @param immediate - If true, skip debouncing and execute immediately
   */
  seek(timestamp: number, immediate: boolean = false): void {
    const validatedTimestamp = this.clampTimestamp(timestamp);
    this.pendingTimestamp = validatedTimestamp;

    if (immediate) {
      this.executeSeek();
      return;
    }

    this.scheduleSeek();
  }

  /**
   * Seek relative to current time
   *
   * @param delta - Time offset in seconds (positive = forward, negative = backward)
   * @param immediate - If true, skip debouncing and execute immediately
   */
  seekRelative(delta: number, immediate: boolean = false): void {
    const targetTime = this.currentTime + delta;
    this.seek(targetTime, immediate);
  }

  /**
   * Cancel any pending seek operation
   */
  cancel(): void {
    this.clearDebounce();
    this.pendingTimestamp = null;
  }

  /**
   * Check if there is a pending seek operation
   */
  isPending(): boolean {
    return this.pendingTimestamp !== null;
  }

  /**
   * Update the current playback time (for relative seeks)
   */
  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  /**
   * Update the video duration
   *
   * If there's a pending seek that exceeds the new duration,
   * it will be clamped when executed.
   */
  setDuration(duration: number): void {
    this.duration = duration;

    // Re-clamp pending timestamp if exists
    if (this.pendingTimestamp !== null) {
      this.pendingTimestamp = this.clampTimestamp(this.pendingTimestamp);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cancel();
  }

  /**
   * Clamp timestamp to valid range [0, duration]
   */
  private clampTimestamp(timestamp: number): number {
    return Math.max(0, Math.min(this.duration, timestamp));
  }

  /**
   * Clear the debounce timer
   */
  private clearDebounce(): void {
    if (this.debounceTimeoutId !== null) {
      clearTimeout(this.debounceTimeoutId);
      this.debounceTimeoutId = null;
    }
  }

  /**
   * Schedule a debounced seek
   */
  private scheduleSeek(): void {
    this.clearDebounce();

    this.debounceTimeoutId = setTimeout(() => {
      this.executeSeek();
    }, this.debounceMs);
  }

  /**
   * Execute the pending seek
   */
  private executeSeek(): void {
    this.clearDebounce();

    if (this.pendingTimestamp !== null) {
      const timestamp = this.pendingTimestamp;
      this.pendingTimestamp = null;
      this.onSeek(timestamp);
    }
  }
}
