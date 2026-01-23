/**
 * File System Access API Type Declarations
 *
 * These types supplement the standard DOM types for the File System Access API.
 * Browser support: Chrome 86+, Edge 86+, Opera 72+
 */

/**
 * Options for the directory picker
 */
interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

/**
 * Options for checking permissions
 */
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

/**
 * Extended FileSystemDirectoryHandle with iteration support
 */
interface FileSystemDirectoryHandle {
  /**
   * Returns an async iterator of [name, handle] pairs
   */
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;

  /**
   * Returns an async iterator of file/directory names
   */
  keys(): AsyncIterableIterator<string>;

  /**
   * Returns an async iterator of file/directory handles
   */
  values(): AsyncIterableIterator<FileSystemHandle>;

  /**
   * Query permission status for this handle
   */
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;

  /**
   * Request permission for this handle
   */
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;
}

/**
 * Extended FileSystemFileHandle with permission methods
 */
interface FileSystemFileHandle {
  /**
   * Query permission status for this handle
   */
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;

  /**
   * Request permission for this handle
   */
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;
}

/**
 * Extend the Window interface with showDirectoryPicker
 */
interface Window {
  /**
   * Shows a directory picker to allow the user to select a directory
   */
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;

  /**
   * Shows a file picker to allow the user to select one or more files
   */
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;

  /**
   * Shows a file picker to allow the user to save a file
   */
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}

/**
 * File picker options
 */
interface FilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface OpenFilePickerOptions extends FilePickerOptions {
  multiple?: boolean;
}

interface SaveFilePickerOptions extends FilePickerOptions {
  suggestedName?: string;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}
