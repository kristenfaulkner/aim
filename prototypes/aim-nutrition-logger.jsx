import { useState, useRef, useEffect } from "react";

const T = {
  bg: "#f8f8fa", white: "#ffffff", surfaceHover: "#f2f2f5",
  text: "#1a1a2e", textSecondary: "#6b6b80", textTertiary: "#9d9db0", textInverse: "#ffffff",
  accent: "#10b981", accentSoft: "rgba(16, 185, 129, 0.08)", accentDark: "#059669",
  green: "#10b981", yellow: "#f59e0b", yellowSoft: "rgba(245, 158, 11, 0.08)",
  red: "#ef4444", blue: "#3b82f6", blueSoft: "rgba(59, 130, 246, 0.08)",
  purple: "#8b5cf6", orange: "#f97316",
  border: "rgba(0,0,0,0.06)", borderStrong: "rgba(0,0,0,0.1)",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  radius: 12, radiusSm: 8, radiusFull: 9999,
  font: "'DM Sans', -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

// ── Simulated conversation flow ──
const conversationFlows = {
  initial: {
    messages: [],
    placeholder: 'What did you eat/drink on today\'s ride? (e.g., "3 bottles + 2 gels + a banana")',
  },
  // Flow 1: Simple input with brand recognition
  flow1: [
    { role: "user", text: "3 bottles of water with maurten 320 mix, 2 amacx turbo bars, 1 banana, and a can of coke in the last hour" },
    { role: "assistant", text: null, thinking: true },
    { role: "assistant", text: "Got it! A couple quick questions:", followUps: [
      { question: "What size are your bottles?", options: ["500ml", "620ml", "750ml", "1L"], selected: null },
      { question: "Amacx Turbo bars — the nougat ones (43g carbs each) or the energy bars (38g)?", options: ["Nougat (43g carbs)", "Energy bar (38g carbs)"], selected: null },
    ]},
  ],
  // After follow-ups answered
  flow1_resolved: [
    { role: "user", text: "3 bottles of water with maurten 320 mix, 2 amacx turbo bars, 1 banana, and a can of coke in the last hour" },
    { role: "assistant", text: "Got it! Here's what I calculated:", summary: true },
  ],
};

// ── PARSED NUTRITION SUMMARY ──
const parsedNutrition = {
  items: [
    { name: "Maurten 320 Drink Mix", qty: "3 × 750ml", carbs: 240, protein: 0, fat: 0, calories: 960, icon: "🥤", confidence: "high" },
    { name: "Amacx Turbo Nougat Bar", qty: "2 bars", carbs: 86, protein: 8, fat: 12, calories: 484, icon: "🍫", confidence: "high" },
    { name: "Banana (medium)", qty: "1", carbs: 27, protein: 1, fat: 0, calories: 105, icon: "🍌", confidence: "high" },
    { name: "Coca-Cola (330ml can)", qty: "1 can", carbs: 35, protein: 0, fat: 0, calories: 139, icon: "🥫", confidence: "high" },
  ],
  totals: { carbs: 388, protein: 9, fat: 12, calories: 1688 },
  rideDuration: 7.02, // hours
  perHour: { carbs: 55, calories: 240 },
};

// ── PREVIOUS RIDE QUICK LOG ──
const previousFueling = {
  lastRide: "Feb 28 — Belgian Endurance Ride (7h 1m)",
  items: [
    "3× Maurten 320 in 750ml bottles",
    "2× Amacx Turbo Nougat bars",
    "1× banana",
    "1× Coca-Cola (last hour)",
  ],
  totals: { carbs: 388, carbsPerHour: 55, calories: 1688 },
};

// ── Components ──

const MessageBubble = ({ role, children }) => (
  <div style={{
    display: "flex", justifyContent: role === "user" ? "flex-end" : "flex-start",
    marginBottom: 10,
  }}>
    {role === "assistant" && (
      <div style={{
        width: 28, height: 28, borderRadius: 8, marginRight: 8, flexShrink: 0,
        background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: T.textInverse, fontSize: 12 }}>✦</span>
      </div>
    )}
    <div style={{
      maxWidth: "85%", padding: "10px 14px", borderRadius: 16,
      borderBottomRightRadius: role === "user" ? 4 : 16,
      borderBottomLeftRadius: role === "assistant" ? 4 : 16,
      background: role === "user" ? T.accent : T.white,
      color: role === "user" ? T.textInverse : T.text,
      border: role === "assistant" ? `1px solid ${T.border}` : "none",
      fontSize: 13, lineHeight: 1.5, fontFamily: T.font,
    }}>
      {children}
    </div>
  </div>
);

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 6, height: 6, borderRadius: 3, background: T.textTertiary,
        animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
      }} />
    ))}
  </div>
);

const FollowUpQuestion = ({ question, options, selected, onSelect }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6, fontFamily: T.font }}>
      {question}
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            padding: "6px 14px", borderRadius: T.radiusFull,
            border: `1px solid ${selected === opt ? T.accent : T.border}`,
            background: selected === opt ? T.accentSoft : T.white,
            color: selected === opt ? T.accentDark : T.textSecondary,
            fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
            transition: "all 0.15s ease",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const NutritionSummary = ({ data, rideHours, onConfirm, onEdit }) => {
  const target = { carbs: 80 }; // g/hr target
  const actual = data.perHour.carbs;
  const pct = Math.round((actual / target.carbs) * 100);
  const isLow = actual < 60;
  const isGood = actual >= 70 && actual <= 95;
  const isHigh = actual > 95;

  return (
    <div style={{
      background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, fontFamily: T.font }}>
          Ride Nutrition · {rideHours}h ride
        </div>
        {/* Per-hour headline */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            padding: "4px 10px", borderRadius: T.radiusFull,
            background: isLow ? T.yellowSoft : isGood ? T.accentSoft : T.blueSoft,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              fontFamily: T.fontMono, fontSize: 18, fontWeight: 700,
              color: isLow ? T.yellow : isGood ? T.accent : T.blue,
            }}>
              {actual}g
            </span>
            <span style={{ fontSize: 11, color: T.textSecondary }}>carbs/hr</span>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 500, fontFamily: T.font,
            color: isLow ? T.yellow : isGood ? T.accent : T.blue,
          }}>
            {isLow ? "Below target — you can push higher" : isGood ? "Great fueling rate" : "Strong intake — gut is adapting well"}
          </span>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "10px 16px" }}>
        {data.items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
            borderBottom: i < data.items.length - 1 ? `1px solid ${T.border}` : "none",
          }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: T.font }}>{item.name}</div>
              <div style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.font }}>{item.qty}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 600, color: T.text }}>{item.carbs}g</div>
              <div style={{ fontSize: 10, color: T.textTertiary }}>carbs</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 50 }}>
              <div style={{ fontFamily: T.fontMono, fontSize: 13, color: T.textSecondary }}>{item.calories}</div>
              <div style={{ fontSize: 10, color: T.textTertiary }}>kcal</div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{
        padding: "12px 16px", background: T.surfaceHover, borderTop: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Total Carbs", value: `${data.totals.carbs}g`, color: T.accent },
            { label: "Protein", value: `${data.totals.protein}g`, color: T.blue },
            { label: "Fat", value: `${data.totals.fat}g`, color: T.orange },
            { label: "Calories", value: `${data.totals.calories}`, color: T.text },
          ].map(t => (
            <div key={t.label}>
              <div style={{ fontSize: 10, color: T.textTertiary, fontFamily: T.font }}>{t.label}</div>
              <div style={{ fontFamily: T.fontMono, fontSize: 14, fontWeight: 600, color: t.color }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{
          padding: "10px 12px", borderRadius: T.radiusSm,
          background: isLow ? T.yellowSoft : T.accentSoft,
          border: `1px solid ${isLow ? T.yellow : T.accent}12`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4, fontFamily: T.font }}>
            ✦ Fueling Analysis
          </div>
          <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6, fontFamily: T.font }}>
            {isLow
              ? `At 55g carbs/hr over 7 hours, you're well below your 80g/hr target. Your power faded 12% in the last 2 hours — increasing to 70-80g/hr would likely prevent this fade. Try adding a gel every 45 min alongside your Maurten mix. Your gut tolerance is building from your previous 45g/hr baseline.`
              : `Solid fueling at ${actual}g/hr. Your power only faded 2% over 7 hours, which correlates with adequate carb intake. Your gut is handling the Maurten 320 mix well — consider testing Maurten 360 on your next long ride to push toward 70-80g/hr.`
            }
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: "10px 16px", borderTop: `1px solid ${T.border}`,
        display: "flex", gap: 8, justifyContent: "flex-end",
      }}>
        <button
          onClick={onEdit}
          style={{
            padding: "7px 16px", borderRadius: T.radiusFull, border: `1px solid ${T.border}`,
            background: T.white, color: T.textSecondary, fontSize: 12, fontWeight: 500,
            cursor: "pointer", fontFamily: T.font,
          }}
        >
          Edit Items
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "7px 18px", borderRadius: T.radiusFull, border: "none",
            background: T.accent, color: T.textInverse, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: T.font, transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.target.style.opacity = 0.9}
          onMouseLeave={e => e.target.style.opacity = 1}
        >
          Confirm & Save ✓
        </button>
      </div>
    </div>
  );
};

// ── QUICK LOG (returning athlete) ──
const QuickLog = ({ previous, onUse, onNew }) => (
  <div style={{
    background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
    boxShadow: T.shadow, overflow: "hidden", marginBottom: 16,
  }}>
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, fontFamily: T.font }}>
        Quick Log
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.font }}>
        Same fueling as your last ride?
      </div>
      <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 2, fontFamily: T.font }}>
        {previous.lastRide}
      </div>
    </div>
    <div style={{ padding: "10px 16px" }}>
      {previous.items.map((item, i) => (
        <div key={i} style={{ fontSize: 12, color: T.textSecondary, padding: "3px 0", fontFamily: T.font }}>
          • {item}
        </div>
      ))}
      <div style={{
        marginTop: 8, padding: "6px 0", borderTop: `1px solid ${T.border}`,
        display: "flex", gap: 12,
      }}>
        <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font }}>
          <strong style={{ fontFamily: T.fontMono, color: T.accent }}>{previous.totals.carbsPerHour}g</strong> carbs/hr
        </span>
        <span style={{ fontSize: 12, color: T.textTertiary, fontFamily: T.font }}>
          <strong style={{ fontFamily: T.fontMono, color: T.text }}>{previous.totals.calories}</strong> kcal total
        </span>
      </div>
    </div>
    <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
      <button onClick={onUse} style={{
        flex: 1, padding: "8px", borderRadius: T.radiusSm, border: "none",
        background: T.accent, color: T.textInverse, fontSize: 13, fontWeight: 600,
        cursor: "pointer", fontFamily: T.font,
      }}>
        Same as last time ✓
      </button>
      <button onClick={onNew} style={{
        flex: 1, padding: "8px", borderRadius: T.radiusSm,
        border: `1px solid ${T.border}`, background: T.white,
        color: T.textSecondary, fontSize: 13, fontWeight: 500,
        cursor: "pointer", fontFamily: T.font,
      }}>
        Log something different
      </button>
    </div>
  </div>
);

// ── MAIN DEMO ──
export default function NutritionLogger() {
  const [stage, setStage] = useState("quick"); // quick, chat, followup, summary, confirmed
  const [input, setInput] = useState("");
  const [followUps, setFollowUps] = useState({ bottle: null, bar: null });
  const inputRef = useRef(null);

  const allFollowUpsAnswered = followUps.bottle && followUps.bar;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, padding: "32px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
      `}</style>

      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Ride Nutrition Log
        </h2>
        <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 20, lineHeight: 1.5 }}>
          Conversational nutrition logging. Type what you ate in plain text — AIM parses it, asks smart follow-ups, and calculates macros automatically.
        </p>

        {/* Stage selector for demo */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "quick", label: "1. Quick Log" },
            { key: "chat", label: "2. Text Input" },
            { key: "followup", label: "3. Follow-ups" },
            { key: "summary", label: "4. Parsed Summary" },
            { key: "confirmed", label: "5. Confirmed" },
          ].map(s => (
            <button key={s.key} onClick={() => { setStage(s.key); setFollowUps({ bottle: null, bar: null }); }} style={{
              padding: "6px 12px", borderRadius: T.radiusFull,
              border: `1px solid ${stage === s.key ? T.borderStrong : T.border}`,
              background: stage === s.key ? T.white : "transparent",
              boxShadow: stage === s.key ? T.shadow : "none",
              fontSize: 12, fontWeight: 500, color: stage === s.key ? T.text : T.textTertiary,
              cursor: "pointer", fontFamily: T.font,
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── STAGE 1: Quick Log ── */}
        {stage === "quick" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <QuickLog
              previous={previousFueling}
              onUse={() => setStage("confirmed")}
              onNew={() => setStage("chat")}
            />
            <div style={{ textAlign: "center", fontSize: 12, color: T.textTertiary, fontFamily: T.font }}>
              AIM remembers your last ride's fueling. One tap to reuse, or log something new.
            </div>
          </div>
        )}

        {/* ── STAGE 2: Chat Input ── */}
        {stage === "chat" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{
              background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
              boxShadow: T.shadow, overflow: "hidden",
            }}>
              <div style={{ padding: "16px", minHeight: 120 }}>
                <div style={{ fontSize: 13, color: T.textTertiary, marginBottom: 12, fontFamily: T.font }}>
                  Tell me what you ate and drank during your ride — brands, quantities, whatever you remember.
                </div>
                {/* Quick suggestion chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {["Same as last ride", "Just water", "Maurten mix + gels", "Bars and banana"].map(chip => (
                    <button key={chip} onClick={() => setInput(chip === "Same as last ride" ? previousFueling.items.join(", ") : chip)} style={{
                      padding: "5px 12px", borderRadius: T.radiusFull, border: `1px solid ${T.border}`,
                      background: T.white, color: T.textSecondary, fontSize: 11, fontWeight: 500,
                      cursor: "pointer", fontFamily: T.font,
                    }}>
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "0 16px 12px", display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder='e.g., "3 bottles maurten 320, 2 amacx bars, banana, coke"'
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: T.radiusSm,
                    border: `1px solid ${T.border}`, background: T.surfaceHover,
                    fontSize: 13, fontFamily: T.font, color: T.text, outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = T.border}
                  onKeyDown={e => { if (e.key === "Enter" && input.trim()) setStage("followup"); }}
                />
                <button
                  onClick={() => { if (input.trim()) setStage("followup"); }}
                  style={{
                    padding: "10px 18px", borderRadius: T.radiusSm, border: "none",
                    background: input.trim() ? T.accent : T.surfaceHover,
                    color: input.trim() ? T.textInverse : T.textTertiary,
                    fontSize: 13, fontWeight: 600, cursor: input.trim() ? "pointer" : "default",
                    fontFamily: T.font, transition: "all 0.15s ease",
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STAGE 3: Follow-up Questions ── */}
        {stage === "followup" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{
              background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`,
              boxShadow: T.shadow, padding: "16px",
            }}>
              {/* User message */}
              <MessageBubble role="user">
                3 bottles of water with maurten 320 mix, 2 amacx turbo bars, 1 banana, and a can of coke in the last hour
              </MessageBubble>

              {/* AI response with follow-ups */}
              <MessageBubble role="assistant">
                <div>
                  <div style={{ marginBottom: 10 }}>Got it! I know those products. A couple quick questions so I get the numbers right:</div>
                  <FollowUpQuestion
                    question="What size are your bottles?"
                    options={["500ml", "620ml", "750ml", "1 liter"]}
                    selected={followUps.bottle}
                    onSelect={v => setFollowUps({ ...followUps, bottle: v })}
                  />
                  <FollowUpQuestion
                    question="Amacx Turbo — nougat bars (43g carbs) or energy bars (38g)?"
                    options={["Nougat bars (43g)", "Energy bars (38g)"]}
                    selected={followUps.bar}
                    onSelect={v => setFollowUps({ ...followUps, bar: v })}
                  />
                  {allFollowUpsAnswered && (
                    <button
                      onClick={() => setStage("summary")}
                      style={{
                        width: "100%", padding: "8px", borderRadius: T.radiusSm, border: "none",
                        background: T.accent, color: T.textInverse, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: T.font, marginTop: 4,
                      }}
                    >
                      Calculate Nutrition →
                    </button>
                  )}
                </div>
              </MessageBubble>
            </div>
          </div>
        )}

        {/* ── STAGE 4: Parsed Summary ── */}
        {stage === "summary" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <NutritionSummary
              data={parsedNutrition}
              rideHours={7}
              onConfirm={() => setStage("confirmed")}
              onEdit={() => setStage("chat")}
            />
          </div>
        )}

        {/* ── STAGE 5: Confirmed ── */}
        {stage === "confirmed" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{
              background: T.white, borderRadius: T.radius, border: `1px solid ${T.accent}25`,
              boxShadow: T.shadow, padding: "24px", textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: T.radiusFull, background: T.accentSoft,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
              }}>
                <span style={{ fontSize: 24 }}>✓</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: T.font }}>
                Nutrition logged!
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, marginBottom: 16, fontFamily: T.font }}>
                55g carbs/hr saved for your Feb 28 ride. AIM will factor this into your fueling recommendations and track your gut training progress.
              </div>
              <div style={{
                padding: "12px 16px", borderRadius: T.radiusSm, background: T.accentSoft,
                border: `1px solid ${T.accent}15`, textAlign: "left",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 4, fontFamily: T.font }}>
                  ✦ Next time
                </div>
                <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6, fontFamily: T.font }}>
                  For your next long ride, try increasing to 70g carbs/hr by adding 1 gel per hour alongside your Maurten mix. Your gut has been tolerating 55g/hr with no issues — you're ready to push higher.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
