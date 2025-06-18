class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.bufferSize = options.processorOptions.bufferSize || 4096;
    this.sampleRate = options.processorOptions.sampleRate || 16000;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0) {
      const inputChannel = input[0];

      // Copy input to output (optional, for monitoring)
      if (output.length > 0) {
        output[0].set(inputChannel);
      }

      // Calculate audio level for visualization
      let sum = 0;
      for (let i = 0; i < inputChannel.length; i++) {
        const sample = inputChannel[i];
        this.buffer[this.bufferIndex] = sample;
        this.bufferIndex++;
        sum += sample * sample;

        // When buffer is full, send it
        if (this.bufferIndex >= this.bufferSize) {
          // Convert to 16-bit PCM
          const pcmBuffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            // Clamp and convert to 16-bit
            const clampedSample = Math.max(-1, Math.min(1, this.buffer[j]));
            pcmBuffer[j] = Math.round(clampedSample * 32767);
          }

          // Calculate RMS for audio level
          const rms = Math.sqrt(sum / inputChannel.length);
          const level = Math.min(100, rms * 1000); // Scale for visualization

          // Send the PCM data and level
          this.port.postMessage({
            pcmData: pcmBuffer.buffer,
            level: level,
          });

          // Reset buffer
          this.bufferIndex = 0;
          this.buffer.fill(0);
        }
      }
    }

    return true; // Keep the processor alive
  }
}

registerProcessor("audio-processor", AudioProcessor);
