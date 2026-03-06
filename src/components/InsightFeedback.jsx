import { useState, useCallback, useRef, useEffect } from "react";
import { T, font } from "../theme/tokens";
import { apiFetch } from "../lib/api";

/**
 * Thumbs up/down feedback for a single AI insight, with optional text explanation.
 *
 * Props:
 *   - activityId: UUID (nullable for sleep/dashboard insights)
 *   - source: 'activity_analysis' | 'dashboard' | 'sleep_summary' | 'chat'
 *   - insightIndex: integer position in insights array
 *   - insight: { category, type, title, body }
 *   - initialFeedback: 1 | -1 | null (from prior state)
 *   - onFeedback: (index, feedback) => void (optional callback)
 */
export default function InsightFeedback({
  activityId,
  source,
  insightIndex,
  insight,
  initialFeedback = null,
  onFeedback,
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [submitting, setSubmitting] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [textSubmitted, setTextSubmitted] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (showTextInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showTextInput]);

  const submitFeedback = useCallback(async (value, text) => {
    setSubmitting(true);
    try {
      await apiFetch("/feedback/submit", {
        method: "POST",
        body: JSON.stringify({
          activity_id: activityId || null,
          source,
          insight_index: insightIndex,
          insight_category: insight.category,
          insight_type: insight.type,
          insight_title: insight.title,
          insight_body: insight.body || null,
          feedback: value,
          feedback_text: text || null,
        }),
      });
    } catch {
      // Silently fail — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }, [activityId, source, insightIndex, insight]);

  const handleThumb = useCallback((value) => {
    // Toggle off if already selected
    const newValue = feedback === value ? null : value;

    setFeedback(newValue);
    onFeedback?.(insightIndex, newValue);

    if (newValue === null) {
      setShowTextInput(false);
      setFeedbackText("");
      setTextSubmitted(false);
      return;
    }

    // Submit the thumbs vote immediately
    submitFeedback(newValue, null);
    // Show the text prompt
    setShowTextInput(true);
    setTextSubmitted(false);
    setFeedbackText("");
  }, [feedback, insightIndex, onFeedback, submitFeedback]);

  const handleTextSubmit = useCallback(async () => {
    if (!feedbackText.trim()) return;
    await submitFeedback(feedback, feedbackText.trim());
    setTextSubmitted(true);
    setShowTextInput(false);
  }, [feedback, feedbackText, submitFeedback]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  }, [handleTextSubmit]);

  const btnStyle = (active) => ({
    background: "none",
    border: "none",
    cursor: submitting ? "default" : "pointer",
    padding: "2px 4px",
    fontSize: 12,
    opacity: active ? 1 : 0.35,
    transition: "opacity 0.2s, transform 0.15s",
    transform: active ? "scale(1.15)" : "scale(1)",
    lineHeight: 1,
  });

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "flex-end",
      }}>
        <span style={{ fontSize: 10, color: T.textDim }}>
          {textSubmitted ? "Thanks for your feedback!" : feedback != null ? "Thanks!" : "Helpful?"}
        </span>
        <button
          onClick={() => handleThumb(1)}
          disabled={submitting}
          style={btnStyle(feedback === 1)}
          title="Useful insight"
          aria-label="Thumbs up"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={feedback === 1 ? T.accent : T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </button>
        <button
          onClick={() => handleThumb(-1)}
          disabled={submitting}
          style={btnStyle(feedback === -1)}
          title="Not useful"
          aria-label="Thumbs down"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={feedback === -1 ? T.warn : T.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
          </svg>
        </button>
      </div>

      {showTextInput && (
        <div style={{
          marginTop: 6,
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Help us improve — tell us more (optional)"
            rows={2}
            style={{
              flex: 1,
              fontSize: 11,
              fontFamily: font,
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              resize: "none",
              outline: "none",
              lineHeight: 1.4,
            }}
          />
          <button
            onClick={handleTextSubmit}
            disabled={!feedbackText.trim() || submitting}
            style={{
              fontSize: 11,
              fontFamily: font,
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              background: feedbackText.trim() ? T.accent : T.border,
              color: feedbackText.trim() ? "#fff" : T.textDim,
              cursor: feedbackText.trim() ? "pointer" : "default",
              whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
          >
            Submit
          </button>
          <button
            onClick={() => { setShowTextInput(false); setFeedbackText(""); }}
            style={{
              fontSize: 11,
              fontFamily: font,
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: "none",
              color: T.textDim,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
