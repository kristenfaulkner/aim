import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { btn } from "../theme/styles";
import { ArrowLeft, Clock, Zap, Heart, Mountain, Gauge, Activity, TrendingUp, Flame, RefreshCw, Brain, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";

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

function ZoneBar({ zones, ftp }) {
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
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

function AIAnalysis({ analysis, loading, onRegenerate }) {
  if (loading) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: T.textSoft }}>
          <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
          Generating AI analysis...
        </div>
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 8 }}>This usually takes 10-20 seconds</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "32px", textAlign: "center" }}>
        <Brain size={24} style={{ color: T.textDim, marginBottom: 8 }} />
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>No AI analysis yet</p>
        <button onClick={onRegenerate} style={{ ...btn(true), fontSize: 13, padding: "10px 24px" }}>
          <Brain size={14} /> Generate Analysis
        </button>
      </div>
    );
  }

  // Parse markdown sections from the analysis
  const sections = [];
  const lines = analysis.split("\n");
  let currentSection = null;

  for (const line of lines) {
    const headerMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (headerMatch) {
      currentSection = { title: headerMatch[1], content: [] };
      sections.push(currentSection);
      const rest = line.replace(/^\d+\.\s+\*\*.+?\*\*\s*[-—]?\s*/, "").trim();
      if (rest) currentSection.content.push(rest);
    } else if (currentSection) {
      if (line.trim()) currentSection.content.push(line.trim());
    }
  }

  const sectionColors = {
    "WORKOUT SUMMARY": T.blue,
    "KEY INSIGHTS": T.accent,
    "WHAT'S WORKING": T.green,
    "WATCH OUT": T.warn,
    "RECOMMENDATION": T.purple,
  };

  const sectionIcons = {
    "WORKOUT SUMMARY": <Activity size={16} />,
    "KEY INSIGHTS": <Brain size={16} />,
    "WHAT'S WORKING": <TrendingUp size={16} />,
    "WATCH OUT": <Flame size={16} />,
    "RECOMMENDATION": <ChevronRight size={16} />,
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={16} style={{ color: T.accent }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>AI Analysis</div>
            <div style={{ fontSize: 11, color: T.textDim }}>Powered by AIM Intelligence</div>
          </div>
        </div>
        <button onClick={onRegenerate} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, color: T.textDim, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {sections.length > 0 ? sections.map((section, i) => {
          const color = sectionColors[section.title] || T.accent;
          const icon = sectionIcons[section.title] || <ChevronRight size={16} />;
          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ color }}>{icon}</div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color, textTransform: "uppercase" }}>{section.title}</span>
              </div>
              <div style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7 }}>
                {section.content.map((line, j) => {
                  const isBullet = line.startsWith("-") || line.startsWith("•");
                  if (isBullet) {
                    return (
                      <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4 }}>
                        <span style={{ color, flexShrink: 0, marginTop: 2 }}>•</span>
                        <span>{line.replace(/^[-•]\s*/, "")}</span>
                      </div>
                    );
                  }
                  return <p key={j} style={{ margin: "0 0 4px" }}>{line}</p>;
                })}
              </div>
            </div>
          );
        }) : (
          <div style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{analysis}</div>
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

  const fetchActivity = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/activities/detail?id=${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      setError("Activity not found");
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
      <div style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "transparent", border: "none", color: T.textSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: font, padding: "6px 0" }}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div style={{ width: 1, height: 20, background: T.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 40px" }}>
        {/* Title section */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentMid}`, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.activity_type}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{a.source}</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px" }}>{a.name || "Untitled Activity"}</h1>
          <p style={{ fontSize: 14, color: T.textDim, margin: 0 }}>{formattedDate} at {formattedTime}</p>
          {a.description && <p style={{ fontSize: 14, color: T.textSoft, margin: "8px 0 0", lineHeight: 1.5 }}>{a.description}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <MetricCard icon={<Heart size={14} />} label="Avg HR" value={Math.round(a.avg_hr_bpm)} unit="bpm" color={T.danger} />
                  <MetricCard icon={<Heart size={14} />} label="Max HR" value={a.max_hr_bpm ? Math.round(a.max_hr_bpm) : "--"} unit="bpm" color={T.danger} />
                  <MetricCard icon={<TrendingUp size={14} />} label="EF" value={a.efficiency_factor || "--"} />
                </div>
              </div>
            )}

            {/* Additional metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {a.work_kj && <MetricCard icon={<Zap size={14} />} label="Work" value={Math.round(a.work_kj)} unit="kJ" />}
              {a.calories && <MetricCard icon={<Flame size={14} />} label="Calories" value={a.calories} unit="kcal" />}
              {a.hr_drift_pct != null && <MetricCard icon={<TrendingUp size={14} />} label="HR Drift" value={`${a.hr_drift_pct}%`} color={Math.abs(a.hr_drift_pct) > 5 ? T.warn : T.accent} />}
            </div>

            {/* Zone distribution */}
            <ZoneBar zones={a.zone_distribution} />

            {/* Power curve */}
            <PowerCurveDisplay curve={a.power_curve} />
          </div>

          {/* Right column: AI Analysis */}
          <div>
            <AIAnalysis
              analysis={a.ai_analysis}
              loading={analysisLoading}
              onRegenerate={triggerAnalysis}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
