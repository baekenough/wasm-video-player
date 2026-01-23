/**
 * TimelineThumbnails - Timeline thumbnail preview component
 *
 * Generates and displays video thumbnails in a vertical scrollable container.
 * Thumbnails are clickable for seeking to specific positions.
 *
 * Features:
 * - Automatic interval calculation based on video duration
 * - Lazy thumbnail generation using FFmpegDecoder
 * - Click to seek functionality
 * - Active thumbnail highlighting based on current position
 * - Loading states during thumbnail generation
 */

import { FFmpegDecoder, type ExtractedFrame } from '@player/FFmpegDecoder';

/**
 * Thumbnail item data
 */
export interface ThumbnailItem {
  /** Thumbnail timestamp in seconds */
  timestamp: number;
  /** Thumbnail image data URL (null if not yet generated) */
  dataUrl: string | null;
  /** Thumbnail width */
  width: number;
  /** Thumbnail height */
  height: number;
  /** Whether this thumbnail is currently loading */
  loading: boolean;
}

/**
 * TimelineThumbnails configuration
 */
export interface TimelineThumbnailsConfig {
  /** Container element to render thumbnails into */
  container: HTMLElement;
  /** Thumbnail width (default: 120) */
  thumbnailWidth?: number;
  /** Callback when thumbnail is clicked */
  onSeek?: (timestamp: number) => void;
  /** Callback when thumbnails generation starts */
  onGenerationStart?: () => void;
  /** Callback when thumbnails generation completes */
  onGenerationComplete?: () => void;
  /** Callback for generation progress */
  onGenerationProgress?: (current: number, total: number) => void;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  thumbnailWidth: 120, // Smaller for faster generation
};

/**
 * Calculate thumbnail interval based on video duration
 * Aims for approximately 3-5 thumbnails per video for much faster generation
 */
function calculateInterval(durationSeconds: number): number {
  if (durationSeconds < 15) {
    // < 15 seconds: just start and middle
    return Math.max(5, durationSeconds / 2);
  } else if (durationSeconds < 60) {
    // 15s - 1 minute: every 15 seconds (~3-4 thumbnails)
    return 15;
  } else if (durationSeconds < 300) {
    // 1-5 minutes: every 60 seconds (~3-5 thumbnails)
    return 60;
  } else if (durationSeconds < 1800) {
    // 5-30 minutes: every 5 minutes (~3-6 thumbnails)
    return 300;
  } else {
    // > 30 minutes: every 10 minutes
    return 600;
  }
}

/**
 * Format timestamp to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert RGBA frame data to canvas data URL
 */
function frameToDataUrl(frame: ExtractedFrame): string {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const imageData = new ImageData(
    new Uint8ClampedArray(frame.data),
    frame.width,
    frame.height
  );
  ctx.putImageData(imageData, 0, 0);

  // Use higher quality JPEG encoding
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * TimelineThumbnails class
 *
 * Generates timeline thumbnails from video using FFmpegDecoder
 * and displays them in a scrollable vertical list.
 */
export class TimelineThumbnails {
  private readonly container: HTMLElement;
  private readonly config: Required<Omit<TimelineThumbnailsConfig, 'onSeek' | 'onGenerationStart' | 'onGenerationComplete' | 'onGenerationProgress'>> & TimelineThumbnailsConfig;

  private thumbnailsWrapper: HTMLElement | null = null;
  private thumbnails: ThumbnailItem[] = [];
  private currentTime: number = 0;
  private duration: number = 0;
  private interval: number = 10;
  private isGenerating: boolean = false;
  private abortGeneration: boolean = false;

  constructor(config: TimelineThumbnailsConfig) {
    this.container = config.container;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Initialize the component
   */
  init(): void {
    this.render();
    this.bindEvents();
  }

  /**
   * Render the thumbnail container
   */
  private render(): void {
    // Create wrapper element
    this.thumbnailsWrapper = document.createElement('div');
    this.thumbnailsWrapper.className = 'timeline-thumbnails';
    this.thumbnailsWrapper.innerHTML = `
      <div class="timeline-thumbnails-header">
        <span class="timeline-thumbnails-title">Timeline</span>
      </div>
      <div class="timeline-thumbnails-content">
        <div class="timeline-thumbnails-empty">
          <div class="timeline-thumbnails-empty-icon">
            <svg viewBox="0 0 24 24"><path d="M4 6.47L5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z" fill="currentColor"/></svg>
          </div>
          <span class="timeline-thumbnails-empty-text">Load a video to see thumbnails</span>
        </div>
      </div>
    `;

    this.container.appendChild(this.thumbnailsWrapper);
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    // Thumbnail clicks are handled via event delegation in renderThumbnails
  }

  /**
   * Generate thumbnails for a video
   */
  async generateThumbnails(
    ffmpegDecoder: FFmpegDecoder,
    videoSource: string | ArrayBuffer | File
  ): Promise<void> {
    if (this.isGenerating) {
      console.warn('Thumbnail generation already in progress');
      return;
    }

    this.isGenerating = true;
    this.abortGeneration = false;
    this.config.onGenerationStart?.();

    try {
      // Load video if not already loaded
      if (!ffmpegDecoder.getMetadata()) {
        await ffmpegDecoder.loadVideo(videoSource);
      }

      const metadata = ffmpegDecoder.getMetadata();
      if (!metadata) {
        throw new Error('Failed to get video metadata');
      }

      this.duration = metadata.duration;
      this.interval = calculateInterval(this.duration);

      // Calculate number of thumbnails
      const numThumbnails = Math.ceil(this.duration / this.interval);

      // Initialize thumbnail placeholders
      this.thumbnails = [];
      for (let i = 0; i < numThumbnails; i++) {
        const timestamp = i * this.interval;
        if (timestamp <= this.duration) {
          this.thumbnails.push({
            timestamp,
            dataUrl: null,
            width: this.config.thumbnailWidth,
            height: Math.round((this.config.thumbnailWidth / metadata.width) * metadata.height),
            loading: true,
          });
        }
      }

      // Render loading placeholders
      this.renderThumbnails();

      // Generate thumbnails one by one
      for (let i = 0; i < this.thumbnails.length; i++) {
        if (this.abortGeneration) {
          break;
        }

        const thumbnail = this.thumbnails[i]!;

        try {
          const frame = await ffmpegDecoder.extractFrameAt(
            thumbnail.timestamp,
            this.config.thumbnailWidth
          );

          if (frame) {
            thumbnail.dataUrl = frameToDataUrl(frame);
            thumbnail.width = frame.width;
            thumbnail.height = frame.height;
          }
        } catch (error) {
          console.warn(`Failed to extract frame at ${thumbnail.timestamp}:`, error);
        }

        thumbnail.loading = false;
        this.config.onGenerationProgress?.(i + 1, this.thumbnails.length);

        // Update UI with new thumbnail
        this.updateThumbnailElement(i);
      }

      this.config.onGenerationComplete?.();
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      this.showError('Failed to generate thumbnails');
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Render all thumbnails
   */
  private renderThumbnails(): void {
    if (!this.thumbnailsWrapper) return;

    const content = this.thumbnailsWrapper.querySelector('.timeline-thumbnails-content');
    if (!content) return;

    if (this.thumbnails.length === 0) {
      content.innerHTML = `
        <div class="timeline-thumbnails-empty">
          <div class="timeline-thumbnails-empty-icon">
            <svg viewBox="0 0 24 24"><path d="M4 6.47L5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z" fill="currentColor"/></svg>
          </div>
          <span class="timeline-thumbnails-empty-text">Load a video to see thumbnails</span>
        </div>
      `;
      return;
    }

    const thumbnailsHtml = this.thumbnails.map((thumb, index) => {
      const isActive = this.isActiveThumbnail(thumb.timestamp);
      const activeClass = isActive ? ' active' : '';
      const loadingClass = thumb.loading ? ' loading' : '';

      return `
        <div class="timeline-thumbnail-item${activeClass}${loadingClass}"
             data-index="${index}"
             data-timestamp="${thumb.timestamp}">
          <div class="timeline-thumbnail-image" style="aspect-ratio: ${thumb.width}/${thumb.height}">
            ${thumb.loading
              ? `<div class="timeline-thumbnail-loader">
                   <div class="timeline-thumbnail-spinner"></div>
                 </div>`
              : thumb.dataUrl
                ? `<img src="${thumb.dataUrl}" alt="Frame at ${formatTimestamp(thumb.timestamp)}" />`
                : `<div class="timeline-thumbnail-placeholder">
                     <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>
                   </div>`
            }
          </div>
          <div class="timeline-thumbnail-timestamp">${formatTimestamp(thumb.timestamp)}</div>
        </div>
      `;
    }).join('');

    content.innerHTML = `<div class="timeline-thumbnails-list">${thumbnailsHtml}</div>`;

    // Bind click events
    content.querySelectorAll('.timeline-thumbnail-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const timestamp = parseFloat(target.dataset.timestamp ?? '0');
        this.config.onSeek?.(timestamp);
      });
    });
  }

  /**
   * Update a single thumbnail element
   */
  private updateThumbnailElement(index: number): void {
    if (!this.thumbnailsWrapper) return;

    const item = this.thumbnailsWrapper.querySelector(
      `.timeline-thumbnail-item[data-index="${index}"]`
    ) as HTMLElement | null;

    if (!item) return;

    const thumbnail = this.thumbnails[index];
    if (!thumbnail) return;

    item.classList.remove('loading');

    const imageContainer = item.querySelector('.timeline-thumbnail-image');
    if (imageContainer && thumbnail.dataUrl) {
      imageContainer.innerHTML = `<img src="${thumbnail.dataUrl}" alt="Frame at ${formatTimestamp(thumbnail.timestamp)}" />`;
    } else if (imageContainer && !thumbnail.loading) {
      imageContainer.innerHTML = `
        <div class="timeline-thumbnail-placeholder">
          <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>
        </div>
      `;
    }
  }

  /**
   * Check if a timestamp is the active (current) thumbnail
   */
  private isActiveThumbnail(timestamp: number): boolean {
    const nextTimestamp = timestamp + this.interval;
    return this.currentTime >= timestamp && this.currentTime < nextTimestamp;
  }

  /**
   * Update the current playback time
   */
  setCurrentTime(time: number): void {
    const previousTime = this.currentTime;
    this.currentTime = time;

    // Check if active thumbnail changed
    const previousIndex = Math.floor(previousTime / this.interval);
    const currentIndex = Math.floor(time / this.interval);

    if (previousIndex !== currentIndex) {
      this.updateActiveThumbnail(previousIndex, currentIndex);
    }
  }

  /**
   * Update active thumbnail highlighting
   */
  private updateActiveThumbnail(previousIndex: number, currentIndex: number): void {
    if (!this.thumbnailsWrapper) return;

    // Remove previous active
    const previousItem = this.thumbnailsWrapper.querySelector(
      `.timeline-thumbnail-item[data-index="${previousIndex}"]`
    );
    previousItem?.classList.remove('active');

    // Add current active
    const currentItem = this.thumbnailsWrapper.querySelector(
      `.timeline-thumbnail-item[data-index="${currentIndex}"]`
    );
    currentItem?.classList.add('active');

    // Scroll active thumbnail into view
    if (currentItem) {
      currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (!this.thumbnailsWrapper) return;

    const content = this.thumbnailsWrapper.querySelector('.timeline-thumbnails-content');
    if (content) {
      content.innerHTML = `
        <div class="timeline-thumbnails-error">
          <div class="timeline-thumbnails-error-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>
          </div>
          <span class="timeline-thumbnails-error-text">${message}</span>
        </div>
      `;
    }
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    if (!this.thumbnailsWrapper) return;

    const content = this.thumbnailsWrapper.querySelector('.timeline-thumbnails-content');
    if (content) {
      content.innerHTML = `
        <div class="timeline-thumbnails-loading">
          <div class="timeline-thumbnails-spinner"></div>
          <span class="timeline-thumbnails-loading-text">Generating thumbnails...</span>
        </div>
      `;
    }
  }

  /**
   * Clear thumbnails
   */
  clear(): void {
    this.abortGeneration = true;
    this.thumbnails = [];
    this.currentTime = 0;
    this.duration = 0;
    this.renderThumbnails();
  }

  /**
   * Get the number of thumbnails
   */
  getThumbnailCount(): number {
    return this.thumbnails.length;
  }

  /**
   * Check if thumbnails are being generated
   */
  isGeneratingThumbnails(): boolean {
    return this.isGenerating;
  }

  /**
   * Dispose the component
   */
  dispose(): void {
    this.abortGeneration = true;
    this.thumbnails = [];

    if (this.thumbnailsWrapper && this.thumbnailsWrapper.parentNode) {
      this.thumbnailsWrapper.parentNode.removeChild(this.thumbnailsWrapper);
    }

    this.thumbnailsWrapper = null;
  }
}
