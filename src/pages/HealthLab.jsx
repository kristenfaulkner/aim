import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { biomarkerDB, DB_COLUMN_TO_KEY } from "../data/biomarkers";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import BloodPanelUpload from "../components/BloodPanelUpload";
import DexaScanUpload from "../components/DexaScanUpload";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { LogOut, Trash2, ChevronDown, ChevronUp, ExternalLink, Settings, Menu, X, User } from "lucide-react";
import { useResponsive } from "../hooks/useResponsive";

// ── Transform a blood_panels DB row into { id, date, source, values } ──
function transformPanel(row) {
  const values = {};
  for (const [dbCol, bmKey] of Object.entries(DB_COLUMN_TO_KEY)) {
    if (row[dbCol] != null) values[bmKey] = Number(row[dbCol]);
  }
  return {
    id: row.id,
    date: row.test_date,
    source: row.lab_name || "Lab Report",
    values,
    allResults: row.all_results,
    aiAnalysis: row.ai_analysis,
    createdAt: row.created_at,
  };
}

// ── Status Badge ──
function StatusBadge({ value, biomarkerKey, sex = "female" }) {
  const bm = biomarkerDB[biomarkerKey];
  if (!bm || value == null) return null;
  const [optLow, optHigh] = bm.athleteOptimal[sex] || bm.athleteOptimal.male;
  const [clinLow, clinHigh] = bm.clinicalRange[sex] || bm.clinicalRange.male;
  let label, color, bg;
  if (value >= optLow && value <= optHigh) {
    label = "Optimal"; color = T.green; bg = "rgba(16,185,129,0.1)";
  } else if (value >= clinLow && value <= clinHigh) {
    label = "In Range"; color = T.amber; bg = "rgba(245,158,11,0.1)";
  } else {
    label = value < clinLow ? "Low" : "High"; color = T.red; bg = "rgba(255,71,87,0.1)";
  }
  return (
    <span style={{ padding: "2px 8px", borderRadius: 5, background: bg, fontSize: 10, fontWeight: 700, color, letterSpacing: "0.02em" }}>{label}</span>
  );
}

// ── Biomarker Trend Card ──
function BiomarkerTrend({ biomarkerKey, panels, sex = "female", onExpand, expanded }) {
  const bm = biomarkerDB[biomarkerKey];
  if (!bm) return null;
  const [optLow, optHigh] = bm.athleteOptimal[sex] || bm.athleteOptimal.male;
  const data = panels.map(p => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    value: p.values[biomarkerKey],
  })).filter(d => d.value != null);
  if (data.length === 0) return null;

  const latest = data[data.length - 1]?.value;
  const prev = data.length > 1 ? data[data.length - 2]?.value : null;
  const delta = prev != null ? latest - prev : null;
  const trend = delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192";
  const trendColor = delta > 0 ? (latest <= optHigh ? T.green : T.amber) : delta < 0 ? (latest >= optLow ? T.green : T.amber) : T.textDim;

  // Determine status for action items
  const [clinLow, clinHigh] = bm.clinicalRange[sex] || bm.clinicalRange.male;
  const isLow = latest < clinLow;
  const isHigh = latest > clinHigh;
  const isBelowOptimal = latest < optLow && !isLow;
  const isAboveOptimal = latest > optHigh && !isHigh;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", transition: "all 0.2s", cursor: "pointer" }}
      onClick={onExpand}
      onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{bm.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{bm.name}</div>
            <div style={{ fontSize: 10, color: T.textDim }}>{bm.category}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusBadge value={latest} biomarkerKey={biomarkerKey} sex={sex} />
          {expanded ? <ChevronUp size={14} color={T.textDim} /> : <ChevronDown size={14} color={T.textDim} />}
        </div>
      </div>
      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.02em" }}>{latest}</span>
        <span style={{ fontSize: 12, color: T.textDim }}>{bm.unit}</span>
        {delta != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: trendColor, fontFamily: mono }}>
            {trend} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
      {/* Range bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textDim, marginBottom: 3 }}>
          <span>Athlete Optimal: {optLow}&ndash;{optHigh} {bm.unit}</span>
        </div>
        <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(0,0,0,0.04)" }}>
          <div style={{
            position: "absolute",
            left: `${Math.max(0, ((optLow - (optLow * 0.5)) / (optHigh * 1.5 - optLow * 0.5)) * 100)}%`,
            width: `${((optHigh - optLow) / (optHigh * 1.5 - optLow * 0.5)) * 100}%`,
            height: "100%", borderRadius: 3, background: "rgba(16,185,129,0.2)",
          }} />
          <div style={{
            position: "absolute",
            left: `${Math.min(100, Math.max(0, ((latest - optLow * 0.5) / (optHigh * 1.5 - optLow * 0.5)) * 100))}%`,
            top: -3, width: 12, height: 12, borderRadius: "50%",
            background: latest >= optLow && latest <= optHigh ? T.green : latest >= clinLow && latest <= clinHigh ? T.amber : T.red,
            border: `2px solid ${T.card}`, transform: "translateX(-50%)",
          }} />
        </div>
      </div>
      {/* Sparkline */}
      {data.length > 1 && (
        <div style={{ height: 50 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`grad-${biomarkerKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, bm.name]} />
              <Area type="monotone" dataKey="value" stroke={T.accent} strokeWidth={2} fill={`url(#grad-${biomarkerKey})`} dot={{ r: 3, fill: T.accent, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expanded detail: why it matters + action items */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.65, marginBottom: 12 }}>
            <strong style={{ color: T.text }}>Why it matters:</strong> {bm.whyItMatters}
          </div>
          {(isLow || isBelowOptimal) && bm.actionLow && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,71,87,0.05)", border: "1px solid rgba(255,71,87,0.15)", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.red, marginBottom: 4 }}>
                {isLow ? "Below clinical range" : "Below athlete-optimal range"}
              </div>
              <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>{bm.actionLow}</div>
            </div>
          )}
          {(isHigh || isAboveOptimal) && bm.actionHigh && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.amber, marginBottom: 4 }}>
                {isHigh ? "Above clinical range" : "Above athlete-optimal range"}
              </div>
              <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>{bm.actionHigh}</div>
            </div>
          )}
          {!isLow && !isHigh && !isBelowOptimal && !isAboveOptimal && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.green, marginBottom: 4 }}>In athlete-optimal range</div>
              <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>This value is within the ideal range for endurance athletes. Continue current protocols.</div>
            </div>
          )}
          {bm.linkedMetrics && bm.linkedMetrics.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>Linked to:</span>
              {bm.linkedMetrics.map(m => (
                <span key={m} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: T.surface, color: T.textSoft }}>{m}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Panel History ──
function PanelHistory({ panels, onDelete }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Upload History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {panels.slice().reverse().map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{"\uD83D\uDCC4"}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.source}</div>
                <div style={{ fontSize: 10, color: T.textDim }}>{Object.keys(p.values).length} biomarkers extracted</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 11, color: T.textDim }}>{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              {onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.textDim, transition: "color 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseOut={e => e.currentTarget.style.color = T.textDim}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Additional Results (biomarkers not in our DB) ──
function AdditionalResults({ panels, isMobile }) {
  const latest = panels[panels.length - 1];
  const otherResults = latest?.allResults?.other_results || [];
  if (otherResults.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Additional Results</h3>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
        {otherResults.map((r, i) => {
          const flagColor = r.flag === "normal" ? T.green : r.flag === "high" ? T.red : r.flag === "low" ? T.amber : T.textDim;
          return (
            <div key={i} style={{ padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>{r.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: mono }}>{r.value}</span>
                <span style={{ fontSize: 10, color: T.textDim }}>{r.unit}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 9, color: T.textDim }}>Ref: {r.reference_range}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: flagColor, textTransform: "uppercase" }}>{r.flag}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN HEALTH LAB PAGE
// ══════════════════════════════════════
export default function HealthLab() {
  const navigate = useNavigate();
  const { signout, profile } = useAuth();
  const sex = profile?.sex || "female";
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const [panels, setPanels] = useState([]);
  const [dexaScans, setDexaScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBiomarker, setExpandedBiomarker] = useState(null);

  // Fetch blood panels and DEXA scans
  useEffect(() => {
    Promise.allSettled([
      supabase.from("blood_panels").select("*").order("test_date", { ascending: true }),
      supabase.from("dexa_scans").select("*").order("scan_date", { ascending: true }),
    ]).then(([panelsResult, dexaResult]) => {
      if (panelsResult.status === "fulfilled" && panelsResult.value.data) {
        setPanels(panelsResult.value.data.map(transformPanel));
      }
      if (dexaResult.status === "fulfilled" && dexaResult.value.data) {
        setDexaScans(dexaResult.value.data);
      }
      setLoading(false);
    });
  }, []);

  const handleUploadComplete = (data) => {
    // Re-fetch panels after upload
    supabase.from("blood_panels")
      .select("*")
      .order("test_date", { ascending: true })
      .then(({ data: rows }) => {
        if (rows) setPanels(rows.map(transformPanel));
      });
  };

  const handleDexaUploadComplete = () => {
    supabase.from("dexa_scans")
      .select("*")
      .order("scan_date", { ascending: true })
      .then(({ data: rows }) => {
        if (rows) setDexaScans(rows);
      });
  };

  const handleDexaDelete = async (scanId) => {
    const { error: delErr } = await supabase
      .from("dexa_scans")
      .delete()
      .eq("id", scanId);
    if (!delErr) {
      setDexaScans(prev => prev.filter(s => s.id !== scanId));
    }
  };

  const handleDelete = async (panelId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/health/panels?id=${panelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      setPanels(prev => prev.filter(p => p.id !== panelId));
    }
  };

  const handleSignout = async () => {
    await signout();
    navigate("/");
  };

  // Determine which biomarkers have data
  const biomarkersWithData = Object.keys(biomarkerDB).filter(key =>
    panels.some(p => p.values[key] != null)
  );

  // Count flagged biomarkers
  const latestPanel = panels[panels.length - 1];
  const flagCounts = { optimal: 0, inRange: 0, outOfRange: 0 };
  if (latestPanel) {
    for (const key of biomarkersWithData) {
      const value = latestPanel.values[key];
      if (value == null) continue;
      const bm = biomarkerDB[key];
      const [optLow, optHigh] = bm.athleteOptimal[sex] || bm.athleteOptimal.male;
      const [clinLow, clinHigh] = bm.clinicalRange[sex] || bm.clinicalRange.male;
      if (value >= optLow && value <= optHigh) flagCounts.optimal++;
      else if (value >= clinLow && value <= clinHigh) flagCounts.inRange++;
      else flagCounts.outOfRange++;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 12px" : "0 32px", height: isMobile ? 48 : 52, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {["Today", "Activities", "Performance", "Sleep", "Health Lab", "Connect"].map(item => (
                <button key={item} onClick={() => {
                  if (item === "Today") navigate("/dashboard");
                  if (item === "Activities") navigate("/activities");
                  if (item === "Performance") navigate("/performance");
                  if (item === "Sleep") navigate("/sleep");
                  if (item === "Connect") navigate("/connect");
                }} style={{ background: item === "Health Lab" ? T.accentDim : "none", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, color: item === "Health Lab" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>{item}</button>
              ))}
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ position: "relative" }}>
            <div onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white, cursor: "pointer" }}>
              {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
            </div>
            {userMenuOpen && (<>
              <div onClick={() => setUserMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 149 }} />
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 160, zIndex: 150, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <button onClick={() => { setUserMenuOpen(false); navigate("/profile"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <User size={14} /> Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                  <Settings size={14} /> Settings
                </button>
                <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                <button onClick={() => { setUserMenuOpen(false); handleSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>)}
          </div>
        )}
      </nav>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            {["Today", "Activities", "Performance", "Sleep", "Health Lab", "Connect", "Profile", "Settings"].map(item => (
              <button key={item} onClick={() => { setMenuOpen(false); if (item === "Today") navigate("/dashboard"); if (item === "Activities") navigate("/activities"); if (item === "Performance") navigate("/performance"); if (item === "Sleep") navigate("/sleep"); if (item === "Connect") navigate("/connect"); if (item === "Profile") navigate("/profile"); if (item === "Settings") navigate("/settings"); }} style={{ background: item === "Health Lab" ? T.accentDim : "none", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: item === "Health Lab" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, textAlign: "left" }}>{item}</button>
            ))}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ background: "none", border: `1px solid rgba(239,68,68,0.2)`, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px" : isTablet ? "24px" : "32px" }}>
        {/* Header */}
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
            Health <span style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lab</span>
          </h1>
          <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>Upload blood panels and DEXA scans — track biomarkers and body composition over time with athlete-optimal ranges.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 14, color: T.textDim }}>Loading your health data...</div>
          </div>
        ) : panels.length === 0 ? (
          /* ── Empty State ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600, margin: "0 auto" }}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🩸</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Upload Your First Blood Panel</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 24px", lineHeight: 1.6 }}>
                Upload a PDF or photo of your lab results. AI will extract all biomarkers, flag values using athlete-optimal ranges, and track trends over time.
              </p>
            </div>
            <BloodPanelUpload onUploadComplete={handleUploadComplete} />

            {/* What we track */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>What AIM Tracks</h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 8 }}>
                {["Iron & Oxygen", "Vitamins", "Hormones", "Thyroid", "Lipids", "Kidney", "Liver", "Inflammation", "Minerals"].map(cat => {
                  const count = Object.values(biomarkerDB).filter(b => b.category === cat).length;
                  return (
                    <div key={cat} style={{ padding: "10px 14px", background: T.surface, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{cat}</span>
                      <span style={{ fontSize: 11, fontFamily: mono, color: T.textDim }}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: T.textDim, margin: "12px 0 0", lineHeight: 1.5 }}>
                {Object.keys(biomarkerDB).length} biomarkers with athlete-specific optimal ranges. Plus any additional results from your lab report.
              </p>
            </div>

            {/* Pre-test tips */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Tips for Accurate Results</h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
                {[
                  { rule: "Fast 10-12 hours", why: "Required for accurate lipid and glucose readings" },
                  { rule: "No exercise 24h before", why: "Training elevates CK, cortisol, and inflammatory markers" },
                  { rule: "Morning draw (before 10 AM)", why: "Cortisol and testosterone follow circadian rhythms" },
                  { rule: "Hydrate well", why: "Dehydration inflates hemoglobin and hematocrit" },
                ].map((t, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: T.surface, borderRadius: 10, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: T.text, marginBottom: 2 }}>{t.rule}</div>
                    <div style={{ color: T.textSoft, lineHeight: 1.5 }}>{t.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Panels Exist ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Upload + Summary Row */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <BloodPanelUpload onUploadComplete={handleUploadComplete} compact />

              {/* Quick summary */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>Latest Panel Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: mono, color: T.green }}>{flagCounts.optimal}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>Optimal</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: mono, color: T.amber }}>{flagCounts.inRange}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>In Range</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: mono, color: T.red }}>{flagCounts.outOfRange}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>Out of Range</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.textDim }}>
                  {panels.length} panel{panels.length !== 1 ? "s" : ""} uploaded &middot; Latest: {new Date(latestPanel.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Biomarker Grid */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Biomarker Trends</h3>
                <span style={{ fontSize: 11, color: T.textDim }}>
                  {biomarkersWithData.length} biomarkers tracked &middot; Click any card for details
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 14 }}>
                {biomarkersWithData.map(key => (
                  <BiomarkerTrend
                    key={key}
                    biomarkerKey={key}
                    panels={panels}
                    sex={sex}
                    expanded={expandedBiomarker === key}
                    onExpand={() => setExpandedBiomarker(expandedBiomarker === key ? null : key)}
                  />
                ))}
              </div>
            </div>

            {/* Additional results not in biomarkerDB */}
            <AdditionalResults panels={panels} isMobile={isMobile} />

            {/* AI Analysis from latest panel */}
            {latestPanel?.aiAnalysis && (() => {
              let analysis = null;
              try { analysis = JSON.parse(latestPanel.aiAnalysis); } catch {}
              if (!analysis) return null;
              return (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🧠</span> AI Analysis
                  </h3>
                  {analysis.summary && (
                    <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.65, margin: "0 0 16px" }}>{analysis.summary}</p>
                  )}
                  {analysis.insights && analysis.insights.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                      {analysis.insights.map((ins, i) => {
                        const colors = { positive: T.green, warning: T.amber, action: T.blue, info: T.textSoft };
                        return (
                          <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: T.surface, borderLeft: `3px solid ${colors[ins.type] || T.textDim}` }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ins.title}</div>
                            <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>{ins.body}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {analysis.actionItems && analysis.actionItems.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Action Items</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {analysis.actionItems.map((item, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                            <span style={{ color: T.accent, fontWeight: 700 }}>{i + 1}.</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Range legend */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Understanding Your Ranges</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.textSoft }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.green }} /> <strong style={{ color: T.text }}>Optimal</strong> — Within athlete-specific optimal range</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.amber }} /> <strong style={{ color: T.text }}>In Range</strong> — Within clinical normal, but below athlete optimal</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.red }} /> <strong style={{ color: T.text }}>Out of Range</strong> — Outside clinical reference; action needed</div>
              </div>
              <p style={{ fontSize: 11, color: T.textDim, margin: "10px 0 0", lineHeight: 1.6 }}>
                AIM uses athlete-specific optimal ranges based on sports science research, not standard clinical ranges. For example, ferritin is "clinically normal" at 12 ng/mL, but athletes need &gt;35 ng/mL for optimal oxygen transport. Always discuss abnormal results with your physician.
              </p>
            </div>

            {/* Panel history */}
            <PanelHistory panels={panels} onDelete={handleDelete} />
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* DEXA SCANS SECTION */}
        {/* ═══════════════════════════════════════ */}
        {!loading && (
          <div style={{ marginTop: 40 }}>
            <div style={{ marginBottom: isMobile ? 20 : 24 }}>
              <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
                DEXA <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Scans</span>
              </h2>
              <p style={{ fontSize: 13, color: T.textSoft, margin: 0 }}>Track body composition, lean mass, and bone density over time.</p>
            </div>

            {dexaScans.length === 0 ? (
              /* ── DEXA Empty State ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600, margin: "0 auto" }}>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83E\uDDB4"}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>Upload Your First Body Scan</h3>
                  <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 20px", lineHeight: 1.6 }}>
                    Upload a PDF or photo of your body scan results (DEXA, Fit3D, InBody, BodPod). AI will extract body composition, regional data, and bone density — then cross-reference with your training and power data.
                  </p>
                </div>
                <DexaScanUpload onUploadComplete={handleDexaUploadComplete} />
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>What AIM Extracts</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
                    {[
                      { label: "Body Fat %", desc: "Total and regional breakdown" },
                      { label: "Lean Mass", desc: "Muscle mass in kg across all regions" },
                      { label: "Bone Density", desc: "BMD, T-score, and Z-score" },
                      { label: "Visceral Fat", desc: "Deep abdominal fat area" },
                      { label: "L/R Imbalances", desc: "Arm and leg asymmetry detection" },
                      { label: "W/kg Lean", desc: "FTP divided by lean mass (more accurate)" },
                    ].map(({ label, desc }) => (
                      <div key={label} style={{ padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 11, color: T.textSoft }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── DEXA Scans Exist ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Upload + Latest Summary */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                  <DexaScanUpload onUploadComplete={handleDexaUploadComplete} compact />

                  {(() => {
                    const latest = dexaScans[dexaScans.length - 1];
                    const prev = dexaScans.length > 1 ? dexaScans[dexaScans.length - 2] : null;
                    const delta = (curr, old) => {
                      if (curr == null || old == null) return null;
                      const d = curr - old;
                      return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
                    };
                    return (
                      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                        <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 12 }}>Latest DEXA Scan</div>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12 }}>
                          {latest.total_body_fat_pct != null && (
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: mono }}>{latest.total_body_fat_pct}%</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>Body Fat</div>
                              {prev && delta(latest.total_body_fat_pct, prev.total_body_fat_pct) && (
                                <div style={{ fontSize: 11, fontFamily: mono, color: parseFloat(delta(latest.total_body_fat_pct, prev.total_body_fat_pct)) <= 0 ? T.green : T.amber }}>
                                  {delta(latest.total_body_fat_pct, prev.total_body_fat_pct)}%
                                </div>
                              )}
                            </div>
                          )}
                          {latest.lean_mass_kg != null && (
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: mono }}>{latest.lean_mass_kg}</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>Lean Mass (kg)</div>
                              {prev && delta(latest.lean_mass_kg, prev.lean_mass_kg) && (
                                <div style={{ fontSize: 11, fontFamily: mono, color: parseFloat(delta(latest.lean_mass_kg, prev.lean_mass_kg)) >= 0 ? T.green : T.amber }}>
                                  {delta(latest.lean_mass_kg, prev.lean_mass_kg)} kg
                                </div>
                              )}
                            </div>
                          )}
                          {latest.fat_mass_kg != null && (
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: mono }}>{latest.fat_mass_kg}</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>Fat Mass (kg)</div>
                              {prev && delta(latest.fat_mass_kg, prev.fat_mass_kg) && (
                                <div style={{ fontSize: 11, fontFamily: mono, color: parseFloat(delta(latest.fat_mass_kg, prev.fat_mass_kg)) <= 0 ? T.green : T.amber }}>
                                  {delta(latest.fat_mass_kg, prev.fat_mass_kg)} kg
                                </div>
                              )}
                            </div>
                          )}
                          {latest.bone_mineral_density != null && (
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: mono }}>{latest.bone_mineral_density}</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>BMD (g/cm{"\u00B2"})</div>
                            </div>
                          )}
                          {latest.visceral_fat_area_cm2 != null && (
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: mono }}>{latest.visceral_fat_area_cm2}</div>
                              <div style={{ fontSize: 10, color: T.textDim }}>Visceral Fat (cm{"\u00B2"})</div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 12 }}>
                          {dexaScans.length} scan{dexaScans.length !== 1 ? "s" : ""} &middot; {latest.facility_name || "DEXA"} &middot; {new Date(latest.scan_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Regional Data (L/R breakdown) */}
                {(() => {
                  const latest = dexaScans[dexaScans.length - 1];
                  const rd = latest?.regional_data;
                  if (!rd) return null;
                  const regions = ["left_arm", "right_arm", "left_leg", "right_leg", "trunk"].filter(r => rd[r]);
                  if (regions.length === 0) return null;

                  return (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Regional Breakdown</h3>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : `repeat(${Math.min(regions.length, 5)}, 1fr)`, gap: 10 }}>
                        {regions.map(region => {
                          const d = rd[region];
                          const label = region.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <div key={region} style={{ padding: "12px 14px", background: T.surface, borderRadius: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, marginBottom: 8 }}>{label}</div>
                              {d.fat_pct != null && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                  <span style={{ color: T.textDim }}>Fat %</span>
                                  <span style={{ fontFamily: mono, fontWeight: 600 }}>{d.fat_pct}%</span>
                                </div>
                              )}
                              {d.lean_mass_kg != null && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                  <span style={{ color: T.textDim }}>Lean</span>
                                  <span style={{ fontFamily: mono, fontWeight: 600 }}>{d.lean_mass_kg} kg</span>
                                </div>
                              )}
                              {d.fat_mass_kg != null && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                  <span style={{ color: T.textDim }}>Fat</span>
                                  <span style={{ fontFamily: mono, fontWeight: 600 }}>{d.fat_mass_kg} kg</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* AI Analysis */}
                {(() => {
                  const latest = dexaScans[dexaScans.length - 1];
                  if (!latest?.ai_analysis) return null;
                  let analysis = null;
                  try { analysis = JSON.parse(latest.ai_analysis); } catch { return null; }
                  return (
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{"\uD83E\uDDE0"}</span> AI Analysis
                      </h3>
                      {analysis.summary && (
                        <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.65, margin: "0 0 16px" }}>{analysis.summary}</p>
                      )}
                      {analysis.insights?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: analysis.actionItems?.length > 0 ? 16 : 0 }}>
                          {analysis.insights.map((ins, i) => {
                            const colors = { positive: T.green, warning: T.amber, action: T.blue, info: T.textSoft };
                            return (
                              <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: T.surface, borderLeft: `3px solid ${colors[ins.type] || T.textDim}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ins.title}</div>
                                <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>{ins.body}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {analysis.actionItems?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Action Items</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {analysis.actionItems.map((item, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>
                                <span style={{ color: T.accent, fontWeight: 700 }}>{i + 1}.</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* DEXA Scan History */}
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Scan History</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dexaScans.slice().reverse().map(scan => (
                      <div key={scan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.surface, borderRadius: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{"\uD83E\uDDB4"}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{scan.facility_name || "DEXA Scan"}</div>
                            <div style={{ fontSize: 10, color: T.textDim }}>
                              {scan.total_body_fat_pct != null ? `${scan.total_body_fat_pct}% body fat` : ""}
                              {scan.total_body_fat_pct != null && scan.lean_mass_kg != null ? " \u00B7 " : ""}
                              {scan.lean_mass_kg != null ? `${scan.lean_mass_kg} kg lean` : ""}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ fontSize: 11, color: T.textDim }}>{new Date(scan.scan_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                          <button onClick={() => handleDexaDelete(scan.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.textDim, transition: "color 0.2s" }}
                            onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseOut={e => e.currentTarget.style.color = T.textDim}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "20px 32px", background: T.surface, marginTop: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, margin: 0 }}>
            AIM Health Lab is not a diagnostic tool and does not provide medical advice. All biomarker analysis uses athlete-optimized reference ranges for educational context. Abnormal results should always be discussed with your physician or sports medicine doctor. AI insights cross-reference your training, recovery, and health data to identify patterns — they do not replace professional medical evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}
