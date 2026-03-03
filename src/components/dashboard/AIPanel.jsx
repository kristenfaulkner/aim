import { useState, useEffect, useRef, useMemo } from "react";
import { T, font, mono } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";
import { FormattedText } from "../../lib/formatText.jsx";

// ── CATEGORY DEFINITIONS ──
const allCategories = [
  { id: "all", label: "All" },
  { id: "performance", label: "Performance" },
  { id: "body", label: "Body Comp" },
  { id: "recovery", label: "Recovery" },
  { id: "training", label: "Training" },
  { id: "nutrition", label: "Nutrition" },
  { id: "environment", label: "Environment" },
  { id: "health", label: "Health" },
];

const suggestedQuestions = [
  "How do I compare to Cat 1 riders?",
  "Give me a VO2max workout plan",
  "What's my biggest power limiter?",
  "How far am I from Domestic Pro?",
];

// ── INSIGHT TYPE COLORS ──
function insightBorderColor(type) {
  if (type === "positive") return T.accent;
  if (type === "warning") return T.warn;
  if (type === "action") return T.purple;
  return T.blue;
}

// ── AI ANALYSIS PANEL ──
export default function AIPanel({
  aiAnalysis,
  activity,
  profile,
  dailyMetrics,
  computed,
  onRequestAnalysis,
  analysisLoading,
  analysisError,
}) {
  const [activeTab, setActiveTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  // ── Parse AI analysis into structured insights, summary, and data gaps ──
  const parsedAnalysis = useMemo(() => {
    if (aiAnalysis && typeof aiAnalysis === "object" && Array.isArray(aiAnalysis.insights)) {
      return aiAnalysis;
    }
    if (aiAnalysis && typeof aiAnalysis === "string") {
      try {
        const parsed = JSON.parse(aiAnalysis);
        if (Array.isArray(parsed.insights)) return parsed;
      } catch { /* not JSON */ }
      // Plain text analysis — wrap as single insight
      return {
        summary: null,
        insights: [{
          type: "insight", icon: "\u2726", category: "performance",
          title: "AI Analysis",
          body: aiAnalysis,
          confidence: "high",
        }],
        dataGaps: [],
      };
    }
    return null;
  }, [aiAnalysis]);

  const analysisInsights = parsedAnalysis?.insights || null;
  const analysisSummary = parsedAnalysis?.summary || null;
  const dataGaps = parsedAnalysis?.dataGaps || [];

  // ── Category filter ──
  const [insightFilter, setInsightFilter] = useState("all");
  const filteredInsights = !analysisInsights ? [] :
    insightFilter === "all" ? analysisInsights :
    analysisInsights.filter(i => i.category === insightFilter);

  const insightCategories = analysisInsights ? allCategories.map(c => ({
    ...c,
    count: c.id === "all" ? analysisInsights.length : analysisInsights.filter(i => i.category === c.id).length,
  })).filter(c => c.id === "all" || c.count > 0) : [];

  // ── Chat handler ──
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/chat/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMsg,
          activityId: activity?.id,
          history: messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", text: `Error: ${data.error || "Request failed"}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: data.reply || "Sorry, I couldn't process that." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Connection error: ${err.message || "Please try again."}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const tabs = [
    { id: "analysis", label: "AI Analysis" },
    { id: "summary", label: "Summary" },
    { id: "chat", label: "Ask Claude" },
  ];

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{ padding: "14px 18px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: T.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: T.white,
          }}>
            {"\u2726"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AIM Intelligence</div>
            <div style={{ fontSize: 9, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Cross-domain insights
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none", border: "none",
                padding: "7px 14px", fontSize: 11, fontWeight: 600,
                color: activeTab === tab.id ? T.accent : T.textSoft,
                cursor: "pointer",
                borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent",
                transition: "all 0.2s",
                fontFamily: font,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", padding: activeTab === "chat" ? 0 : "14px 18px" }}>

        {/* ────── SUMMARY TAB ────── */}
        {activeTab === "summary" ? (
          <div style={{ padding: "8px 0" }}>
            {!analysisInsights ? (
              <EmptyState
                activity={activity}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
                onRequestAnalysis={onRequestAnalysis}
                message={activity ? "Generate an AI analysis to see your summary" : "Sync an activity to get started"}
              />
            ) : (
              <div>
                {/* Summary header with regenerate */}
                <div style={{
                  fontSize: 10, color: T.textDim, textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 10,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>
                    Workout Summary{" "}
                    {activity?.started_at
                      ? `\u00B7 ${new Date(activity.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""}
                  </span>
                  <RegenerateButton
                    onClick={onRequestAnalysis}
                    loading={analysisLoading}
                  />
                </div>

                {analysisError && <ErrorBanner message={analysisError} />}

                {analysisSummary && (
                  <div style={{
                    fontSize: 13, color: T.text, lineHeight: 1.8,
                    padding: "16px 18px", background: T.bg, borderRadius: 12,
                    borderLeft: `3px solid ${T.accent}`, marginBottom: 16,
                  }}>
                    <FormattedText text={analysisSummary} />
                  </div>
                )}

                {/* Key takeaways from insights */}
                {analysisInsights.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: 10, color: T.textDim, textTransform: "uppercase",
                      letterSpacing: "0.08em", marginBottom: 8,
                    }}>
                      Key Takeaways
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analysisInsights.slice(0, 4).map((insight, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          padding: "10px 12px", background: T.bg, borderRadius: 10,
                        }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{insight.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                              {insight.title}
                            </div>
                            <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>
                              {insight.body?.length > 120 ? insight.body.slice(0, 120) + "..." : insight.body}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {analysisInsights.length > 4 && (
                      <button
                        onClick={() => setActiveTab("analysis")}
                        style={{
                          background: "none", border: "none",
                          fontSize: 11, color: T.accent, cursor: "pointer",
                          fontFamily: font, fontWeight: 600,
                          marginTop: 10, padding: 0,
                        }}
                      >
                        View all {analysisInsights.length} insights {"\u2192"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        /* ────── AI ANALYSIS TAB ────── */
        ) : activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!analysisInsights ? (
              <AnalysisEmptyState
                activity={activity}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
                onRequestAnalysis={onRequestAnalysis}
              />
            ) : (
              <>
                {/* Header row with date + regenerate */}
                <div style={{
                  fontSize: 10, color: T.textDim, textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>
                    Post-Ride Analysis{" "}
                    {activity?.started_at
                      ? `\u00B7 ${new Date(activity.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""}
                  </span>
                  <RegenerateButton
                    onClick={onRequestAnalysis}
                    loading={analysisLoading}
                  />
                </div>

                {/* AI Summary */}
                {analysisSummary && (
                  <div style={{
                    fontSize: 12, color: T.text, lineHeight: 1.6,
                    padding: "10px 14px", background: T.bg, borderRadius: 10,
                    borderLeft: `3px solid ${T.accent}`,
                  }}>
                    <FormattedText text={analysisSummary} />
                  </div>
                )}

                {/* Recovery alert banner (if dailyMetrics available) */}
                {dailyMetrics?.hrv_ms && dailyMetrics.hrv_ms < 50 && (
                  <div style={{
                    background: `linear-gradient(135deg, ${T.danger}12, ${T.warn}08)`,
                    border: `1px solid ${T.danger}25`,
                    borderRadius: 12, padding: "10px 14px",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${T.danger}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: T.danger,
                      fontFamily: mono, flexShrink: 0,
                    }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, lineHeight: 1 }}>{Math.round(dailyMetrics.hrv_ms)}</div>
                        <div style={{ fontSize: 7, opacity: 0.7 }}>HRV</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.danger, marginBottom: 2 }}>
                        {"\u26A0\uFE0F"} Under-Recovered State
                      </div>
                      <div style={{ fontSize: 10, color: T.textSoft, lineHeight: 1.4 }}>
                        HRV {Math.round(dailyMetrics.hrv_ms)}ms
                        {dailyMetrics.resting_hr_bpm ? ` \u00B7 RHR ${dailyMetrics.resting_hr_bpm}` : ""}
                        {dailyMetrics.recovery_score != null ? ` \u00B7 Recovery ${dailyMetrics.recovery_score}%` : ""}
                      </div>
                    </div>
                  </div>
                )}

                {/* Category filter pills */}
                {insightCategories.length > 0 && (
                  <div style={{
                    display: "flex", gap: 5, overflowX: "auto",
                    WebkitOverflowScrolling: "touch", paddingBottom: 2,
                  }}>
                    {insightCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setInsightFilter(cat.id)}
                        style={{
                          background: insightFilter === cat.id ? `${T.accent}18` : T.bg,
                          border: `1px solid ${insightFilter === cat.id ? T.accentMid : T.border}`,
                          borderRadius: 20, padding: "4px 10px",
                          fontSize: 10, fontWeight: 600,
                          color: insightFilter === cat.id ? T.accent : T.textSoft,
                          cursor: "pointer", transition: "all 0.2s",
                          display: "flex", alignItems: "center", gap: 5,
                          fontFamily: font, whiteSpace: "nowrap", flexShrink: 0,
                        }}
                      >
                        {cat.label}
                        <span style={{
                          fontSize: 8,
                          background: insightFilter === cat.id ? `${T.accent}30` : `${T.textDim}30`,
                          padding: "1px 4px", borderRadius: 6,
                          color: insightFilter === cat.id ? T.accent : T.textDim,
                        }}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Insight cards */}
                {filteredInsights.map((insight, i) => (
                  <div key={i} style={{
                    background: T.bg, borderRadius: 11, padding: "12px 14px",
                    borderLeft: `3px solid ${insightBorderColor(insight.type)}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 13 }}>{insight.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>
                        {insight.title}
                      </span>
                      {insight.confidence && (
                        <span style={{
                          fontSize: 8, padding: "2px 5px", borderRadius: 4,
                          background: insight.confidence === "high" ? T.accentDim : `${T.warn}20`,
                          color: insight.confidence === "high" ? T.accent : T.warn,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                          {insight.confidence}
                        </span>
                      )}
                    </div>
                    <FormattedText
                      text={insight.body}
                      style={{ fontSize: 11, lineHeight: 1.6, color: T.textSoft }}
                    />
                  </div>
                ))}

                {/* Unlock More Insights — data gaps */}
                {dataGaps.length > 0 && insightFilter === "all" && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{
                      fontSize: 10, color: T.textDim, textTransform: "uppercase",
                      letterSpacing: "0.08em", marginBottom: 8,
                    }}>
                      Unlock More Insights
                    </div>
                    {dataGaps.map((gap, i) => (
                      <div key={i} style={{
                        background: T.bg, borderRadius: 10, padding: "10px 14px",
                        marginBottom: 6, borderLeft: `3px solid ${T.blue}30`,
                        display: "flex", alignItems: "flex-start", gap: 8,
                      }}>
                        <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{"\uD83D\uDD17"}</span>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: T.textSoft }}>{gap}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        /* ────── ASK CLAUDE TAB ────── */
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Chat messages */}
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
                  <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>
                    Ask me anything about your training
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setChatInput(q)}
                        style={{
                          background: T.bg, border: `1px solid ${T.border}`,
                          borderRadius: 10, padding: "9px 12px",
                          fontSize: 11, color: T.textSoft, cursor: "pointer",
                          textAlign: "left", transition: "all 0.2s",
                          fontFamily: font,
                        }}
                        onMouseOver={e => { e.target.style.borderColor = T.accentMid; e.target.style.color = T.text; }}
                        onMouseOut={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textSoft; }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 14, display: "flex", flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "85%", padding: "9px 13px",
                    borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                    background: msg.role === "user" ? T.accent : T.white,
                    color: msg.role === "user" ? T.white : T.text,
                    fontSize: 12, lineHeight: 1.6,
                    fontWeight: msg.role === "user" ? 600 : 400,
                  }}>
                    {msg.role === "user"
                      ? msg.text
                      : <FormattedText text={msg.text} />}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div style={{
                  display: "flex", gap: 4, padding: "9px 13px",
                  background: T.white, borderRadius: 13, width: "fit-content",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: T.accent,
                      animation: `aipanel-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Chat input bar */}
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendChat()}
                  placeholder="Ask about your training..."
                  style={{
                    flex: 1, background: T.bg, border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: "9px 12px",
                    fontSize: 12, color: T.text, outline: "none",
                    fontFamily: font,
                  }}
                />
                <button
                  onClick={handleSendChat}
                  style={{
                    background: T.accent, border: "none", borderRadius: 10,
                    padding: "9px 14px", fontSize: 12, fontWeight: 700,
                    color: T.white, cursor: "pointer",
                  }}
                >
                  {"\u2192"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bounce animation for typing indicator */}
      <style>{`@keyframes aipanel-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}

// ── SMALL SUB-COMPONENTS ──

function RegenerateButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: "none", border: `1px solid ${T.border}`,
        borderRadius: 6, padding: "3px 8px",
        fontSize: 9, color: T.textSoft, cursor: "pointer",
        fontFamily: font, fontWeight: 600,
      }}
    >
      {loading ? "Analyzing..." : "\u21BB Regenerate"}
    </button>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      fontSize: 11, color: T.danger, padding: "8px 12px",
      background: `${T.danger}10`, borderRadius: 8, marginBottom: 10,
    }}>
      {message}
    </div>
  );
}

function EmptyState({ activity, analysisLoading, analysisError, onRequestAnalysis, message }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
      <div style={{ fontSize: 13, color: T.textSoft }}>{message}</div>
      {activity && !analysisLoading && (
        <button
          onClick={onRequestAnalysis}
          style={{
            background: T.accent, border: "none", borderRadius: 10,
            padding: "10px 20px", fontSize: 12, fontWeight: 700,
            color: T.white, cursor: "pointer",
            fontFamily: font, marginTop: 16,
          }}
        >
          {"\u2726"} Generate Analysis
        </button>
      )}
    </div>
  );
}

function AnalysisEmptyState({ activity, analysisLoading, analysisError, onRequestAnalysis }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{analysisLoading ? "" : "\u2726"}</div>
      {analysisLoading ? (
        <>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: T.accent,
                animation: `aipanel-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginBottom: 6 }}>
            Analyzing your training data...
          </div>
          <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>
            Our AI engine is reviewing your power, recovery, body composition, and training load to generate personalized insights.
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>
            {activity ? "Ready to analyze this ride" : "Sync an activity to see AI analysis"}
          </div>
          {analysisError && (
            <div style={{
              fontSize: 11, color: T.danger, marginTop: 8, marginBottom: 8,
              padding: "8px 12px", background: `${T.danger}10`,
              borderRadius: 8, lineHeight: 1.5, textAlign: "left",
            }}>
              {analysisError}
            </div>
          )}
          {activity && (
            <>
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
                Our AI engine will review your power data, recovery metrics, body composition, and training load to generate cross-domain insights.
              </div>
              <button
                onClick={onRequestAnalysis}
                style={{
                  background: T.accent, border: "none", borderRadius: 10,
                  padding: "10px 20px", fontSize: 12, fontWeight: 700,
                  color: T.white, cursor: "pointer",
                  fontFamily: font,
                }}
              >
                {"\u2726"} {analysisError ? "Retry Analysis" : "Generate AI Analysis"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
