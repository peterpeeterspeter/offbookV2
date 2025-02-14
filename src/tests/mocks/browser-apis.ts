import { vi } from 'vitest'

// Mock MediaStreamTrack
export class MockMediaStreamTrack implements MediaStreamTrack {
  enabled: boolean = true;
  id: string = 'mock-track-id';
  kind: string = 'audio';
  label: string = 'Mock Audio Track';
  muted: boolean = false;
  readyState: MediaStreamTrackState = 'live';
  isolated: boolean = false;
  contentHint: string = '';

  onended: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onisolationchange: ((this: MediaStreamTrack, ev: Event) => any) | null = null;

  applyConstraints(): Promise<void> {
    return Promise.resolve();
  }

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack();
  }

  getCapabilities(): MediaTrackCapabilities {
    return {};
  }

  getConstraints(): MediaTrackConstraints {
    return {};
  }

  getSettings(): MediaTrackSettings {
    return {};
  }

  stop(): void {}

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

// Mock MediaStream
export class MockMediaStream implements MediaStream {
  active: boolean = true;
  id: string = 'mock-stream-id';

  onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null = null;
  onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null = null;

  private tracks: MediaStreamTrack[] = [];

  constructor(streamOrTracks?: MediaStreamTrack[]) {
    if (streamOrTracks) {
      this.tracks = [...streamOrTracks];
    }
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
    if (this.onaddtrack) {
      const event = new Event('addtrack') as MediaStreamTrackEvent;
      this.onaddtrack.call(this, event);
    }
  }

  clone(): MediaStream {
    return new MockMediaStream(this.tracks.map(track => track.clone()));
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter(track => track.kind === 'audio');
  }

  getTrackById(trackId: string): MediaStreamTrack | null {
    return this.tracks.find(track => track.id === trackId) || null;
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter(track => track.kind === 'video');
  }

  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track);
    if (index !== -1) {
      this.tracks.splice(index, 1);
      if (this.onremovetrack) {
        const event = new Event('removetrack') as MediaStreamTrackEvent;
        this.onremovetrack.call(this, event);
      }
    }
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

// Mock Blob
export class MockBlob implements Blob {
  private data: Uint8Array;
  readonly size: number;
  readonly type: string;

  constructor(chunks: BlobPart[] = [], options?: BlobPropertyBag) {
    // Convert chunks to Uint8Array
    let totalLength = 0;
    const chunksAsUint8 = chunks.map(chunk => {
      if (chunk instanceof Uint8Array) return chunk;
      if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
      if (chunk instanceof DataView) return new Uint8Array(chunk.buffer);
      if (chunk instanceof Int8Array || chunk instanceof Int16Array ||
          chunk instanceof Int32Array || chunk instanceof Uint8ClampedArray ||
          chunk instanceof Uint16Array || chunk instanceof Uint32Array ||
          chunk instanceof Float32Array || chunk instanceof Float64Array) {
        return new Uint8Array(chunk.buffer);
      }
      if (typeof chunk === 'string') return new TextEncoder().encode(chunk);
      if (chunk instanceof Blob) {
        // For Blob chunks, we need to convert them to ArrayBuffer first
        // This is done synchronously in the mock implementation for simplicity
        const arrayBuffer = chunk.arrayBuffer();
        if (arrayBuffer instanceof Promise) {
          throw new Error('Blob chunks must be handled asynchronously');
        }
        return new Uint8Array(arrayBuffer);
      }
      throw new Error('Unsupported chunk type: ' + (chunk ? chunk.constructor.name : typeof chunk));
    });

    totalLength = chunksAsUint8.reduce((acc, chunk) => acc + chunk.length, 0);
    this.data = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of chunksAsUint8) {
      this.data.set(chunk, offset);
      offset += chunk.length;
    }

    this.size = totalLength;
    this.type = options?.type || '';
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
    const buffer = new ArrayBuffer(this.data.length);
    new Uint8Array(buffer).set(this.data);
    return buffer;
  }

  async bytes(): Promise<Uint8Array> {
    return this.data;
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    const slicedData = this.data.slice(start, end);
    return new MockBlob([slicedData], { type: contentType || this.type });
  }

  stream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(this.data);
        controller.close();
      }
    });
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(this.data);
  }
}

// Create a helper function to create a MockBlob from chunks asynchronously
export async function createMockBlobAsync(chunks: BlobPart[], options?: BlobPropertyBag): Promise<MockBlob> {
  const processedChunks: Uint8Array[] = [];

  for (const chunk of chunks) {
    if (chunk instanceof Blob) {
      const arrayBuffer = await chunk.arrayBuffer();
      processedChunks.push(new Uint8Array(arrayBuffer));
    } else {
      let processedChunk: Uint8Array;

      if (chunk instanceof Uint8Array) {
        processedChunk = chunk;
      } else if (chunk instanceof ArrayBuffer) {
        processedChunk = new Uint8Array(chunk);
      } else if (chunk instanceof DataView) {
        processedChunk = new Uint8Array(chunk.buffer);
      } else if (chunk instanceof Int8Array || chunk instanceof Int16Array ||
                 chunk instanceof Int32Array || chunk instanceof Uint8ClampedArray ||
                 chunk instanceof Uint16Array || chunk instanceof Uint32Array ||
                 chunk instanceof Float32Array || chunk instanceof Float64Array) {
        processedChunk = new Uint8Array(chunk.buffer);
      } else if (typeof chunk === 'string') {
        processedChunk = new TextEncoder().encode(chunk);
      } else {
        throw new Error('Unsupported chunk type: ' + (chunk ? chunk.constructor.name : typeof chunk));
      }

      processedChunks.push(processedChunk);
    }
  }

  return new MockBlob(processedChunks, options);
}

// Mock BlobEvent
export class MockBlobEvent extends Event implements BlobEvent {
  readonly data: Blob
  readonly timecode: number

  constructor(type: string, eventInitDict: BlobEventInit) {
    super(type)
    this.data = eventInitDict.data
    this.timecode = eventInitDict.timecode ?? 0
  }
}

// Mock MediaRecorder
export class MockMediaRecorder extends EventTarget implements MediaRecorder {
  stream: MediaStream
  state: RecordingState = 'inactive'
  mimeType = 'audio/webm'
  videoBitsPerSecond = 0
  audioBitsPerSecond = 128000

  ondataavailable: ((event: BlobEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onpause: ((event: Event) => void) | null = null
  onresume: ((event: Event) => void) | null = null
  onstart: ((event: Event) => void) | null = null
  onstop: ((event: Event) => void) | null = null

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    super()
    this.stream = stream
    if (options?.mimeType) {
      this.mimeType = options.mimeType
    }
    if (options?.audioBitsPerSecond) {
      this.audioBitsPerSecond = options.audioBitsPerSecond
    }
    if (options?.videoBitsPerSecond) {
      this.videoBitsPerSecond = options.videoBitsPerSecond
    }
  }

  start(timeslice?: number) {
    this.state = 'recording'
    if (this.onstart) {
      this.onstart(new Event('start'))
    }
    if (timeslice && timeslice > 0) {
      setInterval(() => this.requestData(), timeslice)
    }
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) {
      this.onstop(new Event('stop'))
    }
  }

  pause() {
    this.state = 'paused'
    if (this.onpause) {
      this.onpause(new Event('pause'))
    }
  }

  resume() {
    this.state = 'recording'
    if (this.onresume) {
      this.onresume(new Event('resume'))
    }
  }

  requestData() {
    if (this.ondataavailable) {
      const blob = new Blob([], { type: this.mimeType })
      const timecode = Date.now()
      this.ondataavailable(new MockBlobEvent('dataavailable', { data: blob, timecode }))
    }
  }

  static isTypeSupported(type: string): boolean {
    return ['audio/webm', 'video/webm', 'audio/mp4', 'video/mp4'].includes(type)
  }
}

// Mock AudioDestinationNode
class MockAudioDestinationNode implements AudioDestinationNode {
  context: BaseAudioContext;
  numberOfInputs: number = 1;
  numberOfOutputs: number = 0;
  channelCount: number = 2;
  channelCountMode: ChannelCountMode = 'explicit';
  channelInterpretation: ChannelInterpretation = 'speakers';
  maxChannelCount: number = 2;

  constructor(context: BaseAudioContext) {
    this.context = context;
  }

  connect(): AudioNode { return this; }
  disconnect(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }
}

// Mock AudioContext
export class MockAudioContext implements AudioContext {
  baseLatency: number = 0.005;
  outputLatency: number = 0.005;
  audioWorklet: AudioWorklet = {} as AudioWorklet;
  currentTime: number = 0;
  destination: AudioDestinationNode;
  listener: AudioListener = {} as AudioListener;
  sampleRate: number = 44100;
  state: AudioContextState = 'running';
  onstatechange: ((this: BaseAudioContext, ev: Event) => any) | null = null;

  constructor() {
    this.destination = new MockAudioDestinationNode(this as unknown as BaseAudioContext);
  }

  createAnalyser(): AnalyserNode {
    const analyser = {
      context: this as unknown as BaseAudioContext,
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
      channelCountMode: 'max' as ChannelCountMode,
      channelInterpretation: 'speakers' as ChannelInterpretation,
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      connect: () => analyser,
      disconnect: () => {},
      getFloatFrequencyData: () => {},
      getByteFrequencyData: () => {},
      getFloatTimeDomainData: () => {},
      getByteTimeDomainData: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    };
    return analyser as unknown as AnalyserNode;
  }

  createScriptProcessor(
    bufferSize: number = 4096,
    numberOfInputChannels: number = 1
  ): ScriptProcessorNode {
    const processor = {
      context: this as unknown as BaseAudioContext,
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: numberOfInputChannels,
      channelCountMode: 'max' as ChannelCountMode,
      channelInterpretation: 'speakers' as ChannelInterpretation,
      bufferSize,
      connect: () => processor,
      disconnect: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      onaudioprocess: null
    };
    return processor as unknown as ScriptProcessorNode;
  }

  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode {
    const source = {
      context: this as unknown as BaseAudioContext,
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 2,
      channelCountMode: 'max' as ChannelCountMode,
      channelInterpretation: 'speakers' as ChannelInterpretation,
      connect: () => source,
      disconnect: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      mediaStream: stream
    };
    return source as unknown as MediaStreamAudioSourceNode;
  }

  createMediaElementSource(element: HTMLMediaElement): MediaElementAudioSourceNode {
    const source = {
      context: this as unknown as BaseAudioContext,
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 2,
      channelCountMode: 'max' as ChannelCountMode,
      channelInterpretation: 'speakers' as ChannelInterpretation,
      connect: () => source,
      disconnect: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      mediaElement: element
    };
    return source as unknown as MediaElementAudioSourceNode;
  }

  createMediaStreamDestination(): MediaStreamAudioDestinationNode {
    const destination = {
      context: this as unknown as BaseAudioContext,
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 2,
      channelCountMode: 'max' as ChannelCountMode,
      channelInterpretation: 'speakers' as ChannelInterpretation,
      connect: () => destination,
      disconnect: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      stream: new MockMediaStream()
    };
    return destination as unknown as MediaStreamAudioDestinationNode;
  }

  getOutputTimestamp(): AudioTimestamp {
    return {
      contextTime: this.currentTime,
      performanceTime: performance.now()
    };
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }

  createBuffer(): AudioBuffer { return {} as AudioBuffer; }
  createBufferSource(): AudioBufferSourceNode { return {} as AudioBufferSourceNode; }
  createConstantSource(): ConstantSourceNode { return {} as ConstantSourceNode; }
  createGain(): GainNode { return {} as GainNode; }
  createOscillator(): OscillatorNode { return {} as OscillatorNode; }
  createPanner(): PannerNode { return {} as PannerNode; }
  createDynamicsCompressor(): DynamicsCompressorNode { return {} as DynamicsCompressorNode; }
  createBiquadFilter(): BiquadFilterNode { return {} as BiquadFilterNode; }
  createWaveShaper(): WaveShaperNode { return {} as WaveShaperNode; }
  createPeriodicWave(): PeriodicWave { return {} as PeriodicWave; }
  createChannelSplitter(): ChannelSplitterNode { return {} as ChannelSplitterNode; }
  createChannelMerger(): ChannelMergerNode { return {} as ChannelMergerNode; }
  createDelay(): DelayNode { return {} as DelayNode; }
  createConvolver(): ConvolverNode { return {} as ConvolverNode; }
  createIIRFilter(): IIRFilterNode { return {} as IIRFilterNode; }
  createStereoPanner(): StereoPannerNode { return {} as StereoPannerNode; }
  decodeAudioData(): Promise<AudioBuffer> { return Promise.resolve({} as AudioBuffer); }
}

// Patch global AudioContext
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;
