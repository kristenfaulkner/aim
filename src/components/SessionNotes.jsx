import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { RefreshCw, Check, X, Star, Pencil } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { inputStyle } from "../theme/styles";
import { supabase } from "../lib/supabase";

const RPE_LABELS = {
  1: "Very Easy", 2: "Easy", 3: "Moderate", 4: "Somewhat Hard",
  5: "Hard", 6: "Harder", 7: "Very Hard", 8: "Very Very Hard",
  9: "Extremely Hard", 10: "Maximal",
};

const GI_LABELS = { 1: "Perfect", 2: "Minor", 3: "Noticeable", 4: "Significant", 5: "Severe" };
const FOCUS_LABELS = { 1: "Zoned out", 2: "Distracted", 3: "Normal", 4: "Focused", 5: "In the zone" };
const RECOVERY_PRE_LABELS = { 1: "Wrecked", 2: "Heavy legs", 3: "Normal", 4: "Feeling good", 5: "Fully fresh" };

const TAG_SUGGESTIONS = [
  "interval", "race", "recovery", "group ride", "solo",
  "indoor", "outdoor", "tempo", "endurance", "time trial",
  "hill repeats", "low cadence", "high cadence", "sweet spot", "vo2max",
  "sprint", "threshold", "test", "openers",
];

// Client-side alias map — mirrors api/activities/annotate.js TAG_ALIASES.
// Maps lowercase variant → canonical stored tag so chips render correctly
// before the server round-trip.
const TAG_ALIASES = {
  // Low cadence (S&E)
  "s&e": "low cadence",
  "se": "low cadence",
  "strength and endurance": "low cadence",
  "strength & endurance": "low cadence",
  "force reps": "low cadence",
  "force rep": "low cadence",
  "big gear": "low cadence",
  "big gear reps": "low cadence",
  "heavy gear": "low cadence",
  "muscular endurance": "low cadence",
  "low-cadence": "low cadence",
  // High cadence
  "spinups": "high cadence",
  "spin ups": "high cadence",
  "spin-ups": "high cadence",
  "spin up": "high cadence",
  "leg speed": "high cadence",
  "cadence drills": "high cadence",
  "cadence drill": "high cadence",
  "spin drill": "high cadence",
  "high-cadence": "high cadence",
  // VO2max
  "vo2 max": "vo2max",
  "v02max": "vo2max",
  "vo2": "vo2max",
  "map": "vo2max",
  "aerobic power": "vo2max",
  // Sweet spot
  "sweetspot": "sweet spot",
  "ss": "sweet spot",
  "sst": "sweet spot",
  // Threshold
  "ftp": "threshold",
  "lactate threshold": "threshold",
  "lt": "threshold",
  "at": "threshold",
  "ltp": "threshold",
  "mlss": "threshold",
  // Time trial
  "tt": "time trial",
  "tt bike": "time trial",
  "time trial bike": "time trial",
  "timetrial": "time trial",
  "time-trial": "time trial",
  "chrono": "time trial",
  "clm": "time trial",
  "contre la montre": "time trial",
  // Race
  "crit": "race",
  "criterium": "race",
  "criterion": "race",
  "crits": "race",
  "road race": "race",
  "rr": "race",
  "gran fondo": "race",
  "sportive": "race",
  "circuit race": "race",
  // Indoor
  "zwift": "indoor",
  "trainer": "indoor",
  "turbo": "indoor",
  "turbo trainer": "indoor",
  "rouvy": "indoor",
  "rollers": "indoor",
  "smart trainer": "indoor",
  "kickr": "indoor",
  "tacx": "indoor",
  // Group ride
  "group": "group ride",
  "chain gang": "group ride",
  "chaingang": "group ride",
  "club ride": "group ride",
  "team ride": "group ride",
  "shop ride": "group ride",
  "hammerfest": "group ride",
  // Recovery
  "active recovery": "recovery",
  "active rest": "recovery",
  "flush": "recovery",
  "flush ride": "recovery",
  "ez": "recovery",
  "easy ride": "recovery",
  // Endurance
  "lsd": "endurance",
  "base": "endurance",
  "base miles": "endurance",
  "aerobic base": "endurance",
  "long ride": "endurance",
  "zone 2": "endurance",
  "z2": "endurance",
  // Hill repeats
  "hills": "hill repeats",
  "climbs": "hill repeats",
  "power climbs": "hill repeats",
  "ramps": "hill repeats",
  // Sprint
  "jumps": "sprint",
  "snap": "sprint",
  "accelerations": "sprint",
  "accels": "sprint",
  "max sprint": "sprint",
  // Test
  "ftp test": "test",
  "ramp test": "test",
  "power test": "test",
  "20 min test": "test",
  "8 min test": "test",
  // Openers
  "opener": "openers",
  "activation": "openers",
  "activation ride": "openers",
  "priming": "openers",
  "pre-race": "openers",
  "pre race": "openers",
};

function normalizeTag(tag) {
  const lower = tag.trim().toLowerCase();
  return TAG_ALIASES[lower] ?? lower;
}

function rpeColor(val) {
  if (val <= 3) return T.green;
  if (val <= 5) return T.warn;
  if (val <= 7) return T.orange;
  return T.danger;
}

/**
 * SessionNotes — editable notes, star rating, RPE, and tags for an activity.
 * Uses key={activityId} at the call site to reset state when activity changes.
 *
 * Two modes:
 *   - View mode: displays saved data with an "Edit" button
 *   - Edit mode: full form with a "Save" button
 *
 * Starts in edit mode if no data has been saved yet (all fields empty).
 *
 * Props:
 *   activityId  — UUID of the activity
 *   initialNotes, initialRating, initialRpe, initialTags — seed values
 *   onSaved     — optional callback(updatedFields) after each successful save
 */
export default function SessionNotes({
  activityId,
  initialNotes = "",
  initialRating = 0,
  initialRpe = 0,
  initialTags = [],
  initialGiComfort = 0,
  initialMentalFocus = 0,
  initialPerceivedRecoveryPre = 0,
  onSaved,
  onClose,
}) {
  const hasData = !!(initialNotes || initialRating || initialRpe || (initialTags && initialTags.length) || initialGiComfort || initialMentalFocus || initialPerceivedRecoveryPre);
  const [editing, setEditing] = useState(!hasData);
  const [notes, setNotes] = useState(initialNotes);
  const [rating, setRating] = useState(initialRating);
  const [rpe, setRpe] = useState(initialRpe);
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [hoverStar, setHoverStar] = useState(0);
  const [giComfort, setGiComfort] = useState(initialGiComfort);
  const [mentalFocus, setMentalFocus] = useState(initialMentalFocus);
  const [perceivedRecoveryPre, setPerceivedRecoveryPre] = useState(initialPerceivedRecoveryPre);

  // Saved snapshot — what's currently persisted. Used to display in view mode and to revert on cancel.
  const [saved, setSaved] = useState({
    notes: initialNotes, rating: initialRating, rpe: initialRpe, tags: initialTags,
    giComfort: initialGiComfort, mentalFocus: initialMentalFocus, perceivedRecoveryPre: initialPerceivedRecoveryPre,
  });

  const save = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const payload = {
        user_notes: notes,
        user_rating: rating || null,
        user_rpe: rpe || null,
        user_tags: tags,
        gi_comfort: giComfort || null,
        mental_focus: mentalFocus || null,
        perceived_recovery_pre: perceivedRecoveryPre || null,
      };
      const res = await fetch(`/api/activities/annotate?id=${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSaveStatus("saved");
        const snap = { notes, rating, rpe, tags, giComfort, mentalFocus, perceivedRecoveryPre };
        setSaved(snap);
        setEditing(false);
        setTimeout(() => setSaveStatus(null), 2000);
        onSaved?.(updated);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [activityId, notes, rating, rpe, tags, giComfort, mentalFocus, perceivedRecoveryPre, onSaved]);

  const handleEdit = () => setEditing(true);

  const handleCancel = () => {
    // Revert to last saved state
    setNotes(saved.notes);
    setRating(saved.rating);
    setRpe(saved.rpe);
    setTags(saved.tags);
    setGiComfort(saved.giComfort);
    setMentalFocus(saved.mentalFocus);
    setPerceivedRecoveryPre(saved.perceivedRecoveryPre);
    setTagInput("");
    setEditing(false);
  };

  const handleRating = (val) => {
    setRating(val === rating ? 0 : val);
  };

  const addTag = (tag) => {
    const trimmed = normalizeTag(tag);
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    } else {
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const availableSuggestions = useMemo(
    () => TAG_SUGGESTIONS.filter((s) => !tags.includes(s)),
    [tags]
  );

  const savedHasData = !!(saved.notes || saved.rating || saved.rpe || (saved.tags && saved.tags.length) || saved.giComfort || saved.mentalFocus || saved.perceivedRecoveryPre);

  // ─── VIEW MODE ───
  if (!editing) {
    return (
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: 20, display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Session Notes</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saveStatus === "saved" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.green }}>
                <Check size={10} /> Saved
              </div>
            )}
            <button
              onClick={handleEdit}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSoft; }}
            >
              <Pencil size={12} /> Edit
            </button>
            {onClose && (
              <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: T.textDim }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; }}
                aria-label="Close session notes"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {!savedHasData && (
          <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic" }}>No notes yet. Click Edit to add your thoughts on this session.</div>
        )}

        {/* Notes */}
        {saved.notes && (
          <div>
            <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{saved.notes}</div>
          </div>
        )}

        {/* Rating + RPE inline */}
        {(saved.rating > 0 || saved.rpe > 0) && (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {saved.rating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", marginRight: 4 }}>Rating</span>
                {[1, 2, 3, 4, 5].map((val) => (
                  <Star key={val} size={16} fill={saved.rating >= val ? "#f59e0b" : "transparent"} color={saved.rating >= val ? "#f59e0b" : T.textDim} strokeWidth={1.5} />
                ))}
              </div>
            )}
            {saved.rpe > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>RPE</span>
                <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: rpeColor(saved.rpe) }}>{saved.rpe}/10</span>
                <span style={{ fontSize: 12, color: T.textSoft }}>{RPE_LABELS[saved.rpe]}</span>
              </div>
            )}
          </div>
        )}

        {/* Perception metrics inline */}
        {(saved.perceivedRecoveryPre > 0 || saved.giComfort > 0 || saved.mentalFocus > 0) && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {saved.perceivedRecoveryPre > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Recovery</span>
                <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: saved.perceivedRecoveryPre >= 4 ? T.green : saved.perceivedRecoveryPre >= 3 ? T.warn : T.danger }}>{saved.perceivedRecoveryPre}/5</span>
                <span style={{ fontSize: 12, color: T.textSoft }}>{RECOVERY_PRE_LABELS[saved.perceivedRecoveryPre]}</span>
              </div>
            )}
            {saved.giComfort > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>GI</span>
                <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: saved.giComfort <= 2 ? T.green : saved.giComfort <= 3 ? T.warn : T.danger }}>{saved.giComfort}/5</span>
                <span style={{ fontSize: 12, color: T.textSoft }}>{GI_LABELS[saved.giComfort]}</span>
              </div>
            )}
            {saved.mentalFocus > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase" }}>Focus</span>
                <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 700, color: saved.mentalFocus >= 4 ? T.green : saved.mentalFocus >= 3 ? T.warn : T.danger }}>{saved.mentalFocus}/5</span>
                <span style={{ fontSize: 12, color: T.textSoft }}>{FOCUS_LABELS[saved.mentalFocus]}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {saved.tags && saved.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {saved.tags.map((tag) => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: T.accentDim, border: `1px solid ${T.accentMid}`, borderRadius: 20, fontSize: 12, color: T.accent, fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── EDIT MODE ───
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: 20, display: "flex", flexDirection: "column", gap: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Session Notes</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saveStatus === "saving" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.textDim }}>
              <RefreshCw size={10} style={{ animation: "snotes-spin 1s linear infinite" }} /> Saving...
            </div>
          )}
          {saveStatus === "error" && (
            <div style={{ fontSize: 11, color: T.danger }}>Save failed</div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: T.textDim }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; }}
              aria-label="Close session notes"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Notes textarea */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Notes
          <span style={{ fontSize: 10, color: T.textDim, fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>
            — included in AI analysis · tags auto-extracted
          </span>
        </div>
        <textarea
          className="snotes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={"How did this session feel? Intervals, cadence drills, conditions, nutrition...\n\nTip: specifics like \"8×1min VO2max, 60rpm low-cadence blocks\" get auto-tagged."}
          maxLength={5000}
          rows={4}
          style={{
            ...inputStyle,
            padding: "12px 14px",
            resize: "vertical",
            minHeight: 90,
            lineHeight: 1.6,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Star rating */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Session Rating
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleRating(val)}
              onMouseEnter={() => setHoverStar(val)}
              onMouseLeave={() => setHoverStar(0)}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, transition: "transform 0.15s", transform: hoverStar === val ? "scale(1.2)" : "scale(1)" }}
            >
              <Star
                size={22}
                fill={(hoverStar || rating) >= val ? "#f59e0b" : "transparent"}
                color={(hoverStar || rating) >= val ? "#f59e0b" : T.textDim}
                strokeWidth={1.5}
              />
            </button>
          ))}
          {rating > 0 && (
            <span style={{ fontSize: 12, color: T.textSoft, marginLeft: 6 }}>{rating}/5</span>
          )}
        </div>
      </div>

      {/* RPE slider */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>RPE</span>
          {rpe > 0 && (
            <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, color: rpeColor(rpe) }}>
              {rpe}/10 — {RPE_LABELS[rpe]}
            </span>
          )}
        </div>
        <input
          type="range" min={0} max={10} step={1} value={rpe}
          onChange={(e) => setRpe(parseInt(e.target.value, 10))}
          style={{
            width: "100%", height: 6, WebkitAppearance: "none", appearance: "none",
            background: rpe > 0
              ? `linear-gradient(90deg, ${T.green} 0%, ${T.warn} 50%, ${T.danger} 100%)`
              : T.surface,
            borderRadius: 3, outline: "none", cursor: "pointer", accentColor: T.accent,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
            <span key={val} style={{ fontSize: 9, color: rpe === val ? rpeColor(val) : T.textDim, fontFamily: mono, fontWeight: rpe === val ? 700 : 400 }}>{val}</span>
          ))}
        </div>
      </div>

      {/* Pre-Ride Recovery */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pre-Ride Recovery</span>
          {perceivedRecoveryPre > 0 && (
            <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, color: perceivedRecoveryPre >= 4 ? T.green : perceivedRecoveryPre >= 3 ? T.warn : T.danger }}>
              {perceivedRecoveryPre}/5 — {RECOVERY_PRE_LABELS[perceivedRecoveryPre]}
            </span>
          )}
        </div>
        <input
          type="range" min={0} max={5} step={1} value={perceivedRecoveryPre}
          onChange={(e) => setPerceivedRecoveryPre(parseInt(e.target.value, 10))}
          style={{ width: "100%", height: 6, WebkitAppearance: "none", appearance: "none", background: perceivedRecoveryPre > 0 ? `linear-gradient(90deg, ${T.danger} 0%, ${T.warn} 50%, ${T.green} 100%)` : T.surface, borderRadius: 3, outline: "none", cursor: "pointer", accentColor: T.accent }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((val) => (
            <span key={val} style={{ fontSize: 9, color: perceivedRecoveryPre === val ? (val >= 4 ? T.green : val >= 3 ? T.warn : T.danger) : T.textDim, fontFamily: mono, fontWeight: perceivedRecoveryPre === val ? 700 : 400 }}>{val}</span>
          ))}
        </div>
      </div>

      {/* GI Comfort */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>GI Comfort</span>
          {giComfort > 0 && (
            <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, color: giComfort <= 2 ? T.green : giComfort <= 3 ? T.warn : T.danger }}>
              {giComfort}/5 — {GI_LABELS[giComfort]}
            </span>
          )}
        </div>
        <input
          type="range" min={0} max={5} step={1} value={giComfort}
          onChange={(e) => setGiComfort(parseInt(e.target.value, 10))}
          style={{ width: "100%", height: 6, WebkitAppearance: "none", appearance: "none", background: giComfort > 0 ? `linear-gradient(90deg, ${T.green} 0%, ${T.warn} 50%, ${T.danger} 100%)` : T.surface, borderRadius: 3, outline: "none", cursor: "pointer", accentColor: T.accent }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((val) => (
            <span key={val} style={{ fontSize: 9, color: giComfort === val ? (val <= 2 ? T.green : val <= 3 ? T.warn : T.danger) : T.textDim, fontFamily: mono, fontWeight: giComfort === val ? 700 : 400 }}>{val}</span>
          ))}
        </div>
      </div>

      {/* Mental Focus */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mental Focus</span>
          {mentalFocus > 0 && (
            <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, color: mentalFocus >= 4 ? T.green : mentalFocus >= 3 ? T.warn : T.danger }}>
              {mentalFocus}/5 — {FOCUS_LABELS[mentalFocus]}
            </span>
          )}
        </div>
        <input
          type="range" min={0} max={5} step={1} value={mentalFocus}
          onChange={(e) => setMentalFocus(parseInt(e.target.value, 10))}
          style={{ width: "100%", height: 6, WebkitAppearance: "none", appearance: "none", background: mentalFocus > 0 ? `linear-gradient(90deg, ${T.danger} 0%, ${T.warn} 50%, ${T.green} 100%)` : T.surface, borderRadius: 3, outline: "none", cursor: "pointer", accentColor: T.accent }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((val) => (
            <span key={val} style={{ fontSize: 9, color: mentalFocus === val ? (val >= 4 ? T.green : val >= 3 ? T.warn : T.danger) : T.textDim, fontFamily: mono, fontWeight: mentalFocus === val ? 700 : 400 }}>{val}</span>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Tags
        </div>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {tags.map((tag) => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: T.accentDim, border: `1px solid ${T.accentMid}`, borderRadius: 20, fontSize: 12, color: T.accent, fontWeight: 500 }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", color: T.accent, opacity: 0.6 }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text" value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="Type a tag and press Enter..."
          style={{ ...inputStyle, padding: "9px 13px", fontSize: 12, width: "100%", boxSizing: "border-box" }}
        />
        {availableSuggestions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {availableSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => addTag(s)}
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "3px 10px", fontSize: 11, color: T.textDim, cursor: "pointer", fontFamily: font }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accentMid; e.currentTarget.style.color = T.textSoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim; }}
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save / Cancel buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {savedHasData && (
          <button
            onClick={handleCancel}
            style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: T.textSoft, cursor: "pointer", fontFamily: font }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.textDim; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={save}
          disabled={saveStatus === "saving"}
          style={{
            background: T.accent, border: "none", borderRadius: 8, padding: "8px 24px",
            fontSize: 13, fontWeight: 700, color: T.white, cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
            fontFamily: font, opacity: saveStatus === "saving" ? 0.7 : 1,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {saveStatus === "saving" ? <><RefreshCw size={12} style={{ animation: "snotes-spin 1s linear infinite" }} /> Saving...</> : "Save"}
        </button>
      </div>

      <style>{`
        @keyframes snotes-spin { to { transform: rotate(360deg); } }
        .snotes-textarea::placeholder { color: #9ca3af; opacity: 1; }
      `}</style>
    </div>
  );
}
