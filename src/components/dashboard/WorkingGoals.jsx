import { useState, useEffect } from "react";
import { T, font, mono } from "../../theme/tokens";
import { supabase } from "../../lib/supabase";

// ── STATUS CONFIG ──
const statusConfig = {
  on_track: { label: "On Track", color: T.accent },
  ahead: { label: "Ahead", color: T.blue },
  behind: { label: "Behind", color: T.orange },
  stalled: { label: "Stalled", color: T.danger },
};

// ── STATUS BADGE ──
const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.on_track;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "2px 8px",
        borderRadius: 10,
        color: cfg.color,
        background: `${cfg.color}14`,
        fontFamily: font,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
};

// ── PROGRESS BAR ──
const ProgressBar = ({ current, start, target, color = T.accent }) => {
  const range = target - start;
  const progress = range !== 0 ? ((current - start) / range) * 100 : 0;
  const pct = Math.min(Math.max(progress, 0), 100);
  return (
    <div
      style={{
        position: "relative",
        height: 4,
        borderRadius: 2,
        background: T.surface,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 2,
          background: color,
          width: `${pct}%`,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
};

// ── SPARKLINE ──
const Sparkline = ({ data, color = T.accent, width = 80, height = 24 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data) * 1.05;
  const min = Math.min(...data) * 0.95;
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const lastX = width;
  const lastY =
    height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
};

// ── CHECK ITEM ──
const CheckItem = ({ done, text }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 0",
    }}
  >
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        flexShrink: 0,
        border: `1.5px solid ${done ? T.accent : T.border}`,
        background: done ? T.accent : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
      }}
    >
      {done && (
        <svg width={10} height={10}>
          <polyline
            points="2,5 4.5,8 8,3"
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
    <span
      style={{
        fontSize: 12,
        color: done ? T.textDim : T.text,
        fontFamily: font,
        textDecoration: done ? "line-through" : "none",
        opacity: done ? 0.7 : 1,
      }}
    >
      {text}
    </span>
  </div>
);

// ── TYPE ICONS FOR ACTION PLAN ──
const typeIcons = {
  workout: "\uD83C\uDFCB\uFE0F",
  recovery: "\uD83E\uDDD8",
  strength: "\uD83D\uDCAA",
  supplement: "\uD83D\uDC8A",
  habit: "\uD83D\uDD04",
  environment: "\uD83C\uDFE0",
  equipment: "\uD83D\uDD27",
  per_session: "\u26A1",
};

const freqLabels = {
  weekly: "Weekly",
  "3x_week": "3\u00D7/week",
  daily: "Daily",
  every_ride: "Every ride",
  post_ride: "Post-ride",
  once: "One-time",
  per_session: "Per session",
  ongoing: "Ongoing",
};

// ── GOAL CARD ──
const GoalCard = ({ goal, expanded, onToggle, isMobile }) => {
  const [activeSection, setActiveSection] = useState("plan");

  const current = goal.metric_current;
  const start = goal.metric_start;
  const target = goal.metric_target;
  const unit = goal.metric_unit || "";
  const color = goal.color || T.accent;
  const range = target - start;
  const progressPct =
    range !== 0 ? Math.round(((current - start) / range) * 100) : 0;

  const tabs = [
    { key: "plan", label: "Action Plan" },
    { key: "why", label: "Why It Matters" },
    { key: "week", label: "This Week" },
  ];

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${expanded ? color + "25" : T.border}`,
        background: T.card,
        overflow: "hidden",
        transition: "all 0.2s ease",
        marginBottom: 10,
        boxShadow: expanded ? `0 2px 12px ${color}08` : "none",
      }}
    >
      {/* Collapsed header — always visible */}
      <div
        onClick={onToggle}
        style={{ padding: isMobile ? "12px 14px" : "14px 16px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Icon circle */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${color}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {goal.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title + badge row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 2,
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                  fontFamily: font,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {goal.title}
              </span>
              <StatusBadge status={goal.status} />
            </div>

            {/* Metric row: current -> target + sparkline */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 18,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                {current}
              </span>
              <span style={{ fontSize: 12, color: T.textDim }}>{unit}</span>
              <span
                style={{ fontSize: 12, color: T.textDim, userSelect: "none" }}
              >
                {"\u2192"}
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 14,
                  fontWeight: 600,
                  color: color,
                }}
              >
                {target}
                {unit}
              </span>
              <div style={{ marginLeft: "auto" }}>
                <Sparkline
                  data={goal.trend}
                  color={color}
                  width={isMobile ? 60 : 80}
                  height={24}
                />
              </div>
            </div>

            {/* Progress bar + percentage */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ProgressBar
                  current={current}
                  start={start}
                  target={target}
                  color={color}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: color,
                  fontFamily: mono,
                  flexShrink: 0,
                }}
              >
                {Math.min(Math.max(progressPct, 0), 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              borderTop: `1px solid ${T.border}`,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveSection(t.key)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  border: "none",
                  background: "none",
                  borderBottom: `2px solid ${
                    activeSection === t.key ? color : "transparent"
                  }`,
                  color: activeSection === t.key ? T.text : T.textDim,
                  fontSize: 12,
                  fontWeight: activeSection === t.key ? 600 : 500,
                  cursor: "pointer",
                  fontFamily: font,
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: isMobile ? "12px 14px" : "14px 16px" }}>
            {/* ACTION PLAN TAB */}
            {activeSection === "plan" && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: color,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 10,
                    fontFamily: font,
                  }}
                >
                  How we're fixing this
                </div>
                {Array.isArray(goal.action_plan) &&
                  goal.action_plan.map((action, i) => {
                    const actionLabel =
                      typeof action === "string" ? action : action.label || action.text || "";
                    const actionType =
                      typeof action === "string" ? null : action.type;
                    const actionFreq =
                      typeof action === "string" ? null : action.frequency;
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "10px 12px",
                          marginBottom: 4,
                          borderRadius: 8,
                          background: i % 2 === 0 ? T.surface : "transparent",
                        }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {(actionType && typeIcons[actionType]) || "\uD83D\uDCCC"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: T.text,
                              lineHeight: 1.5,
                              fontFamily: font,
                            }}
                          >
                            {actionLabel}
                          </div>
                          {actionFreq && (
                            <div
                              style={{
                                fontSize: 10,
                                color: T.textDim,
                                marginTop: 2,
                                fontFamily: font,
                              }}
                            >
                              {freqLabels[actionFreq] || actionFreq}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {(!goal.action_plan || goal.action_plan.length === 0) && (
                  <div
                    style={{
                      fontSize: 13,
                      color: T.textDim,
                      fontFamily: font,
                      padding: "8px 0",
                    }}
                  >
                    No action items yet.
                  </div>
                )}
              </div>
            )}

            {/* WHY IT MATTERS TAB */}
            {activeSection === "why" && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: color,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 10,
                    fontFamily: font,
                  }}
                >
                  Why this matters for your performance
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: T.text,
                    lineHeight: 1.7,
                    fontFamily: font,
                    margin: 0,
                  }}
                >
                  {goal.why_it_matters || "No explanation provided yet."}
                </p>
                {goal.metric_label && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: `${color}08`,
                      border: `1px solid ${color}14`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: T.textDim,
                        fontFamily: font,
                      }}
                    >
                      Tracking:
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.text,
                        fontFamily: font,
                      }}
                    >
                      {goal.metric_label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* THIS WEEK TAB */}
            {activeSection === "week" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: color,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontFamily: font,
                    }}
                  >
                    This week's checklist
                  </span>
                  {Array.isArray(goal.this_week) && goal.this_week.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: T.textDim,
                        fontFamily: font,
                      }}
                    >
                      {goal.this_week.filter((t) => t.done).length}/
                      {goal.this_week.length} done
                    </span>
                  )}
                </div>

                {/* Checklist items */}
                <div style={{ marginBottom: 14 }}>
                  {Array.isArray(goal.this_week) &&
                    goal.this_week.map((item, i) => (
                      <CheckItem
                        key={i}
                        done={item.done}
                        text={item.text}
                      />
                    ))}
                  {(!goal.this_week || goal.this_week.length === 0) && (
                    <div
                      style={{
                        fontSize: 13,
                        color: T.textDim,
                        fontFamily: font,
                        padding: "8px 0",
                      }}
                    >
                      No tasks for this week yet.
                    </div>
                  )}
                </div>

                {/* AI observation note */}
                {goal.ai_note && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: `${color}08`,
                      border: `1px solid ${color}14`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: T.text,
                          fontFamily: font,
                        }}
                      >
                        {"\u2726"} AIM observation
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: T.textSoft,
                        lineHeight: 1.6,
                        fontFamily: font,
                        margin: 0,
                      }}
                    >
                      {goal.ai_note}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── WORKING GOALS (DEFAULT EXPORT) ──
export default function WorkingGoals({ goals, isMobile }) {
  const [expandedGoal, setExpandedGoal] = useState(null);

  // Auto-expand the first goal when goals load
  useEffect(() => {
    if (Array.isArray(goals) && goals.length > 0 && expandedGoal === null) {
      setExpandedGoal(goals[0].id);
    }
  }, [goals]);

  const hasGoals = Array.isArray(goals) && goals.length > 0;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: T.text,
            fontFamily: font,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Working Goals
        </h3>
        {hasGoals && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.textDim,
              fontFamily: font,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {goals.length} active
          </span>
        )}
      </div>

      {/* Goal cards */}
      {hasGoals &&
        goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            expanded={expandedGoal === goal.id}
            onToggle={() =>
              setExpandedGoal(expandedGoal === goal.id ? null : goal.id)
            }
            isMobile={isMobile}
          />
        ))}

      {/* Empty state */}
      {!hasGoals && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: T.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: 22,
            }}
          >
            {"\uD83C\uDFAF"}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.text,
              fontFamily: font,
              marginBottom: 6,
            }}
          >
            No active goals yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.textSoft,
              fontFamily: font,
              lineHeight: 1.5,
              maxWidth: 280,
              margin: "0 auto",
            }}
          >
            AIM will suggest goals as it learns your data.
          </div>
        </div>
      )}
    </div>
  );
}
