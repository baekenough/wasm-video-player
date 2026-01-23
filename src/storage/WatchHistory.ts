/**
 * WatchHistory - Track watched videos with timestamps
 *
 * Stores watch history in localStorage with:
 * - Path/name of watched video
 * - Last watched timestamp
 * - Playback progress (0-1 percentage)
 */

/**
 * Watch history entry
 */
export interface WatchHistoryEntry {
  /** File path or name (unique identifier) */
  path: string;
  /** Last watched timestamp (Unix ms) */
  lastWatched: number;
  /** Playback progress (0.0 to 1.0) */
  progress: number;
  /** Video duration in seconds (if known) */
  duration?: number | undefined;
  /** File size in bytes (for identification) */
  fileSize?: number | undefined;
}

/**
 * Watch history storage key
 */
const STORAGE_KEY = 'wasm-video-player-watch-history';

/**
 * Maximum entries to keep in history
 */
const MAX_ENTRIES = 100;

/**
 * WatchHistory class - manages video watch history
 */
export class WatchHistory {
  private history: Map<string, WatchHistoryEntry>;

  constructor() {
    this.history = new Map();
    this.load();
  }

  /**
   * Load history from localStorage
   */
  private load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const entries: WatchHistoryEntry[] = JSON.parse(data);
        this.history.clear();
        entries.forEach(entry => {
          this.history.set(entry.path, entry);
        });
      }
    } catch (error) {
      console.warn('[WatchHistory] Failed to load history:', error);
      this.history.clear();
    }
  }

  /**
   * Save history to localStorage
   */
  private save(): void {
    try {
      const entries = Array.from(this.history.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('[WatchHistory] Failed to save history:', error);
    }
  }

  /**
   * Add or update an entry in the watch history
   */
  addToHistory(
    path: string,
    progress: number = 0,
    duration?: number,
    fileSize?: number
  ): void {
    const entry: WatchHistoryEntry = {
      path,
      lastWatched: Date.now(),
      progress: Math.max(0, Math.min(1, progress)),
      duration,
      fileSize,
    };

    this.history.set(path, entry);

    // Trim history if too large
    if (this.history.size > MAX_ENTRIES) {
      this.trimHistory();
    }

    this.save();
  }

  /**
   * Update progress for an existing entry
   */
  updateProgress(path: string, progress: number): void {
    const entry = this.history.get(path);
    if (entry) {
      entry.progress = Math.max(0, Math.min(1, progress));
      entry.lastWatched = Date.now();
      this.save();
    }
  }

  /**
   * Get watch history entry by path
   */
  getEntry(path: string): WatchHistoryEntry | undefined {
    return this.history.get(path);
  }

  /**
   * Get all watch history entries
   */
  getHistory(): WatchHistoryEntry[] {
    return Array.from(this.history.values());
  }

  /**
   * Get history sorted by most recently watched (descending)
   */
  sortByRecent(): WatchHistoryEntry[] {
    return this.getHistory().sort((a, b) => b.lastWatched - a.lastWatched);
  }

  /**
   * Check if a file is in watch history
   */
  hasEntry(path: string): boolean {
    return this.history.has(path);
  }

  /**
   * Get the last watched timestamp for a file
   */
  getLastWatched(path: string): number | undefined {
    return this.history.get(path)?.lastWatched;
  }

  /**
   * Get the saved progress for a file
   */
  getProgress(path: string): number | undefined {
    return this.history.get(path)?.progress;
  }

  /**
   * Remove an entry from history
   */
  removeEntry(path: string): boolean {
    const removed = this.history.delete(path);
    if (removed) {
      this.save();
    }
    return removed;
  }

  /**
   * Clear all watch history
   */
  clear(): void {
    this.history.clear();
    this.save();
  }

  /**
   * Get the number of entries in history
   */
  get size(): number {
    return this.history.size;
  }

  /**
   * Trim history to max entries, removing oldest entries
   */
  private trimHistory(): void {
    const sorted = this.sortByRecent();
    const toRemove = sorted.slice(MAX_ENTRIES);
    toRemove.forEach(entry => {
      this.history.delete(entry.path);
    });
  }

  /**
   * Format last watched time as relative string
   */
  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) {
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    if (weeks > 0) {
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (days > 0) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    if (hours > 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (minutes > 0) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    return 'Just now';
  }

  /**
   * Format progress as percentage string
   */
  static formatProgress(progress: number): string {
    return `${Math.round(progress * 100)}%`;
  }
}

/**
 * Singleton instance for global access
 */
let watchHistoryInstance: WatchHistory | null = null;

/**
 * Get the global WatchHistory instance
 */
export function getWatchHistory(): WatchHistory {
  if (!watchHistoryInstance) {
    watchHistoryInstance = new WatchHistory();
  }
  return watchHistoryInstance;
}
