import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown, Calendar } from "lucide-react";
import { T } from "../theme/tokens";
import { useActivityBrowser } from "../hooks/useActivityBrowser";

const font = "'Outfit', sans-serif";
const mono = "'JetBrains Mono', monospace";

const TIME_PERIODS = [
  { id: "week", label: "7 Days" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Helpers ──

function formatDuration(sec) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function metersToMiles(m) {
  return (m / 1609.344).toFixed(1);
}

function groupActivities(activities, timePeriod) {
  const groups = new Map();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

  for (const act of activities) {
    const date = new Date(act.started_at);
    let key;

    if (timePeriod === "week" || timePeriod === "month") {
      const actDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const actTime = actDate.getTime();
      if (actTime === today.getTime()) {
        key = "Today";
      } else if (actTime === yesterday.getTime()) {
        key = "Yesterday";
      } else if (actDate >= mondayThisWeek) {
        key = "This Week";
      } else if (actDate >= mondayLastWeek) {
        key = "Last Week";
      } else {
        key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      }
    } else {
      key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(act);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

// ── ActivityRow ──

function ActivityRow({ activity, isSelected, onSelect }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={() => onSelect(activity.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 14px",
        background: isSelected ? T.accentDim : hover ? T.cardHover : "transparent",
        border: "none",
        borderLeft: isSelected ? `2px solid ${T.accent}` : "2px solid transparent",
        borderBottom: `1px solid ${T.border}`,
        cursor: "pointer",
        fontFamily: font,
        textAlign: "left",
        transition: "background 0.15s",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isSelected ? T.accent : T.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activity.name || "Untitled Ride"}
        </div>
        <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>
          {new Date(activity.started_at).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          flexShrink: 0,
          marginLeft: 12,
        }}
      >
        <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 600, color: T.text }}>
          {formatDuration(activity.duration_seconds)}
        </span>
        <div style={{ display: "flex", gap: 8, fontSize: 10, color: T.textSoft, fontFamily: mono }}>
          {activity.distance_meters > 0 && <span>{metersToMiles(activity.distance_meters)} mi</span>}
          {activity.tss > 0 && <span>{Math.round(activity.tss)} TSS</span>}
          {activity.avg_power_watts > 0 && <span>{Math.round(activity.avg_power_watts)}W</span>}
        </div>
      </div>
    </button>
  );
}

// ── ActivityBrowser (popover) ──

export default function ActivityBrowser({ isOpen, onClose, selectedActivityId, onSelectActivity, anchorRef }) {
  const {
    activities,
    loading,
    hasMore,
    timePeriod,
    setTimePeriod,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    oldestYear,
    searchQuery,
    setSearchQuery,
    loadMore,
  } = useActivityBrowser({ enabled: isOpen });

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= oldestYear; y--) yearOptions.push(y);

  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groups = groupActivities(activities, searchQuery ? "all" : timePeriod);

  const handleSelect = (id) => {
    onSelectActivity(id);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: 8,
        width: 380,
        maxHeight: "calc(100vh - 120px)",
        background: T.card,
        border: `1px solid ${T.borderHover}`,
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: font }}>
            Activity Browser
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.textDim,
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: T.textDim,
            }}
          />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px 8px 32px",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 11,
              color: T.text,
              fontFamily: font,
              outline: "none",
            }}
          />
        </div>

        {/* Time Period Pills */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {TIME_PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setTimePeriod(p.id)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                fontFamily: font,
                border: "none",
                cursor: "pointer",
                background: timePeriod === p.id ? T.accentDim : T.surface,
                color: timePeriod === p.id ? T.accent : T.textSoft,
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Month + Year sub-selectors */}
        {(timePeriod === "month" || timePeriod === "year") && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {timePeriod === "month" && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: font,
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  color: T.text,
                  cursor: "pointer",
                  outline: "none",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' fill='none' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                  paddingRight: 24,
                }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            )}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: font,
                border: `1px solid ${T.border}`,
                background: T.surface,
                color: T.text,
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' fill='none' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                paddingRight: 24,
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {groups.map((group) => (
          <div key={group.label}>
            {/* Section Header */}
            <div
              style={{
                padding: "8px 16px",
                fontSize: 10,
                fontWeight: 700,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background: T.surface,
                borderBottom: `1px solid ${T.border}`,
                position: "sticky",
                top: 0,
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: font,
              }}
            >
              <span>{group.label}</span>
              <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                {group.items.length} {group.items.length === 1 ? "ride" : "rides"}
              </span>
            </div>

            {/* Activity Rows */}
            {group.items.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                isSelected={a.id === selectedActivityId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              background: "transparent",
              cursor: loading ? "default" : "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: T.accent,
              fontFamily: font,
            }}
          >
            {loading ? "Loading..." : "Load More Activities"}
          </button>
        )}

        {/* Loading spinner for initial load */}
        {loading && activities.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 11, color: T.textDim }}>
            Loading activities...
          </div>
        )}

        {/* Empty State */}
        {!loading && activities.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 11, color: T.textDim }}>
            {searchQuery ? `No activities matching "${searchQuery}"` : "No activities in this period"}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: `1px solid ${T.border}`,
          fontSize: 10,
          color: T.textDim,
          flexShrink: 0,
          fontFamily: font,
        }}
      >
        {activities.length} activities{hasMore ? "+" : ""}
      </div>
    </div>
  );
}

// Also export the trigger button for use in Dashboard
export function ActivityBrowserTrigger({ isOpen, onClick, triggerRef }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      ref={triggerRef}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: hover ? T.cardHover : T.card,
        border: `1px solid ${isOpen ? T.accent : hover ? T.borderHover : T.border}`,
        padding: "6px 12px",
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 600,
        color: T.text,
        cursor: "pointer",
        fontFamily: font,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <Calendar size={12} color={T.textSoft} />
      Browse Activities
      <ChevronDown
        size={11}
        color={T.textSoft}
        style={{
          transform: isOpen ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}
