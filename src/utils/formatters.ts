import { Segment, TranscriptData } from '../types/transcript';

export const SPEAKER_COLORS = [
  { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', badge: 'bg-indigo-600', ring: 'ring-indigo-500', hex: '#6366f1' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'bg-emerald-600', ring: 'ring-emerald-500', hex: '#10b981' },
  { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-600', ring: 'ring-amber-500', hex: '#f59e0b' },
  { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', badge: 'bg-rose-600', ring: 'ring-rose-500', hex: '#f43f5e' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', badge: 'bg-cyan-600', ring: 'ring-cyan-500', hex: '#06b6d4' },
  { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-600', ring: 'ring-purple-500', hex: '#a855f7' },
  { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', badge: 'bg-teal-600', ring: 'ring-teal-500', hex: '#14b8a6' },
  { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', badge: 'bg-orange-600', ring: 'ring-orange-500', hex: '#f97316' },
];

export function getSpeakerColor(speakerId: string, speakerList: { id: string }[]) {
  const index = speakerList.findIndex(s => s.id === speakerId);
  const colorIdx = index >= 0 ? index % SPEAKER_COLORS.length : Math.abs(hashCode(speakerId)) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[colorIdx];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hours = Math.floor(mins / 60);

  if (hours > 0) {
    const remainMins = mins % 60;
    return `${hours.toString().padStart(2, '0')}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeWithMs(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
}

export function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function getSpeakerDisplayName(speakerId: string, speakers: { id: string; name?: string; suggestedName?: string }[]): string {
  const found = speakers.find(s => s.id === speakerId);
  return found?.name || found?.suggestedName || speakerId;
}

export function generateSrt(data: TranscriptData): string {
  return data.segments
    .map((seg, index) => {
      const speakerName = getSpeakerDisplayName(seg.speaker, data.speakers);
      const start = formatSrtTime(seg.startTime);
      const end = formatSrtTime(seg.endTime);
      return `${index + 1}\n${start} --> ${end}\n[${speakerName}] ${seg.text}\n`;
    })
    .join('\n');
}

export function generateVtt(data: TranscriptData): string {
  const body = data.segments
    .map((seg, index) => {
      const speakerName = getSpeakerDisplayName(seg.speaker, data.speakers);
      const start = formatVttTime(seg.startTime);
      const end = formatVttTime(seg.endTime);
      return `${index + 1}\n${start} --> ${end}\n<v ${speakerName}>${seg.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export function generateTxt(data: TranscriptData, includeTimestamps = true): string {
  let content = `Title: ${data.title}\n`;
  content += `Language: ${data.language}\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n\n`;
  content += `Summary:\n${data.summary}\n\n`;
  content += `--- TRANSCRIPT ---\n\n`;

  data.segments.forEach(seg => {
    const speakerName = getSpeakerDisplayName(seg.speaker, data.speakers);
    const timeStr = includeTimestamps ? ` [${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}]` : '';
    content += `${speakerName}${timeStr}:\n${seg.text}\n\n`;
  });

  return content;
}

export function generateCsv(data: TranscriptData): string {
  const headers = ['Segment #', 'Speaker', 'Start Time (s)', 'End Time (s)', 'Duration (s)', 'Language', 'Transcribed Text', 'Translation'];
  const rows = data.segments.map((seg, idx) => {
    const speakerName = getSpeakerDisplayName(seg.speaker, data.speakers);
    const duration = (seg.endTime - seg.startTime).toFixed(2);
    return [
      idx + 1,
      `"${speakerName.replace(/"/g, '""')}"`,
      seg.startTime.toFixed(2),
      seg.endTime.toFixed(2),
      duration,
      seg.language || '',
      `"${seg.text.replace(/"/g, '""')}"`,
      `"${(seg.translation || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateJson(data: TranscriptData): string {
  return JSON.stringify(data, null, 2);
}
