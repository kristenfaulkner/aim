import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Menu, X, User, Settings, LayoutDashboard, LogOut } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { btn } from "../theme/styles";
import SEO from "../components/SEO";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";

const SERIF = "'Instrument Serif', 'DM Serif Display', Georgia, serif";

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
    { "@type": "Offer", name: "Starter", price: "19.00", priceCurrency: "USD", description: "For athletes ready to get serious about their data" },
    { "@type": "Offer", name: "Pro", price: "49.00", priceCurrency: "USD", description: "For competitive athletes who want every edge" },
    { "@type": "Offer", name: "Elite", price: "99.00", priceCurrency: "USD", description: "The full platform — blood work, body comp, and cycle intelligence" },
  ],
};

// ── Scroll-triggered reveal ──────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 24, style = {} }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "none" : `translateY(${y}px)`,
      transition: `opacity 0.65s cubic-bezier(0.23,1,0.32,1) ${delay}s, transform 0.65s cubic-bezier(0.23,1,0.32,1) ${delay}s`,
      willChange: "opacity, transform",
      ...style,
    }}>{children}</div>
  );
}

// ── Animated data constellation (desktop hero background) ────────────────────
function Constellation() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const ctx = canvas.getContext("2d");

    const COUNT = 8;
    const nodes = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1.5 + 1,
      alpha: Math.random() * 0.12 + 0.04,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(16,185,129,${0.04 * (1 - dist / 220)})`; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${n.alpha})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.7 }} />;
}

// ── Cross-domain insight data ────────────────────────────────────────────────
const INSIGHTS = [
  {
    tag: "HRV Decline \u2192 Power Fade", color: T.blue, bg: "rgba(59,130,246,0.05)", icon: "\uD83D\uDCC9",
    domains: ["Oura", "Wahoo"], metric: { value: "\u22124.6%", label: "NP drop", direction: "down" },
    finding: "Your overnight HRV has declined 74ms \u2192 62ms \u2192 38ms over 3 nights. Historically, when your HRV drops below 45ms for 2+ consecutive days, your NP drops 8\u201314% on comparable efforts. Today's NP was 272W vs. your 285W average \u2014 a 4.6% drop, right on pattern.",
    action: "Keep tomorrow at Z1/Z2. AIM will track your HRV recovery slope overnight \u2014 if it rebounds above 55ms, you're cleared for intensity Thursday. If not, AIM will push your interval session back automatically.",
    onlyAIM: "Oura shows HRV declining. Wahoo shows power dropping. Only AIM connects the 3-night HRV trajectory to your personal power-fade pattern to predict tomorrow's performance before you clip in.",
  },
  {
    tag: "Race Day Projection", color: T.accent, bg: T.accentDim, icon: "\uD83C\uDFC1",
    domains: ["Strava", "Withings", "Weather", "Oura"], metric: { value: "4:42:18", label: "projected finish", direction: "up" },
    finding: "Your hillclimb race is in 12 days. AIM combined your current CTL of 78, FTP of 298W, projected race-day weight (86.2kg from Withings trend), weather forecast (68\u00B0F, 8mph NW wind), altitude penalty at 2,200ft (\u22122.8%), and your personal taper response from 3 previous tapers (you peak at TSB +12 on day 11).",
    action: "Start taper in 4 days. Your best pattern: reduce volume 40%, keep two short intensity sessions. Race-day FTP after taper: ~305W. Fuel at 72g carbs/hr \u2014 your tested ceiling in moderate temps.",
    onlyAIM: "Five data sources, one number. No app can combine your fitness, weight trend, weather, altitude model, and personal taper curve into a specific finish time. AIM can.",
  },
  {
    tag: "Hydration \u2192 Cardiac Drift", color: T.amber, bg: "rgba(245,158,11,0.05)", icon: "\uD83D\uDCA7",
    domains: ["Withings", "Wahoo", "Weather"], metric: { value: "8.1%", label: "cardiac drift", direction: "up" },
    finding: "Your Withings hydration reading this morning was 62% \u2014 below your 65% baseline. In hot conditions (35\u00B0C today), starting under-hydrated compounds cardiac drift. Your 8.1% drift today vs. 3.2% on a similar effort when you weighed in at 65% hydration.",
    action: "Pre-hydrate with 20oz electrolyte mix 2 hours before tomorrow's ride. On hot days starting below 65%, increase on-bike intake to 28\u201332oz/hr.",
    onlyAIM: "Your scale measured hydration. Your power meter showed drift. The weather app knew it was hot. Only AIM connected all three to separate what was dehydration from what was fatigue.",
  },
  {
    tag: "Menstrual Cycle \u00D7 HR Drift", color: T.purple, bg: "rgba(139,92,246,0.05)", icon: "\uD83D\uDCC8",
    domains: ["Oura", "Withings", "Wahoo"], metric: { value: "+18%", label: "HR drift", direction: "up" },
    finding: "You're on day 19 (luteal phase). Your HR drift during threshold efforts runs 18% higher than your follicular baseline. Withings shows +1.2kg \u2014 water retention from elevated progesterone, not fat gain. Your core temp is 0.4\u00B0C higher, which explains why the same watts feel 2 RPE points harder.",
    action: "Cut target power 8% this week. Schedule breakthrough sessions for your follicular phase (~day 5\u201312). The scale will normalize by then.",
    onlyAIM: "Oura detects your cycle phase from temperature. Withings shows the scale moved but not why. Wahoo shows HR drift. Only AIM connects all three.",
  },
  {
    tag: "Sleep \u2192 Performance", color: "#6366f1", bg: "rgba(99,102,241,0.05)", icon: "\uD83D\uDCA4",
    domains: ["Eight Sleep", "Oura", "Strava"], metric: { value: "+4.2%", label: "EF per hour", direction: "up" },
    finding: "Your data across 90 sessions shows a clear dose-response: each additional hour of sleep above 6.5h produces 4.2% higher Efficiency Factor the next day. Your top 10% performances all followed nights where you fell asleep before 10:15 PM. Last 3 nights averaged 5.8 hours.",
    action: "Set a sleep alarm for 9:45 PM. Lower Eight Sleep to \u22124\u00B0C \u2014 your deep sleep is 22 minutes longer vs \u22121\u00B0C. Expect recovery in 2 nights.",
    onlyAIM: "Eight Sleep knows your bed temp. Oura knows your sleep stages. Only AIM quantifies how many watts each extra hour is worth for you.",
  },
  {
    tag: "Heat Adaptation Complete", color: T.orange, bg: "rgba(249,115,22,0.05)", icon: "\uD83C\uDF21\uFE0F",
    domains: ["Weather", "Wahoo", "Strava"], metric: { value: "2%", label: "remaining gap", direction: "up" },
    finding: "Power:HR at 95\u00B0F was 1.79 W/bpm vs. 1.45 at 68\u00B0F three weeks ago \u2014 only 2% gap. Early summer, heat caused a 21% drop. Plasma volume expansion nearly complete after 11 heat rides over 6 weeks.",
    action: "Race in heat with confidence. For temps up to 90\u00B0F, reduce power just 3% (vs 10% in June). Maintain 1\u20132 heat exposures/week.",
    onlyAIM: "No app tracks your personal heat decay curve. Only AIM shows you went from 21% penalty to 2% over 6 weeks.",
  },
  {
    tag: "Blood Work \u00D7 Plateau", color: T.pink, bg: "rgba(236,72,153,0.05)", icon: "\uD83E\uDE78",
    domains: ["Blood panel", "Strava", "Oura"], metric: { value: "3 wks", label: "plateau", direction: "down" },
    finding: "FTP flat at 293\u2013298W for 3 weeks despite +22% load. RHR up 2 bpm. Ferritin at 52 ng/mL (was 85). Lab says 'normal' \u2014 athlete-optimal is 80+. Low iron is limiting oxygen transport.",
    action: "Discuss iron supplementation with your doctor. AIM will track ferritin against EF trends. Retest in 8 weeks.",
    onlyAIM: "Lab said 'normal.' Strava shows plateau. Oura shows rising RHR. Only AIM connects all four signals.",
  },
];

// ── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ item, index, isMobile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={index * (isMobile ? 0.04 : 0.06)}>
      <div
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{
          background: T.card, border: `1px solid ${hovered ? item.color + "25" : T.border}`,
          borderRadius: isMobile ? 14 : 16, padding: isMobile ? "18px" : "22px 24px",
          transition: "all 0.25s", boxShadow: hovered ? `0 6px 24px ${item.color}08` : "none",
          marginBottom: isMobile ? 10 : 0,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 8 : 14, marginBottom: isMobile ? 10 : 14, justifyContent: isMobile ? "space-between" : undefined }}>
          {!isMobile && (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 0 : 6, flexWrap: "wrap" }}>
              {isMobile && <span style={{ fontSize: 16 }}>{item.icon}</span>}
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: item.color, background: item.bg, borderRadius: 5, padding: "3px 8px" }}>{item.tag}</span>
              {!isMobile && <span style={{ fontSize: 11, color: T.textDim }}>{item.domains.join(" + ")}</span>}
            </div>
            {!isMobile && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: T.text, fontWeight: 500 }}>{item.finding}</p>}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: mono, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: item.metric.direction === "up" ? T.accent : item.color, lineHeight: 1 }}>{item.metric.value}</div>
            <div style={{ fontSize: isMobile ? 9 : 10, color: T.textDim, marginTop: 2, whiteSpace: "nowrap" }}>{item.metric.label}</div>
          </div>
        </div>

        {/* Finding (mobile only — on desktop it's inline above) */}
        {isMobile && <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.55, color: T.text }}>{item.finding}</p>}

        {/* Action */}
        <div style={{ background: item.bg, borderRadius: isMobile ? 8 : 10, padding: isMobile ? "10px 12px" : "14px 16px", borderLeft: `3px solid ${item.color}`, marginLeft: isMobile ? 0 : 54 }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: item.color, marginBottom: isMobile ? 3 : 4 }}>What to do</div>
          <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, lineHeight: 1.6, color: T.text }}>{item.action}</p>
        </div>

        {/* Only AIM */}
        <div style={{ marginLeft: isMobile ? 0 : 54, marginTop: 8, display: "flex", alignItems: "flex-start", gap: isMobile ? 5 : 6 }}>
          <span style={{ fontSize: isMobile ? 9 : 10, color: item.color, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>{"\u2726"}</span>
          <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, lineHeight: 1.5, color: T.textSoft, fontStyle: "italic" }}>{item.onlyAIM}</p>
        </div>
      </div>
    </Reveal>
  );
}

// ── Dashboard mockup ─────────────────────────────────────────────────────────
function DashboardMockup({ isMobile }) {
  const mockInsights = [
    { tag: "Adaptation Confirmed", color: T.accent, bg: T.accentDim, text: "EF improved 1.68\u21921.85 across 4 sessions. AIM controlled for Weather, Oura HRV, and Eight Sleep. Real fitness gains.", action: "Progress to 3\u00D715 at 102% FTP next session." },
    { tag: "Heat \u00D7 Adaptation", color: T.amber, bg: "rgba(245,158,11,0.05)", text: "Today was 28\u00B0F warmer than your baseline (Weather API). But your Power:HR shows only a 2% gap vs. cooler rides \u2014 down from 21% in June.", action: "Race-ready for heat up to 90\u00B0F. Reduce power just 3% (vs 10% in June)." },
    { tag: "Race Projection", color: T.blue, bg: "rgba(59,130,246,0.05)", text: "Mt. Tam in 12 days. CTL 78 + Withings weight trend + Weather forecast + altitude penalty + your personal taper curve.", action: "Projected finish: 4:42:18. Start taper in 4 days. Fuel at 72g carbs/hr." },
  ];

  return (
    <div style={{ background: T.card, borderRadius: isMobile ? 14 : 16, border: `1px solid ${T.border}`, boxShadow: isMobile ? "0 8px 32px rgba(0,0,0,0.06)" : "0 24px 80px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", width: "100%", maxWidth: isMobile ? undefined : 900, margin: "0 auto" }}>
      {/* Browser chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 6, padding: isMobile ? "8px 12px" : "10px 14px", background: "#f5f5f4", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: isMobile ? 7 : 10, height: isMobile ? 7 : 10, borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: isMobile ? 7 : 10, height: isMobile ? 7 : 10, borderRadius: "50%", background: "#f59e0b" }} />
        <div style={{ width: isMobile ? 7 : 10, height: isMobile ? 7 : 10, borderRadius: "50%", background: "#22c55e" }} />
        {!isMobile && <div style={{ flex: 1, marginLeft: 12, background: "#e8e8e6", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: T.textSoft, fontFamily: "monospace" }}>aimfitness.ai/dashboard</div>}
        {isMobile && <span style={{ marginLeft: 8, fontSize: 9, color: T.textDim, fontFamily: "monospace" }}>aimfitness.ai</span>}
      </div>

      <div style={{ padding: isMobile ? 14 : "18px 20px", display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
        {/* Readiness strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.accentDim, border: `1px solid ${T.accentMid}`, borderRadius: isMobile ? 8 : 10, padding: isMobile ? "8px 12px" : "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8 }}>
            <span style={{ fontSize: isMobile ? 8 : 9, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>Readiness</span>
            <span style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: T.accent, fontFamily: mono }}>84</span>
          </div>
          <span style={{ fontSize: isMobile ? 9 : 10, color: T.accent }}>HRV 97ms {"\u00B7"} Sleep 7.8h {"\u00B7"} CTL 74</span>
        </div>

        {/* Ride metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: isMobile ? 3 : 4 }}>
          {[["NP", "266W"], ["TSS", "142"], ["EF", "1.85"], ["IF", "0.89"], ["Drift", "3.2%"]].map(([l, v]) => (
            <div key={l} style={{ textAlign: "center", padding: isMobile ? "4px 0" : "5px 0", background: T.bg, borderRadius: isMobile ? 4 : 5 }}>
              <div style={{ fontSize: isMobile ? 6 : 7, color: T.textDim, textTransform: "uppercase" }}>{l}</div>
              <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, fontFamily: mono, color: l === "EF" ? T.accent : T.text }}>{v}</div>
            </div>
          ))}
        </div>

        {/* AI header */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 6, marginTop: 2 }}>
          <div style={{ width: isMobile ? 14 : 18, height: isMobile ? 14 : 18, borderRadius: isMobile ? 4 : 6, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: isMobile ? 7 : 9, fontWeight: 800 }}>{"\u2726"}</span>
          </div>
          <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Insights {"\u00B7"} 15 new</span>
        </div>

        {/* Insight cards */}
        {mockInsights.map((ins, i) => (
          <div key={i} style={{ background: T.card, borderRadius: isMobile ? 8 : 10, padding: isMobile ? "9px 10px" : "12px 14px", border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 3 : 6 }}>
              <span style={{ fontSize: isMobile ? 8 : 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: ins.color, background: ins.bg, borderRadius: 4, padding: "2px 6px" }}>{ins.tag}</span>
              <span style={{ fontSize: isMobile ? 8 : 9, color: T.textDim, fontWeight: 600 }}>HIGH</span>
            </div>
            <p style={{ margin: "0 0 5px", fontSize: isMobile ? 10 : 11, lineHeight: 1.55, color: T.text }}>{ins.text}</p>
            <div style={{ background: ins.bg, borderRadius: isMobile ? 4 : 6, padding: isMobile ? "4px 7px" : "6px 10px", borderLeft: `2px solid ${ins.color}` }}>
              <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: ins.color }}>{"\u2192"} </span>
              <span style={{ fontSize: isMobile ? 9 : 10, color: T.text }}>{ins.action}</span>
            </div>
          </div>
        ))}

        {/* Chat input */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px" }}>
          <span style={{ fontSize: 10, color: T.textDim, flex: 1 }}>Ask anything about your training{"\u2026"}</span>
          <div style={{ background: T.gradient, borderRadius: 5, padding: "3px 8px", fontSize: 9, fontWeight: 700, color: "white" }}>Ask {"\u2726"}</div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  const navigate = useNavigate();
  const { user, profile, signout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const handleSignout = async () => { await signout(); navigate("/"); };
  const { isMobile, isTablet, isDesktop } = useResponsive();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const ctaText = user ? "Go to Dashboard" : "Create account";
  const ctaRoute = user ? "/dashboard" : "/signup";
  const visibleInsights = isMobile && !showAllInsights ? INSIGHTS.slice(0, 4) : INSIGHTS;

  const features = [
    { icon: "\u26A1", title: "AI-Powered Analysis", desc: "Every workout gets a full breakdown with specific, actionable recommendations \u2014 not just charts." },
    { icon: "\uD83D\uDD17", title: "18+ Integrations", desc: "Strava, Wahoo, Garmin, Oura, Whoop, Eight Sleep, Withings, blood panels, DEXA." },
    { icon: "\uD83E\uDDEC", title: "Cross-Domain Insights", desc: "Insights connecting sleep, training, blood work, and body comp that no single app can make." },
    { icon: "\uD83C\uDFAF", title: "Power Benchmarking", desc: "Compare to Cat 1\u20135 with prescribed workouts to close the gap." },
    { icon: "\uD83E\uDE78", title: "Health Lab", desc: "Athlete-optimal ranges, not clinical. Tracks trends over time." },
    { icon: "\uD83D\uDCC8", title: "Prescriptions", desc: "Exact watts, durations, and protocols tailored to your data and readiness." },
  ];

  const testimonials = [
    { quote: "AIM told me VO\u2082 was my limiter before my coach did. Prescribed intervals raised my 5-min power 22W in 8 weeks.", name: "Sarah K.", role: "Cat 2, Boulder CO", color: T.accent },
    { quote: "Moved my bedtime up 45 minutes. EF improved 8%. Free watts from doing nothing different on the bike.", name: "Marcus T.", role: "Masters 45+, Marin", color: T.blue },
    { quote: "Turns out my luteal phase HR drift is 18% higher. Now I schedule breakthroughs in my follicular window.", name: "Elena R.", role: "Pro Triathlete, Bay Area", color: T.purple },
  ];

  const plans = [
    { name: "Starter", price: billingAnnual ? 15 : 19, desc: "Getting serious about data", features: ["3 app connections", "AI workout analysis", "Power benchmarking", "Training prescriptions", "Boosters library"], featured: false },
    { name: "Pro", price: billingAnnual ? 39 : 49, badge: "Most Popular", desc: "For competitive athletes", features: ["Unlimited connections", "Full cross-domain AI", "Advanced prescriptions", "Recovery intelligence", "Supplement protocols", "Coach sharing"], featured: true },
    { name: "Elite", price: billingAnnual ? 79 : 99, badge: "Complete", desc: "Blood work, DEXA, cycle intel", features: ["Everything in Pro", "Health Lab", "Biomarker tracking", "Menstrual cycle AI", "Nutrition periodization", "Priority analysis"], featured: false },
  ];
  // On mobile, show Pro first
  const orderedPlans = isMobile ? [plans[1], plans[0], plans[2]] : plans;

  return (
    <div style={{ fontFamily: font, background: T.bg, color: T.text, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      <SEO path="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      {/* ═══ NAVIGATION ═══════════════════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        height: isMobile ? 56 : 60,
        background: scrolled || isMobile ? `${T.bg}ee` : "transparent",
        backdropFilter: scrolled || isMobile ? "blur(20px) saturate(1.5)" : "none",
        WebkitBackdropFilter: scrolled || isMobile ? "blur(20px) saturate(1.5)" : "none",
        borderBottom: scrolled || isMobile ? `1px solid ${T.border}` : "1px solid transparent",
        transition: "all 0.3s", display: "flex", alignItems: "center",
        padding: isMobile ? "0 16px" : "0 40px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: isMobile ? 7 : 8, textDecoration: "none", color: T.text }}>
            <div style={{ width: isMobile ? 28 : 30, height: isMobile ? 28 : 30, borderRadius: isMobile ? 7 : 8, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: isMobile ? 12 : 13 }}>AI</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: isMobile ? 16 : 18, letterSpacing: "-0.04em" }}>
              <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M
            </span>
            <span style={{ fontSize: 8, color: T.accent, fontWeight: 600, letterSpacing: "0.1em", marginLeft: -3 }}>BETA</span>
          </Link>

          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => navigate(ctaRoute)} style={{ fontSize: 12, fontWeight: 700, color: "white", background: T.gradient, borderRadius: 7, padding: "7px 14px", border: "none", cursor: "pointer", fontFamily: font }}>{user ? "Dashboard" : "Start free"}</button>
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 4, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: isTablet ? 20 : 28 }}>
              {["How it works", "Pricing"].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`} style={{ fontSize: 13, fontWeight: 500, color: T.textDim, transition: "color 0.15s", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = T.textSoft}
                  onMouseLeave={e => e.target.style.color = T.textDim}
                >{l}</a>
              ))}
              {user ? (
                <div style={{ position: "relative" }}>
                  <div onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.purple}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white, cursor: "pointer" }}>
                    {profile?.full_name ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                  </div>
                  {userMenuOpen && (<>
                    <div onClick={() => setUserMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 149 }} />
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, minWidth: 170, zIndex: 150, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                      {[{ icon: <LayoutDashboard size={14} />, label: "My Dashboard", to: "/dashboard" }, { icon: <User size={14} />, label: "Profile", to: "/profile" }, { icon: <Settings size={14} />, label: "Settings", to: "/settings" }].map(item => (
                        <button key={item.to} onClick={() => { setUserMenuOpen(false); navigate(item.to); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font }}>
                          {item.icon} {item.label}
                        </button>
                      ))}
                      <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                      <button onClick={() => { setUserMenuOpen(false); handleSignout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: font }}>
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </>)}
                </div>
              ) : (
                <>
                  <button onClick={() => navigate("/signin")} style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, border: "none", borderRadius: 8, padding: "7px 16px", background: "none", cursor: "pointer", fontFamily: font }}>Log in</button>
                  <button onClick={() => navigate("/signup")} style={{ fontSize: 13, fontWeight: 700, color: "white", background: T.gradient, borderRadius: 8, padding: "8px 18px", boxShadow: "0 2px 10px rgba(16,185,129,0.2)", border: "none", cursor: "pointer", fontFamily: font }}>Start free {"\u2192"}</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {isMobile && menuOpen && (
        <div style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 0, zIndex: 199, background: `${T.bg}fa`, backdropFilter: "blur(20px)", padding: "32px 24px" }}>
          {["How it works", "Features", "Pricing"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`} onClick={() => setMenuOpen(false)} style={{ display: "block", fontSize: 18, fontWeight: 600, color: T.text, padding: "16px 0", borderBottom: `1px solid ${T.border}`, textDecoration: "none" }}>{l}</a>
          ))}
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {user ? (
              <>
                <button onClick={() => { setMenuOpen(false); navigate("/dashboard"); }} style={{ ...btn(true), justifyContent: "center", width: "100%" }}>My Dashboard</button>
                <button onClick={() => { setMenuOpen(false); handleSignout(); }} style={{ ...btn(false), justifyContent: "center", width: "100%", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}>Sign Out</button>
              </>
            ) : (
              <>
                <button onClick={() => { setMenuOpen(false); navigate("/signup"); }} style={{ ...btn(true), justifyContent: "center", width: "100%" }}>Get Started</button>
                <button onClick={() => { setMenuOpen(false); navigate("/signin"); }} style={{ ...btn(false), justifyContent: "center", width: "100%" }}>Log in</button>
              </>
            )}
          </div>
        </div>
      )}

      <main>
        {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
        <section style={{
          paddingTop: isMobile ? 100 : isTablet ? 150 : 170, paddingBottom: isMobile ? 48 : 96,
          paddingLeft: isMobile ? 20 : 40, paddingRight: isMobile ? 20 : 40,
          background: "linear-gradient(180deg, #f2f9f6 0%, #fafaf9 60%)",
          position: "relative", overflow: "hidden",
        }}>
          {isDesktop && <Constellation />}
          <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <Reveal delay={0.04}>
              <h1 style={{
                textAlign: "center",
                fontSize: isMobile ? 40 : isTablet ? 56 : "clamp(48px, 6.5vw, 80px)",
                fontFamily: SERIF, fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.03em",
                margin: "0 auto", maxWidth: 800,
              }}>
                Five apps.<br />Zero answers.{isMobile ? <br /> : " "}
                <em style={{ fontStyle: "italic", background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Until now.</em>
              </h1>
            </Reveal>

            <Reveal delay={0.08}>
              <p style={{
                textAlign: "center", fontSize: isMobile ? 15 : "clamp(15px, 1.5vw, 18px)",
                lineHeight: 1.6, color: T.textDim, maxWidth: 520, margin: isMobile ? "20px auto 32px" : "24px auto 40px",
              }}>
                AIM connects your training, sleep, recovery, blood work, and body comp {"\u2014"} then tells you exactly what to do next.
              </p>
            </Reveal>

            {/* CTA */}
            <Reveal delay={0.12}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => navigate(ctaRoute)} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: T.gradient, color: "white", fontWeight: 700,
                  fontSize: isMobile ? 15 : 16, padding: isMobile ? "15px 28px" : "14px 32px",
                  borderRadius: isMobile ? 12 : 10, border: "none", cursor: "pointer", fontFamily: font,
                  width: isMobile ? "100%" : "auto", minHeight: isMobile ? 48 : undefined,
                  boxShadow: "0 4px 20px rgba(16,185,129,0.25)",
                }}>
                  {ctaText} <ArrowRight size={16} />
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: 12, color: T.textDim, marginTop: 12, letterSpacing: "0.01em" }}>
                Free 14-day trial {"\u00B7"} No credit card required
              </p>
            </Reveal>

            {/* Integration logos — single quiet row */}
            <Reveal delay={0.16}>
              <div style={{ display: "flex", gap: isMobile ? 18 : 32, justifyContent: "center", flexWrap: "wrap", marginTop: isMobile ? 36 : 56 }}>
                {["Strava", "Wahoo", "Garmin", "Oura", "Whoop", "Withings"].map(n => (
                  <span key={n} style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: "rgba(0,0,0,0.18)", letterSpacing: "0.01em" }}>{n}</span>
                ))}
              </div>
            </Reveal>

            {/* Dashboard mockup */}
            <Reveal delay={isMobile ? 0 : 0.2} y={40}>
              <div style={{ marginTop: isMobile ? 40 : 64 }}>
                <DashboardMockup isMobile={isMobile} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ STATS BAR ═════════════════════════════════════════════════════ */}
        <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: isMobile ? "20px" : "24px 40px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: isMobile ? "grid" : "flex", gridTemplateColumns: "repeat(4, 1fr)", gap: isMobile ? 8 : 48, justifyContent: "center", flexWrap: "wrap", textAlign: "center" }}>
            {[["100+", "Metrics"], ["18+", "Integrations"], ["25+", "Biomarkers"], ["24/7", "AI"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: mono, fontSize: isMobile ? 20 : 28, fontWeight: 800, background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{n}</div>
                <div style={{ fontSize: isMobile ? 10 : 12, color: T.textDim, marginTop: isMobile ? 1 : 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
        <section id="how-it-works" style={{ padding: isMobile ? "48px 20px" : "72px 40px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <Reveal>
              <h2 style={{ textAlign: "center", fontSize: isMobile ? 28 : "clamp(24px, 3vw, 36px)", fontFamily: SERIF, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 24px" }}>
                Up and running in <em style={{ fontStyle: "italic", color: T.accent }}>2 minutes.</em>
              </h2>
            </Reveal>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { step: "1", title: "Connect your apps", desc: "Link Strava, Oura, Whoop, and 18+ more. One-click OAuth.", time: "60 seconds" },
                { step: "2", title: "AIM analyzes your data", desc: "Training, sleep, recovery, blood work cross-referenced across 30+ categories.", time: "Instant" },
                { step: "3", title: "Get your first insight", desc: "Specific recommendations before your next workout.", time: "Before your next ride" },
              ].map((s, i) => (
                <Reveal key={i} delay={i * (isMobile ? 0.06 : 0.08)}>
                  <div style={{ flex: isMobile ? undefined : "1 1 240px", maxWidth: isMobile ? undefined : 280, textAlign: isMobile ? "left" : "center", display: isMobile ? "flex" : "block", gap: isMobile ? 14 : undefined, alignItems: isMobile ? "flex-start" : undefined }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: T.gradient,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: isMobile ? undefined : "0 auto 14px",
                      fontSize: isMobile ? 14 : 16, fontWeight: 800, color: "white", flexShrink: 0,
                    }}>{s.step}</div>
                    <div>
                      <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, margin: "0 0 3px" }}>{s.title}</h3>
                      <p style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.55, color: T.textSoft, margin: "0 0 3px" }}>{s.desc}</p>
                      <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: T.accent }}>{s.time}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FOUNDER ════════════════════════════════════════════════════════ */}
        <section style={{ padding: isMobile ? "48px 20px" : "100px 40px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <Reveal>
              <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: isMobile ? undefined : "220px 1fr", gap: isMobile ? undefined : 56, alignItems: "start" }}>
                {/* Photo */}
                <div style={{ textAlign: "center", marginBottom: isMobile ? 20 : 0 }}>
                  <div style={{
                    width: isMobile ? 100 : 220, height: isMobile ? 120 : 280, borderRadius: isMobile ? 14 : 16,
                    margin: isMobile ? "0 auto 16px" : "0 0 16px", overflow: "hidden", border: `1px solid ${T.border}`,
                  }}>
                    <img src="/kristen.jpg" alt="Kristen Faulkner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Kristen Faulkner</div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: T.accent, fontWeight: 700, marginTop: isMobile ? 2 : 3 }}>Founder & CEO</div>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: T.textDim, marginTop: isMobile ? 1 : 2, lineHeight: 1.4 }}>
                    2{"\u00D7"} Olympic Gold Medalist{!isMobile && <><br />Road Race & Team Pursuit<br />Paris 2024</>}
                  </div>
                </div>

                {/* Quote */}
                <div style={{ textAlign: isMobile ? "center" : "left" }}>
                  {!isMobile && <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accent, marginBottom: 20 }}>A message from the founder</p>}
                  <div style={{ fontSize: isMobile ? 32 : 44, color: T.accentMid, fontFamily: "Georgia, serif", lineHeight: 0.8, marginBottom: isMobile ? 12 : 16, textAlign: isMobile ? "center" : "left" }}>{"\u201C"}</div>
                  <p style={{ fontSize: isMobile ? 16 : 19, lineHeight: 1.75, color: T.text, marginBottom: isMobile ? 14 : 18, fontFamily: SERIF, fontWeight: 400 }}>
                    I went from venture capital in Silicon Valley to the Olympic podium, and like every serious athlete, I tried to measure everything.
                  </p>
                  <p style={{ fontSize: isMobile ? 13 : 15, lineHeight: 1.75, color: T.textSoft, marginBottom: isMobile ? 14 : 18 }}>
                    Power files. Heart rate. Sleep and HRV. Blood work. Body composition. But the more data I collected, the harder it was to know what actually mattered. I didn't need another dashboard. I needed the connections between them, and they didn't exist.
                  </p>
                  <p style={{ fontSize: isMobile ? 13 : 15, lineHeight: 1.75, color: T.textSoft, marginBottom: isMobile ? 14 : 18 }}>
                    So I built AIM: cross-domain performance intelligence that finds patterns across your training and health data, and turns them into clear insights and next actions.
                  </p>
                  <p style={{ fontSize: isMobile ? 13 : 15, lineHeight: 1.75, color: T.textSoft, marginBottom: isMobile ? 14 : 18 }}>
                    For me, it surfaced something I wasn't even tracking: my hormone cycle was impacting performance and recovery. Seeing that pattern changed how I approach training.
                  </p>
                  <p style={{ fontSize: isMobile ? 14 : 17, lineHeight: 1.7, color: T.text, fontWeight: 600 }}>
                    Our health is our most valuable asset. I want to make world-class performance intelligence accessible to every athlete and coach, not just professionals.
                  </p>
                  {!isMobile && <>
                    <div style={{ width: 40, height: 2, background: T.gradient, borderRadius: 2, marginTop: 20 }} />
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Kristen Faulkner</div>
                      <div style={{ fontSize: 13, color: T.textDim }}>Founder</div>
                    </div>
                  </>}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ CROSS-DOMAIN INSIGHTS ═════════════════════════════════════════ */}
        <section id="features" style={{ padding: isMobile ? "48px 20px" : "100px 40px", background: T.card, borderTop: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 56 }}>
                <p style={{ fontSize: isMobile ? 10 : 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accent, marginBottom: isMobile ? 10 : 14 }}>Real AI analysis</p>
                <h2 style={{ fontSize: isMobile ? 28 : "clamp(28px, 4vw, 48px)", fontFamily: SERIF, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 10px" }}>
                  Every insight comes with <em style={{ fontStyle: "italic", color: T.accent }}>a plan.</em>
                </h2>
                <p style={{ fontSize: isMobile ? 13 : 16, color: T.textSoft, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
                  Other apps show you charts. AIM tells you what they mean and what to do about it.
                </p>
              </div>
            </Reveal>

            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 0 : 12 }}>
              {visibleInsights.map((item, i) => <InsightCard key={i} item={item} index={i} isMobile={isMobile} />)}
            </div>

            {isMobile && !showAllInsights && (
              <button onClick={() => setShowAllInsights(true)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", padding: "14px", borderRadius: 10,
                border: `1.5px solid ${T.border}`, background: "transparent",
                color: T.text, fontSize: 14, fontWeight: 700, marginTop: 8, minHeight: 48,
                cursor: "pointer", fontFamily: font,
              }}>
                See {INSIGHTS.length - 4} more insight types {"\u2193"}
              </button>
            )}

            <Reveal delay={0.3}>
              <div style={{ textAlign: "center", marginTop: isMobile ? 24 : 40 }}>
                {!isMobile && <p style={{ fontSize: 13, color: T.textDim, marginBottom: 20 }}>These are real insight types from real athlete data. Connect your apps to unlock yours.</p>}
                <button onClick={() => navigate(ctaRoute)} style={{
                  display: isMobile ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: T.gradient, color: "white", fontWeight: 700, fontSize: isMobile ? 14 : 15,
                  padding: isMobile ? "14px" : "12px 24px", borderRadius: isMobile ? 12 : 10,
                  width: isMobile ? "100%" : "auto", border: "none", cursor: "pointer", fontFamily: font,
                  minHeight: isMobile ? 48 : undefined,
                  boxShadow: "0 2px 14px rgba(16,185,129,0.3)",
                }}>
                  {ctaText} <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ FEATURE GRID ═══════════════════════════════════════════════════ */}
        <section style={{ padding: isMobile ? "48px 20px" : "100px 40px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 56 }}>
                <h2 style={{ fontSize: isMobile ? 28 : "clamp(28px, 4vw, 48px)", fontFamily: SERIF, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 8px" }}>
                  Intelligence that <em style={{ fontStyle: "italic", color: T.accent }}>connects everything.</em>
                </h2>
                <p style={{ fontSize: isMobile ? 13 : 16, color: T.textSoft, textAlign: "center", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
                  Built by a 2{"\u00D7"} Olympic champion. Not just another dashboard.
                </p>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 10 : 14 }}>
              {features.map((item, i) => (
                <Reveal key={i} delay={i * (isMobile ? 0.04 : 0.06)}>
                  <div style={{
                    background: T.card, border: `1px solid ${T.border}`, borderTop: isMobile ? `2px solid ${T.accentMid}` : `3px solid ${T.accentMid}`,
                    borderRadius: isMobile ? 12 : 14, padding: isMobile ? "16px 14px" : "28px 24px", height: "100%",
                  }}>
                    <div style={{ fontSize: isMobile ? 18 : 20, marginBottom: isMobile ? 8 : 16 }}>{item.icon}</div>
                    <h3 style={{ fontSize: isMobile ? 13 : 16, fontWeight: 800, margin: "0 0 4px", lineHeight: 1.3 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: isMobile ? 11 : 14, lineHeight: isMobile ? 1.5 : 1.6, color: T.textSoft }}>{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.3}>
              <div style={{ textAlign: "center", marginTop: isMobile ? 28 : 48 }}>
                <button onClick={() => navigate(ctaRoute)} style={{
                  display: isMobile ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: T.gradient, color: "white", fontWeight: 700, fontSize: isMobile ? 14 : 15,
                  padding: isMobile ? "14px" : "12px 24px", borderRadius: isMobile ? 12 : 10,
                  width: isMobile ? "100%" : "auto", border: "none", cursor: "pointer", fontFamily: font,
                  minHeight: isMobile ? 48 : undefined,
                  boxShadow: "0 2px 14px rgba(16,185,129,0.3)",
                }}>
                  {ctaText} <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ PRICING ═══════════════════════════════════════════════════════ */}
        <section id="pricing" style={{ padding: isMobile ? "48px 20px" : "100px 40px" }}>
          <div style={{ maxWidth: 980, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 48 }}>
                <p style={{ fontSize: isMobile ? 10 : 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accent, marginBottom: isMobile ? 10 : 14 }}>Founding member pricing</p>
                <h2 style={{ fontSize: isMobile ? 28 : "clamp(28px, 3.5vw, 44px)", fontFamily: SERIF, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                  Invest in your greatest asset.
                </h2>
                {!isMobile && <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 6px" }}>Less than a single coaching session per month. More actionable than a year of guessing.</p>}
                <p style={{ fontSize: isMobile ? 12 : 13, color: T.accent, fontWeight: 600, margin: "0 0 20px" }}>
                  First 500 athletes. Lock in your rate for life.
                </p>
                <div style={{ display: "inline-flex", background: T.card, border: `1px solid ${T.border}`, borderRadius: isMobile ? 8 : 10, padding: isMobile ? "3px" : "5px 6px" }}>
                  {[{ label: "Monthly", annual: false }, { label: "Annual", annual: true }].map(opt => (
                    <button key={opt.label} onClick={() => setBillingAnnual(opt.annual)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: isMobile ? "6px 14px" : "7px 16px", borderRadius: isMobile ? 6 : 7, border: "none",
                      background: billingAnnual === opt.annual ? T.text : "transparent",
                      color: billingAnnual === opt.annual ? "white" : T.textSoft,
                      fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
                    }}>
                      {opt.label}
                      {opt.annual && billingAnnual && !isMobile && <span style={{ fontSize: 10, fontWeight: 800, color: T.accent, background: "rgba(16,185,129,0.15)", borderRadius: 4, padding: "1px 5px" }}>Save 20%</span>}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "1fr 1fr 1fr", gap: isMobile ? 12 : 16 }}>
              {orderedPlans.map((plan, i) => (
                <Reveal key={plan.name} delay={i * (isMobile ? 0.06 : 0.08)}>
                  <div style={{
                    background: plan.featured ? "#0a0c10" : T.card,
                    border: plan.featured ? "none" : `1px solid ${T.border}`,
                    borderRadius: isMobile ? 16 : 18, padding: isMobile ? "24px 20px" : "30px 26px",
                    height: isMobile ? undefined : "100%",
                    transform: plan.featured && !isMobile ? "scale(1.03)" : "none",
                    boxShadow: plan.featured ? "0 16px 48px rgba(0,0,0,0.15)" : "none",
                    position: "relative", overflow: "hidden",
                  }}>
                    {plan.featured && <div style={{ position: "absolute", top: 0, right: 0, width: isMobile ? 150 : 200, height: isMobile ? 150 : 200, background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />}
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 4 : 6 }}>
                        <span style={{ fontSize: isMobile ? 16 : 15, fontWeight: 800, color: plan.featured ? "white" : T.text }}>{plan.name}</span>
                        {plan.badge && <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 800, textTransform: "uppercase", background: T.gradient, color: "white", borderRadius: isMobile ? 4 : 5, padding: isMobile ? "2px 7px" : "3px 8px" }}>{plan.badge}</span>}
                      </div>
                      <p style={{ fontSize: isMobile ? 12 : 13, color: plan.featured ? "rgba(255,255,255,0.45)" : T.textSoft, margin: "0 0 12px", lineHeight: 1.5 }}>{plan.desc}</p>
                      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                        <span style={{ fontSize: isMobile ? 36 : 40, fontWeight: 800, letterSpacing: "-0.03em", color: plan.featured ? "white" : T.text }}>${plan.price}</span>
                        <span style={{ fontSize: isMobile ? 13 : 14, color: plan.featured ? "rgba(255,255,255,0.35)" : T.textDim }}>/mo</span>
                        {billingAnnual && !isMobile && <span style={{ display: "block", fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 2 }}>Billed annually</span>}
                      </div>
                      <button onClick={() => navigate(user ? "/pricing" : "/signup")} style={{
                        display: "block", textAlign: "center", width: "100%",
                        background: plan.featured ? T.gradient : "transparent",
                        border: plan.featured ? "none" : `1.5px solid ${T.border}`,
                        borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14,
                        color: plan.featured ? "white" : T.text, marginBottom: isMobile ? 16 : 20,
                        cursor: "pointer", fontFamily: font, minHeight: isMobile ? 44 : undefined,
                        boxShadow: plan.featured ? "0 4px 14px rgba(16,185,129,0.3)" : "none",
                      }}>{user ? "Choose Plan" : "Start free"} {"\u2192"}</button>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {plan.features.map(f => (
                          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: plan.featured ? "rgba(255,255,255,0.55)" : T.textSoft }}>
                            <Check size={14} style={{ color: T.accent, flexShrink: 0, marginTop: 1 }} /> {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: isMobile ? 11 : 13, color: T.textDim, marginTop: isMobile ? 8 : 16 }}>
              14-day free trial {"\u00B7"} Cancel anytime {"\u00B7"} No credit card
            </p>
          </div>
        </section>

        {/* ═══ TESTIMONIALS ═══════════════════════════════════════════════════ */}
        <section style={{ padding: isMobile ? "48px 20px" : "100px 40px", background: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <Reveal>
              <h2 style={{ fontSize: isMobile ? 24 : "clamp(24px, 3vw, 36px)", fontFamily: SERIF, fontWeight: 400, letterSpacing: "-0.02em", margin: "0 0 24px", textAlign: "center" }}>
                Athletes who stopped guessing.
              </h2>
            </Reveal>
            <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "repeat(3, 1fr)", gap: isMobile ? 10 : 16 }}>
              {testimonials.map((t, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px" }}>
                    <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                      {[...Array(5)].map((_, j) => <span key={j} style={{ color: "#f59e0b", fontSize: 11 }}>{"\u2605"}</span>)}
                    </div>
                    <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.6, color: T.text, fontStyle: "italic" }}>"{t.quote}"</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${t.color}12`, border: `1px solid ${t.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: t.color }}>{t.name.split(" ").map(w => w[0]).join("")}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: T.textDim }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═════════════════════════════════════════════════════ */}
        <section style={{ padding: isMobile ? "56px 20px" : "100px 40px", background: "#0a0c10", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? 300 : 500, height: isMobile ? 300 : 500, background: "radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <Reveal>
              <h2 style={{ fontSize: isMobile ? 30 : "clamp(32px, 4vw, 48px)", fontFamily: SERIF, fontWeight: 400, lineHeight: 1.1, color: "white", margin: "0 0 14px" }}>
                AIM sees what's coming{" "}
                <em style={{ fontStyle: "italic", background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>before you feel it.</em>
              </h2>
              <p style={{ fontSize: isMobile ? 14 : 16, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.5 }}>
                Stop guessing. Start knowing. Connect your apps in 2 minutes.
              </p>
              <button onClick={() => navigate(ctaRoute)} style={{
                display: isMobile ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: T.gradient, color: "white", fontWeight: 700, fontSize: 15,
                padding: "14px 28px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: font,
                width: isMobile ? "100%" : "auto", minHeight: isMobile ? 48 : undefined,
                boxShadow: "0 4px 24px rgba(16,185,129,0.35)",
              }}>
                {ctaText} <ArrowRight size={16} />
              </button>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>Free 14-day trial {"\u00B7"} No credit card</p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
