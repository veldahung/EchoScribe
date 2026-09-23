import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Mic,
  MicOff,
  Sparkles,
  Settings2,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { TranscribeOptions } from '../types/transcript';
import { isCompressionRecommended } from '../utils/audioCompressor';

interface UploadSectionProps {
  onTranscribe: (file: File | null, base64Data: string | null, options: TranscribeOptions) => Promise<void>;
  onLoadSample: () => void;
  isLoading: boolean;
  loadingStep: string;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onTranscribe,
  onLoadSample,
  isLoading,
  loadingStep,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Microphone recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Settings & Options
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [options, setOptions] = useState<TranscribeOptions>({
    languageHint: 'auto',
    scriptStyle: 'original',
    speakerCountHint: 'auto',
    contextPrompt: '',
    model: 'gemini-3.8-flash',
    includeTranslations: true,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setRecordedAudioBlob(null);
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        setSelectedFile(null);
        const url = URL.createObjectURL(audioBlob);
        setFilePreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check browser permissions.');
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedFile) {
      await onTranscribe(selectedFile, null, options);
    } else if (recordedAudioBlob) {
      // Convert recorded blob to file
      const file = new File([recordedAudioBlob], `mic-recording-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      await onTranscribe(file, null, options);
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Top Banner / Sample Prompt */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>AI Bilingual Audio Transcription</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
              Speaker Diarization
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Transcribe Chinese & English speech with precise speaker separation, timestamps, and translations.
          </p>
        </div>

        <button
          onClick={onLoadSample}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all text-xs font-semibold cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Load Demo Meeting (Kevin & Vivian)</span>
        </button>
      </div>

      {/* Main Dropzone / Recording Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop Zone */}
        <div className="md:col-span-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/mp4,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
              dragActive
                ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-950/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
            }`}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-white text-sm">{selectedFile.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click or drag to replace
                  </p>
                  {isCompressionRecommended(selectedFile) ? (
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Auto-extracting audio track (prevents 413 network limits)
                    </span>
                  ) : selectedFile.size > 15 * 1024 * 1024 ? (
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      5MB Chunked streaming enabled (bypasses 413 limits)
                    </span>
                  ) : null}
                </div>
              </div>
            ) : recordedAudioBlob ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Microphone Recording Ready</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(recordedAudioBlob.size / 1024).toFixed(1)} KB · Recorded via browser
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">
                    Drag and drop your audio or video file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports MP3, WAV, M4A, AAC, WEBM, OGG, FLAC, MP4 (with 5MB chunked streaming & video audio extraction)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Record & Audio Preview */}
        <div className="flex flex-col justify-between p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              <span>Record Live Voice</span>
            </h3>

            {isRecording ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-center animate-pulse">
                <div className="flex items-center justify-center gap-2 text-rose-400 font-mono text-lg font-bold">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block animate-ping" />
                  <span>{formatSecs(recordingDuration)}</span>
                </div>
                <p className="text-xs text-rose-300/80 mt-1">Recording speech... Speak Chinese or English</p>
                <button
                  onClick={stopRecording}
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop Recording</span>
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Record a conversation or speech turn right now with your microphone to test bilingual diarization.
                </p>
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-indigo-400" />
                  <span>Start Microphone</span>
                </button>
              </div>
            )}
          </div>

          {/* Audio preview if file or recording is loaded */}
          {filePreviewUrl && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-[11px] font-mono text-slate-400 mb-1.5">Audio Preview:</p>
              <audio src={filePreviewUrl} controls className="w-full h-8 accent-indigo-500" />
            </div>
          )}
        </div>
      </div>

      {/* Options Accordion Toggle */}
      <div className="mt-5">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{showSettings ? 'Hide Transcription Settings' : 'Advanced Settings (Language, Script, Speakers, Context)'}</span>
        </button>

        {showSettings && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Language Hint */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Language Mode</label>
              <select
                value={options.languageHint}
                onChange={(e) => setOptions({ ...options, languageHint: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-hidden"
              >
                <option value="auto">Auto Detect (Bilingual/Mixed)</option>
                <option value="mixed">Mixed Chinese & English (Code-Switching)</option>
                <option value="zh">Chinese (Mandarin / 普通話)</option>
                <option value="en">English Only</option>
              </select>
            </div>

            {/* Script Style */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Chinese Script Style</label>
              <select
                value={options.scriptStyle}
                onChange={(e) => setOptions({ ...options, scriptStyle: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-hidden"
              >
                <option value="original">Original Spoken Natural</option>
                <option value="traditional">Traditional Chinese (繁體中文)</option>
                <option value="simplified">Simplified Chinese (简体中文)</option>
              </select>
            </div>

            {/* Speaker Count Hint */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Speaker Count Hint</label>
              <select
                value={options.speakerCountHint}
                onChange={(e) => setOptions({ ...options, speakerCountHint: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-hidden"
              >
                <option value="auto">Auto Detect Speakers</option>
                <option value="2">2 Speakers (Interview / Sync)</option>
                <option value="3">3 Speakers</option>
                <option value="4+">4+ Speakers (Panel / Meeting)</option>
              </select>
            </div>

            {/* Vocabulary & Context */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-slate-300 font-medium mb-1">
                Context & Glossary (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Company names, person names, technical jargon (e.g. EchoScribe, OKR, Kubernetes, Vivian)"
                value={options.contextPrompt}
                onChange={(e) => setOptions({ ...options, contextPrompt: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit / Transcribe Action Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Powered by Gemini Multimodal Speech Attention with zero latency diarization</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={(!selectedFile && !recordedAudioBlob) || isLoading}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
            isLoading
              ? 'bg-indigo-700/50 text-indigo-200 cursor-not-allowed'
              : !selectedFile && !recordedAudioBlob
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
              <span>{loadingStep || 'Transcribing...'}</span>
            </>
          ) : (
            <>
              <FileAudio className="w-4 h-4" />
              <span>Transcribe & Label Speakers</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
