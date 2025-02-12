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
  readonly data: Blob;
  readonly timecode: number;

  constructor(type: string, eventInitDict: { data: Blob; timecode?: number }) {
    super(type);
    this.data = eventInitDict.data;
    this.timecode = eventInitDict.timecode ?? 0; // Default to 0 if not provided
  }
}

// Mock MediaRecorder
export class MockMediaRecorder extends EventTarget implements MediaRecorder {
  private audioChunks: Float32Array[] = [];
  private recordingInterval: NodeJS.Timeout | null = null;
  private isReady: boolean = false;
  private initPromise: Promise<void>;
  readonly stream: MediaStream;
  state: RecordingState = 'inactive';
  mimeType: string = 'audio/wav';
  videoBitsPerSecond: number = 0;
  audioBitsPerSecond: number = 128000;

  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onpause: ((event: Event) => void) | null = null;
  onresume: ((event: Event) => void) | null = null;
  onstart: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    super();
    this.stream = stream;
    if (options?.mimeType) {
      this.mimeType = options.mimeType;
    }
    if (options?.audioBitsPerSecond) {
      this.audioBitsPerSecond = options.audioBitsPerSecond;
    }
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 10));
    this.isReady = true;
  }

  async waitForReady(): Promise<void> {
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('MediaRecorder not ready')), 500);
    });

    try {
      await Promise.race([this.initPromise, timeoutPromise]);
    } catch (error) {
      this.isReady = false;
      throw error;
    }
  }

  async start(timeslice?: number): Promise<void> {
    await this.waitForReady();
    if (this.state !== 'inactive') {
      this.state = 'inactive';
      this.stop();
    }

    this.state = 'recording';
    this.audioChunks = [];

    const event = new Event('start');
    this.dispatchEvent(event);
    if (this.onstart) this.onstart(event);

    const chunkInterval = timeslice || 1000;
    this.recordingInterval = setInterval(() => {
      if (this.state !== 'recording') return;

      const chunk = this.generateAudioChunk(chunkInterval);
      this.audioChunks.push(chunk);

      const audioBuffer = this.convertToAudioBuffer(chunk);
      const event = new MockBlobEvent('dataavailable', {
        data: new MockBlob([audioBuffer], { type: this.mimeType }),
        timecode: Date.now()
      });
      this.dispatchEvent(event);
      if (this.ondataavailable) this.ondataavailable(event);
    }, chunkInterval);
  }

  private generateAudioChunk(duration: number): Float32Array {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * (duration / 1000));
    const frequency = 440;
    const audioData = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }

    return audioData;
  }

  private convertToAudioBuffer(float32Data: Float32Array): ArrayBuffer {
    // Convert Float32Array to Int16Array
    const int16Data = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV header
    const numChannels = 1;
    const sampleRate = 44100;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const subchunk2Size = int16Data.length * 2;
    const chunkSize = 36 + subchunk2Size;

    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // "RIFF" chunk descriptor
    view.setUint8(0, 0x52); // 'R'
    view.setUint8(1, 0x49); // 'I'
    view.setUint8(2, 0x46); // 'F'
    view.setUint8(3, 0x46); // 'F'
    view.setUint32(4, chunkSize, true);
    view.setUint8(8, 0x57); // 'W'
    view.setUint8(9, 0x41); // 'A'
    view.setUint8(10, 0x56); // 'V'
    view.setUint8(11, 0x45); // 'E'

    // "fmt " sub-chunk
    view.setUint8(12, 0x66); // 'f'
    view.setUint8(13, 0x6D); // 'm'
    view.setUint8(14, 0x74); // 't'
    view.setUint8(15, 0x20); // ' '
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    view.setUint8(36, 0x64); // 'd'
    view.setUint8(37, 0x61); // 'a'
    view.setUint8(38, 0x74); // 't'
    view.setUint8(39, 0x61); // 'a'
    view.setUint32(40, subchunk2Size, true);

    // Combine header and data
    const combinedBuffer = new ArrayBuffer(header.byteLength + int16Data.buffer.byteLength);
    const combinedArray = new Uint8Array(combinedBuffer);
    combinedArray.set(new Uint8Array(header), 0);
    combinedArray.set(new Uint8Array(int16Data.buffer), header.byteLength);

    return combinedBuffer;
  }

  stop(): void {
    if (this.state === 'inactive') return;

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    // Combine all chunks into one Float32Array
    const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to WAV format
    const audioBuffer = this.convertToAudioBuffer(combinedData);
    const finalBlob = new MockBlob([audioBuffer], { type: this.mimeType });

    const dataEvent = new MockBlobEvent('dataavailable', {
      data: finalBlob,
      timecode: Date.now()
    });
    this.dispatchEvent(dataEvent);
    if (this.ondataavailable) this.ondataavailable(dataEvent);

    this.state = 'inactive';
    const stopEvent = new Event('stop');
    this.dispatchEvent(stopEvent);
    if (this.onstop) this.onstop(stopEvent);
  }

  pause(): void {
    if (this.state !== 'recording') return;
    this.state = 'paused';
    const event = new Event('pause');
    this.dispatchEvent(event);
    if (this.onpause) this.onpause(event);
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'recording';
    const event = new Event('resume');
    this.dispatchEvent(event);
    if (this.onresume) this.onresume(event);
  }

  requestData(): void {
    if (this.state === 'inactive') return;

    const chunk = this.generateAudioChunk(100); // Generate a small chunk
    const audioBuffer = this.convertToAudioBuffer(chunk);
    const event = new MockBlobEvent('dataavailable', {
      data: new MockBlob([audioBuffer], { type: this.mimeType }),
      timecode: Date.now()
    });
    this.dispatchEvent(event);
    if (this.ondataavailable) this.ondataavailable(event);
  }

  static isTypeSupported(type: string): boolean {
    return type === 'audio/wav';
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

// Mock AudioContext
export class MockAudioContext {
  sampleRate: number = 44100;

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // Convert the WAV data to Float32Array
    const dataView = new DataView(arrayBuffer);
    const numChannels = 1;
    const sampleRate = 44100;
    const bitsPerSample = 16;
    const headerLength = 44; // WAV header length
    const dataLength = (arrayBuffer.byteLength - headerLength) / (bitsPerSample / 8);
    const audioData = new Float32Array(dataLength);

    // Skip WAV header and read PCM data
    for (let i = 0; i < dataLength; i++) {
      const index = headerLength + (i * (bitsPerSample / 8));
      const sample = dataView.getInt16(index, true);
      audioData[i] = sample / 0x8000; // Convert to float in range [-1, 1]
    }

    return {
      sampleRate,
      length: audioData.length,
      duration: audioData.length / sampleRate,
      numberOfChannels: numChannels,
      getChannelData: (channel: number) => {
        if (channel === 0) return audioData;
        throw new Error('Invalid channel index');
      }
    } as AudioBuffer;
  }
}

// Patch global AudioContext
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;

// Export cleanup function to restore original Blob
export function restoreBlob() {
  globalThis.Blob = originalBlob;
}
