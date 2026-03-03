# AIM Structured Workouts + AI Insights Specification (Cycling + Running)
_Date: 2026-03-02_

> **Status: Content distributed.** This spec has been parsed and distributed to:
> - `docs/insights-catalog.md` — Categories 16-22 (Interval Execution, Durability, Fueling, Readiness, Progression, Anomaly, Race) + enhanced output format
> - `docs/technical-architecture.md` — Structured Workouts section (activity_tags schema, laps JSONB structure, tag dictionary, interval pipeline, weather enrichment, performance models)
> - Implementation plan: `~/.claude/plans/woolly-exploring-pine.md`
>
> This file is kept as the original reference spec. Edits should go to the distributed locations above.

This document is intended to be dropped into the AIM repo for Claude Code to translate into:
1) Feature requests for structured workout extraction/tagging + searchable database
2) The AI “Insights” catalog: prompts, outputs, and recommended user prompt templates

It includes:
- **Working Doc A:** Workout Data Extraction / Calculation / Tagging spec (per activity)
- **Working Doc B:** AI Insights spec (what the AI should infer from structured data)
- A **Canonical Tag Dictionary** starter (cycling + running)
- Guidance for **conditional performance models** (heat/sleep/HRV/etc) and how to productize them
- Notes on UI/UX prompting and “searchable database” ergonomics


---

## Guiding principles (coach + athlete POV)
- **Turn every file into meaning.** The goal is not “more metrics,” it’s a consistent *semantic layer* above the raw streams.
- **Cross-pollination is the moat.** Single-device metrics are table stakes. AIM should connect: workout streams + sleep/HRV + weather + fueling + travel + subjective notes.
- **Two outputs every time:**
  1) **Structured data** (machine-queryable)
  2) **Coaching interpretation** (human-readable, actionable, with uncertainty)


---

# Working Doc A: Workout Data Extraction / Calculation / Tagging (Per Activity)

## A0. Inputs
### Primary file sources
- **Cycling:** `.fit` preferred; `.gpx` supported with reduced sensor richness
- **Running:** `.fit` preferred; `.gpx` supported

### Potential sensors (optional)
- HR, power, cadence, speed, GPS, altitude, temperature, L/R balance, running dynamics, respiration, core temp (if available), etc.

### External/context sources
- **Weather + environment**: if device missing temperature/humidity/wind/etc, AIM must infer from **start/end location + timestamps** using public sources (weather, dew point, wind, precipitation).  
- **Altitude & grade**: GPS + DEM/route smoothing (if needed) to avoid noisy grade.
- **Calendar / plan**: planned workout structure (if available)
- **Sleep/HRV/resting HR**: from wearables
- **Fueling/hydration logs**: optional
- **Subjective notes**: RPE, soreness, mood, pain, etc


## A1. Core identity fields (required for all activities)
- activity_id (stable internal id)
- athlete_id
- sport: `cycling | running`
- subtype (enum, predicted): e.g. cycling: `road | mtb | gravel | track | indoor_trainer`; running: `road | trail | track | treadmill`
- activity_type (enum, predicted): `training | race | group_ride | commute | test | recovery`
- start_time_local, end_time_local, timezone
- duration_s, moving_time_s, paused_time_s
- start_location (lat/lon rounded), end_location (lat/lon rounded)
- route_fingerprint (hash of simplified polyline)
- elevation_gain_m, elevation_loss_m, max_altitude_m
- distance_m

**Race-day heuristic:** if user tags “race” OR event/calendar indicates race OR power/pace profile matches race archetype, default assumption: **not interval workout** unless strong evidence (lap structure + warmup + repeated work blocks).


## A2. Cleaned timeseries streams (normalize before calculating)
For consistent comparisons:
- resample streams to uniform timestep (e.g. 1s or 2s)
- smooth grade and speed (avoid GPS spikes)
- detect sensor dropouts and flag quality

### Quality flags (per stream)
- hr_quality: `good | suspect | missing`
- power_quality: `good | suspect | missing`
- gps_quality: `good | suspect | missing`
- temp_quality: `device | inferred | missing`
- cadence_quality: `good | suspect | missing`

Include: percent_missing, dropout_segments, outlier_spike_count


## A3. Standard session metrics (calculated)
### Cycling
- avg_power_w, max_power_w
- normalized_power_w (NP)
- variability_index (VI = NP / avg_power)
- intensity_factor (IF = NP / FTP)
- work_kj
- power_zones_time_s (Z1..Z7)
- cadence: avg, median, distribution buckets, cadence_zones_time_s
- coasting_time_s, coasting_pct
- stops_count, stop_time_s
- speed: avg, max, distribution
- climbing: time_above_grade_thresholds, VAM estimates if relevant

### Running
- avg_pace_s_per_km, best_pace, pace_distribution
- grade_adjusted_pace (GAP) if possible
- HR zones time
- cadence: avg/median/distribution
- stride_length_proxy (speed/cadence)
- if available: ground_contact_time, vertical_oscillation, L/R balance

### Cardiac response (both sports)
- avg_hr, max_hr
- hr_zones_time_s
- **decoupling / drift**:  
  - cycling: power:HR decoupling across halves/thirds (EF drift)  
  - running: pace(or GAP):HR decoupling
- HR lag metrics: rise time in work bouts, recovery half-life in rests (if intervals detected)

### Environment (both)
- ambient_temp_c (device or inferred)
- humidity_pct (inferred)
- dew_point_c (inferred)
- wind_speed_mps + direction (inferred)
- precip_mm (inferred)
- heat_index / apparent_temp (derived)
- air_quality_index (optional future)
- sun_exposure proxy (optional future)

**Requirement:** If missing from device, pull from public sources using start/end location and time. If route covers wide area, sample weather at start/mid/end points.


## A4. TSS (required for every workout)
AIM must calculate **TSS for every activity**.

### Cycling TSS
- If power available: standard power-based TSS using FTP
- If no power: estimate via HR-based or pace/speed model (lower confidence) and flag `tss_method`

Fields:
- tss_value
- tss_method: `power | hr_estimate | pace_estimate | manual`
- tss_confidence: 0..1

### Running load
- Use rTSS (pace/HR-based) OR a unified “Training Load” metric that is comparable across sports, but still keep:
  - tss_value (unified)
  - sport_specific_load (optional)


## A5. Auto-detected structure: laps + intervals + segments

### A5.1 Laps
If lap button data exists:
- lap[] array:
  - lap_index, start/end, duration_s, distance_m
  - avg_power/pace, avg_hr, avg_cadence, grade_avg, temp_avg
  - lap_type_predicted: `work | rest | warmup | cooldown | unknown`

### A5.2 Interval detection (algorithmic)
Even without lap button:
- detect intervals from power/pace patterns using change-point detection + heuristics
- output intervals[] with:
  - interval_id, start/end, duration, distance
  - avg & max power/pace, avg & max HR, cadence stats
  - grade stats, wind alignment proxy
  - recovery_duration_before/after
  - interval_category (see Tag Dictionary)

### A5.3 User prompting (when uncertain)
If the system is uncertain whether a session is interval-based:
- prompt: “Was this an interval session?” with options:
  - `No (race/group/steady)`
  - `Yes (structured intervals)`
  - `Mixed / Not sure`
If `race_day == true`, default `No` unless lap/structure strongly indicates otherwise.


## A6. Interval execution metrics (your “smoothness” + fade + cadence change)
For each interval (and optionally each lap):
- **target_power/pace** (from plan or inferred cluster)
- **steadiness / smoothness score**
  - e.g. coefficient of variation of power within interval
  - time-in-band: % time within ±2%, ±5%, ±10% of target
  - micro-surges count: # of spikes > X% target for >Y seconds
- **fade score**
  - slope of power/pace across interval thirds
  - end_strength: last 20% vs first 20%
- **cadence profile**
  - avg cadence, cadence drift, cadence variability, cadence collapse detection
- **HR response**
  - HR rise slope, peak HR, HR vs power/pace coupling
- **execution label**
  - `met | slightly_high | slightly_low | overcooked | faded | negative_split | strong_finish | inconsistent`


## A7. Canonical tags and labels (applied at workout + interval level)
AIM must attach tags that make the user’s data **searchable like a database**.

### Tag metadata format (proposed)
- tag_id: stable canonical string
- scope: `workout | interval | lap`
- evidence: list of features + thresholds that triggered tag
- confidence: 0..1

Examples:
- `low_cadence_intervals`
- `vo2_intervals`
- `hot_conditions`
- `low_hrv_day`
- `power_fade`
- `strong_finish`


## A8. Cross-source join keys (critical for search + modeling)
- daily_readiness_key (date-local)
- sleep_window_id (last-night sleep episode)
- hrv_window_id (same day or rolling baseline)
- location_cluster_id
- plan_workout_id (if planned)
- nutrition_day_id
- travel_day_id


---

# Working Doc B: AI Insights Specification (What AIM’s AI should produce)

Each insight should have:
- **Name**
- **When to run**: post-activity, daily, weekly, block summary, anomaly trigger
- **Required data**: streams + external sources
- **Output**: short headline + explanation + action + confidence + supporting evidence
- **Search hooks**: tags, filters, and “suggested queries/prompts”

## B1. “Searchable database” experience
AIM should:
1) Structure data so users can run queries like:
   - “show me all low-cadence VO2 sessions done in heat when HRV was low”
2) Recommend prompts (auto-suggest chips) based on what’s in their library:
   - “Compare low-cadence threshold intervals across the last 8 weeks.”
   - “Find sessions with high drift in cool temps and low sleep.”
3) Provide “Why this is recommended” context:
   - “You did 4 low-cadence VO2 sessions in 21–28°C with low HRV; performance varied.”

**Implementation note:** Treat prompts as saved queries over canonical tags + time windows + thresholds (not just free text).


## B2. Key insight families (world-class coach usefulness)

### 1) Conditional performance models (the “moat”)
Goal: quantify how performance/physiology changes with environment + recovery.

Examples (outputs should be personalized):
- Heat penalty curve:
  - “At Z2 output, HR is +X bpm per +5°C above baseline; drift increases by Y%.”
- Sleep/HRV interaction:
  - “When HRV is in bottom quartile, your threshold execution consistency drops; fade risk increases.”
- Humidity / dew point compounding:
  - “High dew point worsens HR drift even when temperature is moderate.”

**How to productize in app:**
- Add “Models” tab for each athlete with 3–6 core models:
  - `Temp → HR drift`
  - `Sleep → EF / execution`
  - `HRV → repeatability`
  - `Fueling → durability`
  - `Altitude → pace/power cost`
- Add post-workout “Model updates” card:
  - “This ride updated your heat model (confidence +0.03).”
- Add “Ask AIM” prompt suggestions that are model-aware:
  - “How did temperature and sleep affect today’s HR drift?”
  - “Was my fade explained by heat, low HRV, or fueling?”

**AI prompt contract (conceptual):**
- AI gets structured dataset + model state
- AI must:
  1) update model parameters (within bounds)
  2) explain changes and uncertainty
  3) suggest next action (training + fueling + recovery)

### 2) Interval execution coaching (precision, not vibes)
Outputs:
- “Your 5×3m VO2 set was inconsistent early (CV 9%), then stabilized (CV 4%). Strong finish.”
- “Cadence decayed by 12 rpm across reps even though power held; suggests muscular fatigue.”
- “You overcooked rep 1 by +6% and paid for it on rep 4–5.”

Include:
- execution score, fade score, smoothness score, cadence drift, HR lag
- recommended adjustment:
  - pacing, gearing, cadence target, recovery length, or fueling timing

### 3) Durability / fatigue resistance (pro-level)
Outputs:
- “Your 5-min power after 25 kJ/kg is 90% of fresh; improves when carbs ≥80 g/hr.”
- “You’re durable in cool temps but fade earlier in heat.”

### 4) Fueling causality (careful, but useful)
Outputs:
- “When carbs start after 40 min, late-ride decoupling spikes.”
- “Under-fueled sessions correlate with cadence collapse and higher perceived effort.”

Must:
- report confidence and note correlation vs causation
- suggest experiments: “Try 90 g/hr for 3 sessions and re-check model.”

### 5) Readiness-to-response (not readiness-to-watts)
Outputs:
- “Today your physiology cost was higher than normal: EF down 6% vs baseline at same power.”
- Tie to sleep debt, HRV suppression, stress, travel, heat

### 6) Technique limiters that emerge under fatigue
Cycling:
- “L/R balance drifted late on climbs; correlates with fade.”
Running:
- “Cadence drop + GCT rise late indicates fatigue signature; consider recovery or strength work.”

### 7) Workout type progression tracking (block-level)
Outputs:
- “Last 6 weeks: VO2 sessions are improving in smoothness and repeatability.”
- “Low-cadence work is trending up in duration but drift is increasing.”

### 8) Anomaly detection with explanations
Trigger: a session is “weird” relative to similar sessions.
Outputs:
- “Same Z2 power as last week but HR +8 bpm. Likely heat + poor sleep.”
- Provide comparable sessions and differences.

### 9) Race-specific insights (don’t misclassify as intervals)
Outputs:
- race power profile analysis: surges, time above FTP, fatigue moments, decision points
- “If this was a TT: pacing strategy; if road race: surge distribution and recovery.”

### 10) Injury risk (specific, not generic)
Running:
- load spikes + downhill pounding + low sleep/HRV
Cycling:
- big load spikes + low recovery + persistent high RPE
Outputs should be framed as “risk window” with actionable mitigation.


## B3. Output format (strongly recommended)
For every insight, AI should return JSON + a human summary.

Example:
- `headline`
- `why_it_matters`
- `evidence` (numbers + comparisons + similar sessions)
- `confidence`
- `recommended_action`
- `suggested_queries` (chips)


---

# Canonical Tag Dictionary (Starter)

## Tag structure
- tag_id (snake_case)
- scope: workout / interval / lap
- sport: cycling / running / both
- definition
- detection rules (signals + thresholds)
- related tags (for search suggestions)

## Cycling: workout-level tags
- `race_day`
- `group_ride`
- `indoor_trainer`
- `endurance_steady`
- `tempo_ride`
- `sweet_spot_session`
- `threshold_session`
- `vo2_session`
- `anaerobic_session`
- `neuromuscular_session`
- `low_cadence_session`
- `high_cadence_session`
- `climbing_focus`
- `rolling_surge_ride`
- `hot_conditions`
- `cold_conditions`
- `high_wind_conditions`
- `high_drift`
- `low_hrv_day`
- `poor_sleep_day`
- `underfueled`
- `overreached_signal`
- `data_quality_issue`

## Cycling: interval-level tags
- `vo2_interval`
- `threshold_interval`
- `sweet_spot_interval`
- `anaerobic_interval`
- `sprint_interval`
- `low_cadence_interval`
- `high_cadence_interval`
- `climb_interval`
- `headwind_interval`
- `overcooked_start`
- `power_fade`
- `strong_finish`
- `inconsistent_power`
- `cadence_decay`
- `cadence_collapse`
- `hr_lag_slow`
- `hr_recovery_fast`

## Running: workout-level tags
- `race_day`
- `treadmill`
- `trail_run`
- `track_session`
- `easy_run`
- `tempo_run`
- `threshold_run`
- `vo2_run`
- `hill_repeats`
- `long_run`
- `hot_conditions`
- `high_drift`
- `low_hrv_day`
- `poor_sleep_day`
- `impact_heavy` (downhill + hard surface proxy)

## Running: interval-level tags
- `vo2_interval`
- `threshold_interval`
- `hill_interval`
- `negative_split`
- `pace_fade`
- `cadence_drop`
- `gct_rise` (if available)
- `inconsistent_pacing`


---

# Product UX: prompts + autosuggestions (how users discover the database)

## Prompt templates (chips)
AIM should surface 6–12 “smart chips” based on the user’s data.
Examples:
- “Compare my low-cadence VO2 sessions in the last 8 weeks.”
- “Show sessions where HR drift was high but temperature was cool.”
- “What’s my heat penalty at endurance vs threshold?”
- “Find workouts where I faded late and look for shared causes.”
- “Show my best threshold execution days and what was different.”
- “How does sleep affect my interval smoothness?”

## “Explain the suggestion”
Always tell the user why:
- “You’ve done 7 low-cadence VO2 workouts; 4 were in warm temps; outcomes varied.”


---

# Engineering notes / recommendations (for Claude Code parsing)

## 1) Build the semantic layer first
- Normalize streams → compute base metrics → detect structure → attach tags → persist in DB.
- Treat AI as the interpreter and model-updater, not the calculator for fundamentals like NP/IF/TSS.

## 2) Database schema priorities
- Activity table (session-level)
- Interval table (many-to-one with activity)
- Tag join tables (activity_tags, interval_tags)
- External context table (weather, sleep, HRV, travel, nutrition)
- Model state table (heat model, sleep model, etc.)

## 3) Model-building approach
- Start with simple regressions / mixed-effects / Bayesian updates for:
  - temp → HR drift
  - sleep/HRV → execution + drift
  - fueling → durability
- AI can explain and propose experiments, but parameter updates should be bounded and auditable.

## 4) “Was this intervals?” prompt logic
- If race_day: default no
- If lap structure suggests repeats OR algorithmic interval detection confidence high: tag as intervals
- Else: ask user with one-tap question


---

# Answer to: “Is this how you’d go about this?” + extra ideas

Yes: creating two working docs (structured data spec + AI insights spec) is exactly right. Claude Code can convert these into:
- DB schema + pipelines
- tagging + interval extraction
- insights catalog prompts + output contracts

Extra recommendations:
1) **Make tags canonical and finite.** Otherwise you’ll drown in synonyms and lose searchability.
2) **Separate “calculation” from “interpretation.”** Hard metrics (TSS, drift, smoothness, fade) are deterministic; AI should explain and recommend.
3) **Store evidence for every tag/insight.** Users trust numbers, and you’ll need debuggability.
4) **Confidence everywhere.** For inferred weather, inferred TSS, inferred intervals, etc.
5) **Similarity search (must-have).** Every insight should link “similar workouts” to compare conditions and outcomes.
6) **Coach mode vs athlete mode.** Same data, different language and depth.

