import React, { useState } from 'react';
import { Users, Edit2, Check, X, Filter } from 'lucide-react';
import { Speaker, Segment } from '../types/transcript';
import { getSpeakerColor, formatTime, getSpeakerDisplayName } from '../utils/formatters';

interface SpeakerDiarizationStatsProps {
  speakers: Speaker[];
  segments: Segment[];
  onRenameSpeaker: (speakerId: string, newName: string) => void;
  selectedSpeakerFilter: string | null;
  onSelectSpeakerFilter: (speakerId: string | null) => void;
}

export const SpeakerDiarizationStats: React.FC<SpeakerDiarizationStatsProps> = ({
  speakers,
  segments,
  onRenameSpeaker,
  selectedSpeakerFilter,
  onSelectSpeakerFilter,
}) => {
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');

  // Calculate statistics per speaker
  const totalDuration = segments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0) || 1;

  const speakerStats = speakers.map(spk => {
    const spkSegments = segments.filter(s => s.speaker === spk.id);
    const duration = spkSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
    const wordCount = spkSegments.reduce((acc, s) => acc + (s.text ? s.text.length : 0), 0);
    const percent = Math.round((duration / totalDuration) * 100);

    return {
      ...spk,
      duration,
      percent,
      segmentCount: spkSegments.length,
      wordCount,
    };
  });

  const startEditing = (speakerId: string, currentName: string) => {
    setEditingSpeakerId(speakerId);
    setTempName(currentName);
  };

  const saveEditing = (speakerId: string) => {
    if (tempName.trim()) {
      onRenameSpeaker(speakerId, tempName.trim());
    }
    setEditingSpeakerId(null);
  };

  const cancelEditing = () => {
    setEditingSpeakerId(null);
    setTempName('');
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Speakers & Diarization</h3>
            <p className="text-xs text-slate-400">
              {speakers.length} {speakers.length === 1 ? 'speaker' : 'speakers'} detected · Click name to rename
            </p>
          </div>
        </div>

        {selectedSpeakerFilter && (
          <button
            onClick={() => onSelectSpeakerFilter(null)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors cursor-pointer"
          >
            <Filter className="w-3 h-3" />
            Clear Filter
          </button>
        )}
      </div>

      {/* Speaker Talk Time Bar */}
      <div className="w-full h-3 rounded-full overflow-hidden bg-slate-800 flex mb-5" title="Talk time distribution">
        {speakerStats.map((spk) => {
          const color = getSpeakerColor(spk.id, speakers);
          return (
            <div
              key={spk.id}
              className="h-full transition-all relative group"
              style={{
                width: `${spk.percent}%`,
                backgroundColor: color.hex,
              }}
              title={`${getSpeakerDisplayName(spk.id, speakers)}: ${spk.percent}%`}
            />
          );
        })}
      </div>

      {/* Speaker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {speakerStats.map((spk) => {
          const color = getSpeakerColor(spk.id, speakers);
          const isSelected = selectedSpeakerFilter === spk.id;
          const displayName = getSpeakerDisplayName(spk.id, speakers);

          return (
            <div
              key={spk.id}
              className={`p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: color.hex }}
                  />

                  {editingSpeakerId === spk.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(spk.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                        className="w-full px-2 py-0.5 text-xs rounded bg-slate-900 border border-indigo-500 text-white focus:outline-hidden"
                      />
                      <button
                        onClick={() => saveEditing(spk.id)}
                        className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 rounded text-slate-400 hover:bg-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => startEditing(spk.id, displayName)}
                          className="font-medium text-sm text-slate-100 hover:text-indigo-300 cursor-pointer truncate transition-colors"
                          title="Click to rename"
                        >
                          {displayName}
                        </span>
                        <button
                          onClick={() => startEditing(spk.id, displayName)}
                          className="opacity-40 hover:opacity-100 text-slate-400 hover:text-indigo-300 transition-opacity"
                          title="Rename speaker"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                      {spk.id !== displayName && (
                        <p className="text-[10px] text-slate-500 font-mono truncate">{spk.id}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => onSelectSpeakerFilter(isSelected ? null : spk.id)}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={isSelected ? 'Clear speaker filter' : 'Filter by this speaker'}
                >
                  {isSelected ? 'Filtered' : 'Filter'}
                </button>
              </div>

              {spk.description && (
                <p className="text-xs text-slate-400 mt-2 line-clamp-1 italic">
                  "{spk.description}"
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800">
                <span>{formatTime(spk.duration)} ({spk.percent}%)</span>
                <span>{spk.segmentCount} turns · {spk.wordCount} chars</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
