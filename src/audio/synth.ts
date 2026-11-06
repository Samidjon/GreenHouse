/** Small synthesis voices. Each schedules itself and cleans up when it ends. */

export type SfxName = 'ui' | 'water' | 'plant' | 'harvest' | 'coin' | 'deny' | 'levelUp' | 'place' | 'build' | 'achievement';

// A major pentatonic across two and a half octaves, around A.
export const SCALE_HZ = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.25, 739.99, 880];

function envelope(ctx: AudioContext, out: AudioNode, at: number, attack: number, peak: number, release: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  g.connect(out);
  return g;
}

function tone(ctx: AudioContext, out: AudioNode, type: OscillatorType, freq: number, at: number, attack: number, peak: number, release: number, slideTo?: number): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + attack + release);
  osc.connect(envelope(ctx, out, at, attack, peak, release));
  osc.start(at);
  osc.stop(at + attack + release + 0.05);
}

function noiseBurst(ctx: AudioContext, out: AudioNode, at: number, duration: number, peak: number, type: BiquadFilterType, freq: number, q = 0.8): void {
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter);
  filter.connect(envelope(ctx, out, at, duration * 0.15, peak, duration * 0.85));
  src.start(at);
}

export function playPluck(ctx: AudioContext, out: AudioNode, freq: number, at: number, peak: number): void {
  tone(ctx, out, 'triangle', freq, at, 0.012, peak, 1.6);
  tone(ctx, out, 'sine', freq * 2, at, 0.008, peak * 0.3, 0.7);
}

export function playPad(ctx: AudioContext, out: AudioNode, freqs: number[], at: number, duration: number): void {
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.045, at + duration * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, at + duration);
    osc.connect(g);
    g.connect(out);
    osc.start(at);
    osc.stop(at + duration + 0.1);
  }
}

export function playChirp(ctx: AudioContext, out: AudioNode): void {
  let at = ctx.currentTime;
  const base = 2200 + Math.random() * 1600;
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    tone(ctx, out, 'sine', base * (1 + Math.random() * 0.15), at, 0.012, 0.035, 0.09, base * 1.35);
    at += 0.11 + Math.random() * 0.1;
  }
}

export function playCricket(ctx: AudioContext, out: AudioNode): void {
  let at = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    tone(ctx, out, 'sine', 4300, at, 0.006, 0.014, 0.05);
    at += 0.075;
  }
}

export function playSfx(ctx: AudioContext, out: AudioNode, name: SfxName): void {
  const t = ctx.currentTime + 0.001;
  switch (name) {
    case 'ui':
      tone(ctx, out, 'triangle', 620, t, 0.004, 0.09, 0.07, 520);
      break;
    case 'water':
      noiseBurst(ctx, out, t, 0.75, 0.15, 'bandpass', 2400, 0.7);
      for (let i = 0; i < 5; i++) tone(ctx, out, 'sine', 500 + Math.random() * 700, t + 0.08 + i * 0.1, 0.005, 0.04, 0.07, 1100);
      break;
    case 'plant':
      noiseBurst(ctx, out, t, 0.2, 0.22, 'lowpass', 520);
      tone(ctx, out, 'sine', 170, t, 0.005, 0.18, 0.16, 90);
      break;
    case 'harvest':
      noiseBurst(ctx, out, t, 0.14, 0.12, 'highpass', 1800);
      [SCALE_HZ[5]!, SCALE_HZ[7]!, SCALE_HZ[8]!].forEach((f, i) => playPluck(ctx, out, f, t + 0.04 + i * 0.09, 0.14));
      break;
    case 'coin':
      tone(ctx, out, 'triangle', 1320, t, 0.003, 0.09, 0.14);
      tone(ctx, out, 'triangle', 1760, t + 0.07, 0.003, 0.09, 0.22);
      break;
    case 'deny':
      tone(ctx, out, 'triangle', 240, t, 0.006, 0.09, 0.15, 190);
      break;
    case 'place':
      tone(ctx, out, 'sine', 210, t, 0.004, 0.2, 0.12, 140);
      noiseBurst(ctx, out, t, 0.06, 0.08, 'bandpass', 1400);
      break;
    case 'levelUp':
      [SCALE_HZ[3]!, SCALE_HZ[5]!, SCALE_HZ[6]!, SCALE_HZ[8]!, SCALE_HZ[10]!].forEach((f, i) => playPluck(ctx, out, f, t + i * 0.11, 0.17));
      break;
    case 'achievement':
      [SCALE_HZ[5]!, SCALE_HZ[8]!, SCALE_HZ[10]!].forEach((f, i) => playPluck(ctx, out, f, t + i * 0.14, 0.15));
      break;
    case 'build':
      for (let i = 0; i < 3; i++) noiseBurst(ctx, out, t + i * 0.16, 0.07, 0.2, 'lowpass', 900);
      [SCALE_HZ[0]!, SCALE_HZ[3]!, SCALE_HZ[5]!, SCALE_HZ[8]!].forEach((f, i) => playPluck(ctx, out, f, t + 0.5 + i * 0.16, 0.18));
      break;
  }
}
