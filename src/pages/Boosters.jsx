import { useState } from "react";
import { T, font, mono } from "../theme/tokens";
import { boosters, catColors, catLabels } from "../data/boosters";
import { useResponsive } from "../hooks/useResponsive";
import { Menu, X } from "lucide-react";

// ── CONFIDENCE BADGE ──
function ConfidenceBadge({ level }) {
  const configs = {
    "strong": { label: "Strong Evidence", color: T.accent, bg: "rgba(0,229,160,0.1)" },
    "strong-sprint": { label: "Strong for Sprints · Mixed for Endurance", color: T.amber, bg: "rgba(245,158,11,0.1)" },
    "moderate": { label: "Moderate Evidence", color: T.amber, bg: "rgba(245,158,11,0.1)" },
    "emerging": { label: "Emerging Research", color: T.textSoft, bg: "rgba(148,149,165,0.1)" },
  };
  const c = configs[level] || configs.moderate;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, background: c.bg, fontSize: 11, fontWeight: 600, color: c.color, letterSpacing: "0.01em" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
      {c.label}
    </span>
  );
}

// ── STUDY CARD ──
function StudyCard({ study }) {
  return (
    <a href={study.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "12px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, textDecoration: "none", transition: "all 0.2s", cursor: "pointer" }}
      onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.4 }}>{study.title}</div>
      <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6 }}>{study.authors} ({study.year}) · {study.journal}</div>
      <div style={{ fontSize: 11, color: T.textSoft, lineHeight: 1.5, fontStyle: "italic" }}>→ {study.finding}</div>
    </a>
  );
}

// ── RECIPE CARD ──
function RecipeCard({ recipe }) {
  return (
    <div style={{ padding: "12px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{recipe.name}</span>
        <span style={{ fontSize: 10, color: T.textDim }}>⏱ {recipe.time}</span>
      </div>
      <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.5 }}>{recipe.ingredients}</div>
    </div>
  );
}

// ── BOOSTER DETAIL MODAL ──
function BoosterDetail({ booster, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { isMobile } = useResponsive();
  const color = catColors[booster.category];
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "protocol", label: "Protocol" },
    { id: "risks", label: "Risks" },
    { id: "science", label: `Research (${booster.studies.length})` },
    ...(booster.recipes.length ? [{ id: "recipes", label: "Recipes" }] : []),
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}
      onClick={onClose}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />
      {/* Modal */}
      <div style={{ position: "relative", width: "100%", maxWidth: isMobile ? "100%" : 720, maxHeight: isMobile ? "100vh" : "85vh", height: isMobile ? "100vh" : "auto", background: T.card, borderRadius: isMobile ? 0 : 20, border: isMobile ? "none" : `1px solid ${T.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>
        {/* Top accent line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />

        {/* Header */}
        <div style={{ padding: isMobile ? "16px 16px 0" : "24px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: isMobile ? 24 : 28 }}>{booster.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", fontFamily: font }}>{booster.title}</h2>
                  <p style={{ fontSize: isMobile ? 12 : 14, color: T.textSoft, margin: "4px 0 0" }}>{booster.subtitle}</p>
                </div>
              </div>
              <ConfidenceBadge level={booster.confidence} />
            </div>
            <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSoft, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding: isMobile ? "8px 12px" : "10px 16px", background: "none", border: "none", borderBottom: `2px solid ${activeTab === t.id ? color : "transparent"}`, fontSize: isMobile ? 12 : 13, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? T.text : T.textDim, cursor: "pointer", fontFamily: font, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 16px 24px" : "20px 28px 28px" }}>
          {activeTab === "overview" && (
            <div>
              <p style={{ fontSize: 15, color: T.text, lineHeight: 1.7, margin: "0 0 20px" }}>{booster.summary}</p>
              <h3 style={{ fontSize: 13, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 600 }}>How It Works</h3>
              <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7, margin: 0 }}>{booster.mechanism}</p>
              {Object.keys(booster.dietary).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 13, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 600 }}>Dietary Notes</h3>
                  {Object.entries(booster.dietary).map(([key, val]) => (
                    <div key={key} style={{ padding: "10px 14px", background: T.surface, borderRadius: 10, marginBottom: 8, borderLeft: `3px solid ${color}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "capitalize" }}>{key === "general" ? "General" : key === "vegan" ? "Vegan / Plant-Based" : key === "lactose" ? "Lactose Intolerant" : key === "gluten" ? "Gluten Free" : key === "fructose" ? "Fructose Intolerant" : key}</span>
                      <p style={{ fontSize: 13, color: T.textSoft, margin: "4px 0 0", lineHeight: 1.5 }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "protocol" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Step-by-Step Protocol</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {booster.protocol.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, flexShrink: 0, fontFamily: mono }}>{i + 1}</div>
                    <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: "2px 0 0" }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "risks" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "#ff6b7a" }}>⚠️ Risks, Cautions & Considerations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {booster.risks.map((risk, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: "rgba(255,71,87,0.04)", borderRadius: 10, borderLeft: "3px solid rgba(255,71,87,0.3)" }}>
                    <span style={{ color: "#ff6b7a", fontSize: 12, flexShrink: 0, marginTop: 1 }}>●</span>
                    <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>{risk}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: "14px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6, margin: 0 }}>⚕️ These are evidence-based educational suggestions, not medical advice. Consult your physician before starting any supplement or protocol, especially if you have pre-existing health conditions.</p>
              </div>
            </div>
          )}

          {activeTab === "science" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>📚 Peer-Reviewed Research</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {booster.studies.map((s, i) => <StudyCard key={i} study={s} />)}
              </div>
            </div>
          )}

          {activeTab === "recipes" && booster.recipes.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>🍴 Quick Recipes</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {booster.recipes.map((r, i) => <RecipeCard key={i} recipe={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN BOOSTERS PAGE
// ══════════════════════════════════════
export default function Boosters() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const filtered = boosters.filter(b => {
    const matchesCat = filter === "all" || b.category === filter;
    const matchesSearch = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const allCats = ["all", "supplement", "nutrition", "protocol", "training", "recovery"];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 12px" : "0 32px", height: isMobile ? 48 : 56, borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00e5a0, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: T.bg }}>AI</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>M</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 3 }}>
              {["Dashboard", "Calendar", "Trends", "Boosters", "Race Planner"].map(item => (
                <button key={item} style={{ background: item === "Boosters" ? "rgba(0,229,160,0.1)" : "none", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: item === "Boosters" ? T.accent : T.textDim, cursor: "pointer", fontFamily: font }}>{item}</button>
              ))}
            </div>
          )}
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={20} /></button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #8b5cf6, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>KF</div>
          </div>
        )}
      </nav>

      {/* Mobile nav drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
            </div>
            {["Dashboard", "Calendar", "Trends", "Boosters", "Race Planner"].map(item => (
              <button key={item} onClick={() => setMenuOpen(false)} style={{ background: item === "Boosters" ? "rgba(0,229,160,0.1)" : "none", border: "none", padding: "12px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: item === "Boosters" ? T.accent : T.textSoft, cursor: "pointer", fontFamily: font, textAlign: "left" }}>{item}</button>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ padding: isMobile ? "24px 16px 0" : "48px 32px 0", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-end", marginBottom: isMobile ? 20 : 32, gap: isMobile ? 16 : 0 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
              Performance <span style={{ background: "linear-gradient(135deg, #00e5a0, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Boosters</span>
            </h1>
            <p style={{ fontSize: isMobile ? 14 : 15, color: T.textSoft, margin: 0 }}>
              Science-backed supplements, protocols, and training strategies. Every recommendation includes peer-reviewed research.
            </p>
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search boosters..."
              style={{ padding: "10px 16px 10px 36px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.text, fontFamily: font, outline: "none", width: isMobile ? "100%" : 220, transition: "border-color 0.2s", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = T.borderHover}
              onBlur={e => e.target.style.borderColor = T.border} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.textDim }}>🔍</span>
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: isMobile ? 20 : 32, overflowX: isMobile ? "auto" : "visible", flexWrap: isMobile ? "nowrap" : "wrap", WebkitOverflowScrolling: "touch", paddingBottom: isMobile ? 4 : 0 }}>
          {allCats.map(cat => {
            const count = cat === "all" ? boosters.length : boosters.filter(b => b.category === cat).length;
            const isActive = filter === cat;
            const color = cat === "all" ? T.accent : catColors[cat];
            return (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: isActive ? `${color}15` : T.surface, border: `1px solid ${isActive ? `${color}40` : T.border}`, borderRadius: 10, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? color : T.textSoft, cursor: "pointer", fontFamily: font, transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}>
                {cat === "all" ? "All" : catLabels[cat]}
                <span style={{ fontSize: 11, color: isActive ? color : T.textDim, fontFamily: mono }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 16, paddingBottom: 64 }}>
          {filtered.map((b) => {
            const color = catColors[b.category];
            return (
              <div key={b.id} onClick={() => setSelected(b)}
                style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 22px", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", position: "relative", overflow: "hidden" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                {/* Top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{b.subtitle}</div>
                    </div>
                  </div>
                </div>

                {/* Category + confidence */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: `${color}12`, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{catLabels[b.category]}</span>
                  <ConfidenceBadge level={b.confidence} />
                </div>

                {/* Summary */}
                <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6, margin: "0 0 16px" }}>{b.summary}</p>

                {/* Footer meta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.textDim }}>
                    <span>📚 {b.studies.length} {b.studies.length === 1 ? "study" : "studies"}</span>
                    {b.recipes.length > 0 && <span>🍴 {b.recipes.length} recipes</span>}
                    {b.risks.length > 0 && <span>⚠️ {b.risks.length} cautions</span>}
                  </div>
                  <span style={{ fontSize: 12, color, fontWeight: 600 }}>View →</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 16, color: T.textSoft }}>No boosters match your search.</p>
            <button onClick={() => { setFilter("all"); setSearchQuery(""); }} style={{ marginTop: 12, background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 20px", color: T.accent, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: font }}>Clear filters</button>
          </div>
        )}
      </div>

      {/* Disclaimer footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "20px 32px", background: T.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, margin: 0 }}>
            ⚕️ All recommendations are based on peer-reviewed research and are provided for educational purposes only. This is not medical advice. Individual responses vary. Consult your physician before starting any supplement regimen, particularly if you have pre-existing health conditions. AIM personalizes recommendations based on your dietary profile, health conditions, and training data — update your profile in Settings → Health & Diet to receive tailored suggestions.
          </p>
        </div>
      </div>

      {/* Detail modal */}
      {selected && <BoosterDetail booster={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
