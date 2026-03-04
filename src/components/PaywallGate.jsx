import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { T, font, mono } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { hasFeature, requiredTier, FEATURE_LABELS } from "../lib/entitlements";
import { PAYMENTS_ENABLED } from "../lib/featureFlags";

const TIER_PRICES = {
  starter: 19,
  pro: 49,
  elite: 99,
};

/**
 * PaywallGate — wraps a feature component and shows an upgrade CTA if the user's tier is insufficient.
 *
 * Props:
 * - feature: string — the feature key to check (e.g. "cp_model", "sleep")
 * - children: ReactNode — the content to render if user has access
 * - blur: boolean — if true, show blurred preview instead of hiding content entirely (default: true)
 */
export default function PaywallGate({ feature, children, blur = true }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const userTier = profile?.subscription_tier || "free";

  // During closed beta, everything is unlocked
  if (!PAYMENTS_ENABLED) return children;

  if (hasFeature(userTier, feature)) {
    return children;
  }

  const needed = requiredTier(feature);
  const label = FEATURE_LABELS[feature] || feature;
  const price = TIER_PRICES[needed];

  return (
    <div style={{ position: "relative" }}>
      {blur && (
        <div style={{ filter: "blur(6px)", opacity: 0.4, pointerEvents: "none", userSelect: "none" }}>
          {children}
        </div>
      )}
      <div style={{
        position: blur ? "absolute" : "relative",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
        background: blur ? "rgba(248,248,250,0.85)" : T.card,
        borderRadius: 16,
        border: blur ? "none" : `1px solid ${T.border}`,
        minHeight: blur ? undefined : 200,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: T.accentDim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}>
          <Lock size={22} color={T.accent} />
        </div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          margin: "0 0 6px",
          fontFamily: font,
          color: T.text,
          letterSpacing: "-0.02em",
        }}>
          Upgrade to {needed.charAt(0).toUpperCase() + needed.slice(1)}
        </h3>
        <p style={{
          fontSize: 14,
          color: T.textSoft,
          margin: "0 0 20px",
          fontFamily: font,
          lineHeight: 1.5,
          maxWidth: 320,
        }}>
          {label} is available on the {needed.charAt(0).toUpperCase() + needed.slice(1)} plan
          {price ? ` starting at $${price}/mo` : ""}.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            background: T.accent,
            color: T.white,
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: font,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          View Plans <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
