import { useState, useEffect, useCallback } from "react";
import { T, font, mono } from "../theme/tokens";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all", label: "All time" },
];

const TIER_COLORS = { free: T.textSoft, starter: T.blue, pro: T.accent, elite: T.purple };
const MODEL_COLORS = { "claude-opus-4-6": T.purple, "claude-sonnet-4-6": T.blue, "claude-haiku-3-5-20241022": T.accent };
const TIER_PRICES = { free: 0, starter: 19, pro: 49, elite: 99 };

function fmt$(v) { return "$" + (v || 0).toFixed(2); }
function fmtPct(v) { return (v || 0).toFixed(1) + "%"; }
function fmtK(v) { return v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(1) + "K" : String(v); }

// ── Password Gate ──
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/token-usage?range=7d", {
        headers: { "x-admin-password": pw },
      });
      if (res.ok) {
        sessionStorage.setItem("admin_pw", pw);
        onAuth(pw);
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Connection error");
    }
  };
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <form onSubmit={handleSubmit} style={{ background: T.card, padding: 40, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", maxWidth: 400, width: "100%" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, color: T.text }}>Admin Dashboard</h1>
        <p style={{ margin: "0 0 24px", color: T.textSoft, fontSize: 14 }}>Enter the admin password to continue.</p>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus
          placeholder="Password"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, fontFamily: font, boxSizing: "border-box", marginBottom: 16 }}
        />
        {error && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <button type="submit" style={{ width: "100%", padding: 12, background: T.gradient, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Sign In
        </button>
      </form>
    </div>
  );
}

// ── KPI Card ──
function KPICard({ label, value, sub, color }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, padding: "20px 24px", border: `1px solid ${T.border}`, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: T.textSoft, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: color || T.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.textSoft, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── CSV Export ──
function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map((row) => keys.map((k) => {
    const v = row[k];
    return typeof v === "string" && v.includes(",") ? `"${v}"` : v ?? "";
  }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function ExportButton({ data, filename, label }) {
  return (
    <button
      onClick={() => exportCSV(data, filename)}
      style={{ padding: "6px 14px", fontSize: 12, fontFamily: font, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", color: T.textSoft }}
    >
      {label || "Export CSV"}
    </button>
  );
}

// ── Section Header ──
function SectionHeader({ title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{title}</h2>
      {right}
    </div>
  );
}

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: font, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginTop: 2 }}>
          {p.name}: {typeof p.value === "number" && p.name.toLowerCase().includes("cost") ? fmt$(p.value) : fmtK(p.value)}
        </div>
      ))}
    </div>
  );
}

// ── Main Admin Dashboard ──
export default function Admin() {
  const [password, setPassword] = useState(sessionStorage.getItem("admin_pw") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("30d");
  const [featureFilter, setFeatureFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const fetchData = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (featureFilter) params.set("feature", featureFilter);
      if (tierFilter) params.set("tier", tierFilter);
      const res = await fetch(`/api/admin/token-usage?${params}`, {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Admin fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [password, range, featureFilter, tierFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!password) return <PasswordGate onAuth={setPassword} />;
  if (!data) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, color: T.textSoft }}>Loading...</div>;

  const { summary, dailyTimeline, featureStats, modelBreakdown, tierStats, topUsers } = data;

  // Filtered top users by search
  const filteredUsers = userSearch
    ? topUsers.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.user_id.includes(userSearch))
    : topUsers;

  // Scatter plot data for tier view
  const scatterData = [];
  for (const [t, stats] of Object.entries(tierStats)) {
    for (const u of stats.users) {
      scatterData.push({ tier: t, name: u.name, cost: Math.round(u.cost * 100) / 100, calls: u.calls });
    }
  }

  // Feature list for filter
  const allFeatures = featureStats.map((f) => f.feature);

  // Pie data for model breakdown
  const pieData = modelBreakdown.map((m) => ({
    name: m.model.replace("claude-", "").replace("-20241022", ""),
    value: Math.round(m.totalCost * 100) / 100,
    fullModel: m.model,
    calls: m.calls,
    pct: m.pctOfCost,
  }));

  // Gross margin color
  const marginColor = summary.grossMargin >= 70 ? T.accent : summary.grossMargin >= 50 ? T.amber : T.danger;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, padding: "24px 24px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.text }}>
              <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M Admin
            </h1>
            <p style={{ margin: "4px 0 0", color: T.textSoft, fontSize: 14 }}>Claude API Usage & Cost Analytics</p>
          </div>
          <button onClick={() => { sessionStorage.removeItem("admin_pw"); setPassword(""); }} style={{ padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer", color: T.textSoft }}>
            Sign Out
          </button>
        </div>

        {/* Filters Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          {RANGES.map((r) => (
            <button
              key={r.value} onClick={() => setRange(r.value)}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontFamily: font, cursor: "pointer", border: "none",
                background: range === r.value ? T.accent : T.card,
                color: range === r.value ? "#fff" : T.textSoft,
                fontWeight: range === r.value ? 600 : 400,
                boxShadow: range === r.value ? "none" : `0 0 0 1px ${T.border}`,
              }}
            >
              {r.label}
            </button>
          ))}
          <select
            value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: font, background: T.card, color: T.text }}
          >
            <option value="">All features</option>
            {allFeatures.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: font, background: T.card, color: T.text }}
          >
            <option value="">All tiers</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
          {loading && <span style={{ color: T.textDim, fontSize: 13, alignSelf: "center" }}>Refreshing...</span>}
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
          <KPICard label="Total AI Spend" value={fmt$(summary.totalCost)} sub={`${fmtK(summary.totalCalls)} API calls`} color={T.text} />
          <KPICard label="Est. Monthly Revenue" value={fmt$(summary.estimatedMonthlyRevenue)} sub={`${summary.activeUsers} active users`} color={T.blue} />
          <KPICard label="Gross Margin" value={fmtPct(summary.grossMargin)} sub={`${fmt$(summary.estimatedMonthlyRevenue - summary.totalCost)} net`} color={marginColor} />
          <KPICard label="Cost / Active User" value={fmt$(summary.avgCostPerUser)} sub={`${fmtK(Math.round(summary.totalCalls / Math.max(summary.activeUsers, 1)))} calls/user`} />
          <KPICard label="Avg Cost / Call" value={fmt$(summary.totalCalls > 0 ? summary.totalCost / summary.totalCalls : 0)} sub={`${fmtK(summary.totalInput + summary.totalOutput)} total tokens`} />
        </div>

        {/* Row 1: Daily Spend + Model Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Daily Spend Chart */}
          <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}` }}>
            <SectionHeader title="Daily AI Spend" right={<ExportButton data={dailyTimeline} filename="daily-spend.csv" />} />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTimeline}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.textDim }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: T.textDim }} tickFormatter={(v) => "$" + v.toFixed(0)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="cost" name="Cost" stroke={T.accent} fill="url(#costGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Model Breakdown Pie */}
          <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}` }}>
            <SectionHeader title="Cost by Model" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.fullModel} fill={MODEL_COLORS[entry.fullModel] || T.textSoft} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt$(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              {modelBreakdown.map((m) => (
                <div key={m.model} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSoft, padding: "4px 0" }}>
                  <span>{m.model.replace("claude-", "")}</span>
                  <span style={{ fontFamily: mono }}>{fmt$(m.totalCost)} ({fmtPct(m.pctOfCost)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Feature Economics */}
        <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}`, marginBottom: 32 }}>
          <SectionHeader
            title="Feature Economics"
            right={<ExportButton data={featureStats.map((f) => ({ ...f, totalCost: f.totalCost.toFixed(4), avgCostPerCall: f.avgCostPerCall.toFixed(4), pctOfTotal: f.pctOfTotal.toFixed(1) }))} filename="feature-economics.csv" />}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={Math.max(featureStats.length * 36, 200)}>
              <BarChart data={featureStats} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis type="number" tick={{ fontSize: 11, fill: T.textDim }} tickFormatter={(v) => "$" + v.toFixed(2)} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: T.textSoft }} width={120} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="totalCost" name="Total Cost" fill={T.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                    {["Feature", "Model", "Calls", "Avg In", "Avg Out", "Cost", "$/Call", "% Total"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: T.textSoft, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureStats.map((f) => (
                    <tr key={f.feature} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 10px", fontWeight: 500, color: T.text }}>{f.feature}</td>
                      <td style={{ padding: "8px 10px", color: T.textSoft, fontSize: 11 }}>{f.model.replace("claude-", "")}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.text }}>{fmtK(f.calls)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmtK(f.avgInput)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmtK(f.avgOutput)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, fontWeight: 600, color: T.text }}>{fmt$(f.totalCost)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmt$(f.avgCostPerCall)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmtPct(f.pctOfTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 3: Tier Economics */}
        <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}`, marginBottom: 32 }}>
          <SectionHeader
            title="Tier Economics"
            right={<ExportButton data={Object.entries(tierStats).map(([t, s]) => ({ tier: t, users: s.userCount, totalCost: s.totalCost.toFixed(2), avgCost: s.avgCostPerUser.toFixed(2), medianCost: s.medianCostPerUser.toFixed(2), maxCost: s.maxCostPerUser.toFixed(2), minCost: s.minCostPerUser.toFixed(2), revenue: s.revenuePerUser, margin: s.marginPerUser.toFixed(2) }))} filename="tier-economics.csv" />}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Tier stats cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["free", "starter", "pro", "elite"].map((t) => {
                const s = tierStats[t];
                if (!s) return null;
                const margin = s.revenuePerUser > 0 ? ((s.revenuePerUser - s.avgCostPerUser) / s.revenuePerUser) * 100 : (s.avgCostPerUser > 0 ? -100 : 0);
                return (
                  <div key={t} style={{ background: T.surface, borderRadius: 10, padding: "16px 20px", borderLeft: `4px solid ${TIER_COLORS[t]}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: T.text, textTransform: "capitalize" }}>{t}</span>
                      <span style={{ fontSize: 12, color: T.textSoft }}>{s.userCount} users / {fmtK(s.totalCalls)} calls</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                      {[
                        ["Revenue", fmt$(s.revenuePerUser) + "/mo"],
                        ["Avg Cost", fmt$(s.avgCostPerUser)],
                        ["Median", fmt$(s.medianCostPerUser)],
                        ["Max", fmt$(s.maxCostPerUser)],
                        ["Margin", fmtPct(margin)],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase" }}>{label}</div>
                          <div style={{ fontSize: 14, fontFamily: mono, fontWeight: 600, color: label === "Margin" ? (margin >= 50 ? T.accent : margin >= 0 ? T.amber : T.danger) : T.text }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scatter plot */}
            <div>
              <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis type="number" dataKey="calls" name="Calls" tick={{ fontSize: 11, fill: T.textDim }} label={{ value: "API Calls", position: "bottom", fontSize: 11, fill: T.textSoft }} />
                  <YAxis type="number" dataKey="cost" name="Cost" tick={{ fontSize: 11, fill: T.textDim }} tickFormatter={(v) => "$" + v.toFixed(0)} label={{ value: "Cost ($)", angle: -90, position: "insideLeft", fontSize: 11, fill: T.textSoft }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: font, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div style={{ color: T.textSoft }}>Tier: <span style={{ color: TIER_COLORS[d.tier], fontWeight: 600, textTransform: "capitalize" }}>{d.tier}</span></div>
                          <div style={{ color: T.textSoft }}>Calls: {d.calls} / Cost: {fmt$(d.cost)}</div>
                        </div>
                      );
                    }}
                  />
                  {["free", "starter", "pro", "elite"].map((t) => (
                    <Scatter key={t} name={t} data={scatterData.filter((d) => d.tier === t)} fill={TIER_COLORS[t]} opacity={0.8} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 4: Daily Calls + Tokens chart */}
        <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}`, marginBottom: 32 }}>
          <SectionHeader title="Daily Call Volume & Token Usage" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.textDim }} tickFormatter={(d) => d.slice(5)} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: T.textDim }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: T.textDim }} tickFormatter={fmtK} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="calls" name="Calls" fill={T.blue} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="input" name="Input Tokens" fill={T.accent} opacity={0.5} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="output" name="Output Tokens" fill={T.purple} opacity={0.5} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 5: Top Users */}
        <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}`, marginBottom: 32 }}>
          <SectionHeader
            title="Top Users by Spend"
            right={
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: font, width: 200 }}
                />
                <ExportButton
                  data={filteredUsers.map((u) => ({ name: u.name, tier: u.tier, calls: u.calls, input_tokens: u.input, output_tokens: u.output, cost: u.cost.toFixed(4), revenue: TIER_PRICES[u.tier] || 0, margin: ((TIER_PRICES[u.tier] || 0) - u.cost).toFixed(2) }))}
                  filename="top-users.csv"
                />
              </div>
            }
          />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {["#", "User", "Tier", "Calls", "Input Tokens", "Output Tokens", "AI Cost", "Revenue", "Margin", "% of Total"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: T.textSoft, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => {
                  const rev = TIER_PRICES[u.tier] || 0;
                  const margin = rev - u.cost;
                  const pct = summary.totalCost > 0 ? (u.cost / summary.totalCost) * 100 : 0;
                  return (
                    <tr key={u.user_id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 10px", color: T.textDim }}>{i + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 500, color: T.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: TIER_COLORS[u.tier] + "18", color: TIER_COLORS[u.tier], padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{u.tier}</span>
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: mono }}>{fmtK(u.calls)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmtK(u.input)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmtK(u.output)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, fontWeight: 600 }}>{fmt$(u.cost)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.blue }}>{fmt$(rev)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, fontWeight: 600, color: margin >= 0 ? T.accent : T.danger }}>{fmt$(margin)}</td>
                      <td style={{ padding: "8px 10px", fontFamily: mono, color: T.textSoft }}>{fmtPct(pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 6: Profitability Thresholds */}
        <div style={{ background: T.card, borderRadius: 12, padding: 24, border: `1px solid ${T.border}`, marginBottom: 32 }}>
          <SectionHeader title="Profitability Analysis" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {["free", "starter", "pro", "elite"].map((t) => {
              const s = tierStats[t];
              if (!s) return (
                <div key={t} style={{ background: T.surface, borderRadius: 10, padding: 20, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, textTransform: "capitalize", marginBottom: 8, color: TIER_COLORS[t] }}>{t}</div>
                  <div style={{ color: T.textDim, fontSize: 13 }}>No data</div>
                </div>
              );
              const rev = TIER_PRICES[t];
              const breakEven = s.avgCostPerUser > 0 ? rev / s.avgCostPerUser : Infinity;
              const maxSafe = rev * 0.7; // 70% margin target
              const usersUnprofitable = s.users.filter((u) => u.cost > rev).length;
              return (
                <div key={t} style={{ background: T.surface, borderRadius: 10, padding: 20 }}>
                  <div style={{ fontWeight: 700, textTransform: "capitalize", marginBottom: 12, color: TIER_COLORS[t], fontSize: 15 }}>{t}</div>
                  <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 6 }}>
                    Revenue: <span style={{ fontFamily: mono, color: T.text }}>{fmt$(rev)}/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 6 }}>
                    Max cost for 70% margin: <span style={{ fontFamily: mono, color: T.text }}>{fmt$(maxSafe)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 6 }}>
                    Break-even multiplier: <span style={{ fontFamily: mono, color: T.text }}>{breakEven === Infinity ? "N/A" : breakEven.toFixed(1) + "x"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: usersUnprofitable > 0 ? T.danger : T.accent, fontWeight: 600, marginTop: 8 }}>
                    {usersUnprofitable > 0 ? `${usersUnprofitable} user${usersUnprofitable > 1 ? "s" : ""} over cost` : "All users profitable"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
