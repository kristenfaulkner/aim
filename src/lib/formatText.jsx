/**
 * Strips markdown structural artifacts that the AI sometimes includes in JSON text fields.
 * Handles: horizontal rules (---/***), ATX headings (# ## ###).
 * Bold/italic is handled at render time by FormattedText (renders as <strong>/<em>).
 */
export function cleanText(text) {
  if (!text || typeof text !== "string") return text;
  return text
    // Remove horizontal rules (--- or *** alone on a line)
    .replace(/^[-*]{3,}\s*$/gm, "")
    // Remove ATX heading markers (# ## ### etc.), keep the heading text.
    // \s* makes the space after # optional so ##Heading is also caught.
    .replace(/^#{1,6}\s*/gm, "")
    // Remove inline code backticks (we don't render code blocks)
    .replace(/`([^`]+)`/g, "$1")
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Renders a single line of text, converting **bold** → <strong> and *italic* → <em>.
 */
function renderInline(text, keyPrefix) {
  // Split on **bold** or *italic* markers (greedy-safe, non-nested)
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`${keyPrefix}-i${i}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * React component that renders AI text with:
 * - Markdown structural artifacts stripped (## headings, --- rules)
 * - **bold** rendered as <strong>
 * - *italic* rendered as <em>
 * - Double newlines rendered as paragraph breaks
 * - Single newlines rendered as <br />
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
            {renderInline(line, `l${i}`)}
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
              {renderInline(line, `p${i}l${j}`)}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
