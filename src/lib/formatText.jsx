/**
 * Strips common markdown artifacts that the AI sometimes includes in JSON text fields.
 * Handles: horizontal rules (---/***), ATX headings (# ## ###), bold/italic (**__*_),
 * inline code (`), and collapses excess blank lines.
 */
export function cleanText(text) {
  if (!text || typeof text !== "string") return text;
  return text
    // Remove horizontal rules (--- or *** alone on a line)
    .replace(/^[-*]{3,}\s*$/gm, "")
    // Remove ATX heading markers (# ## ### etc.), keep the text
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers (**text**, __text__, *text*, _text_)
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * React component that renders text with proper paragraph spacing.
 * Splits on double newlines and renders each paragraph separately so
 * paragraph breaks show in the UI even when there's no CSS whitespace handling.
 */
export function FormattedText({ text, style }) {
  if (!text) return null;
  const cleaned = cleanText(text);
  const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length <= 1) {
    const lines = cleaned.split("\n");
    return (
      <span style={style}>
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div style={style}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0" }}>
          {para.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
