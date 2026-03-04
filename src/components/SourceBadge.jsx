import React, { useState } from "react";
import { T } from "../theme/tokens";
import { Activity, Watch, Heart, Moon } from "lucide-react";

// Human-readable display names for HR sources
const DISPLAY_NAMES = {
  chest_strap: "Chest Strap",
  device_file: "Device File",
  strava_stream: "Strava",
  strava: "Strava",
  wrist_optical: "Wrist",
  ring: "Ring",
  oura: "Oura",
  eightsleep: "Eight Sleep",
  whoop: "Whoop",
  garmin_watch: "Garmin",
  garmin: "Garmin",
  apple_watch: "Apple Watch",
  wahoo: "Wahoo",
  withings: "Withings",
};

// Short confidence explanations
const CONFIDENCE_LABELS = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

// Pick a small icon for the source type
function SourceIcon({ source, size = 10 }) {
  const s = (source || "").toLowerCase();
  if (s.includes("sleep") || s === "eightsleep") return <Moon size={size} />;
  if (s === "chest_strap" || s.includes("hrm") || s.includes("tickr")) return <Heart size={size} />;
  if (s.includes("watch") || s === "oura" || s === "whoop" || s === "ring" || s === "wrist_optical") return <Watch size={size} />;
  return <Activity size={size} />;
}

/**
 * SourceBadge — small pill showing the HR data source.
 *
 * @param {string} source - e.g. 'chest_strap', 'oura', 'whoop'
 * @param {string} confidence - 'high' | 'medium' | 'low'
 * @param {string} context - 'exercise' | 'sleep' | 'resting' (for tooltip)
 * @param {boolean} compact - if true, show only icon + short name
 */
export default function SourceBadge({ source, confidence, context, compact = false }) {
  const [showTip, setShowTip] = useState(false);

  if (!source) return null;

  const name = DISPLAY_NAMES[source] || source;
  const confLabel = CONFIDENCE_LABELS[confidence] || "";

  // Confidence dot color
  const dotColor =
    confidence === "high" ? T.accent :
    confidence === "medium" ? T.warn :
    T.textDim;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: T.surface,
        borderRadius: 6,
        padding: compact ? "1px 5px" : "2px 6px",
        fontSize: compact ? 10 : 11,
        color: T.textDim,
        fontWeight: 500,
        lineHeight: 1.4,
        cursor: "default",
        position: "relative",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onClick={() => setShowTip(prev => !prev)}
    >
      <span style={{ display: "flex", alignItems: "center", color: dotColor }}>
        <SourceIcon source={source} size={compact ? 9 : 10} />
      </span>
      {!compact && name}

      {/* Tooltip */}
      {showTip && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: T.text,
            color: T.white,
            fontSize: 11,
            padding: "5px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {name}{confLabel ? ` · ${confLabel}` : ""}
          {context ? ` (${context})` : ""}
        </span>
      )}
    </span>
  );
}
