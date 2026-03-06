import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Zap, ChevronDown, ChevronUp, Menu, X, Loader } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { apiFetch } from "../lib/api";
import SEO from "../components/SEO";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 19,
    desc: "For athletes ready to get serious about their data",
    features: [
      "Up to 4 app connections",
      "AI workout analysis (10/day)",
      "Power benchmarking (Cat 1-5)",
      "Sleep Intelligence",
      "Workout Database",
      "Nutrition Logger",
      "Daily Check-in",
      "Performance Boosters library",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 49,
    badge: "MOST POPULAR",
    desc: "For competitive athletes who want every edge",
    features: [
      "Everything in Starter",
      "Unlimited app connections",
      "Unlimited AI analyses",
      "Critical Power & W' Model",
      "Durability & Fatigue Tracking",
      "Adaptive Training Zones",
      "Similar Session Finder",
      "AI Training Prescriptions",
      "SMS AI Coach",
      "Segment Comparison",
      "Race Intelligence",
    ],
  },
  {
    key: "elite",
    name: "Elite",
    price: 99,
    badge: "COMPLETE",
    desc: "The full platform — every feature, unlimited",
    features: [
      "Everything in Pro",
      "Full data export",
      "API access",
      "Priority support",
      "Custom performance models",
      "Coach dashboard (coming soon)",
      "Early access to new features",
    ],
  },
];

const COMPARISON = [
  { feature: "App connections", free: "2", starter: "4", pro: "Unlimited", elite: "Unlimited" },
  { feature: "AI analyses per day", free: "3", starter: "10", pro: "Unlimited", elite: "Unlimited" },
  { feature: "Activity history", free: "30 days", starter: "Full", pro: "Full", elite: "Full" },
  { feature: "Dashboard & activities", free: true, starter: true, pro: true, elite: true },
  { feature: "Sleep Intelligence", free: false, starter: true, pro: true, elite: true },
  { feature: "Health Lab", free: false, starter: true, pro: true, elite: true },
  { feature: "Workout Database", free: false, starter: true, pro: true, elite: true },
  { feature: "Nutrition Logger", free: false, starter: true, pro: true, elite: true },
  { feature: "Critical Power Model", free: false, starter: false, pro: true, elite: true },
  { feature: "Durability Tracking", free: false, starter: false, pro: true, elite: true },
  { feature: "Adaptive Zones", free: false, starter: false, pro: true, elite: true },
  { feature: "Training Prescriptions", free: false, starter: false, pro: true, elite: true },
  { feature: "SMS AI Coach", free: false, starter: false, pro: true, elite: true },
  { feature: "Similar Sessions", free: false, starter: false, pro: true, elite: true },
  { feature: "Segment Comparison", free: false, starter: false, pro: true, elite: true },
  { feature: "Race Intelligence", free: false, starter: false, pro: true, elite: true },
  { feature: "Data Export", free: false, starter: false, pro: false, elite: true },
  { feature: "API Access", free: false, starter: false, pro: false, elite: true },
  { feature: "Priority Support", free: false, starter: false, pro: false, elite: true },
];

const FAQ = [
  { q: "Is there really no credit card required?", a: "Correct. Start your 14-day free trial with just an email. You'll only be asked for payment details when you choose to subscribe." },
  { q: "Can I change plans later?", a: "Yes. Upgrade, downgrade, or cancel anytime from your Settings page. Changes take effect at the next billing cycle." },
  { q: "What happens when my trial ends?", a: "Your account drops to the Free tier. All your data is preserved — you just lose access to premium features until you subscribe." },
  { q: "Can I get a refund?", a: "We offer a 30-day money-back guarantee on your first subscription. Contact us at support@aimfitness.ai." },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const currentTier = profile?.subscription_tier || "free";

  async function handleSubscribe(planKey) {
    if (!user) {
      navigate("/signup");
      return;
    }

    setLoadingPlan(planKey);
    try {
      const { url } = await apiFetch("/payments/create-checkout", {
        method: "POST",
        body: JSON.stringify({ priceKey: planKey }),
      });
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      setLoadingPlan(null);
    }
  }

  function getCtaText(planKey) {
    if (loadingPlan === planKey) return "Loading...";
    if (!user) return "Start Free Trial";
    if (currentTier === planKey) return "Current Plan";
    const tierOrder = ["free", "starter", "pro", "elite"];
    if (tierOrder.indexOf(currentTier) > tierOrder.indexOf(planKey)) return "Downgrade";
    return "Start Free Trial";
  }

  function isCurrentPlan(planKey) {
    return currentTier === planKey;
  }

  async function handleRedeemInvite() {
    if (!inviteCode.trim() || !user) return;
    setInviteLoading(true);
    setInviteResult(null);
    try {
      const data = await apiFetch("/invite/redeem", {
        method: "POST",
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      setInviteResult({ success: true, message: data.message });
      setInviteCode("");
    } catch (err) {
      setInviteResult({ error: err.message || "Failed to redeem invite code" });
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, color: T.text }}>
      <SEO
        title="Pricing — AIM"
        description="AI-powered performance intelligence. Plans starting at $19/mo."
        path="/pricing"
      />

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: isMobile ? "0 16px" : "0 40px", height: isMobile ? 56 : 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${T.bg}dd`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>
        {isMobile ? (
          <>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            {menuOpen && (
              <div style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 0, background: T.bg, padding: 24, display: "flex", flexDirection: "column", gap: 16, zIndex: 99 }}>
                {user ? (
                  <button onClick={() => navigate("/today")} style={{ ...btn(true), justifyContent: "center" }}>My Dashboard</button>
                ) : (
                  <>
                    <button onClick={() => navigate("/signin")} style={{ ...btn(false), justifyContent: "center" }}>Sign In</button>
                    <button onClick={() => navigate("/signup")} style={{ ...btn(true), justifyContent: "center" }}>Start Free Trial</button>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {user ? (
              <button onClick={() => navigate("/today")} style={{ ...btn(true), padding: "10px 24px", fontSize: 13 }}>My Dashboard</button>
            ) : (
              <>
                <button onClick={() => navigate("/signin")} style={{ ...btn(false), padding: "10px 24px", fontSize: 13 }}>Sign In</button>
                <button onClick={() => navigate("/signup")} style={{ ...btn(true), padding: "10px 24px", fontSize: 13 }}>Start Free Trial</button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: isMobile ? 100 : 120, paddingBottom: isMobile ? 40 : 60, textAlign: "center", padding: isMobile ? "100px 16px 40px" : "120px 40px 60px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: isMobile ? 32 : isTablet ? 38 : 48, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
            Invest in your{" "}
            <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>greatest asset</span>
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 17, color: T.textSoft, margin: "0 0 32px", lineHeight: 1.6 }}>
            Less than a single coaching session per month. More actionable than a year of guessing.
          </p>
        </div>
      </section>

      {/* ── PLAN CARDS ── */}
      <section style={{ padding: isMobile ? "0 16px 60px" : "0 40px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 16 : 20, alignItems: "start" }}>
          {PLANS.map((plan) => {
            const isPro = plan.key === "pro";
            const isCurrent = isCurrentPlan(plan.key);
            return (
              <div key={plan.key} style={{
                background: T.card,
                borderRadius: 20,
                padding: isMobile ? "28px 24px" : "36px 28px",
                position: "relative",
                overflow: "hidden",
                border: `1px solid ${isPro ? T.accentMid : isCurrent ? T.accent : T.border}`,
                transform: isPro && !isMobile ? "scale(1.03)" : "none",
                boxShadow: isPro ? `0 0 60px ${T.accentDim}` : "none",
              }}>
                {plan.badge && (
                  <div style={{ position: "absolute", top: 16, right: 16, padding: "3px 10px", borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentMid}`, fontSize: 10, fontWeight: 800, color: T.accent, letterSpacing: "0.06em" }}>
                    {plan.badge}
                  </div>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{plan.name}</h3>
                <p style={{ fontSize: 13, color: T.textDim, margin: "0 0 20px", lineHeight: 1.5 }}>{plan.desc}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, fontFamily: mono, letterSpacing: "-0.03em" }}>${plan.price}</span>
                  <span style={{ fontSize: 14, color: T.textDim }}>/mo</span>
                </div>
                <button
                  onClick={() => !isCurrent && handleSubscribe(plan.key)}
                  disabled={isCurrent || loadingPlan === plan.key}
                  style={{
                    ...btn(isPro || !isCurrent),
                    width: "100%",
                    justifyContent: "center",
                    marginBottom: 24,
                    fontSize: 14,
                    padding: "13px 24px",
                    opacity: isCurrent ? 0.5 : 1,
                    cursor: isCurrent ? "default" : "pointer",
                  }}
                >
                  {getCtaText(plan.key)} {!isCurrent && loadingPlan !== plan.key && <ArrowRight size={16} />}
                </button>
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
        <p style={{ textAlign: "center", fontSize: 13, color: T.textDim, marginTop: 24 }}>
          All plans include a 14-day free trial. Cancel anytime. No credit card required to start.
        </p>
        <p style={{ textAlign: "center", fontSize: 13, color: T.textDim, marginTop: 8 }}>
          Have a promo code? You can enter it on the checkout page.
        </p>

        {/* Invite code section */}
        {user && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            {!showInvite ? (
              <button
                onClick={() => setShowInvite(true)}
                style={{ background: "none", border: "none", color: T.accent, fontSize: 13, fontWeight: 500, fontFamily: font, cursor: "pointer", textDecoration: "underline" }}
              >
                Have an invite code?
              </button>
            ) : (
              <div style={{ maxWidth: 400, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleRedeemInvite()}
                  style={{ ...inputStyle, flex: 1, fontFamily: mono, letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}
                />
                <button
                  onClick={handleRedeemInvite}
                  disabled={inviteLoading || !inviteCode.trim()}
                  style={{ ...btn(true), fontSize: 13, padding: "10px 20px", opacity: inviteLoading || !inviteCode.trim() ? 0.6 : 1 }}
                >
                  {inviteLoading ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Redeem"}
                </button>
              </div>
            )}
            {inviteResult?.success && (
              <p style={{ fontSize: 13, color: T.accent, marginTop: 10, fontWeight: 500 }}>
                <Check size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {inviteResult.message}
              </p>
            )}
            {inviteResult?.error && (
              <p style={{ fontSize: 13, color: T.error || "#ef4444", marginTop: 10, fontWeight: 500 }}>
                {inviteResult.error}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── FEATURE COMPARISON TABLE ── */}
      <section style={{ padding: isMobile ? "0 16px 60px" : "0 40px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <button
            onClick={() => setShowComparison(!showComparison)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "14px 24px",
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: font,
              color: T.text,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Compare all features {showComparison ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showComparison && (
            <div style={{ marginTop: 16, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              {/* Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr 1fr 1fr" : "2fr 1fr 1fr 1fr 1fr",
                padding: "16px 20px",
                background: T.surface,
                borderBottom: `1px solid ${T.border}`,
                fontSize: 12,
                fontWeight: 700,
                color: T.textSoft,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>
                {!isMobile && <div>Feature</div>}
                <div style={{ textAlign: "center" }}>Free</div>
                <div style={{ textAlign: "center" }}>Starter</div>
                <div style={{ textAlign: "center", color: T.accent }}>Pro</div>
                <div style={{ textAlign: "center" }}>Elite</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr 1fr 1fr 1fr" : "2fr 1fr 1fr 1fr 1fr",
                  padding: isMobile ? "10px 12px" : "12px 20px",
                  borderBottom: i < COMPARISON.length - 1 ? `1px solid ${T.border}` : "none",
                  fontSize: 13,
                  alignItems: "center",
                }}>
                  {!isMobile && <div style={{ color: T.text, fontWeight: 500 }}>{row.feature}</div>}
                  {isMobile && (
                    <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 600, color: T.textSoft, marginBottom: 4, display: i === 0 ? "none" : undefined }}>
                      {/* Feature name shown above on mobile for subsequent rows */}
                    </div>
                  )}
                  {["free", "starter", "pro", "elite"].map(tier => {
                    const val = row[tier];
                    return (
                      <div key={tier} style={{ textAlign: "center" }}>
                        {val === true ? <Check size={16} color={T.accent} /> : val === false ? <span style={{ color: T.textDim }}>—</span> : <span style={{ fontFamily: typeof val === "string" && /\d/.test(val) ? mono : font, color: T.text, fontWeight: 500, fontSize: 12 }}>{val}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: isMobile ? "0 16px 80px" : "0 40px 100px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 32px", textAlign: "center" }}>
            Frequently asked questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQ.map((item, i) => (
              <div
                key={i}
                style={{
                  background: T.card,
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: font,
                    color: T.text,
                    textAlign: "left",
                  }}
                >
                  {item.q}
                  {openFaq === i ? <ChevronUp size={18} color={T.textSoft} /> : <ChevronDown size={18} color={T.textSoft} />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 16px", fontSize: 14, color: T.textSoft, lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding: isMobile ? "40px 16px 60px" : "60px 40px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "40px 32px", background: T.card, borderRadius: 20, border: `1px solid ${T.border}` }}>
          <Zap size={28} color={T.accent} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
            Ready to train smarter?
          </h2>
          <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 24px", lineHeight: 1.5 }}>
            Start your 14-day free trial. No credit card required.
          </p>
          <button
            onClick={() => navigate(user ? "/today" : "/signup")}
            style={{ ...btn(true), fontSize: 15, padding: "14px 36px" }}
          >
            {user ? "Go to Dashboard" : "Get Started Free"} <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
