import { T, font, mono } from "../../theme/tokens";
import { useResponsive } from "../../hooks/useResponsive";
import PrepRec from "./PrepRec";

export default function TodayCard({ mode, workout, prepRecs = [], recoveryRecs = [], prescription, prescriptionLoading, onGetWorkout }) {
  const { isMobile } = useResponsive();
  const isPostRide = mode === "POST_RIDE";
  const recs = isPostRide ? recoveryRecs : prepRecs;
  const hasPlannedWorkout = workout?.hasPlannedWorkout;

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: isMobile ? "14px 16px" : "16px 18px" }}>

      {isPostRide ? (
        /* ── POST-RIDE: Recovery Focus ── */
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: font }}>Recovery Focus</div>
          {recs.map((rec, i) => <PrepRec key={i} rec={rec} />)}
          {recs.length === 0 && (
            <div style={{ padding: "12px 0", fontSize: 12, color: T.textSoft, fontFamily: font }}>Recovery recommendations loading...</div>
          )}
        </>

      ) : hasPlannedWorkout ? (
        /* ── MORNING WITH PLAN ── */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1, fontFamily: font }}>Today's Workout</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: font }}>{workout.name}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2, fontFamily: font }}>
                {[workout.duration, workout.targetPower, workout.tss && `~${workout.tss} TSS`].filter(Boolean).join(" \u00B7 ")}
              </div>
            </div>
            {workout.source && (
              <div style={{ padding: "4px 10px", borderRadius: 9999, background: T.accentDim, color: "#059669", fontSize: 10, fontWeight: 600, fontFamily: font }}>{workout.source}</div>
            )}
          </div>

          {workout.structure && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: T.surface, fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: 14, fontFamily: mono, whiteSpace: "pre-wrap" }}>
              {workout.structure}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: font }}>Pre-Ride Prep</div>
          {recs.map((rec, i) => <PrepRec key={i} rec={rec} />)}
        </>

      ) : (
        /* ── MORNING NO PLAN ── */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1, fontFamily: font }}>Today's Workout</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: font }}>No plan scheduled</div>
            </div>
          </div>

          {!prescription ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ fontSize: 12, color: T.textSoft, marginBottom: 14, fontFamily: font, margin: "0 0 14px 0" }}>
                Get an AI-generated workout based on your power profile, recovery state, training load, and today's conditions.
              </p>
              <button
                onClick={onGetWorkout}
                disabled={prescriptionLoading}
                style={{
                  padding: "10px 24px", borderRadius: 9999, border: "none",
                  background: T.gradient, color: T.white,
                  fontSize: 13, fontWeight: 600, cursor: prescriptionLoading ? "default" : "pointer", fontFamily: font,
                  opacity: prescriptionLoading ? 0.7 : 1,
                }}
              >
                {prescriptionLoading ? "Analyzing..." : "Get Workout"}
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.04)", borderLeft: `3px solid ${T.accent}`, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: T.white, fontSize: 8, fontWeight: 700 }}>&#10022;</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, fontFamily: font }}>AIM Recommendation</span>
                </div>
                <p style={{ fontSize: 12, color: T.text, lineHeight: 1.55, fontWeight: 500, fontFamily: font, margin: 0 }}>
                  {prescription.rationale || prescription.message}
                </p>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 2, fontFamily: font }}>{prescription.workout_name}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 10, fontFamily: font }}>
                {[
                  prescription.duration_minutes && `${Math.floor(prescription.duration_minutes / 60)}h ${String(prescription.duration_minutes % 60).padStart(2, "0")}m`,
                  prescription.tss_estimate && `~${prescription.tss_estimate} TSS`,
                ].filter(Boolean).join(" \u00B7 ")}
              </div>
              {prescription.structure && (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: T.surface, fontSize: 12, color: T.textSoft, lineHeight: 1.5, marginBottom: 14, fontFamily: mono, whiteSpace: "pre-wrap" }}>
                  {typeof prescription.structure === "string" ? prescription.structure : prescription.structure.map(s => s.description || s).join("\n")}
                </div>
              )}
            </>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, marginTop: 4, fontFamily: font }}>Today's Prep</div>
          {recs.map((rec, i) => <PrepRec key={i} rec={rec} />)}
        </>
      )}
    </div>
  );
}
