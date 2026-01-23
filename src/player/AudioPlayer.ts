/**
 * AudioPlayer - Web Audio API based audio playback
 *
 * Handles audio decoding, buffering, and synchronized playback.
 */

/**
 * Audio configuration
 */
export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bufferSize: number;
}

/**
 * Default audio configuration
 */
const defaultConfig: AudioConfig = {
  sampleRate: 48000,
  channels: 2,
  bufferSize: 4096,
};

/**
 * AudioPlayer class
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private volume: number = 1.0;
  private muted: boolean = false;
  private previousVolume: number = 1.0;
  private readonly config: AudioConfig;
  private initialized: boolean = false;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize the audio context
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error('Audio initialization failed');
    }
  }

  /**
   * Check if audio is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Pause audio playback
   */
  pause(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode = null;
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));

    if (!this.muted && this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Mute audio
   */
  mute(): void {
    if (this.muted) {
      return;
    }

    this.muted = true;
    this.previousVolume = this.volume;

    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  /**
   * Unmute audio
   */
  unmute(): void {
    if (!this.muted) {
      return;
    }

    this.muted = false;

    if (this.gainNode) {
      this.gainNode.gain.value = this.previousVolume;
    }
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Play audio buffer
   */
  playBuffer(audioData: Float32Array, startTime?: number): void {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('AudioPlayer not initialized');
    }

    // Create buffer
    const buffer = this.audioContext.createBuffer(
      this.config.channels,
      audioData.length / this.config.channels,
      this.config.sampleRate
    );

    // Fill buffer channels
    for (let channel = 0; channel < this.config.channels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = audioData[i * this.config.channels + channel]!;
      }
    }

    // Create and start source
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.connect(this.gainNode);
    this.sourceNode.start(startTime ?? 0);
  }

  /**
   * Get current audio time
   */
  getCurrentTime(): number {
    return this.audioContext?.currentTime ?? 0;
  }

  /**
   * Get audio context state
   */
  getState(): AudioContextState | null {
    return this.audioContext?.state ?? null;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.initialized = false;
  }
}
