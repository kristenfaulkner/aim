import { useState, useRef } from "react";
import { T, font, mono } from "../theme/tokens";
import { btn } from "../theme/styles";
import {
  Upload, FileArchive, FileText, Check, AlertCircle,
  Loader, ExternalLink, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { integrations } from "../data/integrations";
import { supabase } from "../lib/supabase";

const MAX_ZIP_MB = 500;
const MAX_CSV_MB = 10;

export default function TrainingPeaksImport({ onClose, onComplete }) {
  const [step, setStep] = useState("instructions"); // instructions | uploading | processing | complete
  const [zipFile, setZipFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [metricsCsvFile, setMetricsCsvFile] = useState(null);
  const [draggingZip, setDraggingZip] = useState(false);
  const [draggingCsv, setDraggingCsv] = useState(false);
  const [draggingMetrics, setDraggingMetrics] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const zipRef = useRef(null);
  const csvRef = useRef(null);
  const metricsRef = useRef(null);

  const tpApp = integrations.find(a => a.name === "TrainingPeaks");

  const validateZip = (file) => {
    if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip" && file.type !== "application/x-zip-compressed") {
      setError("Please upload a .ZIP file");
      return false;
    }
    if (file.size > MAX_ZIP_MB * 1024 * 1024) {
      setError(`ZIP file must be under ${MAX_ZIP_MB}MB`);
      return false;
    }
    return true;
  };

  const validateCsv = (file) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .CSV file");
      return false;
    }
    if (file.size > MAX_CSV_MB * 1024 * 1024) {
      setError(`CSV file must be under ${MAX_CSV_MB}MB`);
      return false;
    }
    return true;
  };

  const handleImport = async () => {
    if (!zipFile && !csvFile && !metricsCsvFile) { setError("Please select at least one file"); return; }
    setError(null);
    setStep("uploading");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please sign in again");

      // 1. Upload ZIP to Supabase Storage (if provided)
      let storagePath = null;
      if (zipFile) {
        setProgress(`Uploading ZIP file (${(zipFile.size / 1024 / 1024).toFixed(1)} MB)...`);
        storagePath = `${session.user.id}/imports/${Date.now()}-trainingpeaks.zip`;
        const { error: uploadErr } = await supabase.storage
          .from("import-files")
          .upload(storagePath, zipFile, { contentType: "application/zip" });

        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
      }

      // 2. Prepare CSVs as base64 if provided
      const readAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let csvData = null;
      let metricsCsvData = null;
      if (csvFile || metricsCsvFile) {
        setProgress("Processing CSV files...");
        if (csvFile) csvData = await readAsBase64(csvFile);
        if (metricsCsvFile) metricsCsvData = await readAsBase64(metricsCsvFile);
      }

      // 3. Call processing endpoint
      setStep("processing");
      setProgress(zipFile ? "Processing FIT files — computing metrics and checking for duplicates..." : "Processing CSV data...");

      const res = await fetch("/api/integrations/import/trainingpeaks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ zipPath: storagePath, csvData, metricsCsvData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setResult(data);
      setStep("complete");
      if (onComplete) onComplete(data);
    } catch (err) {
      setError(err.message);
      setStep("instructions");
    }
  };

  // ── Complete state ──
  if (step === "complete" && result) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,229,160,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={28} color={T.accent} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Import Complete</div>
          <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 24 }}>Your TrainingPeaks data has been imported into AIM.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <StatCard label="Imported" value={result.imported} color={T.accent} />
            <StatCard label="Merged with Strava" value={result.merged} color={T.blue} />
            <StatCard label="Already imported" value={result.skipped} color={T.textDim} />
            <StatCard label="Failed" value={result.failed} color={result.failed > 0 ? T.danger : T.textDim} />
          </div>

          {result.failed > 0 && result.errors?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setShowErrors(!showErrors)} style={{
                background: "none", border: "none", color: T.textSoft, fontSize: 12, cursor: "pointer",
                fontFamily: font, display: "flex", alignItems: "center", gap: 4, margin: "0 auto",
              }}>
                {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showErrors ? "Hide errors" : `Show ${result.errors.length} errors`}
              </button>
              {showErrors && (
                <div style={{ marginTop: 8, maxHeight: 150, overflow: "auto", textAlign: "left",
                  background: T.surface, borderRadius: 10, padding: 12, fontSize: 11, color: T.textDim,
                  fontFamily: mono, lineHeight: 1.8 }}>
                  {result.errors.map((e, i) => (
                    <div key={i}>{e.file}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={onClose} style={{ ...btn(true), padding: "12px 32px", fontSize: 14 }}>
            Done
          </button>
        </div>
      </Overlay>
    );
  }

  // ── Processing state ──
  if (step === "processing" || step === "uploading") {
    return (
      <Overlay>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ marginBottom: 20 }}>
            <Loader size={32} color={T.accent} style={{ animation: "spin 1.5s linear infinite" }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            {step === "uploading" ? "Uploading..." : "Processing FIT Files..."}
          </div>
          <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6 }}>
            {progress}
          </div>
          {step === "processing" && (
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 12 }}>
              This may take a few minutes for large exports.
            </div>
          )}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </Overlay>
    );
  }

  // ── Instructions state (default) ──
  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {tpApp && <img src={tpApp.logo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Import from TrainingPeaks</div>
            <div style={{ fontSize: 12, color: T.textDim }}>Import your workout files and training history</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4 }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.7, marginBottom: 20 }}>
        TrainingPeaks doesn't offer a direct API integration, but you can import all your workout data in just a few minutes.
      </div>

      {/* Step 1: Export instructions */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <StepBadge n={1} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Export your workout files</span>
        </div>
        <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, fontSize: 12, color: T.textSoft, lineHeight: 1.8 }}>
          <div>1. Log in to your TrainingPeaks account at{" "}
            <a href="https://app.trainingpeaks.com" target="_blank" rel="noopener noreferrer"
              style={{ color: T.accent, textDecoration: "none" }}>
              trainingpeaks.com <ExternalLink size={10} style={{ verticalAlign: "middle" }} />
            </a>
          </div>
          <div>2. Go to <strong style={{ color: T.text }}>Settings</strong></div>
          <div>3. Select <strong style={{ color: T.text }}>Export Data</strong> from the menu</div>
          <div>4. Under Workout Files, choose your date range (e.g., one year)</div>
          <div>5. Click <strong style={{ color: T.text }}>Export</strong> to download a ZIP folder with your .FIT files</div>
        </div>
      </div>

      {/* Step 2: Optional CSVs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <StepBadge n={2} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Export CSV data</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(139,92,246,0.1)", color: T.purple, fontWeight: 600 }}>OPTIONAL</span>
        </div>
        <div style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, fontSize: 12, color: T.textSoft, lineHeight: 1.8 }}>
          Under the same Export Data page, you can also export two CSV files:
          <div style={{ marginTop: 6 }}><strong style={{ color: T.text }}>Workouts CSV</strong> — adds workout titles, RPE scores, coach comments, and body weight to your imported activities.</div>
          <div style={{ marginTop: 4 }}><strong style={{ color: T.text }}>Metrics CSV</strong> — imports daily metrics like resting heart rate, hours of sleep, fatigue, and stress levels.</div>
        </div>
      </div>

      {/* Step 3: Upload */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <StepBadge n={3} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Upload your files</span>
        </div>

        {/* ZIP drop zone */}
        <DropZone
          dragging={draggingZip}
          file={zipFile}
          onDragOver={e => { e.preventDefault(); setDraggingZip(true); }}
          onDragLeave={e => { e.preventDefault(); setDraggingZip(false); }}
          onDrop={e => {
            e.preventDefault();
            setDraggingZip(false);
            const f = e.dataTransfer.files[0];
            if (f && validateZip(f)) { setZipFile(f); setError(null); }
          }}
          onClick={() => zipRef.current?.click()}
          icon={<FileArchive size={20} color={T.accent} />}
          label="Workout Files (.ZIP)"
          hint="Drag & drop or click to browse"
          fileLabel={zipFile ? `${zipFile.name} (${(zipFile.size / 1024 / 1024).toFixed(1)} MB)` : null}
          required
        />
        <input ref={zipRef} type="file" accept=".zip" style={{ display: "none" }}
          onChange={e => { const f = e.target.files[0]; if (f && validateZip(f)) { setZipFile(f); setError(null); } }} />

        {/* Workouts CSV drop zone */}
        <div style={{ marginTop: 10 }}>
          <DropZone
            dragging={draggingCsv}
            file={csvFile}
            onDragOver={e => { e.preventDefault(); setDraggingCsv(true); }}
            onDragLeave={e => { e.preventDefault(); setDraggingCsv(false); }}
            onDrop={e => {
              e.preventDefault();
              setDraggingCsv(false);
              const f = e.dataTransfer.files[0];
              if (f && validateCsv(f)) { setCsvFile(f); setError(null); }
            }}
            onClick={() => csvRef.current?.click()}
            icon={<FileText size={20} color={T.purple} />}
            label="Workouts CSV"
            hint="Optional — adds titles, RPE, and comments"
            fileLabel={csvFile ? `${csvFile.name} (${(csvFile.size / 1024).toFixed(0)} KB)` : null}
            optional
            accent={T.purple}
          />
          <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { const f = e.target.files[0]; if (f && validateCsv(f)) { setCsvFile(f); setError(null); } }} />
        </div>

        {/* Metrics CSV drop zone */}
        <div style={{ marginTop: 10 }}>
          <DropZone
            dragging={draggingMetrics}
            file={metricsCsvFile}
            onDragOver={e => { e.preventDefault(); setDraggingMetrics(true); }}
            onDragLeave={e => { e.preventDefault(); setDraggingMetrics(false); }}
            onDrop={e => {
              e.preventDefault();
              setDraggingMetrics(false);
              const f = e.dataTransfer.files[0];
              if (f && validateCsv(f)) { setMetricsCsvFile(f); setError(null); }
            }}
            onClick={() => metricsRef.current?.click()}
            icon={<FileText size={20} color={T.blue} />}
            label="Metrics CSV"
            hint="Optional — imports daily RHR, sleep, fatigue, stress"
            fileLabel={metricsCsvFile ? `${metricsCsvFile.name} (${(metricsCsvFile.size / 1024).toFixed(0)} KB)` : null}
            optional
            accent={T.blue}
          />
          <input ref={metricsRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { const f = e.target.files[0]; if (f && validateCsv(f)) { setMetricsCsvFile(f); setError(null); } }} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444",
          display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Info */}
      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, marginBottom: 20 }}>
        If you also have Strava connected, AIM will automatically detect duplicate activities and merge TrainingPeaks metadata (RPE, coach comments) into your existing Strava data — no duplicates.
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ ...btn(false), flex: 1, padding: "12px 20px", fontSize: 13 }}>
          Cancel
        </button>
        <button onClick={handleImport} disabled={!zipFile && !csvFile && !metricsCsvFile}
          style={{ ...btn(!!(zipFile || csvFile || metricsCsvFile)), flex: 1, padding: "12px 20px", fontSize: 13, opacity: (zipFile || csvFile || metricsCsvFile) ? 1 : 0.5 }}>
          Import Data
        </button>
      </div>
    </Overlay>
  );
}

// ── Sub-components ──

function Overlay({ children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(5,6,10,0.8)", backdropFilter: "blur(8px)",
    }}
    onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: "28px", maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}

function StepBadge({ n }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%",
      background: T.accentDim, border: `1px solid ${T.accentMid}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 800, color: T.accent, fontFamily: mono,
    }}>
      {n}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: "14px", background: T.surface, borderRadius: 10,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: mono, color }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function DropZone({ dragging, file, onDragOver, onDragLeave, onDrop, onClick, icon, label, hint, fileLabel, required, optional, accent }) {
  const borderColor = dragging
    ? (accent || T.accent)
    : file ? (accent || T.accent) : T.border;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      style={{
        padding: "16px 20px",
        background: dragging ? "rgba(0,229,160,0.04)" : file ? "rgba(0,229,160,0.03)" : T.surface,
        border: `1.5px dashed ${borderColor}`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex", alignItems: "center", gap: 14,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: file ? "rgba(0,229,160,0.1)" : T.card,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {file ? <Check size={18} color={accent || T.accent} /> : icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
          {label}
          {required && !file && <span style={{ fontSize: 9, color: T.danger }}>REQUIRED</span>}
          {optional && !file && <span style={{ fontSize: 9, color: T.textDim }}>OPTIONAL</span>}
        </div>
        <div style={{
          fontSize: 11, color: file ? (accent || T.accent) : T.textDim,
          fontFamily: file ? mono : font,
          fontWeight: file ? 600 : 400,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {fileLabel || hint}
        </div>
      </div>
      {file && (
        <button onClick={e => { e.stopPropagation(); onClick && onClick(); }} style={{
          background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4,
          fontSize: 11, fontFamily: font,
        }}>
          Change
        </button>
      )}
    </div>
  );
}
