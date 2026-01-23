/**
 * FolderBrowser - File System Access API based folder browser
 *
 * Provides a folder browser UI that:
 * - Uses showDirectoryPicker for selecting root folder
 * - Shows ONLY subfolders (not files) in a list
 * - Supports navigation into subfolders
 * - Provides breadcrumb navigation for going back
 * - Persists selected root folder handle in IndexedDB
 */

/**
 * FolderBrowser configuration
 */
export interface FolderBrowserConfig {
  /** Container element to mount the browser */
  container: HTMLElement;
  /** Callback when folder selection changes */
  onFolderChange?: (handle: FileSystemDirectoryHandle, path: string[]) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Folder entry with handle and metadata
 */
export interface FolderEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
}

/**
 * IndexedDB storage key for folder handle
 */
const IDB_NAME = 'wasm-video-player-folders';
const IDB_STORE = 'folder-handles';
const IDB_KEY = 'root-folder';

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * FolderBrowser class - folder navigation component
 */
export class FolderBrowser {
  private readonly container: HTMLElement;
  private readonly onFolderChange: ((handle: FileSystemDirectoryHandle, path: string[]) => void) | undefined;
  private readonly onError: ((error: Error) => void) | undefined;

  // DOM elements
  private element: HTMLElement | null = null;
  private selectButton: HTMLButtonElement | null = null;
  private breadcrumbNav: HTMLElement | null = null;
  private folderList: HTMLElement | null = null;

  // State
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private currentHandle: FileSystemDirectoryHandle | null = null;
  private pathStack: string[] = [];
  private _isLoading = false;

  // IndexedDB
  private db: IDBDatabase | null = null;

  constructor(config: FolderBrowserConfig) {
    this.container = config.container;
    this.onFolderChange = config.onFolderChange;
    this.onError = config.onError;
  }

  /**
   * Initialize the folder browser
   */
  async init(): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      this.showUnsupportedMessage();
      return;
    }

    this.createUI();
    this.bindEvents();

    // Try to restore saved folder handle
    await this.initIndexedDB();
    await this.restoreSavedHandle();
  }

  /**
   * Create the folder browser UI
   */
  private createUI(): void {
    this.element = document.createElement('div');
    this.element.className = 'folder-browser';

    this.element.innerHTML = `
      <div class="folder-browser-header">
        <button class="folder-browser-select-btn" type="button">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/>
          </svg>
          Select Root Folder
        </button>
      </div>
      <nav class="folder-browser-breadcrumb" aria-label="Folder path">
        <ol class="breadcrumb-list"></ol>
      </nav>
      <div class="folder-browser-content">
        <ul class="folder-list" role="listbox" aria-label="Subfolders"></ul>
        <div class="folder-browser-empty" hidden>
          <div class="folder-browser-empty-icon">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/>
            </svg>
          </div>
          <span class="folder-browser-empty-text">No subfolders</span>
        </div>
        <div class="folder-browser-loading" hidden>
          <div class="folder-browser-spinner"></div>
          <span>Loading folders...</span>
        </div>
      </div>
    `;

    // Cache element references
    this.selectButton = this.element.querySelector('.folder-browser-select-btn');
    this.breadcrumbNav = this.element.querySelector('.folder-browser-breadcrumb');
    this.folderList = this.element.querySelector('.folder-list');

    this.container.appendChild(this.element);
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    this.selectButton?.addEventListener('click', () => this.handleSelectFolder());
  }

  /**
   * Handle select folder button click
   */
  private async handleSelectFolder(): Promise<void> {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read',
      });

      this.rootHandle = handle;
      this.currentHandle = handle;
      this.pathStack = [];

      // Save to IndexedDB for persistence
      await this.saveHandle(handle);

      // Load and display subfolders
      await this.loadCurrentFolder();

      // Notify listener about root folder selection
      this.onFolderChange?.(handle, []);
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        this.handleError(error as Error);
      }
    }
  }

  /**
   * Navigate to a subfolder
   */
  async navigateToFolder(folderName: string): Promise<void> {
    if (!this.currentHandle) return;

    try {
      this.showLoading(true);

      const newHandle = await this.currentHandle.getDirectoryHandle(folderName);
      this.currentHandle = newHandle;
      this.pathStack.push(folderName);

      await this.loadCurrentFolder();

      // Notify listener
      this.onFolderChange?.(newHandle, [...this.pathStack]);
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Navigate to a path from breadcrumb
   */
  async navigateToPathIndex(index: number): Promise<void> {
    if (!this.rootHandle) return;

    try {
      this.showLoading(true);

      // Navigate back to root
      if (index === -1) {
        this.currentHandle = this.rootHandle;
        this.pathStack = [];
      } else {
        // Navigate to specific path
        let handle = this.rootHandle;
        const newPath: string[] = [];

        for (let i = 0; i <= index; i++) {
          handle = await handle.getDirectoryHandle(this.pathStack[i]);
          newPath.push(this.pathStack[i]);
        }

        this.currentHandle = handle;
        this.pathStack = newPath;
      }

      await this.loadCurrentFolder();

      // Notify listener
      if (this.currentHandle) {
        this.onFolderChange?.(this.currentHandle, [...this.pathStack]);
      }
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load subfolders from current folder
   */
  private async loadCurrentFolder(): Promise<void> {
    if (!this.currentHandle) return;

    try {
      this.showLoading(true);

      const folders: FolderEntry[] = [];

      // Iterate through directory entries
      for await (const [name, handle] of this.currentHandle.entries()) {
        if (handle.kind === 'directory') {
          folders.push({ name, handle: handle as FileSystemDirectoryHandle });
        }
      }

      // Sort folders alphabetically
      folders.sort((a, b) => a.name.localeCompare(b.name));

      this.renderFolderList(folders);
      this.renderBreadcrumb();
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Render the folder list
   */
  private renderFolderList(folders: FolderEntry[]): void {
    if (!this.folderList || !this.element) return;

    const emptyState = this.element.querySelector('.folder-browser-empty') as HTMLElement;
    const loadingEl = this.element.querySelector('.folder-browser-loading') as HTMLElement;

    // Always hide loading spinner when rendering
    if (loadingEl) loadingEl.hidden = true;

    if (folders.length === 0) {
      this.folderList.innerHTML = '';
      this.folderList.style.opacity = '1';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    this.folderList.innerHTML = folders.map(folder => `
      <li class="folder-list-item" role="option" data-folder="${this.escapeHtml(folder.name)}">
        <div class="folder-list-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/>
          </svg>
        </div>
        <span class="folder-list-item-name">${this.escapeHtml(folder.name)}</span>
        <div class="folder-list-item-arrow">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
          </svg>
        </div>
      </li>
    `).join('');

    // Bind click events to folder items
    this.folderList.querySelectorAll('.folder-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const folderName = (item as HTMLElement).dataset.folder;
        if (folderName) {
          this.navigateToFolder(folderName);
        }
      });
    });
  }

  /**
   * Render the breadcrumb navigation
   */
  private renderBreadcrumb(): void {
    if (!this.breadcrumbNav || !this.rootHandle) return;

    const breadcrumbList = this.breadcrumbNav.querySelector('.breadcrumb-list');
    if (!breadcrumbList) return;

    const items: string[] = [];

    // Root item
    items.push(`
      <li class="breadcrumb-item">
        <button class="breadcrumb-link" data-index="-1" type="button">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/>
          </svg>
          ${this.escapeHtml(this.rootHandle.name)}
        </button>
      </li>
    `);

    // Path items
    this.pathStack.forEach((name, index) => {
      const isLast = index === this.pathStack.length - 1;
      items.push(`
        <li class="breadcrumb-item">
          <span class="breadcrumb-separator">/</span>
          ${isLast
            ? `<span class="breadcrumb-current">${this.escapeHtml(name)}</span>`
            : `<button class="breadcrumb-link" data-index="${index}" type="button">${this.escapeHtml(name)}</button>`
          }
        </li>
      `);
    });

    breadcrumbList.innerHTML = items.join('');

    // Bind click events to breadcrumb links
    breadcrumbList.querySelectorAll('.breadcrumb-link').forEach(link => {
      link.addEventListener('click', () => {
        const index = parseInt((link as HTMLElement).dataset.index || '-1', 10);
        this.navigateToPathIndex(index);
      });
    });
  }

  /**
   * Show/hide loading state
   */
  private showLoading(loading: boolean): void {
    this._isLoading = loading;
    const loadingEl = this.element?.querySelector('.folder-browser-loading') as HTMLElement;
    const contentEl = this.folderList;

    if (loadingEl) loadingEl.hidden = !loading;
    if (contentEl) contentEl.style.opacity = loading ? '0.5' : '1';
  }

  /**
   * Show unsupported browser message
   */
  private showUnsupportedMessage(): void {
    this.element = document.createElement('div');
    this.element.className = 'folder-browser folder-browser-unsupported';
    this.element.innerHTML = `
      <div class="folder-browser-empty">
        <div class="folder-browser-empty-icon">
          <svg viewBox="0 0 24 24" width="32" height="32">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
          </svg>
        </div>
        <span class="folder-browser-empty-text">File System Access API not supported</span>
        <span class="folder-browser-empty-hint">Please use Chrome, Edge, or Opera</span>
      </div>
    `;
    this.container.appendChild(this.element);
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    console.error('[FolderBrowser] Error:', error);
    this.onError?.(error);
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
   * Initialize IndexedDB for handle persistence
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(IDB_NAME, 1);

      request.onerror = () => {
        console.warn('[FolderBrowser] IndexedDB not available');
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
    });
  }

  /**
   * Save folder handle to IndexedDB
   */
  private async saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(IDB_STORE, 'readwrite');
      const store = transaction.objectStore(IDB_STORE);
      const request = store.put(handle, IDB_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('[FolderBrowser] Failed to save handle');
        resolve();
      };
    });
  }

  /**
   * Restore saved folder handle from IndexedDB
   */
  private async restoreSavedHandle(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(IDB_STORE, 'readonly');
      const store = transaction.objectStore(IDB_STORE);
      const request = store.get(IDB_KEY);

      request.onsuccess = async () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        if (handle) {
          try {
            // Verify we still have permission
            const permission = await handle.queryPermission({ mode: 'read' });
            if (permission === 'granted') {
              this.rootHandle = handle;
              this.currentHandle = handle;
              this.pathStack = [];
              await this.loadCurrentFolder();

              // Notify listener about restored folder
              this.onFolderChange?.(handle, []);
            }
          } catch {
            // Permission denied or handle invalid
            console.log('[FolderBrowser] Saved handle no longer valid');
          }
        }
        resolve();
      };

      request.onerror = () => {
        console.warn('[FolderBrowser] Failed to restore handle');
        resolve();
      };
    });
  }

  /**
   * Get the current folder handle
   */
  getCurrentHandle(): FileSystemDirectoryHandle | null {
    return this.currentHandle;
  }

  /**
   * Get the root folder handle
   */
  getRootHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle;
  }

  /**
   * Get the current path stack
   */
  getPath(): string[] {
    return [...this.pathStack];
  }

  /**
   * Get the full path as string
   */
  getFullPath(): string {
    if (!this.rootHandle) return '';
    return [this.rootHandle.name, ...this.pathStack].join('/');
  }

  /**
   * Check if folder browser is ready (has a root handle)
   */
  isReady(): boolean {
    return this.rootHandle !== null;
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
    if (this.element && this.container.contains(this.element)) {
      this.container.removeChild(this.element);
    }

    this.element = null;
    this.selectButton = null;
    this.breadcrumbNav = null;
    this.folderList = null;
    this.rootHandle = null;
    this.currentHandle = null;
    this.pathStack = [];
    this.db?.close();
    this.db = null;
  }
}
