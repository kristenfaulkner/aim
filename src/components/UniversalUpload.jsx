import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../theme/tokens";
import { Upload, FileText, Check, AlertCircle, Loader, Activity, Droplets, Bone, FileSpreadsheet, Archive, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";

const MAX_SIZE_MB = 10;
const MAX_ZIP_SIZE_MB = 50;
const MAX_FILES = 20;

// ── File classification ──

function classifyByExtension(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".fit.gz") || name.endsWith(".fit")) return "fit";
  if (name.endsWith(".gz") && !name.endsWith(".fit.gz")) return "fit"; // likely a .fit wrapped in .gz
  if (name.endsWith(".zip")) return "zip";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".tcx")) return "tcx";
  if (name.endsWith(".gpx")) return "gpx";
  const type = file.type;
  if (type === "application/pdf" || type.startsWith("image/")) return "pdf_or_image";
  return "unknown";
}

async function sniffCsvType(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const header = reader.result.slice(0, 1024).toLowerCase();
      if (header.includes("workoutday") || header.includes("workout day") || (header.includes("title") && header.includes("tss"))) {
        resolve("csv_workouts");
      } else if (header.includes("timestamp") && header.includes("type") && header.includes("value")) {
        resolve("csv_metrics");
      } else {
        resolve("csv_unknown");
      }
    };
    reader.onerror = () => resolve("csv_unknown");
    reader.readAsText(file.slice(0, 1024));
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Type metadata for UI
const TYPE_META = {
  fit:          { label: "Workout",     color: T.blue,   icon: Activity },
  zip:          { label: "Workout ZIP", color: T.blue,   icon: Archive },
  csv_workouts: { label: "Workouts CSV", color: T.blue,  icon: FileSpreadsheet },
  csv_metrics:  { label: "Metrics CSV", color: T.purple, icon: FileSpreadsheet },
  csv_unknown:  { label: "Unknown CSV", color: T.textDim, icon: FileSpreadsheet },
  blood_panel:  { label: "Blood Panel", color: "#ef4444", icon: Droplets },
  body_scan:    { label: "Body Scan",   color: T.amber,  icon: Bone },
  pdf_or_image: { label: "Document",    color: T.textSoft, icon: FileText },
  tcx:          { label: "TCX File",    color: T.textDim, icon: Activity },
  gpx:          { label: "GPX File",    color: T.textDim, icon: Activity },
  unknown:      { label: "Unknown",     color: T.textDim, icon: FileText },
};

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.unknown;
  const Icon = meta.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
      background: `${meta.color}15`, color: meta.color, whiteSpace: "nowrap",
    }}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}

// ── Main Component ──

export default function UniversalUpload({ compact = false }) {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [queue, setQueue] = useState([]); // { id, name, type, status, result, error }
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  // ── Process a single file ──

  async function processOneFile(file, type, session) {
    const authHeader = `Bearer ${session.access_token}`;

    // FIT file
    if (type === "fit") {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) throw new Error(`File exceeds ${MAX_SIZE_MB}MB`);
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/upload/process-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ fileBase64: base64, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return { destination: "dashboard", ...data };
    }

    // ZIP — upload to Supabase Storage, then call TrainingPeaks endpoint
    if (type === "zip") {
      if (file.size > MAX_ZIP_SIZE_MB * 1024 * 1024) throw new Error(`ZIP exceeds ${MAX_ZIP_SIZE_MB}MB`);
      const filePath = `${session.user.id}/universal/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from("import-files")
        .upload(filePath, file, { contentType: "application/zip", upsert: false });
      if (uploadErr) throw new Error(uploadErr.message || "Storage upload failed");

      const res = await fetch("/api/integrations/import/trainingpeaks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ zipPath: filePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      return { destination: "dashboard", ...data };
    }

    // CSV — sniff and route
    if (type === "csv_workouts" || type === "csv_metrics") {
      const csvBase64 = btoa(await file.text());
      const body = type === "csv_workouts"
        ? { csvData: csvBase64 }
        : { metricsCsvData: csvBase64 };
      const res = await fetch("/api/integrations/import/trainingpeaks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      return { destination: "dashboard", ...data };
    }

    // PDF / Image — classify and process
    if (type === "pdf_or_image") {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) throw new Error(`File exceeds ${MAX_SIZE_MB}MB`);
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/upload/classify-and-process", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ fileBase64: base64, mediaType: file.type, fileName: file.name }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Server error (${res.status})`); }
      if (!res.ok && !data.classification) throw new Error(data.error || `Upload failed (${res.status})`);
      if (data.classification === "unknown") throw new Error("Could not identify as a blood panel or body scan");
      return {
        destination: "health-lab",
        detectedType: data.classification,
        ...data,
      };
    }

    // TCX / GPX — not yet supported
    if (type === "tcx" || type === "gpx") {
      throw new Error(`${type.toUpperCase()} support coming soon — use TrainingPeaks import for these files`);
    }

    throw new Error("Unsupported file type");
  }

  // ── Process all files ──

  async function processFiles(files) {
    const fileList = Array.from(files).filter(f => f && f.size > 0);
    if (fileList.length === 0) return;

    if (fileList.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files at once. For larger batches, use TrainingPeaks ZIP import.`);
      return;
    }

    setProcessing(true);
    setError(null);
    setQueue([]);
    setCurrentIndex(-1);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please sign in again");

      // Build queue with classified types
      const items = [];
      for (const file of fileList) {
        let type = classifyByExtension(file);
        if (type === "csv") {
          type = await sniffCsvType(file);
        }
        items.push({
          id: crypto.randomUUID(),
          name: file.name,
          type,
          status: "queued",
          result: null,
          error: null,
          file,
        });
      }
      setQueue(items);

      // Process sequentially
      for (let i = 0; i < items.length; i++) {
        setCurrentIndex(i);
        setQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "processing" } : item
        ));

        try {
          const result = await processOneFile(items[i].file, items[i].type, session);
          const detectedType = result.detectedType || items[i].type;
          setQueue(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: "done", type: detectedType, result } : item
          ));
        } catch (err) {
          setQueue(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: err.message } : item
          ));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
      setCurrentIndex(-1);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const reset = () => {
    setQueue([]);
    setError(null);
    setCurrentIndex(-1);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Results state ──
  const done = queue.length > 0 && !processing;
  if (done) {
    const succeeded = queue.filter(q => q.status === "done");
    const failed = queue.filter(q => q.status === "error");
    const workouts = succeeded.filter(q => ["fit", "zip", "csv_workouts", "csv_metrics"].includes(q.type));
    const healthFiles = succeeded.filter(q => ["blood_panel", "body_scan"].includes(q.type));
    const totalImported = workouts.reduce((s, q) => s + (q.result?.imported || 0), 0);
    const totalMerged = workouts.reduce((s, q) => s + (q.result?.merged || 0), 0);

    return (
      <div style={{ padding: compact ? "16px" : "24px", background: "rgba(16,185,129,0.04)", border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 14 }}>
        {succeeded.length > 0 && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <Check size={20} color={T.accent} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 4 }}>
              {succeeded.length} file{succeeded.length !== 1 ? "s" : ""} processed
            </div>
            {totalImported > 0 && (
              <div style={{ fontSize: 12, color: T.textSoft }}>
                {totalImported} workout{totalImported !== 1 ? "s" : ""} imported{totalMerged > 0 ? `, ${totalMerged} merged` : ""}
              </div>
            )}
            {healthFiles.length > 0 && (
              <div style={{ fontSize: 12, color: T.textSoft }}>
                {healthFiles.filter(h => h.type === "blood_panel").length > 0 && `${healthFiles.filter(h => h.type === "blood_panel").length} blood panel${healthFiles.filter(h => h.type === "blood_panel").length !== 1 ? "s" : ""} extracted`}
                {healthFiles.filter(h => h.type === "blood_panel").length > 0 && healthFiles.filter(h => h.type === "body_scan").length > 0 && " · "}
                {healthFiles.filter(h => h.type === "body_scan").length > 0 && `${healthFiles.filter(h => h.type === "body_scan").length} body scan${healthFiles.filter(h => h.type === "body_scan").length !== 1 ? "s" : ""} processed`}
              </div>
            )}
          </div>
        )}

        {/* Per-file results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {queue.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              background: item.status === "error" ? "rgba(239,68,68,0.06)" : T.bg,
              borderRadius: 8, fontSize: 12,
            }}>
              {item.status === "done" ? <Check size={12} color={T.accent} /> : <AlertCircle size={12} color="#ef4444" />}
              <span style={{ color: T.textSoft, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              <TypeBadge type={item.type} />
              {item.error && <span style={{ fontSize: 10, color: "#ef4444", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.error}</span>}
            </div>
          ))}
        </div>

        {/* Destination links + reset */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {workouts.length > 0 && (
            <button onClick={() => navigate("/dashboard")} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: `${T.blue}15`, border: `1px solid ${T.blue}30`,
              color: T.blue, cursor: "pointer", fontFamily: font,
            }}>View Dashboard</button>
          )}
          {healthFiles.length > 0 && (
            <button onClick={() => navigate("/health-lab")} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: T.accentDim, border: `1px solid ${T.accentMid}`,
              color: T.accent, cursor: "pointer", fontFamily: font,
            }}>View Health Lab</button>
          )}
          <button onClick={reset} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.textSoft, cursor: "pointer", fontFamily: font,
          }}>Upload More</button>
        </div>
      </div>
    );
  }

  // ── Processing state ──
  if (processing && queue.length > 0) {
    return (
      <div style={{ padding: compact ? "16px" : "24px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <Loader size={24} color={T.accent} style={{ animation: "spin 1.5s linear infinite", marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
            Processing files ({Math.min(currentIndex + 1, queue.length)}/{queue.length})
          </div>
          <div style={{ fontSize: 11, color: T.textSoft, marginTop: 2 }}>
            AI is classifying and extracting your data
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", height: 4, background: T.surface, borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ width: `${((currentIndex + 1) / queue.length) * 100}%`, height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        {/* Per-file status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {queue.map((item, idx) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
              borderRadius: 6, fontSize: 11,
              background: item.status === "processing" ? `${T.accent}08` : "transparent",
            }}>
              {item.status === "done" ? <Check size={11} color={T.accent} /> :
               item.status === "error" ? <AlertCircle size={11} color="#ef4444" /> :
               item.status === "processing" ? <Loader size={11} color={T.accent} style={{ animation: "spin 1.5s linear infinite" }} /> :
               <Clock size={11} color={T.textDim} />}
              <span style={{ color: item.status === "processing" ? T.text : T.textSoft, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <TypeBadge type={item.type} />
            </div>
          ))}
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Default: drop zone ──
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onClick={() => fileRef.current?.click()}
        style={{
          padding: compact ? "24px" : "36px 24px",
          background: dragging ? "rgba(16,185,129,0.06)" : T.card,
          border: `2px dashed ${dragging ? T.accent : T.border}`,
          borderRadius: 14,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          minHeight: 120,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={(e) => { if (e.target.files.length > 0) processFiles(e.target.files); }}
          style={{ display: "none" }}
        />
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          {dragging ? <FileText size={22} color={T.accent} /> : <Upload size={22} color={T.accent} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
          {dragging ? "Drop your files here" : "Drop Any File"}
        </div>
        <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 8, lineHeight: 1.5 }}>
          Blood labs, body scans, .FIT workouts, ZIPs, CSVs — we detect the type automatically
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {[
            { label: ".FIT", color: T.blue },
            { label: "PDF", color: "#ef4444" },
            { label: "ZIP", color: T.blue },
            { label: "CSV", color: T.purple },
            { label: "JPG/PNG", color: T.amber },
          ].map(t => (
            <span key={t.label} style={{
              fontSize: 9, fontWeight: 600, fontFamily: mono,
              padding: "2px 6px", borderRadius: 4,
              background: `${t.color}12`, color: t.color,
            }}>{t.label}</span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: T.textDim }}>
          Up to {MAX_FILES} files at once · {MAX_SIZE_MB}MB per file ({MAX_ZIP_SIZE_MB}MB for ZIPs)
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444",
          display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
