declare module 'node-vad' {
  interface VADOptions {
    mode: number;
    audioFrequency: number;
    audioChannels: number;
  }

  interface VADResult {
    speech: {
      active: boolean;
      start?: number;
      end?: number;
    };
  }

  class VAD {
    constructor(options: VADOptions);
    processAudio(chunk: Float32Array, sampleRate: number): Promise<VADResult>;
  }

  export = VAD;
}
