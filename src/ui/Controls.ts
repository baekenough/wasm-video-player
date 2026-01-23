/**
 * Controls - Video player control bar with play/pause, progress, volume
 *
 * Manages visibility of the control bar with auto-hide functionality.
 * Shows on user interaction, hides after 3 seconds during playback.
 */

import type { Player } from '@player/Player';
import { PlayerState } from '@player/Player';
import { setButtonIcon } from '@/utils/icons';

/**
 * Auto-hide delay in milliseconds
 */
const AUTO_HIDE_DELAY = 3000;

/**
 * Controls configuration
 */
export interface ControlsConfig {
  player: Player;
  container: HTMLElement;
}

/**
 * Format time in mm:ss or hh:mm:ss format
 * @param seconds Time in seconds
 */
function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Controls class - manages the control bar with playback controls
 */
export class Controls {
  private readonly player: Player;
  private readonly container: HTMLElement;
  private controlBar: HTMLElement | null = null;
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isVisible: boolean = true;
  private boundHandleMouseMove: () => void;
  private boundHandleKeyDown: () => void;
  private boundHandleStateChange: (data: unknown) => void;
  private boundHandleTimeUpdate: (data: unknown) => void;
  private boundHandleDurationChange: (data: unknown) => void;
  private boundHandleVolumeChange: (data: unknown) => void;

  // Control elements
  private playPauseBtn: HTMLButtonElement | null = null;
  private progressBar: HTMLInputElement | null = null;
  private currentTimeEl: HTMLSpanElement | null = null;
  private durationEl: HTMLSpanElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  private muteBtn: HTMLButtonElement | null = null;

  // State
  private isDraggingProgress: boolean = false;

  constructor(config: ControlsConfig) {
    this.player = config.player;
    this.container = config.container;

    // Bind event handlers
    this.boundHandleMouseMove = this.handleUserActivity.bind(this);
    this.boundHandleKeyDown = this.handleUserActivity.bind(this);
    this.boundHandleStateChange = this.handleStateChange.bind(this);
    this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.boundHandleDurationChange = this.handleDurationChange.bind(this);
    this.boundHandleVolumeChange = this.handleVolumeChange.bind(this);
  }

  /**
   * Initialize the controls
   */
  init(): void {
    this.createControlBar();
    this.attachEventListeners();
    this.updatePlayPauseButton();
    this.updateDuration();
  }

  /**
   * Update duration display
   */
  private updateDuration(): void {
    const duration = this.player.getDuration();
    if (this.durationEl) {
      this.durationEl.textContent = duration > 0 ? formatTime(duration) : '0:00';
    }
  }

  /**
   * Create the control bar element with all controls
   */
  private createControlBar(): void {
    this.controlBar = document.createElement('div');
    this.controlBar.className = 'control-bar';

    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'control-progress-container';

    this.progressBar = document.createElement('input');
    this.progressBar.type = 'range';
    this.progressBar.className = 'control-progress';
    this.progressBar.min = '0';
    this.progressBar.max = '100';
    this.progressBar.value = '0';
    this.progressBar.step = '0.1';
    progressContainer.appendChild(this.progressBar);

    // Controls row
    const controlsRow = document.createElement('div');
    controlsRow.className = 'control-row';

    // Left controls (play/pause, time)
    const leftControls = document.createElement('div');
    leftControls.className = 'control-left';

    this.playPauseBtn = document.createElement('button');
    this.playPauseBtn.className = 'control-btn control-play-pause';
    setButtonIcon(this.playPauseBtn, 'play');
    leftControls.appendChild(this.playPauseBtn);

    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'control-time';
    this.currentTimeEl = document.createElement('span');
    this.currentTimeEl.className = 'control-current-time';
    this.currentTimeEl.textContent = '0:00';
    const timeSeparator = document.createElement('span');
    timeSeparator.textContent = ' / ';
    this.durationEl = document.createElement('span');
    this.durationEl.className = 'control-duration';
    this.durationEl.textContent = '0:00';
    timeDisplay.appendChild(this.currentTimeEl);
    timeDisplay.appendChild(timeSeparator);
    timeDisplay.appendChild(this.durationEl);
    leftControls.appendChild(timeDisplay);

    // Right controls (volume)
    const rightControls = document.createElement('div');
    rightControls.className = 'control-right';

    this.muteBtn = document.createElement('button');
    this.muteBtn.className = 'control-btn control-mute';
    setButtonIcon(this.muteBtn, 'volume-high');
    rightControls.appendChild(this.muteBtn);

    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.className = 'control-volume';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.value = '100';
    rightControls.appendChild(this.volumeSlider);

    controlsRow.appendChild(leftControls);
    controlsRow.appendChild(rightControls);

    this.controlBar.appendChild(progressContainer);
    this.controlBar.appendChild(controlsRow);
    this.container.appendChild(this.controlBar);

    // Setup control event listeners
    this.setupControlEvents();
  }

  /**
   * Setup event listeners for control elements
   */
  private setupControlEvents(): void {
    // Play/Pause button
    this.playPauseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlayPause();
    });

    // Progress bar
    this.progressBar?.addEventListener('input', () => {
      this.isDraggingProgress = true;
    });

    this.progressBar?.addEventListener('change', () => {
      const value = parseFloat(this.progressBar!.value);
      const duration = this.player.getDuration();
      const seekTime = (value / 100) * duration;
      this.player.seek(seekTime);
      this.isDraggingProgress = false;
    });

    // Volume slider
    this.volumeSlider?.addEventListener('input', () => {
      const value = parseFloat(this.volumeSlider!.value) / 100;
      this.player.setVolume(value);
      this.updateMuteButton();
    });

    // Mute button
    this.muteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.player.isMuted()) {
        this.player.unmute();
      } else {
        this.player.mute();
      }
      this.updateMuteButton();
    });
  }

  /**
   * Toggle play/pause
   */
  private togglePlayPause(): void {
    if (this.player.getState() === PlayerState.Playing) {
      this.player.pause();
    } else {
      this.player.play();
    }
  }

  /**
   * Update play/pause button icon
   */
  private updatePlayPauseButton(): void {
    if (!this.playPauseBtn) return;

    const isPlaying = this.player.getState() === PlayerState.Playing;
    setButtonIcon(this.playPauseBtn, isPlaying ? 'pause' : 'play');
  }

  /**
   * Update mute button icon
   */
  private updateMuteButton(): void {
    if (!this.muteBtn) return;

    const isMuted = this.player.isMuted();
    const volume = this.player.getVolume();

    if (isMuted || volume === 0) {
      setButtonIcon(this.muteBtn, 'volume-muted');
    } else if (volume < 0.5) {
      setButtonIcon(this.muteBtn, 'volume-medium');
    } else {
      setButtonIcon(this.muteBtn, 'volume-high');
    }
  }

  /**
   * Update progress bar and time display
   */
  private updateProgress(): void {
    if (this.isDraggingProgress) return;

    const currentTime = this.player.getCurrentTime();
    const duration = this.player.getDuration();

    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = formatTime(currentTime);
    }

    if (this.durationEl) {
      this.durationEl.textContent = formatTime(duration);
    }

    if (this.progressBar && duration > 0) {
      const progress = (currentTime / duration) * 100;
      this.progressBar.value = progress.toString();
    }
  }

  /**
   * Handle time update from player
   */
  private handleTimeUpdate(_data: unknown): void {
    this.updateProgress();
  }

  /**
   * Handle duration change from player
   */
  private handleDurationChange(_data: unknown): void {
    this.updateDuration();
  }

  /**
   * Handle volume change from player
   */
  private handleVolumeChange(data: unknown): void {
    const { volume } = data as { volume: number };
    if (this.volumeSlider && typeof volume === 'number') {
      this.volumeSlider.value = String(Math.round(volume * 100));
    }
    this.updateMuteButton();
  }

  /**
   * Attach event listeners for user activity detection
   */
  private attachEventListeners(): void {
    this.container.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('keydown', this.boundHandleKeyDown);
    this.player.on('statechange', this.boundHandleStateChange);
    this.player.on('timeupdate', this.boundHandleTimeUpdate);
    this.player.on('durationchange', this.boundHandleDurationChange);
    this.player.on('volumechange', this.boundHandleVolumeChange);
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    this.container.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    this.player.off('statechange', this.boundHandleStateChange);
    this.player.off('timeupdate', this.boundHandleTimeUpdate);
    this.player.off('durationchange', this.boundHandleDurationChange);
    this.player.off('volumechange', this.boundHandleVolumeChange);
  }

  /**
   * Handle user activity (mouse move or key press)
   */
  private handleUserActivity(): void {
    this.show();
    this.scheduleAutoHide();
  }

  /**
   * Handle player state changes
   */
  private handleStateChange(data: unknown): void {
    const { newState } = data as { newState: PlayerState };

    this.updatePlayPauseButton();

    if (newState === PlayerState.Playing) {
      this.scheduleAutoHide();
    } else {
      this.cancelAutoHide();
      this.show();
    }
  }

  /**
   * Schedule auto-hide if playing
   */
  private scheduleAutoHide(): void {
    this.cancelAutoHide();

    if (this.player.getState() === PlayerState.Playing) {
      this.hideTimeoutId = setTimeout(() => {
        this.hide();
      }, AUTO_HIDE_DELAY);
    }
  }

  /**
   * Cancel scheduled auto-hide
   */
  private cancelAutoHide(): void {
    if (this.hideTimeoutId !== null) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
  }

  /**
   * Show the control bar
   */
  show(): void {
    if (this.controlBar && !this.isVisible) {
      this.controlBar.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  /**
   * Hide the control bar
   */
  hide(): void {
    if (this.controlBar && this.isVisible) {
      this.controlBar.classList.add('hidden');
      this.isVisible = false;
    }
  }

  /**
   * Toggle control bar visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if control bar is visible
   */
  isControlBarVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get the control bar element
   */
  getControlBar(): HTMLElement | null {
    return this.controlBar;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cancelAutoHide();
    this.detachEventListeners();

    if (this.controlBar && this.container.contains(this.controlBar)) {
      this.container.removeChild(this.controlBar);
    }

    this.controlBar = null;
  }
}
