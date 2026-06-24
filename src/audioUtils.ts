/**
 * Ultra-reliable, 100% offline-compatible synthetic audio synthesizer for mobile APKs.
 * Uses Web Audio API to generate high-fidelity, crystal-clear physical chimes and sirens
 * that do not require external network connections or audio assets.
 * 
 * Auto-unlocks the browser/WebView AudioContext on first user interaction (tap, click, keydown).
 */

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch (e) {
      console.warn('[AudioUtils] Failed to create AudioContext:', e);
    }
  }
  return sharedAudioCtx;
}

// Unlocks the audio context on user interaction (required by iOS/Android WebView policies)
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('🟢 [AudioUtils] AudioContext successfully resumed & unlocked via user interaction.');
          cleanUp();
        }).catch((err) => {
          console.warn('[AudioUtils] Failed to resume AudioContext:', err);
        });
      } else {
        console.log('🟢 [AudioUtils] AudioContext is already active.');
        cleanUp();
      }
    }
  };

  const cleanUp = () => {
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

// Immediately trigger unlock on import if possible
if (typeof window !== 'undefined') {
  initAudioUnlock();
}

/**
 * 1. Delightful Order Confirmation Chime (for Customer)
 * A rising, energetic arpeggio of synthetic tones representing success!
 */
export function playOrderPlacedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine'; // Pure sweet bell-like chime
      osc.frequency.setValueAtTime(freq, now + delay);
      
      // Sweet envelope curve
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    // Beautiful rising chord arpeggio (C5, E5, G5, C6)
    playNote(523.25, 0.0, 0.4);   // C5
    playNote(659.25, 0.08, 0.45); // E5
    playNote(783.99, 0.16, 0.5);  // G5
    playNote(1046.50, 0.24, 0.6); // C6 (High C)
  } catch (err) {
    console.warn('[AudioUtils] Failed to play order placement chime:', err);
  }
}

/**
 * 2. High-Audibility Continuous New Order Alarm (for Seller / Restaurant Manager)
 * A dual-frequency urgent tone pattern specifically designed to grab attention.
 */
export function playNewOrderAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'triangle') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.20, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Rapid double alert beep
    playTone(880.00, now, 0.2, 'sawtooth');       // A5 Note - sharp and clear
    playTone(1046.50, now + 0.22, 0.25, 'sawtooth'); // C6 Note - urgent ring
  } catch (err) {
    console.warn('[AudioUtils] Failed to play seller alarm siren:', err);
  }
}

/**
 * 3. Rider Delivery Dispatch Alarm (for Rider)
 * A distinct, high-frequency alarm pulse representing an incoming delivery job.
 */
export function playRiderDispatchSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Dispatch pulse chord
    playTone(1100, now, 0.3);
    playTone(900, now + 0.35, 0.3);
  } catch (err) {
    console.warn('[AudioUtils] Failed to play rider dispatch chime:', err);
  }
}

/**
 * 4. General Notification Pop Sound (for status updates)
 */
export function playNotificationPopSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (err) {
    console.warn('[AudioUtils] Failed to play pop notification sound:', err);
  }
}
