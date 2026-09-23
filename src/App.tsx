import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  Sparkles,
  Download,
  Languages,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  Headphones,
  RotateCcw
} from 'lucide-react';
import { TranscriptData, TranscribeOptions, Segment, Speaker } from './types/transcript';
import { AudioPlayer } from './components/AudioPlayer';
import { SpeakerDiarizationStats } from './components/SpeakerDiarizationStats';
import { TranscriptSegment } from './components/TranscriptSegment';
import { UploadSection } from './components/UploadSection';
import { SummarySection } from './components/SummarySection';
import { ExportModal } from './components/ExportModal';
import { compressAudioForSpeech, isCompressionRecommended } from './utils/audioCompressor';
import { uploadFileInChunks } from './utils/chunkUploader';

export default function App() {
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & display preferences
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<string | null>(null);
  const [showGlobalTranslations, setShowGlobalTranslations] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle Audio File Transcription
  const handleTranscribe = async (
    file: File | null,
    base64Data: string | null,
    options: TranscribeOptions
  ) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      let fileToUpload = file;
      let localAudioUrl: string | null = null;

      // Extract audio track if file is video or oversized raw WAV
      if (file && isCompressionRecommended(file)) {
        setLoadingStep('Extracting and optimizing audio track in browser...');
        try {
          const compResult = await compressAudioForSpeech(file, (msg) => setLoadingStep(msg));
          fileToUpload = compResult.file;
          console.log(
            `Extracted audio: ${(compResult.originalSize / 1024 / 1024).toFixed(1)}MB -> ${(compResult.newSize / 1024 / 1024).toFixed(1)}MB`
          );
        } catch (compErr) {
          console.warn('Audio extraction skipped, uploading original:', compErr);
        }
      }

      if (fileToUpload) {
        localAudioUrl = URL.createObjectURL(fileToUpload);
      }

      let parsedData: TranscriptData;

      // For files over 15MB, use chunked upload (5MB slices) to guarantee no 413 HTTP limits
      if (fileToUpload && fileToUpload.size > 15 * 1024 * 1024) {
        parsedData = await uploadFileInChunks(fileToUpload, options, (step) => setLoadingStep(step));
      } else {
        // Direct single upload for files <= 15MB or mic recordings
        setLoadingStep('Uploading audio payload...');

        const formData = new FormData();
        if (fileToUpload) {
          formData.append('file', fileToUpload);
        } else if (file) {
          formData.append('file', file);
          localAudioUrl = URL.createObjectURL(file);
        } else if (base64Data) {
          formData.append('base64Data', base64Data);
          formData.append('mimeType', 'audio/webm');
        }

        formData.append('languageHint', options.languageHint);
        formData.append('scriptStyle', options.scriptStyle);
        formData.append('speakerCountHint', options.speakerCountHint);
        formData.append('contextPrompt', options.contextPrompt);
        formData.append('model', options.model);

        setLoadingStep('Analyzing bilingual audio with Gemini speech intelligence...');

        const stepTimer1 = setTimeout(() => {
          setLoadingStep('Diarizing speakers & isolating voice characteristics...');
        }, 3500);

        const stepTimer2 = setTimeout(() => {
          setLoadingStep('Transcribing Chinese & English utterances with timestamps...');
        }, 7000);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);

        if (!response.ok) {
          // If server or proxy returned 413, automatically fall back to chunked upload if we have a file
          if (response.status === 413 && fileToUpload) {
            console.warn('Server responded with 413, auto-retrying via chunked streaming...');
            setLoadingStep('Single payload exceeded network limit. Streaming via 5MB chunked upload...');
            parsedData = await uploadFileInChunks(fileToUpload, options, (step) => setLoadingStep(step));
          } else {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error || `Server responded with status ${response.status}`);
          }
        } else {
          const resData = await response.json();
          if (!resData.success || !resData.data) {
            throw new Error(resData.error || 'Failed to parse transcription response.');
          }
          parsedData = resData.data;
        }
      }

      setTranscriptData(parsedData);
      if (localAudioUrl) {
        setAudioUrl(localAudioUrl);
      }
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(err.message || 'An error occurred during transcription. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Generate lightweight synthetic audio tone track for demo if needed
  const createSyntheticDemoAudio = (durationSec = 48): string => {
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSec;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate gentle speech-like rhythmic pulse
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const cadence = Math.sin(2 * Math.PI * 2.5 * t);
      const tone1 = Math.sin(2 * Math.PI * 240 * t);
      const tone2 = Math.sin(2 * Math.PI * 480 * t);
      const sample = Math.floor(((tone1 + 0.4 * tone2) * Math.max(0, cadence) * 0.15) * 32767);
      view.setInt16(44 + i * 2, sample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  // Load Demonstration Dataset
  const handleLoadSample = async () => {
    try {
      setIsLoading(true);
      setLoadingStep('Loading bilingual meeting demonstration...');

      const response = await fetch('/api/sample-demo');
      const data = await response.json();

      if (data.success && data.data) {
        setTranscriptData(data.data);
        const demoAudioUrl = createSyntheticDemoAudio(data.data.duration || 48);
        setAudioUrl(demoAudioUrl);
        setCurrentTime(0);
        setIsPlaying(false);
      }
    } catch (err: any) {
      console.error('Error loading sample:', err);
      setErrorMessage('Could not load sample data.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Rename a Speaker globally across the entire transcript
  const handleRenameSpeaker = (speakerId: string, newName: string) => {
    if (!transcriptData) return;

    const updatedSpeakers = transcriptData.speakers.map((spk) => {
      if (spk.id === speakerId) {
        return { ...spk, name: newName };
      }
      return spk;
    });

    setTranscriptData({
      ...transcriptData,
      speakers: updatedSpeakers,
    });
  };

  // Update text of a specific segment
  const handleUpdateSegmentText = (segmentId: string, newText: string) => {
    if (!transcriptData) return;

    const updatedSegments = transcriptData.segments.map((seg) => {
      if (seg.id === segmentId) {
        return { ...seg, text: newText };
      }
      return seg;
    });

    setTranscriptData({
      ...transcriptData,
      segments: updatedSegments,
    });
  };

  // Determine active segment index based on current playback time
  const activeSegmentId = useMemo(() => {
    if (!transcriptData) return null;
    const found = transcriptData.segments.find(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );
    return found ? found.id : null;
  }, [transcriptData, currentTime]);

  // Filtered segments based on search query and speaker filter
  const filteredSegments = useMemo(() => {
    if (!transcriptData) return [];
    return transcriptData.segments.filter((seg) => {
      // Speaker filter
      if (selectedSpeakerFilter && seg.speaker !== selectedSpeakerFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = seg.text.toLowerCase().includes(q);
        const matchesTranslation = seg.translation?.toLowerCase().includes(q);
        const speaker = transcriptData.speakers.find((s) => s.id === seg.speaker);
        const matchesSpeakerName =
          (speaker?.name || speaker?.suggestedName || seg.speaker).toLowerCase().includes(q);
        return matchesText || matchesTranslation || matchesSpeakerName;
      }
      return true;
    });
  }, [transcriptData, selectedSpeakerFilter, searchQuery]);

  const handleReset = () => {
    setTranscriptData(null);
    setAudioUrl(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setSearchQuery('');
    setSelectedSpeakerFilter(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">
                  EchoScribe
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Bilingual AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Chinese & English Speech Diarization Workstation
              </p>
            </div>
          </div>

          {/* Nav Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {transcriptData && (
              <>
                <button
                  onClick={() => setIsExportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export (SRT/TXT/VTT)</span>
                  <span className="sm:hidden">Export</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>New File</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Transcription Error</h4>
                <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-rose-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!transcriptData ? (
          /* View 1: Uploader & Landing Showcase */
          <div className="space-y-8 animate-in fade-in duration-300">
            <UploadSection
              onTranscribe={handleTranscribe}
              onLoadSample={handleLoadSample}
              isLoading={isLoading}
              loadingStep={loadingStep}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                  <Languages className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">
                  Mixed Code-Switching (中英夾雜)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Seamlessly handles natural conversations switching between Mandarin Chinese, Cantonese, and English within single sentences.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">
                  Automatic Speaker Diarization
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Identifies multiple speakers by acoustic traits, assigns unique colors, calculates talk-time distribution, and lets you rename anyone in 1 click.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">
                  Subtitles & Dialogue Export
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Synchronized audio scrubber with live speech highlighting. Export directly to industry-standard SRT, VTT, TXT, CSV, and JSON.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* View 2: Active Transcription Workstation */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Sticky / Synchronized Audio Player */}
            {audioUrl && (
              <AudioPlayer
                audioUrl={audioUrl}
                segments={transcriptData.segments}
                speakers={transcriptData.speakers}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                onSeek={(time) => {
                  setCurrentTime(time);
                  setIsPlaying(true);
                }}
                isPlaying={isPlaying}
                onPlayPauseToggle={setIsPlaying}
                audioDuration={transcriptData.duration}
              />
            )}

            {/* Executive Summary & Insights */}
            <SummarySection data={transcriptData} />

            {/* Speaker Diarization Stats Panel */}
            <SpeakerDiarizationStats
              speakers={transcriptData.speakers}
              segments={transcriptData.segments}
              onRenameSpeaker={handleRenameSpeaker}
              selectedSpeakerFilter={selectedSpeakerFilter}
              onSelectSpeakerFilter={setSelectedSpeakerFilter}
            />

            {/* Transcript Toolbar (Search & Filter) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search transcript in Chinese or English..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Translation & Display options */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showGlobalTranslations}
                    onChange={(e) => setShowGlobalTranslations(e.target.checked)}
                    className="rounded-sm accent-indigo-600"
                  />
                  <span>Show Translations</span>
                </label>

                <div className="text-xs text-slate-400 font-mono">
                  <span>{filteredSegments.length}</span>
                  <span className="text-slate-600"> / </span>
                  <span>{transcriptData.segments.length} turns</span>
                </div>
              </div>
            </div>

            {/* Transcript Utterances List */}
            <div className="space-y-3">
              {filteredSegments.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-sm">No speech turns matched your search or speaker filter.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSpeakerFilter(null);
                    }}
                    className="mt-3 px-3 py-1 text-xs rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredSegments.map((segment) => (
                  <TranscriptSegment
                    key={segment.id}
                    segment={segment}
                    speakers={transcriptData.speakers}
                    isActive={activeSegmentId === segment.id}
                    onSeek={(time) => {
                      setCurrentTime(time);
                      setIsPlaying(true);
                    }}
                    onUpdateText={handleUpdateSegmentText}
                    searchQuery={searchQuery}
                    showTranslationsGlobal={showGlobalTranslations}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      {transcriptData && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          data={transcriptData}
        />
      )}
    </div>
  );
}
