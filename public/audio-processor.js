class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.effects = {
      gain: 1.0,
      echo: {
        delay: 0.5,
        feedback: 0.5,
      },
      reverb: 0.0,
      filter: {
        frequency: 1000,
        Q: 1.0,
        type: "lowpass",
      },
    };

    this.delayBuffer = new Float32Array(48000); // 1 second delay buffer at 48kHz
    this.delayWriteIndex = 0;
    this.delayReadIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === "updateEffects") {
        this.effects = event.data.effects;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output) return true;

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; i++) {
        // Apply gain
        let sample = inputChannel[i] * this.effects.gain;

        // Apply echo
        const delayTime = Math.floor(this.effects.echo.delay * sampleRate);
        this.delayReadIndex = this.delayWriteIndex - delayTime;
        if (this.delayReadIndex < 0) {
          this.delayReadIndex += this.delayBuffer.length;
        }

        sample +=
          this.delayBuffer[this.delayReadIndex] * this.effects.echo.feedback;
        this.delayBuffer[this.delayWriteIndex] = sample;

        this.delayWriteIndex =
          (this.delayWriteIndex + 1) % this.delayBuffer.length;

        // Apply reverb (simple implementation)
        if (this.effects.reverb > 0) {
          const reverbDelay = Math.floor(0.1 * sampleRate); // 100ms reverb
          const reverbIndex =
            (this.delayWriteIndex - reverbDelay + this.delayBuffer.length) %
            this.delayBuffer.length;
          sample += this.delayBuffer[reverbIndex] * this.effects.reverb;
        }

        // Apply filter
        if (this.effects.filter.type === "lowpass") {
          const rc = 1.0 / (2.0 * Math.PI * this.effects.filter.frequency);
          const dt = 1.0 / sampleRate;
          const alpha = dt / (rc + dt);
          sample =
            sample * alpha +
            (i > 0 ? outputChannel[i - 1] : sample) * (1.0 - alpha);
        }

        outputChannel[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
