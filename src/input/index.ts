/**
 * Input module exports
 *
 * Provides input handling for the video player including
 * seek management and keyboard shortcuts.
 */

export { SeekManager, type SeekManagerConfig } from './SeekManager';
export {
  KeyboardHandler,
  type KeyboardHandlerConfig,
  type KeyboardCallbacks,
} from './KeyboardHandler';
