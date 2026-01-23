/**
 * FileLoader Test Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FileLoader,
  FileLoaderConfig,
  FileLoaderErrorType,
  SUPPORTED_FORMATS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './FileLoader';

describe('FileLoader', () => {
  let container: HTMLDivElement;
  let fileLoader: FileLoader;
  let onFileSelected: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let onProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    onFileSelected = vi.fn();
    onError = vi.fn();
    onProgress = vi.fn();
  });

  afterEach(() => {
    fileLoader?.dispose();
    container.remove();
    vi.clearAllMocks();
  });

  const createFileLoader = (config: Partial<FileLoaderConfig> = {}) => {
    fileLoader = new FileLoader({
      container,
      onFileSelected,
      onError,
      onProgress,
      ...config,
    });
    return fileLoader;
  };

  const createMockFile = (
    name: string = 'video.mp4',
    type: string = 'video/mp4',
    size: number = 1024 * 1024
  ): File => {
    const content = new Uint8Array(size);
    const blob = new Blob([content], { type });
    return new File([blob], name, { type });
  };

  const createDragEvent = (
    type: string,
    files: File[] = []
  ): DragEvent => {
    const dataTransfer = {
      files: files as unknown as FileList,
      dropEffect: 'none' as DataTransfer['dropEffect'],
      effectAllowed: 'all' as DataTransfer['effectAllowed'],
      items: [] as unknown as DataTransferItemList,
      types: [],
      clearData: vi.fn(),
      getData: vi.fn(),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    const event = new Event(type, {
      bubbles: true,
      cancelable: true,
    }) as DragEvent;

    Object.defineProperty(event, 'dataTransfer', {
      value: dataTransfer,
      writable: false,
    });

    return event;
  };

  describe('initialization', () => {
    it('should create drop zone element', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone');
      expect(dropZone).not.toBeNull();
    });

    it('should create hidden file input', () => {
      createFileLoader();
      const input = container.querySelector('.file-loader-input');
      expect(input).not.toBeNull();
      expect((input as HTMLInputElement).type).toBe('file');
    });

    it('should set correct accessibility attributes', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone');
      expect(dropZone?.getAttribute('role')).toBe('button');
      expect(dropZone?.getAttribute('tabindex')).toBe('0');
      expect(dropZone?.getAttribute('aria-label')).toBe('Drop video file here or click to select');
    });

    it('should display supported formats', () => {
      createFileLoader();
      const formatsElement = container.querySelector('.file-loader-formats');
      expect(formatsElement?.textContent).toContain('MP4');
      expect(formatsElement?.textContent).toContain('WEBM');
      expect(formatsElement?.textContent).toContain('MKV');
    });

    it('should accept correct file types on input', () => {
      createFileLoader();
      const input = container.querySelector('.file-loader-input') as HTMLInputElement;
      expect(input.accept).toContain('video/mp4');
      expect(input.accept).toContain('.mp4');
    });
  });

  describe('drag and drop', () => {
    it('should add dragover class on dragenter', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;

      dropZone.dispatchEvent(createDragEvent('dragenter'));

      expect(dropZone.classList.contains('dragover')).toBe(true);
    });

    it('should remove dragover class on dragleave', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;

      dropZone.dispatchEvent(createDragEvent('dragenter'));
      dropZone.dispatchEvent(createDragEvent('dragleave'));

      expect(dropZone.classList.contains('dragover')).toBe(false);
    });

    it('should prevent default on dragover', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const event = createDragEvent('dragover');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      dropZone.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should process file on drop with valid file', async () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      // Run timers for simulated progress
      vi.runAllTimers();

      expect(onFileSelected).toHaveBeenCalledWith(file);
      vi.useRealTimers();
    });

    it('should call onError with invalid file format', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('document.pdf', 'application/pdf');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FileLoaderErrorType.InvalidFormat,
        })
      );
      expect(onFileSelected).not.toHaveBeenCalled();
    });

    it('should call onError with file too large', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('large.mp4', 'video/mp4', MAX_FILE_SIZE + 1);
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FileLoaderErrorType.FileTooLarge,
        })
      );
      expect(onFileSelected).not.toHaveBeenCalled();
    });

    it('should call onError when no file dropped', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const event = createDragEvent('drop', []);

      dropZone.dispatchEvent(event);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: FileLoaderErrorType.NoFile,
        })
      );
    });
  });

  describe('click to select', () => {
    it('should trigger file input click on drop zone click', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const input = container.querySelector('.file-loader-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      dropZone.click();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should trigger file input on Enter key', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const input = container.querySelector('.file-loader-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      dropZone.dispatchEvent(keyEvent);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should trigger file input on Space key', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const input = container.querySelector('.file-loader-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      const keyEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      dropZone.dispatchEvent(keyEvent);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not trigger when loading', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const input = container.querySelector('.file-loader-input') as HTMLInputElement;

      // Start loading
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);
      dropZone.dispatchEvent(event);

      // Try to click
      const clickSpy = vi.spyOn(input, 'click');
      dropZone.click();

      expect(clickSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('file validation', () => {
    it.each(SUPPORTED_FORMATS)('should accept .%s files', (format) => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile(`video.${format}`, '');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);
      vi.runAllTimers();

      expect(onFileSelected).toHaveBeenCalledWith(file);
      expect(onError).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it.each(SUPPORTED_MIME_TYPES)('should accept %s MIME type', (mimeType) => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.bin', mimeType);
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);
      vi.runAllTimers();

      expect(onFileSelected).toHaveBeenCalledWith(file);
      expect(onError).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should reject unsupported formats', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;

      const unsupportedFormats = ['txt', 'jpg', 'png', 'pdf', 'doc'];
      unsupportedFormats.forEach((format) => {
        onError.mockClear();
        const file = createMockFile(`file.${format}`, `application/${format}`);
        const event = createDragEvent('drop', [file]);

        dropZone.dispatchEvent(event);

        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: FileLoaderErrorType.InvalidFormat,
          })
        );
      });
    });
  });

  describe('progress tracking', () => {
    it('should call onProgress during loading', async () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      // Advance timers to trigger progress updates
      vi.advanceTimersByTime(500);

      expect(onProgress).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should show progress bar during loading', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      const progressContainer = container.querySelector('.file-loader-progress') as HTMLElement;
      expect(progressContainer.hidden).toBe(false);
      vi.useRealTimers();
    });

    it('should hide progress bar after loading', async () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);
      vi.runAllTimers();

      const progressContainer = container.querySelector('.file-loader-progress') as HTMLElement;
      expect(progressContainer.hidden).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('visibility', () => {
    it('should show drop zone', () => {
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;

      fileLoader.show();

      expect(dropZone.classList.contains('visible')).toBe(true);
      expect(dropZone.hidden).toBe(false);
    });

    it('should hide drop zone', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;

      fileLoader.show();
      fileLoader.hide();

      expect(dropZone.classList.contains('visible')).toBe(false);

      vi.advanceTimersByTime(300);
      expect(dropZone.hidden).toBe(true);
      vi.useRealTimers();
    });

    it('should report visibility status correctly', () => {
      createFileLoader();

      fileLoader.show();
      expect(fileLoader.isVisible()).toBe(true);
    });
  });

  describe('loading state', () => {
    it('should report loading state correctly', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      expect(fileLoader.isLoadingFile()).toBe(false);

      dropZone.dispatchEvent(event);
      expect(fileLoader.isLoadingFile()).toBe(true);

      vi.runAllTimers();
      expect(fileLoader.isLoadingFile()).toBe(false);
      vi.useRealTimers();
    });

    it('should add loading class when loading', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      expect(dropZone.classList.contains('loading')).toBe(true);
      vi.useRealTimers();
    });

    it('should display file name during loading', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('my-video.mp4', 'video/mp4');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      const progressText = container.querySelector('.file-loader-progress-text');
      expect(progressText?.textContent).toContain('my-video.mp4');
      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should show error state on invalid file', () => {
      vi.useFakeTimers();
      createFileLoader();
      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('document.pdf', 'application/pdf');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      expect(dropZone.classList.contains('error')).toBe(true);

      vi.advanceTimersByTime(3500);
      expect(dropZone.classList.contains('error')).toBe(false);
      vi.useRealTimers();
    });

    it('should log error if no onError callback', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fileLoader = new FileLoader({
        container,
        onFileSelected,
        // No onError callback
      });

      const dropZone = container.querySelector('.file-loader-dropzone') as HTMLElement;
      const file = createMockFile('document.pdf', 'application/pdf');
      const event = createDragEvent('drop', [file]);

      dropZone.dispatchEvent(event);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FileLoader]')
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should remove all elements', () => {
      createFileLoader();

      fileLoader.dispose();

      expect(container.querySelector('.file-loader-dropzone')).toBeNull();
      expect(container.querySelector('.file-loader-input')).toBeNull();
    });

    it('should return null for getDropZone after dispose', () => {
      createFileLoader();

      fileLoader.dispose();

      expect(fileLoader.getDropZone()).toBeNull();
    });

    it('should not throw when dispose called multiple times', () => {
      createFileLoader();

      expect(() => {
        fileLoader.dispose();
        fileLoader.dispose();
      }).not.toThrow();
    });
  });

  describe('constants', () => {
    it('should export SUPPORTED_FORMATS', () => {
      expect(SUPPORTED_FORMATS).toContain('mp4');
      expect(SUPPORTED_FORMATS).toContain('webm');
      expect(SUPPORTED_FORMATS).toContain('mkv');
    });

    it('should export SUPPORTED_MIME_TYPES', () => {
      expect(SUPPORTED_MIME_TYPES).toContain('video/mp4');
      expect(SUPPORTED_MIME_TYPES).toContain('video/webm');
    });

    it('should export MAX_FILE_SIZE as 4GB', () => {
      expect(MAX_FILE_SIZE).toBe(4 * 1024 * 1024 * 1024);
    });
  });
});
