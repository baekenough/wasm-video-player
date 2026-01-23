/**
 * PanelResizer - Drag-to-resize panel width controller
 *
 * Enables resizing of left and right panels via drag handles.
 * Features:
 * - Smooth drag experience with cursor feedback
 * - Min/max width constraints
 * - Persistence via localStorage
 * - Double-click to reset to default size
 */

/**
 * Configuration for PanelResizer
 */
export interface PanelResizerConfig {
  /** Container element with the 3-column layout */
  container: HTMLElement;
  /** Minimum panel width in pixels */
  minWidth?: number;
  /** Maximum panel width in pixels */
  maxWidth?: number;
  /** Default panel width in pixels */
  defaultWidth?: number;
  /** LocalStorage key for persisting sizes */
  storageKey?: string;
  /** Callback when panel sizes change */
  onResize?: (leftWidth: number, rightWidth: number) => void;
}

/**
 * Stored panel sizes
 */
interface PanelSizes {
  leftWidth: number;
  rightWidth: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  minWidth: 150,
  maxWidth: 400,
  defaultWidth: 250,
  storageKey: 'wasm-video-player-panel-sizes',
};

/**
 * PanelResizer class
 */
export class PanelResizer {
  private readonly config: Required<Omit<PanelResizerConfig, 'onResize'>> & Pick<PanelResizerConfig, 'onResize'>;
  private readonly container: HTMLElement;

  // DOM elements
  private leftPanel: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private leftResizer: HTMLElement | null = null;
  private rightResizer: HTMLElement | null = null;

  // Current sizes
  private leftWidth: number;
  private rightWidth: number;

  // Drag state
  private isDragging = false;
  private activeResizer: 'left' | 'right' | null = null;
  private startX = 0;
  private startWidth = 0;

  // Bound event handlers
  private handleMouseMove: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;
  private handleTouchMove: (e: TouchEvent) => void;
  private handleTouchEnd: (e: TouchEvent) => void;

  constructor(config: PanelResizerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.container = config.container;

    // Initialize sizes from defaults
    this.leftWidth = this.config.defaultWidth;
    this.rightWidth = this.config.defaultWidth;

    // Bind event handlers
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleTouchMove = this.onTouchMove.bind(this);
    this.handleTouchEnd = this.onTouchEnd.bind(this);
  }

  /**
   * Initialize the panel resizer
   */
  init(): void {
    // Find panel elements
    this.leftPanel = this.container.querySelector('#panel-left') as HTMLElement;
    this.rightPanel = this.container.querySelector('#panel-right') as HTMLElement;
    this.leftResizer = this.container.querySelector('.panel-resizer-left') as HTMLElement;
    this.rightResizer = this.container.querySelector('.panel-resizer-right') as HTMLElement;

    if (!this.leftPanel || !this.rightPanel) {
      console.warn('[PanelResizer] Panel elements not found');
      return;
    }

    if (!this.leftResizer || !this.rightResizer) {
      console.warn('[PanelResizer] Resizer elements not found');
      return;
    }

    // Load saved sizes
    this.loadSizes();

    // Apply initial sizes
    this.applySize('left', this.leftWidth);
    this.applySize('right', this.rightWidth);

    // Setup event listeners
    this.setupEventListeners();

    console.log('[PanelResizer] Initialized');
  }

  /**
   * Setup event listeners for resizer handles
   */
  private setupEventListeners(): void {
    if (!this.leftResizer || !this.rightResizer) {
      return;
    }

    // Left resizer - mouse events
    this.leftResizer.addEventListener('mousedown', (e) => this.onMouseDown(e, 'left'));
    this.leftResizer.addEventListener('touchstart', (e) => this.onTouchStart(e, 'left'), { passive: false });
    this.leftResizer.addEventListener('dblclick', () => this.resetSize('left'));

    // Right resizer - mouse events
    this.rightResizer.addEventListener('mousedown', (e) => this.onMouseDown(e, 'right'));
    this.rightResizer.addEventListener('touchstart', (e) => this.onTouchStart(e, 'right'), { passive: false });
    this.rightResizer.addEventListener('dblclick', () => this.resetSize('right'));
  }

  /**
   * Handle mouse down on resizer
   */
  private onMouseDown(e: MouseEvent, side: 'left' | 'right'): void {
    e.preventDefault();
    this.startDrag(e.clientX, side);

    // Add global listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Handle touch start on resizer
   */
  private onTouchStart(e: TouchEvent, side: 'left' | 'right'): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    this.startDrag(touch.clientX, side);

    // Add global listeners
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * Start drag operation
   */
  private startDrag(clientX: number, side: 'left' | 'right'): void {
    this.isDragging = true;
    this.activeResizer = side;
    this.startX = clientX;
    this.startWidth = side === 'left' ? this.leftWidth : this.rightWidth;

    // Add dragging class for visual feedback
    document.body.classList.add('panel-resizing');

    // Set cursor style
    const resizer = side === 'left' ? this.leftResizer : this.rightResizer;
    resizer?.classList.add('active');
  }

  /**
   * Handle mouse move during drag
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.activeResizer) return;
    e.preventDefault();
    this.updateDrag(e.clientX);
  }

  /**
   * Handle touch move during drag
   */
  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || !this.activeResizer || e.touches.length !== 1) return;
    e.preventDefault();
    this.updateDrag(e.touches[0].clientX);
  }

  /**
   * Update drag position
   */
  private updateDrag(clientX: number): void {
    if (!this.activeResizer) return;

    const delta = this.activeResizer === 'left'
      ? clientX - this.startX
      : this.startX - clientX;

    const newWidth = Math.min(
      Math.max(this.startWidth + delta, this.config.minWidth),
      this.config.maxWidth
    );

    // Apply new size
    this.applySize(this.activeResizer, newWidth);

    // Update stored width
    if (this.activeResizer === 'left') {
      this.leftWidth = newWidth;
    } else {
      this.rightWidth = newWidth;
    }

    // Notify callback
    this.config.onResize?.(this.leftWidth, this.rightWidth);
  }

  /**
   * Handle mouse up - end drag
   */
  private onMouseUp(_e: MouseEvent): void {
    this.endDrag();

    // Remove global listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Handle touch end - end drag
   */
  private onTouchEnd(_e: TouchEvent): void {
    this.endDrag();

    // Remove global listeners
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * End drag operation
   */
  private endDrag(): void {
    if (!this.isDragging) return;

    // Remove dragging class
    document.body.classList.remove('panel-resizing');

    // Remove active class from resizer
    const resizer = this.activeResizer === 'left' ? this.leftResizer : this.rightResizer;
    resizer?.classList.remove('active');

    this.isDragging = false;
    this.activeResizer = null;

    // Save sizes to localStorage
    this.saveSizes();
  }

  /**
   * Apply size to panel
   */
  private applySize(side: 'left' | 'right', width: number): void {
    const panel = side === 'left' ? this.leftPanel : this.rightPanel;
    if (!panel) return;

    panel.style.width = `${width}px`;
    panel.style.minWidth = `${width}px`;
    panel.style.maxWidth = `${width}px`;

    // Update grid template
    this.updateGridTemplate();
  }

  /**
   * Update CSS grid template based on panel sizes
   */
  private updateGridTemplate(): void {
    // 5-column layout: left-panel, left-resizer, center, right-resizer, right-panel
    // Resizer columns are 8px fixed width
    this.container.style.gridTemplateColumns = `${this.leftWidth}px 8px 1fr 8px ${this.rightWidth}px`;
  }

  /**
   * Reset panel size to default
   */
  private resetSize(side: 'left' | 'right'): void {
    const defaultWidth = this.config.defaultWidth;

    if (side === 'left') {
      this.leftWidth = defaultWidth;
    } else {
      this.rightWidth = defaultWidth;
    }

    this.applySize(side, defaultWidth);
    this.saveSizes();

    // Notify callback
    this.config.onResize?.(this.leftWidth, this.rightWidth);

    console.log(`[PanelResizer] Reset ${side} panel to default width`);
  }

  /**
   * Load saved sizes from localStorage
   */
  private loadSizes(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const sizes: PanelSizes = JSON.parse(stored);

        // Validate and apply stored sizes
        if (typeof sizes.leftWidth === 'number' && sizes.leftWidth >= this.config.minWidth && sizes.leftWidth <= this.config.maxWidth) {
          this.leftWidth = sizes.leftWidth;
        }
        if (typeof sizes.rightWidth === 'number' && sizes.rightWidth >= this.config.minWidth && sizes.rightWidth <= this.config.maxWidth) {
          this.rightWidth = sizes.rightWidth;
        }

        console.log('[PanelResizer] Loaded saved sizes:', { left: this.leftWidth, right: this.rightWidth });
      }
    } catch (error) {
      console.warn('[PanelResizer] Failed to load saved sizes:', error);
    }
  }

  /**
   * Save current sizes to localStorage
   */
  private saveSizes(): void {
    try {
      const sizes: PanelSizes = {
        leftWidth: this.leftWidth,
        rightWidth: this.rightWidth,
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(sizes));
    } catch (error) {
      console.warn('[PanelResizer] Failed to save sizes:', error);
    }
  }

  /**
   * Get current panel sizes
   */
  getSizes(): PanelSizes {
    return {
      leftWidth: this.leftWidth,
      rightWidth: this.rightWidth,
    };
  }

  /**
   * Set panel sizes programmatically
   */
  setSizes(sizes: Partial<PanelSizes>): void {
    if (sizes.leftWidth !== undefined) {
      this.leftWidth = Math.min(Math.max(sizes.leftWidth, this.config.minWidth), this.config.maxWidth);
      this.applySize('left', this.leftWidth);
    }

    if (sizes.rightWidth !== undefined) {
      this.rightWidth = Math.min(Math.max(sizes.rightWidth, this.config.minWidth), this.config.maxWidth);
      this.applySize('right', this.rightWidth);
    }

    this.saveSizes();
    this.config.onResize?.(this.leftWidth, this.rightWidth);
  }

  /**
   * Reset both panels to default size
   */
  resetAllSizes(): void {
    this.leftWidth = this.config.defaultWidth;
    this.rightWidth = this.config.defaultWidth;

    this.applySize('left', this.leftWidth);
    this.applySize('right', this.rightWidth);

    this.saveSizes();
    this.config.onResize?.(this.leftWidth, this.rightWidth);

    console.log('[PanelResizer] Reset all panels to default width');
  }

  /**
   * Check if currently dragging
   */
  isDraggingActive(): boolean {
    return this.isDragging;
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);

    // Remove body class if still present
    document.body.classList.remove('panel-resizing');

    console.log('[PanelResizer] Disposed');
  }
}
