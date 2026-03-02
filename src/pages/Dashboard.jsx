import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { T, font, mono } from "../theme/tokens";
import {
  benchmarks, classifyPower, pctToNextLevel, getWorkoutPrescriptions,
} from "../data/dashboard";
import { useDashboardData } from "../hooks/useDashboardData";
import { useActivities } from "../hooks/useActivities";
import { supabase } from "../lib/supabase";

// ── HELPERS ──

function formatDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function metersToMiles(m) { return m ? (m / 1609.344).toFixed(1) : "—"; }
function metersToFeet(m) { return m ? Math.round(m * 3.28084) : "—"; }
function mpsToMph(mps) { return mps ? (mps * 2.23694).toFixed(1) : "—"; }
function celsiusToF(c) { return c != null ? Math.round(c * 9 / 5 + 32) : null; }

/**
 * Estimate macronutrient oxidation (carbs, fat, protein) from total calories and intensity factor.
 * Based on: Romijn 1993, van Loon 2001, Achten/Jeukendrup 2002, Brooks crossover concept.
 * Maps IF → %VO2max → substrate split using ShapeSense/Venables regression model.
 * Protein held constant at ~3.5% of total energy (meta-analysis: 3.28% ± 0.15%).
 */
function estimateFuelBreakdown(calories, intensityFactor) {
  if (!calories || calories <= 0 || intensityFactor == null) return null;

  const PROTEIN_PCT = 3.5;
  // Convert IF to approx %VO2max for trained cyclist (FTP ≈ 80% VO2max)
  const vo2pct = 5 + (intensityFactor * 80);

  // Fat % of non-protein energy (piecewise model from published data)
  // Calibrated against Romijn 1993 (25/65/85% VO2max) and van Loon 2001 (50/65/85% VO2max)
  let fatNP;
  if (vo2pct <= 37) {
    fatNP = 72; // plateau at very low intensity
  } else if (vo2pct <= 48) {
    // Quadratic rise to fatmax zone
    fatNP = -0.0497 * vo2pct * vo2pct + 3.8528 * vo2pct - 23.55;
  } else if (vo2pct <= 85) {
    // Linear decline through moderate-to-hard intensity
    // Anchored at: ~50% fat at 50% VO2max, ~25% fat at 85% VO2max (van Loon/Romijn)
    fatNP = Math.max(0, -0.74 * vo2pct + 87.5);
  } else if (vo2pct <= 97) {
    // Steep decline above threshold — fat oxidation drops sharply
    fatNP = Math.max(0, -1.9 * vo2pct + 186);
  } else {
    fatNP = 0; // above VO2max: essentially all carbs
  }

  // Scale for protein allocation
  const fatPct = fatNP * (100 - PROTEIN_PCT) / 100;
  const carbPct = 100 - fatPct - PROTEIN_PCT;

  // Convert percentages → grams (fat=9 kcal/g, carbs=4 kcal/g, protein=4 kcal/g)
  const fatCals = calories * (fatPct / 100);
  const carbCals = calories * (carbPct / 100);
  const proteinCals = calories * (PROTEIN_PCT / 100);

  return {
    fatPct: Math.round(fatPct),
    carbPct: Math.round(carbPct),
    proteinPct: Math.round(PROTEIN_PCT),
    fatGrams: Math.round(fatCals / 9),
    carbGrams: Math.round(carbCals / 4),
    proteinGrams: Math.round(proteinCals / 4),
    fatCals: Math.round(fatCals),
    carbCals: Math.round(carbCals),
    proteinCals: Math.round(proteinCals),
  };
}

function safe(v, decimals) {
  if (v == null || isNaN(v)) return "—";
  return decimals != null ? Number(v).toFixed(decimals) : v;
}

// ── REUSABLE COMPONENTS ──

function MiniBar({ value, max, color, label, subLabel }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
        <span style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{subLabel}</span>
      </div>
      <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </div>
  );
}

function Sparkline({ data, width = 120, height = 32, color = T.accent }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const id = `grad-${color.replace("#", "").replace(/[(),.\s]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, unit, trend, trendDir, sparkData, color = T.accent, icon }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
            {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: T.text, fontFamily: mono }}>{value}</span>
            {unit && <span style={{ fontSize: 11, color: T.textSoft }}>{unit}</span>}
          </div>
          {trend && (
            <div style={{ fontSize: 10, marginTop: 3, color: trendDir === "up" ? T.accent : trendDir === "down" ? T.danger : T.textSoft }}>
              {trendDir === "up" ? "\u2191" : trendDir === "down" ? "\u2193" : "\u2192"} {trend}
            </div>
          )}
        </div>
        {sparkData && <div style={{ opacity: 0.8, marginTop: 4 }}><Sparkline data={sparkData} color={color} width={90} height={28} /></div>}
      </div>
    </div>
  );
}

function StatRow({ label, value, unit, color, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 11, color: T.textSoft }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: color || T.text, fontFamily: mono }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: T.textDim, marginLeft: 3 }}>{unit}</span>}
        {sub && <div style={{ fontSize: 9, color: T.textDim }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── LOADING SKELETON ──
function SkeletonCard({ height = 80 }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", height, position: "relative", overflow: "hidden" }}>
      <div style={{ width: "40%", height: 10, background: T.border, borderRadius: 4, marginBottom: 12 }} />
      <div style={{ width: "60%", height: 20, background: T.border, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
    </div>
  );
}

// ── POWER PROFILE RADAR ──
function PowerProfileRadar({ athletePowerProfile, athleteClassifications }) {
  const durations = ["5s", "1m", "5m", "20m", "60m"];
  const labels = ["Sprint", "Anaerobic", "VO2max", "Threshold", "Endurance"];
  const cats = benchmarks.male;
  const cx = 150, cy = 105, r = 80;
  const angles = durations.map((_, i) => (i / durations.length) * 2 * Math.PI - Math.PI / 2);

  const makePolygon = (levelKey) => {
    return durations.map((dur, i) => {
      const val = levelKey === "athlete"
        ? parseFloat(athletePowerProfile[dur]?.wkg || 0) / cats.worldTour[dur]
        : cats[levelKey][dur] / cats.worldTour[dur];
      const clampedVal = Math.min(val, 1);
      const x = cx + Math.cos(angles[i]) * r * clampedVal;
      const y = cy + Math.sin(angles[i]) * r * clampedVal;
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <svg viewBox="0 0 300 220" style={{ width: "100%", height: "auto" }}>
      {[0.25, 0.5, 0.75, 1.0].map(pct => (
        <polygon key={pct} points={durations.map((_, i) => `${cx + Math.cos(angles[i]) * r * pct},${cy + Math.sin(angles[i]) * r * pct}`).join(" ")}
          fill="none" stroke={T.border} strokeWidth="0.5" />
      ))}
      {angles.map((a, i) => (<line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={T.border} strokeWidth="0.5" />))}
      <polygon points={makePolygon("cat1")} fill={`${T.purple}08`} stroke={T.purple} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      <polygon points={makePolygon("cat2")} fill={`${T.blue}08`} stroke={T.blue} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
      <polygon points={makePolygon("athlete")} fill={`${T.accent}15`} stroke={T.accent} strokeWidth="2" />
      {durations.map((dur, i) => {
        const val = parseFloat(athletePowerProfile[dur]?.wkg || 0) / cats.worldTour[dur];
        const clampedVal = Math.min(val, 1);
        const x = cx + Math.cos(angles[i]) * r * clampedVal;
        const y = cy + Math.sin(angles[i]) * r * clampedVal;
        const lx = cx + Math.cos(angles[i]) * (r + 22);
        const ly = cy + Math.sin(angles[i]) * (r + 22);
        const cls = athleteClassifications[dur] || {};
        return (
          <g key={dur}>
            <circle cx={x} cy={y} r="4" fill={cls.color || T.textDim} stroke={T.bg} strokeWidth="1.5" />
            <text x={lx} y={ly - 5} textAnchor="middle" fill={T.text} fontSize="9" fontWeight="700">{labels[i]}</text>
            <text x={lx} y={ly + 5} textAnchor="middle" fill={cls.color || T.textDim} fontSize="7.5" fontWeight="600">{cls.level || "—"}</text>
            <text x={lx} y={ly + 14} textAnchor="middle" fill={T.textDim} fontSize="7">{athletePowerProfile[dur]?.wkg || "—"} W/kg</text>
          </g>
        );
      })}
      <line x1={10} x2={22} y1={210} y2={210} stroke={T.accent} strokeWidth="2" />
      <text x={25} y={213} fill={T.textSoft} fontSize="7">You</text>
      <line x1={55} x2={67} y1={210} y2={210} stroke={T.purple} strokeWidth="1" strokeDasharray="3,3" />
      <text x={70} y={213} fill={T.textSoft} fontSize="7">Cat 1</text>
      <line x1={100} x2={112} y1={210} y2={210} stroke={T.blue} strokeWidth="1" strokeDasharray="3,3" />
      <text x={115} y={213} fill={T.textSoft} fontSize="7">Cat 2</text>
    </svg>
  );
}

// ── BENCHMARK COMPARISON CARD ──
function BenchmarkCard({ athletePowerProfile, athleteClassifications, weightKg }) {
  const durations = ["5s", "1m", "5m", "20m", "60m"];
  const labels = ["Sprint 5s", "Anaerobic 1m", "VO2max 5m", "Threshold 20m", "Endurance 60m"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {durations.map((dur, i) => {
        const cls = athleteClassifications[dur] || {};
        const next = pctToNextLevel(athletePowerProfile[dur]?.wkg || 0, dur, weightKg);
        const isWeakness = (cls.idx || 6) >= 4;
        return (
          <div key={dur} style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${isWeakness ? `${T.warn}20` : "transparent"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{labels[i]}</span>
                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${cls.color || T.textDim}20`, color: cls.color || T.textDim, fontWeight: 700 }}>{cls.level || "—"}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: mono }}>{athletePowerProfile[dur]?.watts || "—"}W</span>
                <span style={{ fontSize: 10, color: T.textDim, marginLeft: 4 }}>{athletePowerProfile[dur]?.wkg || "—"} W/kg</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${next.pct}%`, background: `linear-gradient(90deg, ${cls.color || T.textDim}80, ${cls.color || T.textDim})`, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 9, color: T.textDim, whiteSpace: "nowrap" }}>
                {next.neededWatts > 0 ? `+${next.neededWatts}W to ${next.nextLevel}` : "\u2713 Top level"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WORKOUT PRESCRIPTION CARD ──
function WorkoutPrescriptionCard({ workouts, title, subtitle }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>{subtitle}</div>
      {workouts.map((w, i) => (
        <div key={i}
          onClick={() => setExpanded(expanded === i ? null : i)}
          style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 6, cursor: "pointer", border: `1px solid ${expanded === i ? T.accentMid : "transparent"}`, transition: "all 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{w.name}</span>
              <span style={{ fontSize: 9, color: T.textDim, marginLeft: 8 }}>{w.focus}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: T.accentMid, fontFamily: mono }}>{w.target}</span>
              <span style={{ fontSize: 10, color: T.textDim }}>{expanded === i ? "\u25BE" : "\u25B8"}</span>
            </div>
          </div>
          {expanded === i && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.6, marginBottom: 6 }}>{w.desc}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                <span style={{ color: T.textDim }}>{"\u23F1"} {w.time}</span>
                <span style={{ color: T.textDim }}>{"\uD83D\uDCCA"} ~{w.tss} TSS</span>
                <span style={{ color: T.accent }}>{"\uD83C\uDFAF"} {w.target}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── AI ANALYSIS PANEL ──
function AIAnalysisPanel({ aiAnalysis, activity, profile, dailyMetrics, computed, athletePowerProfile, athleteClassifications, onRequestAnalysis, analysisLoading, analysisError }) {
  const [activeTab, setActiveTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  // Parse AI analysis into structured insights, summary, and data gaps
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

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isTyping]);

  const tabs = [{ id: "analysis", label: "AI Analysis" }, { id: "chat", label: "Ask Claude" }];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.bg }}>{"\u2726"}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AIM Intelligence</div>
            <div style={{ fontSize: 9, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>Powered by Claude</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: "none", border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 600, color: activeTab === tab.id ? T.accent : T.textSoft, cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.2s", fontFamily: font }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: activeTab === "chat" ? 0 : "14px 18px" }}>
        {activeTab === "analysis" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!analysisInsights ? (
              // No analysis yet
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{analysisLoading ? "" : "\u2726"}</div>
                {analysisLoading ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
                      {[0, 1, 2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
                    </div>
                    <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginBottom: 6 }}>Analyzing your training data...</div>
                    <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>
                      Claude is reviewing your power, recovery, body composition, and training load to generate personalized insights.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>
                      {activity ? "Ready to analyze this ride" : "Sync an activity to see AI analysis"}
                    </div>
                    {analysisError && (
                      <div style={{ fontSize: 11, color: T.danger, marginTop: 8, marginBottom: 8, padding: "8px 12px", background: `${T.danger}10`, borderRadius: 8, lineHeight: 1.5, textAlign: "left" }}>
                        {analysisError}
                      </div>
                    )}
                    {activity && (
                      <>
                        <div style={{ fontSize: 10, color: T.textDim, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
                          Claude will review your power data, recovery metrics, body composition, and training load to generate cross-domain insights.
                        </div>
                        <button onClick={onRequestAnalysis} style={{ background: T.accent, border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 12, fontWeight: 700, color: T.bg, cursor: "pointer", fontFamily: font }}>
                          {"\u2726"} {analysisError ? "Retry Analysis" : "Generate AI Analysis"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Post-Ride Analysis {activity?.started_at ? `\u00B7 ${new Date(activity.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                </div>

                {/* AI Summary */}
                {analysisSummary && (
                  <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, padding: "10px 14px", background: T.bg, borderRadius: 10, borderLeft: `3px solid ${T.accent}` }}>
                    {analysisSummary}
                  </div>
                )}

                {/* Recovery alert banner (if dailyMetrics available) */}
                {dailyMetrics?.hrv_ms && dailyMetrics.hrv_ms < 50 && (
                  <div style={{ background: `linear-gradient(135deg, ${T.danger}12, ${T.warn}08)`, border: `1px solid ${T.danger}25`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${T.danger}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.danger, fontFamily: mono, flexShrink: 0 }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, lineHeight: 1 }}>{Math.round(dailyMetrics.hrv_ms)}</div><div style={{ fontSize: 7, opacity: 0.7 }}>HRV</div></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.danger, marginBottom: 2 }}>{"\u26A0\uFE0F"} Under-Recovered State</div>
                      <div style={{ fontSize: 10, color: T.textSoft, lineHeight: 1.4 }}>
                        HRV {Math.round(dailyMetrics.hrv_ms)}ms
                        {dailyMetrics.resting_hr_bpm ? ` \u00B7 RHR ${dailyMetrics.resting_hr_bpm}` : ""}
                        {dailyMetrics.recovery_score != null ? ` \u00B7 Recovery ${dailyMetrics.recovery_score}%` : ""}
                      </div>
                    </div>
                  </div>
                )}

                {/* Category pills */}
                {insightCategories.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {insightCategories.map(cat => (
                      <button key={cat.id} onClick={() => setInsightFilter(cat.id)} style={{ background: insightFilter === cat.id ? `${T.accent}18` : T.bg, border: `1px solid ${insightFilter === cat.id ? T.accentMid : T.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: insightFilter === cat.id ? T.accent : T.textSoft, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5, fontFamily: font }}>
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

                {/* Data Gap Suggestions — drive integration adoption */}
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
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 16px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u2726"}</div>
                  <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 6 }}>Ask me anything about your training</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                    {["How do I compare to Cat 1 riders?", "Give me a VO2max workout plan", "What's my biggest power limiter?", "How far am I from Domestic Pro?"].map((q, i) => (
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
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} placeholder="Ask about your training..." style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: T.text, outline: "none", fontFamily: font }} />
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

// ── CHARTS ──
function PowerCurveChart({ powerCurveData, benchmarkData }) {
  if (!powerCurveData || powerCurveData.length === 0) return <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>No power curve data</div>;
  const w = 480, h = 150, pad = { t: 10, r: 10, b: 28, l: 38 };
  const maxP = Math.max(...powerCurveData.map(d => Math.max(d.power, d.benchmark || 0)));
  const xStep = (w - pad.l - pad.r) / (powerCurveData.length - 1);
  const toY = v => pad.t + (1 - v / maxP) * (h - pad.t - pad.b);
  const myLine = powerCurveData.map((d, i) => `${pad.l + i * xStep},${toY(d.power)}`).join(" ");
  const hasBenchmark = powerCurveData.some(d => d.benchmark);
  const benchLine = hasBenchmark ? powerCurveData.map((d, i) => `${pad.l + i * xStep},${toY(d.benchmark || d.power)}`).join(" ") : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity="0.2" /><stop offset="100%" stopColor={T.accent} stopOpacity="0" /></linearGradient></defs>
      {[0, 300, 600, 900, 1200].filter(v => v <= maxP * 1.1).map(v => (<g key={v}><line x1={pad.l} x2={w - pad.r} y1={toY(v)} y2={toY(v)} stroke={T.border} /><text x={pad.l - 5} y={toY(v) + 3} fill={T.textDim} fontSize="8" textAnchor="end" fontFamily={mono}>{v}</text></g>))}
      <polygon points={`${pad.l},${h - pad.b} ${myLine} ${pad.l + (powerCurveData.length - 1) * xStep},${h - pad.b}`} fill="url(#pcGrad)" />
      {benchLine && <polyline points={benchLine} fill="none" stroke={T.textDim} strokeWidth="1.5" strokeDasharray="4,4" />}
      <polyline points={myLine} fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
      {powerCurveData.map((d, i) => (<g key={i}><circle cx={pad.l + i * xStep} cy={toY(d.power)} r="2.5" fill={T.accent} /><text x={pad.l + i * xStep} y={h - 6} fill={T.textDim} fontSize="7" textAnchor="middle" fontFamily={mono}>{d.duration}</text></g>))}
      <line x1={w - 130} x2={w - 115} y1={10} y2={10} stroke={T.accent} strokeWidth="2" /><text x={w - 112} y={13} fill={T.textSoft} fontSize="8">You</text>
      {hasBenchmark && <><line x1={w - 75} x2={w - 60} y1={10} y2={10} stroke={T.textDim} strokeWidth="1.5" strokeDasharray="4,4" /><text x={w - 57} y={13} fill={T.textSoft} fontSize="8">Benchmark</text></>}
    </svg>
  );
}

function FitnessChart({ fitnessData }) {
  if (!fitnessData || fitnessData.length === 0) return <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>No fitness history yet</div>;

  // Aggregate to weekly
  const weeklyData = [];
  for (let i = 0; i < fitnessData.length; i += 7) {
    const week = fitnessData.slice(i, i + 7);
    const last = week[week.length - 1];
    weeklyData.push({
      week: `W${weeklyData.length + 1}`,
      ctl: last.ctl || 0,
      atl: last.atl || 0,
      tsb: last.tsb || 0,
    });
  }

  if (weeklyData.length === 0) return <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>Not enough data for chart</div>;

  const w = 480, h = 130, pad = { t: 10, r: 10, b: 28, l: 32 };
  const allVals = weeklyData.flatMap(d => [d.ctl, d.atl, d.tsb]);
  const max = Math.max(...allVals), min = Math.min(...allVals), range = (max - min) || 1;
  const xStep = weeklyData.length > 1 ? (w - pad.l - pad.r) / (weeklyData.length - 1) : 0;
  const toY = v => pad.t + ((max - v) / range) * (h - pad.t - pad.b);
  const makeLine = key => weeklyData.map((d, i) => `${pad.l + i * xStep},${toY(d[key])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <line x1={pad.l} x2={w - pad.r} y1={toY(0)} y2={toY(0)} stroke={T.textDim} strokeWidth="0.5" strokeDasharray="2,2" />
      {weeklyData.map((d, i) => { const x = pad.l + i * xStep, y0 = toY(0), y1 = toY(d.tsb); return <rect key={i} x={x - 5} y={Math.min(y0, y1)} width={10} height={Math.abs(y1 - y0)} fill={d.tsb > 0 ? `${T.accent}30` : `${T.danger}30`} rx={2} />; })}
      <polyline points={makeLine("ctl")} fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" />
      <polyline points={makeLine("atl")} fill="none" stroke={T.pink} strokeWidth="2" strokeLinecap="round" />
      {weeklyData.map((d, i) => (<text key={i} x={pad.l + i * xStep} y={h - 6} fill={T.textDim} fontSize="7" textAnchor="middle" fontFamily={mono}>{d.week}</text>))}
      <circle cx={pad.l} cy={pad.t + 2} r="3" fill={T.blue} /><text x={pad.l + 7} y={pad.t + 5} fill={T.textSoft} fontSize="8">CTL</text>
      <circle cx={pad.l + 50} cy={pad.t + 2} r="3" fill={T.pink} /><text x={pad.l + 57} y={pad.t + 5} fill={T.textSoft} fontSize="8">ATL</text>
      <rect x={pad.l + 100} y={pad.t - 2} width={7} height={7} fill={`${T.accent}40`} rx={1} /><text x={pad.l + 110} y={pad.t + 5} fill={T.textSoft} fontSize="8">TSB</text>
    </svg>
  );
}

// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const { activity, profile, dailyMetrics, fitnessHistory, powerProfile, recentActivities, connectedIntegrations, loading, error } = useDashboardData(selectedActivityId);
  const { activities: activityList } = useActivities();

  // ── AI Analysis: auto-trigger + manual trigger ──
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const analysisTriggeredRef = useRef(null); // track which activity ID we already triggered for

  // The effective AI analysis: live (just generated) takes priority over stored
  const effectiveAiAnalysis = liveAnalysis || activity?.ai_analysis || null;

  // ── Sleep Summary ──
  const [sleepSummary, setSleepSummary] = useState(null);
  const [sleepSummaryLoading, setSleepSummaryLoading] = useState(false);
  const sleepSummaryFetchedRef = useRef(false);

  const triggerAnalysis = useCallback(async () => {
    if (!activity?.id) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAnalysisError("Not signed in");
        return;
      }
      const res = await fetch(`/api/activities/analyze?id=${activity.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLiveAnalysis(data.analysis);
      } else {
        setAnalysisError(data.error || `Analysis failed (${res.status})`);
      }
    } catch (err) {
      setAnalysisError(err.message || "Network error");
      console.error("Failed to trigger analysis:", err);
    } finally {
      setAnalysisLoading(false);
    }
  }, [activity?.id]);

  // Auto-trigger analysis when activity loads without ai_analysis
  useEffect(() => {
    if (activity?.id && !activity.ai_analysis && !analysisLoading && analysisTriggeredRef.current !== activity.id) {
      analysisTriggeredRef.current = activity.id;
      triggerAnalysis();
    }
    // Reset live analysis when switching activities
    if (activity?.id !== analysisTriggeredRef.current) {
      setLiveAnalysis(null);
    }
  }, [activity?.id, activity?.ai_analysis, analysisLoading, triggerAnalysis]);

  // Auto-fetch sleep summary when dailyMetrics with sleep data loads
  useEffect(() => {
    if (sleepSummaryFetchedRef.current || sleepSummaryLoading) return;
    if (!dailyMetrics?.sleep_score && !dailyMetrics?.total_sleep_seconds) return;
    sleepSummaryFetchedRef.current = true;
    setSleepSummaryLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/sleep/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        });
        const data = await res.json();
        if (res.ok && data.summary) setSleepSummary(data.summary);
      } catch {} finally {
        setSleepSummaryLoading(false);
      }
    })();
  }, [dailyMetrics?.sleep_score, dailyMetrics?.total_sleep_seconds]);

  // ── Derive computed values from real data ──
  const computed = useMemo(() => {
    if (!activity || !profile) return null;

    const weightKg = dailyMetrics?.weight_kg || profile.weight_kg || 70;
    const ftp = profile.ftp_watts || 200;
    const bikeWeight = 7.8; // Default bike weight
    const leanMass = dailyMetrics?.body_fat_pct ? weightKg * (1 - dailyMetrics.body_fat_pct / 100) : weightKg * 0.87;

    const IF = activity.intensity_factor;
    const TSS = activity.tss;
    const VI = activity.variability_index;
    const EF = activity.efficiency_factor;
    const wPerKg = activity.avg_power_watts ? (activity.avg_power_watts / weightKg).toFixed(2) : null;
    const npPerKg = activity.normalized_power_watts ? (activity.normalized_power_watts / weightKg).toFixed(2) : null;
    const ftpPerKg = (ftp / weightKg).toFixed(2);
    const ftpPerLeanKg = (ftp / leanMass).toFixed(2);
    const calories = activity.calories || (activity.work_kj ? Math.round(activity.work_kj * 1.1) : null);
    const hrDrift = activity.hr_drift_pct;
    const pwHR = activity.normalized_power_watts && activity.avg_hr_bpm ? (activity.normalized_power_watts / activity.avg_hr_bpm).toFixed(2) : null;
    const VAM = activity.elevation_gain_meters && activity.duration_seconds ? Math.round(activity.elevation_gain_meters / (activity.duration_seconds / 3600)) : null;
    const totalSystemWeight = (weightKg + bikeWeight).toFixed(1);

    // Climbing calculations
    const wattsPerKgClimb = (grade) => {
      const gravity = 9.81;
      const rollingRes = 0.005;
      const speed = 4.5;
      const dragCdA = 0.32;
      const airDensity = 1.2;
      const gradeDecimal = grade / 100;
      const systemW = weightKg + bikeWeight;
      return systemW * gravity * gradeDecimal + systemW * gravity * rollingRes + 0.5 * airDensity * dragCdA * speed * speed;
    };
    const wattsAt6pct = Math.round(wattsPerKgClimb(6));
    const wattsPerLbAt6pct = (() => {
      const full = wattsPerKgClimb(6);
      const lighter = (() => {
        const newWeight = weightKg + bikeWeight - 0.4536;
        return newWeight * 9.81 * 0.06 + newWeight * 9.81 * 0.005 + 0.5 * 1.2 * 0.32 * 4.5 * 4.5;
      })();
      return (full - lighter).toFixed(1);
    })();

    // Fuel breakdown from calories + IF
    const fuel = estimateFuelBreakdown(calories, IF);

    // CTL/ATL/TSB from daily_metrics
    const CTL = dailyMetrics?.ctl ?? null;
    const ATL = dailyMetrics?.atl ?? null;
    const TSB = CTL != null && ATL != null ? Math.round(CTL - ATL) : null;

    return {
      IF: IF != null ? Number(IF).toFixed(2) : "—",
      TSS: TSS != null ? Math.round(TSS) : "—",
      VI: VI != null ? Number(VI).toFixed(2) : "—",
      EF: EF != null ? Number(EF).toFixed(2) : "—",
      wPerKg: wPerKg || "—",
      npPerKg: npPerKg || "—",
      ftpPerKg,
      ftpPerLeanKg,
      calories: calories != null ? Math.round(calories) : "—",
      hrDrift: hrDrift != null ? Number(hrDrift).toFixed(1) : "—",
      pwHR: pwHR || "—",
      VAM: VAM || "—",
      wattsAt6pct,
      wattsPerLbAt6pct,
      totalSystemWeight,
      CTL: CTL != null ? Math.round(CTL) : "—",
      ATL: ATL != null ? Math.round(ATL) : "—",
      TSB: TSB != null ? TSB : "—",
      weightKg,
      bikeWeight,
      ftp,
      leanMass,
      fuel,
    };
  }, [activity, profile, dailyMetrics]);

  // ── Map zone_distribution JSONB → powerZones array ──
  const powerZonesData = useMemo(() => {
    if (!activity?.zone_distribution || !profile?.ftp_watts) return [];
    const ftp = profile.ftp_watts;
    const zd = activity.zone_distribution;
    return [
      { zone: "Z1 Recovery", min: 0, max: Math.round(ftp * 0.55), time: Math.round((zd.z1 || 0) / 60), color: "#6b7280" },
      { zone: "Z2 Endurance", min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75), time: Math.round((zd.z2 || 0) / 60), color: "#3b82f6" },
      { zone: "Z3 Tempo", min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.90), time: Math.round((zd.z3 || 0) / 60), color: "#10b981" },
      { zone: "Z4 Threshold", min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.05), time: Math.round((zd.z4 || 0) / 60), color: "#f59e0b" },
      { zone: "Z5 VO2max", min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.20), time: Math.round((zd.z5 || 0) / 60), color: "#ef4444" },
      { zone: "Z6 Anaerobic", min: Math.round(ftp * 1.20), max: 9999, time: Math.round(((zd.z6 || 0) + (zd.z7 || 0)) / 60), color: "#8b5cf6" },
    ];
  }, [activity, profile]);

  // ── Map power_curve JSONB → chart data ──
  const powerCurveData = useMemo(() => {
    if (!activity?.power_curve) return [];
    const pc = activity.power_curve;
    const durations = ["5s", "15s", "30s", "1m", "2m", "5m", "10m", "20m", "60m"];
    return durations
      .filter(d => pc[d] != null)
      .map(d => ({ duration: d, power: pc[d], benchmark: null }));
  }, [activity]);

  // ── Map recentActivities → weeklyTSS ──
  const weeklyTSSData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const tssMap = {};
    days.forEach(d => { tssMap[d] = 0; });
    for (const a of recentActivities) {
      const date = new Date(a.started_at);
      const dayName = days[(date.getDay() + 6) % 7]; // Mon=0
      tssMap[dayName] += a.tss || 0;
    }
    return days.map(day => ({ day, tss: Math.round(tssMap[day]) }));
  }, [recentActivities]);

  const weeklyTSSTotal = weeklyTSSData.reduce((s, d) => s + d.tss, 0);

  // ── Build power profile from power_profiles table ──
  const athletePowerProfile = useMemo(() => {
    if (!powerProfile) return {};
    const weightKg = computed?.weightKg || profile?.weight_kg || 70;
    return {
      "5s": { watts: powerProfile.best_5s_watts, wkg: powerProfile.best_5s_wkg?.toFixed(2) || (powerProfile.best_5s_watts / weightKg).toFixed(2) },
      "1m": { watts: powerProfile.best_1m_watts, wkg: powerProfile.best_1m_wkg?.toFixed(2) || (powerProfile.best_1m_watts / weightKg).toFixed(2) },
      "5m": { watts: powerProfile.best_5m_watts, wkg: powerProfile.best_5m_wkg?.toFixed(2) || (powerProfile.best_5m_watts / weightKg).toFixed(2) },
      "20m": { watts: powerProfile.best_20m_watts, wkg: powerProfile.best_20m_wkg?.toFixed(2) || (powerProfile.best_20m_watts / weightKg).toFixed(2) },
      "60m": { watts: powerProfile.best_60m_watts, wkg: powerProfile.best_60m_wkg?.toFixed(2) || (powerProfile.best_60m_watts / weightKg).toFixed(2) },
    };
  }, [powerProfile, computed, profile]);

  const athleteClassifications = useMemo(() => {
    return Object.fromEntries(
      Object.entries(athletePowerProfile).map(([dur, data]) => [
        dur,
        { ...data, ...classifyPower(parseFloat(data.wkg || 0), dur) },
      ])
    );
  }, [athletePowerProfile]);

  const workoutPrescriptions = useMemo(() => {
    return getWorkoutPrescriptions(profile?.ftp_watts || 200);
  }, [profile]);

  // ── RENDER: Loading State ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
        </nav>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ width: 200, height: 14, background: T.border, borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 300, height: 22, background: T.border, borderRadius: 4 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
        <style>{`@keyframes shimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(50%); } }`}</style>
      </div>
    );
  }

  // ── RENDER: Empty State ──
  if (!activity) {
    const hasStrava = connectedIntegrations.includes("strava");
    const hasAnyIntegration = connectedIntegrations.length > 0;

    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
        </nav>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 52px)", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{hasAnyIntegration ? "\u2705" : "\uD83D\uDEB4"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>
            {hasAnyIntegration ? "Waiting for your first ride" : "No rides yet"}
          </h2>
          <p style={{ fontSize: 14, color: T.textSoft, maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            {hasStrava
              ? "Strava is connected! Go ride and your data will sync automatically. You can also trigger a manual sync below."
              : hasAnyIntegration
                ? "Your apps are connected! Connect Strava to sync your ride data, or go ride and check back."
                : "Connect Strava and sync your first ride to see your dashboard with real power data, AI analysis, and training insights."}
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {!hasStrava && (
              <a href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: T.accent, color: T.bg, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Connect Strava {"\u2192"}
              </a>
            )}
            {hasStrava && (
              <button
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    const res = await fetch("/api/integrations/sync/strava", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                    if (res.ok) {
                      window.location.reload();
                    }
                  } catch {}
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: T.accent, color: T.bg, borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: font }}>
                Sync Now {"\u2192"}
              </button>
            )}
            <a href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              {hasAnyIntegration ? "Manage Apps" : "Browse Apps"}
            </a>
          </div>
          {error && <div style={{ marginTop: 16, fontSize: 11, color: T.danger }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ── Shorthand accessors ──
  const weightKg = computed?.weightKg || 70;
  const ftp = computed?.ftp || 200;
  const bodyFat = dailyMetrics?.body_fat_pct;
  const muscleMass = dailyMetrics?.muscle_mass_kg;
  const hydration = dailyMetrics?.hydration_pct;
  const lrBalance = activity.lr_balance;

  const rideDate = new Date(activity.started_at);
  const rideDateStr = rideDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const rideSummary = `${formatDuration(activity.duration_seconds)} \u00B7 ${metersToMiles(activity.distance_meters)} mi \u00B7 ${metersToFeet(activity.elevation_gain_meters).toLocaleString()} ft \u2191${activity.temperature_celsius != null ? ` \u00B7 ${celsiusToF(activity.temperature_celsius)}\u00B0F` : ""} \u00B7 ${computed.TSS} TSS`;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Dashboard", "Connect"].map(item => (
              <button key={item} onClick={() => { if (item === "Connect") window.location.href = "/connect"; }} style={{ background: item === "Dashboard" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: item === "Dashboard" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font }}>{item}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: T.card, borderRadius: 7, border: `1px solid ${T.border}` }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent }} /><span style={{ fontSize: 10, color: T.textSoft }}>All synced</span>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
            {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
        {/* Left: Dashboard */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {/* Ride Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{rideDateStr}</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{activity.name || "Untitled Ride"}</h1>
              <div style={{ fontSize: 11, color: T.textSoft, marginTop: 3 }}>{rideSummary}</div>
            </div>
            {/* Activity Selector */}
            <div>
              <select
                value={selectedActivityId || ""}
                onChange={e => setSelectedActivityId(e.target.value || null)}
                style={{ background: T.card, border: `1px solid ${T.border}`, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font, outline: "none", maxWidth: 220 }}
              >
                <option value="">Latest Ride</option>
                {activityList.map(a => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {a.name || "Untitled"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 1: Core power metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            <MetricCard label="Avg Power" value={safe(activity.avg_power_watts)} unit="W" color={T.accent} icon={"\u26A1"} />
            <MetricCard label="Normalized Power" value={safe(activity.normalized_power_watts)} unit="W" trend={`IF: ${computed.IF}`} color={T.blue} icon={"\uD83D\uDCCA"} />
            <MetricCard label="TSS" value={computed.TSS} unit="" color={T.purple} icon={"\uD83D\uDCC8"} />
            <MetricCard label="Variability Index" value={computed.VI} unit="" color={T.accent} icon={"\u3030\uFE0F"} />
            <MetricCard label="Efficiency Factor" value={computed.EF} unit="W/bpm" color={T.blue} icon={"\uD83C\uDFAF"} />
          </div>

          {/* Row 2: Body comp + weight-adjusted metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            <MetricCard label="W/kg (Avg)" value={computed.wPerKg} unit="" trend={`NP: ${computed.npPerKg} W/kg`} color={T.accent} icon={"\uD83C\uDFCB\uFE0F"} />
            <MetricCard label="FTP/kg" value={computed.ftpPerKg} unit="" trend={`Lean: ${computed.ftpPerLeanKg}`} color={T.accent} icon={"\uD83D\uDCAA"} />
            <MetricCard label="Weight" value={safe(weightKg, 1)} unit="kg" color={T.blue} icon={"\u2696\uFE0F"} />
            <MetricCard label="Body Fat" value={bodyFat != null ? safe(bodyFat, 1) : "—"} unit="%" trend={muscleMass ? `Muscle: ${safe(muscleMass, 1)}kg` : undefined} color={T.orange} icon={"\uD83D\uDCC9"} />
            <MetricCard label="VAM" value={computed.VAM} unit="m/hr" trend={`System: ${computed.totalSystemWeight}kg`} color={T.purple} icon={"\uD83C\uDFD4\uFE0F"} />
          </div>

          {/* Row 3: HR + cadence + detailed */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
            <MetricCard label="Avg HR" value={safe(activity.avg_hr_bpm)} unit="bpm" trend={computed.hrDrift !== "—" ? `${computed.hrDrift}% drift` : undefined} color={T.pink} icon={"\u2764\uFE0F"} />
            <MetricCard label="Calories" value={computed.calories !== "—" ? computed.calories.toLocaleString() : "—"} unit="kcal" trend={computed.fuel ? `${computed.fuel.carbGrams}g carb · ${computed.fuel.fatGrams}g fat · ${computed.fuel.proteinGrams}g protein` : activity.work_kj ? `${activity.work_kj} kJ work` : undefined} color={T.orange} icon={"\uD83D\uDD25"} />
            <MetricCard label="L/R Balance" value={lrBalance ? `${lrBalance.avg?.[0] || "—"}/${lrBalance.avg?.[1] || "—"}` : "—"} unit="%" color={T.warn} icon={"\u2696\uFE0F"} />
            <MetricCard label="Cadence" value={safe(activity.avg_cadence_rpm)} unit="rpm" color={T.accent} icon={"\uD83D\uDD04"} />
            <MetricCard label="Power:HR" value={computed.pwHR} unit="W/bpm" color={T.accent} icon={"\uD83D\uDC93"} />
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Power Duration Curve</div>
              <PowerCurveChart powerCurveData={powerCurveData} />
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Fitness, Fatigue & Form</div>
              <FitnessChart fitnessData={fitnessHistory} />
            </div>
          </div>

          {/* Zones + Weekly + Climbing Calculator */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Power Zones */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Power Zones (Coggan)</div>
              {powerZonesData.length > 0 ? powerZonesData.map(z => <MiniBar key={z.zone} value={z.time} max={Math.max(...powerZonesData.map(p => p.time), 1)} color={z.color} label={`${z.zone} (${z.min}-${z.max === 9999 ? "+" : z.max}W)`} subLabel={`${z.time}m`} />) : <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>No zone data</div>}
            </div>

            {/* Weekly TSS */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Weekly Training Load</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
                {weeklyTSSData.map(d => (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 9, color: T.textSoft, fontFamily: mono }}>{d.tss || "\u2014"}</span>
                    <div style={{ width: "100%", height: `${(d.tss / Math.max(...weeklyTSSData.map(w => w.tss), 1)) * 80}px`, minHeight: d.tss ? 3 : 1, background: d.tss ? `linear-gradient(180deg, ${d.tss > 150 ? T.purple : d.tss > 100 ? T.blue : T.accent}80, ${d.tss > 150 ? T.purple : d.tss > 100 ? T.blue : T.accent}30)` : T.border, borderRadius: 3 }} />
                    <span style={{ fontSize: 9, color: T.textDim }}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: "6px 10px", background: T.bg, borderRadius: 7, fontSize: 10, color: T.textSoft }}>
                Weekly: <span style={{ color: T.accent, fontWeight: 700 }}>{weeklyTSSTotal} TSS</span>
              </div>
            </div>

            {/* Climbing / Weight Impact Calculator */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{"\u26F0\uFE0F"} Climbing Impact Calculator</div>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>Based on weight + bike weight</div>
              <StatRow label="System Weight" value={computed.totalSystemWeight} unit="kg" sub={`Rider ${safe(weightKg, 1)} + Bike ${computed.bikeWeight}`} />
              <StatRow label="Watts needed @ 6%" value={computed.wattsAt6pct} unit="W" sub="at 16 km/h" color={T.accent} />
              <StatRow label="Cost per 1 lb gained" value={`+${computed.wattsPerLbAt6pct}`} unit="W" sub="on 6% grade" color={T.danger} />
              <StatRow label="Today's VAM" value={computed.VAM} unit="m/hr" color={T.purple} />
              <StatRow label="W/kg (lean mass)" value={computed.ftpPerLeanKg} unit="" sub="FTP \u00F7 lean mass" color={T.accent} />
            </div>
          </div>

          {/* Power Profile + Benchmarks + Workouts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Radar */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{"\uD83C\uDFAF"} Power Profile vs. Benchmarks</div>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Coggan levels \u00B7 {safe(weightKg, 0)}kg</div>
              {Object.keys(athletePowerProfile).length > 0 ? (
                <PowerProfileRadar athletePowerProfile={athletePowerProfile} athleteClassifications={athleteClassifications} />
              ) : (
                <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>No power profile data yet</div>
              )}
            </div>

            {/* Benchmark breakdown */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{"\uD83D\uDCCA"} Classification by Duration</div>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 10 }}>Progress to next level</div>
              {Object.keys(athletePowerProfile).length > 0 ? (
                <BenchmarkCard athletePowerProfile={athletePowerProfile} athleteClassifications={athleteClassifications} weightKg={weightKg} />
              ) : (
                <div style={{ fontSize: 11, color: T.textDim, padding: 20, textAlign: "center" }}>No power profile data yet</div>
              )}
            </div>

            {/* Workout prescriptions */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px", overflow: "auto" }}>
              <WorkoutPrescriptionCard
                title={"\uD83D\uDC8A Prescribed: VO2max Workouts"}
                subtitle={athletePowerProfile["5m"]?.watts ? `Target: raise 5-min from ${athletePowerProfile["5m"].watts}W \u2192 ${athletePowerProfile["5m"].watts + 25}W` : "Sync activities to see targets"}
                workouts={workoutPrescriptions.vo2max}
              />
            </div>
          </div>

          {/* Recovery + Body Comp + Sleep row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{"\uD83D\uDECF\uFE0F"} Recovery Score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: dailyMetrics?.recovery_score != null ? (dailyMetrics.recovery_score < 50 ? T.danger : dailyMetrics.recovery_score < 70 ? T.warn : T.accent) : T.textDim }}>{dailyMetrics?.recovery_score != null ? Math.round(dailyMetrics.recovery_score) : "—"}</span>
                <span style={{ fontSize: 11, color: T.textSoft }}>/ 100</span>
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 5 }}>
                {dailyMetrics?.hrv_ms ? `HRV: ${Math.round(dailyMetrics.hrv_ms)}ms` : ""}
                {dailyMetrics?.resting_hr_bpm ? ` \u00B7 RHR: ${dailyMetrics.resting_hr_bpm}` : ""}
                {dailyMetrics?.total_sleep_seconds ? ` \u00B7 Sleep: ${formatDuration(dailyMetrics.total_sleep_seconds)}` : ""}
              </div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{"\u2696\uFE0F"} Body Composition</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono }}>{safe(weightKg, 1)}</span>
                <span style={{ fontSize: 11, color: T.textSoft }}>kg</span>
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 5 }}>
                {bodyFat != null ? `Fat: ${safe(bodyFat, 1)}%` : ""}
                {muscleMass ? ` \u00B7 Muscle: ${safe(muscleMass, 1)}kg` : ""}
                {hydration != null ? ` \u00B7 H\u2082O: ${hydration}%` : ""}
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 3 }}>Lean mass: {safe(computed.leanMass, 1)}kg</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{"\uD83D\uDE34"} Sleep Quality</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: dailyMetrics?.sleep_score != null ? (dailyMetrics.sleep_score < 50 ? T.warn : dailyMetrics.sleep_score < 70 ? T.textSoft : T.accent) : T.textDim }}>{dailyMetrics?.sleep_score != null ? Math.round(dailyMetrics.sleep_score) : "—"}</span>
                <span style={{ fontSize: 11, color: T.textSoft }}>/ 100</span>
              </div>
              <div style={{ fontSize: 10, color: T.textSoft, marginTop: 5 }}>
                {dailyMetrics?.deep_sleep_seconds ? `Deep: ${Math.round(dailyMetrics.deep_sleep_seconds / 60)}m` : ""}
                {dailyMetrics?.rem_sleep_seconds ? ` \u00B7 REM: ${Math.round(dailyMetrics.rem_sleep_seconds / 60)}m` : ""}
              </div>
            </div>
          </div>

          {/* AI Sleep Summary */}
          {(sleepSummary || sleepSummaryLoading) && (
            <div style={{ marginTop: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${sleepSummary?.recovery_rating === "red" ? T.danger : sleepSummary?.recovery_rating === "yellow" ? T.warn : T.accent}40, transparent)` }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>{sleepSummary?.recovery_rating === "red" ? "\uD83D\uDFE5" : sleepSummary?.recovery_rating === "yellow" ? "\uD83D\uDFE8" : "\uD83D\uDFE9"}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Morning Sleep Report</span>
                {sleepSummaryLoading && <span style={{ fontSize: 10, color: T.textDim, fontStyle: "italic" }}>Generating...</span>}
              </div>
              {sleepSummary && (
                <>
                  {sleepSummary.metrics_line && (
                    <div style={{ fontSize: 10, color: T.accent, fontFamily: mono, marginBottom: 8, padding: "6px 10px", background: T.bg, borderRadius: 6 }}>
                      {sleepSummary.metrics_line}
                    </div>
                  )}
                  {sleepSummary.summary && (
                    <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.6, marginBottom: 6 }}>{sleepSummary.summary}</div>
                  )}
                  {sleepSummary.recommendation && (
                    <div style={{ fontSize: 11, color: sleepSummary.recovery_rating === "red" ? T.danger : sleepSummary.recovery_rating === "yellow" ? T.warn : T.accent, fontWeight: 600, lineHeight: 1.5 }}>
                      {sleepSummary.recommendation}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Full TrainingPeaks-style metrics table */}
          <div style={{ marginTop: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{"\uD83D\uDCCB"} Full Ride Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 20px" }}>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Power</div>
                <StatRow label="Avg Power" value={safe(activity.avg_power_watts)} unit="W" />
                <StatRow label="Normalized Power" value={safe(activity.normalized_power_watts)} unit="W" />
                <StatRow label="Max Power" value={safe(activity.max_power_watts)} unit="W" />
                <StatRow label="Intensity Factor" value={computed.IF} />
                <StatRow label="TSS" value={computed.TSS} />
                <StatRow label="Variability Index" value={computed.VI} />
                <StatRow label="Work" value={safe(activity.work_kj)} unit="kJ" />
                <StatRow label="FTP" value={ftp} unit="W" />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Heart Rate</div>
                <StatRow label="Avg HR" value={safe(activity.avg_hr_bpm)} unit="bpm" />
                <StatRow label="Max HR" value={safe(activity.max_hr_bpm)} unit="bpm" />
                <StatRow label="HR Drift" value={computed.hrDrift !== "—" ? `${computed.hrDrift}%` : "—"} color={T.warn} />
                <StatRow label="Efficiency Factor" value={computed.EF} unit="W/bpm" />
                <StatRow label="Power:HR Ratio" value={computed.pwHR} />
                <StatRow label="LTHR" value={safe(profile?.lthr_bpm)} unit="bpm" />
                <StatRow label="%HRmax (avg)" value={activity.avg_hr_bpm && profile?.max_hr_bpm ? `${Math.round(activity.avg_hr_bpm / profile.max_hr_bpm * 100)}%` : "—"} />
                <StatRow label="%HRR (avg)" value={activity.avg_hr_bpm && profile?.max_hr_bpm && dailyMetrics?.resting_hr_bpm ? `${Math.round((activity.avg_hr_bpm - dailyMetrics.resting_hr_bpm) / (profile.max_hr_bpm - dailyMetrics.resting_hr_bpm) * 100)}%` : "—"} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Body / Weight</div>
                <StatRow label="W/kg (avg)" value={computed.wPerKg} />
                <StatRow label="W/kg (NP)" value={computed.npPerKg} />
                <StatRow label="FTP/kg" value={computed.ftpPerKg} />
                <StatRow label="FTP/lean kg" value={computed.ftpPerLeanKg} color={T.accent} />
                <StatRow label="Rider Weight" value={safe(weightKg, 1)} unit="kg" />
                <StatRow label="Lean Mass" value={safe(computed.leanMass, 1)} unit="kg" />
                <StatRow label="Body Fat" value={bodyFat != null ? `${safe(bodyFat, 1)}%` : "—"} />
                <StatRow label="Hydration" value={hydration != null ? `${hydration}%` : "—"} color={hydration != null && hydration < 64 ? T.warn : T.text} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 4 }}>Ride Details</div>
                <StatRow label="Distance" value={metersToMiles(activity.distance_meters)} unit="mi" />
                <StatRow label="Elevation" value={metersToFeet(activity.elevation_gain_meters).toLocaleString()} unit="ft" />
                <StatRow label="Duration" value={formatDuration(activity.duration_seconds)} />
                <StatRow label="Avg Speed" value={mpsToMph(activity.avg_speed_mps)} unit="mph" />
                <StatRow label="VAM" value={computed.VAM} unit="m/hr" color={T.purple} />
                <StatRow label="Calories" value={computed.calories !== "—" ? computed.calories.toLocaleString() : "—"} unit="kcal" />
                {computed.fuel && <StatRow label="Carbs Burned" value={computed.fuel.carbGrams} unit="g" color="#3b82f6" />}
                {computed.fuel && <StatRow label="Fat Burned" value={computed.fuel.fatGrams} unit="g" color="#f59e0b" />}
                {computed.fuel && <StatRow label="Protein Burned" value={computed.fuel.proteinGrams} unit="g" color="#8b5cf6" />}
                <StatRow label="Temperature" value={activity.temperature_celsius != null ? `${activity.temperature_celsius}\u00B0C / ${celsiusToF(activity.temperature_celsius)}\u00B0F` : "—"} />
                <StatRow label="L/R Balance" value={lrBalance ? `${lrBalance.avg?.[0] || "—"}/${lrBalance.avg?.[1] || "—"}` : "—"} />
              </div>
            </div>
            {/* PMC row */}
            <div style={{ marginTop: 12, padding: "8px 12px", background: T.bg, borderRadius: 8, display: "flex", gap: 24, fontSize: 11 }}>
              <span style={{ color: T.textSoft }}>CTL: <span style={{ color: T.blue, fontWeight: 700 }}>{computed.CTL}</span></span>
              <span style={{ color: T.textSoft }}>ATL: <span style={{ color: T.pink, fontWeight: 700 }}>{computed.ATL}</span></span>
              <span style={{ color: T.textSoft }}>TSB: <span style={{ color: typeof computed.TSB === "number" && computed.TSB < 0 ? T.danger : T.accent, fontWeight: 700 }}>{computed.TSB}</span></span>
            </div>

            {/* Fuel Breakdown */}
            {computed.fuel && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: T.bg, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: T.text }}>Estimated Fuel Breakdown</div>
                {/* Stacked bar */}
                <div style={{ display: "flex", height: 18, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ width: `${computed.fuel.carbPct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)", transition: "width 0.6s ease" }} title={`Carbs: ${computed.fuel.carbPct}%`} />
                  <div style={{ width: `${computed.fuel.fatPct}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", transition: "width 0.6s ease" }} title={`Fat: ${computed.fuel.fatPct}%`} />
                  <div style={{ width: `${computed.fuel.proteinPct}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)", transition: "width 0.6s ease" }} title={`Protein: ${computed.fuel.proteinPct}%`} />
                </div>
                {/* Legend with grams */}
                <div style={{ display: "flex", gap: 16, fontSize: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} />
                    <span style={{ color: T.textSoft }}>Carbs</span>
                    <span style={{ fontWeight: 700, color: T.text, fontFamily: mono }}>{computed.fuel.carbGrams}g</span>
                    <span style={{ color: T.textDim }}>({computed.fuel.carbPct}%)</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} />
                    <span style={{ color: T.textSoft }}>Fat</span>
                    <span style={{ fontWeight: 700, color: T.text, fontFamily: mono }}>{computed.fuel.fatGrams}g</span>
                    <span style={{ color: T.textDim }}>({computed.fuel.fatPct}%)</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "#8b5cf6", display: "inline-block" }} />
                    <span style={{ color: T.textSoft }}>Protein</span>
                    <span style={{ fontWeight: 700, color: T.text, fontFamily: mono }}>{computed.fuel.proteinGrams}g</span>
                    <span style={{ color: T.textDim }}>({computed.fuel.proteinPct}%)</span>
                  </span>
                </div>
                <div style={{ fontSize: 9, color: T.textDim, marginTop: 6 }}>
                  Based on IF {computed.IF} · Model: Romijn/van Loon/Achten substrate oxidation curves
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Panel */}
        <div style={{ width: 370, borderLeft: `1px solid ${T.border}`, padding: 14, display: "flex", flexDirection: "column" }}>
          <AIAnalysisPanel
            aiAnalysis={effectiveAiAnalysis}
            activity={activity}
            profile={profile}
            dailyMetrics={dailyMetrics}
            computed={computed}
            athletePowerProfile={athletePowerProfile}
            athleteClassifications={athleteClassifications}
            onRequestAnalysis={triggerAnalysis}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
          />
        </div>
      </div>
    </div>
  );
}
