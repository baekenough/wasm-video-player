/**
 * Player - Main video player controller
 *
 * Manages playback state, coordinates between WASM decoder,
 * WebGL renderer, and audio player.
 */

import type { WasmBridge } from './WasmBridge';
import type { WebGLRenderer } from '@renderer/WebGLRenderer';
import type { AudioPlayer } from './AudioPlayer';

/**
 * Player state enumeration
 */
export enum PlayerState {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Playing = 'playing',
  Paused = 'paused',
  Seeking = 'seeking',
  Buffering = 'buffering',
  Error = 'error',
}

/**
 * Player configuration
 */
export interface PlayerConfig {
  wasmBridge: WasmBridge;
  renderer: WebGLRenderer;
  audioPlayer: AudioPlayer;
}

/**
 * Player event types
 */
export type PlayerEventType =
  | 'statechange'
  | 'timeupdate'
  | 'durationchange'
  | 'volumechange'
  | 'error';

/**
 * Player event listener
 */
export type PlayerEventListener = (data: unknown) => void;

/**
 * Main Player class
 */
export class Player {
  private state: PlayerState = PlayerState.Idle;
  private readonly wasmBridge: WasmBridge;
  private readonly renderer: WebGLRenderer;
  private readonly audioPlayer: AudioPlayer;
  private currentTime: number = 0;
  private duration: number = 0;
  private loop: boolean = false;
  private readonly eventListeners: Map<PlayerEventType, Set<PlayerEventListener>> = new Map();

  constructor(config: PlayerConfig) {
    this.wasmBridge = config.wasmBridge;
    this.renderer = config.renderer;
    this.audioPlayer = config.audioPlayer;
  }

  /**
   * Get current player state
   */
  getState(): PlayerState {
    return this.state;
  }

  /**
   * Transition to a new state
   */
  private setState(newState: PlayerState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('statechange', { oldState, newState });
  }

  /**
   * Load a video file
   */
  async load(source: string | ArrayBuffer): Promise<void> {
    // Stop any existing playback before loading new video
    this.stopPlaybackLoop();
    this.currentTime = 0;
    this.duration = 0;

    this.setState(PlayerState.Loading);

    try {
      await this.wasmBridge.loadVideo(source);
      const metadata = this.wasmBridge.getMetadata();
      if (metadata) {
        this.duration = metadata.duration;
        this.emit('durationchange', { duration: this.duration });
      }
      this.setState(PlayerState.Ready);
    } catch (error) {
      this.setState(PlayerState.Error);
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Start or resume playback
   */
  async play(): Promise<void> {
    if (this.state === PlayerState.Idle) {
      throw new Error('No video loaded');
    }

    if (this.state === PlayerState.Playing) {
      return;
    }

    // Check if samples need to be reloaded (after seek or exhaustion)
    if (this.wasmBridge.needsSampleReload()) {
      await this.wasmBridge.reloadSamples(this.currentTime);
    }

    this.setState(PlayerState.Playing);
    await this.audioPlayer.resume();
    this.startPlaybackLoop();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.state !== PlayerState.Playing) {
      return;
    }

    this.setState(PlayerState.Paused);
    this.audioPlayer.pause();
    this.stopPlaybackLoop();
  }

  /**
   * Seek to a specific time
   */
  async seek(time: number): Promise<void> {
    if (this.state === PlayerState.Idle) {
      throw new Error('No video loaded');
    }

    // Clamp time to valid range [0, duration]
    const clampedTime = Math.max(0, Math.min(time, this.duration));

    const wasPlaying = this.state === PlayerState.Playing;

    // CRITICAL: Stop playback loop before seeking to prevent race conditions
    this.stopPlaybackLoop();
    this.setState(PlayerState.Seeking);

    try {
      await this.wasmBridge.seek(clampedTime);
      this.currentTime = clampedTime;
      this.emit('timeupdate', { currentTime: this.currentTime });

      if (wasPlaying) {
        this.setState(PlayerState.Playing);
        this.startPlaybackLoop();
      } else {
        this.setState(PlayerState.Paused);
      }
    } catch (error) {
      this.setState(PlayerState.Error);
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Stop playback and reset
   */
  stop(): void {
    this.stopPlaybackLoop();
    this.currentTime = 0;
    this.setState(PlayerState.Ready);
    this.emit('timeupdate', { currentTime: 0 });
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Get video duration
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audioPlayer.setVolume(clampedVolume);
    this.emit('volumechange', { volume: clampedVolume });
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.audioPlayer.getVolume();
  }

  /**
   * Mute audio
   */
  mute(): void {
    this.audioPlayer.mute();
    this.emit('volumechange', { volume: 0, muted: true });
  }

  /**
   * Unmute audio
   */
  unmute(): void {
    this.audioPlayer.unmute();
    this.emit('volumechange', { volume: this.audioPlayer.getVolume(), muted: false });
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.audioPlayer.isMuted();
  }

  /**
   * Set loop mode
   */
  setLoop(enabled: boolean): void {
    this.loop = enabled;
  }

  /**
   * Get loop mode
   */
  isLoop(): boolean {
    return this.loop;
  }

  /**
   * Add event listener
   */
  on(event: PlayerEventType, listener: PlayerEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: PlayerEventType, listener: PlayerEventListener): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * Emit event
   */
  private emit(event: PlayerEventType, data: unknown): void {
    this.eventListeners.get(event)?.forEach((listener) => listener(data));
  }

  /**
   * Playback loop handle
   */
  private animationFrameId: number | null = null;

  /**
   * Start the playback loop
   */
  private startPlaybackLoop(): void {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    const loop = (_timestamp: number): void => {
      if (this.state !== PlayerState.Playing) {
        this.animationFrameId = null;
        return;
      }

      // Try to decode and render frames
      // WebCodecs decodes asynchronously, so we try multiple times per frame
      let frameRendered = false;
      const maxDecodesPerFrame = 3;

      for (let i = 0; i < maxDecodesPerFrame && !frameRendered; i++) {
        const frame = this.wasmBridge.decodeFrame();
        if (frame) {
          this.renderer.render(frame);
          this.currentTime = frame.timestamp;
          this.emit('timeupdate', { currentTime: this.currentTime });
          frameRendered = true;
        }
      }

      // Check for end of video
      if (this.duration > 0 && this.currentTime >= this.duration) {
        if (this.loop) {
          // Loop: seek to beginning and continue playing
          this.currentTime = 0;
          this.wasmBridge.seek(0).catch(console.error);
        } else {
          this.stop();
          return;
        }
      }

      // Continue loop - even if no frame was rendered, keep trying
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the playback loop
   */
  private stopPlaybackLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopPlaybackLoop();
    this.renderer.dispose();
    this.audioPlayer.dispose();
    this.eventListeners.clear();
    this.setState(PlayerState.Idle);
  }
}
