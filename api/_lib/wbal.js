/**
 * W' Balance (W'bal) Tracking — pure math functions.
 *
 * Implements the Skiba differential reconstitution model:
 * - Above CP (depleting):  W'bal(t) = W'bal(t-1) - (P(t) - CP) × dt
 * - Below CP (recovering): W'bal(t) = W' - (W' - W'bal(t-1)) × e^(-(CP - P(t)) × dt / W')
 *
 * Recovery is exponential — riding further below CP = faster reconstitution.
 * W'bal is clamped to [0, W'].
 *
 * No DB calls — fully testable.
 */

/**
 * Compute W'bal stream for an activity using Skiba differential model.
 *
 * @param {number[]} watts - Power stream (1Hz or variable rate)
 * @param {number[]} time - Time stream (seconds from start)
 * @param {number} cpWatts - Critical Power in watts
 * @param {number} wPrimeJ - W' in joules (NOT kJ)
 * @param {number} sampleRate - Seconds per sample (default 1, overridden by time stream)
 * @returns {{ stream: Array, summary: Object }|null}
 */
export function computeWbalStream(watts, time, cpWatts, wPrimeJ, sampleRate = 1) {
  if (!watts || !Array.isArray(watts) || watts.length < 60) return null;
  if (!cpWatts || cpWatts <= 0 || !wPrimeJ || wPrimeJ <= 0) return null;

  // Determine sample rate from time stream if available
  let sr = sampleRate;
  if (time && time.length > 1) {
    sr = (time[time.length - 1] - time[0]) / (time.length - 1);
    if (sr <= 0) sr = 1;
  }

  // Downsampling: 5s for rides >= 30min, 1s otherwise
  const totalDuration = watts.length * sr;
  const downsampleInterval = totalDuration >= 1800 ? 5 : 1;

  let wbal = wPrimeJ; // Start fully charged
  const stream = [];
  let minWbal = wPrimeJ;
  let minWbalTime = 0;
  let emptyTankEvents = 0;
  let inEmptyTank = false;
  let timeBelow25 = 0;
  let timeBelow50 = 0;

  // Track depletion/recovery events
  const depletionEvents = [];
  const recoveryEvents = [];
  let currentDepletion = null;
  let currentRecovery = null;

  for (let i = 0; i < watts.length; i++) {
    const p = watts[i] || 0;
    const t = time ? time[i] : i * sr;
    const dt = i > 0 ? (time ? time[i] - time[i - 1] : sr) : 0;

    if (dt > 0) {
      if (p > cpWatts) {
        // Depleting: linear drain
        wbal = wbal - (p - cpWatts) * dt;
      } else if (p < cpWatts) {
        // Recovering: exponential reconstitution (Skiba model)
        const tau = wPrimeJ / (cpWatts - p);
        wbal = wPrimeJ - (wPrimeJ - wbal) * Math.exp(-dt / tau);
      }
      // At CP exactly: no change
    }

    // Clamp to [0, W']
    wbal = Math.max(0, Math.min(wPrimeJ, wbal));

    const pct = wbal / wPrimeJ;

    // Track minimum
    if (wbal < minWbal) {
      minWbal = wbal;
      minWbalTime = t;
    }

    // Track time below thresholds
    if (pct < 0.25) timeBelow25 += dt > 0 ? dt : sr;
    if (pct < 0.50) timeBelow50 += dt > 0 ? dt : sr;

    // Track empty tank events (< 5%)
    if (pct < 0.05) {
      if (!inEmptyTank) {
        emptyTankEvents++;
        inEmptyTank = true;
      }
    } else {
      inEmptyTank = false;
    }

    // Track depletion events (crossing below 50% while trending down)
    if (p > cpWatts) {
      if (!currentDepletion) {
        currentDepletion = { start_s: t, start_pct: Math.round(pct * 1000) / 10, powerSum: 0, count: 0 };
      }
      currentDepletion.powerSum += p;
      currentDepletion.count++;
    } else {
      if (currentDepletion && currentDepletion.count >= 10) {
        currentDepletion.end_s = t;
        currentDepletion.end_pct = Math.round(pct * 1000) / 10;
        currentDepletion.power_avg = Math.round(currentDepletion.powerSum / currentDepletion.count);
        const { powerSum, count, ...event } = currentDepletion;
        depletionEvents.push(event);
      }
      currentDepletion = null;
    }

    // Track recovery events (crossing back above 50% while trending up)
    if (p < cpWatts && i > 0) {
      if (!currentRecovery) {
        currentRecovery = { start_s: t, start_pct: Math.round(pct * 1000) / 10, powerSum: 0, count: 0 };
      }
      currentRecovery.powerSum += p;
      currentRecovery.count++;
    } else {
      if (currentRecovery && currentRecovery.count >= 10) {
        currentRecovery.end_s = t;
        currentRecovery.end_pct = Math.round(pct * 1000) / 10;
        currentRecovery.power_avg = Math.round(currentRecovery.powerSum / currentRecovery.count);
        const { powerSum, count, ...event } = currentRecovery;
        recoveryEvents.push(event);
      }
      currentRecovery = null;
    }

    // Downsample output stream
    const sampleIndex = Math.round(t / sr);
    if (sampleIndex % Math.round(downsampleInterval / sr) === 0 || i === watts.length - 1) {
      stream.push({
        t: Math.round(t),
        wbal: Math.round(wbal),
        pct: Math.round(pct * 1000) / 10, // percentage with 1 decimal
      });
    }
  }

  // Close any open events
  if (currentDepletion && currentDepletion.count >= 10) {
    const lastT = time ? time[time.length - 1] : (watts.length - 1) * sr;
    const lastPct = Math.round((wbal / wPrimeJ) * 1000) / 10;
    currentDepletion.end_s = lastT;
    currentDepletion.end_pct = lastPct;
    currentDepletion.power_avg = Math.round(currentDepletion.powerSum / currentDepletion.count);
    const { powerSum, count, ...event } = currentDepletion;
    depletionEvents.push(event);
  }
  if (currentRecovery && currentRecovery.count >= 10) {
    const lastT = time ? time[time.length - 1] : (watts.length - 1) * sr;
    const lastPct = Math.round((wbal / wPrimeJ) * 1000) / 10;
    currentRecovery.end_s = lastT;
    currentRecovery.end_pct = lastPct;
    currentRecovery.power_avg = Math.round(currentRecovery.powerSum / currentRecovery.count);
    const { powerSum, count, ...event } = currentRecovery;
    recoveryEvents.push(event);
  }

  // Compute average recovery rate (% per minute of time below CP)
  const totalRecoveryTime = recoveryEvents.reduce((s, e) => s + (e.end_s - e.start_s), 0);
  const totalRecoveryPct = recoveryEvents.reduce((s, e) => s + (e.end_pct - e.start_pct), 0);
  const avgRecoveryRate = totalRecoveryTime > 0
    ? Math.round((totalRecoveryPct / (totalRecoveryTime / 60)) * 10) / 10
    : null;

  const summary = {
    min_wbal_pct: Math.round((minWbal / wPrimeJ) * 1000) / 10,
    min_wbal_time_s: Math.round(minWbalTime),
    empty_tank_events: emptyTankEvents,
    total_time_below_25_pct: Math.round(timeBelow25),
    total_time_below_50_pct: Math.round(timeBelow50),
    avg_recovery_rate_pct_per_min: avgRecoveryRate,
    depletion_events: depletionEvents.slice(0, 20), // Cap at 20 events
    recovery_events: recoveryEvents.slice(0, 20),
  };

  return { stream, summary };
}

/**
 * Extract summary from W'bal result (convenience accessor).
 *
 * @param {Object|null} wbalResult - From computeWbalStream
 * @returns {Object|null} Summary object
 */
export function summarizeWbal(wbalResult) {
  if (!wbalResult?.summary) return null;
  return wbalResult.summary;
}

/**
 * Format W'bal data as context string for AI analysis.
 *
 * @param {Object|null} wbalSummary - Summary from computeWbalStream
 * @param {number} cpWatts - Critical Power in watts
 * @param {number} wPrimeKj - W' in kJ
 * @returns {string} Formatted context string, empty if no data
 */
export function formatWbalForAI(wbalSummary, cpWatts, wPrimeKj) {
  if (!wbalSummary) return "";

  const parts = [];

  // Core W'bal stats
  parts.push(`Min W'bal: ${wbalSummary.min_wbal_pct}% at ${formatTime(wbalSummary.min_wbal_time_s)}`);

  if (wbalSummary.empty_tank_events > 0) {
    parts.push(`Empty tank events (<5% W'): ${wbalSummary.empty_tank_events}`);
  }

  if (wbalSummary.total_time_below_25_pct > 0) {
    parts.push(`Time below 25% W': ${formatTime(wbalSummary.total_time_below_25_pct)}`);
  }

  if (wbalSummary.total_time_below_50_pct > 0) {
    parts.push(`Time below 50% W': ${formatTime(wbalSummary.total_time_below_50_pct)}`);
  }

  if (wbalSummary.avg_recovery_rate_pct_per_min != null) {
    parts.push(`Avg recovery rate: ${wbalSummary.avg_recovery_rate_pct_per_min}%/min below CP`);
  }

  // Significant depletion events
  const deepDepletions = wbalSummary.depletion_events?.filter(e => e.end_pct < 30) || [];
  if (deepDepletions.length > 0) {
    const top3 = deepDepletions.slice(0, 3);
    parts.push(`Major depletions: ${top3.map(e => `${formatTime(e.start_s)}-${formatTime(e.end_s)} (${e.start_pct}%→${e.end_pct}%, avg ${e.power_avg}W)`).join("; ")}`);
  }

  if (cpWatts && wPrimeKj) {
    parts.push(`CP: ${cpWatts}W | W': ${wPrimeKj} kJ`);
  }

  return parts.length > 0
    ? `\n--- W' BALANCE (ANAEROBIC RESERVE) ---\n${parts.join("\n")}`
    : "";
}

/** Format seconds as m:ss or h:mm:ss */
function formatTime(seconds) {
  if (seconds == null) return "--";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
