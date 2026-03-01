import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Brain, BarChart3, Heart, Shield } from "lucide-react";

export default function Auth({ mode }) {
  const navigate = useNavigate();
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48, cursor: "pointer" }} onClick={() => navigate("/")}>
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
            {socialBtn("Apple", "\uF8FF")}
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

          <button onClick={() => navigate("/connect")} style={{ ...btn(true), width: "100%", justifyContent: "center", marginTop: 20, fontSize: 16, padding: "15px 32px" }}>
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
