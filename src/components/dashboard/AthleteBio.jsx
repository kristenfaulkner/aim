import { useState } from "react";
import { T, font } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { Pencil, Sparkles, Check, X } from "lucide-react";

/**
 * AthleteBio — auto-generated athlete profile description.
 * States:
 *  - No bio, idle: "Generate Profile" button
 *  - Generating: loading spinner
 *  - Generated (pending confirm): shows text with "Looks good!" / "Edit" buttons
 *  - Has bio: shows text with edit icon
 *  - Editing: inline textarea with Save/Cancel
 */
export default function AthleteBio({ profile, onUpdateProfile, isMobile }) {
  const [generating, setGenerating] = useState(false);
  const [pendingBio, setPendingBio] = useState(null); // bio awaiting confirmation
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const savedBio = profile?.athlete_bio;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await apiFetch("/profile/generate-bio", { method: "POST" });
      if (data.bio) {
        setPendingBio(data.bio);
      } else {
        setError(data.reason || "Could not generate bio");
      }
    } catch (err) {
      setError(err.message || "Failed to generate bio");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(text) {
    setSaving(true);
    setError(null);
    try {
      await onUpdateProfile({ athlete_bio: text });
      setPendingBio(null);
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Pending confirmation state (just generated)
  if (pendingBio) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your Athlete Profile</div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 14 }}>{pendingBio}</div>
        {error && <div style={{ fontSize: 11, color: T.danger, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleSave(pendingBio)}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: T.accent, color: T.white,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Check size={14} /> {saving ? "Saving..." : "Looks good!"}
          </button>
          <button
            onClick={() => { setEditing(true); setEditText(pendingBio); setPendingBio(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${T.border}`, background: "none",
              fontSize: 12, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font,
            }}
          >
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>
    );
  }

  // Editing state
  if (editing) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your Athlete Profile</div>
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${T.border}`, background: T.surface,
            fontSize: 13, color: T.text, fontFamily: font,
            lineHeight: 1.6, resize: "vertical", outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border}
        />
        {error && <div style={{ fontSize: 11, color: T.danger, marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => handleSave(editText)}
            disabled={saving || !editText.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: T.accent, color: T.white,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
              opacity: saving || !editText.trim() ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); setEditText(""); setError(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${T.border}`, background: "none",
              fontSize: 12, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Has saved bio — display it
  if (savedBio) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Athlete Profile</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              title="Regenerate"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 4,
                color: T.textDim, display: "flex", alignItems: "center",
                opacity: generating ? 0.5 : 1,
              }}
            >
              <Sparkles size={14} />
            </button>
            <button
              onClick={() => { setEditing(true); setEditText(savedBio); }}
              title="Edit"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 4,
                color: T.textDim, display: "flex", alignItems: "center",
              }}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{savedBio}</div>
      </div>
    );
  }

  // No bio yet — show generate button
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Your Athlete Profile</div>
      <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: 12 }}>
        Generate an AI-powered description of your training profile based on your activity history.
      </div>
      {error && <div style={{ fontSize: 11, color: T.danger, marginBottom: 8 }}>{error}</div>}
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 10, border: "none",
          background: generating ? T.surface : T.gradient, color: generating ? T.textSoft : T.white,
          fontSize: 12, fontWeight: 700, cursor: generating ? "default" : "pointer",
          fontFamily: font, transition: "all 0.2s",
        }}
      >
        <Sparkles size={14} />
        {generating ? "Generating..." : "Generate Profile"}
      </button>
    </div>
  );
}
