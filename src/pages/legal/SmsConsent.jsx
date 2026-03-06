import { Link } from "react-router-dom";
import { T, font } from "../../theme/tokens";
import SEO from "../../components/SEO";

const h2 = { fontSize: 22, fontWeight: 700, marginTop: 48, marginBottom: 16, color: T.text, letterSpacing: "-0.02em" };
const p = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 16 };
const ul = { paddingLeft: 24, marginBottom: 16 };
const li = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 8 };
const bold = { fontWeight: 600, color: T.text };

export default function SmsConsent() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <SEO title="SMS Consent & Terms" path="/sms-consent" description="AIM SMS messaging consent, opt-in policy, and terms for workout summaries and AI coaching texts." />
      <nav style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </Link>
        <Link to="/" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14 }}>&#8592; Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>SMS Messaging Consent & Terms</h1>
        <p style={{ color: T.textDim, fontSize: 14, marginBottom: 48 }}>Last updated: March 5, 2026</p>

        {/* ─── WHAT MESSAGES YOU RECEIVE ─── */}
        <h2 style={h2}>What Messages You Will Receive</h2>
        <p style={p}>
          AIM sends SMS text messages to provide athletes with personalized workout analysis and AI-powered coaching. When you opt in to SMS messaging, you may receive:
        </p>
        <ul style={ul}>
          <li style={li}><span style={bold}>Post-workout summaries</span> — After you complete and sync a workout, AIM sends a concise AI-generated summary with key metrics, performance insights, and recovery recommendations.</li>
          <li style={li}><span style={bold}>AI coaching replies</span> — When you reply to an AIM text message with a question, our AI coach responds with personalized guidance based on your training history, recovery data, and fitness goals.</li>
        </ul>
        <p style={p}>
          AIM does not send marketing or promotional SMS messages. All text messages are directly related to your training data and performance analysis.
        </p>

        {/* ─── HOW YOU OPT IN ─── */}
        <h2 style={h2}>How You Opt In</h2>
        <p style={p}>
          SMS messaging is entirely optional. You opt in to receive text messages by:
        </p>
        <ul style={ul}>
          <li style={li}>Providing your phone number during account onboarding and checking the SMS consent checkbox</li>
          <li style={li}>Enabling SMS notifications in your AIM account Settings page</li>
        </ul>
        <p style={p}>
          By providing your phone number and opting in, you expressly consent to receive automated text messages from AIM at the number you provided. You understand that consent is not a condition of purchase or use of the AIM platform.
        </p>

        {/* ─── MESSAGE FREQUENCY ─── */}
        <h2 style={h2}>Message Frequency</h2>
        <p style={p}>
          Message frequency varies based on your training activity. You will typically receive one text message per workout you sync to AIM. Most athletes receive between <span style={bold}>3 to 10 messages per week</span>. If you reply to messages for AI coaching, additional responses will be sent in conversation.
        </p>

        {/* ─── OPT OUT ─── */}
        <h2 style={h2}>How to Opt Out</h2>
        <p style={p}>
          You can stop receiving SMS messages at any time by:
        </p>
        <ul style={ul}>
          <li style={li}>Replying <span style={bold}>STOP</span> to any AIM text message</li>
          <li style={li}>Disabling SMS notifications in your AIM account Settings</li>
        </ul>
        <p style={p}>
          After you send STOP, you will receive a one-time confirmation message, and no further messages will be sent unless you opt back in.
        </p>

        {/* ─── OPT BACK IN ─── */}
        <h2 style={h2}>How to Opt Back In</h2>
        <p style={p}>
          If you previously opted out, you can resume SMS messages by replying <span style={bold}>START</span> to the AIM phone number, or by re-enabling SMS in your AIM account Settings.
        </p>

        {/* ─── HELP ─── */}
        <h2 style={h2}>Help</h2>
        <p style={p}>
          Reply <span style={bold}>HELP</span> to any AIM text message for support information, or contact us at <a href="mailto:support@aimfitness.ai" style={{ color: T.accent }}>support@aimfitness.ai</a>.
        </p>

        {/* ─── RATES ─── */}
        <h2 style={h2}>Message & Data Rates</h2>
        <p style={p}>
          Standard message and data rates may apply depending on your mobile carrier and plan. AIM does not charge any additional fees for SMS messages.
        </p>

        {/* ─── SUPPORTED CARRIERS ─── */}
        <h2 style={h2}>Supported Carriers</h2>
        <p style={p}>
          AIM SMS messaging is supported on all major US carriers including AT&T, Verizon, T-Mobile, Sprint, and most regional carriers. Carriers are not liable for delayed or undelivered messages.
        </p>

        {/* ─── PRIVACY ─── */}
        <h2 style={h2}>Privacy</h2>
        <p style={p}>
          Your phone number and SMS data are handled in accordance with our <Link to="/privacy" style={{ color: T.accent }}>Privacy Policy</Link>. We do not sell, rent, or share your phone number with third parties for marketing purposes. Your phone number is used solely for delivering AIM SMS messages via our messaging provider, Twilio.
        </p>

        {/* ─── CONTACT ─── */}
        <h2 style={h2}>Contact</h2>
        <p style={p}>
          AIM Performance Intelligence, Inc.<br />
          Email: <a href="mailto:support@aimfitness.ai" style={{ color: T.accent }}>support@aimfitness.ai</a><br />
          Website: <a href="https://aimfitness.ai" style={{ color: T.accent }}>https://aimfitness.ai</a>
        </p>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${T.border}`, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link to="/terms" style={{ color: T.textSoft, fontSize: 14, textDecoration: "none" }}>Terms of Service</Link>
          <Link to="/privacy" style={{ color: T.textSoft, fontSize: 14, textDecoration: "none" }}>Privacy Policy</Link>
          <Link to="/contact" style={{ color: T.textSoft, fontSize: 14, textDecoration: "none" }}>Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
