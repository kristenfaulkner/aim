import { Link } from "react-router-dom";
import { T, font, mono } from "../../theme/tokens";
import SEO from "../../components/SEO";

/* ── style helpers ── */
const h2 = {
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  marginTop: 48,
  marginBottom: 16,
  color: T.text,
};

const h3 = {
  fontSize: 17,
  fontWeight: 600,
  marginTop: 28,
  marginBottom: 10,
  color: T.text,
};

const p = {
  fontSize: 15,
  color: T.textSoft,
  lineHeight: 1.8,
  marginBottom: 16,
};

const ul = {
  fontSize: 15,
  color: T.textSoft,
  lineHeight: 1.8,
  marginBottom: 16,
  paddingLeft: 24,
};

const li = {
  marginBottom: 6,
};

const link = {
  color: T.accent,
  textDecoration: "none",
};

/* ── cookie inventory ── */
const cookies = [
  {
    name: "__aim_sid",
    purpose: "Session identifier — authenticates the current user session and maintains login state across page loads.",
    duration: "Session",
    type: "Strictly Necessary",
  },
  {
    name: "__aim_csrf",
    purpose: "Cross-site request forgery token — protects form submissions and API calls from unauthorized third-party requests.",
    duration: "Session",
    type: "Strictly Necessary",
  },
  {
    name: "__aim_auth",
    purpose: "Encrypted authentication JWT — verifies user identity for protected routes and API authorization.",
    duration: "14 days",
    type: "Strictly Necessary",
  },
  {
    name: "__aim_refresh",
    purpose: "Refresh token — enables silent re-authentication when the primary auth token expires without requiring re-login.",
    duration: "30 days",
    type: "Strictly Necessary",
  },
  {
    name: "__aim_device",
    purpose: "Device fingerprint hash — used for anomaly detection and preventing unauthorized account access from unrecognized devices.",
    duration: "90 days",
    type: "Strictly Necessary",
  },
  {
    name: "__aim_cc",
    purpose: "Cookie consent preferences — stores your consent choices so we do not re-prompt on every visit.",
    duration: "365 days",
    type: "Strictly Necessary",
  },
  {
    name: "__aim_prefs",
    purpose: "User interface preferences — remembers your selected unit system (metric / imperial), dashboard layout, and display density.",
    duration: "365 days",
    type: "Functional",
  },
  {
    name: "__aim_lang",
    purpose: "Language preference — stores the language you selected so the interface loads in the correct locale.",
    duration: "365 days",
    type: "Functional",
  },
  {
    name: "__aim_theme",
    purpose: "Theme setting — remembers whether you prefer dark mode, light mode, or system-default appearance.",
    duration: "365 days",
    type: "Functional",
  },
  {
    name: "__aim_tz",
    purpose: "Timezone — caches your detected or manually selected timezone for accurate training-time display.",
    duration: "30 days",
    type: "Functional",
  },
  {
    name: "__aim_dash",
    purpose: "Dashboard configuration — persists widget arrangement, collapsed sections, and default date-range filters.",
    duration: "365 days",
    type: "Functional",
  },
  {
    name: "_ga",
    purpose: "Google Analytics client ID — distinguishes unique users to measure aggregate traffic and feature adoption.",
    duration: "2 years",
    type: "Analytics",
  },
  {
    name: "_ga_*",
    purpose: "Google Analytics session state — maintains session continuity for pageview and event tracking.",
    duration: "2 years",
    type: "Analytics",
  },
  {
    name: "_gid",
    purpose: "Google Analytics daily ID — distinguishes users within a 24-hour window for intra-day analytics accuracy.",
    duration: "24 hours",
    type: "Analytics",
  },
  {
    name: "_gat_aim",
    purpose: "Google Analytics throttle — rate-limits data collection requests to prevent server overload.",
    duration: "1 minute",
    type: "Analytics",
  },
  {
    name: "__aim_perf",
    purpose: "Performance telemetry — records page-load time, time-to-interactive, and API latency percentiles for platform reliability monitoring.",
    duration: "Session",
    type: "Analytics",
  },
  {
    name: "__aim_feat",
    purpose: "Feature-adoption flags — tracks which features you have interacted with to improve onboarding flows and product development.",
    duration: "90 days",
    type: "Analytics",
  },
  {
    name: "__stripe_mid",
    purpose: "Stripe merchant ID — identifies the merchant context for secure payment processing and fraud prevention.",
    duration: "1 year",
    type: "Third-Party",
  },
  {
    name: "__stripe_sid",
    purpose: "Stripe session ID — maintains payment session state during checkout and subscription management flows.",
    duration: "30 minutes",
    type: "Third-Party",
  },
  {
    name: "__aim_oauth_state",
    purpose: "OAuth CSRF state — protects the OAuth authorization flow when connecting third-party apps (Strava, Garmin, Wahoo, etc.).",
    duration: "10 minutes",
    type: "Third-Party",
  },
  {
    name: "__aim_oauth_pkce",
    purpose: "PKCE code verifier — secures the OAuth 2.0 authorization code exchange for connected fitness platforms.",
    duration: "10 minutes",
    type: "Third-Party",
  },
];

/* ── type badge color map ── */
const typeBadge = (type) => {
  const map = {
    "Strictly Necessary": { bg: "rgba(16,185,129,0.10)", color: T.accent },
    Functional: { bg: "rgba(139,92,246,0.10)", color: T.purple },
    Analytics: { bg: "rgba(59,130,246,0.10)", color: T.blue },
    "Third-Party": { bg: "rgba(249,115,22,0.10)", color: T.orange },
  };
  return map[type] || { bg: T.accentDim, color: T.accent };
};

/* ── component ── */
export default function CookiePolicy() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <SEO title="Cookie Policy" path="/cookies" description="AIM Cookie Policy. Learn about the cookies we use and how to manage your preferences." />
      {/* ── nav ── */}
      <nav
        style={{
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: T.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color: T.bg,
            }}
          >
            AI
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}>
            <span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M
          </span>
        </Link>
        <Link to="/" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14 }}>
          &larr; Back to Home
        </Link>
      </nav>

      {/* ── body ── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Cookie Policy</h1>
        <p style={{ color: T.textDim, fontSize: 14, marginBottom: 48 }}>Last updated: March 1, 2026</p>

        {/* ── Introduction ── */}
        <p style={p}>
          AIM Performance Intelligence, Inc. ("<strong style={{ color: T.text }}>AIM</strong>," "<strong style={{ color: T.text }}>we</strong>,"
          "<strong style={{ color: T.text }}>us</strong>," or "<strong style={{ color: T.text }}>our</strong>") operates the AIM platform — an
          AI-powered performance intelligence platform for endurance athletes. This Cookie Policy explains what cookies are, how we use them on{" "}
          <span style={{ fontFamily: mono, fontSize: 13, color: T.accent }}>aim.ai</span> and related subdomains (collectively, the "
          <strong style={{ color: T.text }}>Service</strong>"), the types of cookies we deploy, and the choices available to you.
        </p>
        <p style={p}>
          This policy should be read alongside our{" "}
          <Link to="/legal/privacy" style={link}>
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/legal/terms" style={link}>
            Terms of Service
          </Link>
          . By continuing to use the Service, you consent to the placement of cookies on your device in accordance with this policy, except where
          otherwise required by applicable law (including the EU ePrivacy Directive, the General Data Protection Regulation ("GDPR"), and the
          California Consumer Privacy Act ("CCPA")).
        </p>

        {/* ── 1. What Are Cookies ── */}
        <h2 style={h2}>1. What Are Cookies</h2>
        <p style={p}>
          Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website. They are widely
          used to make websites work — or work more efficiently — and to provide reporting information to website operators.
        </p>
        <p style={p}>
          Cookies set by the website operator (in this case, AIM) are called "<strong style={{ color: T.text }}>first-party cookies</strong>." Cookies
          set by parties other than the website operator are called "<strong style={{ color: T.text }}>third-party cookies</strong>." Third-party
          cookies enable features or functionality provided by external services — such as payment processing, analytics, or connected-app
          authentication — to be delivered on or through the Service.
        </p>
        <p style={p}>
          In addition to traditional cookies, we may use similar technologies such as local storage, session storage, and pixel tags. References to
          "cookies" in this policy encompass these related technologies unless stated otherwise.
        </p>

        {/* ── 2. How We Use Cookies ── */}
        <h2 style={h2}>2. How We Use Cookies</h2>
        <p style={p}>We use cookies for the following purposes:</p>
        <ul style={ul}>
          <li style={li}>
            <strong style={{ color: T.text }}>Authentication &amp; Security</strong> — To verify your identity, protect your account from unauthorized
            access, prevent cross-site request forgery, and detect anomalous login activity.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Session Management</strong> — To maintain your session state as you navigate between pages so you do not
            need to re-authenticate on every request.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Preferences &amp; Personalization</strong> — To remember your display settings (language, timezone, unit
            system, theme, dashboard layout) and deliver a consistent, personalized experience.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Analytics &amp; Performance</strong> — To understand how athletes use the Service, measure feature
            adoption, monitor page-load performance, and identify areas for improvement. We use aggregated, pseudonymized data wherever possible.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Payment Processing</strong> — To facilitate secure subscription payments and fraud detection through our
            payment partner, Stripe.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Connected Apps</strong> — To securely broker OAuth 2.0 authorization flows when you connect external
            fitness platforms (e.g., Strava, Garmin Connect, Wahoo, TrainingPeaks) to your AIM account.
          </li>
        </ul>
        <p style={p}>
          We do <strong style={{ color: T.text }}>not</strong> use cookies for behavioral advertising or cross-site tracking. AIM does not sell your
          personal data.
        </p>

        {/* ── 3. Types of Cookies We Use ── */}
        <h2 style={h2}>3. Types of Cookies We Use</h2>

        {/* 3a — Strictly Necessary */}
        <h3 style={h3}>3.1 Strictly Necessary Cookies</h3>
        <p style={p}>
          These cookies are essential for the Service to function. They enable core capabilities such as authentication, session management, security
          protections, and cookie-consent recording. Because the Service cannot operate without them, these cookies are exempt from consent requirements
          under the EU ePrivacy Directive. They cannot be disabled through our cookie preference center.
        </p>
        <ul style={ul}>
          <li style={li}>User authentication (login state, JWT issuance and refresh)</li>
          <li style={li}>CSRF token validation on all state-changing requests</li>
          <li style={li}>Device-fingerprint-based anomaly detection</li>
          <li style={li}>Cookie-consent preference storage</li>
        </ul>

        {/* 3b — Functional */}
        <h3 style={h3}>3.2 Functional Cookies</h3>
        <p style={p}>
          Functional cookies enhance your experience by remembering choices you make — such as your preferred language, measurement units (metric or
          imperial), timezone, color theme, and dashboard configuration. If you disable these cookies, some personalization features may not work, and
          the Service may revert to default settings on each visit.
        </p>
        <ul style={ul}>
          <li style={li}>Language and locale preferences</li>
          <li style={li}>Unit system selection (metric / imperial)</li>
          <li style={li}>Theme preference (dark / light / system)</li>
          <li style={li}>Timezone caching for training-time display accuracy</li>
          <li style={li}>Dashboard layout, widget arrangement, and default date-range filters</li>
        </ul>

        {/* 3c — Analytics / Performance */}
        <h3 style={h3}>3.3 Analytics and Performance Cookies</h3>
        <p style={p}>
          These cookies help us understand how athletes interact with the Service. We use Google Analytics 4 ("GA4") and first-party telemetry to
          collect pseudonymized data about page views, session duration, feature adoption, and client-side performance metrics. IP addresses are
          anonymized before storage. We use this information exclusively to improve the Service — never for advertising.
        </p>
        <ul style={ul}>
          <li style={li}>Aggregate traffic volume and geographic distribution</li>
          <li style={li}>Page-view and navigation-flow analysis</li>
          <li style={li}>Feature-adoption tracking (e.g., which dashboard widgets are used most frequently)</li>
          <li style={li}>Client-side performance monitoring (page-load time, time-to-interactive, API latency)</li>
        </ul>

        {/* 3d — Third-Party */}
        <h3 style={h3}>3.4 Third-Party Cookies</h3>
        <p style={p}>
          Certain cookies are placed by trusted third-party services that are integral to the Service's functionality. We carefully vet every
          third-party provider and limit data sharing to the minimum required for each integration.
        </p>
        <ul style={ul}>
          <li style={li}>
            <strong style={{ color: T.text }}>Stripe</strong> — Sets cookies during checkout and subscription management for payment processing, fraud
            prevention, and PCI DSS compliance. Stripe's use of cookies is governed by the{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={link}>
              Stripe Privacy Policy
            </a>
            .
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Connected-App OAuth</strong> — When you connect Strava, Garmin, Wahoo, TrainingPeaks, or another
            fitness platform, short-lived cookies store the OAuth state parameter and PKCE code verifier to protect the authorization flow against CSRF
            and interception attacks. These cookies are automatically deleted once the authorization completes.
          </li>
        </ul>

        {/* ── 4. Cookie Duration ── */}
        <h2 style={h2}>4. Cookie Duration</h2>
        <p style={p}>Cookies fall into two categories based on their lifespan:</p>
        <ul style={ul}>
          <li style={li}>
            <strong style={{ color: T.text }}>Session Cookies</strong> — Temporary cookies that exist only for the duration of your browsing session.
            They are deleted automatically when you close your browser. Examples include our CSRF token (
            <span style={{ fontFamily: mono, fontSize: 13, color: T.accent }}>__aim_csrf</span>) and performance telemetry cookie (
            <span style={{ fontFamily: mono, fontSize: 13, color: T.accent }}>__aim_perf</span>).
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Persistent Cookies</strong> — Cookies that remain on your device for a predetermined period or until you
            manually delete them. Retention periods vary by purpose:
          </li>
        </ul>
        <div style={{ paddingLeft: 24, marginBottom: 16 }}>
          <ul style={{ ...ul, marginBottom: 0 }}>
            <li style={li}>
              <strong style={{ color: T.text }}>Authentication tokens:</strong> 14 – 30 days (auth JWT and refresh token)
            </li>
            <li style={li}>
              <strong style={{ color: T.text }}>Device fingerprint:</strong> 90 days
            </li>
            <li style={li}>
              <strong style={{ color: T.text }}>Functional preferences:</strong> up to 365 days
            </li>
            <li style={li}>
              <strong style={{ color: T.text }}>Analytics identifiers:</strong> 24 hours (
              <span style={{ fontFamily: mono, fontSize: 13, color: T.accent }}>_gid</span>) to 2 years (
              <span style={{ fontFamily: mono, fontSize: 13, color: T.accent }}>_ga</span>)
            </li>
            <li style={li}>
              <strong style={{ color: T.text }}>Third-party payment:</strong> up to 1 year (Stripe)
            </li>
            <li style={li}>
              <strong style={{ color: T.text }}>OAuth state cookies:</strong> 10 minutes (auto-deleted after flow completes)
            </li>
          </ul>
        </div>
        <p style={p}>
          We periodically review cookie retention periods and reduce them whenever operationally feasible, consistent with the principle of data
          minimization.
        </p>

        {/* ── 5. Specific Cookies List ── */}
        <h2 style={h2}>5. Cookies We Use</h2>
        <p style={{ ...p, marginBottom: 24 }}>
          The table below lists the specific cookies deployed on the Service as of the date above. We update this list when cookies are added or
          removed.
        </p>

        {/* table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px,1fr) 2.5fr 100px 140px",
            background: T.card,
            borderRadius: "10px 10px 0 0",
            border: `1px solid ${T.border}`,
            borderBottom: "none",
          }}
        >
          {["Cookie Name", "Purpose", "Duration", "Type"].map((label) => (
            <div
              key={label}
              style={{
                padding: "12px 16px",
                fontFamily: mono,
                fontSize: 12,
                fontWeight: 600,
                color: T.accent,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* table rows */}
        {cookies.map((c, i) => {
          const badge = typeBadge(c.type);
          const isLast = i === cookies.length - 1;
          return (
            <div
              key={c.name}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(140px,1fr) 2.5fr 100px 140px",
                background: i % 2 === 0 ? T.card : T.surface,
                border: `1px solid ${T.border}`,
                borderTop: "none",
                borderRadius: isLast ? "0 0 10px 10px" : undefined,
              }}
            >
              {/* name */}
              <div
                style={{
                  padding: "14px 16px",
                  fontFamily: mono,
                  fontSize: 13,
                  color: T.text,
                  wordBreak: "break-all",
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                {c.name}
              </div>
              {/* purpose */}
              <div style={{ padding: "14px 16px", fontSize: 13, color: T.textSoft, lineHeight: 1.65 }}>{c.purpose}</div>
              {/* duration */}
              <div style={{ padding: "14px 16px", fontSize: 13, color: T.textSoft, whiteSpace: "nowrap" }}>{c.duration}</div>
              {/* type badge */}
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: badge.bg,
                    color: badge.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.type}
                </span>
              </div>
            </div>
          );
        })}

        {/* ── 6. How to Control Cookies ── */}
        <h2 style={h2}>6. How to Control Cookies</h2>
        <p style={p}>
          You have several options for controlling or limiting cookies. Please note that restricting cookies may degrade certain features of the
          Service.
        </p>

        <h3 style={h3}>6.1 Cookie Preference Center</h3>
        <p style={p}>
          When you first visit the Service, a cookie-consent banner allows you to accept or reject non-essential cookie categories (Functional,
          Analytics). You may update your preferences at any time by visiting{" "}
          <strong style={{ color: T.text }}>Account Settings &gt; Privacy &gt; Cookie Preferences</strong>. Strictly Necessary cookies cannot be
          disabled because they are required for the Service to function.
        </p>

        <h3 style={h3}>6.2 Browser Settings</h3>
        <p style={p}>
          Most web browsers allow you to manage cookies through their settings. You can typically configure your browser to block all cookies, accept
          all cookies, or notify you when a cookie is set. The following links provide instructions for common browsers:
        </p>
        <ul style={ul}>
          <li style={li}>
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={link}>
              Google Chrome
            </a>
          </li>
          <li style={li}>
            <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" style={link}>
              Mozilla Firefox
            </a>
          </li>
          <li style={li}>
            <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" style={link}>
              Apple Safari
            </a>
          </li>
          <li style={li}>
            <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" style={link}>
              Microsoft Edge
            </a>
          </li>
        </ul>

        <h3 style={h3}>6.3 Google Analytics Opt-Out</h3>
        <p style={p}>
          You can prevent Google Analytics from collecting data by installing the{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={link}>
            Google Analytics Opt-Out Browser Add-On
          </a>
          . When installed, the add-on instructs the Google Analytics JavaScript not to send visit information to Google Analytics.
        </p>

        <h3 style={h3}>6.4 Industry Opt-Out Tools</h3>
        <p style={p}>
          You may also use the following industry opt-out mechanisms. Note that these rely on opt-out cookies — clearing your cookies will reset these
          preferences:
        </p>
        <ul style={ul}>
          <li style={li}>
            <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" style={link}>
              Network Advertising Initiative (NAI) Opt-Out
            </a>
          </li>
          <li style={li}>
            <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" style={link}>
              Digital Advertising Alliance (DAA) Opt-Out
            </a>
          </li>
          <li style={li}>
            <a href="https://youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" style={link}>
              European Interactive Digital Advertising Alliance (EDAA) Your Online Choices
            </a>
          </li>
        </ul>

        {/* ── 7. Do Not Track Signals ── */}
        <h2 style={h2}>7. Do Not Track Signals</h2>
        <p style={p}>
          Some browsers transmit a "Do Not Track" ("DNT") signal to websites. There is currently no universally accepted standard for how websites
          should respond to DNT signals. AIM honors the{" "}
          <a href="https://globalprivacycontrol.org/" target="_blank" rel="noopener noreferrer" style={link}>
            Global Privacy Control
          </a>{" "}
          ("GPC") signal as a legally valid opt-out of the sale or sharing of personal information under the CCPA. When we detect a GPC signal, we
          automatically disable all non-essential cookies for that browsing session and suppress any analytics data collection.
        </p>
        <p style={p}>
          We will continue to monitor the development of DNT and GPC standards and will update our practices as industry consensus and legal
          requirements evolve.
        </p>

        {/* ── 8. Impact of Disabling Cookies ── */}
        <h2 style={h2}>8. Impact of Disabling Cookies</h2>
        <p style={p}>
          Disabling certain categories of cookies may affect your use of the Service in the following ways:
        </p>
        <ul style={ul}>
          <li style={li}>
            <strong style={{ color: T.text }}>Strictly Necessary cookies disabled:</strong> You will be unable to log in, and the Service will be
            largely non-functional. Authentication, CSRF protection, and session management depend on these cookies.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Functional cookies disabled:</strong> The Service will revert to default settings on each visit. Your
            language, unit system, timezone, theme, and dashboard layout preferences will not be retained.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Analytics cookies disabled:</strong> There will be no impact on your experience. However, it limits our
            ability to identify and resolve performance bottlenecks and to prioritize feature development based on real usage patterns.
          </li>
          <li style={li}>
            <strong style={{ color: T.text }}>Third-party cookies disabled:</strong> Payment processing through Stripe may fail or require additional
            verification steps. OAuth connection flows for Strava, Garmin, and other platforms may not complete successfully.
          </li>
        </ul>
        <p style={p}>
          If you experience issues after modifying your cookie settings, please contact our support team for assistance.
        </p>

        {/* ── 9. Updates to This Policy ── */}
        <h2 style={h2}>9. Updates to This Policy</h2>
        <p style={p}>
          We may update this Cookie Policy from time to time to reflect changes in our practices, technology, legal requirements, or other operational
          reasons. When we make material changes, we will:
        </p>
        <ul style={ul}>
          <li style={li}>Update the "Last updated" date at the top of this page.</li>
          <li style={li}>
            Post a notice within the Service (e.g., an in-app banner or notification) for at least 30 days following the change.
          </li>
          <li style={li}>
            Where required by applicable law (e.g., the GDPR or ePrivacy Directive), re-request your consent before deploying new non-essential cookie
            categories.
          </li>
        </ul>
        <p style={p}>
          We encourage you to review this page periodically. Your continued use of the Service after any changes constitutes your acceptance of the
          revised Cookie Policy, to the extent permitted by law.
        </p>

        {/* ── 10. Contact ── */}
        <h2 style={h2}>10. Contact</h2>
        <p style={p}>
          If you have questions, concerns, or requests regarding this Cookie Policy or our data practices, please contact us:
        </p>
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "24px 28px",
            marginTop: 8,
            marginBottom: 24,
            lineHeight: 2,
            fontSize: 15,
            color: T.textSoft,
          }}
        >
          <strong style={{ color: T.text }}>AIM Performance Intelligence, Inc.</strong>
          <br />
          San Francisco, California, United States
          <br />
          Incorporated in the State of Delaware
          <br />
          Email:{" "}
          <a href="mailto:privacy@aim.ai" style={link}>
            privacy@aim.ai
          </a>
          <br />
          <br />
          <span style={{ fontSize: 13, color: T.textDim }}>
            For EU/EEA residents: You may also contact our Data Protection Officer at the email address above with the subject line "DPO Inquiry." You
            have the right to lodge a complaint with your local supervisory authority if you believe your rights under the GDPR have been infringed.
          </span>
        </div>

        {/* ── footer links ── */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          <Link to="/legal/terms" style={link}>
            Terms of Service
          </Link>
          <Link to="/legal/privacy" style={link}>
            Privacy Policy
          </Link>
          <Link to="/legal/cookies" style={{ ...link, color: T.textDim }}>
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
