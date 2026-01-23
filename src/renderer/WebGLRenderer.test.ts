/**
 * WebGLRenderer tests - WebGL context and rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebGLRenderer, type RendererConfig } from './WebGLRenderer';
import type { VideoFrame } from '@player/WasmBridge';

// Mock WebGL2 context
const createMockWebGL2Context = (): Partial<WebGL2RenderingContext> => {
  const mockProgram = {} as WebGLProgram;
  const mockShader = {} as WebGLShader;
  const mockTexture = {} as WebGLTexture;
  const mockVao = {} as WebGLVertexArrayObject;
  const mockBuffer = {} as WebGLBuffer;

  return {
    // Constants
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    LINK_STATUS: 35714,
    COMPILE_STATUS: 35713,
    TEXTURE_2D: 3553,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    CLAMP_TO_EDGE: 33071,
    LINEAR: 9729,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    COLOR_BUFFER_BIT: 16384,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,

    // Shader functions
    createShader: vi.fn().mockReturnValue(mockShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn().mockReturnValue(true),
    getShaderInfoLog: vi.fn().mockReturnValue(''),
    deleteShader: vi.fn(),

    // Program functions
    createProgram: vi.fn().mockReturnValue(mockProgram),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn().mockReturnValue(true),
    getProgramInfoLog: vi.fn().mockReturnValue(''),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),
    getAttribLocation: vi.fn().mockReturnValue(0),

    // Texture functions
    createTexture: vi.fn().mockReturnValue(mockTexture),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    deleteTexture: vi.fn(),

    // VAO functions
    createVertexArray: vi.fn().mockReturnValue(mockVao),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),

    // Buffer functions
    createBuffer: vi.fn().mockReturnValue(mockBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    // Drawing functions
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
  };
};

describe('WebGLRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: WebGLRenderer;
  let mockGl: Partial<WebGL2RenderingContext>;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    mockGl = createMockWebGL2Context();
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as WebGL2RenderingContext);

    renderer = new WebGLRenderer(canvas);
  });

  afterEach(() => {
    renderer.dispose();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should not be initialized initially', () => {
      expect(renderer.isInitialized()).toBe(false);
    });

    it('should initialize successfully', async () => {
      await renderer.init();
      expect(renderer.isInitialized()).toBe(true);
    });

    it('should get WebGL2 context with correct options', async () => {
      await renderer.init();

      expect(canvas.getContext).toHaveBeenCalledWith('webgl2', {
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
    });

    it('should accept custom configuration', async () => {
      const customConfig: Partial<RendererConfig> = {
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      };

      const customRenderer = new WebGLRenderer(canvas, customConfig);
      await customRenderer.init();

      expect(canvas.getContext).toHaveBeenCalledWith('webgl2', {
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      });

      customRenderer.dispose();
    });

    it('should throw error when WebGL2 is not supported', async () => {
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);

      const unsupportedRenderer = new WebGLRenderer(canvas);
      await expect(unsupportedRenderer.init()).rejects.toThrow(
        'WebGL2 is not supported in this browser'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await renderer.init();
      await renderer.init();

      expect(canvas.getContext).toHaveBeenCalledTimes(1);
    });

    it('should create shader program', async () => {
      await renderer.init();

      expect(mockGl.createProgram).toHaveBeenCalled();
      expect(mockGl.createShader).toHaveBeenCalledTimes(2);
      expect(mockGl.linkProgram).toHaveBeenCalled();
    });

    it('should throw error when shader program creation fails', async () => {
      vi.mocked(mockGl.createProgram!).mockReturnValue(null);

      await expect(renderer.init()).rejects.toThrow('Failed to create shader program');
    });

    it('should create texture', async () => {
      await renderer.init();

      expect(mockGl.createTexture).toHaveBeenCalled();
      expect(mockGl.bindTexture).toHaveBeenCalled();
      expect(mockGl.texParameteri).toHaveBeenCalled();
    });

    it('should throw error when texture creation fails', async () => {
      vi.mocked(mockGl.createTexture!).mockReturnValue(null);

      await expect(renderer.init()).rejects.toThrow('Failed to create texture');
    });
  });

  describe('getContext', () => {
    it('should return null before initialization', () => {
      expect(renderer.getContext()).toBeNull();
    });

    it('should return WebGL2 context after initialization', async () => {
      await renderer.init();
      expect(renderer.getContext()).toBe(mockGl);
    });
  });

  describe('render', () => {
    let mockFrame: VideoFrame;

    beforeEach(async () => {
      await renderer.init();

      mockFrame = {
        data: new Uint8Array(1920 * 1080 * 4),
        width: 1920,
        height: 1080,
        timestamp: 0,
        keyframe: true,
      };
    });

    it('should render frame successfully', () => {
      expect(() => renderer.render(mockFrame)).not.toThrow();
    });

    it('should upload texture data', () => {
      renderer.render(mockFrame);

      expect(mockGl.texImage2D).toHaveBeenCalledWith(
        mockGl.TEXTURE_2D,
        0,
        mockGl.RGBA,
        mockFrame.width,
        mockFrame.height,
        0,
        mockGl.RGBA,
        mockGl.UNSIGNED_BYTE,
        mockFrame.data
      );
    });

    it('should resize canvas when frame size differs', () => {
      renderer.render(mockFrame);

      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
      expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });

    it('should clear and draw', () => {
      renderer.render(mockFrame);

      expect(mockGl.clearColor).toHaveBeenCalledWith(0, 0, 0, 1);
      expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
      expect(mockGl.useProgram).toHaveBeenCalled();
      expect(mockGl.bindVertexArray).toHaveBeenCalled();
      expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLE_STRIP, 0, 4);
    });

    it('should throw error when not initialized', () => {
      const uninitializedRenderer = new WebGLRenderer(canvas);
      expect(() => uninitializedRenderer.render(mockFrame)).toThrow('Renderer not initialized');
    });
  });

  describe('clear', () => {
    it('should clear the canvas', async () => {
      await renderer.init();
      renderer.clear();

      expect(mockGl.clearColor).toHaveBeenCalledWith(0, 0, 0, 1);
      expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
    });

    it('should not throw when not initialized', () => {
      expect(() => renderer.clear()).not.toThrow();
    });
  });

  describe('resize', () => {
    it('should resize canvas and viewport', async () => {
      await renderer.init();
      renderer.resize(1280, 720);

      expect(canvas.width).toBe(1280);
      expect(canvas.height).toBe(720);
      expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 1280, 720);
    });

    it('should resize canvas even when not initialized', () => {
      renderer.resize(1280, 720);

      expect(canvas.width).toBe(1280);
      expect(canvas.height).toBe(720);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await renderer.init();
      renderer.dispose();

      expect(mockGl.deleteTexture).toHaveBeenCalled();
      expect(mockGl.deleteProgram).toHaveBeenCalled();
      expect(mockGl.deleteVertexArray).toHaveBeenCalled();
      expect(renderer.isInitialized()).toBe(false);
    });

    it('should not throw when not initialized', () => {
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  describe('shader compilation errors', () => {
    it('should handle vertex shader compilation failure', async () => {
      vi.mocked(mockGl.getShaderParameter!).mockReturnValueOnce(false);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(renderer.init()).rejects.toThrow('Failed to create shader program');
    });

    it('should handle fragment shader compilation failure', async () => {
      vi.mocked(mockGl.getShaderParameter!)
        .mockReturnValueOnce(true) // vertex shader
        .mockReturnValueOnce(false); // fragment shader
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(renderer.init()).rejects.toThrow('Failed to create shader program');
    });

    it('should handle program link failure', async () => {
      vi.mocked(mockGl.getProgramParameter!).mockReturnValue(false);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(renderer.init()).rejects.toThrow('Failed to create shader program');
    });
  });
});
