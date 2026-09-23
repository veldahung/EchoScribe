import express, { Request, Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Allow memory uploads up to 100MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function normalizeMimeType(mime: string, filename?: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('mpeg') || m.includes('mp3')) return 'audio/mp3';
  if (m.includes('wav')) return 'audio/wav';
  if (m.includes('webm')) return 'audio/webm';
  if (m.includes('ogg')) return 'audio/ogg';
  if (m.includes('m4a') || m.includes('mp4a')) return 'audio/mp4';
  if (m.includes('aac')) return 'audio/aac';
  if (m.includes('flac')) return 'audio/flac';
  if (m.includes('mp4')) return 'video/mp4';

  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'mp3') return 'audio/mp3';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'm4a') return 'audio/mp4';
    if (ext === 'webm') return 'audio/webm';
    if (ext === 'ogg') return 'audio/ogg';
    if (ext === 'aac') return 'audio/aac';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'mp4') return 'video/mp4';
  }
  return mime || 'audio/mp3';
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

// Sample demonstration recording data in case users want to test without having a file ready
const SAMPLE_DEMO_DATA = {
  title: "AI 產品開發週會 (Bilingual Product Sync: Kevin & Vivian)",
  language: "Chinese & English (Mixed)",
  duration: 48,
  summary: "Kevin 與 Vivian 討論即將上線的語音轉錄功能 (EchoScribe)。Vivian 匯報了中英文雙語以及揚聲器辨識 (Speaker Diarization) 的準確度測試結果，Kevin 建議優化 UI 標籤並準備下週的 Beta launch。",
  keyPoints: [
    "EchoScribe 中英文混合語音 (Code-switching) 辨識效果顯著提升",
    "揚聲器自動分離 (Speaker Diarization) 標籤準確率達 98%",
    "決定為下週的 Release 加入即時說話者重新命名與 SRT 字幕匯出"
  ],
  speakers: [
    {
      id: "Speaker 1",
      suggestedName: "Kevin (Product Lead)",
      description: "Male, clear confident tone, speaks English & Mandarin"
    },
    {
      id: "Speaker 2",
      suggestedName: "Vivian (AI Engineer)",
      description: "Female, energetic technical tone, bilingual specialist"
    }
  ],
  segments: [
    {
      id: "seg-1",
      speaker: "Speaker 1",
      startTime: 0.0,
      endTime: 4.8,
      text: "Good morning everyone! 歡迎大家參加今天的 sprint sync。Vivian, can you give us an update on the speech recognition model?",
      language: "mixed",
      translation: "大家早安！歡迎參加今天的衝刺會議。Vivian，可以請妳更新一下語音辨識模型的進度嗎？"
    },
    {
      id: "seg-2",
      speaker: "Speaker 2",
      startTime: 5.2,
      endTime: 12.5,
      text: "Sure Kevin! 我們剛完成了最新一輪的 benchmark。針對中英文 code-switching 還有多人會議的 speaker diarization，準確率已經突破 95% 了。",
      language: "mixed",
      translation: "當然好，Kevin！我們剛完成了最新一輪的基準測試。針對中英文混雜以及多人會議的揚聲器辨識，準確率已經突破 95% 了。"
    },
    {
      id: "seg-3",
      speaker: "Speaker 1",
      startTime: 13.0,
      endTime: 19.8,
      text: "That is fantastic news. 特別是台灣和香港用戶常常一句話裡夾雜 English technical terms，之前很容易辨識出錯。",
      language: "mixed",
      translation: "這真是太棒的消息了。特別是台灣和香港用戶常常一句話裡夾雜英文技術術語，之前很容易辨識出錯。"
    },
    {
      id: "seg-4",
      speaker: "Speaker 2",
      startTime: 20.3,
      endTime: 28.5,
      text: "Yes, exactly! 我們這次利用 Gemini 3.8 的雙語音頻注意力機制，不管是繁體中文、簡體還是英文，都能精準給出 start and end timestamps。",
      language: "mixed",
      translation: "沒錯！我們這次利用 Gemini 3.8 的雙語音頻注意力機制，不管是繁體中文、簡體還是英文，都能精準給出開始與結束時間戳記。"
    },
    {
      id: "seg-5",
      speaker: "Speaker 1",
      startTime: 29.0,
      endTime: 36.2,
      text: "Perfect. 那 UI 介面部分，請確保使用者可以一鍵修改 Speaker 的名字，並支援直接下載 SRT 和 VTT 字幕檔。",
      language: "mixed",
      translation: "太好了。那 UI 介面部分，請確保使用者可以一鍵修改發言者的名字，並支援直接下載 SRT 和 VTT 字幕檔。"
    },
    {
      id: "seg-6",
      speaker: "Speaker 2",
      startTime: 36.8,
      endTime: 44.5,
      text: "No problem at all! 我們還加入了即時音頻同步高亮，點擊任何一句對話就能跳轉到對應時間點播放。",
      language: "mixed",
      translation: "完全沒問題！我們還加入了即時音頻同步高亮，點擊任何一句對話就能跳轉到對應時間點播放。"
    },
    {
      id: "seg-7",
      speaker: "Speaker 1",
      startTime: 45.0,
      endTime: 48.0,
      text: "Awesome work! Let's get ready for the beta launch next Monday.",
      language: "en",
      translation: "太棒的工作了！讓我們為下週一的 Beta 發布做好準備。"
    }
  ]
};

// GET /api/sample-demo
app.get('/api/sample-demo', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: SAMPLE_DEMO_DATA,
  });
});

interface TranscriptionParams {
  fileBuffer?: Buffer;
  filePath?: string;
  mimeType: string;
  originalName: string;
  languageHint?: string;
  scriptStyle?: string;
  speakerCountHint?: string;
  contextPrompt?: string;
  model?: string;
}

async function executeTranscription(params: TranscriptionParams) {
  let tempFilePath: string | null = null;
  let uploadedGeminiFileName: string | null = null;

  try {
    const languageHint = params.languageHint || 'auto';
    const scriptStyle = params.scriptStyle || 'original';
    const speakerCountHint = params.speakerCountHint || 'auto';
    const contextPrompt = params.contextPrompt || '';
    const selectedModel = params.model || 'gemini-3.8-flash';
    const mimeType = params.mimeType;
    const originalName = params.originalName;

    // Construct detailed bilingual transcription prompt
    const instructions = [
      `You are a world-class speech-to-text transcription and speaker diarization engine specializing in Mandarin Chinese, Cantonese, and English, including code-switching (e.g. Chinglish, Chinese mixed with English vocabulary).`,
      `Your goal is to transcribe the provided audio/video with maximum fidelity, segment each utterance with accurate start and end timestamps (in seconds), and accurately label and distinguish each unique speaker.`,
      ``,
      `Specific Requirements:`,
      `1. SPEAKER DIARIZATION: Identify who is speaking for each segment. Assign consistent speaker identifiers (e.g., "Speaker 1", "Speaker 2", "Speaker 3"). If you detect names or roles mentioned in conversation (e.g. "Vivian", "Kevin", "Teacher", "Doctor"), set "suggestedName" accordingly. Provide an acoustic/role description in the speakers array (e.g., "Male, deeper voice, interviewer").`,
      `2. TIMESTAMPS: Provide precise "startTime" and "endTime" in seconds (floating point, e.g. 0.0, 4.8) for every segment. Do not overlap speech unnaturally.`,
      `3. VERBATIM TRANSCRIPTION: Transcribe exactly what is spoken. If speakers switch between English and Chinese mid-sentence, preserve both accurately (e.g., "我們明天要開一個 sync meeting，討論 Q3 的 KPI").`,
      `4. LANGUAGE IDENTIFICATION: For each segment, tag "language" as "zh" (Chinese), "en" (English), or "mixed".`,
      `5. TRANSLATION: For each segment, provide a natural parallel translation ("translation"): if the segment is primarily Chinese or mixed, translate into natural English; if the segment is primarily English, translate into natural Chinese (Traditional or Simplified).`,
      `6. CHINESE SCRIPT PREFERENCE: ${
        scriptStyle === 'traditional'
          ? 'Use Traditional Chinese (繁體中文) for all Chinese text.'
          : scriptStyle === 'simplified'
          ? 'Use Simplified Chinese (简体中文) for all Chinese text.'
          : 'Preserve natural script or use standard Traditional/Simplified as appropriate.'
      }`,
      languageHint !== 'auto' ? `User specified language expectation: ${languageHint}.` : `Auto-detect languages (Chinese, English, or bilingual mixed).`,
      speakerCountHint !== 'auto' ? `Expected number of speakers: ${speakerCountHint}.` : `Auto-detect the number of speakers based on distinct vocal characteristics.`,
      contextPrompt ? `Additional user glossary and context cues: "${contextPrompt}".` : '',
      `7. SUMMARY & KEY POINTS: Provide a title for the recording, an overall summary, and 3-5 bullet key points discussed in the dialogue.`
    ].filter(Boolean).join('\n');

    let audioPart: any;
    const MAX_INLINE_SIZE = 15 * 1024 * 1024;

    if (params.filePath) {
      console.log(`Uploading file from disk (${params.filePath}) via ai.files.upload...`);
      const uploadResult = await ai.files.upload({
        file: params.filePath,
        config: {
          mimeType: mimeType,
        },
      });
      uploadedGeminiFileName = uploadResult.name || null;
      audioPart = {
        fileData: {
          fileUri: uploadResult.uri,
          mimeType: uploadResult.mimeType || mimeType,
        },
      };
    } else if (params.fileBuffer) {
      if (params.fileBuffer.length <= MAX_INLINE_SIZE) {
        audioPart = {
          inlineData: {
            mimeType: mimeType,
            data: params.fileBuffer.toString('base64'),
          },
        };
      } else {
        const ext = originalName.split('.').pop() || 'mp3';
        tempFilePath = path.join(os.tmpdir(), `echoscribe-${Date.now()}.${ext}`);
        fs.writeFileSync(tempFilePath, params.fileBuffer);

        console.log(`Uploading large audio file (${(params.fileBuffer.length / 1024 / 1024).toFixed(1)}MB) via ai.files.upload...`);
        const uploadResult = await ai.files.upload({
          file: tempFilePath,
          config: {
            mimeType: mimeType,
          },
        });

        uploadedGeminiFileName = uploadResult.name || null;
        audioPart = {
          fileData: {
            fileUri: uploadResult.uri,
            mimeType: uploadResult.mimeType || mimeType,
          },
        };
      }
    } else {
      throw new Error('No audio data or file path provided for transcription.');
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Descriptive title for the audio recording in both languages if applicable"
        },
        language: {
          type: Type.STRING,
          description: "Detected primary language(s), e.g. 'Chinese & English', 'Mandarin (繁體)', 'English'"
        },
        duration: {
          type: Type.NUMBER,
          description: "Total estimated duration of the audio in seconds"
        },
        summary: {
          type: Type.STRING,
          description: "Executive summary of the dialogue and content"
        },
        keyPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3 to 5 key takeaways or topics"
        },
        speakers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "e.g. 'Speaker 1'" },
              description: { type: Type.STRING, description: "Voice characteristics, tone, or role" },
              suggestedName: { type: Type.STRING, description: "Inferred person name or title if detected" }
            },
            required: ["id", "description"]
          }
        },
        segments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING, description: "Speaker ID matching speakers array" },
              startTime: { type: Type.NUMBER, description: "Start timestamp in seconds" },
              endTime: { type: Type.NUMBER, description: "End timestamp in seconds" },
              text: { type: Type.STRING, description: "Verbatim transcribed speech" },
              language: { type: Type.STRING, description: "'zh', 'en', or 'mixed'" },
              translation: { type: Type.STRING, description: "Parallel translation in the alternate language" }
            },
            required: ["speaker", "startTime", "endTime", "text"]
          }
        }
      },
      required: ["title", "language", "speakers", "segments"]
    };

    console.log(`Calling Gemini API (${selectedModel}) for transcription & speaker diarization...`);
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: [
        audioPart,
        { text: instructions }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const rawText = response.text || '{}';
    const parsedData = JSON.parse(cleanJsonText(rawText));

    // Ensure segments have IDs and non-negative timestamps
    if (Array.isArray(parsedData.segments)) {
      parsedData.segments = parsedData.segments.map((seg: any, idx: number) => ({
        id: seg.id || `seg-${idx + 1}`,
        speaker: seg.speaker || 'Speaker 1',
        startTime: typeof seg.startTime === 'number' ? Math.max(0, seg.startTime) : 0,
        endTime: typeof seg.endTime === 'number' ? Math.max(seg.startTime || 0, seg.endTime) : (seg.startTime || 0) + 2,
        text: seg.text || '',
        language: seg.language || 'mixed',
        translation: seg.translation || ''
      }));
    }

    return parsedData;
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.warn('Failed to cleanup temp file:', e);
      }
    }
    if (uploadedGeminiFileName) {
      try {
        await ai.files.delete({ name: uploadedGeminiFileName });
      } catch (e) {
        console.warn('Failed to delete uploaded file from Gemini storage:', e);
      }
    }
  }
}

// POST /api/transcribe: Standard direct upload for smaller files (<= 15MB)
app.post('/api/transcribe', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let fileBuffer: Buffer | null = null;
    let mimeType = 'audio/mp3';
    let originalName = 'audio.mp3';

    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname || 'uploaded-file';
      mimeType = normalizeMimeType(req.file.mimetype, originalName);
    } else if (req.body.base64Data) {
      const b64 = req.body.base64Data.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(b64, 'base64');
      mimeType = normalizeMimeType(req.body.mimeType || 'audio/mp3', req.body.fileName);
      originalName = req.body.fileName || 'recording.webm';
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({ error: 'No audio or video file uploaded.' });
      return;
    }

    const parsedData = await executeTranscription({
      fileBuffer,
      mimeType,
      originalName,
      languageHint: req.body.languageHint,
      scriptStyle: req.body.scriptStyle,
      speakerCountHint: req.body.speakerCountHint,
      contextPrompt: req.body.contextPrompt,
      model: req.body.model,
    });

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to transcribe audio. Please check the file and try again.',
    });
  }
});

// POST /api/transcribe-chunk: Chunked upload handler for large audio/video files
// Bypasses any 32MB single-request proxy/Cloud Run limits by streaming 5MB slices
app.post('/api/transcribe-chunk', upload.single('chunk'), async (req: Request, res: Response) => {
  const {
    uploadId,
    chunkIndex,
    totalChunks,
    isLast,
    originalFileName,
    mimeType,
    languageHint,
    scriptStyle,
    speakerCountHint,
    contextPrompt,
    model,
  } = req.body;

  if (!uploadId) {
    res.status(400).json({ error: 'Missing uploadId for chunked upload.' });
    return;
  }

  if (!req.file || !req.file.buffer) {
    res.status(400).json({ error: 'Missing chunk file buffer.' });
    return;
  }

  const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
  const tempChunkPath = path.join(os.tmpdir(), `echoscribe-chunk-${safeUploadId}.tmp`);

  try {
    // Append this chunk to the temporary file on disk
    fs.appendFileSync(tempChunkPath, req.file.buffer);

    if (isLast !== 'true') {
      res.json({
        success: true,
        chunkReceived: parseInt(chunkIndex, 10),
      });
      return;
    }

    // All chunks received, assemble and transcribe
    const stats = fs.statSync(tempChunkPath);
    console.log(`All chunks received for ${safeUploadId}. Assembled size: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);

    const result = await executeTranscription({
      filePath: tempChunkPath,
      mimeType: normalizeMimeType(mimeType || 'audio/mp3', originalFileName),
      originalName: originalFileName || 'audio.mp3',
      languageHint: languageHint || 'auto',
      scriptStyle: scriptStyle || 'original',
      speakerCountHint: speakerCountHint || 'auto',
      contextPrompt: contextPrompt || '',
      model: model || 'gemini-3.8-flash',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Chunk upload/transcription error:', err);
    res.status(500).json({ error: err?.message || 'Failed processing chunked upload.' });
  } finally {
    if (isLast === 'true' && fs.existsSync(tempChunkPath)) {
      try {
        fs.unlinkSync(tempChunkPath);
      } catch (e) {
        console.warn('Could not remove temporary chunk file:', e);
      }
    }
  }
});

// POST /api/generate-demo-audio: Synthesizes a demo 2-speaker audio using Gemini TTS
app.post('/api/generate-demo-audio', async (req: Request, res: Response) => {
  try {
    console.log('Generating bilingual sample audio using Gemini TTS...');
    const prompt = `TTS the following bilingual conversation between Joe and Jane:
Joe: Good morning Jane! Did you check the new bilingual transcription feature?
Jane: Yes Joe! 辨識中英文與揚聲器標籤的效果非常驚人，準確率很高！
Joe: That's great! Let's release the update today.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Joe',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
              {
                speaker: 'Jane',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: 'No audio returned from TTS generation.' });
      return;
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (err: any) {
    console.error('Demo audio generation error:', err);
    res.status(500).json({ error: err?.message || 'Could not generate demo audio.' });
  }
});

// Global error handling middleware for Multer & payload limits
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'The uploaded file exceeds the server payload limit. Please use the client-side audio compressor or select a compressed audio file.'
      });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  if (err && (err.status === 413 || err.statusCode === 413 || err.type === 'entity.too.large')) {
    return res.status(413).json({
      error: 'Payload Too Large: The request entity exceeds size limits. Browser audio compression has been enabled to prevent this.'
    });
  }
  if (err) {
    return res.status(err.status || 500).json({ error: err.message || 'An unexpected server error occurred.' });
  }
  next();
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
