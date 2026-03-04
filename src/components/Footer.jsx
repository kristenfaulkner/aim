import { Link } from "react-router-dom";
import { T } from "../theme/tokens";
import { useResponsive } from "../hooks/useResponsive";

export default function Footer() {
  const { isMobile } = useResponsive();

  return (
    <footer style={{ borderTop: `1px solid ${T.border}`, padding: isMobile ? "32px 16px 24px" : "48px 40px 32px", background: T.card }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: isMobile ? 32 : 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.bg, letterSpacing: "-0.02em" }}>AI</div>
            <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
          </div>
          <p style={{ fontSize: 12, color: T.textDim, maxWidth: 280, lineHeight: 1.6 }}>AI-powered performance intelligence for endurance athletes. Built by Kristen Faulkner, 2x Olympic Gold Medalist.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, auto)", gap: isMobile ? "24px 32px" : 64 }}>
          <div>
            <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Product</div>
            <Link to="/#features" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Features</Link>
            <Link to="/#integrations" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Integrations</Link>
            <Link to="/#pricing" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>Pricing</Link>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Company</div>
            <Link to="/" style={{ display: "block", fontSize: 13, color: T.textSoft, textDecoration: "none", marginBottom: 8 }}>About</Link>
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
      <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: isMobile ? 8 : 0 }}>
        <span style={{ fontSize: 12, color: T.textDim }}>&copy; 2026 AIM Performance Intelligence. Founded by Kristen Faulkner.</span>
        <span style={{ fontSize: 12, color: T.textDim }}>Built with &#9829; for athletes who love data</span>
      </div>
    </footer>
  );
}
