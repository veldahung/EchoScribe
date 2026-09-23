import { TranscribeOptions, TranscriptData } from '../types/transcript';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per slice to comfortably stay well under 32MB proxies

export async function uploadFileInChunks(
  file: File,
  options: TranscribeOptions,
  onProgress: (statusMessage: string) => void
): Promise<TranscriptData> {
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  onProgress(`Preparing chunked transfer (${totalChunks} parts, ${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);
    const isLast = index === totalChunks - 1;

    const percent = Math.round(((index + 1) / totalChunks) * 100);
    onProgress(`Uploading audio chunk ${index + 1} of ${totalChunks} (${percent}%)...`);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(index));
    formData.append('totalChunks', String(totalChunks));
    formData.append('isLast', isLast ? 'true' : 'false');
    formData.append('chunk', chunkBlob, file.name);

    if (isLast) {
      formData.append('languageHint', options.languageHint);
      formData.append('scriptStyle', options.scriptStyle);
      formData.append('speakerCountHint', options.speakerCountHint);
      formData.append('contextPrompt', options.contextPrompt);
      formData.append('model', options.model);
      formData.append('originalFileName', file.name);
      formData.append('mimeType', file.type || 'audio/mp3');

      onProgress('All chunks uploaded! Analyzing speech & diarizing speakers with Gemini...');
    }

    const response = await fetch('/api/transcribe-chunk', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error || `Chunk ${index + 1}/${totalChunks} upload failed with status ${response.status}`
      );
    }

    if (isLast) {
      const resJson = await response.json();
      if (!resJson.success || !resJson.data) {
        throw new Error(resJson.error || 'Failed to complete transcription from chunked upload.');
      }
      return resJson.data;
    }
  }

  throw new Error('Upload loop ended without receiving final response.');
}
