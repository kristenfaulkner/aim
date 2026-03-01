import { useState } from "react";
import { Link } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn } from "../theme/styles";
import { ArrowRight, Mail, Send } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    window.location.href = `mailto:info@kristenfaulkner.com?subject=${encodeURIComponent(form.subject || "AIM Inquiry")}&body=${encodeURIComponent(`From: ${form.name} (${form.email})\n\n${form.message}`)}`;
    setSent(true);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", fontSize: 15, fontFamily: font,
    background: T.card, color: T.text, border: `1px solid ${T.border}`,
    borderRadius: 12, outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <nav style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </Link>
        <Link to="/" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14 }}>&larr; Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Mail size={24} color={T.accent} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Get in Touch</h1>
          <p style={{ fontSize: 16, color: T.textSoft, lineHeight: 1.6, margin: 0 }}>
            Questions about AIM? Want to partner with us? We'd love to hear from you.
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: T.card, borderRadius: 20, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Opening your email client</h2>
            <p style={{ fontSize: 15, color: T.textSoft, margin: "0 0 24px" }}>If it didn't open automatically, email us directly at <a href="mailto:info@kristenfaulkner.com" style={{ color: T.accent }}>info@kristenfaulkner.com</a></p>
            <button onClick={() => setSent(false)} style={{ ...btn(false), fontSize: 14, padding: "10px 24px" }}>Send Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.textSoft, marginBottom: 6 }}>Name</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" style={inputStyle} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.textSoft, marginBottom: 6 }}>Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.textSoft, marginBottom: 6 }}>Subject</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" style={inputStyle} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.textSoft, marginBottom: 6 }}>Message</label>
              <textarea required rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us what's on your mind..." style={{ ...inputStyle, resize: "vertical", minHeight: 140 }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
            <button type="submit" style={{ ...btn(true), fontSize: 15, padding: "14px 32px", justifyContent: "center", marginTop: 8 }}>
              Send Message <Send size={16} />
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p style={{ fontSize: 14, color: T.textDim }}>Or email us directly at <a href="mailto:info@kristenfaulkner.com" style={{ color: T.accent, textDecoration: "none" }}>info@kristenfaulkner.com</a></p>
        </div>
      </div>
    </div>
  );
}
