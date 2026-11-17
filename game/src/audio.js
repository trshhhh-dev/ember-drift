// Every sound in Ember Drift is synthesised in the browser with the Web Audio API: no audio
// files, no network. A quiet wind bed runs underneath, and short one-shot voices answer the
// player's actions (a mote, a hit, a flare, a wave, the end) with rising pitch for longer chains.
// The context is created on the first gesture, as browsers require.

/** The longest chain that still raises the collect pitch. */
const MAX_PITCH_STEPS = 12;

export function createAudio() {
  let context = null;
  let master = null;
  let windGain = null;
  let noiseBuffer = null;
  let muted = false;

  /** Build the shared noise buffer once, after the context exists. */
  function makeNoise() {
    const length = Math.floor(context.sampleRate * 2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.97 + white * 0.03;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  /** The wind bed: filtered noise with a slow breathing filter, plus a low drone. */
  function startWind() {
    if (windGain !== null) return;
    windGain = context.createGain();
    windGain.gain.value = 0.075;
    windGain.connect(master);

    const air = context.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;
    const airFilter = context.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 520;
    airFilter.Q.value = 0.7;
    air.connect(airFilter).connect(windGain);
    air.start();

    const breath = context.createOscillator();
    breath.frequency.value = 0.06;
    const breathDepth = context.createGain();
    breathDepth.gain.value = 220;
    breath.connect(breathDepth).connect(airFilter.frequency);
    breath.start();

    const drone = context.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const droneGain = context.createGain();
    droneGain.gain.value = 0.014;
    drone.connect(droneGain).connect(master);
    drone.start();
  }

  /** A pitched voice with a fast attack and an exponential tail. */
  function tone({ frequency, endFrequency = frequency, type = 'sine', duration = 0.2, gain = 0.16, delay = 0, attack = 0.008 }) {
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const amp = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), at + duration);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(amp).connect(master);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.03);
  }

  /** A shaped noise burst: splash, flare, or the low thump of a hit. */
  function noise({ duration = 0.3, gain = 0.18, type = 'lowpass', frequency = 900, endFrequency = frequency, delay = 0, q = 0.8 }) {
    const at = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(20, frequency), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(amp).connect(master);
    source.start(at);
    source.stop(at + duration + 0.03);
  }

  /** Create or resume the audio context; safe to call on every gesture. */
  function unlock() {
    try {
      if (context === null) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.55;
        master.connect(context.destination);
        noiseBuffer = makeNoise();
        startWind();
      }
      if (context.state === 'suspended') context.resume();
    } catch {
      context = null;
    }
  }

  /** Play a named one-shot; `chain` raises the collect pitch. */
  function play(name, chain = 0) {
    if (context === null || muted || context.state !== 'running') return;
    try {
      if (name === 'collect') {
        const step = Math.min(MAX_PITCH_STEPS, Math.max(0, chain));
        const base = 430 * Math.pow(2, step / 12);
        tone({ frequency: base, endFrequency: base * 1.5, type: 'triangle', duration: 0.14, gain: 0.11 });
        tone({ frequency: base * 2, endFrequency: base * 3, type: 'sine', duration: 0.1, gain: 0.045, delay: 0.012 });
      } else if (name === 'hit') {
        noise({ duration: 0.34, gain: 0.2, type: 'lowpass', frequency: 1200, endFrequency: 180 });
        tone({ frequency: 140, endFrequency: 58, type: 'sawtooth', duration: 0.3, gain: 0.1 });
      } else if (name === 'flare') {
        noise({ duration: 0.5, gain: 0.16, type: 'bandpass', frequency: 300, endFrequency: 2400, q: 1.4 });
        tone({ frequency: 190, endFrequency: 620, type: 'sine', duration: 0.35, gain: 0.13 });
        tone({ frequency: 900, endFrequency: 1500, type: 'triangle', duration: 0.22, gain: 0.05, delay: 0.03 });
      } else if (name === 'wave') {
        tone({ frequency: 523.25, endFrequency: 523.25, type: 'sine', duration: 0.5, gain: 0.08 });
        tone({ frequency: 783.99, endFrequency: 783.99, type: 'sine', duration: 0.6, gain: 0.07, delay: 0.12 });
        tone({ frequency: 1046.5, endFrequency: 1046.5, type: 'sine', duration: 0.7, gain: 0.045, delay: 0.24 });
      } else if (name === 'start') {
        tone({ frequency: 196, endFrequency: 392, type: 'triangle', duration: 0.5, gain: 0.1 });
        tone({ frequency: 587.33, endFrequency: 587.33, type: 'sine', duration: 0.5, gain: 0.05, delay: 0.16 });
      } else if (name === 'over') {
        tone({ frequency: 330, endFrequency: 82, type: 'sine', duration: 1.4, gain: 0.13 });
        tone({ frequency: 165, endFrequency: 55, type: 'triangle', duration: 1.2, gain: 0.07, delay: 0.08 });
        noise({ duration: 1.0, gain: 0.06, type: 'lowpass', frequency: 700, endFrequency: 100 });
      } else if (name === 'click') {
        tone({ frequency: 880, endFrequency: 1100, type: 'sine', duration: 0.07, gain: 0.045 });
      } else if (name === 'deny') {
        tone({ frequency: 150, endFrequency: 110, type: 'square', duration: 0.1, gain: 0.03 });
      }
    } catch {
      // A failed voice is never worth interrupting the night for.
    }
  }

  return {
    unlock,
    play,
    setMuted(value) {
      muted = value;
      if (master !== null) master.gain.setTargetAtTime(muted ? 0 : 0.55, context.currentTime, 0.05);
    },
    get muted() {
      return muted;
    },
  };
}
