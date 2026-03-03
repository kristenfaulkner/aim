import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { RefreshCw, Check, X, Star } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { inputStyle } from "../theme/styles";
import { supabase } from "../lib/supabase";

const RPE_LABELS = {
  1: "Very Easy", 2: "Easy", 3: "Moderate", 4: "Somewhat Hard",
  5: "Hard", 6: "Harder", 7: "Very Hard", 8: "Very Very Hard",
  9: "Extremely Hard", 10: "Maximal",
};

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
  onSaved,
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [rating, setRating] = useState(initialRating);
  const [rpe, setRpe] = useState(initialRpe);
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved"
  const [hoverStar, setHoverStar] = useState(0);
  const debounceRef = useRef(null);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const save = useCallback(async (updates) => {
    setSaveStatus("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/activities/annotate?id=${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 2000);
        onSaved?.(updated);
      } else {
        setSaveStatus(null);
      }
    } catch {
      setSaveStatus(null);
    }
  }, [activityId, onSaved]);

  const debouncedSave = useCallback((updates) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(updates), 1200);
  }, [save]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    debouncedSave({ user_notes: val, user_rating: rating || null, user_rpe: rpe || null, user_tags: tags });
  };

  const handleRating = (val) => {
    const newRating = val === rating ? 0 : val;
    setRating(newRating);
    save({ user_notes: notes, user_rating: newRating || null, user_rpe: rpe || null, user_tags: tags });
  };

  const handleRpe = (e) => {
    const val = parseInt(e.target.value, 10);
    setRpe(val);
    save({ user_notes: notes, user_rating: rating || null, user_rpe: val || null, user_tags: tags });
  };

  const addTag = (tag) => {
    const trimmed = normalizeTag(tag);
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput("");
      save({ user_notes: notes, user_rating: rating || null, user_rpe: rpe || null, user_tags: newTags });
    } else {
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    save({ user_notes: notes, user_rating: rating || null, user_rpe: rpe || null, user_tags: newTags });
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

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: 20, display: "flex", flexDirection: "column", gap: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Session Notes</div>
        {saveStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: saveStatus === "saving" ? T.textDim : T.green }}>
            {saveStatus === "saving"
              ? <><RefreshCw size={10} style={{ animation: "snotes-spin 1s linear infinite" }} /> Saving...</>
              : <><Check size={10} /> Saved</>}
          </div>
        )}
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
          onChange={handleNotesChange}
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
          onChange={handleRpe}
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

      <style>{`
        @keyframes snotes-spin { to { transform: rotate(360deg); } }
        .snotes-textarea::placeholder { color: #9ca3af; opacity: 1; }
      `}</style>
    </div>
  );
}
