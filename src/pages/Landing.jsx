import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Zap, Brain, Target, Heart, TrendingUp, ArrowRight, Check, Star } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { btn } from "../theme/styles";
import NeuralBackground from "../components/NeuralBackground";

export default function Landing() {
  const navigate = useNavigate();
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
    { name: "Jake W.", role: "Cat 3 Road Racer", text: "AIM flagged a left-right power imbalance that got worse on climbs. I started the single-leg gym protocol it prescribed and gained 14W at threshold in six weeks. My coach never caught it.", stars: 5 },
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
          <button onClick={() => navigate("/signin")} style={{ ...btn(false), padding: "8px 20px", fontSize: 13 }}>Sign In</button>
          <button onClick={() => navigate("/signup")} style={{ ...btn(true), padding: "10px 24px", fontSize: 13 }}>Get Started</button>
        </div>
      </nav>

      {/* ── CLEAN HERO (above the fold — same as original) ── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <NeuralBackground />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 800, margin: "0 auto", padding: "48px 48px", background: `radial-gradient(ellipse at center, ${T.bg} 0%, ${T.bg}ee 60%, transparent 100%)`, borderRadius: 32 }}>
          <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "0 0 24px" }}>
            Your AI<br />
            <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Performance Coach</span>
          </h1>
          <p style={{ fontSize: 19, color: T.textSoft, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px", fontWeight: 400 }}>
            AIM connects all your fitness data — power, sleep, recovery, body composition, blood work, and DEXA scans — and uses AI to deliver actionable insights with specific recommendations, not just numbers.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <button onClick={() => navigate("/signup")} style={{ ...btn(true), fontSize: 16, padding: "16px 36px" }}>Start Your Free Trial <ArrowRight size={18} /></button>
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
          {[{ n: "100+", l: "Metrics Tracked" }, { n: "18+", l: "App Integrations" }, { n: "40+", l: "Blood Biomarkers" }, { n: "24/7", l: "AI Analysis" }].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: mono, background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
              <div style={{ fontSize: 13, color: T.textSoft, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── A MESSAGE FROM THE FOUNDER ── */}
      <section id="about" style={{ padding: "80px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", marginBottom: 48 }}>A Message from the Founder</p>
          <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
            {/* Photo placeholder */}
            <div style={{ flexShrink: 0, width: 320 }}>
              <div style={{ width: 320, height: 400, borderRadius: 20, overflow: "hidden", position: "relative" }}>
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
              <div style={{ fontSize: 48, color: T.accent, fontWeight: 800, lineHeight: 1, marginBottom: 8, opacity: 0.3 }}>"</div>
              <p style={{ fontSize: 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                I went from Venture Capital in Silicon Valley to the Olympic podium, and the whole way I was searching for insights that didn't exist. I had power files, blood work, sleep data, body comp scans, and a hormone cycle that affected everything. But no tool could connect them.
              </p>
              <p style={{ fontSize: 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
                I built AIM because I wanted the analysis I couldn't find anywhere else. The biomarker patterns, the recovery protocols, the performance boosters, the training frameworks that actually won races. Everything I learned racing at the highest level, I've put into this platform.
              </p>
              <p style={{ fontSize: 20, color: T.text, lineHeight: 1.7, margin: "0 0 20px", fontWeight: 500 }}>
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
      <section id="why" style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            This isn't another <span style={{ color: T.textDim, textDecoration: "line-through", textDecorationColor: T.danger + "60" }}>fitness dashboard</span>
          </h2>
          <p style={{ fontSize: 17, color: T.textSoft, maxWidth: 580, margin: "0 auto" }}>Other apps show you charts. AIM tells you what they mean and exactly what to do about it.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { emoji: "\u{1F9EC}", title: "Cross-domain intelligence no one else has", desc: "AIM is the only platform that reasons across your blood work, training data, sleep, body composition, nutrition, and menstrual cycle simultaneously. Your ferritin trend explains your power plateau. Your DEXA changes reveal whether weight loss is fat or muscle.", highlight: "Other apps: here's your data. AIM: here's what it means together and what to do about it." },
            { emoji: "\u{1F3C5}", title: "Built by a 2x Olympic Champion", desc: "The analysis frameworks, biomarker ranges, and training prescriptions in AIM come from the same system used to win Olympic gold — refined through years of world-class competition, sports science research, and elite coaching.", highlight: "Every recommendation is grounded in what actually works at the highest level." },
            { emoji: "\u{1FA78}", title: "Your blood work and DEXA scans, decoded", desc: "Upload your lab results and body scans. AIM uses athlete-optimal ranges (not clinical ranges designed to catch disease) to flag what matters for performance. It tracks trends over time, cross-references with your training load, and tells you exactly when to retest.", highlight: "43% of female athletes are iron-deficient. Clinical labs say they're \"normal.\"" },
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
              { type: "warning", label: "HEAT ADAPTATION", text: "Your HR:power ratio jumped 12% in yesterday's 85°F ride compared to last week's similar effort at 60°F — your cardiac drift was 9.1% vs. 2.8%. You're not heat adapted yet, and your race is in 3 weeks. → Recommendation: Add 20-minute post-ride sauna sessions at 80-100°C, 3× per week for 3 weeks. Based on Scoon et al., this expands plasma volume 7% and closes the heat gap. Track your drift weekly — you should see it halve by week 2." },
              { type: "positive", label: "BLOOD WORK × TRAINING", text: "Your ferritin dropped from 62 → 28 ng/mL over the past 3 months. Combined with your training volume increase (+26%) and luteal phase timing, this is likely driving your VO2max plateau. → Recommendation: Begin 65mg iron bisglycinate with vitamin C, taken on an empty stomach away from coffee. Retest in 8-12 weeks." },
              { type: "action", label: "BIOMECHANICS", text: "Your L:R power balance shifts from 50/50 on flats to 54/46 on climbs above 6% — your left leg is compensating, and the imbalance worsens with fatigue. This costs you ~8W at threshold on steep terrain. → Prescription: Add 2× weekly single-leg pedal drills (3×2min each leg at 85% FTP), Bulgarian split squats (3×8 each side), and low-cadence force intervals (5×3min at 55rpm) to build right-leg recruitment." },
              { type: "warning", label: "SLEEP × RECOVERY", text: "Your deep sleep dropped 53% this week (48min vs. 1h42m avg) and your EightSleep bed temp was set to -1°C. Historically, your deep sleep is 34% higher at -4°C. Combined with your HRV declining 74→38ms over 3 nights, tomorrow's planned VO2max session will be counterproductive. → Recommendation: Set bed temp to -4°C tonight, skip tomorrow's intervals, replace with Z2 endurance. Your HRV should rebound within 48 hours." },
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

      {/* ── INTEGRATIONS ── */}
      <section id="integrations" style={{ padding: "100px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>All your data, <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>one platform</span></h2>
            <p style={{ fontSize: 17, color: T.textSoft, maxWidth: 560, margin: "0 auto" }}>Connect the tools you already use. AIM pulls everything together so you don't have to.</p>
          </div>
          {[
            { heading: "Coming Soon", apps: [
              { name: "Strava", desc: "Ride & run data" },
              { name: "Whoop", desc: "Recovery & strain" },
              { name: "Oura", desc: "Sleep & readiness" },
              { name: "TrainingPeaks", desc: "Training plans" },
              { name: "Withings", desc: "Weight & body comp" },
              { name: "Garmin", desc: "Device data" },
              { name: "Wahoo", desc: "Power & cycling" },
              { name: "EightSleep", desc: "Sleep tracking" },
              { name: "Apple Health", desc: "Health data hub" },
              { name: "Hammerhead", desc: "Ride analytics" },
              { name: "Hexis", desc: "Nutrition timing" },
              { name: "MyFitnessPal", desc: "Calorie tracking" },
              { name: "Cronometer", desc: "Micronutrients" },
              { name: "Blood Work", desc: "Lab panels" },
              { name: "DEXA Scans", desc: "Body composition" },
              { name: "Supersapiens", desc: "Glucose monitoring" },
              { name: "Polar", desc: "HR & training" },
              { name: "INSCYD", desc: "Metabolic profiling" },
            ]},
          ].map((group) => (
            <div key={group.heading} style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.warn, letterSpacing: "0.06em", textTransform: "uppercase" }}>{group.heading}</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                {group.apps.map((app) => (
                  <div key={app.name} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 12px", textAlign: "center", transition: "all 0.3s", cursor: "default" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.transform = "translateY(-3px)"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 20, fontWeight: 700, color: T.accent }}>
                      {app.name.charAt(0)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{app.name}</div>
                    <div style={{ fontSize: 11, color: T.textDim }}>{app.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 40px" }}>
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
                  <button onClick={() => navigate("/signup")} style={{ ...btn(isPro), width: "100%", justifyContent: "center", marginBottom: 24, fontSize: 14, padding: "13px 24px" }}>{plan.cta} <ArrowRight size={16} /></button>
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
          <button onClick={() => navigate("/signup")} style={{ ...btn(true), fontSize: 16, padding: "16px 40px", position: "relative" }}>Get Started Free <ArrowRight size={18} /></button>
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
            <div>
              <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Product</div>
              <a href="#features" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Features</a>
              <a href="#integrations" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Integrations</a>
              <a href="#pricing" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Pricing</a>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Company</div>
              <a href="#about" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>About</a>
              <Link to="/contact" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Contact</Link>
              <a href="#" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Careers</a>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Legal</div>
              <Link to="/privacy" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Privacy Policy</Link>
              <Link to="/terms" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Terms of Service</Link>
              <Link to="/cookies" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Cookie Policy</Link>
              <Link to="/data-processing" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Data Processing</Link>
              <Link to="/gdpr" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>GDPR</Link>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.textDim }}>&copy; 2026 AIM Performance Intelligence. Founded by Kristen Faulkner.</span>
          <span style={{ fontSize: 12, color: T.textDim }}>Built with ♥ for athletes who love data</span>
        </div>
      </footer>
    </div>
  );
}
