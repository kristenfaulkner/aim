import { useState, useEffect } from "react";
import { T, font, mono } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { X, Check, Plus, Minus, Dumbbell, Flower2, Waves, Mountain, PersonStanding, Ellipsis } from "lucide-react";

// ── Constants ──

const ACTIVITY_TYPES = [
  { id: "strength", label: "Strength", Icon: Dumbbell },
  { id: "yoga", label: "Yoga", Icon: Flower2 },
  { id: "swimming", label: "Swimming", Icon: Waves },
  { id: "hiking", label: "Hiking", Icon: Mountain },
  { id: "pilates", label: "Pilates", Icon: PersonStanding },
  { id: "other", label: "Other", Icon: Ellipsis },
];

const BODY_REGIONS = [
  { id: "upper_body", label: "Upper Body" },
  { id: "lower_body", label: "Lower Body" },
  { id: "full_body", label: "Full Body" },
  { id: "core", label: "Core" },
];

const INTENSITIES = [
  { value: 1, label: "Easy", color: "#10b981" },
  { value: 2, label: "Light", color: "#34d399" },
  { value: 3, label: "Moderate", color: "#f59e0b" },
  { value: 4, label: "Hard", color: "#f97316" },
  { value: 5, label: "Max", color: "#ef4444" },
];

const DURATION_DEFAULTS = {
  strength: 60, yoga: 45, swimming: 30, hiking: 60, pilates: 45, other: 30,
};

const IMPACT_COLORS = {
  none: { text: T.accent, bg: "rgba(16,185,129,0.1)" },
  minor: { text: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  moderate: { text: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  major: { text: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

const IMPACT_MESSAGES = {
  none: "This session has no impact on your cycling recovery",
  minor: "This session will have a minor impact on tomorrow's cycling performance",
  moderate: "This session will have a moderate impact on tomorrow's cycling performance",
  major: "This session will have a major impact on tomorrow's cycling performance",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Main Component ──

export default function CrossTrainingLogger({ isOpen, onClose, isMobile }) {
  const [stage, setStage] = useState("input");
  const [activityType, setActivityType] = useState(null);
  const [bodyRegion, setBodyRegion] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [attempted, setAttempted] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage("input");
      setActivityType(null);
      setBodyRegion(null);
      setIntensity(null);
      setDuration(30);
      setNotes("");
      setDate(todayISO());
      setSaving(false);
      setError(null);
      setResult(null);
      setAttempted(false);
    }
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTypeSelect = (typeId) => {
    setActivityType(typeId);
    setDuration(DURATION_DEFAULTS[typeId] || 30);
    if (typeId !== "strength") setBodyRegion(null);
  };

  const canSave = activityType && intensity && duration > 0;

  const handleSave = async () => {
    setAttempted(true);
    if (!canSave) return;
    try {
      setSaving(true);
      setError(null);
      const data = await apiFetch("/cross-training/log", {
        method: "POST",
        body: JSON.stringify({
          activity_type: activityType,
          body_region: activityType === "strength" ? bodyRegion : null,
          perceived_intensity: intensity,
          duration_minutes: duration,
          notes: notes.trim() || null,
          date,
        }),
      });
      setResult(data.entry);
      setStage("confirmed");
    } catch (err) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogAnother = () => {
    setStage("input");
    setActivityType(null);
    setBodyRegion(null);
    setIntensity(null);
    setDuration(30);
    setNotes("");
    setDate(todayISO());
    setError(null);
    setResult(null);
    setAttempted(false);
  };

  const selectedType = ACTIVITY_TYPES.find(t => t.id === activityType);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 300,
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
      }}
    >
      <div style={{
        background: T.card,
        borderRadius: isMobile ? 0 : 20,
        maxWidth: isMobile ? "100%" : 480,
        width: "100%",
        height: isMobile ? "100vh" : "auto",
        maxHeight: isMobile ? "100vh" : "85vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: T.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Dumbbell size={16} color={T.white} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: font }}>Log Cross-Training</div>
              <div style={{ fontSize: 11, color: T.textDim, fontFamily: font }}>Track non-cycling sessions</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: "none", background: T.surface,
              color: T.textSoft, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {stage === "input" && (
            <>
              {/* Error banner */}
              {error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: T.danger, fontSize: 12, fontFamily: font,
                }}>{error}</div>
              )}

              {/* Activity Type Grid */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: font }}>Activity Type</div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}>
                  {ACTIVITY_TYPES.map(({ id, label, Icon }) => {
                    const selected = activityType === id;
                    const showError = attempted && !activityType;
                    return (
                      <button
                        key={id}
                        onClick={() => handleTypeSelect(id)}
                        style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          gap: 6, padding: 12,
                          width: "100%", height: 80,
                          borderRadius: 12,
                          border: `2px solid ${selected ? T.accent : showError ? "rgba(239,68,68,0.3)" : T.border}`,
                          background: selected ? T.accentDim : T.surface,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: font,
                        }}
                      >
                        <Icon size={22} color={selected ? T.accent : T.textSoft} strokeWidth={selected ? 2.2 : 1.8} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: selected ? T.accent : T.textSoft }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Body Region (Strength only) */}
              {activityType === "strength" && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: font }}>Body Region</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {BODY_REGIONS.map(({ id, label }) => {
                      const selected = bodyRegion === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setBodyRegion(id)}
                          style={{
                            padding: "7px 14px", borderRadius: 9999,
                            border: `1px solid ${selected ? T.accent : T.border}`,
                            background: selected ? T.accentDim : T.card,
                            color: selected ? T.accent : T.textSoft,
                            fontSize: 12, fontWeight: 500,
                            cursor: "pointer", fontFamily: font,
                            transition: "all 0.15s",
                          }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Intensity Selector */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: font }}>Perceived Intensity</div>
                <div style={{ display: "flex", gap: isMobile ? 6 : 8, justifyContent: "space-between" }}>
                  {INTENSITIES.map(({ value, label, color }) => {
                    const selected = intensity === value;
                    const showError = attempted && !intensity;
                    return (
                      <button
                        key={value}
                        onClick={() => setIntensity(value)}
                        style={{
                          flex: 1,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", gap: 4,
                          padding: "10px 4px",
                          borderRadius: 10,
                          border: `2px solid ${selected ? color : showError ? "rgba(239,68,68,0.3)" : "transparent"}`,
                          background: selected ? `${color}18` : "transparent",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: font,
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 9999,
                          background: selected ? color : T.surface,
                          border: selected ? "none" : `1px solid ${T.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: selected ? T.white : T.textDim,
                          fontSize: 13, fontWeight: 700, fontFamily: mono,
                          transition: "all 0.15s",
                        }}>{value}</div>
                        <span style={{ fontSize: 9, color: selected ? color : T.textDim, fontWeight: 500 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: font }}>Duration</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                  <button
                    onClick={() => setDuration(d => Math.max(5, d - 5))}
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      border: `1px solid ${T.border}`, background: T.surface,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: T.text,
                    }}
                  >
                    <Minus size={18} />
                  </button>
                  <div style={{ textAlign: "center", minWidth: 80 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: T.text }}>{duration}</span>
                    <span style={{ fontSize: 14, color: T.textSoft, marginLeft: 4, fontFamily: font }}>min</span>
                  </div>
                  <button
                    onClick={() => setDuration(d => d + 5)}
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      border: `1px solid ${T.border}`, background: T.surface,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: T.text,
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details? (optional)"
                  style={{
                    width: "100%", padding: "10px 14px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    fontSize: 13, fontFamily: font,
                    color: T.text, outline: "none",
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = T.accent; }}
                  onBlur={(e) => { e.target.style.borderColor = T.border; }}
                />
              </div>

              {/* Date */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: T.textSoft, fontFamily: font }}>Date:</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={todayISO()}
                    style={{
                      padding: "5px 10px", borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: T.surface,
                      fontSize: 12, fontFamily: font, color: T.text,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%", padding: "12px 0",
                  borderRadius: 12, border: "none",
                  background: canSave ? T.gradient : T.surface,
                  color: canSave ? T.white : T.textDim,
                  fontSize: 14, fontWeight: 700,
                  fontFamily: font, cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {saving ? "Saving..." : "Save Session"}
              </button>
            </>
          )}

          {stage === "confirmed" && result && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              {/* Success icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 9999,
                background: "rgba(16,185,129,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <Check size={28} color={T.accent} strokeWidth={2.5} />
              </div>

              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: font, marginBottom: 6 }}>
                Session Logged!
              </div>

              {/* Activity summary */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginBottom: 16,
              }}>
                {selectedType && <selectedType.Icon size={18} color={T.textSoft} />}
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: font }}>
                  {selectedType?.label || activityType}
                </span>
                <span style={{ fontSize: 13, color: T.textSoft, fontFamily: mono }}>
                  {duration} min
                </span>
              </div>

              {/* Estimated TSS */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10,
                background: T.surface, marginBottom: 12,
              }}>
                <span style={{ fontSize: 12, color: T.textSoft, fontFamily: font }}>Estimated TSS:</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: mono }}>
                  ~{result.estimated_tss}
                </span>
              </div>

              {/* Recovery Impact Badge */}
              {result.recovery_impact && (
                <div style={{ marginBottom: 14 }}>
                  <span style={{
                    display: "inline-block",
                    padding: "5px 14px", borderRadius: 9999,
                    fontSize: 12, fontWeight: 600,
                    background: IMPACT_COLORS[result.recovery_impact]?.bg || T.surface,
                    color: IMPACT_COLORS[result.recovery_impact]?.text || T.textSoft,
                    fontFamily: font,
                  }}>
                    {result.recovery_impact.charAt(0).toUpperCase() + result.recovery_impact.slice(1)} Impact
                  </span>
                </div>
              )}

              {/* Impact message */}
              <div style={{
                fontSize: 13, color: T.textSoft, lineHeight: 1.6,
                maxWidth: 320, margin: "0 auto 24px",
                fontFamily: font,
              }}>
                {IMPACT_MESSAGES[result.recovery_impact] || "Session logged successfully."}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 32px", borderRadius: 10,
                    background: T.accent, color: T.white,
                    border: "none", fontSize: 13, fontWeight: 700,
                    fontFamily: font, cursor: "pointer",
                  }}
                >Done</button>
                <button
                  onClick={handleLogAnother}
                  style={{
                    padding: "6px 16px", borderRadius: 8,
                    background: "none", border: "none",
                    color: T.accent, fontSize: 12, fontWeight: 600,
                    fontFamily: font, cursor: "pointer",
                  }}
                >Log Another</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
