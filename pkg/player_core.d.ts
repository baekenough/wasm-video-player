/* tslint:disable */
/* eslint-disable */

/**
 * Main player core structure exposed to JavaScript.
 */
export class PlayerCore {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Returns buffer statistics as JSON.
     */
    buffer_stats(): string;
    /**
     * Returns the detected container format.
     */
    format(): string | undefined;
    /**
     * Loads media data into the player.
     *
     * # Arguments
     * * `data` - Raw container file data (MP4, MKV, etc.)
     */
    load(data: Uint8Array): void;
    /**
     * Loads subtitles from text content.
     */
    load_subtitles(data: string): string;
    /**
     * Creates a new PlayerCore instance.
     */
    constructor();
    /**
     * Pauses playback.
     */
    pause(): void;
    /**
     * Starts playback.
     */
    play(): void;
    /**
     * Resets the player to idle state.
     */
    reset(): void;
    /**
     * Seeks to a specific timestamp.
     *
     * # Arguments
     * * `timestamp_ms` - Target timestamp in milliseconds.
     */
    seek(timestamp_ms: bigint): void;
    /**
     * Returns the current player state.
     */
    readonly state: PlayerState;
}

/**
 * Player state enumeration.
 */
export enum PlayerState {
    /**
     * Initial state, no media loaded.
     */
    Idle = 0,
    /**
     * Media is being loaded.
     */
    Loading = 1,
    /**
     * Media is loaded and ready to play.
     */
    Ready = 2,
    /**
     * Media is currently playing.
     */
    Playing = 3,
    /**
     * Playback is paused.
     */
    Paused = 4,
    /**
     * Playback has ended.
     */
    Ended = 5,
    /**
     * An error occurred.
     */
    Error = 6,
}

/**
 * Returns the library version.
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_playercore_free: (a: number, b: number) => void;
    readonly playercore_buffer_stats: (a: number) => [number, number];
    readonly playercore_format: (a: number) => [number, number];
    readonly playercore_load: (a: number, b: number, c: number) => [number, number];
    readonly playercore_load_subtitles: (a: number, b: number, c: number) => [number, number, number, number];
    readonly playercore_new: () => number;
    readonly playercore_pause: (a: number) => [number, number];
    readonly playercore_play: (a: number) => [number, number];
    readonly playercore_reset: (a: number) => void;
    readonly playercore_seek: (a: number, b: bigint) => [number, number];
    readonly playercore_state: (a: number) => number;
    readonly version: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
