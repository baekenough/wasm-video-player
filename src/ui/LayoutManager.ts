/**
 * LayoutManager - Handles 3-column layout interactions
 *
 * Manages:
 * - Panel collapse/expand on tablet
 * - Mobile navigation drawer
 * - Responsive panel visibility
 * - Panel overlay for modal-like behavior
 */

export interface LayoutManagerOptions {
  /** Container element */
  container: HTMLElement;
  /** Callback when video file is added */
  onAddFile?: () => void;
  /** Callback when subtitle file is requested */
  onLoadSubtitle?: () => void;
  /** Callback when settings is requested */
  onOpenSettings?: () => void;
  /** Callback when toggle state changes */
  onToggleChange?: (id: string, active: boolean) => void;
}

export interface VideoInfo {
  resolution: string;
  duration: string;
  codec: string;
  bitrate: string;
}

export interface PlaylistItem {
  id: string;
  name: string;
  duration?: string;
  active?: boolean;
}

/**
 * Layout manager for 3-column responsive layout
 */
export class LayoutManager {
  private readonly container: HTMLElement;
  private readonly options: LayoutManagerOptions;

  // Panel elements
  private leftPanel: HTMLElement | null = null;
  private rightPanel: HTMLElement | null = null;
  private panelOverlay: HTMLElement | null = null;

  // Mobile navigation
  private mobileNav: HTMLElement | null = null;

  // Content elements
  private playlistContainer: HTMLElement | null = null;
  private videoTitle: HTMLElement | null = null;
  private videoInfo: Map<string, HTMLElement> = new Map();
  private toggleSwitches: Map<string, HTMLElement> = new Map();

  // State
  private expandedPanel: 'left' | 'right' | null = null;
  private isMobile = false;

  constructor(options: LayoutManagerOptions) {
    this.container = options.container;
    this.options = options;
  }

  /**
   * Initialize the layout manager
   */
  init(): void {
    this.cacheElements();
    this.bindEvents();
    this.checkResponsive();
  }

  /**
   * Cache DOM element references
   */
  private cacheElements(): void {
    this.leftPanel = this.container.querySelector('#panel-left');
    this.rightPanel = this.container.querySelector('#panel-right');
    this.panelOverlay = this.container.querySelector('#panel-overlay');
    this.mobileNav = this.container.querySelector('.mobile-nav');
    this.playlistContainer = this.container.querySelector('#playlist-container');
    this.videoTitle = this.container.querySelector('#video-title');

    // Cache video info elements
    const infoIds = ['resolution', 'duration', 'codec', 'bitrate'];
    infoIds.forEach(id => {
      const el = this.container.querySelector(`#info-${id}`);
      if (el) this.videoInfo.set(id, el as HTMLElement);
    });

    // Cache toggle switches
    const toggleIds = ['toggle-subtitles', 'toggle-loop', 'toggle-autoplay'];
    toggleIds.forEach(id => {
      const el = this.container.querySelector(`#${id}`);
      if (el) this.toggleSwitches.set(id, el as HTMLElement);
    });
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    // Panel toggle buttons
    const leftToggle = this.leftPanel?.querySelector('.panel-toggle');
    const rightToggle = this.rightPanel?.querySelector('.panel-toggle');

    leftToggle?.addEventListener('click', () => this.togglePanel('left'));
    rightToggle?.addEventListener('click', () => this.togglePanel('right'));

    // Panel overlay click to close
    this.panelOverlay?.addEventListener('click', () => this.closeExpandedPanel());

    // Mobile navigation
    this.mobileNav?.querySelectorAll('.mobile-nav-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const panel = (e.currentTarget as HTMLElement).dataset.panel;
        if (panel) this.handleMobileNav(panel as 'left' | 'center' | 'right');
      });
    });

    // Add file button
    const addFileBtn = this.container.querySelector('#add-file-btn');
    addFileBtn?.addEventListener('click', () => this.options.onAddFile?.());

    // Load subtitle button
    const loadSubtitleBtn = this.container.querySelector('#btn-load-subtitle');
    loadSubtitleBtn?.addEventListener('click', () => this.options.onLoadSubtitle?.());

    // Settings button
    const settingsBtn = this.container.querySelector('#btn-settings');
    settingsBtn?.addEventListener('click', () => this.options.onOpenSettings?.());

    // Toggle switches
    this.toggleSwitches.forEach((el, id) => {
      el.addEventListener('click', () => {
        const isActive = el.classList.toggle('active');
        this.options.onToggleChange?.(id, isActive);
      });
    });

    // Window resize
    window.addEventListener('resize', () => this.checkResponsive());

    // Escape key to close panels
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.expandedPanel) {
        this.closeExpandedPanel();
      }
    });
  }

  /**
   * Check and update responsive state
   */
  private checkResponsive(): void {
    const width = window.innerWidth;
    const wasMobile = this.isMobile;

    this.isMobile = width < 768;

    // Close expanded panel when switching modes
    if (wasMobile !== this.isMobile && this.expandedPanel) {
      this.closeExpandedPanel();
    }
  }

  /**
   * Toggle panel expand/collapse (tablet mode)
   */
  togglePanel(panel: 'left' | 'right'): void {
    if (this.expandedPanel === panel) {
      this.closeExpandedPanel();
    } else {
      this.expandPanel(panel);
    }
  }

  /**
   * Expand a panel
   */
  private expandPanel(panel: 'left' | 'right'): void {
    // Close any currently expanded panel
    if (this.expandedPanel) {
      this.closeExpandedPanel();
    }

    const panelEl = panel === 'left' ? this.leftPanel : this.rightPanel;
    if (!panelEl) return;

    panelEl.classList.add('expanded');
    this.panelOverlay?.classList.add('visible');
    this.expandedPanel = panel;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close expanded panel
   */
  closeExpandedPanel(): void {
    if (!this.expandedPanel) return;

    const panelEl = this.expandedPanel === 'left' ? this.leftPanel : this.rightPanel;
    panelEl?.classList.remove('expanded');
    this.panelOverlay?.classList.remove('visible');
    this.expandedPanel = null;

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Handle mobile navigation
   */
  private handleMobileNav(panel: 'left' | 'center' | 'right'): void {
    // Update active state
    this.mobileNav?.querySelectorAll('.mobile-nav-button').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.panel === panel);
    });

    if (panel === 'center') {
      this.closeExpandedPanel();
    } else {
      this.expandPanel(panel);
    }
  }

  /**
   * Update video title
   */
  setVideoTitle(title: string): void {
    if (this.videoTitle) {
      this.videoTitle.textContent = title || 'No video loaded';
    }
  }

  /**
   * Update video info
   */
  setVideoInfo(info: Partial<VideoInfo>): void {
    Object.entries(info).forEach(([key, value]) => {
      const el = this.videoInfo.get(key);
      if (el) {
        el.textContent = value || '--';
      }
    });
  }

  /**
   * Clear video info
   */
  clearVideoInfo(): void {
    this.videoInfo.forEach(el => {
      el.textContent = '--';
    });
    this.setVideoTitle('No video loaded');
  }

  /**
   * Set toggle switch state
   */
  setToggleState(id: string, active: boolean): void {
    const el = this.toggleSwitches.get(id);
    if (el) {
      el.classList.toggle('active', active);
    }
  }

  /**
   * Get toggle switch state
   */
  getToggleState(id: string): boolean {
    const el = this.toggleSwitches.get(id);
    return el?.classList.contains('active') ?? false;
  }

  /**
   * Update playlist
   */
  setPlaylist(items: PlaylistItem[]): void {
    if (!this.playlistContainer) return;

    if (items.length === 0) {
      this.playlistContainer.innerHTML = `
        <div class="panel-empty">
          <div class="panel-empty-icon">
            <svg viewBox="0 0 24 24"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>
          </div>
          <span class="panel-empty-text">No files in playlist</span>
        </div>
      `;
      return;
    }

    const listHtml = items.map(item => `
      <li class="playlist-item${item.active ? ' active' : ''}" data-id="${item.id}">
        <div class="playlist-item-icon">
          <svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" fill="currentColor"/></svg>
        </div>
        <div class="playlist-item-info">
          <span class="playlist-item-name">${this.escapeHtml(item.name)}</span>
          ${item.duration ? `<span class="playlist-item-duration">${item.duration}</span>` : ''}
        </div>
        <button class="playlist-item-remove" aria-label="Remove from playlist">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
        </button>
      </li>
    `).join('');

    this.playlistContainer.innerHTML = `<ul class="playlist">${listHtml}</ul>`;

    // Bind playlist item events
    this.playlistContainer.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.playlist-item-remove')) {
          return; // Handled separately
        }
        const id = (item as HTMLElement).dataset.id;
        if (id) this.handlePlaylistItemClick(id);
      });

      const removeBtn = item.querySelector('.playlist-item-remove');
      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (item as HTMLElement).dataset.id;
        if (id) this.handlePlaylistItemRemove(id);
      });
    });
  }

  /**
   * Handle playlist item click
   */
  private handlePlaylistItemClick(id: string): void {
    // Dispatch custom event for playlist selection
    this.container.dispatchEvent(new CustomEvent('playlistselect', {
      detail: { id },
      bubbles: true,
    }));
  }

  /**
   * Handle playlist item remove
   */
  private handlePlaylistItemRemove(id: string): void {
    // Dispatch custom event for playlist removal
    this.container.dispatchEvent(new CustomEvent('playlistremove', {
      detail: { id },
      bubbles: true,
    }));
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
   * Format duration in seconds to MM:SS or HH:MM:SS
   */
  static formatDuration(seconds: number): string {
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
   * Format bitrate in bps to human readable
   */
  static formatBitrate(bps: number): string {
    if (!isFinite(bps) || bps < 0) return '--';

    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(1)} Mbps`;
    }
    if (bps >= 1000) {
      return `${(bps / 1000).toFixed(0)} Kbps`;
    }
    return `${bps} bps`;
  }

  /**
   * Dispose the layout manager
   */
  dispose(): void {
    this.closeExpandedPanel();
    // Event listeners are automatically cleaned up when elements are removed
  }
}
