import React, { useState, useRef, useEffect } from 'react';
import { Play, Copy, Check, Edit3, Globe, Languages } from 'lucide-react';
import { Segment, Speaker } from '../types/transcript';
import { formatTime, getSpeakerColor, getSpeakerDisplayName } from '../utils/formatters';

interface TranscriptSegmentProps {
  segment: Segment;
  speakers: Speaker[];
  isActive: boolean;
  onSeek: (time: number) => void;
  onUpdateText: (segmentId: string, newText: string) => void;
  searchQuery?: string;
  showTranslationsGlobal?: boolean;
}

export const TranscriptSegment: React.FC<TranscriptSegmentProps> = ({
  segment,
  speakers,
  isActive,
  onSeek,
  onUpdateText,
  searchQuery = '',
  showTranslationsGlobal = false,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>(segment.text);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showTranslationLocal, setShowTranslationLocal] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const color = getSpeakerColor(segment.speaker, speakers);
  const speakerName = getSpeakerDisplayName(segment.speaker, speakers);
  const showTranslation = showTranslationsGlobal || showTranslationLocal;

  // Auto-scroll into view when active if desired
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActive]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = `[${speakerName}] (${formatTime(segment.startTime)}): ${segment.text}`;
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onUpdateText(segment.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(segment.text);
    setIsEditing(false);
  };

  // Highlight search keywords if present
  const renderHighlightedText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-amber-400 text-slate-900 rounded-xs px-0.5 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getLanguageBadge = (lang?: string) => {
    const l = (lang || '').toLowerCase();
    if (l === 'zh' || l.includes('chinese')) {
      return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">中文</span>;
    }
    if (l === 'en' || l.includes('english')) {
      return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">EN</span>;
    }
    if (l === 'mixed' || l.includes('mix')) {
      return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">中英雙語</span>;
    }
    return null;
  };

  return (
    <div
      ref={cardRef}
      onClick={() => onSeek(segment.startTime)}
      className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Speaker, Time, Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Speaker Badge */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color.hex }}
            />
            <span className="font-semibold text-sm text-slate-200">
              {speakerName}
            </span>
          </div>

          {/* Time range button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSeek(segment.startTime);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-xs font-mono text-slate-400 hover:text-indigo-300 hover:bg-slate-700 transition-colors"
            title="Click to jump to audio time"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>{formatTime(segment.startTime)}</span>
            <span className="text-slate-600">→</span>
            <span>{formatTime(segment.endTime)}</span>
          </button>

          {/* Language tag */}
          {getLanguageBadge(segment.language)}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {segment.translation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTranslationLocal(!showTranslationLocal);
              }}
              className={`p-1.5 rounded hover:bg-slate-700 text-xs transition-colors ${
                showTranslation ? 'text-indigo-400 bg-indigo-950/40' : 'text-slate-400'
              }`}
              title="Toggle parallel translation"
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
            }}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Edit transcription text"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Copy segment text"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Utterance Text */}
      {isEditing ? (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            className="w-full p-2 text-sm bg-slate-950 border border-indigo-500 rounded-lg text-white focus:outline-hidden resize-none font-sans"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-2.5 py-1 text-xs rounded bg-indigo-600 text-white font-medium hover:bg-indigo-500"
            >
              Save Text
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-200 text-sm leading-relaxed tracking-wide font-normal select-text">
          {renderHighlightedText(segment.text)}
        </p>
      )}

      {/* Bilingual Parallel Translation if enabled */}
      {showTranslation && segment.translation && !isEditing && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-start gap-2 text-xs text-indigo-300/80 bg-indigo-950/20 p-2 rounded-lg">
          <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
          <p className="leading-relaxed select-text italic">
            {segment.translation}
          </p>
        </div>
      )}
    </div>
  );
};
