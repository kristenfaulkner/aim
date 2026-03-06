import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { usePerformanceData } from "../hooks/usePerformanceData";
import { supabase } from "../lib/supabase";
import { FormattedText } from "../lib/formatText.jsx";
import SEO from "../components/SEO";
import { LogOut, Menu, X, User, Settings } from "lucide-react";

// ── NAV ──

const NAV_LINKS = [
  { label: "Today", path: "/today" },
  { label: "Activities", path: "/activities" },
  { label: "Performance", path: "/performance" },
  { label: "My Stats", path: "/my-stats" },
  { label: "Sleep", path: "/sleep" },
  { label: "Health Lab", path: "/health-lab" },
  { label: "Connect", path: "/connect" },
];

const NAV_LINKS_MOBILE = [
  ...NAV_LINKS,
  { label: "Profile", path: "/profile" },
  { label: "Settings", path: "/settings" },
];

// ── HELPERS ──

const Card = ({ children, style }) => (
  <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", ...style }}>{children}</div>
);

const DomainPill = ({ domain }) => {
  const colors = { nutrition: T.amber, recovery: T.blue, performance: T.accent, sleep: T.purple, health: T.red, training: T.orange, environment: T.blue };
  const c = colors[domain] || T.textDim;
  return <span style={{ padding: "2px 7px", borderRadius: 9999, fontSize: 9, fontWeight: 600, background: `${c}10`, color: c, textTransform: "capitalize" }}>{domain}</span>;
};

// ── SIDEBAR INSIGHT ──

function SidebarInsight({ insight, activityId, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
        background: T.card, cursor: "pointer", marginBottom: 8, transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>{insight.icon || "\u2726"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.4, fontFamily: font }}>{insight.title}</div>
          {expanded && (
            <div>
              <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6, marginTop: 8, fontFamily: font }}>
                <FormattedText text={insight.body} />
              </div>
              {insight.domains && (
                <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                  {insight.domains.map(d => <DomainPill key={d} domain={d} />)}
                </div>
              )}
              {insight.cat_label && !insight.domains && (
                <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                  <DomainPill domain={insight.category || "performance"} />
                </div>
              )}
            </div>
          )}
        </div>
        <svg width={12} height={12} style={{ flexShrink: 0, marginTop: 2, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke={T.textDim} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──

export default function Performance() {
  const navigate = useNavigate();
  const { signout } = useAuth();
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("insights");
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatTyping, setChatTyping] = useState(false);
  const chatRef = useRef(null);
  const insightsFetched = useRef(false);

  const { profile, latestMetrics, activityCount, loading } = usePerformanceData();

  const handleSignout = async () => { await signout(); navigate("/"); };

  // Fetch performance insights via dashboard intelligence (DAILY_COACH mode)
  useEffect(() => {
    if (insightsFetched.current) return;
    insightsFetched.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setInsightsLoading(false); return; }
        const res = await fetch("/api/dashboard/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ mode: "DAILY_COACH" }),
        });
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
        }
      } catch { /* silent */ }
      finally { setInsightsLoading(false); }
    })();
  }, []);

  // Chat handler
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: userMsg, history: chatMessages }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", text: data.reply || data.error || "Sorry, I couldn't process that." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally { setChatTyping(false); }
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, chatTyping]);

  // Parse AI insights
  const aiInsights = insights?.insights || [];

  // Training form from latest metrics
  const tsb = latestMetrics?.tsb;
  const ctl = latestMetrics?.ctl;
  const atl = latestMetrics?.atl;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ color: T.textSoft, fontSize: 14, fontFamily: font }}>Loading performance data...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font }}>
      <SEO title="Performance | AIM" description="Your power profile, critical power model, and AI performance insights" />

      {/* ── NAV BAR ── */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                {menuOpen ? <X size={20} color={T.text} /> : <Menu size={20} color={T.text} />}
              </button>
            )}
            <span onClick={() => navigate("/today")} style={{ fontSize: 18, fontWeight: 800, cursor: "pointer", background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIM</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {NAV_LINKS.map(item => (
                <button key={item.label} onClick={() => navigate(item.path)} style={{
                  background: item.label === "Performance" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7,
                  fontSize: 12, fontWeight: 600, color: item.label === "Performance" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font,
                }}>{item.label}</button>
              ))}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <User size={16} color={T.textSoft} />
              {!isMobile && <span style={{ fontSize: 12, color: T.textSoft }}>{profile?.full_name || "Athlete"}</span>}
            </button>
            {userMenuOpen && (
              <div style={{ position: "absolute", right: 0, top: 36, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, minWidth: 150, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <User size={14} /> Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <Settings size={14} /> Settings
                </button>
                <button onClick={handleSignout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: T.danger, cursor: "pointer", fontFamily: font }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, top: 52, background: T.card, zIndex: 99, padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_LINKS_MOBILE.map(item => (
              <button key={item.label} onClick={() => { setMenuOpen(false); navigate(item.path); }} style={{
                background: item.label === "Performance" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: item.label === "Performance" ? T.accent : T.text, cursor: "pointer", textAlign: "left", fontFamily: font,
              }}>{item.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: "-0.03em" }}>Performance</h1>
          <p style={{ fontSize: 13, color: T.textDim, marginTop: 4 }}>
            90-day rolling {activityCount > 0 ? `\u00B7 ${activityCount} activities` : ""}
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 24, alignItems: "start" }}>

          {/* ═══ LEFT COLUMN — DATA ═══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Training Load Summary */}
            {(ctl != null || atl != null || tsb != null) && (
              <Card style={{ padding: "18px 20px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Training Load</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { label: "Fitness (CTL)", value: ctl != null ? Math.round(ctl) : null, color: T.accent },
                    { label: "Fatigue (ATL)", value: atl != null ? Math.round(atl) : null, color: T.orange },
                    { label: "Form (TSB)", value: tsb != null ? Math.round(tsb) : null, color: tsb > 15 ? T.accent : tsb > -10 ? T.blue : tsb > -30 ? T.amber : T.red },
                  ].map(m => (
                    <div key={m.label} style={{ padding: 12, borderRadius: 8, background: T.surface }}>
                      <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: m.color || T.text, marginTop: 3 }}>
                        {m.value ?? "\u2014"}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ═══ RIGHT COLUMN — AI SIDEBAR ═══ */}
          <div style={{ position: isMobile ? "static" : "sticky", top: 80 }}>
            <Card style={{ overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: T.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ color: T.white, fontSize: 11 }}>{"\u2726"}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Performance Intelligence</div>
                </div>
                {/* Tabs */}
                <div style={{ display: "flex", gap: 2, padding: 2, background: T.surface, borderRadius: 6 }}>
                  {[
                    { key: "insights", label: "Insights" },
                    { key: "chat", label: "Ask Claude" },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setSidebarTab(tab.key)} style={{
                      flex: 1, padding: "5px 0", borderRadius: 5, border: "none",
                      background: sidebarTab === tab.key ? T.card : "transparent",
                      boxShadow: sidebarTab === tab.key ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
                      color: sidebarTab === tab.key ? T.text : T.textDim,
                      fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: font,
                    }}>{tab.label}</button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "12px 12px 6px", maxHeight: isMobile ? "none" : 540, overflowY: "auto" }}>
                {sidebarTab === "insights" && (
                  <>
                    {insightsLoading ? (
                      <div style={{ padding: 20, textAlign: "center", color: T.textDim, fontSize: 12 }}>
                        Analyzing your performance patterns...
                      </div>
                    ) : aiInsights.length > 0 ? (
                      <>
                        <div style={{ padding: "0 2px", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <div style={{ width: 5, height: 5, borderRadius: 3, background: T.accent }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>What AIM has learned</span>
                          </div>
                          <p style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
                            Patterns from {activityCount} activities and your connected data sources
                          </p>
                        </div>
                        {aiInsights.map((insight, i) => (
                          <SidebarInsight key={i} insight={insight} index={i} />
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: 20, textAlign: "center", color: T.textDim, fontSize: 12 }}>
                        Sync more activities to unlock AI performance insights.
                      </div>
                    )}
                  </>
                )}

                {sidebarTab === "chat" && (
                  <div style={{ display: "flex", flexDirection: "column", height: 460 }}>
                    <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
                      {chatMessages.length === 0 && (
                        <div style={{ padding: "16px 0", textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>Ask about your performance, training, or trends.</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {["What's my biggest power limiter?", "How far am I from Cat 1?", "Give me a VO2max workout plan"].map(q => (
                              <button key={q} onClick={() => { setChatInput(q); }} style={{
                                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                                padding: "8px 12px", fontSize: 11, color: T.textSoft, cursor: "pointer",
                                textAlign: "left", fontFamily: font,
                              }}>{q}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} style={{
                          alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                          background: msg.role === "user" ? T.accent : T.surface,
                          color: msg.role === "user" ? T.white : T.text,
                          padding: "8px 12px", borderRadius: 10, maxWidth: "85%",
                          fontSize: 12, lineHeight: 1.5,
                        }}>
                          {msg.role === "assistant" ? <FormattedText text={msg.text} /> : msg.text}
                        </div>
                      ))}
                      {chatTyping && (
                        <div style={{ alignSelf: "flex-start", background: T.surface, padding: "8px 12px", borderRadius: 10, fontSize: 12, color: T.textDim }}>
                          Thinking...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendChat()}
                    placeholder="Ask about your performance..."
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.surface, fontSize: 12, color: T.text, fontFamily: font,
                      outline: "none",
                    }}
                  />
                  <button onClick={handleSendChat} disabled={!chatInput.trim() || chatTyping} style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    background: chatInput.trim() ? T.gradient : T.surface,
                    color: chatInput.trim() ? T.white : T.textDim,
                    cursor: chatInput.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                  }}>{"\u2191"}</button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
