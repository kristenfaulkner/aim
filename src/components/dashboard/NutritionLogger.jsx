import { useState, useRef, useEffect } from "react";
import { T, font, mono } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { X, Sparkles, Send, Check } from "lucide-react";

// ── Keyframe styles injected once ──
const KEYFRAMES = `
@keyframes nlFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes nlBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%           { transform: translateY(-4px); }
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

// ── Color helpers ──
const accentSoft = "rgba(16,185,129,0.08)";
const accentDark = "#059669";
const yellowSoft = "rgba(245,158,11,0.08)";
const blueSoft = "rgba(59,130,246,0.08)";
const surfaceHover = "#f2f2f5";

// ── Sub-components ──

function MessageBubble({ role, children }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: role === "user" ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      {role === "assistant" && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            marginRight: 8,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${T.accent}, ${accentDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={13} color={T.white} />
        </div>
      )}
      <div
        style={{
          maxWidth: "85%",
          padding: "10px 14px",
          borderRadius: 16,
          borderBottomRightRadius: role === "user" ? 4 : 16,
          borderBottomLeftRadius: role === "assistant" ? 4 : 16,
          background: role === "user" ? T.accent : T.white,
          color: role === "user" ? T.white : T.text,
          border:
            role === "assistant" ? `1px solid ${T.border}` : "none",
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: font,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <MessageBubble role="assistant">
      <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: T.textDim,
              animation: `nlBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </MessageBubble>
  );
}

function FollowUpQuestion({ question, options, selected, onSelect }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: T.text,
          marginBottom: 6,
          fontFamily: font,
        }}
      >
        {question}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: 9999,
              border: `1px solid ${selected === opt ? T.accent : T.border}`,
              background: selected === opt ? accentSoft : T.white,
              color: selected === opt ? accentDark : T.textSoft,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: font,
              transition: "all 0.15s ease",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function PerHourBadge({ carbsPerHour }) {
  const isLow = carbsPerHour < 60;
  const isGood = carbsPerHour >= 60 && carbsPerHour <= 90;
  // isHigh implied when > 90

  const bgColor = isLow ? yellowSoft : isGood ? accentSoft : blueSoft;
  const fgColor = isLow ? T.warn : isGood ? T.accent : T.blue;
  const label = isLow
    ? "Below target"
    : isGood
      ? "Good fueling"
      : "Strong intake";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 9999,
          background: bgColor,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 18,
            fontWeight: 700,
            color: fgColor,
          }}
        >
          {carbsPerHour}g
        </span>
        <span style={{ fontSize: 11, color: T.textSoft }}>carbs/hr</span>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          fontFamily: font,
          color: fgColor,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function NutritionTable({
  items,
  totals,
  perHour,
  rideDurationHours,
  aiInsight,
  onEdit,
  onConfirm,
  saving,
}) {
  const carbsPerHour = perHour?.carbs ?? 0;
  const isLow = carbsPerHour < 60;

  return (
    <div
      style={{
        background: T.white,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}
    >
      {/* Header with per-hour badge */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
            fontFamily: font,
          }}
        >
          Ride Nutrition
          {rideDurationHours
            ? ` \u00B7 ${rideDurationHours}h ride`
            : ""}
        </div>
        <PerHourBadge carbsPerHour={carbsPerHour} />
      </div>

      {/* Items list */}
      <div style={{ padding: "10px 16px" }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom:
                i < items.length - 1
                  ? `1px solid ${T.border}`
                  : "none",
            }}
          >
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>
              {item.icon || "\uD83C\uDF7D\uFE0F"}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: T.text,
                  fontFamily: font,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  fontFamily: font,
                }}
              >
                {item.qty}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                }}
              >
                {item.carbs}g
              </div>
              <div style={{ fontSize: 10, color: T.textDim }}>carbs</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 50 }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  color: T.textSoft,
                }}
              >
                {item.calories}
              </div>
              <div style={{ fontSize: 10, color: T.textDim }}>kcal</div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals row */}
      <div
        style={{
          padding: "12px 16px",
          background: surfaceHover,
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Carbs", value: `${totals.carbs}g`, color: T.accent },
            { label: "Protein", value: `${totals.protein}g`, color: T.blue },
            { label: "Fat", value: `${totals.fat}g`, color: T.orange },
            { label: "Calories", value: `${totals.calories}`, color: T.text },
          ].map((t) => (
            <div key={t.label}>
              <div
                style={{
                  fontSize: 10,
                  color: T.textDim,
                  fontFamily: font,
                }}
              >
                {t.label}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 14,
                  fontWeight: 600,
                  color: t.color,
                }}
              >
                {t.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI insight */}
      {aiInsight && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: isLow ? yellowSoft : accentSoft,
              border: `1px solid ${isLow ? T.warn : T.accent}18`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.text,
                marginBottom: 4,
                fontFamily: font,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Sparkles size={12} color={T.accent} />
              Fueling Analysis
            </div>
            <p
              style={{
                fontSize: 12,
                color: T.textSoft,
                lineHeight: 1.6,
                fontFamily: font,
                margin: 0,
              }}
            >
              {aiInsight}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onEdit}
          style={{
            padding: "7px 16px",
            borderRadius: 9999,
            border: `1px solid ${T.border}`,
            background: T.white,
            color: T.textSoft,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          Edit Items
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          style={{
            padding: "7px 18px",
            borderRadius: 9999,
            border: "none",
            background: T.accent,
            color: T.white,
            fontSize: 12,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            fontFamily: font,
            transition: "opacity 0.15s",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Confirm & Save"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function NutritionLogger({
  isOpen,
  onClose,
  activityId,
  rideDurationHours,
  isMobile,
}) {
  const [stage, setStage] = useState("input");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Follow-up state
  const [followUps, setFollowUps] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({});

  // Parsed nutrition result
  const [parsed, setParsed] = useState(null);

  // Confirmed summary text
  const [confirmedSummary, setConfirmedSummary] = useState("");

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Inject keyframes on mount
  useEffect(() => {
    injectKeyframes();
  }, []);

  // Focus input when stage changes to input
  useEffect(() => {
    if (stage === "input" && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [stage, isOpen]);

  // Scroll chat to bottom when follow-ups change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [followUpAnswers, stage]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage("input");
      setInput("");
      setLoading(false);
      setSaving(false);
      setError(null);
      setFollowUps([]);
      setFollowUpAnswers({});
      setParsed(null);
      setConfirmedSummary("");
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── API: Parse nutrition ──
  async function handleParse(text) {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const body = {
        text: text.trim(),
        activityId: activityId || undefined,
        rideDurationHours: rideDurationHours || undefined,
      };

      // If we have follow-up answers, include them
      if (Object.keys(followUpAnswers).length > 0) {
        body.followUpAnswers = followUpAnswers;
      }

      const data = await apiFetch("/nutrition/parse", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // If the API returns follow-up questions
      if (data.followUps && data.followUps.length > 0 && stage === "input") {
        setFollowUps(data.followUps);
        setStage("followup");
      } else {
        // We have a parsed result
        setParsed(data);
        setStage("summary");
      }
    } catch (err) {
      setError(err.message || "Failed to parse nutrition. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── API: Save nutrition log ──
  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const body = {
        activityId: activityId || undefined,
        items: parsed.items,
        totals: parsed.totals,
        perHour: parsed.perHour,
        rideDurationHours: rideDurationHours || parsed.rideDurationHours,
        aiInsight: parsed.aiInsight,
        originalText: input,
      };

      const data = await apiFetch("/nutrition/log", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const carbsHr = parsed.perHour?.carbs ?? 0;
      setConfirmedSummary(
        data.summary ||
          `${carbsHr}g carbs/hr logged. AIM will factor this into your fueling recommendations.`
      );
      setStage("confirmed");
    } catch (err) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Handle send from input stage ──
  function handleSend() {
    if (!input.trim() || loading) return;
    handleParse(input);
  }

  // ── Handle follow-up completion ──
  function handleCalculate() {
    handleParse(input);
  }

  // ── Check if all follow-ups answered ──
  const allAnswered =
    followUps.length > 0 &&
    followUps.every((fq, i) => followUpAnswers[i] !== undefined);

  // ── Suggestion chips ──
  const suggestions = [
    "2 gels + water",
    "Maurten mix + gels",
    "Just water",
    "Bars and banana",
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 300,
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        animation: "nlFadeIn 0.2s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: isMobile ? 0 : 20,
          maxWidth: isMobile ? "100%" : 480,
          width: "100%",
          height: isMobile ? "100vh" : "auto",
          maxHeight: isMobile ? "100vh" : "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "nlFadeIn 0.25s ease",
          boxShadow: isMobile
            ? "none"
            : "0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: T.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={16} color={T.white} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.text,
                  fontFamily: font,
                  letterSpacing: "-0.01em",
                }}
              >
                Ride Nutrition
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  fontFamily: font,
                }}
              >
                AI-powered fueling log
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: T.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.textSoft,
              transition: "background 0.15s",
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
          }}
        >
          {/* Error banner */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.08)",
                border: `1px solid rgba(239,68,68,0.2)`,
                color: T.danger,
                fontSize: 12,
                fontFamily: font,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* ── Stage 1: Input ── */}
          {stage === "input" && (
            <div style={{ animation: "nlFadeIn 0.3s ease" }}>
              <div
                style={{
                  fontSize: 13,
                  color: T.textDim,
                  marginBottom: 14,
                  fontFamily: font,
                  lineHeight: 1.5,
                }}
              >
                Describe what you ate and drank during your ride — brands,
                quantities, whatever you remember.
              </div>

              {/* Suggestion chips */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {suggestions.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setInput(chip)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 9999,
                      border: `1px solid ${T.border}`,
                      background: T.white,
                      color: T.textSoft,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: font,
                      transition: "border-color 0.15s",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Text area */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Describe what you ate/drank during your ride...'
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  fontSize: 13,
                  fontFamily: font,
                  color: T.text,
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = T.accent)
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = T.border)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              {/* Send button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 10,
                }}
              >
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 10,
                    border: "none",
                    background:
                      input.trim() && !loading
                        ? T.accent
                        : T.surface,
                    color:
                      input.trim() && !loading
                        ? T.white
                        : T.textDim,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      input.trim() && !loading
                        ? "pointer"
                        : "default",
                    fontFamily: font,
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Send size={14} />
                  {loading ? "Analyzing..." : "Send"}
                </button>
              </div>

              {/* Typing indicator while loading */}
              {loading && (
                <div style={{ marginTop: 14 }}>
                  <TypingIndicator />
                </div>
              )}
            </div>
          )}

          {/* ── Stage 2: Follow-up Questions ── */}
          {stage === "followup" && (
            <div style={{ animation: "nlFadeIn 0.3s ease" }}>
              {/* User's original message */}
              <MessageBubble role="user">{input}</MessageBubble>

              {/* Loading indicator while waiting for follow-ups */}
              {loading && <TypingIndicator />}

              {/* AI follow-up questions */}
              {!loading && followUps.length > 0 && (
                <MessageBubble role="assistant">
                  <div>
                    <div style={{ marginBottom: 10 }}>
                      Got it! A couple quick questions so I get the numbers
                      right:
                    </div>
                    {followUps.map((fq, i) => (
                      <FollowUpQuestion
                        key={i}
                        question={fq.question}
                        options={fq.options}
                        selected={followUpAnswers[i]}
                        onSelect={(val) =>
                          setFollowUpAnswers((prev) => ({
                            ...prev,
                            [i]: val,
                          }))
                        }
                      />
                    ))}

                    {/* Calculate button appears when all answered */}
                    {allAnswered && (
                      <button
                        onClick={handleCalculate}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: 8,
                          border: "none",
                          background: T.accent,
                          color: T.white,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: font,
                          marginTop: 4,
                          transition: "opacity 0.15s",
                        }}
                      >
                        Calculate Nutrition
                      </button>
                    )}
                  </div>
                </MessageBubble>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {/* ── Stage 3: Parsed Summary ── */}
          {stage === "summary" && parsed && (
            <div style={{ animation: "nlFadeIn 0.3s ease" }}>
              <NutritionTable
                items={parsed.items || []}
                totals={parsed.totals || { carbs: 0, protein: 0, fat: 0, calories: 0 }}
                perHour={parsed.perHour || { carbs: 0, calories: 0 }}
                rideDurationHours={
                  rideDurationHours || parsed.rideDurationHours
                }
                aiInsight={parsed.aiInsight}
                onEdit={() => {
                  setStage("input");
                  setFollowUps([]);
                  setFollowUpAnswers({});
                  setParsed(null);
                }}
                onConfirm={handleSave}
                saving={saving}
              />
            </div>
          )}

          {/* ── Stage 4: Confirmed ── */}
          {stage === "confirmed" && (
            <div
              style={{
                animation: "nlFadeIn 0.3s ease",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              {/* Success checkmark */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 9999,
                  background: accentSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <Check size={28} color={T.accent} strokeWidth={2.5} />
              </div>

              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: 6,
                  fontFamily: font,
                }}
              >
                Nutrition logged!
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: T.textSoft,
                  lineHeight: 1.6,
                  marginBottom: 20,
                  fontFamily: font,
                  maxWidth: 320,
                  margin: "0 auto 20px",
                }}
              >
                {confirmedSummary ||
                  `${parsed?.perHour?.carbs ?? 0}g carbs/hr saved. AIM will factor this into your fueling recommendations and track your gut training progress.`}
              </div>

              {/* Next-time tip */}
              {parsed?.aiInsight && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: accentSoft,
                    border: `1px solid ${T.accent}15`,
                    textAlign: "left",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.accent,
                      marginBottom: 4,
                      fontFamily: font,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={12} />
                    Next time
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: T.textSoft,
                      lineHeight: 1.6,
                      fontFamily: font,
                    }}
                  >
                    {parsed.aiInsight}
                  </div>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  padding: "10px 32px",
                  borderRadius: 10,
                  border: "none",
                  background: T.accent,
                  color: T.white,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: font,
                  transition: "opacity 0.15s",
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
