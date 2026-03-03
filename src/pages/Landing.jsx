import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Zap, Brain, Target, Heart, TrendingUp, ArrowRight, Check, Star, Menu, X } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { btn } from "../theme/styles";
import NeuralBackground from "../components/NeuralBackground";
import SEO from "../components/SEO";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AIM",
  url: "https://aimfitness.ai",
  logo: "https://aimfitness.ai/logos/aim-logo-badge-dark-4x.png",
  description: "AI-powered performance intelligence platform for endurance athletes.",
  founder: {
    "@type": "Person",
    name: "Kristen Faulkner",
    jobTitle: "Founder & CEO",
    description: "2x Olympic Gold Medalist in Cycling (Paris 2024, Road Race & Team Pursuit)",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AIM",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description: "AI-powered performance intelligence for endurance athletes. Connect power, sleep, recovery, body composition, and blood work data for cross-domain insights.",
  url: "https://aimfitness.ai",
  offers: [
    { "@type": "Offer", name: "Starter", price: "15.00", priceCurrency: "USD", description: "For athletes ready to get serious about their data" },
    { "@type": "Offer", name: "Pro", price: "39.00", priceCurrency: "USD", description: "For competitive athletes who want every edge" },
    { "@type": "Offer", name: "Elite", price: "79.00", priceCurrency: "USD", description: "The full platform — blood work, body comp, and cycle intelligence" },
  ],
};

const exampleInsights = [
  // Body Composition → Performance
  {
    type: "insight", icon: "\u2696\uFE0F", category: "body",
    title: "Weight Impact on Today's Climbing",
    body: "At your current 89kg + 7.8kg bike (96.8kg system weight), you needed 66W to maintain 16 km/h on the 6% grades today. Every 1 lb (0.45kg) you gain or lose shifts that requirement by ~0.3W. Your recent 0.8kg drop saved you ~3.5W on every climb today \u2014 that's free speed.",
    confidence: "high",
  },
  {
    type: "positive", icon: "\uD83D\uDCCA", category: "body",
    title: "FTP/Lean Mass Ratio Improving",
    body: "Your FTP per kg of lean body mass is 3.82 W/kg \u2014 up from 3.62 W/kg six weeks ago. This is a better performance indicator than raw W/kg because it filters out fat mass changes. Your muscle mass is stable at 42.1% while body fat dropped from 14.2% \u2192 12.4%, meaning your power gains are genuine neuromuscular adaptations, not just weight loss.",
    confidence: "high",
  },
  {
    type: "warning", icon: "\uD83D\uDCA7", category: "body",
    title: "Hydration Was Low Before This Ride",
    body: "Your Withings hydration reading this morning was 62% \u2014 below your 65% baseline. In hot conditions (today was 35\u00B0C), starting under-hydrated compounds cardiac drift. Your 8.1% drift today vs. 3.2% on a similar effort when you weighed in at 65% hydration suggests ~2-3% of today's drift was hydration-related, not fitness.",
    confidence: "medium",
  },
  {
    type: "action", icon: "\uD83C\uDFD4\uFE0F", category: "body",
    title: "Race Weight Projection for Mt. Tam Hillclimb",
    body: "Your hillclimb race is in 18 days. At current rate (-0.5kg/week), you'll be ~86.4kg on race day = 3.45 W/kg. If you hold FTP at 298W, that's a projected VAM of ~1,340 m/hr on the 7.4% avg gradient \u2014 roughly 38:20 for the 8.2km climb. Every additional kg lost would save ~18 seconds. But dropping below 86kg at your muscle mass risks power loss.",
    confidence: "medium",
  },
  // Recovery → Performance
  {
    type: "warning", icon: "\uD83D\uDE34", category: "recovery",
    title: "Poor Sleep Drove Today's HR Drift",
    body: "Deep sleep was 48 min last night (avg: 1h 42m) and HRV dropped to 38ms (avg: 68ms). This likely explains the 8.1% cardiac drift \u2014 on Feb 18 with similar power but 72ms HRV, drift was only 3.2%. Your aerobic engine is fit, but your body was under-recovered.",
    confidence: "high",
  },
  {
    type: "insight", icon: "\uD83D\uDCC9", category: "recovery",
    title: "3-Night HRV Decline \u2192 Power Fade Pattern",
    body: "Your overnight HRV has declined 74ms \u2192 62ms \u2192 38ms over 3 nights. Historically, when HRV drops below 45ms for 2+ consecutive days, your NP drops 8-14% on comparable efforts. Today's NP was 272W vs. your 285W average \u2014 a 4.6% drop. Consider keeping tomorrow to Z1/Z2.",
    confidence: "high",
  },
  {
    type: "action", icon: "\uD83C\uDF21\uFE0F", category: "recovery",
    title: "EightSleep + Sleep Timing Optimization",
    body: "Your deep sleep is 34% higher at -4\u00B0C vs. -1\u00B0C (last night's setting). Combined with your optimal sleep window (before 10:15 PM = best performances), consider trying -4\u00B0C tonight and aiming for lights out by 10 PM. Your HRV may rebound 15-20ms within 48 hours based on your historical recovery curves.",
    confidence: "medium",
  },
  {
    type: "warning", icon: "\uD83D\uDD0B", category: "recovery",
    title: "Whoop Strain Exceeding Recovery",
    body: "7-day cumulative strain: 18.4 (daily avg: 15.2), but recovery averaging only 48%. Combined with declining HRV and elevated RHR (52 vs. baseline 48), you're accumulating more fatigue than you're absorbing. Your ATL (92) is 8% above CTL (85) \u2014 productive overreach, but approaching the red line.",
    confidence: "high",
  },
  // Performance
  {
    type: "positive", icon: "\uD83C\uDFAF", category: "performance",
    title: "Efficiency Factor: 1.79 W/bpm",
    body: "Your EF (NP/avg HR) of 1.79 is your second-highest this season, despite poor recovery. On well-rested days, you've hit 1.84. This confirms your aerobic base is strong \u2014 the drift today was recovery-driven, not fitness-driven. Your 14.5 hrs/week of Z2 over the past month is paying off.",
    confidence: "high",
  },
  {
    type: "warning", icon: "\u26A1", category: "performance",
    title: "VO2max Power: Cat 3 \u2014 Your Weakest Link",
    body: "Your 5-min power of 355W (3.99 W/kg) classifies as Cat 3, while your 20-min threshold is Cat 2 at 3.35 W/kg. That's a 2-tier gap. Your VO2/FTP ratio is 1.19 \u2014 well below the 1.25 target. You need +19W at 5-min to reach Cat 2. Consider adding 2\u00D7 per week VO2 sessions for 6-8 weeks.",
    confidence: "high",
  },
  {
    type: "action", icon: "\uD83C\uDFCB\uFE0F", category: "performance",
    title: "Suggested: VO2max Block (6-8 weeks)",
    body: "Based on your power profile, VO2max is your biggest limiter. Consider targeting 322-343W (108-115% FTP). A progression from 4\u00D74min / 3min rest to 5\u00D75min / 5min rest may work well. On recovery weeks, 30/30s (358-387W) can help maintain stimulus. Goal: raise 5-min from 355W \u2192 380W+ (4.27 W/kg = Cat 2).",
    confidence: "high",
  },
  {
    type: "positive", icon: "\uD83C\uDFC6", category: "performance",
    title: "Sprint & Threshold: Cat 2 \u2014 Genuine Strengths",
    body: "Your 5s sprint (12.92 W/kg) and 20-min threshold (3.35 W/kg) are both solidly Cat 2. You're only 31W away from Cat 1 at threshold. For a climber/rouleur profile, these numbers are competitive \u2014 your limiter is the VO2 gap between them.",
    confidence: "high",
  },
  {
    type: "insight", icon: "\uD83C\uDF21\uFE0F", category: "performance",
    title: "Heat Adaptation Nearly Complete",
    body: "Power:HR at 95\u00B0F today was 1.79 W/bpm vs. 1.45 at 68\u00B0F three weeks ago \u2014 only a 2% gap. Early summer, heat caused a 21% drop. Your plasma volume expansion is nearly complete. For your race, if temps exceed 90\u00B0F, you'll lose <3% power vs. cooler conditions.",
    confidence: "high",
  },
  // Training Load
  {
    type: "action", icon: "\uD83D\uDCCA", category: "training",
    title: "Taper Protocol for Race Day",
    body: "CTL 85, TSB -7. Race in 18 days \u2192 consider beginning a taper in ~4 days. Targeting TSB +15 to +20 by race day may be optimal. Research suggests reducing volume ~40% while maintaining 2 short intensity sessions (10-12 min total at VO2/threshold). Predicted race-day CTL: ~80, which historically correlates with your best performances.",
    confidence: "high",
  },
  {
    type: "insight", icon: "\u23F1\uFE0F", category: "training",
    title: "Threshold Volume Driving FTP Gains",
    body: "You've accumulated 312 minutes between 88-105% FTP in the last 8 weeks. Your FTP rose from 290W \u2192 298W during this period. Historically, your FTP responds to threshold volume with a ~6 week delay. The work you did in weeks 3-5 is what's showing up now. Keep this volume through your build phase.",
    confidence: "high",
  },
];

const insightCategoryMeta = [
  { id: "all", label: "All Insights" },
  { id: "performance", label: "Performance" },
  { id: "body", label: "Body Composition" },
  { id: "recovery", label: "Recovery" },
  { id: "training", label: "Training Load" },
];

function InsightsShowcase({ navigate, user }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const { isMobile, isTablet } = useResponsive();

  const filtered = filter === "all" ? exampleInsights : exampleInsights.filter(i => i.category === filter);
  const typeColor = (type) => type === "positive" ? T.accent : type === "warning" ? T.warn : type === "action" ? T.purple : T.blue;

  return (
    <section style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "100px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
          <p style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Real AI Analysis</p>
          <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 34 : 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Every insight comes with <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>a plan</span>
          </h2>
          <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSoft, maxWidth: 580, margin: "0 auto" }}>These are real examples from a single ride analysis. AIM connects your power data, body composition, sleep, recovery, and training load to find patterns no single app can see.</p>
        </div>

        {/* Category filter pills */}
        <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", gap: 8, marginBottom: 32, flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch", paddingBottom: isMobile ? 4 : 0 }}>
          {insightCategoryMeta.map(cat => {
            const count = cat.id === "all" ? exampleInsights.length : exampleInsights.filter(i => i.category === cat.id).length;
            const active = filter === cat.id;
            return (
              <button key={cat.id} onClick={() => { setFilter(cat.id); setExpanded(null); }} style={{ background: active ? `${T.accent}18` : T.card, border: `1px solid ${active ? T.accentMid : T.border}`, borderRadius: 24, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: active ? T.accent : T.textSoft, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8, fontFamily: font }}>
                {cat.label}
                <span style={{ fontSize: 11, background: active ? `${T.accent}30` : `${T.textDim}25`, padding: "2px 7px", borderRadius: 8, color: active ? T.accent : T.textDim, fontWeight: 700 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Insight cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((insight, i) => {
            const isExpanded = expanded === i;
            const needsTruncation = insight.body.length > 160;
            return (
              <div key={`${filter}-${i}`}
                onClick={() => needsTruncation && setExpanded(isExpanded ? null : i)}
                style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 24px", borderLeft: `3px solid ${typeColor(insight.type)}`, cursor: needsTruncation ? "pointer" : "default", transition: "all 0.2s" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = T.borderHover; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = T.border; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{insight.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text, flex: 1 }}>{insight.title}</span>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: insight.confidence === "high" ? T.accentDim : `${T.warn}15`, color: insight.confidence === "high" ? T.accent : T.warn, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{insight.confidence}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: T.textSoft }}>
                  {needsTruncation && !isExpanded ? insight.body.slice(0, 160) + "..." : insight.body}
                </div>
                {needsTruncation && (
                  <div style={{ fontSize: 11, color: T.accent, marginTop: 6, fontWeight: 600 }}>
                    {isExpanded ? "Show less" : "Read more"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p style={{ fontSize: 15, color: T.textSoft, marginBottom: 20 }}>This is just one ride. Imagine this analysis for every workout, every night of sleep, every blood panel.</p>
          <button onClick={() => navigate(user ? "/dashboard" : "/signup")} style={{ ...btn(true), fontSize: 15, padding: "14px 32px" }}>{user ? "Go to Dashboard" : "See Your Own Insights"} <ArrowRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState("annual");
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const features = [
    { icon: <Zap size={22} />, title: "AI-Powered Analysis", desc: "Every workout gets a full breakdown with specific, actionable recommendations — not just charts. Know exactly what to change and why." },
    { icon: <Activity size={22} />, title: "All Your Data, One Place", desc: "Connect Strava, Wahoo, Garmin, Oura, Whoop, EightSleep, Withings, and more. Plus upload blood panels and DEXA scans for a complete picture." },
    { icon: <Brain size={22} />, title: "Cross-Domain Insights", desc: "\"Your ferritin dropped 40% — that's why your VO2max plateaued. Here's your iron protocol.\" Insights that connect blood work, sleep, body comp, and performance." },
    { icon: <Target size={22} />, title: "Power Benchmarking", desc: "See how your sprint, VO2max, threshold, and endurance compare to Cat 1-5 and World Tour riders — with prescribed workouts to close the gap." },
    { icon: <Heart size={22} />, title: "Health Lab", desc: "Upload blood panels and DEXA scans. AI tracks biomarkers over time with athlete-optimal ranges, flags deficiencies, and recommends when to retest." },
    { icon: <TrendingUp size={22} />, title: "Training Prescriptions", desc: "Every insight comes with a specific action plan — exact watts, durations, supplement protocols, and weekly schedules tailored to your data." },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Cat 2 Road Racer", text: "AIM told me my VO2 was my limiter before my coach did. The prescribed workouts raised my 5-min power by 22W in 8 weeks.", stars: 5 },
    { name: "Marcus T.", role: "Masters 45+ Champion", text: "The sleep-to-performance correlation blew my mind. I changed my bedtime and my EF improved by 8%. Data doesn't lie.", stars: 5 },
    { name: "Elena R.", role: "Pro Triathlete", text: "The menstrual cycle tracking with my Oura Ring is a game-changer. Finally, a platform that treats female physiology as a feature, not an afterthought.", stars: 5 },
    { name: "Jake W.", role: "Cat 3 Road Racer", text: "AIM flagged a left-right power imbalance that got worse on climbs. I started the single-leg gym protocol it prescribed and gained 14W at threshold in six weeks. My coach never caught it.", stars: 5 },
  ];

  const plans = [
    { name: "Starter", monthlyPrice: 19, annualPrice: 15, desc: "For athletes ready to get serious about their data", features: ["3 app connections", "AI workout analysis", "Power benchmarking (Cat 1-5)", "Basic training prescriptions", "Performance Boosters library"], cta: "Start Free Trial" },
    { name: "Pro", monthlyPrice: 49, annualPrice: 39, badge: "MOST POPULAR", desc: "For competitive athletes who want every edge", features: ["Unlimited app connections", "Full cross-domain AI analysis", "Advanced training prescriptions", "Recovery intelligence (HRV, sleep)", "Evidence-based supplement protocols", "Coach sharing & export"], cta: "Start Free Trial" },
    { name: "Elite", monthlyPrice: 99, annualPrice: 79, badge: "COMPLETE", desc: "The full platform — blood work, body comp, and cycle intelligence", features: ["Everything in Pro", "Health Lab (blood panels & DEXA scans)", "Biomarker tracking with athlete-optimal ranges", "Menstrual cycle × performance intelligence", "AI nutrition periodization", "Priority analysis & early features"], cta: "Start Free Trial" },
  ];

  return (
    <div>
      <SEO path="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: isMobile ? "0 16px" : "0 40px", height: isMobile ? 56 : 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${T.bg}dd`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>
        {isMobile ? (
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><Menu size={22} /></button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 20 : 32 }}>
            <a href="#why" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Why AIM</a>
            <a href="#features" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Features</a>
            <a href="#pricing" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Pricing</a>
            <a href="#testimonials" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Testimonials</a>
            {user ? (
              <button onClick={() => navigate("/dashboard")} style={{ ...btn(true), padding: "10px 24px", fontSize: 13 }}>My Dashboard</button>
            ) : (
              <>
                <button onClick={() => navigate("/signin")} style={{ ...btn(false), padding: "8px 20px", fontSize: 13 }}>Sign In</button>
                <button onClick={() => navigate("/signup")} style={{ ...btn(true), padding: "10px 24px", fontSize: 13 }}>Get Started</button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Mobile menu drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 280, height: "100vh", background: T.surface, borderLeft: `1px solid ${T.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={22} /></button>
            </div>
            {[{ href: "#why", label: "Why AIM" }, { href: "#features", label: "Features" }, { href: "#pricing", label: "Pricing" }, { href: "#testimonials", label: "Testimonials" }].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ color: T.text, textDecoration: "none", fontSize: 16, fontWeight: 600, padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>{link.label}</a>
            ))}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {user ? (
                <button onClick={() => { setMenuOpen(false); navigate("/dashboard"); }} style={{ ...btn(true), justifyContent: "center", width: "100%", padding: "14px 24px" }}>My Dashboard</button>
              ) : (
                <>
                  <button onClick={() => { setMenuOpen(false); navigate("/signup"); }} style={{ ...btn(true), justifyContent: "center", width: "100%", padding: "14px 24px" }}>Get Started</button>
                  <button onClick={() => { setMenuOpen(false); navigate("/signin"); }} style={{ ...btn(false), justifyContent: "center", width: "100%", padding: "14px 24px" }}>Sign In</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <main>
      {/* ── CLEAN HERO (above the fold — same as original) ── */}
      <section style={{ paddingTop: isMobile ? 100 : isTablet ? 130 : 160, paddingBottom: isMobile ? 60 : 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <NeuralBackground />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 800, margin: "0 auto", padding: isMobile ? "32px 20px" : "48px 48px", background: `radial-gradient(ellipse at center, ${T.bg} 0%, ${T.bg}ee 60%, transparent 100%)`, borderRadius: isMobile ? 20 : 32 }}>
          <h1 style={{ fontSize: isMobile ? 36 : isTablet ? 48 : 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "0 0 24px" }}>
            Your AI<br />
            <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Performance Coach</span>
          </h1>
          <p style={{ fontSize: isMobile ? 16 : 19, color: T.textSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px", fontWeight: 400 }}>
            AIM connects all your fitness data — power, sleep, recovery, body composition, blood work, and DEXA scans — and uses AI to deliver actionable insights with specific recommendations, not just numbers.
          </p>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "center", gap: isMobile ? 12 : 16 }}>
            <button onClick={() => navigate(user ? "/dashboard" : "/signup")} style={{ ...btn(true), fontSize: isMobile ? 15 : 16, padding: isMobile ? "14px 24px" : "16px 36px", justifyContent: "center" }}>{user ? "Go to Dashboard" : "Start Your Free Trial"} <ArrowRight size={18} /></button>
            <button style={{ ...btn(false), fontSize: isMobile ? 15 : 16, padding: isMobile ? "14px 24px" : "16px 36px", justifyContent: "center" }}>Watch Demo</button>
          </div>
          <div style={{ marginTop: isMobile ? 32 : 48, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: isMobile ? "8px 20px" : 32, alignItems: "center" }}>
            {["Strava", "Wahoo", "Garmin", "Oura", "Whoop", "Withings"].map(n => (
              <span key={n} style={{ fontSize: 13, color: T.textDim, fontWeight: 500, letterSpacing: "0.04em" }}>{n}</span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: T.textDim, marginTop: 8 }}>Integrates with 18+ platforms</p>
        </div>
      </section>

      {/* Metrics strip */}
      <section style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: isMobile ? "24px 16px" : "32px 0", background: T.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 20 : 0, textAlign: "center" }}>
          {[{ n: "100+", l: "Metrics Tracked" }, { n: "18+", l: "App Integrations" }, { n: "25+", l: "Blood Biomarkers" }, { n: "24/7", l: "AI Analysis" }].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, fontFamily: mono, background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
              <div style={{ fontSize: 13, color: T.textSoft, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── A MESSAGE FROM THE FOUNDER ── */}
      <section id="about" style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "80px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>A Message from the Founder</p>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 32 : isTablet ? 32 : 48, alignItems: isMobile ? "center" : "center" }}>
            {/* Photo */}
            <div style={{ flexShrink: 0, width: isMobile ? "100%" : isTablet ? 220 : 320, maxWidth: isMobile ? 280 : undefined }}>
              <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: 20, overflow: "hidden", position: "relative" }}>
                <img src="/kristen.jpg" alt="Kristen Faulkner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px" }}>Kristen Faulkner</p>
                <p style={{ fontSize: 13, color: T.accent, margin: "0 0 2px", fontWeight: 600 }}>Founder & CEO</p>
                <p style={{ fontSize: 12, color: T.textDim, margin: 0, lineHeight: 1.5 }}>2x Olympic Gold Medalist, Cycling</p>
              </div>
            </div>
            {/* Quote */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? 36 : 48, color: T.accent, fontWeight: 800, lineHeight: 1, marginBottom: 8, opacity: 0.3 }}>"</div>
              <p style={{ fontSize: isMobile ? 16 : 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                I went from Venture Capital in Silicon Valley to the Olympic podium, and the whole way I was searching for insights that didn't exist. I had power files, blood work, sleep data, body comp scans, and a hormone cycle that affected everything. But no tool could connect them.
              </p>
              <p style={{ fontSize: isMobile ? 16 : 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                I built AIM because I wanted the cross-domain analysis I couldn't find anywhere else. The biomarker patterns, the recovery protocols, the performance boosters, the training frameworks that actually won races. Everything I learned racing at the highest level, I've put into this platform.
              </p>
              <p style={{ fontSize: isMobile ? 16 : 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                Our health is our most valuable asset. I want to make world-class performance intelligence accessible to every athlete, not just those with a pro team behind them.
              </p>
              <div style={{ width: 48, height: 2, background: T.gradient, marginBottom: 16 }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Kristen Faulkner</p>
              <p style={{ fontSize: 13, color: T.textDim, margin: "2px 0 0" }}>2x Olympic Gold Medalist · Road Race & Team Pursuit, Paris 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY APEX IS DIFFERENT ── */}
      <section id="why" style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "100px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 64 }}>
          <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 34 : 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            This isn't another <span style={{ color: T.textDim, textDecoration: "line-through", textDecorationColor: T.danger + "60" }}>fitness dashboard</span>
          </h2>
          <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSoft, maxWidth: 580, margin: "0 auto" }}>Other apps show you charts. AIM tells you what they mean and exactly what to do about it.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 16 : 24 }}>
          {[
            { emoji: "\u{1F9EC}", title: "Cross-domain intelligence no one else has", desc: "AIM is the only platform that reasons across your blood work, training data, sleep, body composition, nutrition, and menstrual cycle simultaneously. Your ferritin trend explains your power plateau. Your DEXA changes reveal whether weight loss is fat or muscle." },
            { emoji: "\u{1F3C5}", title: "Built by a 2x Olympic Champion", desc: "The analysis frameworks, biomarker ranges, and training prescriptions in AIM come from the same system used to win Olympic gold — refined through years of world-class competition, sports science research, and elite coaching." },
            { emoji: "\u{1FA78}", title: "Your blood work and DEXA scans, decoded", desc: "Upload your lab results and body scans. AIM uses athlete-optimal ranges (not clinical ranges designed to catch disease) to flag what matters for performance. It tracks trends over time, cross-references with your training load, and tells you exactly when to retest." },
          ].map((d, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "36px 28px", transition: "all 0.3s", cursor: "default" }}
              onMouseOver={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 36, marginBottom: 20, textAlign: "center" }}>{d.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.01em", lineHeight: 1.3 }}>{d.title}</h3>
              <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7, margin: 0 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Insights Showcase */}
      <InsightsShowcase navigate={navigate} user={user} />

      {/* Features */}
      <section id="features" style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "100px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 64 }}>
          <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 34 : 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>Intelligence that <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>connects everything</span></h2>
          <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSoft, maxWidth: 560, margin: "0 auto" }}>Not just another dashboard. AIM reasons across your entire data ecosystem to find patterns no single app can see.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 14 : 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "32px 28px", transition: "all 0.3s", cursor: "default", position: "relative", overflow: "hidden" }}
              onMouseOver={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}30, transparent)` }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section id="integrations" style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "100px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 64 }}>
            <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 34 : 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>All your data, <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>one platform</span></h2>
            <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSoft, maxWidth: 560, margin: "0 auto" }}>Connect the tools you already use. AIM pulls everything together so you don't have to.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : isTablet ? "repeat(4, 1fr)" : "repeat(5, 1fr)", gap: 12 }}>
            {[
              { name: "Strava", desc: "Ride & run data", logo: "/images/integrations/strava.svg" },
              { name: "Wahoo", desc: "Power & cycling", logo: "/images/integrations/wahoo.svg" },
              { name: "Eight Sleep", desc: "Sleep tracking", logo: "/images/integrations/eightsleep.svg" },
              { name: "Whoop", desc: "Recovery & strain", logo: "/images/integrations/whoop.svg" },
              { name: "Withings", desc: "Weight & body comp", logo: "/images/integrations/withings.svg" },
              { name: "Blood Work", desc: "Lab panels" },
              { name: "DEXA Scans", desc: "Body composition" },
            ].map((app) => (
              <div key={app.name} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 12px", textAlign: "center", transition: "all 0.3s", cursor: "default" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                {app.logo ? (
                  <img src={app.logo} alt={`${app.name} logo`} style={{ width: 44, height: 44, borderRadius: 12, margin: "0 auto 10px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 20, fontWeight: 700, color: T.accent }}>
                    {app.name.charAt(0)}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{app.name}</div>
                <div style={{ fontSize: 11, color: T.textDim }}>{app.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "100px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
            <h2 style={{ fontSize: isMobile ? 28 : isTablet ? 34 : 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>Invest in your <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>greatest asset</span></h2>
            <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSoft, maxWidth: 480, margin: "0 auto 24px" }}>Less than a single coaching session per month. More actionable than a year of guessing.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "4px", background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
              {["monthly", "annual"].map(cycle => (
                <button key={cycle} onClick={() => setBillingCycle(cycle)} style={{ padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer", border: "none", transition: "all 0.2s", background: billingCycle === cycle ? T.accent : "transparent", color: billingCycle === cycle ? T.bg : T.textDim }}>
                  {cycle === "monthly" ? "Monthly" : "Annual"}{cycle === "annual" && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: billingCycle === "annual" ? T.bg : T.accent }}>(Save 20%)</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 16 : 20, alignItems: "start" }}>
            {plans.map((plan) => {
              const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
              const isPro = plan.name === "Pro";
              return (
                <div key={plan.name} style={{ background: T.card, borderRadius: 20, padding: isMobile ? "28px 24px" : "36px 28px", position: "relative", overflow: "hidden", border: `1px solid ${isPro ? T.accentMid : T.border}`, transform: isPro && !isMobile ? "scale(1.03)" : "none", boxShadow: isPro ? `0 0 60px ${T.accentDim}` : "none" }}>
                  {plan.badge && <div style={{ position: "absolute", top: 16, right: 16, padding: "3px 10px", borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentMid}`, fontSize: 10, fontWeight: 800, color: T.accent, letterSpacing: "0.06em" }}>{plan.badge}</div>}
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: T.textDim, margin: "0 0 20px", lineHeight: 1.5 }}>{plan.desc}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.03em" }}>${price}</span>
                    <span style={{ fontSize: 14, color: T.textDim }}>/mo</span>
                  </div>
                  {billingCycle === "annual" ? <p style={{ fontSize: 12, color: T.accent, margin: "0 0 20px" }}>Billed ${price * 12}/year (save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr)</p> : <div style={{ height: 20, marginBottom: 20 }} />}
                  <button onClick={() => navigate(user ? "/dashboard" : "/signup")} style={{ ...btn(isPro), width: "100%", justifyContent: "center", marginBottom: 24, fontSize: 14, padding: "13px 24px" }}>{user ? "Go to Dashboard" : plan.cta} <ArrowRight size={16} /></button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map((feat, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <Check size={14} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.4 }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textDim, marginTop: 24 }}>All plans include a 14-day free trial. Cancel anytime. No credit card required to start.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: isMobile ? "60px 16px" : isTablet ? "80px 24px" : "100px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
          <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Athletes who stopped guessing</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16 }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 20px" }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>{Array(t.stars).fill(0).map((_, j) => <Star key={j} size={12} fill={T.accent} color={T.accent} />)}</div>
              <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>"{t.text}"</p>
              <div><div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div><div style={{ fontSize: 11, color: T.textDim }}>{t.role}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: isMobile ? "60px 16px" : "80px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: isMobile ? "40px 24px" : "60px 40px", background: T.gradientSubtle, borderRadius: isMobile ? 20 : 24, border: `1px solid ${T.accentMid}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px", position: "relative" }}>Your body deserves better than guesswork.</h2>
          <p style={{ fontSize: isMobile ? 14 : 15, color: T.textSoft, margin: "0 0 32px", position: "relative", maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>Start your free trial today. Connect your apps, upload your blood work, and see what you've been missing.</p>
          <button onClick={() => navigate(user ? "/dashboard" : "/signup")} style={{ ...btn(true), fontSize: isMobile ? 15 : 16, padding: isMobile ? "14px 28px" : "16px 40px", position: "relative", width: isMobile ? "100%" : "auto", justifyContent: "center" }}>{user ? "Go to Dashboard" : "Get Started Free"} <ArrowRight size={18} /></button>
        </div>
      </section>

      </main>
    </div>
  );
}
