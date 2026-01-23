/**
 * Demuxer - MP4 container parsing using mp4box.js
 *
 * Extracts video and audio tracks from MP4 files and creates
 * EncodedVideoChunk/EncodedAudioChunk for Web Codecs API.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - mp4box doesn't have proper TypeScript definitions
import MP4Box, { type ISOFile, type MP4ArrayBuffer, type MP4Info, type Sample, type Track } from 'mp4box';

/**
 * Video track information extracted from MP4
 */
export interface VideoTrackInfo {
  id: number;
  codec: string;
  codedWidth: number;
  codedHeight: number;
  displayWidth: number;
  displayHeight: number;
  frameRate: number;
  duration: number;
  description: Uint8Array | undefined;
}

/**
 * Audio track information extracted from MP4
 */
export interface AudioTrackInfo {
  id: number;
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  duration: number;
  description: Uint8Array | undefined;
}

/**
 * Demuxed video sample
 */
export interface VideoSample {
  data: Uint8Array;
  timestamp: number;
  duration: number;
  keyframe: boolean;
}

/**
 * Demuxed audio sample
 */
export interface AudioSample {
  data: Uint8Array;
  timestamp: number;
  duration: number;
}

/**
 * Demuxer configuration
 */
export interface DemuxerConfig {
  onVideoTrack?: (track: VideoTrackInfo) => void;
  onAudioTrack?: (track: AudioTrackInfo) => void;
  onVideoSample?: (sample: VideoSample) => void;
  onAudioSample?: (sample: AudioSample) => void;
  onReady?: (info: MediaInfo) => void;
  onError?: (error: Error) => void;
}

/**
 * Media information
 */
export interface MediaInfo {
  duration: number;
  timescale: number;
  isFragmented: boolean;
  videoTracks: VideoTrackInfo[];
  audioTracks: AudioTrackInfo[];
}

/**
 * Map mp4box codec string to Web Codecs codec string
 */
function mapVideoCodec(codecString: string): string {
  // H.264 / AVC
  if (codecString.startsWith('avc1') || codecString.startsWith('avc3')) {
    return codecString;
  }
  // H.265 / HEVC
  if (codecString.startsWith('hev1') || codecString.startsWith('hvc1')) {
    return codecString;
  }
  // VP9
  if (codecString.startsWith('vp09')) {
    return codecString;
  }
  // VP8
  if (codecString.startsWith('vp08') || codecString === 'vp8') {
    return 'vp8';
  }
  // AV1
  if (codecString.startsWith('av01')) {
    return codecString;
  }
  return codecString;
}

/**
 * Map mp4box audio codec string to Web Codecs codec string
 */
function mapAudioCodec(codecString: string): string {
  // AAC
  if (codecString.startsWith('mp4a.40')) {
    return codecString;
  }
  // Opus
  if (codecString === 'opus' || codecString === 'Opus') {
    return 'opus';
  }
  // FLAC
  if (codecString === 'flac' || codecString === 'fLaC') {
    return 'flac';
  }
  // MP3
  if (codecString.startsWith('mp4a.6b') || codecString === 'mp3') {
    return 'mp3';
  }
  return codecString;
}

/**
 * Extract codec description (e.g., SPS/PPS for H.264)
 */
function extractDescription(track: Track): Uint8Array | undefined {
  // Debug: log track structure
  console.log('[Demuxer] Track structure for description:', {
    hasMdia: !!track.mdia,
    hasMinf: !!track.mdia?.minf,
    hasStbl: !!track.mdia?.minf?.stbl,
    hasStsd: !!track.mdia?.minf?.stbl?.stsd,
    entriesCount: track.mdia?.minf?.stbl?.stsd?.entries?.length,
  });

  const entry = track.mdia?.minf?.stbl?.stsd?.entries?.[0];
  if (!entry) {
    console.log('[Demuxer] No stsd entry found');
    return undefined;
  }

  // Debug: log entry keys
  console.log('[Demuxer] Entry keys:', Object.keys(entry));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log('[Demuxer] Has avcC:', !!(entry as any).avcC);

  // Helper to write box to buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writeBoxToBuffer = (box: any): Uint8Array | undefined => {
    if (!box || typeof box.write !== 'function') {
      console.log('[Demuxer] Box has no write method:', { hasBox: !!box, type: typeof box?.write });
      return undefined;
    }
    try {
      const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
      box.write(stream);
      const result = new Uint8Array(stream.buffer, 8); // Skip box header
      console.log('[Demuxer] Extracted description:', result.length, 'bytes');
      return result;
    } catch (error) {
      console.error('[Demuxer] Failed to write box:', error);
      return undefined;
    }
  };

  // H.264 - avcC box
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((entry as any).avcC) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return writeBoxToBuffer((entry as any).avcC);
  }

  // H.265 - hvcC box
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((entry as any).hvcC) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return writeBoxToBuffer((entry as any).hvcC);
  }

  // VP9 - vpcC box
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((entry as any).vpcC) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return writeBoxToBuffer((entry as any).vpcC);
  }

  // AV1 - av1C box
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((entry as any).av1C) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return writeBoxToBuffer((entry as any).av1C);
  }

  // AAC - esds box
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esds = (entry as any).esds;
  if (esds) {
    // Extract decoder specific info from esds
    if (esds.esd?.descs?.[0]?.descs?.[0]?.data) {
      return new Uint8Array(esds.esd.descs[0].descs[0].data);
    }
  }

  return undefined;
}

/**
 * Demuxer class
 *
 * Parses MP4 containers and extracts video/audio samples
 * for use with the Web Codecs API.
 */
export class Demuxer {
  private mp4file: ISOFile | null = null;
  private readonly config: DemuxerConfig;
  private videoTrackId: number | null = null;
  private audioTrackId: number | null = null;
  private mediaInfo: MediaInfo | null = null;
  private offset: number = 0;
  private initialized: boolean = false;

  constructor(config: DemuxerConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the demuxer
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    this.mp4file = MP4Box.createFile();

    this.mp4file.onReady = (info: MP4Info) => {
      this.handleReady(info);
    };

    this.mp4file.onError = (error: string) => {
      this.config.onError?.(new Error(`MP4Box error: ${error}`));
    };

    this.mp4file.onSamples = (trackId: number, _ref: unknown, samples: Sample[]) => {
      this.handleSamples(trackId, samples);
    };

    this.initialized = true;
  }

  /**
   * Get track box from moov by track ID
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTrackBox(trackId: number): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moov = (this.mp4file as any)?.moov;
    if (!moov?.traks) {
      console.log('[Demuxer] No moov.traks found');
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return moov.traks.find((trak: any) => trak.tkhd?.track_id === trackId);
  }

  /**
   * Handle MP4 file ready event
   */
  private handleReady(info: MP4Info): void {
    const videoTracks: VideoTrackInfo[] = [];
    const audioTracks: AudioTrackInfo[] = [];

    // Debug: log moov structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moov = (this.mp4file as any)?.moov;
    console.log('[Demuxer] moov structure:', {
      hasMoov: !!moov,
      traksCount: moov?.traks?.length,
    });

    // Process video tracks
    for (const track of info.videoTracks) {
      // Handle fragmented MP4 where duration might be 0
      let trackDuration = track.duration / track.timescale;
      let frameRate = 30; // Default frame rate

      // Try to get frame rate from track metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trackAny = track as any;
      if (trackAny.video?.frame_rate) {
        frameRate = trackAny.video.frame_rate;
      } else if (trackDuration > 0 && track.nb_samples > 0) {
        frameRate = track.nb_samples / trackDuration;
      }

      // If duration is still 0, calculate from samples and frame rate
      if (trackDuration <= 0 && track.nb_samples > 0) {
        // Try movie_duration first (duration in movie timescale)
        if (trackAny.movie_duration && info.timescale) {
          trackDuration = trackAny.movie_duration / info.timescale;
        }
        // Fallback: estimate from sample count and frame rate
        if (trackDuration <= 0) {
          trackDuration = track.nb_samples / frameRate;
        }
      }

      console.log('[Demuxer] Track duration calculation:', {
        rawDuration: track.duration,
        timescale: track.timescale,
        nbSamples: track.nb_samples,
        frameRate,
        calculatedDuration: trackDuration,
      });

      // Get full track box from moov.traks for description extraction
      const trackBox = this.getTrackBox(track.id);
      console.log('[Demuxer] Track box for id', track.id, ':', {
        found: !!trackBox,
        hasMdia: !!trackBox?.mdia,
        hasMinf: !!trackBox?.mdia?.minf,
      });
      const description = trackBox ? extractDescription(trackBox) : undefined;

      const videoInfo: VideoTrackInfo = {
        id: track.id,
        codec: mapVideoCodec(track.codec),
        codedWidth: track.track_width,
        codedHeight: track.track_height,
        displayWidth: track.track_width,
        displayHeight: track.track_height,
        frameRate,
        duration: trackDuration,
        description,
      };
      videoTracks.push(videoInfo);
      this.config.onVideoTrack?.(videoInfo);
    }

    // Process audio tracks
    for (const track of info.audioTracks) {
      // Get full track box from moov.traks for description extraction
      const trackBox = this.getTrackBox(track.id);
      const description = trackBox ? extractDescription(trackBox) : undefined;

      const audioInfo: AudioTrackInfo = {
        id: track.id,
        codec: mapAudioCodec(track.codec),
        sampleRate: track.audio?.sample_rate ?? 48000,
        numberOfChannels: track.audio?.channel_count ?? 2,
        duration: track.duration / track.timescale,
        description,
      };
      audioTracks.push(audioInfo);
      this.config.onAudioTrack?.(audioInfo);
    }

    // Calculate overall duration - fallback to track duration if info.duration is 0
    let overallDuration = info.duration / info.timescale;
    if (overallDuration <= 0 && videoTracks.length > 0) {
      overallDuration = videoTracks[0]!.duration;
    }
    if (overallDuration <= 0 && audioTracks.length > 0) {
      overallDuration = audioTracks[0]!.duration;
    }
    console.log('[Demuxer] Duration calculation:', {
      infoDuration: info.duration,
      timescale: info.timescale,
      calculated: info.duration / info.timescale,
      videoTrackDuration: videoTracks[0]?.duration,
      final: overallDuration,
    });

    this.mediaInfo = {
      duration: overallDuration,
      timescale: info.timescale,
      isFragmented: info.isFragmented,
      videoTracks,
      audioTracks,
    };

    // Select first video and audio tracks by default
    if (videoTracks.length > 0) {
      this.videoTrackId = videoTracks[0]!.id;
      this.mp4file?.setExtractionOptions(this.videoTrackId, null, {
        nbSamples: 100,
      });
    }

    if (audioTracks.length > 0) {
      this.audioTrackId = audioTracks[0]!.id;
      this.mp4file?.setExtractionOptions(this.audioTrackId, null, {
        nbSamples: 100,
      });
    }

    this.config.onReady?.(this.mediaInfo);
  }

  /**
   * Handle extracted samples
   */
  private handleSamples(trackId: number, samples: Sample[]): void {
    if (trackId === this.videoTrackId) {
      for (const sample of samples) {
        const videoSample: VideoSample = {
          data: new Uint8Array(sample.data),
          timestamp: (sample.cts * 1_000_000) / sample.timescale, // Convert to microseconds
          duration: (sample.duration * 1_000_000) / sample.timescale,
          keyframe: sample.is_sync,
        };
        this.config.onVideoSample?.(videoSample);
      }
    } else if (trackId === this.audioTrackId) {
      for (const sample of samples) {
        const audioSample: AudioSample = {
          data: new Uint8Array(sample.data),
          timestamp: (sample.cts * 1_000_000) / sample.timescale,
          duration: (sample.duration * 1_000_000) / sample.timescale,
        };
        this.config.onAudioSample?.(audioSample);
      }
    }

    // Release processed samples
    if (samples.length > 0) {
      this.mp4file?.releaseUsedSamples(trackId, samples[samples.length - 1]!.number);
    }
  }

  /**
   * Append data buffer to the demuxer
   */
  appendBuffer(buffer: ArrayBuffer): void {
    if (!this.mp4file) {
      throw new Error('Demuxer not initialized');
    }

    const mp4Buffer = buffer as MP4ArrayBuffer;
    mp4Buffer.fileStart = this.offset;
    this.offset += buffer.byteLength;

    this.mp4file.appendBuffer(mp4Buffer);
  }

  /**
   * Signal end of file
   */
  flush(): void {
    if (!this.mp4file) {
      return;
    }

    this.mp4file.flush();
  }

  /**
   * Start sample extraction
   */
  start(): void {
    if (!this.mp4file) {
      throw new Error('Demuxer not initialized');
    }

    this.mp4file.start();
  }

  /**
   * Stop sample extraction
   */
  stop(): void {
    if (!this.mp4file) {
      return;
    }

    this.mp4file.stop();
  }

  /**
   * Seek to a specific time in seconds
   * Note: For fully buffered videos, actual seeking is handled by WasmBridge
   * using the persistent sample storage. This method is for streaming scenarios.
   */
  seek(time: number): { time: number } {
    if (!this.mp4file) {
      throw new Error('Demuxer not initialized');
    }

    console.log('[Demuxer] seek called with time:', time);

    // For streaming scenarios, seek positions the mp4box extraction point
    const result = this.mp4file.seek(time, true);
    console.log('[Demuxer] seek result:', result);

    return {
      time: result.time ?? 0,
    };
  }

  /**
   * Get media information
   */
  getMediaInfo(): MediaInfo | null {
    return this.mediaInfo;
  }

  /**
   * Get selected video track info
   */
  getVideoTrackInfo(): VideoTrackInfo | null {
    if (!this.mediaInfo || !this.videoTrackId) {
      return null;
    }
    return this.mediaInfo.videoTracks.find((t) => t.id === this.videoTrackId) ?? null;
  }

  /**
   * Get selected audio track info
   */
  getAudioTrackInfo(): AudioTrackInfo | null {
    if (!this.mediaInfo || !this.audioTrackId) {
      return null;
    }
    return this.mediaInfo.audioTracks.find((t) => t.id === this.audioTrackId) ?? null;
  }

  /**
   * Select a video track by ID
   */
  selectVideoTrack(trackId: number): void {
    if (!this.mp4file || !this.mediaInfo) {
      throw new Error('Demuxer not initialized or media not loaded');
    }

    const track = this.mediaInfo.videoTracks.find((t) => t.id === trackId);
    if (!track) {
      throw new Error(`Video track not found: ${trackId}`);
    }

    if (this.videoTrackId !== null) {
      this.mp4file.unsetExtractionOptions(this.videoTrackId);
    }

    this.videoTrackId = trackId;
    this.mp4file.setExtractionOptions(trackId, null, {
      nbSamples: 100,
    });
  }

  /**
   * Select an audio track by ID
   */
  selectAudioTrack(trackId: number): void {
    if (!this.mp4file || !this.mediaInfo) {
      throw new Error('Demuxer not initialized or media not loaded');
    }

    const track = this.mediaInfo.audioTracks.find((t) => t.id === trackId);
    if (!track) {
      throw new Error(`Audio track not found: ${trackId}`);
    }

    if (this.audioTrackId !== null) {
      this.mp4file.unsetExtractionOptions(this.audioTrackId);
    }

    this.audioTrackId = trackId;
    this.mp4file.setExtractionOptions(trackId, null, {
      nbSamples: 100,
    });
  }

  /**
   * Check if demuxer is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create an EncodedVideoChunk from a video sample
   */
  static createVideoChunk(sample: VideoSample): EncodedVideoChunk {
    return new EncodedVideoChunk({
      type: sample.keyframe ? 'key' : 'delta',
      timestamp: sample.timestamp,
      duration: sample.duration,
      data: sample.data,
    });
  }

  /**
   * Create an EncodedAudioChunk from an audio sample
   */
  static createAudioChunk(sample: AudioSample): EncodedAudioChunk {
    return new EncodedAudioChunk({
      type: 'key',
      timestamp: sample.timestamp,
      duration: sample.duration,
      data: sample.data,
    });
  }

  /**
   * Close and release resources
   */
  close(): void {
    if (this.mp4file) {
      this.mp4file.flush();
      this.mp4file = null;
    }

    this.videoTrackId = null;
    this.audioTrackId = null;
    this.mediaInfo = null;
    this.offset = 0;
    this.initialized = false;
  }
}
