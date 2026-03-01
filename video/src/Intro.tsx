import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

// ── Colors (match project palette) ──────────────────────────────────────────
const C = {
  dark:       "#0d0800",
  cream:      "#fffbe6",
  primary:    "#5a8a3c",
  primaryDark:"#3a6020",
  accent:     "#f0c84a",
  muted:      "#8a7040",
  red:        "#c0392b",
  white:      "#ffffff",
};

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, startFrame: number, fps: number, charsPerSec = 28) {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.floor((elapsed / fps) * charsPerSec);
  return text.slice(0, Math.min(chars, text.length));
}

// ── Scene 1: "AI made software easy." (0–3s) ────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1 = useTypewriter("AI made software easy.", 10, fps, 22);
  const line2 = useTypewriter("Build a physical product?", 80, fps, 22);

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const line1Opacity = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: "clamp" });
  const line2Opacity = interpolate(frame, [78, 90], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.dark, opacity: bgOpacity }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 24,
        fontFamily: "'Fredoka One', 'Arial Rounded MT Bold', sans-serif",
      }}>
        <div style={{
          fontSize: 64, color: C.cream, opacity: line1Opacity,
          letterSpacing: "0.01em", textAlign: "center",
        }}>
          {line1}
          {line1.length < "AI made software easy.".length && (
            <span style={{ opacity: frame % 30 < 20 ? 1 : 0, color: C.accent }}>▌</span>
          )}
        </div>
        <div style={{
          fontSize: 56, color: C.muted, opacity: line2Opacity,
          letterSpacing: "0.01em", textAlign: "center",
        }}>
          {line2}
          {line2.length < "Build a physical product?".length && line2.length > 0 && (
            <span style={{ opacity: frame % 30 < 20 ? 1 : 0, color: C.accent }}>▌</span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 2: "Still brutal." slam (2.5–5.5s) ────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slamProgress = spring({ frame, fps, config: { damping: 10, stiffness: 280, mass: 0.8 } });
  const scale = interpolate(slamProgress, [0, 1], [3.5, 1]);
  const opacity = interpolate(slamProgress, [0, 0.3], [0, 1]);
  const rotation = interpolate(slamProgress, [0, 1], [-8, 0]);

  const bg = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `rgba(13,8,0,${bg})` }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Fredoka One', 'Arial Rounded MT Bold', sans-serif",
      }}>
        {/* "Still brutal." */}
        <div style={{
          fontSize: 120,
          color: C.red,
          opacity,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          textShadow: `0 0 60px rgba(192,57,43,0.6), 0 4px 0 rgba(0,0,0,0.5)`,
          letterSpacing: "-0.02em",
        }}>
          Still brutal.
        </div>

        {/* Skull emoji pop */}
        <div style={{
          fontSize: 80,
          marginTop: 20,
          opacity: interpolate(frame, [12, 20], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(
            spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 8, stiffness: 300 } }),
            [0, 1], [0.3, 1]
          )})`,
        }}>
          💀
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: Village reveal + NPCs (5–11s) ──────────────────────────────────
const NPCS = [
  { file: "gomi.png",  x: 18, delay: 0,   fromLeft: true  },
  { file: "foxi.png",  x: 36, delay: 5,   fromLeft: true  },
  { file: "deer.png",  x: 56, delay: 10,  fromLeft: false },
  { file: "lion.png",  x: 74, delay: 15,  fromLeft: false },
  { file: "rabi.png",  x: 88, delay: 20,  fromLeft: false },
];

function Scene3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgFade = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const bgScale = interpolate(frame, [0, 60], [1.12, 1.0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill>
      {/* Background */}
      <AbsoluteFill style={{ opacity: bgFade }}>
        <Img
          src={staticFile("background.png")}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${bgScale})`,
            transformOrigin: "center center",
          }}
        />
        {/* Overlay tint */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.22)",
        }} />
      </AbsoluteFill>

      {/* NPCs walking in */}
      {NPCS.map((npc) => {
        const npcFrame = Math.max(0, frame - npc.delay);
        const bounceProgress = spring({
          frame: npcFrame,
          fps,
          config: { damping: 11, stiffness: 200, mass: 0.9 },
        });
        const slideX = interpolate(bounceProgress, [0, 1], [npc.fromLeft ? -15 : 15, 0]);
        const opacity = interpolate(bounceProgress, [0, 0.4], [0, 1]);
        const bobY = Math.sin((frame + npc.delay * 5) * 0.08) * 6;

        return (
          <div
            key={npc.file}
            style={{
              position: "absolute",
              bottom: "16%",
              left: `${npc.x}%`,
              transform: `translateX(${slideX}%) translateY(${bobY}px)`,
              opacity,
            }}
          >
            <Img
              src={staticFile(npc.file)}
              style={{
                width: 90, height: 90,
                imageRendering: "pixelated",
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        );
      })}

      {/* "Your village awaits" whisper text */}
      <div style={{
        position: "absolute", bottom: "6%", width: "100%", textAlign: "center",
        opacity: interpolate(frame, [40, 60], [0, 0.7], { extrapolateRight: "clamp" }),
        fontFamily: "'Fredoka One', sans-serif",
        fontSize: 26, color: C.cream, letterSpacing: "0.12em",
        textTransform: "uppercase",
        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
      }}>
        your village awaits
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: FORAGE title slam (9–14s) ──────────────────────────────────────
const LETTERS = ["F", "O", "R", "A", "G", "E"];

function Scene4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dim overlay fades in over background
  const overlayOpacity = interpolate(frame, [0, 20], [0, 0.72], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Dark overlay over village */}
      <div style={{
        position: "absolute", inset: 0,
        background: `rgba(13,8,0,${overlayOpacity})`,
      }} />

      {/* FORAGE letters — each springs in with stagger */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 4,
      }}>
        {LETTERS.map((letter, i) => {
          const letterFrame = Math.max(0, frame - i * 5);
          const progress = spring({
            frame: letterFrame,
            fps,
            config: { damping: 9, stiffness: 320, mass: 0.7 },
          });
          const scale = interpolate(progress, [0, 1], [0, 1]);
          const opacity = interpolate(progress, [0, 0.3], [0, 1]);
          const translateY = interpolate(progress, [0, 1], [80, 0]);

          return (
            <div
              key={i}
              style={{
                fontSize: 180,
                fontFamily: "'Fredoka One', 'Arial Rounded MT Bold', sans-serif",
                fontWeight: 900,
                color: C.primary,
                opacity,
                transform: `scale(${scale}) translateY(${translateY}px)`,
                textShadow: `
                  0 6px 0 ${C.primaryDark},
                  0 12px 40px rgba(0,0,0,0.5),
                  0 0 80px rgba(90,138,60,0.3)
                `,
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {letter}
            </div>
          );
        })}
      </div>

      {/* Leaf burst under logo */}
      {[...Array(8)].map((_, i) => {
        const burstFrame = Math.max(0, frame - 28);
        const progress = spring({ frame: burstFrame, fps, config: { damping: 18, stiffness: 200 } });
        const angle = (i / 8) * Math.PI * 2;
        const dist = interpolate(progress, [0, 1], [0, 120]);
        const opacity = interpolate(progress, [0, 0.2, 0.7, 1], [0, 1, 0.8, 0]);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity,
              fontSize: 28,
              pointerEvents: "none",
            }}
          >
            🌿
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ── Scene 5: Tagline + Badge (13–18s) ───────────────────────────────────────
function Scene5() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tagline = "Your AI sourcing team for physical products";
  const typed = useTypewriter(tagline, 10, fps, 30);

  const taglineOpacity = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: "clamp" });
  const badgeProgress = spring({
    frame: Math.max(0, frame - 55),
    fps,
    config: { damping: 14, stiffness: 280 },
  });
  const badgeScale = interpolate(badgeProgress, [0, 1], [0.6, 1]);
  const badgeOpacity = interpolate(badgeProgress, [0, 0.4], [0, 1]);

  // Final fade to black
  const fadeOut = interpolate(frame, [75, 100], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Dark overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(13,8,0,0.78)" }} />

      {/* Tagline */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 40,
      }}>
        <div style={{
          fontSize: 52,
          fontFamily: "'Fredoka One', 'Arial Rounded MT Bold', sans-serif",
          color: C.cream,
          opacity: taglineOpacity,
          textAlign: "center",
          maxWidth: "80%",
          lineHeight: 1.25,
          textShadow: "0 2px 20px rgba(0,0,0,0.6)",
        }}>
          {typed}
          {typed.length < tagline.length && (
            <span style={{ opacity: frame % 24 < 16 ? 1 : 0, color: C.primary }}>▌</span>
          )}
        </div>

        {/* Hackathon badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(255,251,230,0.1)",
          border: `2px solid rgba(240,200,74,0.4)`,
          borderRadius: 999,
          padding: "10px 28px",
          opacity: badgeOpacity,
          transform: `scale(${badgeScale})`,
        }}>
          <span style={{ fontSize: 22 }}>🏆</span>
          <span style={{
            fontFamily: "'Fredoka One', sans-serif",
            fontSize: 22,
            color: C.accent,
            letterSpacing: "0.05em",
          }}>
            Browser Use Hackathon · YC HQ · 2026
          </span>
        </div>
      </div>

      {/* Fade to black */}
      <div style={{
        position: "absolute", inset: 0,
        background: C.dark,
        opacity: fadeOut,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── Root Composition ──────────────────────────────────────────────────────────
export function Intro() {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: C.dark, fontFamily: "sans-serif" }}>
      {/* Scene 1: "AI made software easy" (0-5s) */}
      <Sequence from={0} durationInFrames={fps * 5}>
        <Scene1 />
      </Sequence>

      {/* Scene 2: "Still brutal." (2.5-5.5s) */}
      <Sequence from={fps * 2.5} durationInFrames={fps * 3.5}>
        <Scene2 />
      </Sequence>

      {/* Scene 3: Village reveal (5-11s) */}
      <Sequence from={fps * 5} durationInFrames={fps * 7}>
        <Scene3 />
      </Sequence>

      {/* Scene 4: FORAGE logo (9-14s) — overlaps scene 3 */}
      <Sequence from={fps * 9} durationInFrames={fps * 6}>
        <Scene4 />
      </Sequence>

      {/* Scene 5: Tagline + fade (13-19s) */}
      <Sequence from={fps * 13} durationInFrames={fps * 6}>
        <Scene5 />
      </Sequence>
    </AbsoluteFill>
  );
}
