import { vi } from 'vitest'

// Mock MediaStreamTrack
export class MockMediaStreamTrack {
  enabled = true
  id = 'mock-track-id'
  kind = 'audio'
  label = 'Mock Track'
  muted = false
  readyState = 'live'

  stop = vi.fn()
  clone = vi.fn().mockReturnThis()
}

// Mock MediaStream
export class MockMediaStream {
  active = true
  id = 'mock-stream-id'
  private tracks: MockMediaStreamTrack[] = []

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.tracks = [...tracks]
  }

  addTrack(track: MockMediaStreamTrack) {
    if (!this.tracks.includes(track)) {
      this.tracks.push(track)
    }
  }

  removeTrack(track: MockMediaStreamTrack) {
    this.tracks = this.tracks.filter(t => t !== track)
  }

  getTracks() {
    return [...this.tracks]
  }

  getAudioTracks() {
    return this.tracks.filter(t => t.kind === 'audio')
  }

  getVideoTracks() {
    return this.tracks.filter(t => t.kind === 'video')
  }

  clone() {
    return new MockMediaStream(this.tracks.map(t => t.clone()))
  }
}

// Mock BlobEvent
export class MockBlobEvent extends Event {
  readonly data: Blob

  constructor(type: string, eventInitDict: { data: Blob }) {
    super(type)
    this.data = eventInitDict.data
  }
}

// Mock MediaRecorder
export class MockMediaRecorder {
  static isTypeSupported(type: string): boolean {
    return true
  }

  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  stream: MediaStream
  mimeType = 'audio/webm'
  audioBitsPerSecond = 128000
  videoBitsPerSecond = 2500000
  private timesliceMs?: number
  private dataAvailableTimer?: number

  ondataavailable: ((event: MockBlobEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onpause: (() => void) | null = null
  onresume: (() => void) | null = null
  onstart: (() => void) | null = null
  onstop: (() => void) | null = null

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream
    if (options?.mimeType) this.mimeType = options.mimeType
    if (options?.audioBitsPerSecond) this.audioBitsPerSecond = options.audioBitsPerSecond
    if (options?.videoBitsPerSecond) this.videoBitsPerSecond = options.videoBitsPerSecond
  }

  start(timeslice?: number) {
    this.state = 'recording'
    this.timesliceMs = timeslice
    if (this.onstart) this.onstart()

    if (this.timesliceMs) {
      this.dataAvailableTimer = window.setInterval(() => {
        this.dispatchDataAvailable()
      }, this.timesliceMs)
    }
  }

  stop() {
    if (this.dataAvailableTimer) {
      window.clearInterval(this.dataAvailableTimer)
    }
    this.state = 'inactive'
    this.dispatchDataAvailable()
    if (this.onstop) this.onstop()
  }

  pause() {
    if (this.state === 'recording') {
      this.state = 'paused'
      if (this.onpause) this.onpause()
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'recording'
      if (this.onresume) this.onresume()
    }
  }

  requestData() {
    if (this.state !== 'inactive') {
      this.dispatchDataAvailable()
    }
  }

  private dispatchDataAvailable() {
    if (this.ondataavailable) {
      const blob = new Blob([], { type: this.mimeType })
      const event = new MockBlobEvent('dataavailable', { data: blob })
      this.ondataavailable(event)
    }
  }
}

class AudioParamMock implements AudioParam {
  private _value: number;
  automationRate: AutomationRate = 'a-rate';
  defaultValue: number;
  maxValue: number = 3.4028234663852886e38;
  minValue: number = -3.4028234663852886e38;
  readonly name: string = '';
  units: string = 'number';

  constructor(defaultValue: number) {
    this._value = defaultValue;
    this.defaultValue = defaultValue;
  }

  get value(): number {
    return this._value;
  }

  set value(newValue: number) {
    this._value = newValue;
  }

  setValueAtTime(value: number, time: number): AudioParam {
    this._value = value;
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): AudioParam {
    this._value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): AudioParam {
    this._value = value;
    return this;
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number): AudioParam {
    this._value = target;
    return this;
  }

  setValueCurveAtTime(values: Float32Array, startTime: number, duration: number): AudioParam {
    this._value = values[values.length - 1];
    return this;
  }

  cancelScheduledValues(startTime: number): AudioParam {
    return this;
  }

  cancelAndHoldAtTime(cancelTime: number): AudioParam {
    return this;
  }
}

export class MockAudioContext implements AudioContext {
  readonly destination: AudioDestinationNode;
  readonly sampleRate: number = 44100;
  readonly baseLatency: number = 0.005;
  readonly outputLatency: number = 0.01;
  readonly state: AudioContextState = 'running';
  readonly audioWorklet: AudioWorklet;
  readonly currentTime: number = 0;
  readonly listener: AudioListener;
  onstatechange: ((this: BaseAudioContext, ev: Event) => any) | null = null;

  private eventListeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

  constructor() {
    this.destination = {
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      maxChannelCount: 2,
      numberOfInputs: 1,
      numberOfOutputs: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as AudioDestinationNode;

    this.audioWorklet = {
      addModule: vi.fn().mockResolvedValue(undefined),
    } as unknown as AudioWorklet;

    this.listener = {
      positionX: new AudioParamMock(0),
      positionY: new AudioParamMock(0),
      positionZ: new AudioParamMock(0),
      forwardX: new AudioParamMock(0),
      forwardY: new AudioParamMock(0),
      forwardZ: new AudioParamMock(-1),
      upX: new AudioParamMock(0),
      upY: new AudioParamMock(1),
      upZ: new AudioParamMock(0),
      setPosition: vi.fn(),
      setOrientation: vi.fn(),
    } as unknown as AudioListener;

    // Bind methods to instance
    this.createDynamicsCompressor = this.createDynamicsCompressor.bind(this);
    this.createGain = this.createGain.bind(this);
    this.createOscillator = this.createOscillator.bind(this);
    this.createAnalyser = this.createAnalyser.bind(this);
    this.createScriptProcessor = this.createScriptProcessor.bind(this);
    this.createBuffer = this.createBuffer.bind(this);
    this.createBufferSource = this.createBufferSource.bind(this);
    this.createMediaElementSource = this.createMediaElementSource.bind(this);
    this.createMediaStreamSource = this.createMediaStreamSource.bind(this);
    this.createMediaStreamDestination = this.createMediaStreamDestination.bind(this);
    this.getOutputTimestamp = this.getOutputTimestamp.bind(this);
    this.suspend = this.suspend.bind(this);
    this.resume = this.resume.bind(this);
    this.close = this.close.bind(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (!listeners) return true;

    listeners.forEach(listener => {
      if (typeof listener === 'function') {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    });

    return true;
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    const compressor = {
      threshold: new AudioParamMock(-24),
      knee: new AudioParamMock(30),
      ratio: new AudioParamMock(12),
      attack: new AudioParamMock(0.003),
      release: new AudioParamMock(0.25),
      reduction: -20,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    compressor.connect = compressor.connect.bind(compressor);
    compressor.disconnect = compressor.disconnect.bind(compressor);

    return compressor as unknown as DynamicsCompressorNode;
  }

  createGain(): GainNode {
    return {
      gain: new AudioParamMock(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return {
      frequency: new AudioParamMock(440),
      detune: new AudioParamMock(0),
      type: 'sine',
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 0,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as OscillatorNode;
  }

  createAnalyser(): AnalyserNode {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getFloatFrequencyData: vi.fn(),
      getByteFrequencyData: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as AnalyserNode;
  }

  createScriptProcessor(
    bufferSize = 4096,
    numberOfInputChannels = 2,
    numberOfOutputChannels = 2
  ): ScriptProcessorNode {
    return {
      bufferSize,
      numberOfInputs: numberOfInputChannels,
      numberOfOutputs: numberOfOutputChannels,
      onaudioprocess: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as ScriptProcessorNode;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return {
      length,
      numberOfChannels,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(length)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      playbackRate: new AudioParamMock(1),
      detune: new AudioParamMock(0),
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 0,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as AudioBufferSourceNode;
  }

  createMediaElementSource(mediaElement: HTMLMediaElement): MediaElementAudioSourceNode {
    return {
      mediaElement,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 0,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaElementAudioSourceNode;
  }

  createMediaStreamSource(mediaStream: MediaStream): MediaStreamAudioSourceNode {
    return {
      mediaStream,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 0,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaStreamAudioSourceNode;
  }

  createMediaStreamDestination(): MediaStreamAudioDestinationNode {
    return {
      stream: new MediaStream(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 0,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaStreamAudioDestinationNode;
  }

  getOutputTimestamp(): AudioTimestamp {
    return {
      contextTime: this.currentTime,
      performanceTime: performance.now(),
    };
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  decodeAudioData(
    audioData: ArrayBuffer,
    successCallback?: DecodeSuccessCallback | null,
    errorCallback?: DecodeErrorCallback | null
  ): Promise<AudioBuffer> {
    const buffer = this.createBuffer(2, 44100, 44100);

    if (successCallback) {
      successCallback(buffer);
    }

    return Promise.resolve(buffer);
  }

  createBiquadFilter(): BiquadFilterNode {
    return {
      type: 'lowpass',
      frequency: new AudioParamMock(350),
      detune: new AudioParamMock(0),
      Q: new AudioParamMock(1),
      gain: new AudioParamMock(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as BiquadFilterNode;
  }

  createChannelMerger(numberOfInputs = 6): ChannelMergerNode {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as ChannelMergerNode;
  }

  createChannelSplitter(numberOfOutputs = 6): ChannelSplitterNode {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as ChannelSplitterNode;
  }

  createConstantSource(): ConstantSourceNode {
    return {
      offset: new AudioParamMock(1),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 0,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as ConstantSourceNode;
  }

  createConvolver(): ConvolverNode {
    return {
      buffer: null,
      normalize: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as ConvolverNode;
  }

  createDelay(maxDelayTime = 1): DelayNode {
    return {
      delayTime: new AudioParamMock(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as DelayNode;
  }

  createIIRFilter(feedforward: number[], feedback: number[]): IIRFilterNode {
    return {
      getFrequencyResponse: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as IIRFilterNode;
  }

  createPanner(): PannerNode {
    return {
      positionX: new AudioParamMock(0),
      positionY: new AudioParamMock(0),
      positionZ: new AudioParamMock(0),
      orientationX: new AudioParamMock(1),
      orientationY: new AudioParamMock(0),
      orientationZ: new AudioParamMock(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      setPosition: vi.fn(),
      setOrientation: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as PannerNode;
  }

  createPeriodicWave(real: Float32Array, imag: Float32Array, constraints?: PeriodicWaveConstraints): PeriodicWave {
    return {
      real,
      imag,
    } as unknown as PeriodicWave;
  }

  createStereoPanner(): StereoPannerNode {
    return {
      pan: new AudioParamMock(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as StereoPannerNode;
  }

  createWaveShaper(): WaveShaperNode {
    return {
      curve: null,
      oversample: 'none',
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      context: this,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as WaveShaperNode;
  }
}
