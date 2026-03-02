import { useState, useRef } from "react";
import { T, font, mono } from "../theme/tokens";
import { Upload, FileText, Check, AlertCircle, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

export default function DexaScanUpload({ onUploadComplete, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const processFile = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Unsupported file type. Please upload a PDF, JPG, PNG, or WebP.");
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`File exceeds ${MAX_SIZE_MB}MB limit`);
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated — please sign in again");

    const res = await fetch("/api/health/dexa-upload", {
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

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error (${res.status}). Please try again.`);
    }
    if (!res.ok) throw new Error(data.error || "Upload failed");
    if (!data.scan) throw new Error("No scan data returned — please try again.");
    return data.scan;
  };

  const handleUpload = async (files) => {
    const file = Array.from(files).find(f => f && f.size > 0);
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const scan = await processFile(file);
      setResult(scan);
      if (onUploadComplete) onUploadComplete(scan);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Success state
  if (result && !uploading) {
    const metrics = [
      result.total_body_fat_pct != null && `${result.total_body_fat_pct}% body fat`,
      result.lean_mass_kg != null && `${result.lean_mass_kg} kg lean mass`,
      result.bone_mineral_density != null && `${result.bone_mineral_density} g/cm\u00B2 BMD`,
    ].filter(Boolean);

    return (
      <div style={{ padding: compact ? "16px" : "24px", background: "rgba(0,229,160,0.04)", border: `1px solid rgba(0,229,160,0.2)`, borderRadius: 14, textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,229,160,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <Check size={20} color={T.accent} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 4 }}>
          DEXA Scan Uploaded
        </div>
        {metrics.length > 0 && (
          <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 4 }}>
            Extracted: <span style={{ fontFamily: mono, fontWeight: 600, color: T.text }}>{metrics.join(" \u00B7 ")}</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 14 }}>
          AI analysis is generating in the background...
        </div>
        <button onClick={reset} style={{
          padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: T.accentDim, border: `1px solid ${T.accentMid}`,
          color: T.accent, cursor: "pointer", fontFamily: font,
        }}>
          Upload Another
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
          Extracting body composition data...
        </div>
        <div style={{ fontSize: 12, color: T.textSoft }}>
          AI is reading your DEXA scan. This may take 10-20 seconds.
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Default: drop zone
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
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
          onChange={(e) => { if (e.target.files.length > 0) handleUpload(e.target.files); }}
          style={{ display: "none" }}
        />
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          {dragging ? <FileText size={22} color={T.accent} /> : <Upload size={22} color={T.accent} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
          {dragging ? "Drop your DEXA scan here" : "Upload DEXA Scan"}
        </div>
        <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 8 }}>
          Drag & drop or click to browse
        </div>
        <div style={{ fontSize: 11, color: T.textDim }}>
          PDF, JPG, or PNG up to {MAX_SIZE_MB}MB
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
