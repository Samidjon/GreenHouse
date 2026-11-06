import { DEFAULT_SETTINGS } from '@/data/config';
import type { DayPhase, Settings, WeatherKind } from '@/types/game';
import { playChirp, playCricket, playPad, playPluck, playSfx, SCALE_HZ, type SfxName } from './synth';

/**
 * All game audio goes through here. Everything is synthesised with Web Audio,
 * so there are no files to load; swapping in recorded audio only touches this folder.
 *
 * Browsers block audio until a user gesture, so nothing is created before unlock().
 */
class AudioServiceImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private ambience: GainNode | null = null;
  private sfx: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;

  private settings: Settings = { ...DEFAULT_SETTINGS };
  private weather: WeatherKind = 'clear';
  private phase: DayPhase = 'day';
  private active = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** Call from any user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.buildGraph(this.ctx);
      this.applySettings(this.settings);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private buildGraph(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.ambience = ctx.createGain();
    this.sfx = ctx.createGain();
    for (const bus of [this.music, this.ambience, this.sfx]) bus.connect(this.master);

    // A soft echo gives the sparse music its sense of a glass room.
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.46;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    this.music.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = last * 0.82 + (Math.random() * 2 - 1) * 0.18;
      data[i] = last * 2.4;
    }
    const loop = (gain: GainNode, type: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambience!);
      src.start();
    };
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    loop(this.rainGain, 'highpass', 1100, 0.3);
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;
    loop(this.windGain, 'lowpass', 420, 0.4);

    this.applyAmbience();
  }

  /** Begins music and nature sounds for the gameplay screen. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.scheduleMusic(1500);
    this.scheduleNature(2500);
  }

  stop(): void {
    this.active = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  setBackgrounded(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.muted ? 0 : settings.masterVolume, t, 0.05);
    this.music!.gain.setTargetAtTime(settings.musicVolume * 0.75, t, 0.05);
    this.ambience!.gain.setTargetAtTime(settings.ambienceVolume, t, 0.05);
    this.sfx!.gain.setTargetAtTime(settings.sfxVolume, t, 0.05);
  }

  setEnvironment(weather: WeatherKind, phase: DayPhase): void {
    if (weather === this.weather && phase === this.phase) return;
    this.weather = weather;
    this.phase = phase;
    this.applyAmbience();
  }

  private applyAmbience(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.rainGain?.gain.setTargetAtTime(this.weather === 'rain' ? 0.26 : 0, ctx.currentTime, 2.5);
    this.windGain?.gain.setTargetAtTime(this.weather === 'rain' ? 0.09 : 0.05, ctx.currentTime, 2.5);
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.sfx || this.ctx.state !== 'running') return;
    playSfx(this.ctx, this.sfx, name);
  }

  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== t);
      if (this.active) fn();
    }, ms);
    this.timers.push(t);
  }

  private canPlayNow(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  private scheduleMusic(delayMs: number): void {
    this.later(delayMs, () => {
      if (this.canPlayNow() && this.music) {
        const ctx = this.ctx!;
        const now = ctx.currentTime;
        const root = Math.floor(Math.random() * 3);
        playPad(ctx, this.music, [SCALE_HZ[root]! / 2, SCALE_HZ[root + 2]! / 2, SCALE_HZ[root + 4]! / 2], now, 9);
        // A few unhurried notes over each pad, with plenty of silence between.
        const notes = 2 + Math.floor(Math.random() * 4);
        let at = now + 0.6;
        let index = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < notes; i++) {
          index = Math.max(0, Math.min(SCALE_HZ.length - 1, index + Math.floor(Math.random() * 5) - 2));
          playPluck(ctx, this.music, SCALE_HZ[index]!, at, 0.13);
          at += 0.8 + Math.random() * 1.5;
        }
      }
      this.scheduleMusic(8000 + Math.random() * 7000);
    });
  }

  private scheduleNature(delayMs: number): void {
    this.later(delayMs, () => {
      if (this.canPlayNow() && this.ambience) {
        const ctx = this.ctx!;
        if (this.phase === 'night') playCricket(ctx, this.ambience);
        else if (this.weather !== 'rain') playChirp(ctx, this.ambience);
      }
      this.scheduleNature(this.phase === 'night' ? 2200 + Math.random() * 3500 : 3500 + Math.random() * 9000);
    });
  }
}

export const AudioService = new AudioServiceImpl();
