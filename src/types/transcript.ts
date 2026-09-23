export interface Speaker {
  id: string;
  name?: string;
  suggestedName?: string;
  description: string;
  color?: string;
  totalTime?: number;
  segmentCount?: number;
}

export interface Segment {
  id: string;
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
  language?: 'zh' | 'en' | 'mixed' | string;
  translation?: string;
}

export interface TranscriptData {
  title: string;
  language: string;
  duration?: number;
  summary: string;
  keyPoints: string[];
  speakers: Speaker[];
  segments: Segment[];
}

export interface TranscribeOptions {
  languageHint: 'auto' | 'zh' | 'en' | 'mixed';
  scriptStyle: 'original' | 'traditional' | 'simplified';
  speakerCountHint: 'auto' | '2' | '3' | '4+';
  contextPrompt: string;
  model: 'gemini-3.8-flash' | 'gemini-3.5-transcribe';
  includeTranslations: boolean;
}
