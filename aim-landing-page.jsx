import { useState, useEffect, useRef } from "react";
import { Activity, Zap, Brain, Moon, TrendingUp, Shield, ChevronRight, Star, Check, ArrowRight, Eye, EyeOff, Mail, Lock, User, MapPin, Calendar, X, MessageCircle, Heart, BarChart3, Target, Clock, Dumbbell, ChevronDown, Smartphone, Watch, Scale } from "lucide-react";

// ── DESIGN TOKENS ──
const T = {
  bg: "#05060a",
  surface: "#0c0d14",
  card: "#111219",
  cardHover: "#161720",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  accent: "#00e5a0",
  accentDim: "rgba(0,229,160,0.1)",
  accentMid: "rgba(0,229,160,0.25)",
  accentGlow: "rgba(0,229,160,0.4)",
  text: "#eaeaf0",
  textSoft: "#9495a5",
  textDim: "#5c5d70",
  white: "#ffffff",
  danger: "#ff4757",
  warn: "#ffb800",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  gradient: "linear-gradient(135deg, #00e5a0, #3b82f6)",
  gradientSubtle: "linear-gradient(135deg, rgba(0,229,160,0.08), rgba(59,130,246,0.08))",
};

const font = "'Outfit', sans-serif";
const mono = "'JetBrains Mono', monospace";

// ── INTEGRATIONS DATA ──
const integrations = [
  { name: "Strava", icon: "🟠", category: "activity", desc: "Activities, segments, routes, social", color: "#fc4c02" },
  { name: "Wahoo", icon: "🔵", category: "activity", desc: "Ride data, power, HR, cadence", color: "#0078d4" },
  { name: "Garmin", icon: "🟢", category: "activity", desc: "Activities, body battery, stress", color: "#00a2ad" },
  { name: "TrainingPeaks", icon: "⚫", category: "activity", desc: "TSS, workouts, training plans", color: "#1a1a2e" },
  { name: "Zwift", icon: "🟠", category: "activity", desc: "Indoor rides, races, workouts", color: "#f26522" },
  { name: "TrainerRoad", icon: "🔴", category: "activity", desc: "Adaptive plans, compliance", color: "#e63946" },
  { name: "Intervals.icu", icon: "🔵", category: "activity", desc: "Advanced analytics, eFTP", color: "#4a72d9" },
  { name: "Hammerhead", icon: "⚫", category: "activity", desc: "Karoo ride data, climber", color: "#333" },
  { name: "Oura Ring", icon: "⚪", category: "recovery", desc: "HRV, sleep, readiness, cycle tracking", color: "#b4b4b4" },
  { name: "Whoop", icon: "🟢", category: "recovery", desc: "Strain, recovery, sleep", color: "#44c767" },
  { name: "EightSleep", icon: "🔵", category: "recovery", desc: "Bed temp, sleep stages, HRV", color: "#4a90d9" },
  { name: "Withings", icon: "🟢", category: "body", desc: "Weight, body fat, muscle, hydration", color: "#00c9a7" },
  { name: "Apple Health", icon: "🔴", category: "body", desc: "Aggregate health data, VO2max", color: "#ff375f" },
  { name: "Supersapiens", icon: "🟡", category: "nutrition", desc: "Continuous glucose monitoring", color: "#f5c542" },
  { name: "Hexis", icon: "🟣", category: "nutrition", desc: "Periodised nutrition, Carb Coding™", color: "#7c3aed", note: "Partnership integration — coming soon" },
  { name: "MyFitnessPal", icon: "🔵", category: "nutrition", desc: "Calories, macros, food logging", color: "#0073cf" },
  { name: "Cronometer", icon: "🟠", category: "nutrition", desc: "Micronutrients, detailed tracking", color: "#f97316" },
  { name: "Noom", icon: "🟢", category: "nutrition", desc: "Weight management, food logging", color: "#00c48c" },
];

const catLabels = { all: "All", activity: "Training & Activity", recovery: "Recovery & Sleep", body: "Body Composition", nutrition: "Nutrition & Fueling" };
const catIcons = { activity: "🚴", recovery: "😴", body: "⚖️", nutrition: "🥗" };

// ── SHARED STYLES ──
const btn = (primary) => ({
  display: "inline-flex", alignItems: "center", gap: 8, padding: primary ? "14px 32px" : "12px 24px",
  background: primary ? T.accent : "transparent", color: primary ? T.bg : T.text,
  border: primary ? "none" : `1px solid ${T.border}`, borderRadius: 12, fontSize: 15, fontWeight: 600,
  fontFamily: font, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  letterSpacing: "-0.01em", textDecoration: "none",
});

const inputStyle = {
  width: "100%", padding: "14px 16px 14px 44px", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 12, fontSize: 15, color: T.text, fontFamily: font, outline: "none", transition: "border-color 0.2s",
  boxSizing: "border-box",
};

// ── MAIN APP ──
export default function AimApp() {
  const [page, setPage] = useState("landing");
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {page === "landing" && <LandingPage onNavigate={setPage} />}
      {page === "signup" && <AuthPage mode="signup" onNavigate={setPage} />}
      {page === "signin" && <AuthPage mode="signin" onNavigate={setPage} />}
      {page === "connect" && <ConnectAppsPage onNavigate={setPage} />}
    </div>
  );
}

// ══════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════
function LandingPage({ onNavigate }) {
  const [billingCycle, setBillingCycle] = useState("annual");

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
    { name: "Jake W.", role: "SF Cycling Club", text: "I was spending $400/month on a coach who looked at the same data I could see myself. AIM gives me better analysis for a fraction of the cost.", stars: 5 },
  ];

  const plans = [
    { name: "Starter", monthlyPrice: 19, annualPrice: 15, desc: "For athletes ready to get serious about their data", features: ["3 app connections", "AI workout analysis", "Power benchmarking (Cat 1-5)", "Basic training prescriptions", "Performance Boosters library"], cta: "Start Free Trial" },
    { name: "Pro", monthlyPrice: 49, annualPrice: 39, badge: "MOST POPULAR", desc: "For competitive athletes who want every edge", features: ["Unlimited app connections", "Full cross-domain AI analysis", "Advanced training prescriptions", "Recovery intelligence (HRV, sleep)", "Evidence-based supplement protocols", "Coach sharing & export"], cta: "Start Free Trial" },
    { name: "Elite", monthlyPrice: 99, annualPrice: 79, badge: "COMPLETE", desc: "The full platform — blood work, body comp, and cycle intelligence", features: ["Everything in Pro", "Health Lab (blood panels & DEXA scans)", "Biomarker tracking with athlete-optimal ranges", "Menstrual cycle × performance intelligence", "AI nutrition periodization", "Priority analysis & early features"], cta: "Start Free Trial" },
  ];

  return (
    <div>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${T.bg}dd`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="#why" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Why AIM</a>
          <a href="#features" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Pricing</a>
          <a href="#testimonials" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Athletes</a>
          <button onClick={() => onNavigate("signin")} style={{ ...btn(false), padding: "8px 20px", fontSize: 13 }}>Sign In</button>
          <button onClick={() => onNavigate("signup")} style={{ ...btn(true), padding: "10px 24px", fontSize: 13 }}>Get Started</button>
        </div>
      </nav>

      {/* ── CLEAN HERO (above the fold — same as original) ── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 800, background: "radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 100, right: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "0 0 24px" }}>
            Your AI<br />
            <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Performance Coach</span>
          </h1>
          <p style={{ fontSize: 19, color: T.textSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px", fontWeight: 400 }}>
            AIM connects all your fitness data — power, sleep, recovery, body composition, blood work, and DEXA scans — and uses AI to deliver actionable insights with specific recommendations, not just numbers.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <button onClick={() => onNavigate("signup")} style={{ ...btn(true), fontSize: 16, padding: "16px 36px" }}>Start Your Free Trial <ArrowRight size={18} /></button>
            <button style={{ ...btn(false), fontSize: 16, padding: "16px 36px" }}>Watch Demo</button>
          </div>
          <div style={{ marginTop: 48, display: "flex", justifyContent: "center", gap: 32, alignItems: "center" }}>
            {["Strava", "Wahoo", "Garmin", "Oura", "Whoop", "Withings"].map(n => (
              <span key={n} style={{ fontSize: 13, color: T.textDim, fontWeight: 500, letterSpacing: "0.04em" }}>{n}</span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: T.textDim, marginTop: 8 }}>Integrates with 18+ platforms</p>
        </div>
      </section>

      {/* Metrics strip */}
      <section style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: "32px 0", background: T.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {[{ n: "50+", l: "Metrics Auto-Calculated" }, { n: "18+", l: "App Integrations" }, { n: "9", l: "Biomarkers Tracked" }, { n: "24/7", l: "AI Analysis" }].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: mono, background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
              <div style={{ fontSize: 13, color: T.textSoft, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMOTIONAL SECTION (scroll down) ── */}
      <section style={{ padding: "100px 40px", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: T.accent, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>The Philosophy</p>
        <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 20px", lineHeight: 1.15 }}>
          Your health is your greatest asset.<br />
          <span style={{ color: T.textSoft }}>Treat it that way.</span>
        </h2>
        <p style={{ fontSize: 18, color: T.textSoft, lineHeight: 1.7, margin: "0 0 20px" }}>
          You train hard. You deserve to know exactly what's working.
        </p>
        <p style={{ fontSize: 16, color: T.textDim, lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>
          AIM connects everything — power, sleep, recovery, blood panels, DEXA scans, body composition — and tells you exactly what to do next. Every insight is actionable. Every recommendation is specific. No more guessing why you're plateauing when the answer is sitting across 8 different apps.
        </p>
      </section>

      {/* ── A MESSAGE FROM THE FOUNDER ── */}
      <section style={{ padding: "80px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", marginBottom: 48 }}>A Message from the Founder</p>
          <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
            {/* Photo placeholder */}
            <div style={{ flexShrink: 0, width: 320 }}>
              <div style={{ width: 320, height: 400, borderRadius: 20, overflow: "hidden", position: "relative", background: `linear-gradient(180deg, ${T.card} 0%, ${T.surface} 100%)`, border: `1px solid ${T.border}` }}>
                {/* Replace this div with: <img src="YOUR_HOSTED_IMAGE_URL" alt="Kristen Faulkner" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> */}
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: `linear-gradient(135deg, rgba(0,229,160,0.03), rgba(59,130,246,0.03))` }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: T.bg }}>KF</div>
                  <span style={{ fontSize: 11, color: T.textDim }}>Photo: Kristen in EF kit</span>
                  <span style={{ fontSize: 10, color: T.textDim }}>Replace with EF2026-headshot</span>
                </div>
              </div>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px" }}>Kristen Faulkner</p>
                <p style={{ fontSize: 13, color: T.accent, margin: "0 0 2px", fontWeight: 600 }}>Founder & CEO</p>
                <p style={{ fontSize: 12, color: T.textDim, margin: 0, lineHeight: 1.5 }}>2x Olympic Gold Medalist, Cycling<br />EF Education–Oatly Pro Team</p>
              </div>
            </div>
            {/* Quote */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 48, color: T.accent, fontWeight: 800, lineHeight: 1, marginBottom: 8, opacity: 0.3 }}>"</div>
              <p style={{ fontSize: 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                Throughout my career — from Venture Capital in Silicon Valley to the Olympic podium — I was always searching for insights that didn't exist. I had power files, blood work, sleep data, body comp scans, and a hormone cycle that affected everything. But no tool could connect them.
              </p>
              <p style={{ fontSize: 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                I built AIM because I wanted the analysis I couldn't find anywhere else. Everything I learned racing at the highest level — the biomarker patterns, the recovery protocols, the performance boosters, the training frameworks that actually won races — I've put into this platform.
              </p>
              <p style={{ fontSize: 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                Our health is our most valuable asset. I want to make world-class performance intelligence accessible to every athlete — not just those with a pro team behind them.
              </p>
              <div style={{ width: 48, height: 2, background: T.gradient, marginBottom: 16 }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Kristen Faulkner</p>
              <p style={{ fontSize: 13, color: T.textDim, margin: "2px 0 0" }}>2x Olympic Gold Medalist · Road Race & Team Pursuit, Paris 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY APEX IS DIFFERENT ── */}
      <section id="why" style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            This isn't another <span style={{ color: T.textDim, textDecoration: "line-through", textDecorationColor: T.danger + "60" }}>fitness dashboard</span>
          </h2>
          <p style={{ fontSize: 17, color: T.textSoft, maxWidth: 580, margin: "0 auto" }}>Other apps show you charts. AIM tells you what they mean and exactly what to do about it.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { emoji: "🧬", title: "Cross-domain intelligence no one else has", desc: "AIM is the only platform that reasons across your blood work, training data, sleep, body composition, nutrition, and menstrual cycle simultaneously. Your ferritin trend explains your power plateau. Your DEXA changes reveal whether weight loss is fat or muscle.", highlight: "Other apps: here's your data. AIM: here's what it means together." },
            { emoji: "🏅", title: "Built by an Olympic champion, not a tech startup", desc: "The analysis frameworks, biomarker ranges, and training prescriptions in AIM come from the same system used to win Olympic gold — refined through years of world-class competition, sports science research, and elite coaching.", highlight: "Every recommendation is grounded in what actually works at the highest level." },
            { emoji: "🩸", title: "Your blood work and DEXA scans, decoded", desc: "Upload your lab results and body scans. AIM uses athlete-optimal ranges (not clinical ranges designed to catch disease) to flag what matters for performance. It tracks trends over time, cross-references with your training load, and tells you exactly when to retest.", highlight: "43% of female athletes are iron-deficient. Clinical labs say they're \"normal.\"" },
          ].map((d, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "36px 28px", transition: "all 0.3s", cursor: "default" }}
              onMouseOver={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 36, marginBottom: 20 }}>{d.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.01em", lineHeight: 1.3 }}>{d.title}</h3>
              <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7, margin: "0 0 16px" }}>{d.desc}</p>
              <div style={{ padding: "10px 14px", background: T.accentDim, borderRadius: 10, border: `1px solid ${T.accentMid}` }}>
                <p style={{ fontSize: 12, color: T.accent, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>{d.highlight}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Example */}
      <section style={{ padding: "80px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Every insight comes with a plan</h2>
            <p style={{ fontSize: 15, color: T.textSoft }}>Real recommendations you can act on today — not just charts and numbers</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { type: "warning", label: "BLOOD WORK", text: "Your ferritin dropped from 62 → 28 ng/mL over the past 3 months. Combined with your training volume increase (+26%) and luteal phase timing, this is likely driving your VO2max plateau. → Recommendation: Begin 65mg iron bisglycinate with vitamin C, taken on an empty stomach away from coffee. Retest in 8-12 weeks." },
              { type: "positive", label: "DEXA SCAN", text: "Your latest DEXA shows lean mass +2.1kg and body fat 18.2% → 15.8% since January. At your current FTP of 298W, this puts you at 3.51 W/kg — up from 3.28. → You've crossed into Cat 2 W/kg territory. Shift focus from body comp to power development." },
              { type: "action", label: "TRAINING RX", text: "Your 5-min power classifies as Cat 3 while your threshold is Cat 2. This is your biggest limiter. → Prescription: 5×5min at 322-343W with 5min recovery, 2× per week for 6-8 weeks. Goal: raise 5-min from 355W → 380W. Pair with beetroot juice (6.4 mmol nitrate) 2-3h before each session." },
            ].map((insight, i) => (
              <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", borderLeft: `3px solid ${insight.type === "positive" ? T.accent : insight.type === "warning" ? T.warn : T.purple}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: insight.type === "positive" ? T.accent : insight.type === "warning" ? T.warn : T.purple, marginBottom: 8 }}>{insight.label}</div>
                <div style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7 }}>{insight.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "100px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>Intelligence that <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>connects everything</span></h2>
          <p style={{ fontSize: 17, color: T.textSoft, maxWidth: 560, margin: "0 auto" }}>Not just another dashboard. AIM reasons across your entire data ecosystem to find patterns no single app can see.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
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

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>Invest in your <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>greatest asset</span></h2>
            <p style={{ fontSize: 17, color: T.textSoft, maxWidth: 480, margin: "0 auto 24px" }}>Less than a single coaching session per month. More actionable than a year of guessing.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "4px", background: T.card, borderRadius: 12, border: `1px solid ${T.border}` }}>
              {["monthly", "annual"].map(cycle => (
                <button key={cycle} onClick={() => setBillingCycle(cycle)} style={{ padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: font, cursor: "pointer", border: "none", transition: "all 0.2s", background: billingCycle === cycle ? T.accent : "transparent", color: billingCycle === cycle ? T.bg : T.textDim }}>
                  {cycle === "monthly" ? "Monthly" : "Annual"}{cycle === "annual" && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: billingCycle === "annual" ? T.bg : T.accent }}>(Save 20%)</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "start" }}>
            {plans.map((plan) => {
              const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
              const isPro = plan.name === "Pro";
              return (
                <div key={plan.name} style={{ background: T.card, borderRadius: 20, padding: "36px 28px", position: "relative", overflow: "hidden", border: `1px solid ${isPro ? T.accentMid : T.border}`, transform: isPro ? "scale(1.03)" : "none", boxShadow: isPro ? `0 0 60px ${T.accentDim}` : "none" }}>
                  {plan.badge && <div style={{ position: "absolute", top: 16, right: 16, padding: "3px 10px", borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentMid}`, fontSize: 10, fontWeight: 800, color: T.accent, letterSpacing: "0.06em" }}>{plan.badge}</div>}
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: T.textDim, margin: "0 0 20px", lineHeight: 1.5 }}>{plan.desc}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.03em" }}>${price}</span>
                    <span style={{ fontSize: 14, color: T.textDim }}>/mo</span>
                  </div>
                  {billingCycle === "annual" ? <p style={{ fontSize: 12, color: T.accent, margin: "0 0 20px" }}>Billed ${price * 12}/year (save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr)</p> : <div style={{ height: 20, marginBottom: 20 }} />}
                  <button onClick={() => onNavigate("signup")} style={{ ...btn(isPro), width: "100%", justifyContent: "center", marginBottom: 24, fontSize: 14, padding: "13px 24px" }}>{plan.cta} <ArrowRight size={16} /></button>
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
      <section id="testimonials" style={{ padding: "100px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Athletes who stopped guessing</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
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
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 40px", background: T.gradientSubtle, borderRadius: 24, border: `1px solid ${T.accentMid}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px", position: "relative" }}>Your body deserves better than guesswork.</h2>
          <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px", position: "relative", maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>Start your free trial today. Connect your apps, upload your blood work, and see what you've been missing.</p>
          <button onClick={() => onNavigate("signup")} style={{ ...btn(true), fontSize: 16, padding: "16px 40px", position: "relative" }}>Get Started Free <ArrowRight size={18} /></button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "48px 40px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
              <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
            </div>
            <p style={{ fontSize: 12, color: T.textDim, maxWidth: 280, lineHeight: 1.6 }}>AI-powered performance intelligence for endurance athletes. Built by Kristen Faulkner, 2x Olympic Gold Medalist.</p>
          </div>
          <div style={{ display: "flex", gap: 64 }}>
            {[{ title: "Product", links: ["Features", "Integrations", "Pricing", "Roadmap", "Changelog"] }, { title: "Company", links: ["About", "Blog", "Careers", "Contact", "Press Kit"] }, { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Data Processing", "GDPR"] }].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>{col.title}</div>
                {col.links.map(l => <a key={l} href="#" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>{l}</a>)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.textDim }}>© 2026 AIM Performance Intelligence. Founded by Kristen Faulkner.</span>
          <span style={{ fontSize: 12, color: T.textDim }}>Built with ♥ for athletes who love data</span>
        </div>
      </footer>
    </div>
  );
}
function AuthPage({ mode, onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const isSignup = mode === "signup";

  const socialBtn = (label, icon) => (
    <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}
      onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
      <span style={{ fontSize: 18 }}>{icon}</span> {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left: Form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, cursor: "pointer" }} onClick={() => onNavigate("landing")}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>
            {isSignup ? "Start your free trial" : "Sign in to your AIM account"}
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {socialBtn("Google", "G")}
            {socialBtn("Strava", "S")}
            {socialBtn("Apple", "")}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textDim }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {isSignup && (
              <div style={{ position: "relative" }}>
                <User size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <Mail size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={inputStyle} />
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inputStyle} />
              <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 0 }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isSignup && (
            <p style={{ fontSize: 12, color: T.textDim, marginTop: 12, lineHeight: 1.5 }}>
              By creating an account, you agree to our <a href="#" style={{ color: T.accent, textDecoration: "none" }}>Terms of Service</a> and <a href="#" style={{ color: T.accent, textDecoration: "none" }}>Privacy Policy</a>.
            </p>
          )}

          {!isSignup && (
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <a href="#" style={{ fontSize: 13, color: T.accent, textDecoration: "none" }}>Forgot password?</a>
            </div>
          )}

          <button onClick={() => onNavigate("connect")} style={{ ...btn(true), width: "100%", justifyContent: "center", marginTop: 20, fontSize: 16, padding: "15px 32px" }}>
            {isSignup ? "Create Account" : "Sign In"} <ArrowRight size={18} />
          </button>

          <p style={{ fontSize: 14, color: T.textSoft, textAlign: "center", marginTop: 24 }}>
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button onClick={() => onNavigate(isSignup ? "signin" : "signup")} style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: font, padding: 0 }}>
              {isSignup ? "Sign In" : "Sign Up Free"}
            </button>
          </p>
        </div>
      </div>

      {/* Right: Brand panel */}
      <div style={{ flex: 1, background: T.surface, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 60, position: "relative", overflow: "hidden", borderLeft: `1px solid ${T.border}` }}>
        <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, background: "radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -150, left: -150, width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 400, textAlign: "center" }}>
          <div style={{ margin: "0 auto 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: T.bg, letterSpacing: "-0.03em" }}>AI</div>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>M</span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Train with <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>intelligence</span>
          </h2>
          <p style={{ fontSize: 15, color: T.textSoft, lineHeight: 1.65, margin: "0 0 40px" }}>
            Connect your data sources and let AI find the patterns that unlock your next breakthrough.
          </p>

          {/* Feature highlights */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {[
              { icon: <Brain size={16} />, text: "Cross-domain AI insights no single app can see" },
              { icon: <BarChart3 size={16} />, text: "Power benchmarking against Cat 1-5 and World Tour" },
              { icon: <Heart size={16} />, text: "Recovery intelligence from Oura, Whoop, EightSleep" },
              { icon: <Shield size={16} />, text: "Your data is encrypted and never sold to third parties" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, flexShrink: 0 }}>{f.icon}</div>
                <span style={{ fontSize: 13, color: T.textSoft }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// CONNECT APPS PAGE
// ══════════════════════════════════════
function ConnectAppsPage({ onNavigate }) {
  const [connected, setConnected] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const toggleConnect = (name) => {
    setConnected(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;

  const filtered = integrations.filter(app => {
    const matchesCat = filter === "all" || app.category === filter;
    const matchesSearch = !search || app.name.toLowerCase().includes(search.toLowerCase()) || app.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const grouped = {};
  filtered.forEach(app => {
    if (!grouped[app.category]) grouped[app.category] = [];
    grouped[app.category].push(app);
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onNavigate("landing")}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>
        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["Create Account", "Connect Apps", "Set Up Profile"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: i <= 1 ? T.accent : T.surface, border: `1px solid ${i <= 1 ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i <= 1 ? T.bg : T.textDim }}>
                  {i < 1 ? <Check size={12} /> : i + 1}
                </div>
                <span style={{ fontSize: 12, color: i <= 1 ? T.text : T.textDim, fontWeight: i === 1 ? 700 : 400 }}>{step}</span>
              </div>
              {i < 2 && <div style={{ width: 32, height: 1, background: T.border }} />}
            </div>
          ))}
        </div>
        <button onClick={() => onNavigate("landing")} style={{ ...btn(connectedCount > 0), padding: connectedCount > 0 ? "10px 24px" : "10px 24px", fontSize: 13 }}>
          {connectedCount > 0 ? `Continue (${connectedCount} connected)` : "Skip for now"} <ArrowRight size={16} />
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "40px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
            Connect your <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>data sources</span>
          </h1>
          <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 4px" }}>The more you connect, the smarter AIM gets. You can always add more later.</p>
          <p style={{ fontSize: 12, color: T.textDim }}>🔒 Your data is encrypted and never sold. See our <a href="#" style={{ color: T.accent, textDecoration: "none" }}>Privacy Policy</a>.</p>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.textDim }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps..."
              style={{ ...inputStyle, padding: "12px 16px 12px 40px", fontSize: 13 }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(catLabels).map(([key, label]) => {
              const isActive = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  style={{ padding: "8px 14px", background: isActive ? T.accentDim : T.card, border: `1px solid ${isActive ? T.accentMid : T.border}`, borderRadius: 10, fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.textDim, cursor: "pointer", fontFamily: font, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                  {key !== "all" && <span style={{ marginRight: 4 }}>{catIcons[key]}</span>}{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Apps grouped by category */}
        {filter === "all" ? (
          Object.entries(grouped).map(([cat, apps]) => (
            <div key={cat} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{catIcons[cat]}</span>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{catLabels[cat]}</h3>
                <span style={{ fontSize: 11, color: T.textDim }}>({apps.length})</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {apps.map(app => (
                  <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {filtered.map(app => (
              <AppCard key={app.name} app={app} isConnected={!!connected[app.name]} onToggle={() => toggleConnect(app.name)} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: T.textSoft }}>No apps match your search.</p>
          </div>
        )}

        {/* Request integration */}
        <div style={{ marginTop: 32, padding: "24px", background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, textAlign: "center" }}>
          {!showRequest ? (
            <div>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 12px" }}>Device or app not listed?</p>
              <button onClick={() => setShowRequest(true)} style={{ ...btn(false), fontSize: 13, padding: "10px 24px" }}>
                <MessageCircle size={16} /> Request an Integration
              </button>
            </div>
          ) : requestSent ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: T.accent, margin: "0 0 4px" }}>Request sent!</p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: 0 }}>We'll review your suggestion and get back to you.</p>
            </div>
          ) : (
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Request an Integration</p>
              <p style={{ fontSize: 12, color: T.textSoft, margin: "0 0 16px" }}>Tell us which app or device you'd like to see connected to AIM.</p>
              <textarea value={requestText} onChange={e => setRequestText(e.target.value)}
                placeholder="e.g. 'Polar H10 heart rate monitor' or 'Fuelin nutrition app'"
                style={{ ...inputStyle, padding: "14px 16px", height: 80, resize: "vertical", fontFamily: font }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
                <button onClick={() => setShowRequest(false)} style={{ ...btn(false), fontSize: 13, padding: "10px 20px" }}>Cancel</button>
                <button onClick={() => setRequestSent(true)} style={{ ...btn(true), fontSize: 13, padding: "10px 20px" }}>
                  Submit Request <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP CARD COMPONENT ──
function AppCard({ app, isConnected, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: isConnected ? "rgba(0,229,160,0.04)" : T.card, border: `1px solid ${isConnected ? "rgba(0,229,160,0.2)" : T.border}`, borderRadius: 14, transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      onMouseOver={e => { if (!isConnected) e.currentTarget.style.borderColor = T.borderHover; }}
      onMouseOut={e => { if (!isConnected) e.currentTarget.style.borderColor = T.border; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${app.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${app.color}30` }}>
          {app.icon}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{app.name}</span>
            {app.note && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(139,92,246,0.1)", color: T.purple, fontWeight: 600 }}>COMING SOON</span>}
          </div>
          <span style={{ fontSize: 12, color: T.textDim }}>{app.desc}</span>
        </div>
      </div>
      <button onClick={onToggle} disabled={!!app.note}
        style={{
          padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: app.note ? "not-allowed" : "pointer",
          background: isConnected ? "rgba(0,229,160,0.12)" : app.note ? T.surface : T.accentDim,
          border: `1px solid ${isConnected ? "rgba(0,229,160,0.3)" : app.note ? T.border : T.accentMid}`,
          color: isConnected ? T.accent : app.note ? T.textDim : T.accent,
          fontFamily: font, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
          opacity: app.note ? 0.5 : 1,
        }}>
        {isConnected ? <><Check size={14} /> Connected</> : app.note ? "Soon" : "Connect"}
      </button>
    </div>
  );
}
