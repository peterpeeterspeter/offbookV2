export function checkWebGLSupport(): { webgl: boolean; webgl2: boolean; extensions: string[]; maxTextureSize: number } {
  const canvas = document.createElement('canvas');

  // Try WebGL2 first
  const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;

  // Then try WebGL1
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;

  // If neither context is available, return default values
  if (!gl2 && !gl) {
    return {
      webgl: false,
      webgl2: false,
      extensions: [],
      maxTextureSize: 0
    };
  }

  // Get the appropriate context and features
  const activeContext = gl2 || gl;
  const hasWebGL2 = !!gl2;
  const hasWebGL1 = !!gl;

  // Get supported extensions
  const extensions = activeContext!.getSupportedExtensions() || [];

  // Get max texture size using the exact constant
  const MAX_TEXTURE_SIZE = 0x0D33;
  console.log('MAX_TEXTURE_SIZE:', MAX_TEXTURE_SIZE);
  console.log('activeContext:', activeContext);
  const maxTextureSizeValue = activeContext!.getParameter(MAX_TEXTURE_SIZE);
  console.log('maxTextureSizeValue:', maxTextureSizeValue, 'type:', typeof maxTextureSizeValue);
  const maxTextureSize = typeof maxTextureSizeValue === 'number' ? maxTextureSizeValue : 0;
  console.log('maxTextureSize:', maxTextureSize, 'type:', typeof maxTextureSize);

  // Clean up
  if (gl2) {
    const loseContext = gl2.getExtension('WEBGL_lose_context');
    loseContext?.loseContext();
  }
  if (gl) {
    const loseContext = gl.getExtension('WEBGL_lose_context');
    loseContext?.loseContext();
  }

  return {
    webgl: hasWebGL1 || hasWebGL2,
    webgl2: hasWebGL2,
    extensions,
    maxTextureSize
  };
}
