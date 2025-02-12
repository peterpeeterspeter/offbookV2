import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserCompatibilityTester } from '@/services/mobile/browser-compatibility'
import { vi } from 'vitest'

describe('BrowserCompatibilityTester - Mobile', () => {
  let tester: BrowserCompatibilityTester

  beforeEach(() => {
    tester = new BrowserCompatibilityTester()
  })

  it('should detect WebRTC support', async () => {
    const report = await tester.checkWebRTCSupport()

    expect(report).toMatchObject({
      getUserMedia: expect.any(Boolean),
      peerConnection: expect.any(Boolean),
      dataChannel: expect.any(Boolean),
      screenSharing: expect.any(Boolean)
    })
  })

  it('should detect audio features', async () => {
    const report = await tester.checkAudioSupport()

    expect(report).toMatchObject({
      webAudio: expect.any(Boolean),
      audioWorklet: expect.any(Boolean),
      mediaRecorder: expect.any(Boolean),
      audioCodecs: expect.any(Array)
    })
  })

  it('should detect WebGL support', async () => {
    const extensions = ['OES_texture_float', 'WEBGL_depth_texture'];

    // Create a more complete WebGL context mock with proper typing
    const createWebGLContextMock = () => {
      const contextMock = {
        getParameter: vi.fn((param) => {
          if (param === 0x0D33) { // MAX_TEXTURE_SIZE
            return 4096;
          }
          return null;
        }),
        getSupportedExtensions: vi.fn(() => extensions),
        getExtension: vi.fn((name) => {
          if (extensions.includes(name)) {
            return {
              FLOAT: 0x1406,
              HALF_FLOAT: 0x140B,
              loseContext: vi.fn(),
              restoreContext: vi.fn()
            };
          }
          return null;
        }),
        MAX_TEXTURE_SIZE: 0x0D33,
        canvas: document.createElement('canvas'),
        UNPACK_FLIP_Y_WEBGL: 0x9240,
        UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
        CONTEXT_LOST_WEBGL: 0x9242,
        UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243,
        BROWSER_DEFAULT_WEBGL: 0x9244,
        drawingBufferWidth: 0,
        drawingBufferHeight: 0,
        drawingBufferColorSpace: 'srgb',
        activeTexture: vi.fn(),
        attachShader: vi.fn(),
        bindAttribLocation: vi.fn(),
        bindBuffer: vi.fn(),
        bindFramebuffer: vi.fn(),
        bindRenderbuffer: vi.fn(),
        bindTexture: vi.fn(),
        blendColor: vi.fn(),
        blendEquation: vi.fn(),
        blendEquationSeparate: vi.fn(),
        blendFunc: vi.fn(),
        blendFuncSeparate: vi.fn(),
        bufferData: vi.fn(),
        bufferSubData: vi.fn(),
        checkFramebufferStatus: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        clearDepth: vi.fn(),
        clearStencil: vi.fn(),
        colorMask: vi.fn(),
        compileShader: vi.fn(),
        copyTexImage2D: vi.fn(),
        copyTexSubImage2D: vi.fn(),
        createBuffer: vi.fn(),
        createFramebuffer: vi.fn(),
        createProgram: vi.fn(),
        createRenderbuffer: vi.fn(),
        createShader: vi.fn(),
        createTexture: vi.fn(),
        cullFace: vi.fn(),
        deleteBuffer: vi.fn(),
        deleteFramebuffer: vi.fn(),
        deleteProgram: vi.fn(),
        deleteRenderbuffer: vi.fn(),
        deleteShader: vi.fn(),
        deleteTexture: vi.fn(),
        depthFunc: vi.fn(),
        depthMask: vi.fn(),
        depthRange: vi.fn(),
        detachShader: vi.fn(),
        disable: vi.fn(),
        disableVertexAttribArray: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        enable: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        finish: vi.fn(),
        flush: vi.fn(),
        framebufferRenderbuffer: vi.fn(),
        framebufferTexture2D: vi.fn(),
        frontFace: vi.fn(),
        generateMipmap: vi.fn(),
        getActiveAttrib: vi.fn(),
        getActiveUniform: vi.fn(),
        getAttachedShaders: vi.fn(),
        getAttribLocation: vi.fn(),
        getBufferParameter: vi.fn(),
        getContextAttributes: vi.fn(),
        getError: vi.fn(),
        getFramebufferAttachmentParameter: vi.fn(),
        getProgramInfoLog: vi.fn(),
        getProgramParameter: vi.fn(),
        getRenderbufferParameter: vi.fn(),
        getShaderInfoLog: vi.fn(),
        getShaderParameter: vi.fn(),
        getShaderPrecisionFormat: vi.fn(),
        getShaderSource: vi.fn(),
        getTexParameter: vi.fn(),
        getUniform: vi.fn(),
        getUniformLocation: vi.fn(),
        getVertexAttrib: vi.fn(),
        getVertexAttribOffset: vi.fn(),
        hint: vi.fn(),
        isBuffer: vi.fn(),
        isContextLost: vi.fn(),
        isEnabled: vi.fn(),
        isFramebuffer: vi.fn(),
        isProgram: vi.fn(),
        isRenderbuffer: vi.fn(),
        isShader: vi.fn(),
        isTexture: vi.fn(),
        lineWidth: vi.fn(),
        linkProgram: vi.fn(),
        pixelStorei: vi.fn(),
        polygonOffset: vi.fn(),
        readPixels: vi.fn(),
        renderbufferStorage: vi.fn(),
        sampleCoverage: vi.fn(),
        scissor: vi.fn(),
        shaderSource: vi.fn(),
        stencilFunc: vi.fn(),
        stencilFuncSeparate: vi.fn(),
        stencilMask: vi.fn(),
        stencilMaskSeparate: vi.fn(),
        stencilOp: vi.fn(),
        stencilOpSeparate: vi.fn(),
        texImage2D: vi.fn(),
        texParameterf: vi.fn(),
        texParameteri: vi.fn(),
        texSubImage2D: vi.fn(),
        uniform1f: vi.fn(),
        uniform1fv: vi.fn(),
        uniform1i: vi.fn(),
        uniform1iv: vi.fn(),
        uniform2f: vi.fn(),
        uniform2fv: vi.fn(),
        uniform2i: vi.fn(),
        uniform2iv: vi.fn(),
        uniform3f: vi.fn(),
        uniform3fv: vi.fn(),
        uniform3i: vi.fn(),
        uniform3iv: vi.fn(),
        uniform4f: vi.fn(),
        uniform4fv: vi.fn(),
        uniform4i: vi.fn(),
        uniform4iv: vi.fn(),
        uniformMatrix2fv: vi.fn(),
        uniformMatrix3fv: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        useProgram: vi.fn(),
        validateProgram: vi.fn(),
        vertexAttrib1f: vi.fn(),
        vertexAttrib1fv: vi.fn(),
        vertexAttrib2f: vi.fn(),
        vertexAttrib2fv: vi.fn(),
        vertexAttrib3f: vi.fn(),
        vertexAttrib3fv: vi.fn(),
        vertexAttrib4f: vi.fn(),
        vertexAttrib4fv: vi.fn(),
        vertexAttribPointer: vi.fn(),
        viewport: vi.fn()
      };

      return contextMock;
    };

    // Create WebGL and WebGL2 context mocks with proper typing
    const mockWebGLContext = createWebGLContextMock() as unknown as WebGLRenderingContext;
    const mockWebGL2Context = createWebGLContextMock() as unknown as WebGL2RenderingContext;

    // Mock canvas context with proper typing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(function(contextId: string) {
      if (contextId === 'webgl' || contextId === 'experimental-webgl') {
        return mockWebGLContext;
      }
      if (contextId === 'webgl2') {
        return mockWebGL2Context;
      }
      return null;
    }) as typeof HTMLCanvasElement.prototype.getContext;

    // Add debug logging
    console.log('Mock WebGL context:', {
      extensions: mockWebGLContext.getSupportedExtensions(),
      maxTextureSize: mockWebGLContext.getParameter(mockWebGLContext.MAX_TEXTURE_SIZE)
    });

    const report = await tester.checkGraphicsSupport();

    // Add debug logging
    console.log('Report:', {
      webgl: report.webgl,
      webgl2: report.webgl2,
      extensions: report.extensions,
      maxTextureSize: report.maxTextureSize
    });

    expect(report.webgl).toBe(true);
    expect(report.webgl2).toBe(true);
    expect(report.extensions).toEqual(extensions);
    expect(report.maxTextureSize).toBe(4096);

    // Verify that extensions were properly queried
    expect(mockWebGLContext.getSupportedExtensions).toHaveBeenCalled();
    expect(mockWebGLContext.getParameter).toHaveBeenCalledWith(mockWebGLContext.MAX_TEXTURE_SIZE);

    // Restore original getContext
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  })

  it('should check storage APIs', async () => {
    const report = await tester.checkStorageSupport()

    expect(report).toMatchObject({
      localStorage: expect.any(Boolean),
      sessionStorage: expect.any(Boolean),
      indexedDB: expect.any(Boolean),
      webSQL: expect.any(Boolean),
      quota: expect.any(Number)
    })
  })

  it('should verify media features', async () => {
    const report = await tester.checkMediaFeatures()

    expect(report).toMatchObject({
      videoCodecs: expect.any(Array),
      imageFormats: expect.any(Array),
      mediaQueries: expect.any(Object),
      pictureInPicture: expect.any(Boolean)
    })
  })

  it('should check performance APIs', async () => {
    const report = await tester.checkPerformanceAPIs()

    expect(report).toMatchObject({
      performanceObserver: expect.any(Boolean),
      resourceTiming: expect.any(Boolean),
      userTiming: expect.any(Boolean),
      navigationTiming: expect.any(Boolean)
    })
  })

  it('should verify touch features', async () => {
    const report = await tester.checkTouchFeatures()

    expect(report).toMatchObject({
      touchEvents: expect.any(Boolean),
      pointerEvents: expect.any(Boolean),
      multiTouch: expect.any(Boolean),
      forceTouch: expect.any(Boolean)
    })
  })

  it('should check sensor APIs', async () => {
    const report = await tester.checkSensorAPIs()

    expect(report).toMatchObject({
      accelerometer: expect.any(Boolean),
      gyroscope: expect.any(Boolean),
      magnetometer: expect.any(Boolean),
      ambientLight: expect.any(Boolean)
    })
  })

  it('should verify web APIs', async () => {
    const report = await tester.checkWebAPIs()

    expect(report).toMatchObject({
      serviceWorker: expect.any(Boolean),
      webWorker: expect.any(Boolean),
      webSocket: expect.any(Boolean),
      webAssembly: expect.any(Boolean)
    })
  })

  it('should generate comprehensive compatibility report', async () => {
    const report = await tester.generateCompatibilityReport()

    expect(report).toMatchObject({
      browser: {
        name: expect.any(String),
        version: expect.any(String),
        engine: expect.any(String)
      },
      features: {
        webrtc: expect.any(Object),
        audio: expect.any(Object),
        graphics: expect.any(Object),
        storage: expect.any(Object),
        media: expect.any(Object),
        performance: expect.any(Object),
        input: expect.any(Object),
        sensors: expect.any(Object),
        apis: expect.any(Object)
      },
      issues: expect.any(Array),
      recommendations: expect.any(Array)
    })
  })
})

