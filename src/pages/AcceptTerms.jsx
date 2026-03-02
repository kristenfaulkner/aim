import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useResponsive } from "../hooks/useResponsive";

export default function AcceptTerms() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = acceptedTerms && acceptedPrivacy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/user/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ terms: true, privacy: true }),
      });
      if (!res.ok) throw new Error("Failed to record consent");

      if (user) await fetchProfile(user.id);
      navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const checkboxRow = (checked, onChange, label) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 16px", borderRadius: 10, minHeight: 44, background: checked ? "rgba(16,185,129,0.04)" : "transparent", border: `1px solid ${checked ? T.accentMid : T.border}`, transition: "all 0.2s" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: T.accent, width: 18, height: 18, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.6 }}>{label}</span>
    </label>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? 20 : 40 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </div>

        <div style={{ width: 48, height: 48, borderRadius: 14, background: T.accentDim, border: `1px solid ${T.accentMid}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Shield size={24} style={{ color: T.accent }} />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Before we continue</h1>
        <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px", lineHeight: 1.6 }}>
          Please review and accept our terms to use AIM.
        </p>

        {error && (
          <div style={{ padding: "10px 14px", marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#ef4444" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {checkboxRow(acceptedTerms, setAcceptedTerms, <>
            I agree to the <a href="/terms" target="_blank" style={{ color: T.accent, textDecoration: "none", fontWeight: 600 }}>Terms of Service</a>, including the medical disclaimer that AIM is not a medical device and does not provide medical advice.
          </>)}
          {checkboxRow(acceptedPrivacy, setAcceptedPrivacy, <>
            I agree to the <a href="/privacy" target="_blank" style={{ color: T.accent, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a> and understand how AIM collects, processes, and stores my data.
          </>)}
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          style={{ ...btn(true), width: "100%", justifyContent: "center", fontSize: 16, padding: "15px 32px", opacity: (!canSubmit || submitting) ? 0.5 : 1, cursor: (!canSubmit || submitting) ? "not-allowed" : "pointer" }}>
          {submitting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : null}
          Continue <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
