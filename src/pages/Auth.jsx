import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Brain, BarChart3, Heart, Shield, Loader2, Wand2, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import SEO from "../components/SEO";

export default function Auth({ mode }) {
  const navigate = useNavigate();
  const { user, signup, signin, signInWithGoogle, signInWithMagicLink, resetPassword } = useAuth();
  const { isMobile, isTablet } = useResponsive();

  // Redirect authenticated users to dashboard
  if (user) return <Navigate to="/dashboard" replace />;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState("form"); // "form" | "magic-link" | "forgot-password" | "sent"
  const [sentMessage, setSentMessage] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const isSignup = mode === "signup";

  const handleSubmit = async () => {
    setError("");
    if (isSignup && !name.trim()) return setError("Name is required");
    if (!email.trim()) return setError("Email is required");
    if (!password) return setError("Password is required");
    if (isSignup && password.length < 8) return setError("Password must be at least 8 characters");
    if (isSignup && !acceptedTerms) return setError("You must accept the Terms of Service and Privacy Policy");

    setSubmitting(true);
    try {
      if (isSignup) {
        const { session: newSession } = await signup(email, password, name.trim());
        // Record terms acceptance (fire-and-forget)
        if (newSession?.access_token) {
          fetch("/api/user/accept-terms", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${newSession.access_token}` },
            body: JSON.stringify({ terms: true, privacy: true }),
          }).catch(() => {});
        }
      } else {
        await signin(email, password);
      }
      navigate(isSignup ? "/onboarding" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    setError("");
    if (!email.trim()) return setError("Email is required");
    setSubmitting(true);
    try {
      await signInWithMagicLink(email);
      setSentMessage("Check your email for a magic sign-in link.");
      setView("sent");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    if (!email.trim()) return setError("Email is required");
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSentMessage("Check your email for a password reset link.");
      setView("sent");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try { await signInWithGoogle(); } catch (err) { setError(err.message); }
  };

  const socialBtn = (label, icon, onClick) => (
    <button onClick={onClick} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: font, transition: "all 0.2s" }}
      onMouseOver={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseOut={e => e.currentTarget.style.borderColor = T.border}>
      <span style={{ fontSize: 18 }}>{icon}</span> {label}
    </button>
  );

  const backToForm = () => {
    setView("form");
    setError("");
  };

  // ── SENT CONFIRMATION ──
  if (view === "sent") {
    return (
      <div style={{ minHeight: "100vh", display: "flex" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: isMobile ? 24 : 40 }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.accentDim, border: `1px solid ${T.accentMid}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Check size={28} style={{ color: T.accent }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.03em" }}>Check your email</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 8px", lineHeight: 1.6 }}>{sentMessage}</p>
            <p style={{ fontSize: 13, color: T.textDim, margin: "0 0 32px" }}>
              Sent to <strong style={{ color: T.text }}>{email}</strong>
            </p>
            <button onClick={backToForm} style={{ ...btn(false), fontSize: 13, padding: "10px 24px" }}>
              <ArrowLeft size={14} /> Back to sign in
            </button>
          </div>
        </div>
        {!isMobile && <RightPanel />}
      </div>
    );
  }

  // ── MAGIC LINK VIEW ──
  if (view === "magic-link") {
    return (
      <div style={{ minHeight: "100vh", display: "flex" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: isMobile ? 24 : 40 }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <LogoBar navigate={navigate} />
            <button onClick={backToForm} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 13, fontFamily: font, padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
              <ArrowLeft size={14} /> Back
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Sign in with magic link</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>We'll email you a link that signs you in instantly — no password needed.</p>

            {error && <ErrorBanner message={error} />}

            <div style={{ position: "relative", marginBottom: 20 }}>
              <Mail size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") handleMagicLink(); }} />
            </div>

            <button onClick={handleMagicLink} disabled={submitting}
              style={{ ...btn(true), width: "100%", justifyContent: "center", fontSize: 16, padding: "15px 32px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={18} />}
              Send Magic Link
            </button>
          </div>
        </div>
        {!isMobile && <RightPanel />}
      </div>
    );
  }

  // ── FORGOT PASSWORD VIEW ──
  if (view === "forgot-password") {
    return (
      <div style={{ minHeight: "100vh", display: "flex" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: isMobile ? 24 : 40 }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <LogoBar navigate={navigate} />
            <button onClick={backToForm} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 13, fontFamily: font, padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
              <ArrowLeft size={14} /> Back
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>Reset your password</h1>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>Enter your email and we'll send you a link to create a new password.</p>

            {error && <ErrorBanner message={error} />}

            <div style={{ position: "relative", marginBottom: 20 }}>
              <Mail size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.textDim }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") handleForgotPassword(); }} />
            </div>

            <button onClick={handleForgotPassword} disabled={submitting}
              style={{ ...btn(true), width: "100%", justifyContent: "center", fontSize: 16, padding: "15px 32px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : null}
              Send Reset Link <ArrowRight size={18} />
            </button>
          </div>
        </div>
        {!isMobile && <RightPanel />}
      </div>
    );
  }

  // ── MAIN FORM VIEW ──
  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <SEO
        title={isSignup ? "Sign Up" : "Sign In"}
        path={isSignup ? "/signup" : "/signin"}
        description={isSignup ? "Create your free AIM account. Start your 14-day trial of AI-powered performance intelligence for endurance athletes." : "Sign in to your AIM account to access AI-powered performance insights."}
        noIndex
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: isMobile ? 24 : 40 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <LogoBar navigate={navigate} />

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 32px" }}>
            {isSignup ? "Start your free trial" : "Sign in to your AIM account"}
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {socialBtn("Google", "G", handleGoogle)}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textDim }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {error && <ErrorBanner message={error} />}

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
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                style={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} />
              <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 0, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isSignup && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, cursor: "pointer" }}>
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: T.accent, width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: T.textDim, lineHeight: 1.5 }}>
                I agree to the <a href="/terms" target="_blank" style={{ color: T.accent, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: T.accent, textDecoration: "none" }}>Privacy Policy</a>.
              </span>
            </label>
          )}

          {!isSignup && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <button onClick={() => setView("magic-link")} style={{ background: "none", border: "none", fontSize: 13, color: T.textDim, cursor: "pointer", fontFamily: font, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <Wand2 size={12} /> Sign in with magic link
              </button>
              <button onClick={() => setView("forgot-password")} style={{ background: "none", border: "none", fontSize: 13, color: T.accent, cursor: "pointer", fontFamily: font, padding: 0 }}>
                Forgot password?
              </button>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || (isSignup && !acceptedTerms)}
            style={{ ...btn(true), width: "100%", justifyContent: "center", marginTop: 20, fontSize: 16, padding: "15px 32px", opacity: (submitting || (isSignup && !acceptedTerms)) ? 0.5 : 1, cursor: (submitting || (isSignup && !acceptedTerms)) ? "not-allowed" : "pointer" }}>
            {submitting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {isSignup ? "Create Account" : "Sign In"} <ArrowRight size={18} />
          </button>

          <p style={{ fontSize: 14, color: T.textSoft, textAlign: "center", marginTop: 24 }}>
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button onClick={() => navigate(isSignup ? "/signin" : "/signup")} style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: font, padding: 0 }}>
              {isSignup ? "Sign In" : "Sign Up Free"}
            </button>
          </p>
        </div>
      </div>
      {!isMobile && <RightPanel />}
    </div>
  );
}

function LogoBar({ navigate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, cursor: "pointer" }} onClick={() => navigate("/")}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{ padding: "10px 14px", marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#ef4444" }}>
      {message}
    </div>
  );
}

function RightPanel() {
  return (
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
  );
}
