/**
 * Audio optimization & extraction utility.
 * Extracts audio from large video files and ensures speech-optimized sample rates.
 * NOTE: Never convert already compressed formats (MP3/M4A/AAC/OGG) to WAV as that expands file size!
 */

export function isCompressionRecommended(file: File): boolean {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|m4v|mov|mkv|webm|avi)$/i.test(file.name);
  const isLargeWav = (file.type.includes('wav') || file.name.endsWith('.wav')) && file.size > 15 * 1024 * 1024;

  // Only compress video files (to strip video streams) or oversized uncompressed WAVs
  return isVideo || isLargeWav;
}

export async function compressAudioForSpeech(
  file: File,
  onProgress?: (message: string) => void
): Promise<{ file: File; originalSize: number; newSize: number; duration: number }> {
  const originalSize = file.size;

  if (onProgress) {
    onProgress(`Extracting audio track from ${file.name} (${(originalSize / (1024 * 1024)).toFixed(1)} MB)...`);
  }

  const arrayBuffer = await file.arrayBuffer();

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    return { file, originalSize, newSize: originalSize, duration: 0 };
  }

  const audioCtx = new AudioContextClass();
  let decodedBuffer: AudioBuffer;

  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (decodeErr) {
    console.warn('Web Audio decode failed for file, using original:', decodeErr);
    await audioCtx.close().catch(() => {});
    return { file, originalSize, newSize: originalSize, duration: 0 };
  } finally {
    await audioCtx.close().catch(() => {});
  }

  const duration = decodedBuffer.duration;

  // Calculate target sample rate such that the resulting WAV is guaranteed to be <= 12 MB
  // Formula: duration * targetSampleRate * 2 bytes <= 12 MB
  const maxBytes = 12 * 1024 * 1024;
  const calculatedRate = Math.floor(maxBytes / (Math.max(1, duration) * 2));
  // Bound sample rate between 8,000 Hz (telephony standard) and 16,000 Hz (speech recognition standard)
  const targetSampleRate = Math.min(16000, Math.max(8000, calculatedRate));
  const targetLength = Math.max(1, Math.ceil(duration * targetSampleRate));

  if (onProgress) {
    onProgress(`Optimizing voice track (mono ${targetSampleRate} Hz, ${(duration / 60).toFixed(1)} min)...`);
  }

  const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(1, targetLength, targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);

  if (onProgress) {
    onProgress('Creating compact audio container...');
  }

  const wavBlob = encode16BitPcmWav(channelData, targetSampleRate);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const compressedFile = new File([wavBlob], `${baseName}-audio.wav`, {
    type: 'audio/wav',
  });

  return {
    file: compressedFile,
    originalSize,
    newSize: compressedFile.size,
    duration,
  };
}

function encode16BitPcmWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = samples[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    const intVal = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intVal, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
