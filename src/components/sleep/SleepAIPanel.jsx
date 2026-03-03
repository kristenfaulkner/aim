import { useState, useEffect, useRef, useMemo } from "react";
import { T, font, mono } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";

// ── SLEEP CATEGORY DEFINITIONS ──
const allCategories = [
  { id: "all", label: "All" },
  { id: "sleep_duration", label: "Duration" },
  { id: "sleep_quality", label: "Quality" },
  { id: "sleep_architecture", label: "Architecture" },
  { id: "recovery", label: "Recovery" },
  { id: "consistency", label: "Consistency" },
  { id: "environment", label: "Environment" },
  { id: "optimization", label: "Optimization" },
];

const suggestedQuestions = [
  "What's my optimal bedtime for best performance?",
  "How does sleep debt affect my power output?",
  "What bed temperature gives me the most deep sleep?",
  "How long does my sleep take to normalize after a hard block?",
];

// ── INSIGHT TYPE COLORS ──
function insightBorderColor(type) {
  if (type === "positive") return T.accent;
  if (type === "warning") return T.warn;
  if (type === "action") return T.purple;
  return T.blue;
}

// ── SLEEP AI PANEL ──
export default function SleepAIPanel({
  analysis,
  onRequestAnalysis,
  analysisLoading,
  analysisError,
  cachedAt,
}) {
  const [activeTab, setActiveTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [insightFilter, setInsightFilter] = useState("all");
  const chatRef = useRef(null);

  // ── Parse analysis ──
  const parsedAnalysis = useMemo(() => {
    if (analysis && typeof analysis === "object" && Array.isArray(analysis.insights)) {
      return analysis;
    }
    if (analysis && typeof analysis === "string") {
      try {
        const parsed = JSON.parse(analysis);
        if (Array.isArray(parsed.insights)) return parsed;
      } catch { /* not JSON */ }
      return {
        summary: null,
        insights: [{
          type: "insight", icon: "\u2726", category: "sleep_duration",
          title: "Sleep Analysis", body: analysis, confidence: "high",
        }],
        dataGaps: [],
      };
    }
    return null;
  }, [analysis]);

  const insights = parsedAnalysis?.insights?.length ? parsedAnalysis.insights : null;
  const summary = parsedAnalysis?.summary && parsedAnalysis.summary !== "undefined" ? parsedAnalysis.summary : null;
  const dataGaps = parsedAnalysis?.dataGaps || [];
  const insufficientData = parsedAnalysis?.insufficientData || false;

  const filteredInsights = !insights ? [] :
    insightFilter === "all" ? insights :
    insights.filter(i => i.category === insightFilter);

  const insightCategories = insights ? allCategories.map(c => ({
    ...c,
    count: c.id === "all" ? insights.length : insights.filter(i => i.category === c.id).length,
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
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: `[Context: The user is on the Sleep Intelligence page analyzing sleep-performance correlations. Focus your answer on how sleep affects their training performance.]\n\n${userMsg}`,
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

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  // Cache age display
  const cacheAgeText = cachedAt ? (() => {
    const hrs = Math.round((Date.now() - cachedAt) / 3600000);
    if (hrs < 1) return "just now";
    if (hrs === 1) return "1 hour ago";
    return `${hrs} hours ago`;
  })() : null;

  const tabs = [
    { id: "analysis", label: "Sleep & Performance" },
    { id: "chat", label: "Ask AI" },
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
            background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: T.white,
          }}>
            {"\uD83C\uDF19"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Sleep & Performance</div>
            <div style={{ fontSize: 9, color: T.purple, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Correlation analysis
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

        {/* ────── ANALYSIS TAB ────── */}
        {activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {analysisLoading ? (
              <LoadingState />
            ) : !insights ? (
              <EmptyState
                analysisError={analysisError}
                onRequestAnalysis={onRequestAnalysis}
                insufficientData={insufficientData}
                summary={summary}
              />
            ) : (
              <>
                {/* Header row with regenerate */}
                <div style={{
                  fontSize: 10, color: T.textDim, textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>
                    Sleep-Performance Analysis
                    {cacheAgeText && ` \u00B7 Updated ${cacheAgeText}`}
                  </span>
                  <button
                    onClick={onRequestAnalysis}
                    disabled={analysisLoading}
                    style={{
                      background: "none", border: `1px solid ${T.border}`,
                      borderRadius: 6, padding: "3px 8px",
                      fontSize: 9, color: T.textSoft, cursor: "pointer",
                      fontFamily: font, fontWeight: 600,
                    }}
                  >
                    {analysisLoading ? "Analyzing..." : "\u21BB Regenerate"}
                  </button>
                </div>

                {analysisError && (
                  <div style={{
                    fontSize: 11, color: T.danger, padding: "8px 12px",
                    background: `${T.danger}10`, borderRadius: 8,
                  }}>
                    {analysisError}
                  </div>
                )}

                {/* Summary */}
                {summary && (
                  <div style={{
                    fontSize: 12, color: T.text, lineHeight: 1.6,
                    padding: "10px 14px", background: T.bg, borderRadius: 10,
                    borderLeft: `3px solid ${T.purple}`,
                  }}>
                    {summary}
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
                    <div style={{ fontSize: 11, lineHeight: 1.6, color: T.textSoft }}>
                      {insight.body}
                    </div>
                  </div>
                ))}

                {/* Unlock More Insights */}
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
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{"\uD83C\uDF19"}</div>
                  <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>
                    Ask me anything about your sleep & performance
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

              {messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 14, display: "flex", flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "85%", padding: "9px 13px",
                    borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                    background: msg.role === "user" ? T.accent : T.bg,
                    color: msg.role === "user" ? T.white : T.text,
                    fontSize: 12, lineHeight: 1.6,
                    fontWeight: msg.role === "user" ? 600 : 400,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{
                  display: "flex", gap: 4, padding: "9px 13px",
                  background: T.bg, borderRadius: 13, width: "fit-content",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: T.accent,
                      animation: `sleeppanel-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendChat()}
                  placeholder="Ask about sleep & performance..."
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

      <style>{`@keyframes sleeppanel-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}

// ── Sub-components ──

function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: T.purple,
            animation: `sleeppanel-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 13, color: T.purple, fontWeight: 600, marginBottom: 6 }}>
        Analyzing sleep-performance patterns...
      </div>
      <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>
        Computing correlations across your workouts and sleep data — adjusting for temperature, fatigue, and ride type.
      </div>
    </div>
  );
}

function EmptyState({ analysisError, onRequestAnalysis, insufficientData, summary }) {
  if (insufficientData && summary) {
    return (
      <div style={{ textAlign: "center", padding: "30px 16px" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>{"\uD83C\uDF19"}</div>
        <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6, marginBottom: 16 }}>
          {summary}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "40px 16px" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{"\uD83C\uDF19"}</div>
      <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>
        Discover how your sleep affects training performance
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
      <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
        We'll correlate every workout with your sleep data, adjusting for temperature, fatigue, and ride type to find genuine patterns.
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
        {"\uD83C\uDF19"} {analysisError ? "Retry Analysis" : "Analyze Sleep Patterns"}
      </button>
    </div>
  );
}
