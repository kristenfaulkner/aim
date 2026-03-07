import { useState, useCallback } from "react";
import { T, font, mono } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { FormattedText } from "../../lib/formatText";

const PLACEHOLDERS = {
  MORNING_WITH_PLAN: "Should I adjust power targets today?",
  POST_RIDE: "Why was my EF high despite low sleep?",
  MORNING_RECOVERY: "What should I focus on today?",
  MORNING_NO_PLAN: "What should I focus on today?",
};

export default function AskClaude({ mode, isMobile }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    setLoading(true);
    setResponse(null);
    try {
      const data = await apiFetch("/chat/ask", {
        method: "POST",
        body: JSON.stringify({ message: question }),
      });
      setResponse(data.reply || "No response received.");
    } catch (err) {
      setResponse(`Error: ${err.message || "Something went wrong."}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const placeholder = PLACEHOLDERS[mode] || PLACEHOLDERS.POST_RIDE;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            background: T.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ✦
        </span>
        <span
          style={{
            fontFamily: font,
            fontSize: 14,
            fontWeight: 600,
            color: T.text,
          }}
        >
          Ask Claude
        </span>
      </div>

      {/* Input area */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            fontFamily: font,
            fontSize: 13,
            color: T.text,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "none",
            background:
              loading || !input.trim() ? T.surface : T.accent,
            color:
              loading || !input.trim() ? T.textDim : T.white,
            cursor:
              loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s, color 0.15s",
          }}
          aria-label="Send question"
        >
          {loading ? (
            <span
              style={{
                fontFamily: font,
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              …
            </span>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </div>

      {/* Response area */}
      {response && (
        <div
          style={{
            marginTop: 14,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <FormattedText
            text={response}
            style={{
              fontFamily: font,
              fontSize: 13,
              lineHeight: 1.7,
              color: T.text,
            }}
          />
        </div>
      )}
    </div>
  );
}
