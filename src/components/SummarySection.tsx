import React, { useState } from 'react';
import { Sparkles, CheckCircle, Clock, Globe, Copy, Check } from 'lucide-react';
import { TranscriptData } from '../types/transcript';
import { formatTime } from '../utils/formatters';

interface SummarySectionProps {
  data: TranscriptData;
}

export const SummarySection: React.FC<SummarySectionProps> = ({ data }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopySummary = () => {
    const text = `Title: ${data.title}\nLanguage: ${data.language}\nDuration: ${formatTime(data.duration || 0)}\n\nSummary:\n${data.summary}\n\nKey Points:\n${data.keyPoints.map(p => `• ${p}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Title & Metadata Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{data.title}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{data.language}</span>
            </span>
            {data.duration && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatTime(data.duration)}</span>
              </span>
            )}
            <span className="text-slate-500 font-mono">
              {data.segments.length} dialogue turns
            </span>
          </div>
        </div>

        <button
          onClick={handleCopySummary}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy Summary'}</span>
        </button>
      </div>

      {/* AI Summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Executive Summary</span>
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 select-text">
          {data.summary}
        </p>
      </div>

      {/* Key Discussion Points */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Key Discussion Points
          </h4>
          <ul className="space-y-1.5">
            {data.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="select-text">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
