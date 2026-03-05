import { useState, useEffect } from "react";
import { T, font, mono } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { Check } from "lucide-react";

// ── Keyframe styles injected once ──
const KEYFRAMES = `
@keyframes ciModalFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ciSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ciSlideDown {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(24px); }
}
@keyframes ciBounce {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes ciCheckDraw {
  0%   { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}
@keyframes ciCircleGrow {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`;

let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected) return;
  const style = document.createElement("style");
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

// ── Rating row config ──
const FIELDS = [
  {
    key: "life_stress",
    emoji: "\uD83E\uDDE0",
    label: "Life Stress",
    low: "None",
    high: "Overwhelming",
    invertColors: true, // 1=green (good), 5=red (bad)
  },
  {
    key: "motivation",
    emoji: "\uD83D\uDD25",
    label: "Motivation",
    low: "Very Low",
    high: "Fired Up",
    invertColors: false, // 1=red (bad), 5=green (good)
  },
  {
    key: "muscle_soreness",
    emoji: "\uD83D\uDCAA",
    label: "Muscle Soreness",
    low: "None",
    high: "Very Sore",
    invertColors: true,
  },
  {
    key: "mood",
    emoji: "\uD83D\uDE0A",
    label: "Mood",
    low: "Poor",
    high: "Excellent",
    invertColors: false,
  },
];

// Color for a selected circle based on value + whether inverted
function circleColor(value, invertColors) {
  // green → yellow → red for inverted (low is good)
  // red → yellow → green for non-inverted (high is good)
  const colors = ["#10b981", "#6ee7b7", "#fbbf24", "#fb923c", "#ef4444"];
  const idx = value - 1; // 0-4
  return invertColors ? colors[idx] : colors[4 - idx];
}

// ── Sub-components ──

function RatingRow({ field, value, onSelect, isMobile }) {
  const [bounceIdx, setBounceIdx] = useState(null);

  function handleSelect(val) {
    setBounceIdx(val);
    onSelect(val);
    setTimeout(() => setBounceIdx(null), 150);
  }

  const circleSize = isMobile ? 44 : 36;
  const selectedSize = isMobile ? 44 : 40;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>{field.emoji}</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: T.text,
            fontFamily: font,
          }}
        >
          {field.label}
        </span>
      </div>

      {/* Circles */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: isMobile ? 12 : 14,
        }}
      >
        {[1, 2, 3, 4, 5].map((val) => {
          const isSelected = value === val;
          const size = isSelected ? selectedSize : circleSize;
          const bg = isSelected ? circleColor(val, field.invertColors) : T.surface;
          const color = isSelected ? T.white : T.textSoft;
          const border = isSelected ? "none" : `1.5px solid ${T.border}`;
          const isBouncing = bounceIdx === val;

          return (
            <button
              key={val}
              onClick={() => handleSelect(val)}
              aria-label={`${field.label} ${val}`}
              style={{
                width: size,
                height: size,
                minWidth: 44,
                minHeight: 44,
                borderRadius: "50%",
                background: bg,
                border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                animation: isBouncing ? "ciBounce 0.15s ease" : "none",
                fontFamily: mono,
                fontSize: 14,
                fontWeight: 700,
                color,
                padding: 0,
                flexShrink: 0,
              }}
            >
              {val}
            </button>
          );
        })}
      </div>

      {/* Endpoint labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          paddingLeft: isMobile ? 0 : 2,
          paddingRight: isMobile ? 0 : 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: T.textDim,
            fontFamily: font,
          }}
        >
          {field.low}
        </span>
        <span
          style={{
            fontSize: 11,
            color: T.textDim,
            fontFamily: font,
          }}
        >
          {field.high}
        </span>
      </div>
    </div>
  );
}

function SuccessCheckmark() {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "rgba(16,185,129,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
        animation: "ciCircleGrow 0.4s ease forwards",
      }}
    >
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="#10b981"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={24}
          strokeDashoffset={0}
          style={{ animation: "ciCheckDraw 0.4s ease 0.2s backwards" }}
        />
      </svg>
    </div>
  );
}

// ── Main Component ──

export default function CheckInModal({
  athleteName = "there",
  initialValues = null,
  isFirstTime = false,
  isMobile = false,
  onComplete,
  onSkip,
}) {
  const [scores, setScores] = useState({
    life_stress: initialValues?.life_stress_score ?? null,
    motivation: initialValues?.motivation_score ?? null,
    muscle_soreness: initialValues?.muscle_soreness_score ?? null,
    mood: initialValues?.mood_score ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("input"); // input | success
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hasAnyValue = Object.values(scores).some((v) => v != null);
  const isEditing = initialValues != null;

  function handleSetScore(key, val) {
    setScores((prev) => ({ ...prev, [key]: prev[key] === val ? null : val }));
  }

  async function handleSave() {
    if (!hasAnyValue || saving) return;
    setSaving(true);
    setError(null);

    try {
      const body = {};
      if (scores.life_stress != null) body.life_stress = scores.life_stress;
      if (scores.motivation != null) body.motivation = scores.motivation;
      if (scores.muscle_soreness != null)
        body.muscle_soreness = scores.muscle_soreness;
      if (scores.mood != null) body.mood = scores.mood;

      const data = await apiFetch("/checkin/submit", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setStage("success");

      // Auto-dismiss after 1.5s
      setTimeout(() => {
        animateExit(() => onComplete?.(data.checkin));
      }, 1500);
    } catch (err) {
      setError(err.message || "Couldn't save check-in. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function animateExit(callback) {
    setExiting(true);
    setTimeout(() => callback?.(), 250);
  }

  function handleSkip() {
    animateExit(() => onSkip?.());
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${athleteName}`;
    if (hour < 17) return `Good afternoon, ${athleteName}`;
    return `Good evening, ${athleteName}`;
  })();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 300,
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        animation: exiting
          ? "ciModalFadeIn 0.25s ease reverse forwards"
          : "ciModalFadeIn 0.2s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: isMobile ? 0 : 20,
          maxWidth: isMobile ? "100%" : 460,
          width: "100%",
          height: isMobile ? "100vh" : "auto",
          maxHeight: isMobile ? "100vh" : "90vh",
          padding: isMobile ? 24 : 32,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          boxShadow: isMobile
            ? "none"
            : "0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)",
          animation: exiting
            ? "ciSlideDown 0.25s ease forwards"
            : "ciSlideUp 0.3s ease",
        }}
      >
        {stage === "input" && (
          <>
            {/* Greeting */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: T.text,
                fontFamily: font,
                marginBottom: 4,
              }}
            >
              {greeting}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: T.textSoft,
                fontFamily: font,
                marginBottom: isFirstTime ? 12 : 28,
              }}
            >
              {isEditing
                ? "Update your check-in"
                : "Quick check-in \u2014 how are you feeling?"}
            </div>

            {/* First-time tooltip */}
            {isFirstTime && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: T.gradientSubtle,
                  border: `1px solid ${T.accentMid}`,
                  fontSize: 12,
                  color: T.textSoft,
                  lineHeight: 1.5,
                  fontFamily: font,
                  marginBottom: 24,
                }}
              >
                AIM uses your daily check-in to personalize your readiness score
                and training recommendations. Takes 15 seconds.
              </div>
            )}

            {/* Rating rows */}
            {FIELDS.map((field) => (
              <RatingRow
                key={field.key}
                field={field}
                value={scores[field.key]}
                onSelect={(val) => handleSetScore(field.key, val)}
                isMobile={isMobile}
              />
            ))}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: T.danger,
                  fontSize: 12,
                  fontFamily: font,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!hasAnyValue || saving}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "none",
                background:
                  hasAnyValue && !saving
                    ? "linear-gradient(135deg, #10b981, #3b82f6)"
                    : T.surface,
                color: hasAnyValue && !saving ? T.white : T.textDim,
                fontSize: 16,
                fontWeight: 600,
                fontFamily: font,
                cursor: hasAnyValue && !saving ? "pointer" : "default",
                opacity: hasAnyValue && !saving ? 1 : 0.5,
                transition: "all 0.15s ease",
                marginTop: 4,
              }}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update & Continue"
                  : "Save & Continue"}
            </button>

            {/* Skip link */}
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                onClick={handleSkip}
                style={{
                  background: "none",
                  border: "none",
                  color: T.textDim,
                  fontSize: 13,
                  fontFamily: font,
                  cursor: "pointer",
                  padding: "4px 8px",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.textDecoration = "underline")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.textDecoration = "none")
                }
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {stage === "success" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              padding: "40px 0",
            }}
          >
            <SuccessCheckmark />

            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: T.text,
                fontFamily: font,
                marginBottom: 8,
              }}
            >
              You're all set!
            </div>

            <div
              style={{
                fontSize: 13,
                color: T.textSoft,
                fontFamily: font,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Check-in saved. Your readiness score has been updated.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Check-In Summary Card (shown after completion) ──

export function CheckInSummaryCard({ checkin, onEdit }) {
  if (!checkin) return null;

  const items = [
    { emoji: "\uD83E\uDDE0", value: checkin.life_stress_score },
    { emoji: "\uD83D\uDD25", value: checkin.motivation_score },
    { emoji: "\uD83D\uDCAA", value: checkin.muscle_soreness_score },
    { emoji: "\uD83D\uDE0A", value: checkin.mood_score },
  ];

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Check size={14} color={T.accent} strokeWidth={2.5} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.text,
            fontFamily: font,
          }}
        >
          Morning Check-In
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginLeft: 8,
          }}
        >
          {items.map(
            (item, i) =>
              item.value != null && (
                <span
                  key={i}
                  style={{
                    fontSize: 13,
                    fontFamily: font,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.text,
                    }}
                  >
                    {item.value}
                  </span>
                </span>
              )
          )}
        </div>
      </div>

      <button
        onClick={onEdit}
        style={{
          background: "none",
          border: "none",
          color: T.accent,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: font,
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        Edit
      </button>
    </div>
  );
}
