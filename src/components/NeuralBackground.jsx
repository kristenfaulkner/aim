import { useMemo } from "react";

const ACCENT = "#00e5a0";
const BLUE = "#3b82f6";
const PURPLE = "#a078ff";
const TEAL = "#00c8b4";

const categoryColors = { power: ACCENT, recovery: BLUE, health: PURPLE, training: TEAL };

const dataLabels = [
  { text: "FTP 298W", cat: "power" }, { text: "4.2 W/kg", cat: "power" },
  { text: "VO₂max 58", cat: "power" }, { text: "Sprint 1180W", cat: "power" },
  { text: "5min PR ↑", cat: "power" },
  { text: "Deep Sleep 1h22m", cat: "recovery" }, { text: "HRV 68ms", cat: "recovery" },
  { text: "Recovery 92%", cat: "recovery" }, { text: "RHR 47bpm", cat: "recovery" },
  { text: "Sleep Score 88", cat: "recovery" }, { text: "Readiness 94", cat: "recovery" },
  { text: "Ferritin 52", cat: "health" }, { text: "Vitamin D 58", cat: "health" },
  { text: "Hemoglobin 14.2", cat: "health" }, { text: "SpO₂ 98%", cat: "health" },
  { text: "Cortisol Normal", cat: "health" },
  { text: "Fitness ↑", cat: "training" }, { text: "Form +8", cat: "training" },
  { text: "CTL 74", cat: "training" }, { text: "TSS 82", cat: "training" },
  { text: "Training Load ↑", cat: "training" },
];

const seeded = (seed) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};

const keyframes = `
  @keyframes nb-drift {
    0% { transform: translate(0, 0); }
    15% { transform: translate(calc(var(--dx) * 0.8), calc(var(--dy) * -0.6)); }
    30% { transform: translate(var(--dx), var(--dy)); }
    45% { transform: translate(calc(var(--dx) * -0.4), calc(var(--dy) * 1.1)); }
    60% { transform: translate(calc(var(--dx) * -0.9), calc(var(--dy) * -0.3)); }
    75% { transform: translate(calc(var(--dx) * 0.5), calc(var(--dy) * -1.0)); }
    90% { transform: translate(calc(var(--dx) * -0.2), calc(var(--dy) * 0.7)); }
    100% { transform: translate(0, 0); }
  }
  @keyframes nb-breathe {
    0%, 100% { opacity: var(--base-opacity); transform: scale(1); }
    50% { opacity: calc(var(--base-opacity) * 1.6); transform: scale(1.15); }
  }
  @keyframes nb-heartbeat {
    0%, 100% { opacity: var(--line-opacity); }
    10% { opacity: calc(var(--line-opacity) * 2.5); }
    20% { opacity: calc(var(--line-opacity) * 1.8); }
    30% { opacity: var(--line-opacity); }
  }
  @keyframes nb-shootingStar {
    0% { offset-distance: 0%; opacity: 0; }
    5% { opacity: 1; }
    80% { opacity: 0.8; }
    100% { offset-distance: 100%; opacity: 0; }
  }
  @keyframes nb-shootingStarTrail {
    0% { offset-distance: 0%; opacity: 0; width: 0px; }
    5% { opacity: 0.6; width: var(--trail-length); }
    80% { opacity: 0.4; }
    100% { offset-distance: 100%; opacity: 0; width: 0px; }
  }
  @keyframes nb-pulseRing {
    0% { transform: scale(0.5); opacity: 0.4; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes nb-scanLine {
    0% { left: -10%; }
    100% { left: 110%; }
  }
`;

export default function NeuralBackground() {
  const particles = useMemo(() => {
    const rng = seeded(42);
    const isInCenter = (x, y) => x > 25 && x < 75 && y > 30 && y < 70;
    const nodes = [];
    let attempts = 0;
    while (nodes.length < 22 && attempts < 200) {
      attempts++;
      const x = rng() * 100;
      const y = rng() * 100;
      if (isInCenter(x, y)) continue;
      const label = dataLabels[nodes.length % dataLabels.length];
      const color = categoryColors[label.cat];
      nodes.push({
        id: nodes.length, x, y,
        label: label.text, color,
        size: 4 + rng() * 4,
        duration: 10 + rng() * 14,
        delay: rng() * -25,
        driftX: (rng() - 0.5) * 70,
        driftY: (rng() - 0.5) * 60,
        opacity: 0.2 + rng() * 0.5,
        glowSize: 20 + rng() * 30,
        breatheDuration: 3 + rng() * 4,
        breatheDelay: rng() * -5,
      });
    }
    return nodes;
  }, []);

  const ambientDots = useMemo(() => {
    const rng = seeded(99);
    const isInCenter = (x, y) => x > 28 && x < 72 && y > 33 && y < 67;
    const dots = [];
    let attempts = 0;
    while (dots.length < 60 && attempts < 300) {
      attempts++;
      const x = rng() * 100;
      const y = rng() * 100;
      if (isInCenter(x, y)) continue;
      dots.push({
        id: dots.length, x, y,
        color: [ACCENT, BLUE, PURPLE, TEAL][Math.floor(rng() * 4)],
        size: 1 + rng() * 2.5,
        duration: 12 + rng() * 18,
        delay: rng() * -30,
        driftX: (rng() - 0.5) * 60,
        driftY: (rng() - 0.5) * 50,
        opacity: 0.08 + rng() * 0.15,
      });
    }
    return dots;
  }, []);

  const shootingStars = useMemo(() => {
    const rng = seeded(777);
    const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
    const vh = typeof window !== "undefined" ? window.innerHeight : 900;
    return Array.from({ length: 16 }, (_, i) => {
      const startX = rng() * 100;
      const startY = rng() * 100;
      const angle = rng() * Math.PI * 2;
      const dist = 8 + rng() * 18;
      const endX = startX + Math.cos(angle) * dist;
      const endY = startY + Math.sin(angle) * dist;
      const color = [ACCENT, BLUE, PURPLE, TEAL][Math.floor(rng() * 4)];
      return {
        id: i, startX, startY, endX, endY, color,
        duration: 1.5 + rng() * 2.5,
        delay: rng() * 12,
        size: 2 + rng() * 3,
        trailLength: 30 + rng() * 50,
        pathPx: `path("M ${startX * vw / 100} ${startY * vh / 100} L ${endX * vw / 100} ${endY * vh / 100}")`,
      };
    });
  }, []);

  const connections = useMemo(() => {
    const lines = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 18 && lines.length < 60) {
          lines.push({ from: particles[i], to: particles[j], dist });
        }
      }
    }
    return lines;
  }, [particles]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{keyframes}</style>

      {/* Connection lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}>
        {connections.map((c, i) => {
          const opacity = Math.max(0.03, 0.12 - c.dist * 0.005);
          return (
            <line key={i}
              x1={`${c.from.x}%`} y1={`${c.from.y}%`}
              x2={`${c.to.x}%`} y2={`${c.to.y}%`}
              stroke={c.from.color} strokeWidth="0.5"
              style={{
                "--line-opacity": opacity,
                opacity,
                animation: `nb-heartbeat ${3 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${(i * 0.3) % 3}s`,
              }}
            />
          );
        })}
      </svg>

      {/* Ambient dots */}
      {ambientDots.map((d) => (
        <div key={`amb-${d.id}`} style={{
          position: "absolute", left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size, borderRadius: "50%",
          background: d.color, opacity: d.opacity, zIndex: 2,
          "--dx": `${d.driftX}px`, "--dy": `${d.driftY}px`,
          animation: `nb-drift ${d.duration}s ease-in-out infinite`,
          animationDelay: `${d.delay}s`,
        }} />
      ))}

      {/* Data nodes */}
      {particles.map((p) => (
        <div key={`node-${p.id}`} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`, zIndex: 3,
          "--dx": `${p.driftX}px`, "--dy": `${p.driftY}px`,
          animation: `nb-drift ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
        }}>
          {/* Glow */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            width: p.glowSize * 2, height: p.glowSize * 2,
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            background: `radial-gradient(circle, ${p.color}30 0%, transparent 70%)`,
            "--base-opacity": p.opacity * 0.4, opacity: p.opacity * 0.4,
            animation: `nb-breathe ${p.breatheDuration}s ease-in-out infinite`,
            animationDelay: `${p.breatheDelay}s`,
          }} />
          {/* Core dot */}
          <div style={{
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.color,
            "--base-opacity": p.opacity, opacity: p.opacity,
            animation: `nb-breathe ${p.breatheDuration}s ease-in-out infinite`,
            animationDelay: `${p.breatheDelay}s`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}60`,
          }} />
          {/* Label pill */}
          <div style={{
            position: "absolute", left: p.size + 6, top: "50%",
            transform: "translateY(-50%)", whiteSpace: "nowrap",
            fontSize: 11, fontWeight: 500, color: p.color,
            padding: "3px 8px", borderRadius: 5,
            background: `${p.color}0a`, border: `1px solid ${p.color}18`,
            "--base-opacity": p.opacity * 0.7, opacity: p.opacity * 0.7,
            animation: `nb-breathe ${p.breatheDuration}s ease-in-out infinite`,
            animationDelay: `${p.breatheDelay}s`,
          }}>
            {p.label}
          </div>
          {/* Pulse ring */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            width: p.size * 2, height: p.size * 2,
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            border: `1px solid ${p.color}40`,
            animation: `nb-pulseRing ${4 + p.id % 5}s ease-out infinite`,
            animationDelay: `${(p.id * 1.7) % 8}s`,
            opacity: 0,
          }} />
        </div>
      ))}

      {/* Shooting stars */}
      {shootingStars.map((s) => (
        <div key={`star-${s.id}`} style={{ position: "absolute", inset: 0, zIndex: 4 }}>
          <div style={{
            position: "absolute",
            width: s.size * 2, height: s.size * 2, borderRadius: "50%",
            background: s.color,
            boxShadow: `0 0 ${s.size * 4}px ${s.color}, 0 0 ${s.size * 8}px ${s.color}80, 0 0 ${s.size * 12}px ${s.color}40`,
            left: `${s.startX}%`, top: `${s.startY}%`,
            animation: `nb-shootingStar ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            offsetPath: s.pathPx, offsetRotate: "0deg",
          }} />
          <div style={{
            position: "absolute", height: 2, borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${s.color}60, ${s.color})`,
            left: `${s.startX}%`, top: `${s.startY}%`,
            "--trail-length": `${s.trailLength}px`,
            animation: `nb-shootingStarTrail ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            offsetPath: s.pathPx, offsetRotate: "auto",
            transformOrigin: "right center",
          }} />
        </div>
      ))}

      {/* Scan line */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, width: "20%",
        background: `linear-gradient(90deg, transparent, ${ACCENT}06, transparent)`,
        animation: "nb-scanLine 12s linear infinite",
        zIndex: 2, pointerEvents: "none",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(5,6,10,0.7) 100%)",
        zIndex: 5, pointerEvents: "none",
      }} />
    </div>
  );
}
