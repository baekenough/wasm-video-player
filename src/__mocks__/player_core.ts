/**
 * Mock WASM module for testing
 */

// Mutable state for test configuration
let loadVideoSuccess = true;
let seekSuccess = true;
let metadata = {
  width: 1920,
  height: 1080,
  duration: 120,
  frameRate: 30,
  codec: 'h264',
};
let frameData = {
  data: new Uint8Array(1920 * 1080 * 4),
  width: 1920,
  height: 1080,
  timestamp: 0,
  keyframe: true,
};

// Export test configuration helpers
export const __setLoadVideoSuccess = (success: boolean): void => {
  loadVideoSuccess = success;
};

export const __setSeekSuccess = (success: boolean): void => {
  seekSuccess = success;
};

export const __setMetadata = (data: typeof metadata): void => {
  metadata = data;
};

export const __setFrameData = (data: typeof frameData): void => {
  frameData = data;
};

export const __reset = (): void => {
  loadVideoSuccess = true;
  seekSuccess = true;
  metadata = {
    width: 1920,
    height: 1080,
    duration: 120,
    frameRate: 30,
    codec: 'h264',
  };
  frameData = {
    data: new Uint8Array(1920 * 1080 * 4),
    width: 1920,
    height: 1080,
    timestamp: 0,
    keyframe: true,
  };
};

// WASM module mock functions
export const load_video = (_data: Uint8Array): boolean => {
  return loadVideoSuccess;
};

export const get_metadata = (): typeof metadata | null => {
  return metadata;
};

export const decode_frame = (): typeof frameData | null => {
  return frameData;
};

export const seek = (_timestamp: number): boolean => {
  return seekSuccess;
};

export const flush = (): void => {
  // No-op
};

export const free = (): void => {
  // No-op
};

// Default export is the init function
export default async function init(): Promise<void> {
  // No-op, initialization is mocked
}
