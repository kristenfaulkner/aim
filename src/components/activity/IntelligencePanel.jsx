import { useState, useMemo } from "react";
import { T, font, mono } from "../../theme/tokens";
import { RefreshCw } from "lucide-react";
import { FormattedText } from "../../lib/formatText.jsx";
import InsightFeedback from "../InsightFeedback";
import { useResponsive } from "../../hooks/useResponsive";

// Category color mapping — maps AI insight.category to border/label colors
const CAT_COLOR_MAP = {
  performance: T.accent,
  body: T.blue,
  recovery: T.amber,
  training: T.purple,
  nutrition: T.accent,
  environment: T.purple,
  health: T.red,
};

function catColor(category) {
  return CAT_COLOR_MAP[category] || T.textSoft;
}

/**
 * IntelligencePanel — Left-column AI analysis panel.
 *
 * Props:
 *   analysis: { summary, insights[], dataGaps[] }
 *   activity: activity record
 *   activityId: UUID
 *   loading: boolean
 *   onRegenerate: () => void
 */
export default function IntelligencePanel({
  analysis,
  activity,
  activityId,
  loading,
  onRegenerate,
}) {
  const { isMobile } = useResponsive();
  const [done, setDone] = useState({});

  // Parse analysis — could be object, JSON string, or plain text
  const parsed = useMemo(() => {
    if (analysis && typeof analysis === "object" && Array.isArray(analysis.insights)) {
      return analysis;
    }
    if (analysis && typeof analysis === "string") {
      try {
        const p = JSON.parse(analysis);
        if (Array.isArray(p.insights)) return p;
      } catch { /* not JSON */ }
      return {
        summary: null,
        insights: [{ type: "insight", icon: "\u2726", category: "performance", title: "AI Analysis", body: analysis, confidence: "high" }],
        dataGaps: [],
      };
    }
    return null;
  }, [analysis]);

  const insights = parsed?.insights || [];
  const summary = parsed?.summary || null;
  const dataGaps = parsed?.dataGaps || [];

  // Separate action items from findings
  const findings = insights.filter(i => i.type !== "action");
  const actions = insights.filter(i => i.type === "action");

  // Loading state
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: T.gradientSubtle, border: `1px solid ${T.accentMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{"\u2726"}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: font }}>AIM Intelligence</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>Analyzing...</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "40px 18px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: `aim-bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>Analyzing your training data...</div>
            <div style={{ fontSize: 10, color: T.textDim, marginTop: 6, lineHeight: 1.5 }}>
              Reviewing power, recovery, and training load to generate cross-domain insights.
            </div>
          </div>
        </div>
        <style>{`@keyframes aim-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
      </div>
    );
  }

  // Empty state — no analysis yet
  if (!parsed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: T.gradientSubtle, border: `1px solid ${T.accentMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{"\u2726"}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: font }}>AIM Intelligence</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>Post-Ride Analysis</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "40px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
            <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ready to analyze this ride</div>
            <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
              Our AI engine will review your power data, recovery metrics, body composition, and training load to generate cross-domain insights.
            </div>
            {onRegenerate && (
              <button onClick={onRegenerate} style={{
                background: T.accent, border: "none", borderRadius: 10, padding: "10px 20px",
                fontSize: 12, fontWeight: 700, color: T.white, cursor: "pointer", fontFamily: font,
              }}>{"\u2726"} Generate AI Analysis</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* AI Analysis Card */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: T.gradientSubtle,
              border: `1px solid ${T.accentMid}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
            }}>{"\u2726"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: font, lineHeight: 1 }}>AIM Intelligence</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>
                Post-Ride Analysis {"\u00B7"} {insights.length} insight{insights.length !== 1 ? "s" : ""}
              </div>
            </div>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                title="Refresh analysis"
                style={{
                  background: "none", border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: 6, cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", color: T.textSoft, transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accent; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textSoft; e.currentTarget.style.borderColor = T.border; }}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Narrative summary */}
        {summary && (
          <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${T.border}` }}>
            <FormattedText text={summary} style={{ fontSize: 13, color: T.text, fontFamily: font, lineHeight: 1.75 }} />
          </div>
        )}

        {/* Findings */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {findings.map((f, i) => {
            const color = catColor(f.category);
            const originalIndex = insights.indexOf(f);
            return (
              <div key={i} style={{
                borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                padding: "14px 18px",
                borderLeft: `3px solid ${color}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: font, margin: "0 0 3px", lineHeight: 1.3 }}>
                      {f.title}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: font }}>
                        {f.cat_label || f.category}
                      </span>
                      {f.sig && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color,
                          background: `${color}14`, border: `1px solid ${color}25`,
                          borderRadius: 20, padding: "2px 8px",
                          fontFamily: font, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
                        }}>
                          {f.sig}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ paddingLeft: 24 }}>
                  <FormattedText text={f.body} style={{ fontSize: 12, color: T.text, fontFamily: font, lineHeight: 1.7 }} />
                </div>
                <div style={{ paddingLeft: 24 }}>
                  <InsightFeedback
                    activityId={activityId}
                    source="activity_analysis"
                    insightIndex={originalIndex}
                    insight={f}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Items */}
      {actions.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>What To Do Next</span>
            <span style={{ fontSize: 9, color: T.textDim, fontFamily: font }}>
              {Object.keys(done).filter(k => done[k]).length}/{actions.length} done
            </span>
          </div>
          {actions.map((a, i) => (
            <div key={i}
              onClick={() => setDone(p => ({ ...p, [i]: !p[i] }))}
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                padding: "10px 18px", display: "flex", gap: 10, alignItems: "flex-start",
                cursor: "pointer", opacity: done[i] ? 0.4 : 1, transition: "opacity 0.14s",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                border: `1.5px solid ${done[i] ? T.accent : "rgba(0,0,0,0.18)"}`,
                background: done[i] ? T.accent : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2, transition: "all 0.13s",
              }}>
                {done[i] && <span style={{ fontSize: 8, color: "#fff", fontWeight: 800 }}>{"\u2713"}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11 }}>{a.icon}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: done[i] ? T.textDim : T.text,
                    textDecoration: done[i] ? "line-through" : "none",
                    fontFamily: font,
                  }}>{a.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: T.textSoft, fontFamily: font, lineHeight: 1.5 }}>{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data Gaps */}
      {dataGaps.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px 8px", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>Data Gaps</span>
          </div>
          {dataGaps.map((gap, i) => {
            const gapText = typeof gap === "string" ? gap : gap.body || gap.title || "";
            return (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "10px 18px",
                borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"\uD83D\uDD17"}</span>
                <div style={{ flex: 1, fontSize: 11, lineHeight: 1.45, color: T.textSoft, fontFamily: font }}>
                  {gapText}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
