import { useState, useRef } from "react";
import { T, font, mono } from "../theme/tokens";
import { Upload, FileText, Check, AlertCircle, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

export default function BloodPanelUpload({ onUploadComplete, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, fileName }
  const [results, setResults] = useState([]); // array of { fileName, extractedCount, otherCount, error }
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const processFile = async (file, session) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { fileName: file.name, error: "Unsupported file type" };
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return { fileName: file.name, error: `File exceeds ${MAX_SIZE_MB}MB limit` };
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/health/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fileBase64: base64,
        mediaType: file.type,
        fileName: file.name,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.duplicate) {
        return { fileName: file.name, duplicate: true, testDate: data.existing_test_date };
      }
      return { fileName: file.name, error: data.error || "Upload failed" };
    }

    return { fileName: file.name, extractedCount: data.extractedCount, otherCount: data.otherCount };
  };

  const processFiles = async (files) => {
    const fileList = Array.from(files).filter(f => f && f.size > 0);
    if (fileList.length === 0) return;

    setUploading(true);
    setError(null);
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please sign in again");

      const allResults = [];

      for (let i = 0; i < fileList.length; i++) {
        setProgress({ current: i + 1, total: fileList.length, fileName: fileList[i].name });

        try {
          const result = await processFile(fileList[i], session);
          allResults.push(result);
        } catch (err) {
          allResults.push({ fileName: fileList[i].name, error: err.message });
        }
      }

      setResults(allResults);
      setProgress(null);

      const successful = allResults.filter(r => !r.error);
      if (successful.length > 0 && onUploadComplete) {
        onUploadComplete(successful.length === 1 ? successful[0] : { count: successful.length });
      }
    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) processFiles(e.target.files);
  };

  const reset = () => {
    setResults([]);
    setError(null);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Success state
  if (results.length > 0 && !uploading) {
    const successful = results.filter(r => !r.error && !r.duplicate);
    const duplicates = results.filter(r => r.duplicate);
    const failed = results.filter(r => r.error && !r.duplicate);
    const totalExtracted = successful.reduce((sum, r) => sum + (r.extractedCount || 0), 0);

    return (
      <div style={{ padding: compact ? "16px" : "24px", background: "rgba(0,229,160,0.04)", border: `1px solid rgba(0,229,160,0.2)`, borderRadius: 14, textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,229,160,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <Check size={20} color={T.accent} />
        </div>
        {successful.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 4 }}>
              {successful.length} Blood Panel{successful.length !== 1 ? "s" : ""} Uploaded
            </div>
            <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 4 }}>
              Extracted <span style={{ fontFamily: mono, fontWeight: 700, color: T.text }}>{totalExtracted}</span> biomarker{totalExtracted !== 1 ? "s" : ""} total
            </div>
          </>
        )}
        {duplicates.length > 0 && (
          <div style={{ fontSize: 12, color: T.textDim, marginBottom: 4 }}>
            {duplicates.length} duplicate{duplicates.length !== 1 ? "s" : ""} skipped (already uploaded): {duplicates.map(d => d.fileName).join(", ")}
          </div>
        )}
        {failed.length > 0 && (
          <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>
            {failed.length} file{failed.length !== 1 ? "s" : ""} failed: {failed.map(f => f.fileName).join(", ")}
          </div>
        )}
        {successful.length > 0 && (
          <div style={{ fontSize: 11, color: T.textDim, marginBottom: 14 }}>
            AI analysis is generating in the background...
          </div>
        )}
        {successful.length === 0 && (
          <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 14 }}>
            No new panels to process
          </div>
        )}
        <button onClick={reset} style={{
          padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: T.accentDim, border: `1px solid ${T.accentMid}`,
          color: T.accent, cursor: "pointer", fontFamily: font,
        }}>
          Upload More
        </button>
      </div>
    );
  }

  // Uploading state
  if (uploading) {
    return (
      <div style={{ padding: compact ? "24px" : "40px", background: T.card, border: `1px solid ${T.accentMid}`, borderRadius: 14, textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <Loader size={28} color={T.accent} style={{ animation: "spin 1.5s linear infinite" }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
          {progress && progress.total > 1
            ? `Extracting biomarkers (${progress.current}/${progress.total})...`
            : "Extracting biomarkers..."}
        </div>
        <div style={{ fontSize: 12, color: T.textSoft, marginBottom: progress?.total > 1 ? 8 : 0 }}>
          {progress?.fileName || "AI is reading your lab report. This may take 10-20 seconds."}
        </div>
        {progress && progress.total > 1 && (
          <div style={{ width: "100%", maxWidth: 240, height: 4, background: T.surface, borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
            <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Default: drop zone
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        style={{
          padding: compact ? "24px" : "36px 24px",
          background: dragging ? "rgba(0,229,160,0.06)" : T.card,
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
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          {dragging ? <FileText size={22} color={T.accent} /> : <Upload size={22} color={T.accent} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
          {dragging ? "Drop your lab reports here" : "Upload Blood Panels"}
        </div>
        <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 8 }}>
          Drag & drop or click to browse — multiple files supported
        </div>
        <div style={{ fontSize: 11, color: T.textDim }}>
          PDF, JPG, or PNG up to {MAX_SIZE_MB}MB each
        </div>
        <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>
          Files cannot be password-protected
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
