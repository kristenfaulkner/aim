import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { apiFetch } from "../lib/api";
import SEO from "../components/SEO";
import { Search, Filter, X, ChevronDown, ChevronUp, TrendingUp, Zap, Heart, Clock, Activity, Database, Sparkles, ArrowLeft, BarChart3, Menu, Settings, User, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

// ── Constants ──

const TAG_LABELS = {
  race_day: "Race Day", group_ride: "Group Ride", indoor_trainer: "Indoor",
  endurance_steady: "Endurance", tempo_ride: "Tempo", sweet_spot_session: "Sweet Spot",
  threshold_session: "Threshold", vo2_session: "VO2max", anaerobic_session: "Anaerobic",
  neuromuscular_session: "Neuromuscular", climbing_focus: "Climbing", rolling_surge_ride: "Rolling/Surges",
  hot_conditions: "Hot", cold_conditions: "Cold", high_wind_conditions: "Windy",
  high_drift: "High Drift", low_hrv_day: "Low HRV", poor_sleep_day: "Poor Sleep",
};

const TAG_COLORS = {
  workout_type: "#3b82f6",
  comparison: "#8b5cf6",
  environment: "#f59e0b",
  readiness: "#ef4444",
  special: T.accent,
  intensity: "#f97316",
  duration: "#06b6d4",
  time: T.textDim,
};

const FILTER_GROUPS = [
  {
    label: "Workout Type",
    tags: ["endurance_steady", "tempo_ride", "sweet_spot_session", "threshold_session", "vo2_session", "anaerobic_session", "neuromuscular_session"],
  },
  {
    label: "Context",
    tags: ["race_day", "group_ride", "indoor_trainer", "climbing_focus", "rolling_surge_ride"],
  },
  {
    label: "Environment",
    tags: ["hot_conditions", "cold_conditions", "high_wind_conditions"],
  },
  {
    label: "Readiness",
    tags: ["low_hrv_day", "poor_sleep_day", "high_drift"],
  },
];

function formatDuration(seconds) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Components ──

function SmartChip({ chip, isActive, onClick }) {
  const color = TAG_COLORS[chip.category] || T.textDim;
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 20,
        border: isActive ? `2px solid ${color}` : `1px solid ${T.border}`,
        background: isActive ? `${color}12` : T.card,
        color: isActive ? color : T.textSoft,
        fontSize: 12, fontWeight: 600, fontFamily: font,
        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
      }}
    >
      {chip.label}
      {chip.count != null && (
        <span style={{ fontSize: 10, opacity: 0.6 }}>{chip.count}</span>
      )}
    </button>
  );
}

function TagFilterPanel({ selectedTags, onToggleTag, expanded, onToggleExpanded, tagCounts }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden",
    }}>
      <button
        onClick={onToggleExpanded}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "14px 18px", border: "none", background: "none",
          cursor: "pointer", fontFamily: font,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={14} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Tag Filters</span>
          {selectedTags.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px",
              borderRadius: 10, background: `${T.accent}15`, color: T.accent,
            }}>
              {selectedTags.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} color={T.textDim} /> : <ChevronDown size={14} color={T.textDim} />}
      </button>
      {expanded && (
        <div style={{ padding: "0 18px 16px" }}>
          {FILTER_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                {group.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {group.tags.map((tagId) => {
                  const isSelected = selectedTags.includes(tagId);
                  const count = tagCounts?.[tagId] || 0;
                  if (count === 0 && !isSelected) return null;
                  return (
                    <button
                      key={tagId}
                      onClick={() => onToggleTag(tagId)}
                      style={{
                        padding: "4px 10px", borderRadius: 6,
                        border: isSelected ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                        background: isSelected ? `${T.accent}15` : T.surface,
                        color: isSelected ? T.accent : T.textSoft,
                        fontSize: 11, fontWeight: 600, fontFamily: font,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      {TAG_LABELS[tagId] || tagId}
                      <span style={{ fontSize: 9, opacity: 0.5 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => selectedTags.forEach(t => onToggleTag(t))}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "none",
                background: T.surface, color: T.textDim, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: font,
              }}
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AggregationBar({ aggregation, isMobile }) {
  if (!aggregation) return null;

  const metrics = [
    { label: "Activities", value: aggregation.count, icon: <Activity size={12} /> },
    { label: "Avg TSS", value: aggregation.avgTSS, icon: <Zap size={12} /> },
    { label: "Avg NP", value: aggregation.avgNP ? `${aggregation.avgNP}W` : null, icon: <Zap size={12} /> },
    { label: "Avg EF", value: aggregation.avgEF, icon: <TrendingUp size={12} /> },
    { label: "Avg Drift", value: aggregation.avgHrDrift != null ? `${aggregation.avgHrDrift}%` : null, icon: <Heart size={12} /> },
    { label: "Total kJ", value: aggregation.totalWork ? Math.round(aggregation.totalWork) : null, icon: <Zap size={12} /> },
  ].filter(m => m.value != null);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : `repeat(${Math.min(metrics.length, 6)}, 1fr)`,
      gap: 8, padding: "12px 16px",
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
    }}>
      {metrics.map(({ label, value, icon }) => (
        <div key={label} style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 2 }}>
            <span style={{ color: T.accent }}>{icon}</span>
            <span style={{ fontSize: 9, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
          </div>
          <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 800, color: T.text }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function ResultRow({ activity, onClick, isMobile }) {
  const tags = (activity.tags || []).filter(t => t.scope === "workout");
  const workIntervals = activity.laps?.intervals?.filter(i => i.type === "work") || [];

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr 1fr 1fr",
        gap: isMobile ? 4 : 12, padding: "12px 16px", alignItems: "center",
        borderBottom: `1px solid ${T.border}08`, cursor: "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = T.surface}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
          {activity.name || activity.activity_type || "Activity"}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: T.textDim }}>
            {activity.started_at ? new Date(activity.started_at).toLocaleDateString() : ""}
          </span>
          {tags.slice(0, 3).map((t, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
              background: `${T.accent}12`, color: T.accent,
            }}>
              {TAG_LABELS[t.tag_id] || t.tag_id}
            </span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600 }}>
          {formatDuration(activity.duration_seconds)}
        </span>
      </div>
      {!isMobile && (
        <>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.accent }}>
              {activity.normalized_power_watts || activity.avg_power_watts || "—"}
              <span style={{ fontSize: 10, fontWeight: 500, color: T.textDim }}>W</span>
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600 }}>
              {activity.tss || "—"}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600 }}>
              {activity.efficiency_factor || "—"}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: activity.hr_drift_pct && Math.abs(activity.hr_drift_pct) > 5 ? "#f59e0b" : T.textSoft }}>
              {activity.hr_drift_pct != null ? `${activity.hr_drift_pct}%` : "—"}
            </span>
          </div>
        </>
      )}
      {isMobile && (
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.textSoft }}>
          <span style={{ fontFamily: mono }}>{activity.normalized_power_watts || "—"}W</span>
          <span style={{ fontFamily: mono }}>TSS {activity.tss || "—"}</span>
          <span style={{ fontFamily: mono }}>EF {activity.efficiency_factor || "—"}</span>
        </div>
      )}
    </div>
  );
}

function GroupedView({ groups, isMobile }) {
  if (!groups || groups.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={14} style={{ color: T.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Grouped Comparison</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: "left", padding: "10px 14px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Group</th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Count</th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg NP</th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg TSS</th>
              <th style={{ textAlign: "right", padding: "10px 8px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg EF</th>
              {!isMobile && <th style={{ textAlign: "right", padding: "10px 8px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg Drift</th>}
              {!isMobile && <th style={{ textAlign: "right", padding: "10px 14px", color: T.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Avg IF</th>}
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}08` }}>
                <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                  {TAG_LABELS[g.label] || g.label}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: mono }}>{g.count}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: mono, fontWeight: 700, color: T.accent }}>
                  {g.avgNP || "—"}W
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: mono }}>{g.avgTSS || "—"}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: mono }}>{g.avgEF || "—"}</td>
                {!isMobile && <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: mono }}>{g.avgHrDrift != null ? `${g.avgHrDrift}%` : "—"}</td>}
                {!isMobile && <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: mono }}>{g.avgIF || "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function WorkoutDatabase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State
  const [chips, setChips] = useState([]);
  const [tagCounts, setTagCounts] = useState({});
  const [activeChip, setActiveChip] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [results, setResults] = useState([]);
  const [aggregation, setAggregation] = useState(null);
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState(null);
  const [sortField, setSortField] = useState("started_at");
  const [sortDir, setSortDir] = useState("desc");

  // Load smart chips on mount
  useEffect(() => {
    apiFetch("/activities/smart-chips")
      .then(data => {
        setChips(data.chips || []);
        setTagCounts(data.tagCounts || {});
      })
      .catch(() => {});
  }, []);

  // Load initial results (all activities, most recent)
  useEffect(() => {
    runQuery({});
  }, []);

  const runQuery = useCallback(async (queryOverrides = {}) => {
    setLoading(true);
    try {
      const body = {
        tags: selectedTags,
        sort: sortField,
        sortDir,
        groupBy,
        groupTag: groupBy === "tag" ? "energy_system" : undefined,
        limit: 100,
        ...queryOverrides,
      };
      const data = await apiFetch("/activities/query", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResults(data.activities || []);
      setAggregation(data.aggregation || null);
      setGroups(data.groups || null);
    } catch (err) {
      console.error("Query error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTags, sortField, sortDir, groupBy]);

  // Re-query when tags or sort change
  useEffect(() => {
    runQuery({});
  }, [selectedTags, sortField, sortDir, groupBy]);

  const handleChipClick = (chip) => {
    if (activeChip?.label === chip.label) {
      // Deactivate
      setActiveChip(null);
      setSelectedTags([]);
      runQuery({});
    } else {
      setActiveChip(chip);
      const q = chip.query || {};
      setSelectedTags(q.tags || []);
      runQuery(q);
    }
  };

  const handleToggleTag = (tagId) => {
    setActiveChip(null);
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Nav
  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Activities", path: "/activities" },
    { label: "My Stats", path: "/my-stats" },
    { label: "Sleep", path: "/sleep" },
    { label: "Health Lab", path: "/health-lab" },
    { label: "Workout DB", path: "/workout-db", active: true },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <SEO title="Workout Database - AIM" description="Search, filter, and compare workouts by type, conditions, and performance." />

      {/* Header */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isMobile ? "14px 16px" : "14px 32px",
        background: T.card, borderBottom: `1px solid ${T.border}`,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            onClick={() => navigate("/dashboard")}
            style={{ fontSize: 22, fontWeight: 900, cursor: "pointer", fontFamily: font, letterSpacing: "-0.02em" }}
          >
            <span style={{ background: `linear-gradient(135deg, ${T.accent}, #3b82f6)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
            <span style={{ color: T.text }}>M</span>
          </span>
          {!isMobile && (
            <nav style={{ display: "flex", gap: 6 }}>
              {navItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none",
                    background: item.active ? `${T.accent}15` : "transparent",
                    color: item.active ? T.accent : T.textSoft,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            {mobileMenuOpen ? <X size={22} color={T.text} /> : <Menu size={22} color={T.text} />}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => navigate("/settings")} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              <Settings size={18} color={T.textDim} />
            </button>
            <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              <LogOut size={18} color={T.textDim} />
            </button>
          </div>
        )}
      </header>

      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "8px 16px" }}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "12px 8px", border: "none",
                background: item.active ? `${T.accent}08` : "transparent",
                color: item.active ? T.accent : T.text,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font,
                textAlign: "left", borderRadius: 8,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px" : "24px 32px" }}>
        {/* Page title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Database size={20} style={{ color: T.accent }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: font }}>Workout Database</h1>
        </div>

        {/* Smart Chips */}
        {chips.length > 0 && (
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16,
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 8 : 0,
          }}>
            {chips.map((chip, i) => (
              <SmartChip
                key={i}
                chip={chip}
                isActive={activeChip?.label === chip.label}
                onClick={() => handleChipClick(chip)}
              />
            ))}
          </div>
        )}

        {/* Tag Filter Panel */}
        <div style={{ marginBottom: 16 }}>
          <TagFilterPanel
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            expanded={filterExpanded}
            onToggleExpanded={() => setFilterExpanded(!filterExpanded)}
            tagCounts={tagCounts}
          />
        </div>

        {/* Controls bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12, flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: T.textDim, fontWeight: 600 }}>
              {loading ? "Loading..." : `${results.length} activities`}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Group by selector */}
            <select
              value={groupBy || ""}
              onChange={e => setGroupBy(e.target.value || null)}
              style={{
                padding: "5px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
                background: T.card, color: T.text, fontSize: 11, fontFamily: font,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              <option value="">No Grouping</option>
              <option value="tag">By Workout Type</option>
              <option value="month">By Month</option>
              <option value="week">By Week</option>
            </select>
            {/* Sort selector */}
            <select
              value={`${sortField}-${sortDir}`}
              onChange={e => {
                const [f, d] = e.target.value.split("-");
                setSortField(f);
                setSortDir(d);
              }}
              style={{
                padding: "5px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
                background: T.card, color: T.text, fontSize: 11, fontFamily: font,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              <option value="started_at-desc">Newest First</option>
              <option value="started_at-asc">Oldest First</option>
              <option value="tss-desc">Highest TSS</option>
              <option value="np-desc">Highest NP</option>
              <option value="ef-desc">Highest EF</option>
            </select>
          </div>
        </div>

        {/* Aggregation bar */}
        <AggregationBar aggregation={aggregation} isMobile={isMobile} />

        {/* Grouped comparison */}
        {groups && groups.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <GroupedView groups={groups} isMobile={isMobile} />
          </div>
        )}

        {/* Results table */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          overflow: "hidden", marginTop: 16,
        }}>
          {/* Table header */}
          {!isMobile && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
              gap: 12, padding: "10px 16px",
              borderBottom: `1px solid ${T.border}`,
            }}>
              {[
                { label: "Activity", field: "started_at" },
                { label: "Duration", field: null },
                { label: "NP", field: "np" },
                { label: "TSS", field: "tss" },
                { label: "EF", field: "ef" },
                { label: "Drift", field: null },
              ].map(({ label, field }) => (
                <div
                  key={label}
                  onClick={field ? () => handleSort(field) : undefined}
                  style={{
                    textAlign: label === "Activity" ? "left" : "right",
                    fontSize: 10, fontWeight: 700, color: sortField === field ? T.accent : T.textDim,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    cursor: field ? "pointer" : "default",
                  }}
                >
                  {label} {sortField === field && (sortDir === "desc" ? "↓" : "↑")}
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textDim, fontSize: 13 }}>
              Loading activities...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Database size={32} style={{ color: T.textDim, marginBottom: 8 }} />
              <div style={{ color: T.textDim, fontSize: 13 }}>No activities match your filters</div>
              <div style={{ color: T.textDim, fontSize: 11, marginTop: 4 }}>Try adjusting your tag filters or date range</div>
            </div>
          ) : (
            results.map(a => (
              <ResultRow
                key={a.id}
                activity={a}
                onClick={() => navigate(`/activity/${a.id}`)}
                isMobile={isMobile}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
