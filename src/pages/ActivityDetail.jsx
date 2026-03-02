import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { ArrowLeft, Clock, Zap, Heart, Mountain, Gauge, Activity, TrendingUp, Flame, RefreshCw, Brain, ChevronRight, Star, X, Check, Send, Menu, Settings } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useResponsive } from "../hooks/useResponsive";

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatDistance(meters) {
  if (!meters) return "--";
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

function formatSpeed(mps) {
  if (!mps) return "--";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

function MetricCard({ icon, label, value, unit, color }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ color: color || T.accent, opacity: 0.7 }}>{icon}</div>
        <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.03em", color: color || T.text }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: T.textDim, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}

function ZoneBar({ zones, ftp, isMobile }) {
  if (!zones) return null;
  const zoneColors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626", "#7c3aed"];
  const zoneLabels = ["Z1 Recovery", "Z2 Endurance", "Z3 Tempo", "Z4 Threshold", "Z5 VO2max", "Z6 Anaerobic", "Z7 Sprint"];
  const total = Object.values(zones).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Power Zones</div>
      <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        {Object.entries(zones).map(([z, seconds], i) => {
          const pct = (seconds / total) * 100;
          if (pct < 0.5) return null;
          return <div key={z} style={{ width: `${pct}%`, background: zoneColors[i], transition: "width 0.5s" }} title={`${zoneLabels[i]}: ${formatDuration(seconds)}`} />;
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
        {Object.entries(zones).map(([z, seconds], i) => {
          const pct = ((seconds / total) * 100).toFixed(0);
          return (
            <div key={z} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: zoneColors[i], flexShrink: 0 }} />
              <span style={{ color: T.textDim }}>{zoneLabels[i].split(" ")[0]}</span>
              <span style={{ fontFamily: mono, color: T.textSoft, fontWeight: 600 }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PowerCurveDisplay({ curve }) {
  if (!curve) return null;
  const labels = { "5s": "5 sec", "30s": "30 sec", "1m": "1 min", "5m": "5 min", "20m": "20 min", "60m": "60 min" };
  const maxWatts = Math.max(...Object.values(curve).filter(Boolean));

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Power Curve — Best Efforts</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(labels).map(([key, label]) => {
          const watts = curve[key];
          if (!watts) return null;
          const pct = (watts / maxWatts) * 100;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: T.textDim, width: 50, textAlign: "right", flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 22, background: T.surface, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent}40, ${T.accent})`, borderRadius: 6, transition: "width 0.5s" }} />
              </div>
              <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: T.text, width: 50, textAlign: "right", flexShrink: 0 }}>{watts}W</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIAnalysis({ analysis, loading, onRegenerate, activityId }) {
  const [activeTab, setActiveTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  // Parse AI analysis into structured insights
  const parsedAnalysis = useMemo(() => {
    if (analysis && typeof analysis === "object" && Array.isArray(analysis.insights)) return analysis;
    if (analysis && typeof analysis === "string") {
      try {
        const parsed = JSON.parse(analysis);
        if (Array.isArray(parsed.insights)) return parsed;
      } catch { /* not JSON */ }
      return {
        summary: null,
        insights: [{ type: "insight", icon: "\u2726", category: "performance", title: "AI Analysis", body: analysis, confidence: "high" }],
        dataGaps: [],
      };
    }
    return null;
  }, [analysis]);

  const analysisInsights = parsedAnalysis?.insights || null;
  const analysisSummary = parsedAnalysis?.summary || null;
  const dataGaps = parsedAnalysis?.dataGaps || [];

  const [insightFilter, setInsightFilter] = useState("all");
  const filteredInsights = !analysisInsights ? [] :
    insightFilter === "all" ? analysisInsights :
    analysisInsights.filter(i => i.category === insightFilter);

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
  const insightCategories = analysisInsights ? allCategories.map(c => ({
    ...c,
    count: c.id === "all" ? analysisInsights.length : analysisInsights.filter(i => i.category === c.id).length,
  })).filter(c => c.id === "all" || c.count > 0) : [];

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: userMsg, activityId, history: messages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: !res.ok ? `Error: ${data.error || "Request failed"}` : data.reply || "Sorry, I couldn't process that." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Connection error: ${err.message || "Please try again."}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isTyping]);

  const tabs = [{ id: "analysis", label: "AI Analysis" }, { id: "summary", label: "Summary" }, { id: "chat", label: "Ask Claude" }];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, display: "flex", flexDirection: "column", minHeight: 500, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.bg }}>{"\u2726"}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AIM Intelligence</div>
              <div style={{ fontSize: 9, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cross-domain insights</div>
            </div>
          </div>
          {analysisInsights && (
            <button onClick={onRegenerate} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 10, color: T.textDim, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={10} /> Regenerate
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 600, color: activeTab === tab.id ? T.accent : T.textSoft, cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.2s", fontFamily: font }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: activeTab === "chat" ? 0 : "14px 18px" }}>
        {activeTab === "summary" ? (
          <div style={{ padding: "8px 0" }}>
            {!analysisInsights ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{loading ? "" : "\u2726"}</div>
                {loading ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
                      {[0, 1, 2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
                    </div>
                    <div style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>Analyzing your training data...</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 6, lineHeight: 1.5 }}>Claude is reviewing your power, recovery, and training load to generate personalized insights.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 16 }}>Generate an AI analysis to see your summary</div>
                    <button onClick={onRegenerate} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer", fontFamily: font }}>{"\u2726"} Generate Analysis</button>
                  </>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Workout Summary</div>
                {analysisSummary && (
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.8, padding: "16px 18px", background: T.bg, borderRadius: 12, borderLeft: `3px solid ${T.accent}`, marginBottom: 16 }}>{analysisSummary}</div>
                )}
                {analysisInsights.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Key Takeaways</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analysisInsights.slice(0, 4).map((insight, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: T.bg, borderRadius: 10 }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{insight.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>{insight.title}</div>
                            <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.5 }}>{insight.body?.length > 120 ? insight.body.slice(0, 120) + "..." : insight.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {analysisInsights.length > 4 && (
                      <button onClick={() => setActiveTab("analysis")} style={{ background: "none", border: "none", fontSize: 11, color: T.accent, cursor: "pointer", fontFamily: font, fontWeight: 600, marginTop: 10, padding: 0 }}>View all {analysisInsights.length} insights →</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!analysisInsights ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{loading ? "" : "\u2726"}</div>
                {loading ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
                      {[0, 1, 2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
                    </div>
                    <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginBottom: 6 }}>Analyzing your training data...</div>
                    <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>Claude is reviewing your power, recovery, body composition, and training load to generate personalized insights.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ready to analyze this ride</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>Claude will review your power data, recovery metrics, body composition, and training load to generate cross-domain insights.</div>
                    <button onClick={onRegenerate} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer", fontFamily: font }}>{"\u2726"} Generate AI Analysis</button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Post-Ride Analysis</div>

                {analysisSummary && (
                  <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, padding: "10px 14px", background: T.bg, borderRadius: 10, borderLeft: `3px solid ${T.accent}` }}>{analysisSummary}</div>
                )}

                {insightCategories.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    {insightCategories.map(cat => (
                      <button key={cat.id} onClick={() => setInsightFilter(cat.id)} style={{ background: insightFilter === cat.id ? `${T.accent}18` : T.bg, border: `1px solid ${insightFilter === cat.id ? T.accentMid : T.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: insightFilter === cat.id ? T.accent : T.textSoft, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5, fontFamily: font, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {cat.label}
                        <span style={{ fontSize: 8, background: insightFilter === cat.id ? `${T.accent}30` : `${T.textDim}30`, padding: "1px 4px", borderRadius: 6, color: insightFilter === cat.id ? T.accent : T.textDim }}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredInsights.map((insight, i) => (
                  <div key={i} style={{ background: T.bg, borderRadius: 11, padding: "12px 14px", borderLeft: `3px solid ${insight.type === "positive" ? T.accent : insight.type === "warning" ? T.warn : insight.type === "action" ? T.purple : T.blue}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 13 }}>{insight.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>{insight.title}</span>
                      {insight.confidence && (
                        <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 4, background: insight.confidence === "high" ? T.accentDim : `${T.warn}20`, color: insight.confidence === "high" ? T.accent : T.warn, textTransform: "uppercase", letterSpacing: "0.05em" }}>{insight.confidence}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.6, color: T.textSoft }}>{insight.body}</div>
                  </div>
                ))}

                {dataGaps.length > 0 && insightFilter === "all" && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Unlock More Insights</div>
                    {dataGaps.map((gap, i) => (
                      <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 6, borderLeft: `3px solid ${T.blue}30`, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{"\uD83D\uDD17"}</span>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: T.textSoft }}>{gap}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Chat tab */
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
                  <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ask me anything about this ride</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                    {["Why was my cardiac drift high today?", "How does this compare to my best efforts?", "What should my next workout be?", "Am I overtraining?"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 11, color: T.textSoft, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: font }}
                        onMouseOver={e => { e.target.style.borderColor = T.accentMid; e.target.style.color = T.text; }}
                        onMouseOut={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textSoft; }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px", background: msg.role === "user" ? T.accent : T.bg, color: msg.role === "user" ? T.bg : T.text, fontSize: 12, lineHeight: 1.6, fontWeight: msg.role === "user" ? 600 : 400 }}>{msg.text}</div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: "flex", gap: 4, padding: "9px 13px", background: T.bg, borderRadius: 13, width: "fit-content" }}>
                  {[0, 1, 2].map(i => (<div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }} />))}
                </div>
              )}
            </div>
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} placeholder="Ask about this ride..." style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: T.text, outline: "none", fontFamily: font }} />
                <button onClick={handleSendChat} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer" }}>{"\u2192"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}

const RPE_LABELS = {
  1: "Very Easy",
  2: "Easy",
  3: "Moderate",
  4: "Somewhat Hard",
  5: "Hard",
  6: "Harder",
  7: "Very Hard",
  8: "Very Very Hard",
  9: "Extremely Hard",
  10: "Maximal",
};

const TAG_SUGGESTIONS = ["interval", "race", "recovery", "group ride", "solo", "indoor", "outdoor", "tempo", "endurance", "hill repeats"];

function rpeColor(val) {
  if (val <= 3) return T.green;
  if (val <= 5) return T.warn;
  if (val <= 7) return T.orange;
  return T.danger;
}

function SessionNotes({ activity, activityId }) {
  const [notes, setNotes] = useState(activity.user_notes || "");
  const [rating, setRating] = useState(activity.user_rating || 0);
  const [rpe, setRpe] = useState(activity.user_rpe || 0);
  const [tags, setTags] = useState(activity.user_tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved"
  const debounceRef = useRef(null);
  const [hoverStar, setHoverStar] = useState(0);

  const save = useCallback(async (updates) => {
    setSaveStatus("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/activities/annotate?id=${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus(null);
    }
  }, [activityId]);

  const debouncedSave = useCallback((updates) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(updates), 1500);
  }, [save]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    debouncedSave({ user_notes: val, user_rating: rating || null, user_rpe: rpe || null, user_tags: tags });
  };

  const handleRating = (val) => {
    const newRating = val === rating ? 0 : val;
    setRating(newRating);
    save({ user_notes: notes, user_rating: newRating || null, user_rpe: rpe || null, user_tags: tags });
  };

  const handleRpe = (e) => {
    const val = parseInt(e.target.value, 10);
    setRpe(val);
    save({ user_notes: notes, user_rating: rating || null, user_rpe: val || null, user_tags: tags });
  };

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput("");
      save({ user_notes: notes, user_rating: rating || null, user_rpe: rpe || null, user_tags: newTags });
    } else {
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    save({ user_notes: notes, user_rating: rating || null, user_rpe: rpe || null, user_tags: newTags });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const availableSuggestions = useMemo(() => TAG_SUGGESTIONS.filter((s) => !tags.includes(s)), [tags]);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Session Notes</div>
        {saveStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: saveStatus === "saving" ? T.textDim : T.green }}>
            {saveStatus === "saving" ? (
              <><RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
            ) : (
              <><Check size={10} /> Saved</>
            )}
          </div>
        )}
      </div>

      {/* Notes textarea */}
      <textarea
        value={notes}
        onChange={handleNotesChange}
        placeholder="How did this session feel? Any observations..."
        maxLength={5000}
        rows={4}
        style={{
          ...inputStyle,
          padding: "14px 16px",
          resize: "vertical",
          minHeight: 80,
          lineHeight: 1.5,
        }}
      />

      {/* Star rating */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Session Rating</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleRating(val)}
              onMouseEnter={() => setHoverStar(val)}
              onMouseLeave={() => setHoverStar(0)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                transition: "transform 0.15s",
                transform: (hoverStar === val) ? "scale(1.2)" : "scale(1)",
              }}
            >
              <Star
                size={24}
                fill={(hoverStar || rating) >= val ? "#f59e0b" : "transparent"}
                color={(hoverStar || rating) >= val ? "#f59e0b" : T.textDim}
                strokeWidth={1.5}
              />
            </button>
          ))}
          {rating > 0 && (
            <span style={{ fontSize: 12, color: T.textSoft, marginLeft: 8, alignSelf: "center" }}>{rating}/5</span>
          )}
        </div>
      </div>

      {/* RPE slider */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>RPE (Rate of Perceived Exertion)</span>
          {rpe > 0 && (
            <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, color: rpeColor(rpe) }}>{rpe}/10 — {RPE_LABELS[rpe]}</span>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={rpe}
            onChange={handleRpe}
            style={{
              width: "100%",
              height: 6,
              WebkitAppearance: "none",
              appearance: "none",
              background: rpe > 0
                ? `linear-gradient(90deg, ${T.green} 0%, ${T.warn} 50%, ${T.danger} 100%)`
                : T.surface,
              borderRadius: 3,
              outline: "none",
              cursor: "pointer",
              accentColor: T.accent,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <span key={val} style={{ fontSize: 9, color: rpe === val ? rpeColor(val) : T.textDim, fontFamily: mono, fontWeight: rpe === val ? 700 : 400 }}>{val}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Tags</div>
        {/* Current tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  background: T.accentDim,
                  border: `1px solid ${T.accentMid}`,
                  borderRadius: 20,
                  fontSize: 12,
                  color: T.accent,
                  fontWeight: 500,
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", color: T.accent, opacity: 0.6 }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Tag input */}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="Add a tag..."
          style={{
            ...inputStyle,
            padding: "10px 14px",
            fontSize: 13,
          }}
        />
        {/* Suggestions */}
        {availableSuggestions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {availableSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => addTag(s)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: "3px 10px",
                  fontSize: 11,
                  color: T.textDim,
                  cursor: "pointer",
                  fontFamily: font,
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = T.accentMid; e.target.style.color = T.textSoft; }}
                onMouseLeave={(e) => { e.target.style.borderColor = T.border; e.target.style.color = T.textDim; }}
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const fetchActivity = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/activities/detail?id=${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Activity fetch failed:", res.status, errData);
      setError(errData.detail || "Activity not found");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setActivity(data);
    setLoading(false);

    // If no AI analysis yet, start polling
    if (!data.ai_analysis && !data.ai_analysis_generated_at) {
      pollForAnalysis(session.access_token);
    }
  }, [id]);

  const pollForAnalysis = async (token) => {
    setAnalysisLoading(true);
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds total

    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/activities/detail?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ai_analysis) {
            setActivity(data);
            setAnalysisLoading(false);
            clearInterval(poll);
          }
        }
      } catch { /* ignore */ }

      if (attempts >= maxAttempts) {
        setAnalysisLoading(false);
        clearInterval(poll);
      }
    }, 5000);
  };

  const triggerAnalysis = async () => {
    setAnalysisLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/activities/analyze?id=${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const { analysis } = await res.json();
        setActivity(prev => ({ ...prev, ai_analysis: analysis, ai_analysis_generated_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    }
    setAnalysisLoading(false);
  };

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RefreshCw size={24} style={{ color: T.accent, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontSize: 16, color: T.textSoft }}>{error}</p>
        <button onClick={() => navigate("/dashboard")} style={{ ...btn(false), fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const a = activity;
  const date = new Date(a.started_at);
  const formattedDate = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "0 12px" : "0 40px", height: isMobile ? 48 : 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "transparent", border: "none", color: T.textSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: font, padding: "6px 0" }}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div style={{ width: 1, height: 20, background: T.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {["Sleep", "Health Lab", "Connect", "Settings"].map(item => (
              <button key={item} onClick={() => { if (item === "Sleep") navigate("/sleep"); if (item === "Connect") navigate("/connect"); if (item === "Health Lab") navigate("/health-lab"); if (item === "Settings") navigate("/settings"); }} style={{ background: "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>{item === "Settings" ? <><Settings size={12} /> {item}</> : item}</button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            {["Dashboard", "Sleep", "Health Lab", "Connect", "Settings"].map(item => (
              <button key={item} onClick={() => { setMenuOpen(false); if (item === "Dashboard") navigate("/dashboard"); if (item === "Sleep") navigate("/sleep"); if (item === "Connect") navigate("/connect"); if (item === "Health Lab") navigate("/health-lab"); if (item === "Settings") navigate("/settings"); }} style={{ background: item === "Dashboard" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: item === "Dashboard" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>{item === "Settings" ? <><Settings size={14} /> {item}</> : item}</button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px" : isTablet ? "32px 24px" : "32px 40px" }}>
        {/* Title section */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentMid}`, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.activity_type}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.source}</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>{a.name || "Untitled Activity"}</h1>
          <p style={{ fontSize: 14, color: T.textDim, margin: 0 }}>{formattedDate} at {formattedTime}</p>
          {a.description && <p style={{ fontSize: 14, color: T.textSoft, margin: "8px 0 0", lineHeight: 1.5 }}>{a.description}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1.5fr 1fr" : "1fr 1fr", gap: isMobile ? 24 : isTablet ? 24 : 32 }}>
          {/* Left column: Metrics */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Primary metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <MetricCard icon={<Clock size={16} />} label="Duration" value={formatDuration(a.duration_seconds)} />
              <MetricCard icon={<Activity size={16} />} label="Distance" value={formatDistance(a.distance_meters)} />
              <MetricCard icon={<Mountain size={16} />} label="Elevation" value={a.elevation_gain_meters ? `${Math.round(a.elevation_gain_meters)}` : "--"} unit="m" />
              <MetricCard icon={<Gauge size={16} />} label="Avg Speed" value={formatSpeed(a.avg_speed_mps)} />
            </div>

            {/* Power metrics */}
            {a.avg_power_watts && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={14} style={{ color: T.accent }} /> Power
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Zap size={14} />} label="Avg Power" value={Math.round(a.avg_power_watts)} unit="W" color={T.accent} />
                  <MetricCard icon={<Zap size={14} />} label="NP" value={a.normalized_power_watts ? Math.round(a.normalized_power_watts) : "--"} unit="W" color={T.accent} />
                  <MetricCard icon={<Zap size={14} />} label="Max Power" value={a.max_power_watts ? Math.round(a.max_power_watts) : "--"} unit="W" />
                </div>
              </div>
            )}

            {/* Training metrics */}
            {(a.tss || a.intensity_factor) && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={14} style={{ color: T.blue }} /> Training Load
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Flame size={14} />} label="TSS" value={a.tss ? Math.round(a.tss) : "--"} color={T.warn} />
                  <MetricCard icon={<Gauge size={14} />} label="IF" value={a.intensity_factor || "--"} color={T.blue} />
                  <MetricCard icon={<Activity size={14} />} label="VI" value={a.variability_index || "--"} />
                </div>
              </div>
            )}

            {/* Heart rate */}
            {a.avg_hr_bpm && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <Heart size={14} style={{ color: T.danger }} /> Heart Rate
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Heart size={14} />} label="Avg HR" value={Math.round(a.avg_hr_bpm)} unit="bpm" color={T.danger} />
                  <MetricCard icon={<Heart size={14} />} label="Max HR" value={a.max_hr_bpm ? Math.round(a.max_hr_bpm) : "--"} unit="bpm" color={T.danger} />
                  <MetricCard icon={<TrendingUp size={14} />} label="EF" value={a.efficiency_factor || "--"} />
                </div>
              </div>
            )}

            {/* Additional metrics */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
              {a.work_kj && <MetricCard icon={<Zap size={14} />} label="Work" value={Math.round(a.work_kj)} unit="kJ" />}
              {a.calories && <MetricCard icon={<Flame size={14} />} label="Calories" value={a.calories} unit="kcal" />}
              {a.hr_drift_pct != null && <MetricCard icon={<TrendingUp size={14} />} label="HR Drift" value={`${a.hr_drift_pct}%`} color={Math.abs(a.hr_drift_pct) > 5 ? T.warn : T.accent} />}
            </div>

            {/* Zone distribution */}
            <ZoneBar zones={a.zone_distribution} isMobile={isMobile} />

            {/* Power curve */}
            <PowerCurveDisplay curve={a.power_curve} />

            {/* Session notes & annotations */}
            <SessionNotes activity={a} activityId={id} />
          </div>

          {/* Right column: AI Analysis */}
          <div style={isMobile ? {} : { position: "sticky", top: 80 }}>
            <AIAnalysis
              analysis={a.ai_analysis}
              loading={analysisLoading}
              onRegenerate={triggerAnalysis}
              activityId={id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
