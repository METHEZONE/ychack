// Forage — Web Audio API sound engine
// Procedural AC-style sounds. No external files needed.

let ctx: AudioContext | null = null;
export let soundEnabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function play(fn: (c: AudioContext) => void) {
  if (!soundEnabled) return;
  const c = getCtx();
  if (!c) return;
  try { fn(c); } catch { /* ignore */ }
}

export function setSoundEnabled(val: boolean) { soundEnabled = val; }

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function tone(
  c: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  pitchEnd?: number
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (pitchEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(pitchEnd, startTime + duration);
  }
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
  gain.gain.setValueAtTime(volume, startTime + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function noise(
  c: AudioContext,
  startTime: number,
  duration: number,
  volume: number,
  filterFreq = 1000
) {
  const bufferSize = Math.ceil(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFreq, startTime);
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(startTime);
  src.stop(startTime + duration + 0.01);
}

// ---------------------------------------------------------------------------
// Animal Crossing-style dialogue blip
// Each animal type has a unique base pitch — their "voice"
// ---------------------------------------------------------------------------

const ANIMAL_VOICE_PITCH: Record<string, number> = {
  fox:      520,
  raccoon:  380,
  bear:     260,
  frog:     680,
  rabbit:   740,
  squirrel: 620,
  deer:     440,
  owl:      320,
  hedgehog: 560,
  cat:      580,
};

export function playDialogueBlip(animalType?: string) {
  play((c) => {
    const basePitch = ANIMAL_VOICE_PITCH[animalType ?? "fox"] ?? 480;
    // Slight random pitch variation per blip, like AC
    const pitch = basePitch * (0.92 + Math.random() * 0.16);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "triangle"; // warmer than sine — more AC-like
    osc.frequency.setValueAtTime(pitch, c.currentTime);
    osc.frequency.setValueAtTime(pitch * 0.95, c.currentTime + 0.04);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.006);
    gain.gain.setValueAtTime(0.14, c.currentTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.075);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.08);
  });
}

// ---------------------------------------------------------------------------
// NPC arrives in village — 4-note ascending jingle (AC "new neighbor" feel)
// ---------------------------------------------------------------------------

export function playNPCArrival() {
  play((c) => {
    // C5 E5 G5 C6 — happy arrival arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = c.currentTime + i * 0.11;
      tone(c, freq, t, 0.28, 0.13, "triangle");
      // Add subtle shimmer on last note
      if (i === notes.length - 1) {
        tone(c, freq * 2, t + 0.03, 0.18, 0.04, "sine");
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Forage agent starts searching — magical rustling sweep
// ---------------------------------------------------------------------------

export function playForagingStart() {
  play((c) => {
    // Ascending sweep: "searching the forest"
    tone(c, 300, c.currentTime, 0.4, 0.06, "sine", 900);
    tone(c, 450, c.currentTime + 0.1, 0.35, 0.05, "sine", 1100);
    noise(c, c.currentTime, 0.3, 0.04, 800);
    // Sparkle notes
    [660, 880, 1100].forEach((freq, i) => {
      tone(c, freq, c.currentTime + 0.15 + i * 0.08, 0.15, 0.06, "triangle");
    });
  });
}

// ---------------------------------------------------------------------------
// Quest complete / deal closed — triumphant fanfare
// ---------------------------------------------------------------------------

export function playQuestComplete() {
  play((c) => {
    // G4 C5 E5 G5 — classic "you did it!"
    const melody = [
      { freq: 392.00, t: 0.00, dur: 0.15 },
      { freq: 523.25, t: 0.15, dur: 0.15 },
      { freq: 659.25, t: 0.30, dur: 0.15 },
      { freq: 783.99, t: 0.45, dur: 0.45 },
    ];
    melody.forEach(({ freq, t, dur }) => {
      tone(c, freq, c.currentTime + t, dur, 0.14, "triangle");
      tone(c, freq * 2, c.currentTime + t, dur * 0.6, 0.05, "sine"); // octave shimmer
    });
    // Bass hit
    tone(c, 130.81, c.currentTime, 0.5, 0.12, "triangle"); // C3
  });
}

// ---------------------------------------------------------------------------
// Vendor replied — two-note "ding dong"
// ---------------------------------------------------------------------------

export function playReply() {
  play((c) => {
    tone(c, 880, c.currentTime, 0.18, 0.11, "triangle");
    tone(c, 1108.73, c.currentTime + 0.16, 0.25, 0.10, "triangle"); // C#6
  });
}

// ---------------------------------------------------------------------------
// Chat message sent — soft blip
// ---------------------------------------------------------------------------

export function playMessage() {
  play((c) => {
    tone(c, 480, c.currentTime, 0.09, 0.09, "sine", 560);
  });
}

// ---------------------------------------------------------------------------
// Button click — crisp tap
// ---------------------------------------------------------------------------

export function playClick() {
  play((c) => {
    tone(c, 900, c.currentTime, 0.06, 0.12, "sine", 700);
    noise(c, c.currentTime, 0.04, 0.03, 3000);
  });
}

// ---------------------------------------------------------------------------
// NPC pop-in — bubble appear
// ---------------------------------------------------------------------------

export function playPop() {
  play((c) => {
    tone(c, 700, c.currentTime, 0.05, 0.10, "sine", 1200);
    tone(c, 1200, c.currentTime + 0.04, 0.08, 0.06, "sine");
  });
}

// ---------------------------------------------------------------------------
// Success chime — C-E-G arpeggio (kept for compatibility)
// ---------------------------------------------------------------------------

export function playChime() {
  play((c) => {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      tone(c, freq, c.currentTime + i * 0.08, 0.4, 0.10, "triangle");
    });
  });
}

// ---------------------------------------------------------------------------
// Page transition whoosh
// ---------------------------------------------------------------------------

export function playWhoosh() {
  play((c) => {
    noise(c, c.currentTime, 0.2, 0.07, 600);
    tone(c, 300, c.currentTime, 0.18, 0.04, "sine", 800);
  });
}

// ---------------------------------------------------------------------------
// Notification — two-note ping
// ---------------------------------------------------------------------------

export function playNotification() {
  play((c) => {
    tone(c, 880, c.currentTime, 0.18, 0.10, "triangle");
    tone(c, 1100, c.currentTime + 0.14, 0.22, 0.09, "triangle");
  });
}

// ---------------------------------------------------------------------------
// Negotiation email drafted — "power-up" ascending
// ---------------------------------------------------------------------------

export function playNegotiate() {
  play((c) => {
    [392, 494, 587, 740].forEach((freq, i) => {
      tone(c, freq, c.currentTime + i * 0.07, 0.15, 0.08, "triangle");
    });
  });
}

// ---------------------------------------------------------------------------
// Ambient background music — peaceful C major pad for title screen
// ---------------------------------------------------------------------------

let _ambientCtx: AudioContext | null = null;
let _ambientInterval: ReturnType<typeof setInterval> | null = null;
let _ambientOscs: OscillatorNode[] = [];

export function startAmbientMusic() {
  if (typeof window === "undefined" || _ambientCtx) return;
  _ambientCtx = new AudioContext();

  const master = _ambientCtx.createGain();
  master.gain.setValueAtTime(0, _ambientCtx.currentTime);
  master.gain.linearRampToValueAtTime(0.07, _ambientCtx.currentTime + 2.5);
  master.connect(_ambientCtx.destination);

  // C → Am → F → G chord loop (peaceful village pad)
  const chords = [
    [261.63, 329.63, 392.00],  // C major
    [220.00, 261.63, 329.63],  // A minor
    [174.61, 220.00, 261.63],  // F major
    [196.00, 246.94, 293.66],  // G major
  ];
  let idx = 0;

  function playChord() {
    if (!_ambientCtx) return;
    // fade out previous
    _ambientOscs.forEach(o => { try { o.stop(_ambientCtx!.currentTime + 1.2); } catch {} });
    _ambientOscs = [];

    const chord = chords[idx % chords.length];
    idx++;
    chord.forEach((freq, i) => {
      const osc = _ambientCtx!.createOscillator();
      const g = _ambientCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * (i === 0 ? 0.5 : 1); // bass note one octave down
      const now = _ambientCtx!.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.28 : 0.20, now + 1.4);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.22 : 0.15, now + 4.5);
      g.gain.linearRampToValueAtTime(0, now + 6.2);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 6.5);
      _ambientOscs.push(osc);
    });
  }

  playChord();
  _ambientInterval = setInterval(playChord, 5000);
}

export function stopAmbientMusic() {
  if (_ambientInterval) { clearInterval(_ambientInterval); _ambientInterval = null; }
  _ambientOscs.forEach(o => { try { o.stop(); } catch {} });
  _ambientOscs = [];
  if (_ambientCtx) { _ambientCtx.close(); _ambientCtx = null; }
}

export const sounds = {
  click: playClick,
  pop: playPop,
  chime: playChime,
  message: playMessage,
  whoosh: playWhoosh,
  notification: playNotification,
  dialogueBlip: playDialogueBlip,
  npcArrival: playNPCArrival,
  foragingStart: playForagingStart,
  questComplete: playQuestComplete,
  reply: playReply,
  negotiate: playNegotiate,
};
