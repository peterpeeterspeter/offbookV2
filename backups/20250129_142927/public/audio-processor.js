class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleRate = options.processorOptions.sampleRate;
    this.bufferSize = 2048;
    this.noiseFloor = -60;
    this.attackTime = 0.003;
    this.releaseTime = 0.05;
    this.threshold = -24;
    this.ratio = 4;
    this.makeupGain = 6;

    this.lastGain = 1.0;
    this.envelope = 0;
    this.rmsHistory = new Float32Array(10);
    this.rmsIndex = 0;
  }

  calculateRMS(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return 0;

    let sum = 0;
    for (let i = 0; i < input[0].length; i++) {
      sum += input[0][i] * input[0][i];
    }
    const rms = Math.sqrt(sum / input[0].length);
    
    // Update RMS history
    this.rmsHistory[this.rmsIndex] = rms;
    this.rmsIndex = (this.rmsIndex + 1) % this.rmsHistory.length;

    // Calculate smoothed RMS
    let smoothedRMS = 0;
    for (let i = 0; i < this.rmsHistory.length; i++) {
      smoothedRMS += this.rmsHistory[i];
    }
    return smoothedRMS / this.rmsHistory.length;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length) return true;

    const rms = this.calculateRMS(inputs);
    const dbFS = 20 * Math.log10(rms);

    // Noise gate
    if (dbFS < this.noiseFloor) {
      for (let channel = 0; channel < output.length; channel++) {
        for (let i = 0; i < output[channel].length; i++) {
          output[channel][i] = 0;
        }
      }
      return true;
    }

    // Compressor
    let gainReduction = 1.0;
    if (dbFS > this.threshold) {
      const dbOverThreshold = dbFS - this.threshold;
      const compressionDb = dbOverThreshold - (dbOverThreshold / this.ratio);
      gainReduction = Math.pow(10, -compressionDb / 20);
    }

    // Envelope follower
    const attackCoeff = Math.exp(-1 / (this.sampleRate * this.attackTime));
    const releaseCoeff = Math.exp(-1 / (this.sampleRate * this.releaseTime));

    for (let channel = 0; channel < output.length; channel++) {
      for (let i = 0; i < output[channel].length; i++) {
        // Update envelope
        if (gainReduction < this.envelope) {
          this.envelope = attackCoeff * (this.envelope - gainReduction) + gainReduction;
        } else {
          this.envelope = releaseCoeff * (this.envelope - gainReduction) + gainReduction;
        }

        // Apply envelope and makeup gain
        const makeupLinear = Math.pow(10, this.makeupGain / 20);
        output[channel][i] = input[channel][i] * this.envelope * makeupLinear;
      }
    }

    // Send metrics to main thread
    this.port.postMessage({
      type: 'metrics',
      data: {
        rms: rms,
        dbFS: dbFS,
        gainReduction: 20 * Math.log10(this.envelope),
        isActive: dbFS > this.noiseFloor
      }
    });

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 