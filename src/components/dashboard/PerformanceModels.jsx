import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { T, font, mono } from "../../theme/tokens";
import { apiFetch } from "../../lib/api";
import { Thermometer, Heart, Zap, Flame, Moon, ChevronRight } from "lucide-react";
import { usePreferences } from "../../context/PreferencesContext";
import { formatTemp } from "../../lib/units";

const badgeColors = {
  high: T.accent,
  medium: "#f59e0b",
  low: T.textDim,
};

function ConfidenceBadge({ level }) {
  const color = badgeColors[level] || T.textDim;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 4,
      background: `${color}15`, color,
      letterSpacing: "0.05em",
    }}>
      {level}
    </span>
  );
}

function ModelTile({ icon, label, headline, sub, confidence, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface, borderRadius: 10, padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 4,
      cursor: onClick ? "pointer" : "default",
      transition: onClick ? "background 0.15s" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: T.accent, opacity: 0.7 }}>{icon}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, color: T.textDim,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {label}
          </span>
        </div>
        {confidence && <ConfidenceBadge level={confidence} />}
      </div>
      {headline && (
        <div style={{
          fontFamily: mono, fontSize: 16, fontWeight: 700,
          color: T.text, lineHeight: 1.2,
        }}>
          {headline}
        </div>
      )}
      {sub && (
        <div style={{
          fontSize: 11, color: T.textSoft, lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function buildTiles(models, tempUnit) {
  if (!models) return [];

  const tiles = [];

  if (models.heat) {
    const m = models.heat;
    let headline = null;
    if (m.breakpointTemp != null) {
      headline = `${formatTemp(m.breakpointTemp, tempUnit)} breakpoint`;
    } else if (m.bins) {
      const cool = m.bins["Cool (<15°C)"];
      const hot = m.bins["Hot (>25°C)"];
      if (cool?.avgEF && hot?.avgEF) {
        const delta = ((hot.avgEF - cool.avgEF) / cool.avgEF * 100).toFixed(1);
        headline = `${delta}% EF in heat`;
      }
    }
    tiles.push({
      key: "heat",
      icon: <Thermometer size={14} />,
      label: "Heat Model",
      headline,
      sub: m.summary?.split(";")[0] || null,
      confidence: m.confidence,
    });
  }

  if (models.hrvReadiness) {
    const m = models.hrvReadiness;
    let headline = null;
    if (m.efDeltaPct != null) {
      headline = `${m.efDeltaPct > 0 ? "+" : ""}${m.efDeltaPct}% EF delta`;
    }
    const greenRange = m.thresholds?.green?.hrvRange;
    const redRange = m.thresholds?.red?.hrvRange;
    const sub = greenRange && redRange
      ? `Green: ${greenRange} / Red: ${redRange}`
      : m.summary?.split(";")[0] || null;
    tiles.push({
      key: "hrv",
      icon: <Heart size={14} />,
      label: "HRV Readiness",
      headline,
      sub,
      confidence: m.confidence,
    });
  }

  if (models.durability) {
    const m = models.durability;
    let headline = null;
    // Prefer aggregate durability score (from power_profiles) if available
    if (models._durabilityScore != null) {
      headline = `${Math.round(models._durabilityScore * 100)}% retention`;
    } else if (m.threshold != null) {
      headline = `${m.threshold} kJ/kg threshold`;
    }
    tiles.push({
      key: "durability",
      icon: <Zap size={14} />,
      label: "Durability",
      headline,
      sub: m.summary?.split(";")[0] || null,
      confidence: m.confidence,
      link: "/my-stats",
    });
  }

  if (models.fueling) {
    const m = models.fueling;
    let headline = null;
    const under = m.bins?.["Under-fueled (<40g/hr)"];
    const well = m.bins?.["Well-fueled (>60g/hr)"];
    if (under?.avgEF && well?.avgEF) {
      const delta = ((well.avgEF - under.avgEF) / under.avgEF * 100).toFixed(1);
      headline = `${delta > 0 ? "+" : ""}${delta}% EF well-fueled`;
    }
    tiles.push({
      key: "fueling",
      icon: <Flame size={14} />,
      label: "Fueling Impact",
      headline,
      sub: m.summary?.split(";")[0] || null,
      confidence: m.confidence,
    });
  }

  if (models.sleepExecution) {
    const m = models.sleepExecution;
    let headline = null;
    const qa = m.quartileAnalysis;
    if (qa?.highHRV?.avgCV != null && qa?.lowHRV?.avgCV != null) {
      const cvDiff = (qa.lowHRV.avgCV - qa.highHRV.avgCV).toFixed(1);
      headline = `${cvDiff > 0 ? "+" : ""}${cvDiff}% better consistency`;
    }
    tiles.push({
      key: "sleep",
      icon: <Moon size={14} />,
      label: "Sleep \u2192 Execution",
      headline,
      sub: m.summary?.split(";")[0] || null,
      confidence: m.confidence,
    });
  }

  return tiles;
}

export default function PerformanceModels({ isMobile }) {
  const navigate = useNavigate();
  const { tempUnit } = usePreferences();
  const [models, setModels] = useState(null);
  const [durabilityScore, setDurabilityScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    (async () => {
      try {
        const [modelsData, durData] = await Promise.all([
          apiFetch("/models/summary"),
          apiFetch("/durability/summary").catch(() => null),
        ]);
        setModels(modelsData.models || null);
        if (durData?.score != null) setDurabilityScore(durData.score);
      } catch {
        // silently fail — card just won't show models
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Inject durability score into models for buildTiles
  const modelsWithScore = models ? { ...models, _durabilityScore: durabilityScore } : null;
  const tiles = buildTiles(modelsWithScore, tempUnit);

  // Don't render the card at all if loading is done and there are no models
  if (!loading && tiles.length === 0 && !models) {
    return (
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 18,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Performance Models</div>
        <div style={{ textAlign: "center", padding: "16px 0", color: T.textDim, fontSize: 12 }}>
          Building your performance models...
          <br />
          <span style={{ fontSize: 11 }}>Need 10+ activities with weather, HRV, or nutrition data</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Performance Models</div>
        {!loading && tiles.length > 0 && (
          <span style={{ fontSize: 10, color: T.textDim }}>
            {tiles.length} model{tiles.length !== 1 ? "s" : ""} active
          </span>
        )}
      </div>

      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 10,
        }}>
          {[0, 1].map(i => (
            <div key={i} style={{
              background: T.surface, borderRadius: 10, padding: "10px 12px",
              height: 72, animation: "shimmer 1.5s infinite",
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 10,
        }}>
          {tiles.map(tile => (
            <ModelTile
              key={tile.key}
              icon={tile.icon}
              label={tile.label}
              headline={tile.headline}
              sub={tile.sub}
              confidence={tile.confidence}
              onClick={tile.link ? () => navigate(tile.link) : undefined}
            />
          ))}
        </div>
      )}

      {models?.metadata && (
        <div style={{
          marginTop: 10, fontSize: 10, color: T.textDim,
          display: "flex", flexWrap: "wrap", gap: "4px 12px",
        }}>
          <span>{models.metadata.totalActivities} activities analyzed</span>
          {models.metadata.activitiesWithWeather > 0 && (
            <span>{models.metadata.activitiesWithWeather} with weather</span>
          )}
          {models.metadata.activitiesWithSleep > 0 && (
            <span>{models.metadata.activitiesWithSleep} with sleep</span>
          )}
          {models.metadata.activitiesWithNutrition > 0 && (
            <span>{models.metadata.activitiesWithNutrition} with nutrition</span>
          )}
        </div>
      )}
    </div>
  );
}
