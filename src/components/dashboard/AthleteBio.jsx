import { useState, useEffect, useRef } from "react";
import { T, font } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { Pencil, Sparkles } from "lucide-react";

/**
 * AthleteBio — auto-generated athlete profile description.
 * Auto-generates on mount if no bio exists, auto-saves the result.
 * States:
 *  - No bio: auto-generating (loading shimmer)
 *  - Has bio: shows text with regenerate/edit icons
 *  - Editing: inline textarea with Save/Cancel
 */
export default function AthleteBio({ profile, onUpdateProfile, isMobile }) {
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hasTriggered = useRef(false);

  const savedBio = profile?.athlete_bio;

  // Auto-generate on mount if no bio exists
  useEffect(() => {
    if (!savedBio && !hasTriggered.current && profile) {
      hasTriggered.current = true;
      generateAndSave();
    }
  }, [savedBio, profile]);

  async function generateAndSave() {
    setGenerating(true);
    setError(null);
    try {
      const data = await apiFetch("/profile/generate-bio", { method: "POST" });
      if (data.bio) {
        await onUpdateProfile({ athlete_bio: data.bio });
      }
    } catch {
      // Silent fail — bio is non-critical, user can regenerate manually
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await apiFetch("/profile/generate-bio", { method: "POST" });
      if (data.bio) {
        await onUpdateProfile({ athlete_bio: data.bio });
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
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
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
              onClick={handleRegenerate}
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

  // No bio yet — auto-generating (shimmer placeholder)
  if (generating) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your Athlete Profile</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 14, borderRadius: 6, background: T.surface, animation: "bio-shimmer 1.5s ease-in-out infinite" }} />
          <div style={{ height: 14, borderRadius: 6, background: T.surface, animation: "bio-shimmer 1.5s ease-in-out 0.2s infinite", width: "85%" }} />
          <div style={{ height: 14, borderRadius: 6, background: T.surface, animation: "bio-shimmer 1.5s ease-in-out 0.4s infinite", width: "60%" }} />
        </div>
        <style>{`@keyframes bio-shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      </div>
    );
  }

  // Fallback — no bio, not generating (shouldn't normally show)
  return null;
}
