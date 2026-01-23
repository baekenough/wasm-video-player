/**
 * FileLoader - Drag and drop file loading component
 *
 * Provides a drop zone for video file selection via drag-and-drop
 * or traditional file picker dialog.
 */

/**
 * Supported video file extensions
 */
export const SUPPORTED_FORMATS = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'm4v'] as const;

/**
 * Supported MIME types
 */
export const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/x-matroska',
  'video/avi',
  'video/quicktime',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/x-m4v',
] as const;

/**
 * Maximum file size in bytes (4GB)
 */
export const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024;

/**
 * FileLoader configuration
 */
export interface FileLoaderConfig {
  container: HTMLElement;
  onFileSelected: (file: File) => void;
  onError?: (error: FileLoaderError) => void;
  onProgress?: (progress: number) => void;
}

/**
 * FileLoader error types
 */
export enum FileLoaderErrorType {
  InvalidFormat = 'INVALID_FORMAT',
  FileTooLarge = 'FILE_TOO_LARGE',
  NoFile = 'NO_FILE',
  ReadError = 'READ_ERROR',
}

/**
 * FileLoader error
 */
export interface FileLoaderError {
  type: FileLoaderErrorType;
  message: string;
  file?: File | undefined;
}

/**
 * FileLoader class - handles drag-and-drop and click-to-select file loading
 */
export class FileLoader {
  private readonly container: HTMLElement;
  private readonly onFileSelected: (file: File) => void;
  private readonly onError: ((error: FileLoaderError) => void) | undefined;
  private readonly onProgress: ((progress: number) => void) | undefined;

  private dropZone: HTMLElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private progressBar: HTMLElement | null = null;
  private isLoading: boolean = false;

  // Bound event handlers
  private boundHandleDragOver: (e: DragEvent) => void;
  private boundHandleDragEnter: (e: DragEvent) => void;
  private boundHandleDragLeave: (e: DragEvent) => void;
  private boundHandleDrop: (e: DragEvent) => void;
  private boundHandleClick: () => void;
  private boundHandleFileSelect: (e: Event) => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(config: FileLoaderConfig) {
    this.container = config.container;
    this.onFileSelected = config.onFileSelected;
    this.onError = config.onError;
    this.onProgress = config.onProgress;

    // Bind event handlers
    this.boundHandleDragOver = this.handleDragOver.bind(this);
    this.boundHandleDragEnter = this.handleDragEnter.bind(this);
    this.boundHandleDragLeave = this.handleDragLeave.bind(this);
    this.boundHandleDrop = this.handleDrop.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleFileSelect = this.handleFileSelect.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    this.init();
  }

  /**
   * Initialize the file loader
   */
  private init(): void {
    this.createDropZone();
    this.createFileInput();
    this.attachEventListeners();
  }

  /**
   * Create the drop zone element
   */
  private createDropZone(): void {
    this.dropZone = document.createElement('div');
    this.dropZone.className = 'file-loader-dropzone';
    this.dropZone.setAttribute('role', 'button');
    this.dropZone.setAttribute('tabindex', '0');
    this.dropZone.setAttribute('aria-label', 'Drop video file here or click to select');

    this.dropZone.innerHTML = `
      <div class="file-loader-content">
        <div class="file-loader-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </div>
        <div class="file-loader-text">
          <span class="file-loader-title">Drop video file here</span>
          <span class="file-loader-subtitle">or click to select</span>
        </div>
        <div class="file-loader-formats">
          Supported: ${SUPPORTED_FORMATS.map(f => f.toUpperCase()).join(', ')}
        </div>
        <div class="file-loader-progress" hidden>
          <div class="file-loader-progress-bar">
            <div class="file-loader-progress-fill"></div>
          </div>
          <span class="file-loader-progress-text">Loading...</span>
        </div>
      </div>
    `;

    this.progressBar = this.dropZone.querySelector('.file-loader-progress-fill');
    this.container.appendChild(this.dropZone);
  }

  /**
   * Create the hidden file input element
   */
  private createFileInput(): void {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = SUPPORTED_MIME_TYPES.join(',') + ',' + SUPPORTED_FORMATS.map(f => `.${f}`).join(',');
    this.fileInput.className = 'file-loader-input';
    this.fileInput.setAttribute('aria-hidden', 'true');
    this.fileInput.style.display = 'none';
    this.container.appendChild(this.fileInput);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.dropZone || !this.fileInput) return;

    // Drag events
    this.dropZone.addEventListener('dragover', this.boundHandleDragOver);
    this.dropZone.addEventListener('dragenter', this.boundHandleDragEnter);
    this.dropZone.addEventListener('dragleave', this.boundHandleDragLeave);
    this.dropZone.addEventListener('drop', this.boundHandleDrop);

    // Click and keyboard events
    this.dropZone.addEventListener('click', this.boundHandleClick);
    this.dropZone.addEventListener('keydown', this.boundHandleKeyDown);

    // File input change event
    this.fileInput.addEventListener('change', this.boundHandleFileSelect);
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    if (!this.dropZone || !this.fileInput) return;

    this.dropZone.removeEventListener('dragover', this.boundHandleDragOver);
    this.dropZone.removeEventListener('dragenter', this.boundHandleDragEnter);
    this.dropZone.removeEventListener('dragleave', this.boundHandleDragLeave);
    this.dropZone.removeEventListener('drop', this.boundHandleDrop);
    this.dropZone.removeEventListener('click', this.boundHandleClick);
    this.dropZone.removeEventListener('keydown', this.boundHandleKeyDown);
    this.fileInput.removeEventListener('change', this.boundHandleFileSelect);
  }

  /**
   * Handle dragover event
   */
  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * Handle dragenter event
   */
  private handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.dropZone && !this.isLoading) {
      this.dropZone.classList.add('dragover');
    }
  }

  /**
   * Handle dragleave event
   */
  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    // Only remove class if we're leaving the drop zone entirely
    const relatedTarget = e.relatedTarget as Node | null;
    if (this.dropZone && !this.dropZone.contains(relatedTarget)) {
      this.dropZone.classList.remove('dragover');
    }
  }

  /**
   * Handle drop event
   */
  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (this.dropZone) {
      this.dropZone.classList.remove('dragover');
    }

    if (this.isLoading) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    } else {
      this.handleError(FileLoaderErrorType.NoFile, 'No file was dropped');
    }
  }

  /**
   * Handle click event
   */
  private handleClick(): void {
    if (this.isLoading) return;
    this.fileInput?.click();
  }

  /**
   * Handle keyboard event for accessibility
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  }

  /**
   * Handle file input change event
   */
  private handleFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
    // Reset input to allow selecting the same file again
    input.value = '';
  }

  /**
   * Process the selected file
   */
  private processFile(file: File): void {
    // Validate file format
    if (!this.isValidFormat(file)) {
      this.handleError(
        FileLoaderErrorType.InvalidFormat,
        `Unsupported format. Please use: ${SUPPORTED_FORMATS.join(', ')}`,
        file
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      this.handleError(
        FileLoaderErrorType.FileTooLarge,
        `File is too large. Maximum size is ${this.formatFileSize(MAX_FILE_SIZE)}`,
        file
      );
      return;
    }

    // Show loading state
    this.showLoading(file.name);

    // Simulate progress for UX (actual loading happens in player)
    this.simulateProgress(() => {
      this.hideLoading();
      this.onFileSelected(file);
    });
  }

  /**
   * Check if file format is valid
   */
  private isValidFormat(file: File): boolean {
    // Check MIME type
    if (SUPPORTED_MIME_TYPES.includes(file.type as typeof SUPPORTED_MIME_TYPES[number])) {
      return true;
    }

    // Check file extension as fallback
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && SUPPORTED_FORMATS.includes(extension as typeof SUPPORTED_FORMATS[number])) {
      return true;
    }

    return false;
  }

  /**
   * Format file size for display
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
   * Handle error
   */
  private handleError(type: FileLoaderErrorType, message: string, file?: File): void {
    const error: FileLoaderError = { type, message, file };

    if (this.onError) {
      this.onError(error);
    } else {
      console.error(`[FileLoader] ${type}: ${message}`);
    }

    // Show error state briefly
    this.showError(message);
  }

  /**
   * Show loading state
   */
  private showLoading(fileName: string): void {
    this.isLoading = true;
    if (this.dropZone) {
      this.dropZone.classList.add('loading');
      const progressContainer = this.dropZone.querySelector('.file-loader-progress') as HTMLElement;
      const progressText = this.dropZone.querySelector('.file-loader-progress-text') as HTMLElement;
      if (progressContainer) progressContainer.hidden = false;
      if (progressText) progressText.textContent = `Loading ${fileName}...`;
    }
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    this.isLoading = false;
    if (this.dropZone) {
      this.dropZone.classList.remove('loading');
      const progressContainer = this.dropZone.querySelector('.file-loader-progress') as HTMLElement;
      if (progressContainer) progressContainer.hidden = true;
    }
    this.updateProgress(0);
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    if (this.dropZone) {
      this.dropZone.classList.add('error');
      const subtitle = this.dropZone.querySelector('.file-loader-subtitle') as HTMLElement;
      const originalText = subtitle?.textContent || '';
      if (subtitle) {
        subtitle.textContent = message;
        subtitle.classList.add('error-text');
      }

      setTimeout(() => {
        this.dropZone?.classList.remove('error');
        if (subtitle) {
          subtitle.textContent = originalText;
          subtitle.classList.remove('error-text');
        }
      }, 3000);
    }
  }

  /**
   * Update progress bar
   */
  private updateProgress(percent: number): void {
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
    if (this.onProgress) {
      this.onProgress(percent);
    }
  }

  /**
   * Simulate loading progress for UX
   */
  private simulateProgress(onComplete: () => void): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        this.updateProgress(progress);
        setTimeout(onComplete, 100);
      } else {
        this.updateProgress(progress);
      }
    }, 100);
  }

  /**
   * Show the drop zone
   */
  show(): void {
    if (this.dropZone) {
      this.dropZone.hidden = false;
      this.dropZone.classList.add('visible');
    }
  }

  /**
   * Hide the drop zone
   */
  hide(): void {
    if (this.dropZone) {
      this.dropZone.classList.remove('visible');
      setTimeout(() => {
        if (this.dropZone) this.dropZone.hidden = true;
      }, 250);
    }
  }

  /**
   * Check if the drop zone is visible
   */
  isVisible(): boolean {
    return this.dropZone?.hidden === false;
  }

  /**
   * Check if currently loading
   */
  isLoadingFile(): boolean {
    return this.isLoading;
  }

  /**
   * Get the drop zone element
   */
  getDropZone(): HTMLElement | null {
    return this.dropZone;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detachEventListeners();

    if (this.dropZone && this.container.contains(this.dropZone)) {
      this.container.removeChild(this.dropZone);
    }
    if (this.fileInput && this.container.contains(this.fileInput)) {
      this.container.removeChild(this.fileInput);
    }

    this.dropZone = null;
    this.fileInput = null;
    this.progressBar = null;
  }
}
