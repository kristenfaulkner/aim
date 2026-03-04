import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, X, ArrowRight } from "lucide-react";
import { T, font } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { PAYMENTS_ENABLED } from "../lib/featureFlags";

/**
 * TrialBanner — persistent banner during free trial period.
 * Day 1-10: subtle, Day 11-13: more prominent, Day 14+: expired state.
 * Renders at top of dashboard. Dismissible for the session.
 */
export default function TrialBanner() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/payments/status")
      .then((data) => {
        if (!cancelled) {
          setSubscription(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!PAYMENTS_ENABLED || !loaded || dismissed) return null;

  const tier = profile?.subscription_tier || "free";
  const sub = subscription?.subscription;

  // Don't show banner for paying customers with active subscriptions
  if (tier !== "free" && sub?.status === "active") return null;

  // Trialing state
  if (sub?.status === "trialing" && sub.trialEnd) {
    const now = Math.floor(Date.now() / 1000);
    const daysLeft = Math.max(0, Math.ceil((sub.trialEnd - now) / 86400));
    const isUrgent = daysLeft <= 3;

    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 16px",
        background: isUrgent ? "rgba(245,158,11,0.08)" : T.accentDim,
        borderBottom: `1px solid ${isUrgent ? "rgba(245,158,11,0.2)" : T.accentMid}`,
        fontSize: 13,
        fontFamily: font,
        color: T.text,
        position: "relative",
      }}>
        <Zap size={14} color={isUrgent ? T.warn : T.accent} />
        <span>
          {daysLeft === 0
            ? "Your trial ends today!"
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial`}
          {isUrgent && " — don't lose your insights"}
        </span>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 14px",
            background: isUrgent ? T.warn : T.accent,
            color: T.white,
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: font,
            cursor: "pointer",
          }}
        >
          Subscribe <ArrowRight size={12} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: T.textDim, padding: 4 }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Free tier — no trial active
  if (tier === "free" && !sub) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 16px",
        background: T.accentDim,
        borderBottom: `1px solid ${T.accentMid}`,
        fontSize: 13,
        fontFamily: font,
        color: T.text,
        position: "relative",
      }}>
        <Zap size={14} color={T.accent} />
        <span>You're on the Free plan — upgrade for unlimited AI analysis and advanced features</span>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 14px",
            background: T.accent,
            color: T.white,
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: font,
            cursor: "pointer",
          }}
        >
          View Plans <ArrowRight size={12} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: T.textDim, padding: 4 }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
}
