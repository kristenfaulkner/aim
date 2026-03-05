import { useState, useEffect, useRef, useCallback } from "react";
import { T, font, mono } from "../../theme/tokens";
import { FormattedText } from "../../lib/formatText.jsx";
import InsightFeedback from "../InsightFeedback";
import { apiFetch } from "../../lib/api";
import { useResponsive } from "../../hooks/useResponsive";

const PROMPT_CHIPS = [
  "Why did power drop in the final interval?",
  "Compare to my best threshold session",
  "Was fueling likely an issue?",
  "How should I adjust tomorrow?",
];

/**
 * FloatingChatBar — persistent Ask Claude interface fixed to bottom of viewport.
 *
 * Props:
 *   activityId: UUID for scoping chat to this activity
 */
export default function FloatingChatBar({ activityId }) {
  const { isMobile } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thread, setThread] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  const handleAsk = useCallback(async (q) => {
    const question = q || input.trim();
    if (!question || isAsking) return;
    setInput("");
    setIsAsking(true);
    setIsOpen(true);
    setThread(prev => [...prev, { role: "user", text: question }]);

    try {
      const data = await apiFetch("/chat/ask", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          activityId,
          history: thread,
        }),
      });
      setThread(prev => [...prev, {
        role: "assistant",
        text: data.reply || "Sorry, I couldn't process that.",
      }]);
    } catch (err) {
      setThread(prev => [...prev, {
        role: "assistant",
        text: `Error: ${err.message || "Request failed. Please try again."}`,
      }]);
    } finally {
      setIsAsking(false);
    }
  }, [input, isAsking, activityId, thread]);

  // Auto-scroll thread
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread, isAsking]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 1200,
      padding: isMobile ? "0 12px" : "0 24px",
      zIndex: 1000,
      pointerEvents: "none",
    }}>
      <div style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderBottom: "none",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.08), 0 -1px 6px rgba(0,0,0,0.04)",
        pointerEvents: "auto",
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
      }}>

        {/* Expanded: conversation thread */}
        {isOpen && thread.length > 0 && (
          <div ref={threadRef} style={{
            maxHeight: 280,
            overflowY: "auto",
            padding: "16px 20px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderBottom: `1px solid ${T.border}`,
          }}>
            {thread.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                animation: "aim-fadeUp 0.2s ease",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: msg.role === "user" ? T.surface : T.gradientSubtle,
                  border: `1px solid ${msg.role === "user" ? T.border : T.accentMid}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: 10, fontWeight: 700,
                  color: msg.role === "user" ? T.textSoft : T.accent,
                }}>
                  {msg.role === "user" ? "You" : "\u2726"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600, color: T.textDim, fontFamily: font,
                    marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {msg.role === "user" ? "You" : "AIM Intelligence"}
                  </div>
                  {msg.role === "user" ? (
                    <p style={{ margin: 0, fontSize: 13, color: T.text, fontFamily: font, lineHeight: 1.65 }}>{msg.text}</p>
                  ) : (
                    <FormattedText text={msg.text} style={{ fontSize: 13, color: T.text, fontFamily: font, lineHeight: 1.65 }} />
                  )}
                  {msg.role === "assistant" && (
                    <InsightFeedback
                      activityId={activityId}
                      source="chat"
                      insightIndex={i}
                      insight={{ category: "chat", type: "insight", title: "Chat response", body: msg.text }}
                    />
                  )}
                </div>
              </div>
            ))}
            {isAsking && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: T.gradientSubtle, border: `1px solid ${T.accentMid}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: T.accent, flexShrink: 0,
                }}>{"\u2726"}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 5, height: 5, borderRadius: "50%", background: T.accent,
                      animation: `aim-pulse 1.2s ease-in-out ${j * 0.2}s infinite`, opacity: 0.7,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggested chips — show when no conversation yet */}
        {(!isOpen || thread.length === 0) && (
          <div style={{
            padding: "12px 20px 0",
            display: "flex", gap: 5,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
          }}>
            {PROMPT_CHIPS.map((chip, i) => (
              <button key={i} onClick={() => handleAsk(chip)}
                style={{
                  fontSize: 11, fontWeight: 500, color: T.textSoft,
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 20, padding: "5px 12px", cursor: "pointer",
                  fontFamily: font, transition: "all 0.12s",
                  whiteSpace: "nowrap", flexShrink: 0,
                  minHeight: 32,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accentMid; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accentDim; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSoft; e.currentTarget.style.background = T.surface; }}
              >{chip}</button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{ display: "flex", gap: 8, padding: isMobile ? "12px 14px 14px" : "12px 20px 14px", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flex: 1,
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: isMobile ? "8px 12px" : "10px 14px",
            transition: "border-color 0.15s",
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: T.gradientSubtle, border: `1px solid ${T.accentMid}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, flexShrink: 0,
            }}>{"\u2726"}</div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder="Ask anything about this ride..."
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 13, color: T.text, fontFamily: font, outline: "none",
                minHeight: 24,
              }}
            />
          </div>
          <button onClick={() => handleAsk()}
            disabled={isAsking || !input.trim()}
            style={{
              background: T.gradient,
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 12, fontWeight: 700,
              padding: isMobile ? "8px 14px" : "10px 18px",
              cursor: isAsking || !input.trim() ? "default" : "pointer",
              fontFamily: font, flexShrink: 0,
              boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
              opacity: isAsking || !input.trim() ? 0.6 : 1,
              transition: "opacity 0.15s, transform 0.1s, box-shadow 0.1s",
              minHeight: 44,
            }}
          >Ask {"\u2726"}</button>
          {isOpen && thread.length > 0 && (
            <button onClick={() => setIsOpen(false)}
              style={{
                background: "none", border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.textDim, fontSize: 10,
                padding: "8px 10px", cursor: "pointer", fontFamily: font,
                flexShrink: 0, minHeight: 32,
              }}
            >Minimize</button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes aim-fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aim-pulse { 0%,100%{transform:scale(0.7);opacity:0.4} 50%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}
