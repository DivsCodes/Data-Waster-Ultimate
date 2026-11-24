import type { SoundStyle } from '../../types/settings';

type Tone = { frequency: number; offset: number; duration: number; wave: OscillatorType };

const SOUND_PATTERNS: Record<SoundStyle, Tone[]> = {
  soft: [
    { frequency: 660, offset: 0, duration: 0.075, wave: 'sine' },
    { frequency: 880, offset: 0.065, duration: 0.11, wave: 'sine' },
  ],
  arcade: [
    { frequency: 440, offset: 0, duration: 0.07, wave: 'square' },
    { frequency: 660, offset: 0.065, duration: 0.07, wave: 'square' },
    { frequency: 990, offset: 0.13, duration: 0.11, wave: 'square' },
  ],
  'sci-fi': [
    { frequency: 220, offset: 0, duration: 0.16, wave: 'triangle' },
    { frequency: 440, offset: 0.09, duration: 0.19, wave: 'sine' },
    { frequency: 880, offset: 0.2, duration: 0.2, wave: 'sine' },
  ],
};

/** Plays a short, synthesized preview. It creates no network requests or audio files. */
export async function playSoundPreview(style: SoundStyle, volume: number): Promise<boolean> {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return false;

  let context: AudioContext | null = null;
  try {
    context = new window.AudioContext();
    const master = context.createGain();
    master.gain.setValueAtTime(Math.max(0, Math.min(100, volume)) / 100 * 0.12, context.currentTime);
    master.connect(context.destination);

    const tones = SOUND_PATTERNS[style];
    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const startAt = context.currentTime + tone.offset;
      oscillator.type = tone.wave;
      oscillator.frequency.setValueAtTime(tone.frequency, startAt);
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(0.7, startAt + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(startAt);
      oscillator.stop(startAt + tone.duration + 0.015);
    }

    const finishAt = Math.max(...tones.map((tone) => tone.offset + tone.duration)) + 0.05;
    window.setTimeout(() => { void context?.close().catch(() => undefined); }, finishAt * 1000 + 30);
    return true;
  } catch {
    if (context) void context.close().catch(() => undefined);
    return false;
  }
}
