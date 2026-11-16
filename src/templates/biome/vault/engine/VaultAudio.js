/**
 * Generative soundtrack + UI sounds, built entirely with WebAudio — no audio
 * files to host or download. An ambient pad plays slow chord changes through
 * a long reverb, a sparse glassy arpeggio floats on top, and a filtered wind
 * layer swells with scroll speed (the "whoosh" while diving).
 */

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const TRACKS = [
  { title: 'SUBSURFACE', chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]], cutoff: 900 },
  { title: 'BIOLUMEN', chords: [[52, 59, 64, 67], [48, 55, 60, 67], [53, 60, 65, 69], [50, 57, 62, 66]], cutoff: 1300 },
  { title: 'DEEP ARCHIVE', chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], cutoff: 700 },
];

export default class VaultAudio {
  constructor() {
    this.ctx = null;
    this.muted = true;
    this.track = 0;
    this.started = false;
    this.timer = null;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  async start(muted = false) {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.#graph();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
    this.setMuted(muted);
    if (!this.started) {
      this.started = true;
      this.nextChordAt = this.ctx.currentTime + 0.1;
      this.nextNoteAt = this.ctx.currentTime + 1.5;
      this.chordIdx = 0;
      this.timer = setInterval(() => this.#schedule(), 150);
    }
  }

  #graph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp).connect(ctx.destination);

    // generated impulse response: decaying stereo noise
    const len = ctx.sampleRate * 4;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.75;
    this.reverb.connect(wet).connect(this.master);

    this.padBus = ctx.createGain();
    this.padBus.gain.value = 0.16;
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = TRACKS[0].cutoff;
    this.padFilter.Q.value = 0.7;
    this.padBus.connect(this.padFilter);
    this.padFilter.connect(this.master);
    this.padFilter.connect(this.reverb);
    // slow filter breathing
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(this.padFilter.frequency);
    lfo.start();

    // shimmer bus with a feedback delay
    this.bellBus = ctx.createGain();
    this.bellBus.gain.value = 0.07;
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.48;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    this.bellBus.connect(delay).connect(fb).connect(delay);
    delay.connect(this.reverb);
    this.bellBus.connect(this.reverb);
    this.bellBus.connect(this.master);

    // wind / dive whoosh
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    noise.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.9;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.01;
    noise.connect(this.windFilter).connect(this.windGain);
    this.windGain.connect(this.master);
    this.windGain.connect(this.reverb);
    noise.start();

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.18;
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.reverb);
  }

  #schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const tr = TRACKS[this.track];
    while (this.nextChordAt < now + 0.4) {
      const chord = tr.chords[this.chordIdx % tr.chords.length];
      this.#pad(chord, this.nextChordAt, 9);
      this.currentChord = chord;
      this.chordIdx += 1;
      this.nextChordAt += 8;
    }
    while (this.nextNoteAt < now + 0.4) {
      const ch = this.currentChord || tr.chords[0];
      const note = ch[(Math.random() * ch.length) | 0] + (Math.random() < 0.6 ? 24 : 12);
      this.#bell(note, this.nextNoteAt, 0.5 + Math.random() * 0.5);
      this.nextNoteAt += [0.5, 0.75, 1, 1.5, 2][(Math.random() * 5) | 0];
    }
  }

  #pad(notes, at, dur) {
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(1, at + 2.8);
    env.gain.setValueAtTime(1, at + dur - 3);
    env.gain.linearRampToValueAtTime(0, at + dur);
    env.connect(this.padBus);
    notes.forEach((n, i) => {
      [-7, 7].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'triangle' : 'sawtooth';
        o.frequency.value = mtof(n);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.5 : 0.18;
        o.connect(g).connect(env);
        o.start(at);
        o.stop(at + dur + 0.1);
      });
    });
    const sub = ctx.createOscillator();
    sub.frequency.value = mtof(notes[0] - 12);
    const sg = ctx.createGain();
    sg.gain.value = 0.35;
    sub.connect(sg).connect(env);
    sub.start(at);
    sub.stop(at + dur + 0.1);
  }

  #bell(note, at, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o.type = 'sine';
    o2.type = 'sine';
    o.frequency.value = mtof(note);
    o2.frequency.value = mtof(note) * 2.76;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.5 * vel, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.5);
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.bellBus);
    o.start(at); o2.start(at);
    o.stop(at + 2.6); o2.stop(at + 2.6);
  }

  /** Scroll velocity in screens/second. */
  setVelocity(v) {
    if (!this.ctx || this.muted) return;
    const a = Math.min(Math.abs(v), 4);
    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.012 + a * 0.06, now, 0.15);
    this.windFilter.frequency.setTargetAtTime(350 + a * 700, now, 0.15);
  }

  sfx(type = 'tick') {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g).connect(this.sfxBus);
    if (type === 'tick') {
      o.type = 'sine';
      o.frequency.setValueAtTime(2400, now);
      o.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      o.start(now); o.stop(now + 0.08);
    } else if (type === 'card') {
      o.type = 'triangle';
      const ch = this.currentChord || TRACKS[this.track].chords[0];
      o.frequency.value = mtof(ch[(Math.random() * ch.length) | 0] + 24);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.35, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      o.start(now); o.stop(now + 1.25);
    } else { // click / confirm
      o.type = 'sine';
      o.frequency.setValueAtTime(520, now);
      o.frequency.exponentialRampToValueAtTime(1560, now + 0.12);
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      o.start(now); o.stop(now + 0.32);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.4);
  }

  setTrack(i) {
    this.track = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    if (!this.ctx) return;
    this.padFilter.frequency.setTargetAtTime(TRACKS[this.track].cutoff, this.ctx.currentTime, 1);
    this.chordIdx = 0;
    this.nextChordAt = this.ctx.currentTime + 0.2;
  }

  dispose() {
    clearInterval(this.timer);
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
