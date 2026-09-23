import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, FastForward } from 'lucide-react';
import { formatTime, getSpeakerColor } from '../utils/formatters';
import { Segment, Speaker } from '../types/transcript';

interface AudioPlayerProps {
  audioUrl: string | null;
  segments: Segment[];
  speakers: Speaker[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onPlayPauseToggle: (playing: boolean) => void;
  audioDuration?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  segments,
  speakers,
  currentTime,
  onTimeUpdate,
  onSeek,
  isPlaying,
  onPlayPauseToggle,
  audioDuration = 0,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState<number>(audioDuration);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    if (audioDuration && !duration) {
      setDuration(audioDuration);
    }
  }, [audioDuration, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(e => {
        console.warn('Playback error:', e);
        onPlayPauseToggle(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, onPlayPauseToggle]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Math.abs(audio.currentTime - currentTime) > 0.4) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (!audioRef.current || isDragging) return;
    onTimeUpdate(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || audioDuration || 1);
    }
  };

  const togglePlay = () => {
    onPlayPauseToggle(!isPlaying);
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    onSeek(newTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onSeek(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const effectiveDuration = duration || 1;
  const progressPercent = Math.min(100, (currentTime / effectiveDuration) * 100);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md sticky top-4 z-30 transition-all">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => onPlayPauseToggle(false)}
        />
      )}

      {/* Visual Timeline scrubber with Speaker Segments colored */}
      <div className="relative mb-3 group">
        <div className="relative h-3 w-full bg-slate-800 rounded-full overflow-hidden flex items-center">
          {/* Segments track preview */}
          {duration > 0 && segments.map((seg) => {
            const leftPct = (seg.startTime / effectiveDuration) * 100;
            const widthPct = Math.max(0.5, ((seg.endTime - seg.startTime) / effectiveDuration) * 100);
            const color = getSpeakerColor(seg.speaker, speakers);
            return (
              <div
                key={seg.id}
                className="absolute h-full opacity-40 hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: color.hex,
                }}
                title={`${seg.speaker}: ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`}
              />
            );
          })}

          {/* Active progress bar */}
          <div
            className="absolute top-0 left-0 h-full bg-linear-to-r from-blue-500 to-indigo-500 pointer-events-none rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Range input slider */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime}
          onChange={handleSeekChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Drag to seek"
        />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-2">
          {/* Skip backward 5s */}
          <button
            onClick={() => handleSkip(-5)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
          </button>

          {/* Skip forward 5s */}
          <button
            onClick={() => handleSkip(5)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fast forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Time indicator */}
          <div className="text-xs font-mono text-slate-400 ml-2">
            <span className="text-white font-semibold">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right side controls: speed & volume */}
        <div className="flex items-center gap-3">
          {/* Playback rate */}
          <button
            onClick={cyclePlaybackRate}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Cycle Playback Speed"
          >
            <FastForward className="w-3 h-3" />
            <span>{playbackRate}x</span>
          </button>

          {/* Volume control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              title="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
