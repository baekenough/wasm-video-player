/**
 * FFmpegDecoder - Universal video format support using ffmpeg.wasm
 *
 * Enables playback of virtually any video format by transcoding to
 * a playable format (WebM/VP9 or MP4/H.264) using ffmpeg.wasm.
 *
 * Features:
 * - Supports MKV, AVI, MOV, WebM, FLV, WMV, and many more formats
 * - Progress callbacks for large file transcoding
 * - Memory-efficient frame extraction
 * - Automatic codec selection based on browser support
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * Transcoding progress information
 */
export interface TranscodeProgress {
  /** Current progress ratio (0-1) */
  ratio: number;
  /** Estimated time in seconds (from ffmpeg output) */
  time: number;
  /** Current processing speed (e.g., "2.5x") */
  speed: string;
  /** Current frame being processed */
  frame: number;
  /** Total duration of input video in seconds */
  duration: number;
}

/**
 * Frame extraction result
 */
export interface ExtractedFrame {
  /** RGBA pixel data */
  data: Uint8Array;
  /** Frame width */
  width: number;
  /** Frame height */
  height: number;
  /** Frame timestamp in seconds */
  timestamp: number;
  /** Frame index */
  index: number;
}

/**
 * FFmpeg decoder configuration
 */
export interface FFmpegDecoderConfig {
  /** Callback for transcoding progress updates */
  onProgress?: (progress: TranscodeProgress) => void;
  /** Callback for log messages */
  onLog?: (message: string) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Target output format ('webm' | 'mp4') - defaults to 'mp4' for wider support */
  outputFormat?: 'webm' | 'mp4';
  /** Video quality (crf value, lower = better quality, 18-28 recommended) */
  quality?: number;
  /** Maximum resolution (width) for transcoding - null for original */
  maxWidth?: number | null;
}

/**
 * Transcoded video result
 */
export interface TranscodedVideo {
  /** Transcoded video data */
  data: Uint8Array;
  /** Output format */
  format: string;
  /** Video width */
  width: number;
  /** Video height */
  height: number;
  /** Video duration in seconds */
  duration: number;
  /** Video codec */
  codec: string;
}

/**
 * Video metadata from probe
 */
export interface FFmpegVideoMetadata {
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  codec: string;
  audioCodec: string | null;
  sampleRate: number | null;
  channels: number | null;
  format: string;
}

/**
 * Supported input formats that ffmpeg.wasm can handle
 */
const SUPPORTED_INPUT_FORMATS = [
  // Container formats
  'mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'mpg', 'mpeg',
  'm4v', '3gp', '3g2', 'mts', 'm2ts', 'ts', 'vob', 'ogv', 'ogg',
  // Audio-only formats (for extraction)
  'mp3', 'aac', 'wav', 'flac', 'ogg', 'm4a', 'wma',
];

/**
 * FFmpegDecoder class
 *
 * Provides universal video format support through ffmpeg.wasm transcoding.
 * This enables playback of formats not natively supported by browsers.
 */
export class FFmpegDecoder {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;
  private loading: boolean = false;
  private readonly config: Required<FFmpegDecoderConfig>;
  private currentInputFile: string | null = null;
  private metadata: FFmpegVideoMetadata | null = null;
  private abortController: AbortController | null = null;

  constructor(config: FFmpegDecoderConfig = {}) {
    this.config = {
      onProgress: config.onProgress ?? (() => {}),
      onLog: config.onLog ?? (() => {}),
      onError: config.onError ?? (() => {}),
      outputFormat: config.outputFormat ?? 'mp4',
      quality: config.quality ?? 23,
      maxWidth: config.maxWidth ?? null,
    };
  }

  /**
   * Check if ffmpeg.wasm is supported in the current environment
   */
  static isSupported(): boolean {
    // ffmpeg.wasm requires SharedArrayBuffer which needs cross-origin isolation
    return (
      typeof SharedArrayBuffer !== 'undefined' &&
      typeof WebAssembly !== 'undefined'
    );
  }

  /**
   * Check if cross-origin isolation is properly configured
   */
  static isCrossOriginIsolated(): boolean {
    return globalThis.crossOriginIsolated === true;
  }

  /**
   * Get message for unsupported environments
   */
  static getUnsupportedMessage(): string {
    if (!FFmpegDecoder.isCrossOriginIsolated()) {
      return 'ffmpeg.wasm requires cross-origin isolation. Server must send headers: Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp';
    }
    if (typeof SharedArrayBuffer === 'undefined') {
      return 'ffmpeg.wasm requires SharedArrayBuffer support which is not available in this browser.';
    }
    if (typeof WebAssembly === 'undefined') {
      return 'WebAssembly is not supported in this browser.';
    }
    return '';
  }

  /**
   * Check if a file format is supported for input
   */
  static isFormatSupported(filename: string): boolean {
    // Remove query parameters first
    const cleanPath = filename.split('?')[0] ?? filename;
    const ext = cleanPath.split('.').pop()?.toLowerCase();
    if (!ext) return false;
    return SUPPORTED_INPUT_FORMATS.includes(ext);
  }

  /**
   * Get the file extension from a filename or URL
   */
  private static getFileExtension(source: string): string {
    const cleanPath = source.split('?')[0] ?? source;
    const ext = cleanPath.split('.').pop()?.toLowerCase() ?? '';
    return ext;
  }

  /**
   * Initialize ffmpeg.wasm
   * Loads the WASM binaries from CDN
   */
  async init(): Promise<boolean> {
    if (this.loaded) {
      return true;
    }

    if (this.loading) {
      // Wait for ongoing loading to complete
      return new Promise((resolve) => {
        const checkLoaded = setInterval(() => {
          if (!this.loading) {
            clearInterval(checkLoaded);
            resolve(this.loaded);
          }
        }, 100);
      });
    }

    this.loading = true;

    try {
      if (!FFmpegDecoder.isSupported()) {
        throw new Error(FFmpegDecoder.getUnsupportedMessage());
      }

      this.ffmpeg = new FFmpeg();

      // Set up logging
      this.ffmpeg.on('log', ({ message }) => {
        this.config.onLog(message);
        this.parseProgressFromLog(message);
      });

      // Load ffmpeg.wasm core from CDN
      // Using multi-threaded version for better performance
      const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });

      this.loaded = true;
      this.loading = false;
      console.info('FFmpeg.wasm initialized successfully');
      return true;
    } catch (error) {
      this.loading = false;
      this.loaded = false;
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError(err);
      console.error('Failed to initialize ffmpeg.wasm:', err);
      return false;
    }
  }

  /**
   * Parse progress information from ffmpeg log output
   */
  private parseProgressFromLog(message: string): void {
    // Example log: "frame=  120 fps= 30 q=28.0 size=    1024kB time=00:00:04.00 bitrate=2097.2kbits/s speed=2.5x"
    const frameMatch = message.match(/frame=\s*(\d+)/);
    const timeMatch = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    const speedMatch = message.match(/speed=\s*(\S+)/);

    if (timeMatch) {
      const hours = parseInt(timeMatch[1]!, 10);
      const minutes = parseInt(timeMatch[2]!, 10);
      const seconds = parseFloat(timeMatch[3]!);
      const currentTime = hours * 3600 + minutes * 60 + seconds;

      const duration = this.metadata?.duration ?? 0;
      const ratio = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

      this.config.onProgress({
        ratio,
        time: currentTime,
        speed: speedMatch?.[1] ?? '0x',
        frame: frameMatch ? parseInt(frameMatch[1]!, 10) : 0,
        duration,
      });
    }
  }

  /**
   * Check if ffmpeg is loaded and ready
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Load a video file into ffmpeg's virtual filesystem
   */
  async loadVideo(source: string | ArrayBuffer | File): Promise<FFmpegVideoMetadata> {
    this.ensureLoaded();

    // Generate input filename
    let inputName: string;
    let data: Uint8Array;

    if (source instanceof File) {
      inputName = `input.${FFmpegDecoder.getFileExtension(source.name) || 'mp4'}`;
      data = new Uint8Array(await source.arrayBuffer());
    } else if (source instanceof ArrayBuffer) {
      inputName = 'input.mp4'; // Default extension for ArrayBuffer
      data = new Uint8Array(source);
    } else if (typeof source === 'string') {
      inputName = `input.${FFmpegDecoder.getFileExtension(source) || 'mp4'}`;
      data = await fetchFile(source);
    } else {
      throw new Error('Invalid source type');
    }

    // Clean up previous input file
    if (this.currentInputFile) {
      try {
        await this.ffmpeg!.deleteFile(this.currentInputFile);
      } catch {
        // Ignore deletion errors
      }
    }

    // Write file to virtual filesystem
    await this.ffmpeg!.writeFile(inputName, data);
    this.currentInputFile = inputName;

    // Probe video metadata
    this.metadata = await this.probeVideo(inputName);
    return this.metadata;
  }

  /**
   * Probe video file to get metadata
   */
  private async probeVideo(inputFile: string): Promise<FFmpegVideoMetadata> {
    this.ensureLoaded();

    // Use ffprobe-like functionality through ffmpeg
    // We'll transcode a tiny portion to get metadata from logs
    const metadataLines: string[] = [];

    const originalLogHandler = this.config.onLog;
    this.config.onLog = (message) => {
      metadataLines.push(message);
      originalLogHandler(message);
    };

    try {
      // Run ffmpeg with -i flag only to get stream info (will "fail" but output metadata)
      await this.ffmpeg!.exec(['-i', inputFile, '-f', 'null', '-t', '0.001', '-']);
    } catch {
      // Expected to fail, but we capture the output
    }

    this.config.onLog = originalLogHandler;

    // Parse metadata from output
    return this.parseMetadata(metadataLines.join('\n'));
  }

  /**
   * Parse metadata from ffmpeg output
   */
  private parseMetadata(output: string): FFmpegVideoMetadata {
    const metadata: FFmpegVideoMetadata = {
      width: 0,
      height: 0,
      duration: 0,
      frameRate: 0,
      codec: 'unknown',
      audioCodec: null,
      sampleRate: null,
      channels: null,
      format: 'unknown',
    };

    // Parse duration: Duration: 00:01:30.50
    const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (durationMatch) {
      metadata.duration =
        parseInt(durationMatch[1]!, 10) * 3600 +
        parseInt(durationMatch[2]!, 10) * 60 +
        parseFloat(durationMatch[3]!);
    }

    // Parse video stream: Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps
    const videoMatch = output.match(/Stream.*Video:\s*(\w+).*?(\d+)x(\d+).*?(\d+(?:\.\d+)?)\s*(?:fps|tbr)/);
    if (videoMatch) {
      metadata.codec = videoMatch[1]!;
      metadata.width = parseInt(videoMatch[2]!, 10);
      metadata.height = parseInt(videoMatch[3]!, 10);
      metadata.frameRate = parseFloat(videoMatch[4]!);
    }

    // Alternative resolution parsing
    if (metadata.width === 0) {
      const resMatch = output.match(/(\d{2,5})x(\d{2,5})/);
      if (resMatch) {
        metadata.width = parseInt(resMatch[1]!, 10);
        metadata.height = parseInt(resMatch[2]!, 10);
      }
    }

    // Parse audio stream: Stream #0:1: Audio: aac, 48000 Hz, stereo
    const audioMatch = output.match(/Stream.*Audio:\s*(\w+).*?(\d+)\s*Hz.*?(mono|stereo|\d+\s*channels)/i);
    if (audioMatch) {
      metadata.audioCodec = audioMatch[1]!;
      metadata.sampleRate = parseInt(audioMatch[2]!, 10);
      const channelStr = audioMatch[3]!.toLowerCase();
      if (channelStr === 'mono') {
        metadata.channels = 1;
      } else if (channelStr === 'stereo') {
        metadata.channels = 2;
      } else {
        const chMatch = channelStr.match(/(\d+)/);
        metadata.channels = chMatch ? parseInt(chMatch[1]!, 10) : 2;
      }
    }

    // Parse format from Input line
    const formatMatch = output.match(/Input #0,\s*(\w+)/);
    if (formatMatch) {
      metadata.format = formatMatch[1]!;
    }

    return metadata;
  }

  /**
   * Transcode video to a browser-playable format
   */
  async transcode(): Promise<TranscodedVideo> {
    this.ensureLoaded();

    if (!this.currentInputFile || !this.metadata) {
      throw new Error('No video loaded. Call loadVideo() first.');
    }

    this.abortController = new AbortController();

    const outputFormat = this.config.outputFormat;
    const outputFile = `output.${outputFormat}`;

    // Build ffmpeg command
    const args: string[] = ['-i', this.currentInputFile];

    // Video codec based on output format
    if (outputFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9');
      args.push('-crf', this.config.quality.toString());
      args.push('-b:v', '0'); // Use CRF mode
      args.push('-c:a', 'libopus');
    } else {
      // MP4 with H.264
      args.push('-c:v', 'libx264');
      args.push('-crf', this.config.quality.toString());
      args.push('-preset', 'fast');
      args.push('-c:a', 'aac');
      args.push('-movflags', '+faststart'); // Enable streaming
    }

    // Resolution scaling if specified
    if (this.config.maxWidth && this.metadata.width > this.config.maxWidth) {
      args.push('-vf', `scale=${this.config.maxWidth}:-2`);
    }

    // Audio settings
    args.push('-ar', '48000'); // Sample rate
    args.push('-ac', '2'); // Stereo

    // Output file
    args.push('-y', outputFile);

    try {
      await this.ffmpeg!.exec(args);

      // Read output file
      const outputData = await this.ffmpeg!.readFile(outputFile);

      // Clean up output file
      await this.ffmpeg!.deleteFile(outputFile);

      // Calculate output dimensions
      let width = this.metadata.width;
      let height = this.metadata.height;

      if (this.config.maxWidth && width > this.config.maxWidth) {
        const scale = this.config.maxWidth / width;
        width = this.config.maxWidth;
        height = Math.round(height * scale);
        // Ensure even dimensions for video codecs
        height = height % 2 === 0 ? height : height + 1;
      }

      return {
        data: outputData as Uint8Array,
        format: outputFormat,
        width,
        height,
        duration: this.metadata.duration,
        codec: outputFormat === 'webm' ? 'vp9' : 'avc1.640028',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError(err);
      throw err;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Extract frames from the loaded video
   * Useful for thumbnail generation or frame-by-frame analysis
   */
  async extractFrames(options: {
    startTime?: number;
    endTime?: number;
    fps?: number;
    width?: number;
    maxFrames?: number;
  } = {}): Promise<ExtractedFrame[]> {
    this.ensureLoaded();

    if (!this.currentInputFile || !this.metadata) {
      throw new Error('No video loaded. Call loadVideo() first.');
    }

    const {
      startTime = 0,
      endTime = this.metadata.duration,
      fps = 1,
      width = this.metadata.width,
      maxFrames = 100,
    } = options;

    const frames: ExtractedFrame[] = [];
    const framePattern = 'frame_%05d.rgba';

    // Build ffmpeg command for frame extraction
    const args: string[] = [
      '-ss', startTime.toString(),
      '-i', this.currentInputFile,
      '-t', (endTime - startTime).toString(),
      '-vf', `fps=${fps},scale=${width}:-1,format=rgba`,
      '-frames:v', maxFrames.toString(),
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      framePattern,
    ];

    try {
      await this.ffmpeg!.exec(args);

      // Read extracted frames
      const calculatedHeight = Math.round((width / this.metadata.width) * this.metadata.height);
      const frameSize = width * calculatedHeight * 4; // RGBA = 4 bytes per pixel

      for (let i = 1; i <= maxFrames; i++) {
        const frameName = `frame_${String(i).padStart(5, '0')}.rgba`;
        try {
          const frameData = await this.ffmpeg!.readFile(frameName);
          const data = frameData as Uint8Array;

          if (data.length !== frameSize) {
            // Skip malformed frames
            continue;
          }

          frames.push({
            data,
            width,
            height: calculatedHeight,
            timestamp: startTime + (i - 1) / fps,
            index: i - 1,
          });

          // Clean up frame file
          await this.ffmpeg!.deleteFile(frameName);
        } catch {
          // No more frames
          break;
        }
      }

      return frames;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError(err);
      throw err;
    }
  }

  /**
   * Extract a single frame at a specific timestamp
   */
  async extractFrameAt(timestamp: number, width?: number): Promise<ExtractedFrame | null> {
    const frames = await this.extractFrames({
      startTime: timestamp,
      endTime: timestamp + 0.1,
      fps: 1,
      width: width ?? this.metadata?.width ?? 640,
      maxFrames: 1,
    });

    return frames[0] ?? null;
  }

  /**
   * Get the current video metadata
   */
  getMetadata(): FFmpegVideoMetadata | null {
    return this.metadata;
  }

  /**
   * Abort any ongoing transcoding operation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    // ffmpeg.wasm doesn't support abort directly, but we track the signal
    // for potential future use and cleanup
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.abort();

    if (this.currentInputFile && this.ffmpeg) {
      try {
        await this.ffmpeg.deleteFile(this.currentInputFile);
      } catch {
        // Ignore errors during cleanup
      }
    }

    this.ffmpeg = null;
    this.loaded = false;
    this.loading = false;
    this.currentInputFile = null;
    this.metadata = null;
  }

  /**
   * Ensure ffmpeg is loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded || !this.ffmpeg) {
      throw new Error('FFmpeg not initialized. Call init() first.');
    }
  }
}
