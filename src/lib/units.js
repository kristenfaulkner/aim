/**
 * Unit conversion utilities for metric/imperial display.
 * All internal storage is metric. These functions convert for display only.
 */

// Distance: meters → display string
export function formatDistance(meters, units = "metric") {
  if (!meters) return "--";
  if (units === "imperial") {
    const miles = meters / 1609.344;
    return miles >= 10 ? `${miles.toFixed(1)} mi` : `${miles.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

// Speed: m/s → display string
export function formatSpeed(mps, units = "metric") {
  if (!mps) return "--";
  if (units === "imperial") {
    return `${(mps * 2.23694).toFixed(1)} mph`;
  }
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

// Elevation: meters → display string
export function formatElevation(meters, units = "metric") {
  if (!meters && meters !== 0) return "--";
  if (units === "imperial") {
    return `${Math.round(meters * 3.28084)}`;
  }
  return `${Math.round(meters)}`;
}

// Elevation unit label
export function elevationUnit(units = "metric") {
  return units === "imperial" ? "ft" : "m";
}

// Weight: kg → display number
export function formatWeight(kg, units = "metric") {
  if (!kg) return "--";
  if (units === "imperial") {
    return `${(kg * 2.20462).toFixed(1)}`;
  }
  return `${kg.toFixed(1)}`;
}

// Weight unit label
export function weightUnit(units = "metric") {
  return units === "imperial" ? "lbs" : "kg";
}

// Height: cm → display number
export function formatHeight(cm, units = "metric") {
  if (!cm) return "--";
  if (units === "imperial") {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

// Temperature: °C → display string
export function formatTemp(celsius, units = "metric") {
  if (celsius == null) return "--";
  if (units === "imperial") {
    return `${Math.round(celsius * 9/5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

// Distance unit label (short)
export function distanceUnit(units = "metric") {
  return units === "imperial" ? "mi" : "km";
}

// Speed unit label (short)
export function speedUnit(units = "metric") {
  return units === "imperial" ? "mph" : "km/h";
}

// Convert display value back to metric for storage
export function toMetricWeight(value, units = "metric") {
  if (!value) return null;
  const v = Number(value);
  if (units === "imperial") return Math.round(v / 2.20462 * 10) / 10;
  return v;
}

export function toMetricHeight(value, units = "metric") {
  if (!value) return null;
  const v = Number(value);
  if (units === "imperial") return Math.round(v * 2.54 * 10) / 10;
  return v;
}

export function fromMetricWeight(kg, units = "metric") {
  if (!kg) return "";
  if (units === "imperial") return String(Math.round(kg * 2.20462 * 10) / 10);
  return String(kg);
}

export function fromMetricHeight(cm, units = "metric") {
  if (!cm) return "";
  if (units === "imperial") return String(Math.round(cm / 2.54 * 10) / 10);
  return String(cm);
}
