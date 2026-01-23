/**
 * Type definitions for mp4box.js
 *
 * Minimal types for the features used in Demuxer.ts
 */

declare module 'mp4box' {
  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number;
  }

  export interface Sample {
    number: number;
    track_id: number;
    description_index: number;
    description: unknown;
    data: ArrayBuffer;
    size: number;
    alreadyRead: number;
    duration: number;
    cts: number;
    dts: number;
    is_sync: boolean;
    is_leading: number;
    depends_on: number;
    is_depended_on: number;
    has_redundancy: number;
    degradation_priority: number;
    offset: number;
    timescale: number;
  }

  export interface AudioTrackInfo {
    sample_rate: number;
    channel_count: number;
  }

  export interface Track {
    id: number;
    created: Date;
    modified: Date;
    movie_duration: number;
    layer: number;
    alternate_group: number;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    language: string;
    nb_samples: number;
    audio?: AudioTrackInfo;
    video?: {
      width: number;
      height: number;
    };
    mdia?: {
      minf?: {
        stbl?: {
          stsd?: {
            entries?: Array<{
              avcC?: unknown;
              hvcC?: unknown;
              vpcC?: unknown;
              av1C?: unknown;
              esds?: {
                esd?: {
                  descs?: Array<{
                    descs?: Array<{
                      data?: ArrayBuffer;
                    }>;
                  }>;
                };
              };
            }>;
          };
        };
      };
    };
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    fragment_duration: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasIOD: boolean;
    brands: string[];
    created: Date;
    modified: Date;
    tracks: Track[];
    videoTracks: Track[];
    audioTracks: Track[];
    subtitleTracks: Track[];
    metadataTracks: Track[];
    hintTracks: Track[];
    otherTracks: Track[];
  }

  export interface SeekResult {
    offset: number;
    time: number;
    videoSampleNum?: number;
    audioSampleNum?: number;
  }

  export interface ISOFile {
    onReady?: (info: MP4Info) => void;
    onError?: (error: string) => void;
    onSamples?: (trackId: number, ref: unknown, samples: Sample[]) => void;
    onMoovStart?: () => void;
    onSegment?: (id: number, user: unknown, buffer: ArrayBuffer, sampleNumber: number, last: boolean) => void;

    appendBuffer(buffer: MP4ArrayBuffer): number;
    start(): void;
    stop(): void;
    flush(): void;
    seek(time: number, useRap?: boolean): SeekResult;
    releaseUsedSamples(trackId: number, sampleNumber: number): void;
    setExtractionOptions(
      trackId: number,
      user?: unknown,
      options?: {
        nbSamples?: number;
        rapAlignement?: boolean;
      }
    ): void;
    unsetExtractionOptions(trackId: number): void;
    getTrackById(trackId: number): Track | undefined;
    getInfo(): MP4Info;
    setSegmentOptions(
      trackId: number,
      user?: unknown,
      options?: {
        nbSamples?: number;
        rapAlignement?: boolean;
      }
    ): void;
    unsetSegmentOptions(trackId: number): void;
    initializeSegmentation(): Array<{
      id: number;
      user: unknown;
      buffer: ArrayBuffer;
    }>;
  }

  export interface DataStream {
    buffer: ArrayBuffer;
  }

  export interface MP4Box {
    createFile(): ISOFile;
    DataStream: {
      new (buffer: ArrayBuffer | undefined, offset: number, endianness: boolean): DataStream;
      BIG_ENDIAN: boolean;
      LITTLE_ENDIAN: boolean;
    };
  }

  const mp4box: MP4Box;
  export default mp4box;
}
