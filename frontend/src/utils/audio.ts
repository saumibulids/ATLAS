// Tactile Desk Audio Synthesizer via Web Audio API (Offline, Zero external dependencies)

let audioCtx: AudioContext | null = null;
let ambientNoiseNode: AudioNode | null = null;
let ambientGainNode: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Gentle warm chime for XP gains, quiz correct answers, and card flips
 */
export function playChime(pitch: 'high' | 'medium' | 'success' = 'medium') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (pitch === 'high') {
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6
    } else if (pitch === 'success') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (err) {
    // Audio context may be restricted by autoplay policies until user interaction
  }
}

/**
 * Subtle tactile paper switch click
 */
export function playClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {}
}

/**
 * Soft library rain / brown noise generator for deep focus mode
 */
export function startFocusAmbience() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    stopFocusAmbience();

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise approximation (leaky integrator)
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to sound like soft gentle rain outside a library window
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.2); // Smooth fade in

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();

    ambientNoiseNode = whiteNoise;
    ambientGainNode = gain;
  } catch (err) {}
}

export function stopFocusAmbience() {
  try {
    if (ambientGainNode && audioCtx) {
      const now = audioCtx.currentTime;
      ambientGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      setTimeout(() => {
        if (ambientNoiseNode) {
          try {
            (ambientNoiseNode as AudioScheduledSourceNode).stop();
            ambientNoiseNode.disconnect();
          } catch (e) {}
          ambientNoiseNode = null;
        }
        ambientGainNode = null;
      }, 700);
    }
  } catch (err) {}
}
