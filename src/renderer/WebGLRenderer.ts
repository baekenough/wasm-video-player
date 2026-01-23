/**
 * WebGLRenderer - Hardware-accelerated video frame rendering
 *
 * Uses WebGL2 for efficient YUV to RGB conversion and rendering.
 */

import type { VideoFrame } from '@player/WasmBridge';

/**
 * WebGL shader sources
 */
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(u_texture, v_texCoord);
}
`;

/**
 * WebGL renderer configuration
 */
export interface RendererConfig {
  antialias: boolean;
  alpha: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
}

/**
 * Default renderer configuration
 */
const defaultConfig: RendererConfig = {
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
};

/**
 * WebGLRenderer class
 */
export class WebGLRenderer {
  private readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private initialized: boolean = false;
  private readonly config: RendererConfig;

  constructor(canvas: HTMLCanvasElement, config: Partial<RendererConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize WebGL context and resources
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Get WebGL2 context
    this.gl = this.canvas.getContext('webgl2', {
      antialias: this.config.antialias,
      alpha: this.config.alpha,
      powerPreference: this.config.powerPreference,
      preserveDrawingBuffer: false,
    });

    if (!this.gl) {
      throw new Error('WebGL2 is not supported in this browser');
    }

    // Create shader program
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }

    // Create vertex buffer and VAO
    this.setupGeometry();

    // Create texture
    this.texture = this.gl.createTexture();
    if (!this.texture) {
      throw new Error('Failed to create texture');
    }

    // Configure texture
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    this.initialized = true;
  }

  /**
   * Check if renderer is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get WebGL context
   */
  getContext(): WebGL2RenderingContext | null {
    return this.gl;
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Render a video frame
   */
  render(frame: VideoFrame): void {
    if (!this.initialized || !this.gl || !this.program || !this.texture) {
      throw new Error('Renderer not initialized');
    }

    const gl = this.gl;

    // Resize canvas if needed
    if (this.canvas.width !== frame.width || this.canvas.height !== frame.height) {
      this.canvas.width = frame.width;
      this.canvas.height = frame.height;
      gl.viewport(0, 0, frame.width, frame.height);
    }

    // Upload frame data to texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      frame.width,
      frame.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      frame.data
    );

    // Clear and draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    if (!this.gl) {
      return;
    }

    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Create shader program
   */
  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this.gl!;

    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders (they're now part of the program)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  /**
   * Create shader
   */
  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;

    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Setup geometry (fullscreen quad)
   */
  private setupGeometry(): void {
    const gl = this.gl!;

    // Vertex positions and texture coordinates
    const vertices = new Float32Array([
      // Position    // TexCoord
      -1.0, -1.0, 0.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0,
    ]);

    // Create VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Create VBO
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Setup attributes
    const positionLoc = gl.getAttribLocation(this.program!, 'a_position');
    const texCoordLoc = gl.getAttribLocation(this.program!, 'a_texCoord');

    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (!this.gl) {
      return;
    }

    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }

    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    this.initialized = false;
  }
}
