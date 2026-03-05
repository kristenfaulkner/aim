import { useState, useRef } from "react";
import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";
import { supabase } from "../../lib/supabase";
import { apiFetch } from "../../lib/api";
import {
  Bike, Footprints, Waves, Dumbbell, Flower2, Mountain,
  Activity, Sparkles, Upload, X, Loader2,
} from "lucide-react";

// ── Activity Config ──

const ACTIVITIES = [
  {
    id: "cycling", label: "Cycling", icon: Bike, emoji: "\uD83D\uDEB4",
    color: T.accent, bg: T.accentDim, durationDefault: [1, 0, 0],
    groups: [
      { label: "Distance & Speed", fields: [
        { key: "distance", label: "Distance", unit: "mi", placeholder: "0.0" },
        { key: "avg_speed", label: "Avg Speed", unit: "mph", placeholder: "0.0" },
      ]},
      { label: "Power", fields: [
        { key: "avg_power", label: "Avg Power", unit: "W", placeholder: "\u2014" },
        { key: "norm_power", label: "Norm. Power", unit: "W", placeholder: "\u2014" },
        { key: "tss", label: "TSS", unit: "", placeholder: "\u2014" },
        { key: "if_score", label: "IF", unit: "", placeholder: "0.00" },
        { key: "work", label: "Work", unit: "kJ", placeholder: "\u2014" },
      ]},
      { label: "Heart Rate", fields: [
        { key: "avg_hr", label: "Avg HR", unit: "bpm", placeholder: "\u2014" },
        { key: "max_hr", label: "Max HR", unit: "bpm", placeholder: "\u2014" },
      ]},
      { label: "Elevation & Other", fields: [
        { key: "elev_gain", label: "Elevation Gain", unit: "ft", placeholder: "\u2014" },
        { key: "elev_loss", label: "Elevation Loss", unit: "ft", placeholder: "\u2014" },
        { key: "calories", label: "Calories", unit: "kcal", placeholder: "\u2014" },
      ]},
    ],
  },
  {
    id: "running", label: "Running", icon: Footprints, emoji: "\uD83C\uDFC3",
    color: T.orange, bg: "rgba(249,115,22,0.08)", durationDefault: [0, 45, 0],
    groups: [
      { label: "Distance & Pace", fields: [
        { key: "distance", label: "Distance", unit: "mi", placeholder: "0.0" },
        { key: "avg_pace", label: "Avg Pace", unit: "min/mi", placeholder: "0:00" },
      ]},
      { label: "Heart Rate & Other", fields: [
        { key: "avg_hr", label: "Avg HR", unit: "bpm", placeholder: "\u2014" },
        { key: "max_hr", label: "Max HR", unit: "bpm", placeholder: "\u2014" },
        { key: "elev_gain", label: "Elevation Gain", unit: "ft", placeholder: "\u2014" },
        { key: "calories", label: "Calories", unit: "kcal", placeholder: "\u2014" },
        { key: "tss", label: "TSS", unit: "", placeholder: "\u2014" },
      ]},
    ],
  },
  {
    id: "swimming", label: "Swimming", icon: Waves, emoji: "\uD83C\uDFCA",
    color: T.blue, bg: "rgba(59,130,246,0.08)", durationDefault: [0, 40, 0],
    groups: [
      { label: "Distance & Pace", fields: [
        { key: "distance", label: "Distance", unit: "yds", placeholder: "\u2014" },
        { key: "avg_pace", label: "Avg Pace", unit: "sec/100y", placeholder: "\u2014" },
        { key: "avg_hr", label: "Avg HR", unit: "bpm", placeholder: "\u2014" },
        { key: "calories", label: "Calories", unit: "kcal", placeholder: "\u2014" },
        { key: "tss", label: "TSS", unit: "", placeholder: "\u2014" },
      ]},
    ],
  },
  {
    id: "strength", label: "Strength", icon: Dumbbell, emoji: "\uD83C\uDFCB\uFE0F",
    color: T.purple, bg: "rgba(139,92,246,0.08)", durationDefault: [0, 60, 0],
    hasBodyRegion: true, groups: [],
  },
  {
    id: "yoga", label: "Yoga", icon: Flower2, emoji: "\uD83E\uDDD8",
    color: T.pink, bg: "rgba(236,72,153,0.08)", durationDefault: [0, 45, 0],
    groups: [],
  },
  {
    id: "hiking", label: "Hiking", icon: Mountain, emoji: "\uD83E\uDD7E",
    color: T.amber, bg: "rgba(245,158,11,0.08)", durationDefault: [1, 30, 0],
    groups: [
      { label: "Distance & Elevation", fields: [
        { key: "distance", label: "Distance", unit: "mi", placeholder: "0.0" },
        { key: "elev_gain", label: "Elevation Gain", unit: "ft", placeholder: "\u2014" },
      ]},
    ],
  },
  {
    id: "pilates", label: "Pilates", icon: Activity, emoji: "\uD83E\uDD38",
    color: "#06b6d4", bg: "rgba(6,182,212,0.08)", durationDefault: [0, 50, 0],
    groups: [],
  },
  {
    id: "other", label: "Other", icon: Sparkles, emoji: "\u2728",
    color: T.textSoft, bg: T.surface, durationDefault: [0, 30, 0],
    groups: [],
  },
];

const BODY_REGIONS = ["Upper Body", "Lower Body", "Full Body", "Core"];
const INTENSITY_LBL = ["", "Easy", "Light", "Moderate", "Hard", "Max"];
const INTENSITY_CLR = ["", "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444"];

// ── Duration Spinner ──

function DurationInput({ hours, minutes, seconds, onChange, isMobile }) {
  const pad = v => String(v).padStart(2, "0");
  const adj = (f, d) => {
    let h = hours, m = minutes, s = seconds;
    if (f === "h") h = Math.max(0, Math.min(23, h + d));
    if (f === "m") m = Math.max(0, Math.min(59, m + d));
    if (f === "s") s = Math.max(0, Math.min(59, s + d));
    onChange(h, m, s);
  };
  const SpinBtn = ({ f, d }) => (
    <button onClick={() => adj(f, d)} style={{
      width: 28, height: isMobile ? 32 : 22, borderRadius: 6, background: "rgba(0,0,0,0.05)",
      border: "none", cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "center", color: T.textSoft, fontSize: 10, fontWeight: 800,
      transition: "background 0.12s", minHeight: isMobile ? 44 : "auto",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.11)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
    >{d > 0 ? "\u25B2" : "\u25BC"}</button>
  );
  const Unit = ({ lbl, val, f }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <SpinBtn f={f} d={1} />
      <div>
        <div style={{ fontFamily: mono, fontSize: 30, fontWeight: 700, color: T.text, lineHeight: 1, textAlign: "center", minWidth: 54 }}>{pad(val)}</div>
        <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textAlign: "center", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{lbl}</div>
      </div>
      <SpinBtn f={f} d={-1} />
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Unit lbl="hrs" val={hours} f="h" />
      <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 300, color: T.textDim, paddingBottom: 18 }}>:</div>
      <Unit lbl="min" val={minutes} f="m" />
      <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 300, color: T.textDim, paddingBottom: 18 }}>:</div>
      <Unit lbl="sec" val={seconds} f="s" />
    </div>
  );
}

// ── Field Input ──

function FieldInput({ label, value, onChange, unit, placeholder, highlight = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: highlight ? T.accent : T.textSoft, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em", transition: "color 0.3s" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{
            flex: 1, padding: "9px 11px", borderRadius: 9,
            border: `1.5px solid ${highlight ? T.accentMid : focused ? T.accentMid : T.border}`,
            background: highlight ? T.accentDim : T.card,
            fontFamily: mono, fontSize: 13, fontWeight: 500, color: T.text,
            outline: "none", transition: "all 0.3s",
            animation: highlight ? "fieldPop 0.4s cubic-bezier(0.34,1.56,0.64,1)" : "none",
          }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        {unit && <span style={{ fontSize: 11, color: T.textDim, fontWeight: 500, minWidth: 30 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Performance Fields ──

function PerformanceFields({ groups, fields, setField, parsedKeys = new Set() }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
            <div style={{ height: 1, flex: 1, background: T.border }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{group.label}</span>
            <div style={{ height: 1, flex: 1, background: T.border }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {group.fields.map(f => (
              <FieldInput key={f.key} label={f.label} value={fields[f.key] || ""} onChange={v => setField(f.key, v)} unit={f.unit} placeholder={f.placeholder} highlight={parsedKeys.has(f.key)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── File Upload ──

function FileUpload({ actId, onFileParsed, onFileCleared }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState(null);
  const inputRef = useRef(null);

  const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
  const ext = file?.name?.split(".").pop().toLowerCase();
  const extColor = { fit: T.accent, gpx: T.blue, tcx: T.purple, csv: T.orange }[ext] || T.textSoft;

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setParsed(false);
    setParseError(null);
    setParsing(true);

    try {
      // Read file as base64 and send to parse endpoint
      const arrayBuffer = await f.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/activities/parse-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ filename: f.name, data: base64 }),
      });

      const result = await res.json();
      if (res.ok && result.parsed) {
        onFileParsed(result.parsed, result.activity_type_hint);
        setParsed(true);
      } else {
        setParseError("Couldn't parse this file \u2014 you can enter data manually");
      }
    } catch {
      setParseError("Couldn't parse this file \u2014 you can enter data manually");
    } finally {
      setParsing(false);
    }
  };

  const handleClear = () => {
    setFile(null); setParsed(false); setParsing(false); setParseError(null);
    onFileCleared();
  };

  const handleDrop = e => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
        Upload File <span style={{ fontWeight: 400, color: T.textDim, textTransform: "none", letterSpacing: 0 }}>\u2014 optional</span>
      </div>

      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragEnter={() => setDragging(true)}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `1.5px dashed ${dragging ? T.accent : T.borderHover}`,
            borderRadius: 12, padding: "22px 16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            cursor: "pointer", transition: "all 0.18s",
            background: dragging ? T.accentDim : T.surface,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accentMid; e.currentTarget.style.background = T.accentDim; }}
          onMouseLeave={e => { if (!dragging) { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.background = T.surface; } }}
        >
          <Upload size={28} style={{ color: T.textDim }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Drop a file or click to browse</div>
          <div style={{ fontSize: 12, color: T.textDim }}>AIM will auto-fill performance data from the file</div>
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            {[".fit", ".gpx", ".tcx", ".csv"].map(f => (
              <span key={f} style={{ fontSize: 11, fontWeight: 700, color: T.textDim, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 8px" }}>{f}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          borderRadius: 12, border: `1.5px solid ${parsed ? T.accentMid : T.borderHover}`,
          background: parsed ? T.accentDim : T.surface,
          overflow: "hidden", transition: "all 0.3s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.card, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {parsing
                ? <Loader2 size={18} style={{ color: T.accent, animation: "spin 0.7s linear infinite" }} />
                : <span style={{ fontSize: 11, fontWeight: 800, color: extColor, textTransform: "uppercase" }}>.{ext}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
              <div style={{ fontSize: 11, marginTop: 2, fontWeight: 500, color: parsing ? T.textDim : parseError ? T.danger : T.accent }}>
                {parsing ? "Parsing file\u2026" : parseError ? parseError : parsed ? `${fmtSize(file.size)} \u00B7 Data auto-filled below` : fmtSize(file.size)}
              </div>
            </div>
            {!parsing && (
              <button onClick={handleClear} style={{ width: 26, height: 26, borderRadius: 13, background: "rgba(0,0,0,0.07)", border: "none", cursor: "pointer", fontSize: 12, color: T.textSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.13)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.07)"}
              ><X size={12} /></button>
            )}
          </div>
          {parsing && (
            <div style={{ height: 3, background: T.border }}>
              <div style={{ height: "100%", background: T.gradient, animation: "parseProgress 1.4s ease-out forwards", borderRadius: 2 }} />
            </div>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept=".fit,.gpx,.tcx,.csv" onChange={e => handleFile(e.target.files?.[0])} style={{ display: "none" }} />
    </div>
  );
}

// ── Main Modal ──

export default function LogActivityModal({ isOpen, onClose, onSaved }) {
  const { isMobile } = useResponsive();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [actId, setActId] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [bodyRegion, setBodyRegion] = useState(null);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [fields, setFieldsState] = useState({});
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [parsedKeys, setParsedKeys] = useState(new Set());

  const act = ACTIVITIES.find(a => a.id === actId);
  const canSave = actId && intensity && (hours > 0 || minutes > 0 || seconds > 0);

  const setField = (k, v) => setFieldsState(p => ({ ...p, [k]: v }));

  const reset = () => {
    setActId(null); setIntensity(null); setBodyRegion(null);
    setHours(1); setMinutes(0); setSeconds(0);
    setFieldsState({}); setNotes(""); setTitle("");
    setDate(new Date().toISOString().split("T")[0]);
    setParsedKeys(new Set());
    setSaved(false); setSaving(false); setSaveError(null);
  };

  const pickActivity = id => {
    const a = ACTIVITIES.find(x => x.id === id);
    setActId(id); setFieldsState({}); setBodyRegion(null);
    const [h, m, s] = a.durationDefault;
    setHours(h); setMinutes(m); setSeconds(s);
    setParsedKeys(new Set());
  };

  const handleFileParsed = (parsedData, activityTypeHint) => {
    const { duration_seconds: durSec, ...perfFields } = parsedData;
    setFieldsState(prev => ({ ...prev, ...perfFields }));
    setParsedKeys(new Set(Object.keys(perfFields)));
    if (durSec) {
      setHours(Math.floor(durSec / 3600));
      setMinutes(Math.floor((durSec % 3600) / 60));
      setSeconds(durSec % 60);
    }
    if (activityTypeHint && !actId) {
      const match = ACTIVITIES.find(a => a.id === activityTypeHint);
      if (match) setActId(activityTypeHint);
    }
  };

  const handleFileCleared = () => {
    setFieldsState(prev => {
      const next = { ...prev };
      parsedKeys.forEach(k => { delete next[k]; });
      return next;
    });
    setParsedKeys(new Set());
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        activity_type: actId,
        title: title || null,
        date,
        duration_seconds: hours * 3600 + minutes * 60 + seconds,
        perceived_intensity: intensity,
        body_region: bodyRegion || null,
        notes: notes || null,
        fields: Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== "")
        ),
      };
      const activity = await apiFetch("/activities/manual", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSaved(true);
      // Store for "Done" and "Log Another"
      setSavedActivity(activity);
    } catch (err) {
      setSaveError(err.message || "Failed to save activity");
    } finally {
      setSaving(false);
    }
  };

  const [savedActivity, setSavedActivity] = useState(null);

  const handleDone = () => {
    if (savedActivity && onSaved) onSaved(savedActivity);
    reset();
    onClose();
  };

  const handleLogAnother = () => {
    if (savedActivity && onSaved) onSaved(savedActivity);
    reset();
  };

  const handleClose = () => {
    if (!saved) reset();
    onClose();
  };

  if (!isOpen) return null;

  const modalStyle = isMobile
    ? { position: "relative", zIndex: 10, width: "100%", maxWidth: "100%", height: "100dvh", background: T.card, borderRadius: 0, overflow: "hidden", display: "flex", flexDirection: "column" }
    : { position: "relative", zIndex: 10, width: "100%", maxWidth: 528, background: T.card, borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.13), 0 6px 20px rgba(0,0,0,0.07)", animation: "pop 0.28s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden", maxHeight: "92vh", display: "flex", flexDirection: "column" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pop { 0% { opacity:0; transform:scale(0.94) translateY(10px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes parseProgress { from { width:0%; } to { width:100%; } }
        @keyframes fieldPop { 0% { transform:scale(0.97); } 60% { transform:scale(1.02); } 100% { transform:scale(1); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => { if (!saved) handleClose(); }}
        style={{ position: "absolute", inset: 0, background: "rgba(20,20,40,0.42)", backdropFilter: "blur(5px)", animation: "fadeIn 0.2s ease" }}
      />

      {/* Modal */}
      <div style={modalStyle}>
        {!saved ? (
          <>
            {/* Header */}
            <div style={{ padding: "22px 24px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: act ? act.bg : T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {act ? <act.icon size={20} style={{ color: act.color }} /> : <Sparkles size={20} style={{ color: T.accent }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>Log Activity</div>
                    <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>
                      {act ? `Logging ${act.label.toLowerCase()} session` : "Pick a type to start"}
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", minHeight: isMobile ? 44 : 32, minWidth: isMobile ? 44 : 32 }}
                  onMouseEnter={e => e.currentTarget.style.background = T.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = T.surface}
                ><X size={16} style={{ color: T.textSoft }} /></button>
              </div>

              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder={act ? `Name this ${act.label.toLowerCase()} session\u2026` : "Session name (optional)"}
                style={{
                  width: "100%", padding: "10px 13px", borderRadius: 10,
                  border: `1.5px solid ${T.border}`, background: T.surface,
                  fontFamily: font, fontSize: 14, color: T.text, outline: "none",
                  marginBottom: 16, transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = T.accentMid}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              <div style={{ height: 1, background: T.border, marginLeft: -24, marginRight: -24 }} />
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>

              {/* Activity type grid */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Activity Type</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {ACTIVITIES.map(a => {
                    const sel = actId === a.id;
                    const Icon = a.icon;
                    return (
                      <button key={a.id} onClick={() => pickActivity(a.id)} style={{
                        padding: "11px 6px", borderRadius: 12,
                        border: `1.5px solid ${sel ? a.color : T.border}`,
                        background: sel ? a.bg : T.card,
                        cursor: "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 5, transition: "all 0.16s",
                        transform: sel ? "scale(1.04)" : "scale(1)",
                        boxShadow: sel ? `0 0 0 3px ${a.color}18` : "none",
                        fontFamily: font, minHeight: isMobile ? 44 : "auto",
                      }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = a.bg; e.currentTarget.style.borderColor = a.color + "70"; } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border; } }}
                      >
                        <Icon size={21} style={{ color: sel ? a.color : T.textSoft }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: sel ? a.color : T.textSoft }}>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Body region (Strength only) */}
              {act?.hasBodyRegion && (
                <div style={{ animation: "slideDown 0.2s ease" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Muscle Group Focus</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {BODY_REGIONS.map(r => {
                      const sel = bodyRegion === r;
                      return (
                        <button key={r} onClick={() => setBodyRegion(r)} style={{
                          padding: "8px 16px", borderRadius: 20,
                          border: `1.5px solid ${sel ? T.purple : T.border}`,
                          background: sel ? "rgba(139,92,246,0.09)" : T.card,
                          fontSize: 13, fontWeight: 600, color: sel ? T.purple : T.textSoft,
                          cursor: "pointer", transition: "all 0.15s", fontFamily: font,
                          minHeight: isMobile ? 44 : "auto",
                        }}>
                          {r}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>Lower body strength has the highest cycling recovery impact</div>
                </div>
              )}

              {/* Intensity */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Perceived Intensity</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {[1, 2, 3, 4, 5].map(i => {
                    const sel = intensity === i;
                    const col = INTENSITY_CLR[i];
                    return (
                      <button key={i} onClick={() => setIntensity(i)} style={{
                        flex: 1, padding: "10px 0", borderRadius: 11,
                        border: `1.5px solid ${sel ? col : T.border}`,
                        background: sel ? `${col}14` : T.card,
                        cursor: "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 5, transition: "all 0.14s",
                        transform: sel ? "scale(1.06)" : "scale(1)", fontFamily: font,
                        minHeight: isMobile ? 44 : "auto",
                      }}>
                        <div style={{ width: 28, height: 28, borderRadius: 14, background: sel ? col : T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: sel ? T.white : T.textSoft, transition: "all 0.14s" }}>{i}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: sel ? col : T.textDim }}>{INTENSITY_LBL[i]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Duration</div>
                <div style={{ background: T.surface, borderRadius: 14, padding: 16, display: "flex", justifyContent: "center" }}>
                  <DurationInput hours={hours} minutes={minutes} seconds={seconds} onChange={(h, m, s) => { setHours(h); setMinutes(m); setSeconds(s); }} isMobile={isMobile} />
                </div>
              </div>

              {/* Expandable performance fields */}
              {act && act.groups.length > 0 && (
                <div style={{ animation: "slideDown 0.2s ease" }}>
                  <PerformanceFields groups={act.groups} fields={fields} setField={setField} parsedKeys={parsedKeys} />
                </div>
              )}

              {/* File Upload */}
              <FileUpload actId={actId} onFileParsed={handleFileParsed} onFileCleared={handleFileCleared} />

              {/* Notes */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Notes <span style={{ fontWeight: 400, color: T.textDim, textTransform: "none", letterSpacing: 0 }}>\u2014 optional</span>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="How did it feel? Terrain, fatigue, nutrition, anything AIM should know\u2026"
                  rows={3} style={{
                    width: "100%", padding: "11px 13px", borderRadius: 10,
                    border: `1.5px solid ${T.border}`, background: T.surface,
                    fontFamily: font, fontSize: 13, color: T.text,
                    outline: "none", resize: "none", lineHeight: 1.55, transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = T.accentMid}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>

              {/* Date */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Date</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                  padding: "9px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`,
                  background: T.surface, fontFamily: font, fontSize: 14, color: T.text,
                  outline: "none", transition: "border-color 0.15s",
                }}
                  onFocus={e => e.target.style.borderColor = T.accentMid}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
              <div style={{ height: 2 }} />
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
              {saveError && (
                <div style={{ fontSize: 12, color: T.danger, fontWeight: 500, marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>
                  {saveError}
                </div>
              )}
              {canSave && !saveError && (
                <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: T.accentDim, borderRadius: 10, marginBottom: 12, animation: "slideUp 0.18s ease" }}>
                  <Sparkles size={13} style={{ color: T.accent, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: T.accent, fontWeight: 500, lineHeight: 1.45 }}>
                    {actId === "strength" && bodyRegion === "Lower Body"
                      ? "Lower body session will impact tomorrow's readiness. AIM will adjust ride recommendations."
                      : `This ${act?.label.toLowerCase()} session will be included in your training load and AI insights.`}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleClose} style={{
                  flex: 1, padding: "13px", borderRadius: 12, border: `1.5px solid ${T.border}`,
                  background: T.card, fontFamily: font, fontSize: 14, fontWeight: 600,
                  color: T.textSoft, cursor: "pointer", transition: "background 0.15s",
                  minHeight: isMobile ? 44 : "auto",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surface}
                  onMouseLeave={e => e.currentTarget.style.background = T.card}
                >Cancel</button>
                <button onClick={canSave ? handleSave : undefined} disabled={saving} style={{
                  flex: 2, padding: "13px", borderRadius: 12, border: "none",
                  background: canSave ? T.gradient : T.surface,
                  fontFamily: font, fontSize: 14, fontWeight: 700,
                  color: canSave ? T.white : T.textDim,
                  cursor: canSave && !saving ? "pointer" : "not-allowed",
                  boxShadow: canSave ? "0 4px 16px rgba(16,185,129,0.25)" : "none",
                  transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  minHeight: isMobile ? 44 : "auto", opacity: saving ? 0.7 : 1,
                }}
                  onMouseEnter={e => { if (canSave && !saving) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {saving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  {saving ? "Saving\u2026" : "Save Session"}
                </button>
              </div>
              {!canSave && (
                <div style={{ fontSize: 11, color: T.textDim, textAlign: "center", marginTop: 7 }}>
                  {!actId ? "Select an activity type" : !intensity ? "Rate your effort level" : "Add a duration"} to continue
                </div>
              )}
            </div>
          </>
        ) : (
          /* Success State */
          <div style={{ padding: "36px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, animation: "pop 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width: 76, height: 76, borderRadius: 38, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, boxShadow: "0 8px 28px rgba(16,185,129,0.32)" }}>
              {act?.emoji}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 21, fontWeight: 700, color: T.text, marginBottom: 5 }}>
                {title || `${act?.label} Session Logged`}
              </div>
              <div style={{ fontSize: 14, color: T.textSoft }}>
                {`${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`}
                {intensity && <span style={{ marginLeft: 8, color: INTENSITY_CLR[intensity], fontWeight: 600 }}>{"\u00B7"} {INTENSITY_LBL[intensity]}</span>}
              </div>
            </div>
            <div style={{ width: "100%", padding: "16px 18px", background: T.accentDim, borderRadius: 14, border: `1px solid ${T.accentMid}` }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                <Sparkles size={14} style={{ color: T.accent }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>AIM Analysis</span>
              </div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.55 }}>
                {actId === "strength" && bodyRegion === "Lower Body" && intensity >= 4
                  ? "Heavy lower body session detected. Expect 24\u201348h neuromuscular recovery \u2014 AIM will reduce recommended intensity for your next ride."
                  : actId === "cycling"
                  ? `Cycling session added to your training load.${fields.avg_power ? ` Avg power: ${fields.avg_power}W.` : ""}${fields.tss ? ` TSS: ${fields.tss}.` : ""}`
                  : actId === "running"
                  ? "Run logged. AIM will cross-reference running load with cycling readiness in tomorrow's insights."
                  : `${act?.label} session added to your training picture. AIM will factor this into your readiness score.`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={handleLogAnother} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.card, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.textSoft, cursor: "pointer", minHeight: isMobile ? 44 : "auto" }}>
                Log Another
              </button>
              <button onClick={handleDone} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: T.gradient, fontFamily: font, fontSize: 13, fontWeight: 700, color: T.white, cursor: "pointer", boxShadow: "0 4px 14px rgba(16,185,129,0.25)", minHeight: isMobile ? 44 : "auto" }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
