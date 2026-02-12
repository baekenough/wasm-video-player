/**
 * App - Main application class
 *
 * Integrates all player components including:
 * - Player (WASM decoding, WebGL rendering, audio)
 * - Controls (UI control bar)
 * - Settings (configuration management)
 * - SettingsPanel (settings UI)
 * - SubtitleManager (subtitle track management)
 * - SubtitleRenderer (canvas subtitle rendering)
 * - FileLoader (file input/drag-drop)
 * - KeyboardHandler (keyboard shortcuts)
 */

import { Player, PlayerState } from '@player/Player';
import { WasmBridge } from '@player/WasmBridge';
import { WebGLRenderer } from '@renderer/WebGLRenderer';
import { AudioPlayer } from '@player/AudioPlayer';
import { Controls } from '@ui/Controls';
import { FullscreenManager } from '@ui/FullscreenManager';
import { FileLoader } from '@ui/FileLoader';
import { LayoutManager, type PlaylistItem } from '@ui/LayoutManager';
import { TimelineThumbnails } from '@ui/TimelineThumbnails';
import { FolderBrowser, isFileSystemAccessSupported } from '@ui/FolderBrowser';
import { FileList } from '@ui/FileList';
import { PanelResizer } from '@ui/PanelResizer';
import { Settings, LocalStorageAdapter, SettingsPanel } from '@settings/index';
import { SubtitleManager, SubtitleRenderer } from '@subtitle/index';
import { KeyboardHandler, type KeyboardCallbacks } from '@input/KeyboardHandler';
import { getWatchHistory } from '@/storage/WatchHistory';
import { createLogger } from '@/utils/debug';

const log = createLogger({ module: 'App' });

/**
 * Application configuration
 */
export interface AppConfig {
  /** Container element ID */
  containerId: string;
  /** Video canvas ID */
  videoCanvasId: string;
  /** Subtitle canvas ID */
  subtitleCanvasId: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppConfig = {
  containerId: 'app',
  videoCanvasId: 'video-canvas',
  subtitleCanvasId: 'subtitle-canvas',
};

/**
 * Main application class
 */
export class App {
  private readonly config: AppConfig;
  private readonly container: HTMLElement;

  // Core components
  private player: Player | null = null;
  private wasmBridge: WasmBridge | null = null;
  private renderer: WebGLRenderer | null = null;
  private audioPlayer: AudioPlayer | null = null;

  // UI components
  private controls: Controls | null = null;
  private settingsPanel: SettingsPanel | null = null;
  private fullscreenManager: FullscreenManager | null = null;
  private fileLoader: FileLoader | null = null;

  // Settings
  private settings: Settings | null = null;
  private storageAdapter: LocalStorageAdapter | null = null;

  // Subtitle components
  private subtitleManager: SubtitleManager | null = null;
  private subtitleRenderer: SubtitleRenderer | null = null;

  // Input components
  private keyboardHandler: KeyboardHandler | null = null;

  // Layout components
  private layoutManager: LayoutManager | null = null;
  private timelineThumbnails: TimelineThumbnails | null = null;
  private folderBrowser: FolderBrowser | null = null;
  private fileList: FileList | null = null;
  private panelResizer: PanelResizer | null = null;

  // Playlist state
  private playlist: PlaylistItem[] = [];

  // Current video file for thumbnail generation (kept for potential future use)
  private _currentVideoFile: File | null = null;

  // Animation frame for update loop
  private animationFrameId: number | null = null;

  constructor(containerOrConfig: HTMLElement | Partial<AppConfig>) {
    if (containerOrConfig instanceof HTMLElement) {
      this.container = containerOrConfig;
      this.config = { ...DEFAULT_CONFIG };
    } else {
      this.config = { ...DEFAULT_CONFIG, ...containerOrConfig };
      const container = document.getElementById(this.config.containerId);
      if (!container) {
        throw new Error(`Container element "${this.config.containerId}" not found`);
      }
      this.container = container;
    }
  }

  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    try {
      // Initialize settings first
      await this.initSettings();

      // Initialize core components
      await this.initCoreComponents();

      // Initialize UI components
      this.initUIComponents();

      // Initialize layout manager
      this.initLayoutManager();

      // Initialize panel resizer
      this.initPanelResizer();

      // Initialize timeline thumbnails
      this.initTimelineThumbnails();

      // Initialize folder browser and file list
      await this.initFolderBrowser();

      // Initialize subtitle components
      this.initSubtitleComponents();

      // Initialize input handling
      this.initInputHandling();

      // Setup event listeners
      this.setupEventListeners();

      // Start update loop
      this.startUpdateLoop();

      log.info('WASM Video Player initialized successfully');
    } catch (error) {
      log.error('Failed to initialize WASM Video Player:', error);
      throw error;
    }
  }

  /**
   * Initialize settings system
   */
  private async initSettings(): Promise<void> {
    this.settings = new Settings();
    this.storageAdapter = new LocalStorageAdapter({ storageKey: 'wasm-video-player-settings' });
    this.settings.setStorageAdapter(this.storageAdapter);

    try {
      await this.settings.load();
    } catch (error) {
      log.warn('Failed to load saved settings, using defaults:', error);
    }
  }

  /**
   * Initialize core player components
   */
  private async initCoreComponents(): Promise<void> {
    const videoCanvas = document.getElementById(this.config.videoCanvasId) as HTMLCanvasElement;
    if (!videoCanvas) {
      throw new Error(`Video canvas "${this.config.videoCanvasId}" not found`);
    }

    // Initialize audio player FIRST (needed by WasmBridge)
    this.audioPlayer = new AudioPlayer();
    await this.audioPlayer.init(); // CRITICAL: Initialize AudioContext
    const audioSettings = this.settings?.get('audio');
    if (audioSettings) {
      this.audioPlayer.setVolume(audioSettings.volume);
      if (audioSettings.muted) {
        this.audioPlayer.mute();
      }
    }

    // Initialize WASM bridge with audio player
    this.wasmBridge = new WasmBridge({
      audioPlayer: this.audioPlayer,
    });
    await this.wasmBridge.init();

    // Initialize WebGL renderer
    this.renderer = new WebGLRenderer(videoCanvas);
    await this.renderer.init();

    // Create player instance
    this.player = new Player({
      wasmBridge: this.wasmBridge,
      renderer: this.renderer,
      audioPlayer: this.audioPlayer,
    });
  }

  /**
   * Initialize UI components
   */
  private initUIComponents(): void {
    if (!this.player || !this.settings) {
      return;
    }

    const videoContainer = this.container.querySelector('#video-container') as HTMLElement;
    if (!videoContainer) {
      log.warn('Video container not found, skipping UI initialization');
      return;
    }

    // Initialize controls
    this.controls = new Controls({
      player: this.player,
      container: videoContainer,
    });
    this.controls.init();

    // Initialize fullscreen manager
    this.fullscreenManager = new FullscreenManager({
      element: videoContainer,
    });
    this.fullscreenManager.init();

    // Initialize settings panel
    this.settingsPanel = new SettingsPanel({
      settings: this.settings,
      container: videoContainer,
    });
    this.settingsPanel.init();

    // Initialize file loader (drop zone with picker)
    this.fileLoader = new FileLoader({
      container: videoContainer,
      onFileSelected: async (file: File) => {
        await this.handleVideoFileSelected(file);
      },
      onError: (error) => {
        log.error('[FileLoader] Error:', error.message);
      },
    });

    // Show file loader on initial load
    this.fileLoader.show();
  }

  /**
   * Initialize layout manager for 3-column layout
   */
  private initLayoutManager(): void {
    this.layoutManager = new LayoutManager({
      container: this.container,
      onAddFile: () => {
        this.fileLoader?.show();
      },
      onLoadSubtitle: () => {
        this.showSubtitlePicker();
      },
      onOpenSettings: () => {
        this.settingsPanel?.toggle();
      },
      onToggleChange: (id, active) => {
        this.handleLayoutToggle(id, active);
      },
    });

    this.layoutManager.init();

    // Sync initial toggle states from settings
    const subtitleSettings = this.settings?.get('subtitle');
    const playbackSettings = this.settings?.get('playback');

    this.layoutManager.setToggleState('toggle-subtitles', subtitleSettings?.enabled ?? false);
    this.layoutManager.setToggleState('toggle-loop', playbackSettings?.loop ?? false);
    this.layoutManager.setToggleState('toggle-autoplay', playbackSettings?.autoPlay ?? true);

    // Listen for playlist events
    this.container.addEventListener('playlistselect', ((e: CustomEvent) => {
      this.handlePlaylistSelect(e.detail.id);
    }) as EventListener);

    this.container.addEventListener('playlistremove', ((e: CustomEvent) => {
      this.handlePlaylistRemove(e.detail.id);
    }) as EventListener);
  }

  /**
   * Handle layout toggle changes
   */
  private handleLayoutToggle(id: string, active: boolean): void {
    switch (id) {
      case 'toggle-subtitles':
        this.settings?.set('subtitle', 'enabled', active);
        break;
      case 'toggle-loop':
        this.settings?.set('playback', 'loop', active);
        if (this.player) {
          this.player.setLoop(active);
        }
        break;
      case 'toggle-autoplay':
        this.settings?.set('playback', 'autoPlay', active);
        break;
    }
  }

  /**
   * Show subtitle file picker
   */
  private showSubtitlePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.vtt,.ass,.ssa';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (file) {
        await this.loadSubtitleFile(file);
      }
    });
    input.click();
  }

  /**
   * Handle playlist item selection
   */
  private handlePlaylistSelect(id: string): void {
    const item = this.playlist.find(p => p.id === id);
    if (item) {
      // Mark as active
      this.playlist.forEach(p => p.active = p.id === id);
      this.layoutManager?.setPlaylist(this.playlist);
      // Note: Actual file loading would require storing file references
      log.debug('Selected playlist item:', item.name);
    }
  }

  /**
   * Handle playlist item removal
   */
  private handlePlaylistRemove(id: string): void {
    this.playlist = this.playlist.filter(p => p.id !== id);
    this.layoutManager?.setPlaylist(this.playlist);
  }

  /**
   * Add file to playlist
   */
  private addToPlaylist(file: File, duration?: number): void {
    const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const durationStr = duration ? LayoutManager.formatDuration(duration) : undefined;
    const item: PlaylistItem = {
      id,
      name: file.name,
      active: this.playlist.length === 0, // First item is active
    };

    // Only add duration if it exists
    if (durationStr) {
      item.duration = durationStr;
    }

    this.playlist.push(item);
    this.layoutManager?.setPlaylist(this.playlist);
  }

  /**
   * Initialize panel resizer for side panels
   */
  private initPanelResizer(): void {
    this.panelResizer = new PanelResizer({
      container: this.container,
      minWidth: 150,
      maxWidth: 400,
      defaultWidth: 250,
      storageKey: 'wasm-video-player-panel-sizes',
      onResize: (_leftWidth, _rightWidth) => {
        // Could dispatch resize events or update other components if needed
      },
    });

    this.panelResizer.init();
  }

  /**
   * Initialize timeline thumbnails
   */
  private initTimelineThumbnails(): void {
    const thumbnailContainer = this.container.querySelector('#timeline-thumbnails-container') as HTMLElement;
    if (!thumbnailContainer) {
      log.warn('Timeline thumbnails container not found');
      return;
    }

    this.timelineThumbnails = new TimelineThumbnails({
      container: thumbnailContainer,
      thumbnailWidth: 120,
      onSeek: (timestamp: number) => {
        // Seek to the thumbnail position (timestamp is already in seconds)
        this.player?.seek(timestamp);
      },
      onGenerationStart: () => {
        log.debug('Thumbnail generation started');
      },
      onGenerationComplete: () => {
        log.debug('Thumbnail generation completed');
      },
      onGenerationProgress: (current, total) => {
        log.debug(`Generating thumbnails: ${current}/${total}`);
      },
    });

    this.timelineThumbnails.init();
  }

  /**
   * Initialize folder browser and file list components
   */
  private async initFolderBrowser(): Promise<void> {
    // Check if File System Access API is supported
    if (!isFileSystemAccessSupported()) {
      log.warn('File System Access API not supported, folder browser will show fallback');
    }

    // Initialize folder browser
    const folderBrowserContainer = this.container.querySelector('#folder-browser-container') as HTMLElement;
    if (folderBrowserContainer) {
      this.folderBrowser = new FolderBrowser({
        container: folderBrowserContainer,
        onFolderChange: (handle, _path) => {
          // When folder changes, update file list
          this.fileList?.setFolder(handle);
        },
        onError: (error) => {
          log.error('[FolderBrowser] Error:', error.message);
        },
      });

      await this.folderBrowser.init();
    }

    // Initialize file list
    const fileListContainer = this.container.querySelector('#file-list-container') as HTMLElement;
    if (fileListContainer) {
      this.fileList = new FileList({
        container: fileListContainer,
        onFileSelect: async (file, _handle) => {
          await this.handleVideoFileSelected(file, true); // Auto-play when file is selected
          this.player?.play(); // Ensure playback starts
        },
        onPlayRequest: () => {
          // Start playback when FileList requests it
          this.player?.play();
        },
        onError: (error) => {
          log.error('[FileList] Error:', error.message);
        },
      });

      this.fileList.init();

      // If folder browser already has a folder, load it
      const currentHandle = this.folderBrowser?.getCurrentHandle();
      if (currentHandle) {
        await this.fileList.setFolder(currentHandle);
      }
    }
  }

  /**
   * Initialize subtitle components
   */
  private initSubtitleComponents(): void {
    const subtitleCanvas = document.getElementById(this.config.subtitleCanvasId) as HTMLCanvasElement;
    if (!subtitleCanvas) {
      log.warn('Subtitle canvas not found, skipping subtitle initialization');
      return;
    }

    this.subtitleManager = new SubtitleManager();

    const subtitleSettings = this.settings?.get('subtitle');
    this.subtitleRenderer = new SubtitleRenderer(subtitleCanvas, {
      fontSize: subtitleSettings?.fontSize ?? 32,
      color: subtitleSettings?.color ?? '#ffffff',
    });

    if (subtitleSettings?.timingOffset) {
      this.subtitleManager.setTimingOffset(subtitleSettings.timingOffset);
    }
  }

  /**
   * Initialize input handling
   */
  private initInputHandling(): void {
    if (!this.player || !this.settings) {
      return;
    }

    const videoContainer = this.container.querySelector('#video-container') as HTMLElement;
    if (!videoContainer) {
      return;
    }

    // Initialize keyboard handler
    const keyboardCallbacks: KeyboardCallbacks = {
      onSeekForward: (delta, _isLongSeek) => {
        const currentTime = this.player!.getCurrentTime();
        // Both delta and currentTime are in seconds
        log.debug('seekForward: currentTime=', currentTime, 'delta=', delta, 'target=', currentTime + delta);
        this.player!.seek(currentTime + delta);
      },
      onSeekBackward: (delta, _isLongSeek) => {
        const currentTime = this.player!.getCurrentTime();
        // Both delta and currentTime are in seconds
        log.debug('seekBackward: currentTime=', currentTime, 'delta=', delta, 'target=', currentTime - delta);
        this.player!.seek(currentTime - delta);
      },
      onVolumeUp: (delta) => {
        const currentVolume = this.player!.getVolume();
        this.player!.setVolume(Math.min(1, currentVolume + delta));
      },
      onVolumeDown: (delta) => {
        const currentVolume = this.player!.getVolume();
        this.player!.setVolume(Math.max(0, currentVolume - delta));
      },
      onTogglePlay: () => {
        const state = this.player!.getState();
        log.debug('onTogglePlay called, state:', state);
        if (state === PlayerState.Playing) {
          this.player!.pause();
        } else {
          this.player!.play().catch((err) => log.error('play() failed:', err));
        }
      },
      onToggleMute: () => {
        if (this.player!.isMuted()) {
          this.player!.unmute();
        } else {
          this.player!.mute();
        }
      },
      onToggleFullscreen: () => {
        this.fullscreenManager?.toggle();
      },
    };

    this.keyboardHandler = new KeyboardHandler({
      settings: this.settings.getAll(),
      callbacks: keyboardCallbacks,
    });
    // Attach to document for global keyboard handling
    this.keyboardHandler.attach(document.body);
  }

  /**
   * Handle video file selection from FileLoader
   * @param file The video file to load
   * @param autoPlayIfEnabled If true (default), auto-play based on settings. If false, skip auto-play.
   */
  private async handleVideoFileSelected(file: File, autoPlayIfEnabled: boolean = true): Promise<void> {
    if (!this.player) {
      return;
    }

    try {
      // Store the file for thumbnail generation
      this._currentVideoFile = file;

      const buffer = await file.arrayBuffer();
      await this.player.load(buffer);

      // Auto-play if enabled (only when autoPlayIfEnabled is true)
      if (autoPlayIfEnabled) {
        const playbackSettings = this.settings?.get('playback');
        if (playbackSettings?.autoPlay) {
          await this.player.play();
        }
      }

      // Hide file loader drop zone after successful load
      this.fileLoader?.hide();

      // Hide empty state
      const emptyState = this.container.querySelector('#empty-state') as HTMLElement;
      if (emptyState) {
        emptyState.style.display = 'none';
      }

      // Update layout with video info
      this.layoutManager?.setVideoTitle(file.name);

      // Update video info panel
      const duration = this.player?.getDuration() ?? 0;
      this.layoutManager?.setVideoInfo({
        duration: LayoutManager.formatDuration(duration),
        resolution: this.getVideoResolution(),
        codec: this.getVideoCodec(),
        bitrate: this.getVideoBitrate(),
      });

      // Add to playlist
      this.addToPlaylist(file, duration);

      // Add to watch history
      const watchHistory = getWatchHistory();
      watchHistory.addToHistory(file.name, 0, duration, file.size);

      // Generate timeline thumbnails
      await this.generateTimelineThumbnails(file);

      log.info('Video loaded:', file.name);
    } catch (error) {
      log.error('Failed to load video:', error);
    }
  }

  /**
   * Generate timeline thumbnails for the loaded video
   */
  private async generateTimelineThumbnails(file: File): Promise<void> {
    if (!this.timelineThumbnails) {
      return;
    }

    // Try FFmpeg first (higher quality, more format support)
    if (this.wasmBridge) {
      const ffmpegDecoder = this.wasmBridge.getFFmpegDecoder();
      if (ffmpegDecoder) {
        try {
          this.timelineThumbnails.clear();
          await this.timelineThumbnails.generateThumbnails(ffmpegDecoder, file);
          return;
        } catch (error) {
          log.warn('FFmpeg thumbnail generation failed, using fallback:', error);
        }
      }
    }

    // Fallback: use <video> element for thumbnail generation
    const duration = this.player?.getDuration() ?? 0;
    if (duration > 0) {
      try {
        this.timelineThumbnails.clear();
        await this.timelineThumbnails.generateThumbnailsFromVideoElement(file, duration);
      } catch (error) {
        log.error('Failed to generate timeline thumbnails:', error);
      }
    }
  }

  /**
   * Load a subtitle file
   */
  async loadSubtitleFile(file: File): Promise<void> {
    if (!this.subtitleManager) {
      return;
    }

    try {
      await this.subtitleManager.loadFile(file);
      log.info('Subtitle loaded:', file.name);
    } catch (error) {
      log.error('Failed to load subtitle:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.player || !this.settings) {
      return;
    }

    // Player state changes
    this.player.on('statechange', (data) => {
      const { newState } = data as { newState: PlayerState };
      // Update UI based on state
      if (this.controls) {
        if (newState === PlayerState.Playing) {
          this.controls.show();
        }
      }
    });

    // Player time updates - subtitle rendering is handled in update loop
    this.player.on('timeupdate', () => {
      // Time updates are processed in the animation frame loop
    });

    // Settings changes
    this.settings.subscribe((event) => {
      this.handleSettingsChange(event.section, event.key, event.newValue);
    });

    // Container click to toggle play
    const videoContainer = this.container.querySelector('#video-container') as HTMLElement;
    if (videoContainer) {
      videoContainer.addEventListener('click', (e) => {
        // Ignore clicks on controls or file loader
        if ((e.target as HTMLElement).closest('.control-bar, .settings-panel, .file-loader-dropzone')) {
          return;
        }

        if (this.player?.getState() === PlayerState.Playing) {
          this.player.pause();
        } else if (this.player?.getState() === PlayerState.Paused || this.player?.getState() === PlayerState.Ready) {
          this.player.play();
        }
      });
    }
  }

  /**
   * Handle settings changes
   */
  private handleSettingsChange(section: string, key: string, value: unknown): void {
    switch (section) {
      case 'subtitle':
        this.applySubtitleSettings(key, value);
        break;
      case 'audio':
        this.applyAudioSettings(key, value);
        break;
      case 'ui':
        this.applyUISettings(key, value);
        break;
    }

    // Save settings after change
    this.settings?.save().catch((err) => log.error('Failed to save settings:', err));
  }

  /**
   * Apply subtitle settings
   */
  private applySubtitleSettings(key: string, value: unknown): void {
    if (!this.subtitleRenderer || !this.subtitleManager) {
      return;
    }

    switch (key) {
      case 'fontSize':
        this.subtitleRenderer.setOptions({ fontSize: value as number });
        break;
      case 'color':
        this.subtitleRenderer.setOptions({ color: value as string });
        break;
      case 'timingOffset':
        this.subtitleManager.setTimingOffset(value as number);
        break;
    }
  }

  /**
   * Apply audio settings
   */
  private applyAudioSettings(key: string, value: unknown): void {
    if (!this.player) {
      return;
    }

    switch (key) {
      case 'volume':
        this.player.setVolume(value as number);
        break;
      case 'muted':
        if (value) {
          this.player.mute();
        } else {
          this.player.unmute();
        }
        break;
    }
  }

  /**
   * Apply UI settings
   */
  private applyUISettings(_key: string, _value: unknown): void {
    // UI settings are handled by individual components
  }

  /**
   * Start the update loop
   */
  private startUpdateLoop(): void {
    const loop = (): void => {
      this.update();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the update loop
   */
  private stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update loop - called every frame
   */
  private update(): void {
    // Update subtitle rendering
    this.updateSubtitles();

    // Update timeline thumbnails with current time
    this.updateTimelineThumbnails();
  }

  /**
   * Update timeline thumbnails current position
   */
  private updateTimelineThumbnails(): void {
    if (!this.timelineThumbnails || !this.player) {
      return;
    }

    // Get current time in seconds
    const currentTime = this.player.getCurrentTime();

    this.timelineThumbnails.setCurrentTime(currentTime);
  }

  /**
   * Update subtitle rendering
   */
  private updateSubtitles(): void {
    if (!this.subtitleManager || !this.subtitleRenderer || !this.player) {
      return;
    }

    // Check if subtitles are enabled
    const subtitleSettings = this.settings?.get('subtitle');
    if (!subtitleSettings?.enabled) {
      this.subtitleRenderer.clear();
      return;
    }

    // Get current playback time and render active subtitles
    const currentTime = this.player.getCurrentTime();
    const entries = this.subtitleManager.getActiveEntries(currentTime);
    this.subtitleRenderer.render(entries);
  }

  /**
   * Get video resolution string
   */
  private getVideoResolution(): string {
    if (!this.renderer) return '--';
    const canvas = this.renderer.getCanvas();
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return `${canvas.width}x${canvas.height}`;
    }
    return '--';
  }

  /**
   * Get video codec string
   */
  private getVideoCodec(): string {
    // This would come from the WASM decoder metadata
    // Placeholder for now
    return this.wasmBridge ? 'H.264' : '--';
  }

  /**
   * Get video bitrate string
   */
  private getVideoBitrate(): string {
    // This would come from the demuxer metadata
    // Placeholder for now
    return '--';
  }

  /**
   * Get the player instance
   */
  getPlayer(): Player | null {
    return this.player;
  }

  /**
   * Get the settings instance
   */
  getSettings(): Settings | null {
    return this.settings;
  }

  /**
   * Get the file loader instance
   */
  getFileLoader(): FileLoader | null {
    return this.fileLoader;
  }

  /**
   * Show file loader drop zone
   */
  showFilePicker(): void {
    this.fileLoader?.show();
  }

  /**
   * Toggle settings panel visibility
   */
  toggleSettings(): void {
    this.settingsPanel?.toggle();
  }

  /**
   * Get the layout manager instance
   */
  getLayoutManager(): LayoutManager | null {
    return this.layoutManager;
  }

  /**
   * Get the timeline thumbnails instance
   */
  getTimelineThumbnails(): TimelineThumbnails | null {
    return this.timelineThumbnails;
  }

  /**
   * Get the currently loaded video file
   */
  getCurrentVideoFile(): File | null {
    return this._currentVideoFile;
  }

  /**
   * Get the folder browser instance
   */
  getFolderBrowser(): FolderBrowser | null {
    return this.folderBrowser;
  }

  /**
   * Get the file list instance
   */
  getFileList(): FileList | null {
    return this.fileList;
  }

  /**
   * Get the panel resizer instance
   */
  getPanelResizer(): PanelResizer | null {
    return this.panelResizer;
  }

  /**
   * Update watch history progress for current video
   */
  updateWatchProgress(): void {
    if (!this.player || !this._currentVideoFile) {
      return;
    }

    const duration = this.player.getDuration();
    const currentTime = this.player.getCurrentTime();

    if (duration > 0) {
      const progress = currentTime / duration;
      const watchHistory = getWatchHistory();
      watchHistory.updateProgress(this._currentVideoFile.name, progress);

      // Also update file list if it's showing the same folder
      this.fileList?.updateProgress(this._currentVideoFile.name, progress, duration);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopUpdateLoop();

    // Dispose input handlers
    this.keyboardHandler?.detach();

    // Dispose layout manager
    this.layoutManager?.dispose();

    // Dispose panel resizer
    this.panelResizer?.dispose();

    // Dispose timeline thumbnails
    this.timelineThumbnails?.dispose();

    // Dispose folder browser and file list
    this.folderBrowser?.dispose();
    this.fileList?.dispose();

    // Dispose UI components
    this.fileLoader?.dispose();
    this.settingsPanel?.dispose();
    this.fullscreenManager?.dispose();
    this.controls?.dispose();

    // Dispose subtitle components
    this.subtitleRenderer?.dispose();

    // Dispose player
    this.player?.dispose();

    // Clear video file reference
    this._currentVideoFile = null;

    log.info('WASM Video Player disposed');
  }
}
