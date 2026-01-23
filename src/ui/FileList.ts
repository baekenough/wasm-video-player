/**
 * FileList - Video file list component
 *
 * Shows video files in the currently selected folder with:
 * - Thumbnail extraction (first frame via canvas)
 * - Filename display
 * - Duration (if available)
 * - Last watched indicator from WatchHistory
 * - Sorting by recently watched (descending)
 */

import { getWatchHistory, WatchHistory } from '@/storage/WatchHistory';
import { SUPPORTED_FORMATS } from './FileLoader';

/**
 * FileList configuration
 */
export interface FileListConfig {
  /** Container element to mount the file list */
  container: HTMLElement;
  /** Callback when a file is selected for playback - should return a promise that resolves when loading is complete */
  onFileSelect?: (file: File, handle: FileSystemFileHandle) => void | Promise<void>;
  /** Callback when playback should start after file is loaded */
  onPlayRequest?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Video file entry with metadata
 */
export interface VideoFileEntry {
  name: string;
  handle: FileSystemFileHandle;
  file?: File | undefined;
  size: number;
  thumbnail?: string | undefined;
  duration?: number | undefined;
  lastWatched?: number | undefined;
  progress?: number | undefined;
}

/**
 * View mode for the file list
 */
export type FileListViewMode = 'grid' | 'list';

/**
 * FileList class - video file browser component
 */
export class FileList {
  private readonly container: HTMLElement;
  private readonly onFileSelect: ((file: File, handle: FileSystemFileHandle) => void | Promise<void>) | undefined;
  private readonly onPlayRequest: (() => void) | undefined;
  private readonly onError: ((error: Error) => void) | undefined;

  // DOM elements
  private element: HTMLElement | null = null;
  private fileListEl: HTMLElement | null = null;
  private viewToggle: HTMLButtonElement | null = null;

  // State
  private currentFolderHandle: FileSystemDirectoryHandle | null = null;
  private files: VideoFileEntry[] = [];
  private viewMode: FileListViewMode = 'grid';
  private _isLoading = false;
  private watchHistory: WatchHistory;

  // Thumbnail generation
  private thumbnailCache: Map<string, string> = new Map();
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  constructor(config: FileListConfig) {
    this.container = config.container;
    this.onFileSelect = config.onFileSelect;
    this.onPlayRequest = config.onPlayRequest;
    this.onError = config.onError;
    this.watchHistory = getWatchHistory();
  }

  /**
   * Initialize the file list
   */
  init(): void {
    this.createUI();
    this.createThumbnailHelpers();
    this.bindEvents();
  }

  /**
   * Create the file list UI
   */
  private createUI(): void {
    this.element = document.createElement('div');
    this.element.className = 'file-list-container';

    this.element.innerHTML = `
      <div class="file-list-header">
        <h3 class="file-list-title">Video Files</h3>
        <div class="file-list-actions">
          <button class="file-list-view-toggle" type="button" aria-label="Toggle view mode">
            <svg class="icon-grid" viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" fill="currentColor"/>
            </svg>
            <svg class="icon-list" viewBox="0 0 24 24" width="16" height="16" hidden>
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="file-list-content">
        <ul class="file-list file-list-grid" role="listbox" aria-label="Video files"></ul>
        <div class="file-list-empty" hidden>
          <div class="file-list-empty-icon">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" fill="currentColor"/>
            </svg>
          </div>
          <span class="file-list-empty-text">No video files found</span>
          <span class="file-list-empty-hint">Supported: ${SUPPORTED_FORMATS.map(f => f.toUpperCase()).join(', ')}</span>
        </div>
        <div class="file-list-loading" hidden>
          <div class="file-list-spinner"></div>
          <span>Loading files...</span>
        </div>
      </div>
    `;

    // Cache element references
    this.fileListEl = this.element.querySelector('.file-list');
    this.viewToggle = this.element.querySelector('.file-list-view-toggle');

    this.container.appendChild(this.element);
  }

  /**
   * Create helper elements for thumbnail generation
   */
  private createThumbnailHelpers(): void {
    this.videoElement = document.createElement('video');
    this.videoElement.muted = true;
    this.videoElement.preload = 'metadata';
    this.videoElement.crossOrigin = 'anonymous';

    // Higher resolution canvas for better thumbnail quality
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = 320;
    this.canvasElement.height = 180;
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    this.viewToggle?.addEventListener('click', () => this.toggleViewMode());
  }

  /**
   * Set the current folder and load its video files
   */
  async setFolder(handle: FileSystemDirectoryHandle): Promise<void> {
    this.currentFolderHandle = handle;
    await this.loadFiles();
  }

  /**
   * Load video files from the current folder
   */
  private async loadFiles(): Promise<void> {
    if (!this.currentFolderHandle) return;

    try {
      this.showLoading(true);
      this.files = [];

      // Iterate through directory entries
      for await (const [name, handle] of this.currentFolderHandle.entries()) {
        if (handle.kind === 'file' && this.isVideoFile(name)) {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();

          const historyEntry = this.watchHistory.getEntry(name);

          const entry: VideoFileEntry = {
            name,
            handle: fileHandle,
            file,
            size: file.size,
            lastWatched: historyEntry?.lastWatched,
            progress: historyEntry?.progress,
          };

          this.files.push(entry);
        }
      }

      // Sort by recently watched (descending), then alphabetically
      this.sortFiles();

      // Render the file list
      this.renderFileList();

      // Generate thumbnails in background
      this.generateThumbnails();
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Check if a file is a supported video format
   */
  private isVideoFile(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension !== undefined && SUPPORTED_FORMATS.includes(extension as typeof SUPPORTED_FORMATS[number]);
  }

  /**
   * Sort files by recently watched (descending), then alphabetically
   */
  private sortFiles(): void {
    this.files.sort((a, b) => {
      // Files with watch history first, sorted by recency
      if (a.lastWatched && b.lastWatched) {
        return b.lastWatched - a.lastWatched;
      }
      if (a.lastWatched) return -1;
      if (b.lastWatched) return 1;

      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Render the file list
   */
  private renderFileList(): void {
    if (!this.fileListEl || !this.element) return;

    const emptyState = this.element.querySelector('.file-list-empty') as HTMLElement;
    const loadingEl = this.element.querySelector('.file-list-loading') as HTMLElement;

    // Always hide loading when rendering
    if (loadingEl) loadingEl.hidden = true;

    if (this.files.length === 0) {
      this.fileListEl.innerHTML = '';
      this.fileListEl.style.opacity = '1';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    this.fileListEl.innerHTML = this.files.map((file, index) => this.renderFileItem(file, index)).join('');

    // Bind click events
    this.fileListEl.querySelectorAll('.file-list-item').forEach((item, index) => {
      item.addEventListener('click', () => this.handleFileClick(index));
    });
  }

  /**
   * Render a single file item
   */
  private renderFileItem(file: VideoFileEntry, index: number): string {
    const cachedThumbnail = this.thumbnailCache.get(file.name);
    const thumbnailStyle = cachedThumbnail
      ? `background-image: url(${cachedThumbnail})`
      : '';

    const durationStr = file.duration !== undefined
      ? this.formatDuration(file.duration)
      : '';

    const lastWatchedStr = file.lastWatched !== undefined
      ? WatchHistory.formatRelativeTime(file.lastWatched)
      : '';

    const progressPercent = file.progress !== undefined
      ? Math.round(file.progress * 100)
      : 0;

    const sizeStr = this.formatFileSize(file.size);

    return `
      <li class="file-list-item${file.lastWatched !== undefined ? ' watched' : ''}"
          role="option"
          data-index="${index}"
          data-filename="${this.escapeHtml(file.name)}">
        <div class="file-list-item-thumbnail" style="${thumbnailStyle}">
          <div class="file-list-item-thumbnail-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M8 5v14l11-7z" fill="currentColor"/>
            </svg>
          </div>
          ${progressPercent > 0 ? `
            <div class="file-list-item-progress">
              <div class="file-list-item-progress-bar" style="width: ${progressPercent}%"></div>
            </div>
          ` : ''}
          ${durationStr ? `<span class="file-list-item-duration">${durationStr}</span>` : ''}
        </div>
        <div class="file-list-item-info">
          <span class="file-list-item-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
          <div class="file-list-item-meta">
            <span class="file-list-item-size">${sizeStr}</span>
            ${lastWatchedStr ? `
              <span class="file-list-item-watched">
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                </svg>
                ${lastWatchedStr}
              </span>
            ` : ''}
          </div>
        </div>
      </li>
    `;
  }

  /**
   * Handle file click - loads file and triggers auto-play
   */
  private async handleFileClick(index: number): Promise<void> {
    const entry = this.files[index];
    if (!entry) return;

    try {
      // Get or load the file
      const file = entry.file || await entry.handle.getFile();

      // Update watch history
      this.watchHistory.addToHistory(entry.name, 0, entry.duration, file.size);

      // Notify listener and wait for load to complete
      const loadResult = this.onFileSelect?.(file, entry.handle);
      if (loadResult instanceof Promise) {
        await loadResult;
      }

      // Request playback after file is loaded
      this.onPlayRequest?.();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Generate thumbnails for all files in background
   */
  private async generateThumbnails(): Promise<void> {
    if (!this.videoElement || !this.canvasElement) return;

    for (const file of this.files) {
      // Skip if already cached
      if (this.thumbnailCache.has(file.name)) continue;

      try {
        const thumbnail = await this.extractThumbnail(file);
        if (thumbnail) {
          this.thumbnailCache.set(file.name, thumbnail);
          this.updateThumbnail(file.name, thumbnail);

          // Also update duration if extracted
          if (file.duration !== undefined) {
            this.updateDuration(file.name, file.duration);
          }
        }
      } catch {
        // Thumbnail extraction failed, continue with placeholder
      }
    }
  }

  /**
   * Extract thumbnail from a video file
   */
  private async extractThumbnail(entry: VideoFileEntry): Promise<string | null> {
    if (!this.videoElement || !this.canvasElement) return null;

    return new Promise((resolve) => {
      const video = this.videoElement!;
      const canvas = this.canvasElement!;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      const file = entry.file;
      if (!file) {
        resolve(null);
        return;
      }

      const url = URL.createObjectURL(file);

      const cleanup = (): void => {
        URL.revokeObjectURL(url);
        video.removeEventListener('loadeddata', handleLoad);
        video.removeEventListener('error', handleError);
        video.removeEventListener('seeked', handleSeeked);
      };

      const handleError = (): void => {
        cleanup();
        resolve(null);
      };

      const handleSeeked = (): void => {
        try {
          // Draw video frame to canvas with high quality
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          cleanup();
          resolve(dataUrl);
        } catch {
          cleanup();
          resolve(null);
        }
      };

      const handleLoad = (): void => {
        // Store duration
        entry.duration = video.duration;

        // Seek to 1 second or 10% of duration (whichever is less)
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.addEventListener('loadeddata', handleLoad);
      video.addEventListener('error', handleError);
      video.addEventListener('seeked', handleSeeked);

      video.src = url;
    });
  }

  /**
   * Update thumbnail in the DOM
   */
  private updateThumbnail(filename: string, thumbnail: string): void {
    const item = this.fileListEl?.querySelector(`[data-filename="${this.escapeHtml(filename)}"]`);
    const thumbnailEl = item?.querySelector('.file-list-item-thumbnail') as HTMLElement;
    if (thumbnailEl) {
      thumbnailEl.style.backgroundImage = `url(${thumbnail})`;
    }
  }

  /**
   * Update duration in the DOM
   */
  private updateDuration(filename: string, duration: number): void {
    const item = this.fileListEl?.querySelector(`[data-filename="${this.escapeHtml(filename)}"]`);
    let durationEl = item?.querySelector('.file-list-item-duration') as HTMLElement;

    if (!durationEl) {
      // Create duration element if it doesn't exist
      const thumbnailEl = item?.querySelector('.file-list-item-thumbnail');
      if (thumbnailEl) {
        durationEl = document.createElement('span');
        durationEl.className = 'file-list-item-duration';
        thumbnailEl.appendChild(durationEl);
      }
    }

    if (durationEl) {
      durationEl.textContent = this.formatDuration(duration);
    }
  }

  /**
   * Toggle between grid and list view
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';

    if (this.fileListEl) {
      this.fileListEl.classList.toggle('file-list-grid', this.viewMode === 'grid');
      this.fileListEl.classList.toggle('file-list-list', this.viewMode === 'list');
    }

    // Toggle icons
    const gridIcon = this.viewToggle?.querySelector('.icon-grid') as HTMLElement;
    const listIcon = this.viewToggle?.querySelector('.icon-list') as HTMLElement;

    if (gridIcon && listIcon) {
      gridIcon.hidden = this.viewMode === 'list';
      listIcon.hidden = this.viewMode === 'grid';
    }
  }

  /**
   * Show/hide loading state
   */
  private showLoading(loading: boolean): void {
    this._isLoading = loading;
    const loadingEl = this.element?.querySelector('.file-list-loading') as HTMLElement;
    const contentEl = this.fileListEl;

    if (loadingEl) loadingEl.hidden = !loading;
    if (contentEl) contentEl.style.opacity = loading ? '0.5' : '1';
  }

  /**
   * Refresh the file list
   */
  async refresh(): Promise<void> {
    if (this.currentFolderHandle) {
      await this.loadFiles();
    }
  }

  /**
   * Update watch history for a file
   */
  updateProgress(filename: string, progress: number, duration?: number): void {
    this.watchHistory.addToHistory(filename, progress, duration);

    // Update the file entry
    const entry = this.files.find(f => f.name === filename);
    if (entry) {
      entry.progress = progress;
      entry.lastWatched = Date.now();
    }
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    console.error('[FileList] Error:', error);
    this.onError?.(error);
  }

  /**
   * Format duration in seconds to MM:SS or HH:MM:SS
   */
  private formatDuration(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '--:--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size to human readable
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get the current view mode
   */
  getViewMode(): FileListViewMode {
    return this.viewMode;
  }

  /**
   * Get the number of files
   */
  getFileCount(): number {
    return this.files.length;
  }

  /**
   * Get all video file entries
   */
  getFiles(): VideoFileEntry[] {
    return [...this.files];
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this._isLoading;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Revoke all cached thumbnail URLs
    this.thumbnailCache.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.thumbnailCache.clear();

    if (this.element && this.container.contains(this.element)) {
      this.container.removeChild(this.element);
    }

    this.element = null;
    this.fileListEl = null;
    this.viewToggle = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.currentFolderHandle = null;
    this.files = [];
  }
}
