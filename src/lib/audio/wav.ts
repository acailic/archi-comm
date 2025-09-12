// Minimal AudioBuffer -> WAV encoder (16-bit PCM)
// Adapted for in-repo use to avoid external dependency.

export interface WavEncodeOptions {
  float32?: boolean; // encode as 32-bit float PCM (default: false -> 16-bit PCM)
}

export function audioBufferToWav(buffer: AudioBuffer, opts: WavEncodeOptions = {}): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const float32 = !!opts.float32;

  // Gather channel data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

  // Interleave channels
  const interleaved = interleave(channels);

  // Convert to desired bit depth
  const bytesPerSample = float32 ? 4 : 2;
  const dataBuffer = float32 ? floatTo32BitPCM(interleaved) : floatTo16BitPCM(interleaved);

  // WAV header + data
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = dataBuffer.byteLength;
  const totalSize = 44 + dataSize;
  const ab = new ArrayBuffer(totalSize);
  const dv = new DataView(ab);

  // RIFF header
  writeString(dv, 0, 'RIFF');
  dv.setUint32(4, 36 + dataSize, true);
  writeString(dv, 8, 'WAVE');

  // fmt chunk
  writeString(dv, 12, 'fmt ');
  dv.setUint32(16, 16, true); // PCM chunk size
  dv.setUint16(20, float32 ? 3 : 1, true); // format: 1=PCM, 3=IEEE float
  dv.setUint16(22, numChannels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bytesPerSample * 8, true); // bits per sample

  // data chunk
  writeString(dv, 36, 'data');
  dv.setUint32(40, dataSize, true);

  // Write PCM data
  new Uint8Array(ab, 44).set(new Uint8Array(dataBuffer));
  return ab;
}

function interleave(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const length = channels[0].length;
  const result = new Float32Array(length * channels.length);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels.length; c++) {
      result[offset++] = channels[c][i];
    }
  }
  return result;
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function floatTo32BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 4);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 4) {
    view.setFloat32(offset, input[i], true);
  }
  return buffer;
}

function writeString(dv: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i));
}

