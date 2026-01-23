/**
 * WebCodecsDecoder - Browser-native video/audio decoding using Web Codecs API
 *
 * Uses the browser's built-in VideoDecoder and AudioDecoder APIs for
 * hardware-accelerated decoding of H.264, VP9, AAC, and Opus codecs.
 *
 * Requirements:
 * - Secure context (HTTPS or localhost)
 * - Browser support for Web Codecs API (Chrome 94+, Edge 94+)
 */

/**
 * Decoded video frame data
 */
export interface DecodedVideoFrame {
  frame: VideoFrame;
  timestamp: number;
  duration: number;
  keyframe: boolean;
}

/**
 * Decoded audio data
 */
export interface DecodedAudioData {
  data: AudioData;
  timestamp: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
}

/**
 * Decoder configuration
 */
export interface WebCodecsDecoderConfig {
  onVideoFrame?: (frame: DecodedVideoFrame) => void;
  onAudioData?: (data: DecodedAudioData) => void;
  onError?: (error: Error) => void;
}

/**
 * Video codec configuration for initialization
 */
export interface VideoCodecConfig {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  description?: Uint8Array;
  hardwareAcceleration?: HardwareAcceleration;
}

/**
 * Audio codec configuration for initialization
 */
export interface AudioCodecConfig {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  description?: Uint8Array;
}

/**
 * WebCodecsDecoder class
 *
 * Provides high-performance video and audio decoding using the
 * browser's native Web Codecs API.
 */
export class WebCodecsDecoder {
  private videoDecoder: VideoDecoder | null = null;
  private audioDecoder: AudioDecoder | null = null;
  private videoFrameQueue: DecodedVideoFrame[] = [];
  private audioDataQueue: DecodedAudioData[] = [];
  private readonly config: WebCodecsDecoderConfig;
  private videoInitialized: boolean = false;
  private audioInitialized: boolean = false;
  private pendingVideoFrames: number = 0;
  private pendingAudioFrames: number = 0;

  constructor(config: WebCodecsDecoderConfig = {}) {
    this.config = config;
  }

  /**
   * Check if Web Codecs API is supported in the current environment
   */
  static isSupported(): boolean {
    return (
      typeof VideoDecoder !== 'undefined' &&
      typeof AudioDecoder !== 'undefined' &&
      typeof EncodedVideoChunk !== 'undefined' &&
      typeof EncodedAudioChunk !== 'undefined'
    );
  }

  /**
   * Check if running in a secure context (required for Web Codecs)
   */
  static isSecureContext(): boolean {
    return globalThis.isSecureContext === true;
  }

  /**
   * Get a human-readable error message for unsupported environments
   */
  static getUnsupportedMessage(): string {
    if (!WebCodecsDecoder.isSecureContext()) {
      return 'Web Codecs API requires a secure context (HTTPS or localhost). Please access this page via HTTPS.';
    }
    if (!WebCodecsDecoder.isSupported()) {
      return 'Web Codecs API is not supported in this browser. Please use Chrome 94+ or Edge 94+.';
    }
    return '';
  }

  /**
   * Initialize the decoder and verify Web Codecs support
   * @returns true if initialization successful, false otherwise
   */
  async init(): Promise<boolean> {
    if (!WebCodecsDecoder.isSecureContext()) {
      console.error('Web Codecs requires secure context (HTTPS/localhost)');
      return false;
    }

    if (!WebCodecsDecoder.isSupported()) {
      console.error('Web Codecs API not supported in this browser');
      return false;
    }

    return true;
  }

  /**
   * Check if a specific video codec is supported
   */
  static async isVideoCodecSupported(codec: string): Promise<boolean> {
    if (!WebCodecsDecoder.isSupported()) {
      return false;
    }

    try {
      const support = await VideoDecoder.isConfigSupported({
        codec,
        codedWidth: 1920,
        codedHeight: 1080,
      });
      return support.supported === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific audio codec is supported
   */
  static async isAudioCodecSupported(codec: string): Promise<boolean> {
    if (!WebCodecsDecoder.isSupported()) {
      return false;
    }

    try {
      const support = await AudioDecoder.isConfigSupported({
        codec,
        sampleRate: 48000,
        numberOfChannels: 2,
      });
      return support.supported === true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the video decoder with codec configuration
   */
  async initVideoDecoder(codecConfig: VideoCodecConfig): Promise<void> {
    if (this.videoDecoder) {
      this.videoDecoder.close();
    }

    const decoderConfig: VideoDecoderConfig = {
      codec: codecConfig.codec,
      codedWidth: codecConfig.codedWidth,
      codedHeight: codecConfig.codedHeight,
      hardwareAcceleration: codecConfig.hardwareAcceleration ?? 'prefer-hardware',
    };

    if (codecConfig.description) {
      decoderConfig.description = codecConfig.description;
    }

    // Verify codec support
    const support = await VideoDecoder.isConfigSupported(decoderConfig);
    if (!support.supported) {
      throw new Error(`Video codec not supported: ${codecConfig.codec}`);
    }

    this.videoDecoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        this.pendingVideoFrames--;
        const decodedFrame: DecodedVideoFrame = {
          frame,
          timestamp: frame.timestamp ?? 0,
          duration: frame.duration ?? 0,
          keyframe: false, // Will be set from the chunk
        };

        if (this.config.onVideoFrame) {
          this.config.onVideoFrame(decodedFrame);
        } else {
          this.videoFrameQueue.push(decodedFrame);
        }
      },
      error: (error: DOMException) => {
        console.error('Video decoder error:', error);
        this.config.onError?.(new Error(`Video decoder error: ${error.message}`));
      },
    });

    this.videoDecoder.configure(decoderConfig);
    this.videoInitialized = true;
  }

  /**
   * Initialize the audio decoder with codec configuration
   */
  async initAudioDecoder(codecConfig: AudioCodecConfig): Promise<void> {
    if (this.audioDecoder) {
      this.audioDecoder.close();
    }

    const decoderConfig: AudioDecoderConfig = {
      codec: codecConfig.codec,
      sampleRate: codecConfig.sampleRate,
      numberOfChannels: codecConfig.numberOfChannels,
    };

    if (codecConfig.description) {
      decoderConfig.description = codecConfig.description;
    }

    // Verify codec support
    const support = await AudioDecoder.isConfigSupported(decoderConfig);
    if (!support.supported) {
      throw new Error(`Audio codec not supported: ${codecConfig.codec}`);
    }

    this.audioDecoder = new AudioDecoder({
      output: (audioData: AudioData) => {
        this.pendingAudioFrames--;
        const decoded: DecodedAudioData = {
          data: audioData,
          timestamp: audioData.timestamp,
          duration: audioData.duration,
          sampleRate: audioData.sampleRate,
          numberOfChannels: audioData.numberOfChannels,
        };

        if (this.config.onAudioData) {
          this.config.onAudioData(decoded);
        } else {
          this.audioDataQueue.push(decoded);
        }
      },
      error: (error: DOMException) => {
        console.error('Audio decoder error:', error);
        this.config.onError?.(new Error(`Audio decoder error: ${error.message}`));
      },
    });

    this.audioDecoder.configure(decoderConfig);
    this.audioInitialized = true;
  }

  /**
   * Decode a video chunk
   */
  async decodeVideo(chunk: EncodedVideoChunk): Promise<DecodedVideoFrame | null> {
    if (!this.videoDecoder || !this.videoInitialized) {
      throw new Error('Video decoder not initialized');
    }

    if (this.videoDecoder.state === 'closed') {
      throw new Error('Video decoder is closed');
    }

    this.pendingVideoFrames++;
    this.videoDecoder.decode(chunk);

    // If using callback mode, return null
    if (this.config.onVideoFrame) {
      return null;
    }

    // Wait for the frame to be decoded
    await this.videoDecoder.flush();

    // Return the first frame from the queue
    const frame = this.videoFrameQueue.shift();
    return frame ?? null;
  }

  /**
   * Decode an audio chunk
   */
  async decodeAudio(chunk: EncodedAudioChunk): Promise<DecodedAudioData | null> {
    if (!this.audioDecoder || !this.audioInitialized) {
      throw new Error('Audio decoder not initialized');
    }

    if (this.audioDecoder.state === 'closed') {
      throw new Error('Audio decoder is closed');
    }

    this.pendingAudioFrames++;
    this.audioDecoder.decode(chunk);

    // If using callback mode, return null
    if (this.config.onAudioData) {
      return null;
    }

    // Wait for the audio to be decoded
    await this.audioDecoder.flush();

    // Return the first audio data from the queue
    const audioData = this.audioDataQueue.shift();
    return audioData ?? null;
  }

  /**
   * Get the next video frame from the queue (for non-callback mode)
   */
  getNextVideoFrame(): DecodedVideoFrame | null {
    return this.videoFrameQueue.shift() ?? null;
  }

  /**
   * Get the next audio data from the queue (for non-callback mode)
   */
  getNextAudioData(): DecodedAudioData | null {
    return this.audioDataQueue.shift() ?? null;
  }

  /**
   * Get the number of queued video frames
   */
  getVideoQueueSize(): number {
    return this.videoFrameQueue.length;
  }

  /**
   * Get the number of queued audio samples
   */
  getAudioQueueSize(): number {
    return this.audioDataQueue.length;
  }

  /**
   * Get the number of pending video decode operations
   */
  getPendingVideoFrames(): number {
    return this.pendingVideoFrames;
  }

  /**
   * Get the number of pending audio decode operations
   */
  getPendingAudioFrames(): number {
    return this.pendingAudioFrames;
  }

  /**
   * Check if video decoder is initialized
   */
  isVideoInitialized(): boolean {
    return this.videoInitialized;
  }

  /**
   * Check if audio decoder is initialized
   */
  isAudioInitialized(): boolean {
    return this.audioInitialized;
  }

  /**
   * Flush the video decoder (wait for all pending frames)
   */
  async flushVideo(): Promise<void> {
    if (this.videoDecoder && this.videoDecoder.state !== 'closed') {
      await this.videoDecoder.flush();
    }
  }

  /**
   * Flush the audio decoder (wait for all pending samples)
   */
  async flushAudio(): Promise<void> {
    if (this.audioDecoder && this.audioDecoder.state !== 'closed') {
      await this.audioDecoder.flush();
    }
  }

  /**
   * Reset the video decoder state
   * After reset, the decoder is in 'unconfigured' state and must be reconfigured
   */
  resetVideo(): void {
    if (this.videoDecoder && this.videoDecoder.state !== 'closed') {
      this.videoDecoder.reset();
    }
    this.clearVideoQueue();
    this.pendingVideoFrames = 0;
    this.videoInitialized = false; // Decoder needs to be reconfigured after reset
  }

  /**
   * Reset the audio decoder state
   * After reset, the decoder is in 'unconfigured' state and must be reconfigured
   */
  resetAudio(): void {
    if (this.audioDecoder && this.audioDecoder.state !== 'closed') {
      this.audioDecoder.reset();
    }
    this.clearAudioQueue();
    this.pendingAudioFrames = 0;
    this.audioInitialized = false; // Decoder needs to be reconfigured after reset
  }

  /**
   * Clear the video frame queue and release resources
   */
  clearVideoQueue(): void {
    for (const item of this.videoFrameQueue) {
      item.frame.close();
    }
    this.videoFrameQueue = [];
  }

  /**
   * Clear the audio data queue and release resources
   */
  clearAudioQueue(): void {
    for (const item of this.audioDataQueue) {
      item.data.close();
    }
    this.audioDataQueue = [];
  }

  /**
   * Close all decoders and release resources
   */
  close(): void {
    this.clearVideoQueue();
    this.clearAudioQueue();

    if (this.videoDecoder) {
      if (this.videoDecoder.state !== 'closed') {
        this.videoDecoder.close();
      }
      this.videoDecoder = null;
    }

    if (this.audioDecoder) {
      if (this.audioDecoder.state !== 'closed') {
        this.audioDecoder.close();
      }
      this.audioDecoder = null;
    }

    this.videoInitialized = false;
    this.audioInitialized = false;
    this.pendingVideoFrames = 0;
    this.pendingAudioFrames = 0;
  }
}
