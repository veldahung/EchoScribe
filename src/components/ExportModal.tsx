import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText } from 'lucide-react';
import { TranscriptData } from '../types/transcript';
import {
  generateSrt,
  generateVtt,
  generateTxt,
  generateCsv,
  generateJson,
} from '../utils/formatters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TranscriptData;
}

type ExportFormat = 'srt' | 'vtt' | 'txt' | 'csv' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [format, setFormat] = useState<ExportFormat>('srt');
  const [includeTimestampsTxt, setIncludeTimestampsTxt] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const getContent = (): { content: string; mime: string; ext: string } => {
    switch (format) {
      case 'srt':
        return { content: generateSrt(data), mime: 'text/plain', ext: 'srt' };
      case 'vtt':
        return { content: generateVtt(data), mime: 'text/vtt', ext: 'vtt' };
      case 'txt':
        return { content: generateTxt(data, includeTimestampsTxt), mime: 'text/plain', ext: 'txt' };
      case 'csv':
        return { content: generateCsv(data), mime: 'text/csv', ext: 'csv' };
      case 'json':
        return { content: generateJson(data), mime: 'application/json', ext: 'json' };
    }
  };

  const { content, mime, ext } = getContent();

  const handleDownload = () => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = (data.title || 'transcript').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    a.href = url;
    a.download = `${safeTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Export Transcript & Diarization</h3>
              <p className="text-xs text-slate-400">Select format for subtitles or dialogue document</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center gap-2 py-4 border-b border-slate-800 overflow-x-auto">
          {(['srt', 'vtt', 'txt', 'csv', 'json'] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                format === f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              .{f}
            </button>
          ))}

          {format === 'txt' && (
            <label className="ml-auto flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTimestampsTxt}
                onChange={(e) => setIncludeTimestampsTxt(e.target.checked)}
                className="rounded-sm accent-indigo-600"
              />
              <span>Include Timestamps</span>
            </label>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 my-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3">
          <pre className="text-xs font-mono text-slate-300 overflow-y-auto h-64 max-h-[300px] leading-relaxed whitespace-pre-wrap select-text">
            {content}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500 font-mono">
            {data.segments.length} turns · {data.speakers.length} speakers
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{ext}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
