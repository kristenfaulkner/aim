import { Link } from "react-router-dom";
import { T, font, mono } from "../../theme/tokens";

/* ── Style helpers ── */
const h2Style = {
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  marginTop: 48,
  marginBottom: 16,
  color: T.text,
};
const h3Style = {
  fontSize: 17,
  fontWeight: 600,
  marginTop: 32,
  marginBottom: 12,
  color: T.text,
};
const pStyle = {
  fontSize: 15,
  color: T.textSoft,
  lineHeight: 1.8,
  marginBottom: 16,
};
const ulStyle = { paddingLeft: 24, marginBottom: 16 };
const liStyle = {
  fontSize: 15,
  color: T.textSoft,
  lineHeight: 1.8,
  marginBottom: 8,
};
const strongStyle = { color: T.text, fontWeight: 600 };

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: font,
      }}
    >
      {/* ── Nav bar ── */}
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
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: T.text,
          }}
        >
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
          <span
            style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            <span
              style={{
                background: T.gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
            M
          </span>
        </Link>
        <Link
          to="/"
          style={{ color: T.textSoft, textDecoration: "none", fontSize: 14 }}
        >
          &larr; Back to Home
        </Link>
      </nav>

      {/* ── Content ── */}
      <div
        style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 100px" }}
      >
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: T.textDim, fontSize: 14, marginBottom: 48 }}>
          Last updated: March 1, 2026
        </p>

        {/* ── Introduction ── */}
        <p style={pStyle}>
          AIM Performance Intelligence, Inc. ("<strong style={strongStyle}>AIM</strong>,"
          "<strong style={strongStyle}>we</strong>," "<strong style={strongStyle}>us</strong>,"
          or "<strong style={strongStyle}>our</strong>") is a Delaware C-corporation
          headquartered in San Francisco, California. We operate the AIM
          performance intelligence platform (the "<strong style={strongStyle}>Platform</strong>"),
          accessible at aim.com and through our mobile applications, which provides
          AI-powered analytics and actionable insights for endurance athletes.
        </p>
        <p style={pStyle}>
          This Privacy Policy ("<strong style={strongStyle}>Policy</strong>") describes how
          we collect, use, disclose, retain, and protect your personal information
          and health data when you access or use the Platform, visit our website,
          or otherwise interact with us. This Policy applies to all users worldwide,
          including users in the European Economic Area ("<strong style={strongStyle}>EEA</strong>"),
          the United Kingdom ("<strong style={strongStyle}>UK</strong>"), the State of
          California, and all other jurisdictions in which we operate.
        </p>
        <p style={pStyle}>
          We recognize that the data processed by our Platform includes sensitive
          health and fitness information. We treat all such data with the highest
          level of care and apply protections that meet or exceed the requirements
          of the General Data Protection Regulation (EU) 2016/679
          ("<strong style={strongStyle}>GDPR</strong>"), the UK General Data Protection
          Regulation ("<strong style={strongStyle}>UK GDPR</strong>"), the California
          Consumer Privacy Act of 2018 as amended by the California Privacy Rights
          Act of 2020 ("<strong style={strongStyle}>CCPA/CPRA</strong>"), and other
          applicable data protection laws.
        </p>
        <p style={pStyle}>
          By creating an account, connecting third-party data sources, or otherwise
          using the Platform, you acknowledge that you have read and understood
          this Policy. Where we rely on consent as a legal basis for processing,
          we will obtain your explicit, informed, and freely given consent before
          collecting or processing the relevant data.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 1. INFORMATION WE COLLECT */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>1. Information We Collect</h2>
        <p style={pStyle}>
          We collect and process the following categories of information in
          connection with the Platform. The specific data points collected depend
          on the features you use, the third-party services you connect, and the
          subscription tier you select.
        </p>

        <h3 style={h3Style}>1.1 Account &amp; Profile Information</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Full name, email address, and account credentials (password stored as a salted, cryptographic hash)</li>
          <li style={liStyle}>Date of birth, gender, biological sex, and self-reported athletic profile (sport, experience level, goals)</li>
          <li style={liStyle}>Profile photograph (optional)</li>
          <li style={liStyle}>Communication preferences and notification settings</li>
        </ul>

        <h3 style={h3Style}>1.2 Health &amp; Fitness Data</h3>
        <p style={pStyle}>
          The Platform is designed to aggregate, analyze, and derive insights from
          a wide range of physiological and biometric data. This data constitutes
          "<strong style={strongStyle}>special category data</strong>" under Article 9 of
          the GDPR and "<strong style={strongStyle}>sensitive personal information</strong>"
          under the CCPA/CPRA. Health and fitness data we process includes, but is
          not limited to:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>
            <strong style={strongStyle}>Cardiovascular metrics:</strong> resting heart rate,
            maximum heart rate, heart rate variability (HRV), heart rate zones, and
            real-time heart rate data during activities
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Sleep data:</strong> total sleep duration, sleep
            stages (REM, deep, light), sleep latency, sleep efficiency, nighttime
            heart rate, nighttime HRV, respiratory rate during sleep, and sleep
            environment data (e.g., mattress temperature from EightSleep)
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Activity &amp; training data:</strong> workout type,
            duration, distance, pace, power output, cadence, elevation, GPS route
            data, training load, training stress scores, and performance benchmarks
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Body composition:</strong> weight, body fat
            percentage, lean mass, bone mineral density, visceral fat, and regional
            body composition data from DEXA scans
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Biometric indicators:</strong> blood oxygen
            saturation (SpO2), skin temperature, body temperature, respiratory rate,
            and galvanic skin response
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Blood work &amp; lab results:</strong> complete blood
            count, metabolic panels, lipid panels, hormone levels, vitamin and
            mineral levels, inflammatory markers, and other biomarkers you choose to
            upload or connect
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Menstrual cycle data:</strong> cycle phase, cycle
            length, period start and end dates, symptoms, and related hormonal data
            (collected only when voluntarily provided by the user)
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Recovery &amp; readiness metrics:</strong> recovery
            scores, strain scores, readiness scores, and composite wellness
            indicators derived from connected devices
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Nutritional data:</strong> caloric intake,
            macronutrient breakdown, hydration levels, and supplement logs, where
            provided
          </li>
        </ul>

        <h3 style={h3Style}>1.3 Third-Party Integration Data</h3>
        <p style={pStyle}>
          The Platform supports connections to eighteen (18) or more third-party
          fitness, health, and wearable data sources, including but not limited to
          Strava, Wahoo, Garmin Connect, Oura, WHOOP, EightSleep, Withings, Apple
          Health, Google Health Connect, Polar, Suunto, Coros, TrainingPeaks,
          Peloton, Zwift, Hammerhead, and Supersapiens. When you authorize a
          connection, we receive data made available through that service's API in
          accordance with the permissions you grant. We only access the data
          categories necessary to provide Platform features you have enabled.
        </p>

        <h3 style={h3Style}>1.4 Payment &amp; Subscription Information</h3>
        <p style={pStyle}>
          We offer three subscription tiers ($19/month, $49/month, and $99/month).
          Payment processing is handled exclusively by Stripe, Inc.
          ("<strong style={strongStyle}>Stripe</strong>"). We do not directly collect,
          store, or have access to your full credit card number, debit card number,
          or bank account details. We receive from Stripe only the information
          necessary to manage your subscription: a truncated card identifier (last
          four digits), card brand, expiration date, billing address, transaction
          history, and subscription status. Please review{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.accent }}
          >
            Stripe's Privacy Policy
          </a>{" "}
          for information on how Stripe processes your payment data.
        </p>

        <h3 style={h3Style}>1.5 Device &amp; Technical Data</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>IP address (anonymized for analytics where feasible)</li>
          <li style={liStyle}>Browser type, version, and language preferences</li>
          <li style={liStyle}>Operating system and device type (desktop, mobile, tablet)</li>
          <li style={liStyle}>Screen resolution and viewport dimensions</li>
          <li style={liStyle}>Referring URL and exit pages</li>
          <li style={liStyle}>Device identifiers (e.g., advertising ID, where applicable and with consent)</li>
        </ul>

        <h3 style={h3Style}>1.6 Usage Data</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Pages and features accessed, frequency and duration of use</li>
          <li style={liStyle}>Interactions with AI-generated insights and recommendations</li>
          <li style={liStyle}>Search queries within the Platform</li>
          <li style={liStyle}>Feature adoption and engagement patterns</li>
          <li style={liStyle}>Error logs and performance diagnostics</li>
        </ul>

        <h3 style={h3Style}>1.7 Cookies &amp; Similar Technologies</h3>
        <p style={pStyle}>
          We use cookies, local storage, and similar tracking technologies to
          maintain session state, remember your preferences, authenticate your
          identity, and analyze aggregate usage patterns. We categorize cookies as
          follows:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>
            <strong style={strongStyle}>Strictly necessary cookies:</strong> Required for
            Platform functionality, authentication, and security. These cannot be
            disabled.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Functional cookies:</strong> Remember your
            preferences, display settings, and connected integrations.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Analytics cookies:</strong> Help us understand how
            users interact with the Platform so we can improve functionality and
            user experience. We use privacy-focused analytics and do not use
            analytics cookies to build advertising profiles.
          </li>
        </ul>
        <p style={pStyle}>
          We do not use advertising or marketing cookies. We do not serve
          third-party advertisements on the Platform. For EEA and UK users, we
          obtain consent for non-essential cookies in compliance with the ePrivacy
          Directive (2002/58/EC) before placing such cookies on your device.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 2. HOW WE COLLECT INFORMATION */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>2. How We Collect Information</h2>

        <h3 style={h3Style}>2.1 Directly From You</h3>
        <p style={pStyle}>
          We collect information that you voluntarily provide when you create an
          account, complete your athlete profile, manually enter health data (such
          as blood work results or DEXA scan reports), adjust your settings, contact
          our support team, or otherwise communicate with us.
        </p>

        <h3 style={h3Style}>2.2 From Third-Party Integrations</h3>
        <p style={pStyle}>
          When you authorize a connection between the Platform and a third-party
          service (e.g., Strava, Garmin, WHOOP, Oura), we receive data from that
          service's API on your behalf. You initiate each connection through an
          OAuth 2.0 authorization flow (or equivalent mechanism provided by the
          third party), and you may revoke access at any time through the
          Platform's integration settings or through the third-party service
          directly. We only request the minimum scopes and permissions necessary to
          deliver the features you have enabled.
        </p>

        <h3 style={h3Style}>2.3 Automatically</h3>
        <p style={pStyle}>
          We automatically collect device and technical data, usage data, and
          cookie data when you access or interact with the Platform. This
          collection occurs through standard web technologies, server logs, and
          our analytics infrastructure. Automatic data collection is limited to
          what is necessary for Platform operation, security, and improvement.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 3. HOW WE USE YOUR INFORMATION */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>3. How We Use Your Information</h2>
        <p style={pStyle}>
          We process your personal information and health data for the following
          purposes:
        </p>

        <h3 style={h3Style}>3.1 Providing and Operating the Platform</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Creating and managing your account</li>
          <li style={liStyle}>Aggregating and displaying your health and fitness data from connected sources in a unified dashboard</li>
          <li style={liStyle}>Synchronizing data across your connected devices and third-party services</li>
          <li style={liStyle}>Delivering features associated with your subscription tier</li>
        </ul>

        <h3 style={h3Style}>3.2 AI-Powered Analysis and Insights</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Applying machine learning models and AI algorithms to your aggregated health and fitness data to generate personalized performance insights, trend analysis, and actionable recommendations</li>
          <li style={liStyle}>Identifying correlations across data sources (e.g., the relationship between sleep quality, HRV, and training performance)</li>
          <li style={liStyle}>Generating recovery recommendations, training load guidance, and wellness alerts based on your data patterns</li>
          <li style={liStyle}>Providing menstrual cycle phase-aware training and recovery recommendations for users who opt in to cycle tracking</li>
        </ul>
        <p style={pStyle}>
          <strong style={strongStyle}>Important:</strong> AI-generated insights are
          informational only and do not constitute medical advice, diagnosis, or
          treatment. You should consult a qualified healthcare professional before
          making any health-related decisions based on Platform outputs.
        </p>

        <h3 style={h3Style}>3.3 Platform Improvement and Research</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Improving the accuracy and relevance of our AI models using aggregated, de-identified, and anonymized data</li>
          <li style={liStyle}>Conducting internal research and development to enhance Platform features</li>
          <li style={liStyle}>Performing statistical analysis on anonymized datasets to advance sports science understanding</li>
          <li style={liStyle}>Debugging, testing, and optimizing Platform performance</li>
        </ul>
        <p style={pStyle}>
          Where we use data for model training or research purposes, we apply
          robust anonymization and aggregation techniques such that individual
          users cannot be re-identified. We do not use identifiable health data
          for model training without your explicit consent.
        </p>

        <h3 style={h3Style}>3.4 Communications</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Sending transactional communications (account verification, password resets, subscription confirmations, and payment receipts)</li>
          <li style={liStyle}>Delivering Platform notifications (e.g., new insights available, data sync status, integration alerts)</li>
          <li style={liStyle}>Providing customer support and responding to your inquiries</li>
          <li style={liStyle}>Sending product updates, feature announcements, and educational content (with your consent, where required; you may opt out at any time)</li>
        </ul>

        <h3 style={h3Style}>3.5 Billing and Subscription Management</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Processing subscription payments through Stripe</li>
          <li style={liStyle}>Managing subscription upgrades, downgrades, cancellations, and refunds</li>
          <li style={liStyle}>Maintaining billing records as required by applicable tax and accounting laws</li>
          <li style={liStyle}>Detecting and preventing payment fraud</li>
        </ul>

        <h3 style={h3Style}>3.6 Safety, Security, and Legal Compliance</h3>
        <ul style={ulStyle}>
          <li style={liStyle}>Protecting the security and integrity of the Platform and our systems</li>
          <li style={liStyle}>Detecting, investigating, and preventing fraud, abuse, and unauthorized access</li>
          <li style={liStyle}>Complying with applicable legal obligations, regulatory requirements, and lawful requests from governmental authorities</li>
          <li style={liStyle}>Establishing, exercising, or defending legal claims</li>
        </ul>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 4. LEGAL BASES FOR PROCESSING */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>4. Legal Bases for Processing (EEA &amp; UK Users)</h2>
        <p style={pStyle}>
          If you are located in the European Economic Area or the United Kingdom,
          we process your personal data only where we have a valid legal basis
          under Article 6(1) of the GDPR/UK GDPR. The legal bases we rely on are
          as follows:
        </p>

        <h3 style={h3Style}>4.1 Performance of a Contract — Article 6(1)(b)</h3>
        <p style={pStyle}>
          Processing that is necessary for the performance of our contract with you
          (i.e., our Terms of Service), including creating your account, providing
          Platform features, processing your subscription, synchronizing data from
          connected integrations, and delivering AI-generated insights.
        </p>

        <h3 style={h3Style}>4.2 Consent — Article 6(1)(a)</h3>
        <p style={pStyle}>
          Where we process data based on your consent, including the processing
          of health data under Article 9(2)(a) (see Section 5 below), optional
          marketing communications, non-essential cookies, and any data processing
          that goes beyond what is strictly necessary for contract performance. You
          may withdraw your consent at any time without affecting the lawfulness of
          processing based on consent before its withdrawal.
        </p>

        <h3 style={h3Style}>4.3 Legitimate Interests — Article 6(1)(f)</h3>
        <p style={pStyle}>
          Processing that is necessary for our legitimate interests, provided those
          interests are not overridden by your fundamental rights and freedoms.
          Our legitimate interests include: improving and optimizing the Platform;
          ensuring Platform security; preventing fraud and abuse; conducting
          internal analytics on aggregated, anonymized data; and communicating
          with you about your account. We conduct legitimate interest assessments
          and maintain records thereof as required by applicable law.
        </p>

        <h3 style={h3Style}>4.4 Legal Obligation — Article 6(1)(c)</h3>
        <p style={pStyle}>
          Processing that is necessary for compliance with a legal obligation to
          which we are subject, including tax reporting, financial record-keeping,
          and responding to lawful data access requests from regulatory or
          governmental authorities.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 5. HEALTH DATA & SPECIAL CATEGORIES */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>5. Health Data &amp; Special Categories of Personal Data</h2>

        <h3 style={h3Style}>5.1 Classification</h3>
        <p style={pStyle}>
          Much of the data processed by the Platform constitutes "data concerning
          health" within the meaning of Article 4(15) and Article 9 of the GDPR,
          and "sensitive personal information" under Section 1798.140(ae) of the
          CCPA/CPRA. This includes, without limitation, heart rate data, HRV, sleep
          data, blood oxygen saturation, body composition measurements, blood work
          results, menstrual cycle data, and any data from which an individual's
          physical or physiological condition may be inferred.
        </p>

        <h3 style={h3Style}>5.2 Explicit Consent Under GDPR Article 9(2)(a)</h3>
        <p style={pStyle}>
          Under Article 9(1) of the GDPR, the processing of special categories of
          personal data is prohibited unless an exception under Article 9(2)
          applies. We rely on your <strong style={strongStyle}>explicit consent</strong> under
          Article 9(2)(a) as the legal basis for processing your health data. This
          consent is:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Specific:</strong> We clearly identify each category of health data we collect and the purposes for which it will be processed at the time consent is requested.</li>
          <li style={liStyle}><strong style={strongStyle}>Informed:</strong> We provide clear and comprehensive information about how your health data will be used before you grant consent.</li>
          <li style={liStyle}><strong style={strongStyle}>Freely given:</strong> Consent is not a precondition of signing up for the Platform. You may use the Platform with limited functionality without consenting to health data processing, and you may selectively choose which integrations and data categories to enable.</li>
          <li style={liStyle}><strong style={strongStyle}>Unambiguous:</strong> We collect consent through affirmative actions (e.g., toggling specific data-sharing controls, authorizing third-party integrations) rather than pre-checked boxes or inferred behavior.</li>
          <li style={liStyle}><strong style={strongStyle}>Withdrawable:</strong> You may withdraw consent at any time by disconnecting integrations, disabling specific data categories, or deleting your account. Withdrawal of consent does not affect the lawfulness of processing performed prior to withdrawal.</li>
        </ul>

        <h3 style={h3Style}>5.3 Enhanced Protections for Health Data</h3>
        <p style={pStyle}>
          We apply heightened technical and organizational safeguards to all health
          data, including:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>Encryption at rest (AES-256) and in transit (TLS 1.2 or higher)</li>
          <li style={liStyle}>Strict role-based access controls, ensuring that only authorized personnel with a demonstrated need can access identifiable health data</li>
          <li style={liStyle}>Pseudonymization of health data in analytical and research pipelines</li>
          <li style={liStyle}>Regular data protection impact assessments (DPIAs) conducted pursuant to Article 35 of the GDPR</li>
          <li style={liStyle}>Dedicated audit logging for all access to health data repositories</li>
          <li style={liStyle}>Contractual protections (including data processing agreements) with all sub-processors that handle health data</li>
        </ul>

        <h3 style={h3Style}>5.4 HIPAA Disclaimer</h3>
        <p style={pStyle}>
          AIM is <strong style={strongStyle}>not</strong> a "covered entity" or "business
          associate" as defined under the Health Insurance Portability and
          Accountability Act of 1996 ("<strong style={strongStyle}>HIPAA</strong>"), 45 C.F.R.
          Parts 160 and 164. The Platform is a consumer wellness and performance
          analytics tool; it is not a healthcare provider, health plan, or
          healthcare clearinghouse, and it does not process "protected health
          information" (PHI) as defined under HIPAA.
        </p>
        <p style={pStyle}>
          Notwithstanding the foregoing, we voluntarily adopt technical and
          organizational safeguards that are consistent with the standards set forth
          in the HIPAA Security Rule (45 C.F.R. Part 164, Subpart C) and the HIPAA
          Privacy Rule (45 C.F.R. Part 164, Subpart E), including encryption
          standards, access controls, audit logging, and workforce training. We do
          so because we believe your health data deserves the highest level of
          protection, regardless of the legal classification of our organization.
        </p>

        <h3 style={h3Style}>5.5 Menstrual Cycle Data</h3>
        <p style={pStyle}>
          We are particularly mindful of the sensitivity of menstrual cycle data.
          Collection of this data is entirely optional, requires separate explicit
          consent, and is used solely to provide cycle-phase-aware performance
          insights and recovery recommendations. Menstrual cycle data is never
          shared with any third party, is never used for advertising or marketing
          purposes, and is subject to the most restrictive access controls within
          our systems. You may delete your menstrual cycle data at any time
          independently of other account data.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 6. DATA SHARING & THIRD PARTIES */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>6. Data Sharing &amp; Third Parties</h2>

        <h3 style={h3Style}>6.1 Our Commitment</h3>
        <p style={pStyle}>
          <strong style={strongStyle}>We do not sell your personal information or health data.</strong>{" "}
          We have never sold personal data, and we will not do so in the future.
          For the purposes of the CCPA/CPRA, we do not "sell" or "share" personal
          information as those terms are defined in California Civil Code Section
          1798.140(ad) and Section 1798.140(ah), respectively. We do not share
          your data with advertisers, data brokers, or any entity for targeted
          advertising purposes.
        </p>

        <h3 style={h3Style}>6.2 Service Providers (Sub-Processors)</h3>
        <p style={pStyle}>
          We engage a limited number of trusted service providers who process data
          on our behalf, solely to perform services for us. Each service provider
          is bound by a data processing agreement that restricts their use of your
          data to the services they perform for AIM and requires them to implement
          appropriate technical and organizational safeguards. Our service providers
          include:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Stripe, Inc.</strong> — Payment processing and subscription management. Stripe processes your payment card information directly; we do not have access to your full card details.</li>
          <li style={liStyle}><strong style={strongStyle}>Cloud infrastructure providers</strong> — Hosting, storage, and compute services for the Platform, with data encrypted at rest and in transit.</li>
          <li style={liStyle}><strong style={strongStyle}>Analytics providers</strong> — Privacy-focused analytics services that help us understand aggregate usage patterns. We do not use analytics providers that build cross-site advertising profiles.</li>
          <li style={liStyle}><strong style={strongStyle}>Email delivery services</strong> — For transactional emails and, where you have opted in, product communications.</li>
          <li style={liStyle}><strong style={strongStyle}>Customer support tools</strong> — To manage and respond to your support inquiries.</li>
          <li style={liStyle}><strong style={strongStyle}>Anthropic, PBC</strong> — AI model provider. We transmit your health and fitness data to Anthropic's Claude API to generate personalized AI-powered analysis, insights, and coaching recommendations. Data is processed under Anthropic's commercial API data processing terms and is <strong style={strongStyle}>not used to train their AI models</strong>. Anthropic operates a zero-retention policy for commercial API usage.</li>
          <li style={liStyle}><strong style={strongStyle}>Twilio, Inc.</strong> — SMS messaging provider. For users who opt in to SMS coaching, Twilio processes your phone number and message content solely for the purpose of delivering and receiving text messages. Twilio does not use your data for any other purpose.</li>
        </ul>

        <h3 style={h3Style}>6.3 Connected Third-Party Services</h3>
        <p style={pStyle}>
          When you connect a third-party service (e.g., Strava, Garmin, WHOOP),
          data flows between AIM and that service in accordance with the
          permissions you have granted. AIM's receipt of data from these services
          is governed by this Policy. Your use of those third-party services is
          governed by their respective privacy policies and terms of service, which
          we encourage you to review. We do not control, and are not responsible
          for, the data practices of third-party services.
        </p>

        <h3 style={h3Style}>6.4 Legal Disclosures</h3>
        <p style={pStyle}>
          We may disclose your personal information if we reasonably believe
          disclosure is required by:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>Applicable law, regulation, or legal process (e.g., a subpoena, court order, or governmental request)</li>
          <li style={liStyle}>Law enforcement or governmental authorities with valid legal authority</li>
          <li style={liStyle}>The need to protect the rights, property, or safety of AIM, our users, or the public</li>
          <li style={liStyle}>The need to detect, prevent, or address fraud, security issues, or technical problems</li>
        </ul>
        <p style={pStyle}>
          Where legally permitted, we will make reasonable efforts to notify you
          before disclosing your data in response to legal process. We will
          challenge overly broad or legally deficient requests and will disclose
          only the minimum amount of data necessary to satisfy the request.
        </p>

        <h3 style={h3Style}>6.5 Business Transfers</h3>
        <p style={pStyle}>
          In the event of a merger, acquisition, reorganization, bankruptcy,
          receivership, or sale of all or a portion of our assets, your personal
          information may be transferred as part of that transaction. We will
          provide notice before your personal information becomes subject to a
          different privacy policy, and, where legally required, obtain your
          consent for any material changes to how your health data is processed.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 7. INTERNATIONAL DATA TRANSFERS */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>7. International Data Transfers</h2>
        <p style={pStyle}>
          AIM is based in the United States. If you access the Platform from
          outside the United States, including from the EEA or the UK, your
          personal data will be transferred to and processed in the United States,
          where data protection laws may differ from those in your jurisdiction.
        </p>

        <h3 style={h3Style}>7.1 Transfer Mechanisms</h3>
        <p style={pStyle}>
          For transfers of personal data from the EEA, UK, and Switzerland to the
          United States, we rely on the following lawful transfer mechanisms:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>
            <strong style={strongStyle}>EU-U.S. Data Privacy Framework (DPF), the UK Extension to the DPF, and the Swiss-U.S. DPF:</strong>{" "}
            AIM adheres to the principles of the EU-U.S. Data Privacy Framework as
            set forth by the U.S. Department of Commerce, including the Supplemental
            Principles. Where applicable, we rely on the European Commission's
            adequacy decision for the DPF (Implementing Decision (EU) 2023/1795) as
            the basis for transfers.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>Standard Contractual Clauses (SCCs):</strong>{" "}
            Where the DPF does not apply or as a supplementary safeguard, we execute
            the European Commission's Standard Contractual Clauses (Commission
            Implementing Decision (EU) 2021/914) with our sub-processors and data
            importers, supplemented by additional technical and organizational
            measures where required by the transfer impact assessment.
          </li>
          <li style={liStyle}>
            <strong style={strongStyle}>UK International Data Transfer Addendum:</strong>{" "}
            For transfers subject to the UK GDPR, we utilize the UK International
            Data Transfer Addendum to the EU SCCs, as approved by the UK
            Information Commissioner's Office.
          </li>
        </ul>

        <h3 style={h3Style}>7.2 Supplementary Measures</h3>
        <p style={pStyle}>
          In addition to contractual safeguards, we implement supplementary
          technical measures for international transfers, including end-to-end
          encryption of health data in transit, encryption at rest, access controls
          that limit data access to authorized personnel, and pseudonymization
          where technically feasible and appropriate.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 8. DATA RETENTION */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>8. Data Retention</h2>

        <h3 style={h3Style}>8.1 Retention Periods</h3>
        <p style={pStyle}>
          We retain your personal information and health data only for as long as
          necessary to fulfill the purposes for which it was collected, as
          described in this Policy, or as required by applicable law. The specific
          retention periods are as follows:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Account and profile data:</strong> Retained for the duration of your active account, plus thirty (30) days following account deletion to allow for account recovery.</li>
          <li style={liStyle}><strong style={strongStyle}>Health and fitness data:</strong> Retained for the duration of your active account. Upon account deletion, health data is purged from active systems within thirty (30) days and from backup systems within ninety (90) days.</li>
          <li style={liStyle}><strong style={strongStyle}>Payment and billing records:</strong> Retained for seven (7) years following the date of the transaction, as required by applicable tax and financial reporting obligations (e.g., 26 U.S.C. Section 6001).</li>
          <li style={liStyle}><strong style={strongStyle}>Usage and analytics data:</strong> Retained in identifiable form for up to twenty-four (24) months. After this period, usage data is either deleted or irreversibly anonymized.</li>
          <li style={liStyle}><strong style={strongStyle}>Server logs:</strong> Retained for up to ninety (90) days for security and debugging purposes, then automatically deleted.</li>
          <li style={liStyle}><strong style={strongStyle}>Customer support records:</strong> Retained for three (3) years following resolution of the inquiry.</li>
        </ul>

        <h3 style={h3Style}>8.2 Account Deletion</h3>
        <p style={pStyle}>
          You may request deletion of your account at any time through the
          Platform's settings or by contacting us at{" "}
          <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>
            privacy@aim.ai
          </a>
          . Upon receiving a verified deletion request:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>Your account will be deactivated immediately, and your data will no longer be accessible through the Platform.</li>
          <li style={liStyle}>All personal information and health data will be permanently deleted from active production systems within thirty (30) days.</li>
          <li style={liStyle}>Data in encrypted backup systems will be permanently deleted within ninety (90) days.</li>
          <li style={liStyle}>Anonymized, aggregated data that cannot reasonably be used to identify you may be retained indefinitely for research and statistical purposes.</li>
          <li style={liStyle}>Data that we are legally required to retain (e.g., billing records) will be retained for the minimum period required by law, after which it will be deleted.</li>
        </ul>

        <h3 style={h3Style}>8.3 Third-Party Integration Data After Deletion</h3>
        <p style={pStyle}>
          Deletion of your AIM account will remove all data stored within the
          Platform. It will not delete data held by connected third-party services
          (e.g., Strava, Garmin). You must manage data retention with those
          services separately in accordance with their respective privacy policies.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 9. YOUR RIGHTS */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>9. Your Rights</h2>
        <p style={pStyle}>
          Depending on your jurisdiction, you may have some or all of the following
          rights with respect to your personal data. We are committed to
          facilitating the exercise of these rights in a timely and transparent
          manner.
        </p>

        <h3 style={h3Style}>9.1 Rights Under the GDPR &amp; UK GDPR</h3>
        <p style={pStyle}>
          If you are located in the EEA or the UK, you have the following rights
          under Chapters III and IV of the GDPR/UK GDPR:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Right of Access (Article 15):</strong> You have the right to obtain confirmation as to whether we process your personal data, and, where we do, to access a copy of that data together with information about the purposes, categories, recipients, retention periods, and your rights.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Rectification (Article 16):</strong> You have the right to request the correction of inaccurate personal data and the completion of incomplete personal data.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Erasure (Article 17):</strong> You have the right to request the deletion of your personal data where it is no longer necessary for the purposes for which it was collected, where you withdraw consent and there is no other legal basis, where you object and there are no overriding legitimate grounds, or where processing is unlawful.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Restriction of Processing (Article 18):</strong> You have the right to request that we restrict the processing of your personal data where you contest its accuracy, where processing is unlawful but you oppose erasure, where we no longer need the data but you require it for legal claims, or where you have objected to processing pending verification.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Data Portability (Article 20):</strong> You have the right to receive your personal data in a structured, commonly used, and machine-readable format (e.g., JSON or CSV) and to transmit that data to another controller without hindrance from us.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Object (Article 21):</strong> You have the right to object to processing based on legitimate interests or for direct marketing purposes. Where you object, we will cease processing unless we demonstrate compelling legitimate grounds that override your interests.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Withdraw Consent (Article 7(3)):</strong> Where processing is based on consent, you have the right to withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing performed prior to withdrawal.</li>
          <li style={liStyle}><strong style={strongStyle}>Right Not to Be Subject to Automated Decision-Making (Article 22):</strong> You have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning you or similarly significantly affects you. Our AI-generated insights are provided as informational tools and do not constitute automated decisions with legal or similarly significant effects.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with a supervisory authority, in particular in the EU/EEA Member State of your habitual residence, your place of work, or the place of the alleged infringement.</li>
        </ul>

        <h3 style={h3Style}>9.2 Rights Under the CCPA/CPRA</h3>
        <p style={pStyle}>
          If you are a California resident, please see Section 10 below for a
          detailed description of your rights under the CCPA/CPRA.
        </p>

        <h3 style={h3Style}>9.3 Exercising Your Rights</h3>
        <p style={pStyle}>
          To exercise any of the rights described above, you may:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>Use the self-service privacy controls available in your Platform account settings</li>
          <li style={liStyle}>Submit a request by emailing{" "}
            <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>
          </li>
          <li style={liStyle}>Contact our Data Protection Officer at the address provided in Section 14</li>
        </ul>
        <p style={pStyle}>
          We will verify your identity before fulfilling any request and will
          respond within the timeframes required by applicable law: thirty (30)
          days under the GDPR (extendable by sixty days for complex requests) and
          forty-five (45) days under the CCPA/CPRA (extendable by an additional
          forty-five days with notice). We do not charge a fee for exercising your
          rights unless a request is manifestly unfounded or excessive, in which
          case we may charge a reasonable fee or refuse to act.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 10. CALIFORNIA PRIVACY RIGHTS */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>10. California Privacy Rights (CCPA/CPRA)</h2>
        <p style={pStyle}>
          This section applies solely to natural persons who are California
          residents, as defined in Section 17014 of Title 18 of the California
          Code of Regulations, and supplements the information contained elsewhere
          in this Policy. Capitalized terms used but not defined in this section
          have the meanings given to them in the CCPA (California Civil Code
          Section 1798.100 et seq.) as amended by the CPRA.
        </p>

        <h3 style={h3Style}>10.1 Categories of Personal Information Collected</h3>
        <p style={pStyle}>
          In the preceding twelve (12) months, we have collected the following
          categories of personal information, as enumerated in Section 1798.140(v):
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Identifiers</strong> (Category A): name, email address, account name, IP address</li>
          <li style={liStyle}><strong style={strongStyle}>Personal information under Cal. Civ. Code Section 1798.80(e)</strong> (Category B): name, address (billing)</li>
          <li style={liStyle}><strong style={strongStyle}>Protected classification characteristics</strong> (Category C): age, sex, gender</li>
          <li style={liStyle}><strong style={strongStyle}>Commercial information</strong> (Category D): subscription tier, purchase history, payment records</li>
          <li style={liStyle}><strong style={strongStyle}>Biometric information</strong> (Category E): physiological measurements including heart rate, HRV, body temperature, and body composition data</li>
          <li style={liStyle}><strong style={strongStyle}>Internet or other electronic network activity</strong> (Category F): browsing history on the Platform, interactions with features, usage data</li>
          <li style={liStyle}><strong style={strongStyle}>Geolocation data</strong> (Category G): approximate location derived from IP address; GPS route data from connected fitness activities</li>
          <li style={liStyle}><strong style={strongStyle}>Sensory data</strong> (Category H): not collected</li>
          <li style={liStyle}><strong style={strongStyle}>Professional or employment-related information</strong> (Category I): not collected</li>
          <li style={liStyle}><strong style={strongStyle}>Education information</strong> (Category J): not collected</li>
          <li style={liStyle}><strong style={strongStyle}>Inferences drawn from the above</strong> (Category K): AI-generated insights about fitness level, recovery status, performance trends, and health patterns</li>
          <li style={liStyle}><strong style={strongStyle}>Sensitive personal information</strong> (Category S): health data, biometric data, precise geolocation (when derived from fitness activities), and data concerning sex life/sexual orientation (menstrual cycle data, only if voluntarily provided)</li>
        </ul>

        <h3 style={h3Style}>10.2 Right to Know / Access</h3>
        <p style={pStyle}>
          You have the right to request that we disclose to you, for the preceding
          twelve (12) months: (a) the categories of personal information collected;
          (b) the categories of sources; (c) the business or commercial purpose
          for collecting; (d) the categories of third parties with whom we share
          personal information; and (e) the specific pieces of personal information
          collected about you.
        </p>

        <h3 style={h3Style}>10.3 Right to Delete</h3>
        <p style={pStyle}>
          You have the right to request that we delete your personal information,
          subject to certain exceptions (e.g., data we are legally required to
          retain). Upon receiving a verified request, we will delete (and direct
          our service providers to delete) your personal information in accordance
          with the timelines described in Section 8.
        </p>

        <h3 style={h3Style}>10.4 Right to Correct</h3>
        <p style={pStyle}>
          You have the right to request correction of inaccurate personal
          information that we maintain about you, taking into account the nature
          of the information and the purposes of processing.
        </p>

        <h3 style={h3Style}>10.5 Right to Opt-Out of Sale or Sharing</h3>
        <p style={pStyle}>
          We do not sell your personal information and have not done so in the
          preceding twelve (12) months. We do not "share" your personal information
          for cross-context behavioral advertising as defined under the CPRA.
          Accordingly, there is no sale or sharing from which to opt out. Should
          our practices change in the future, we will provide a conspicuous "Do
          Not Sell or Share My Personal Information" link and update this Policy
          prior to any such change.
        </p>

        <h3 style={h3Style}>10.6 Right to Limit Use of Sensitive Personal Information</h3>
        <p style={pStyle}>
          You have the right to direct us to limit the use and disclosure of your
          sensitive personal information to that which is necessary to perform the
          services you have requested. We already limit our use of sensitive
          personal information to purposes that are necessary for providing the
          Platform and as otherwise permitted under Section 1798.121 of the CCPA.
        </p>

        <h3 style={h3Style}>10.7 Non-Discrimination</h3>
        <p style={pStyle}>
          We will not discriminate against you for exercising any of your CCPA/CPRA
          rights. We will not deny you services, charge you different prices, or
          provide you with a different level or quality of services because you
          exercise your privacy rights. However, if you delete your account or
          certain data, features that depend on that data may no longer be
          available.
        </p>

        <h3 style={h3Style}>10.8 Authorized Agent</h3>
        <p style={pStyle}>
          You may designate an authorized agent to submit a request on your behalf.
          The authorized agent must present a valid power of attorney or written
          authorization signed by you, and we may require you to directly verify
          your identity and confirm the request.
        </p>

        <h3 style={h3Style}>10.9 Financial Incentive Disclosure</h3>
        <p style={pStyle}>
          We do not offer financial incentives or price or service differences in
          exchange for the retention or disclosure of personal information.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 10B. WASHINGTON MY HEALTH MY DATA ACT */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>10B. Washington My Health My Data Act</h2>
        <p style={pStyle}>
          If you are a Washington state resident, you have additional rights under
          the Washington My Health My Data Act (MHMDA), RCW 19.373. This section
          supplements the information in this Policy as required by the MHMDA.
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Consent before collection:</strong> We obtain your explicit consent before collecting or sharing consumer health data, including through the health data consent flow during account onboarding.</li>
          <li style={liStyle}><strong style={strongStyle}>No sale of health data:</strong> We do not sell, as defined under the MHMDA, any consumer health data.</li>
          <li style={liStyle}><strong style={strongStyle}>Right to delete:</strong> You may request deletion of your consumer health data at any time through your account settings or by contacting privacy@aim.ai. We will delete your health data and direct our processors to do the same within thirty (30) days.</li>
          <li style={liStyle}><strong style={strongStyle}>Processor agreements:</strong> We maintain written agreements with all processors of consumer health data, including Anthropic, PBC (AI analysis) and Twilio, Inc. (SMS messaging), that restrict their use of health data to the services they provide to AIM.</li>
          <li style={liStyle}><strong style={strongStyle}>Geofencing prohibition:</strong> We do not use geofencing technology to collect consumer health data within the boundaries of a health care facility.</li>
        </ul>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 11. CHILDREN'S PRIVACY */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>11. Children's Privacy</h2>
        <p style={pStyle}>
          The Platform is not directed at, and is not intended for use by,
          individuals under the age of sixteen (16). We do not knowingly collect
          personal information from children under 16. This age threshold is
          consistent with Article 8 of the GDPR, which permits Member States to set
          the age of consent for information society services between 13 and 16
          years, and we apply the most protective standard.
        </p>
        <p style={pStyle}>
          If we become aware that we have inadvertently collected personal
          information from a child under the age of 16, we will take immediate
          steps to delete such information from our systems. If you believe that
          a child under 16 has provided us with personal information, please
          contact us at{" "}
          <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>
            privacy@aim.ai
          </a>
          .
        </p>
        <p style={pStyle}>
          For the avoidance of doubt, we do not have "actual knowledge" that we
          sell or share the personal information of consumers under the age of 16
          within the meaning of Section 1798.120(c) of the CCPA.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 12. DATA SECURITY */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>12. Data Security</h2>
        <p style={pStyle}>
          We implement and maintain comprehensive technical and organizational
          security measures designed to protect your personal information and
          health data against unauthorized access, alteration, disclosure,
          destruction, and other unlawful forms of processing, in accordance with
          Article 32 of the GDPR and industry best practices.
        </p>

        <h3 style={h3Style}>12.1 Technical Measures</h3>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Encryption in transit:</strong> All data transmitted between your device and the Platform is encrypted using Transport Layer Security (TLS) 1.2 or higher. All API communications with third-party integrations are conducted over encrypted channels.</li>
          <li style={liStyle}><strong style={strongStyle}>Encryption at rest:</strong> All personal information and health data stored in our databases and file systems is encrypted at rest using AES-256 encryption.</li>
          <li style={liStyle}><strong style={strongStyle}>Key management:</strong> Encryption keys are managed through a dedicated key management service with automatic rotation, separation of duties, and hardware security module (HSM) backing where applicable.</li>
          <li style={liStyle}><strong style={strongStyle}>Access controls:</strong> Strict role-based access control (RBAC) ensures that only authorized personnel can access personal data, with health data subject to the most restrictive access tier. Multi-factor authentication (MFA) is required for all internal system access.</li>
          <li style={liStyle}><strong style={strongStyle}>Network security:</strong> Our infrastructure employs firewalls, intrusion detection systems, network segmentation, and DDoS mitigation.</li>
          <li style={liStyle}><strong style={strongStyle}>Application security:</strong> We conduct regular code reviews, static application security testing (SAST), dynamic application security testing (DAST), and dependency vulnerability scanning. We follow secure development lifecycle (SDL) practices.</li>
          <li style={liStyle}><strong style={strongStyle}>Penetration testing:</strong> We engage independent third-party security firms to perform penetration testing at least annually.</li>
        </ul>

        <h3 style={h3Style}>12.2 Organizational Measures</h3>
        <ul style={ulStyle}>
          <li style={liStyle}><strong style={strongStyle}>Security training:</strong> All employees and contractors undergo security awareness and data protection training upon onboarding and annually thereafter.</li>
          <li style={liStyle}><strong style={strongStyle}>Background checks:</strong> Employees with access to personal data undergo background checks in accordance with applicable law.</li>
          <li style={liStyle}><strong style={strongStyle}>Incident response:</strong> We maintain a documented incident response plan. In the event of a personal data breach, we will notify the relevant supervisory authority within seventy-two (72) hours where required by Article 33 of the GDPR, and affected individuals without undue delay where the breach is likely to result in a high risk to their rights and freedoms (Article 34 of the GDPR).</li>
          <li style={liStyle}><strong style={strongStyle}>Vendor management:</strong> All sub-processors undergo security and privacy assessments before engagement and are subject to ongoing monitoring.</li>
          <li style={liStyle}><strong style={strongStyle}>Business continuity:</strong> We maintain business continuity and disaster recovery plans to ensure the availability and resilience of the Platform.</li>
        </ul>

        <h3 style={h3Style}>12.3 Your Role in Security</h3>
        <p style={pStyle}>
          While we implement robust security measures, the security of your account
          also depends on your actions. We encourage you to use a strong, unique
          password for your AIM account, enable multi-factor authentication where
          available, keep your devices and operating systems up to date, and
          promptly report any suspected unauthorized access to{" "}
          <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>
            privacy@aim.ai
          </a>
          . No method of transmission over the Internet or electronic storage is
          completely secure. While we strive to protect your data, we cannot
          guarantee absolute security.
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 13. CHANGES TO THIS POLICY */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>13. Changes to This Policy</h2>
        <p style={pStyle}>
          We may update this Policy from time to time to reflect changes in our
          practices, technologies, legal requirements, or other factors. When we
          make material changes to this Policy, we will:
        </p>
        <ul style={ulStyle}>
          <li style={liStyle}>Update the "Last updated" date at the top of this page</li>
          <li style={liStyle}>Notify you by email at the address associated with your account at least thirty (30) days before the changes take effect</li>
          <li style={liStyle}>Display a prominent notice within the Platform</li>
          <li style={liStyle}>Where material changes affect the processing of health data or require a change in legal basis, obtain fresh consent where required by applicable law</li>
        </ul>
        <p style={pStyle}>
          We encourage you to review this Policy periodically. Your continued use
          of the Platform after the effective date of any changes constitutes your
          acceptance of the revised Policy, except where consent is required, in
          which case the changes will not apply to you until you have provided such
          consent.
        </p>
        <p style={pStyle}>
          Previous versions of this Policy are available upon request by contacting{" "}
          <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>
            privacy@aim.ai
          </a>
          .
        </p>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* 14. CONTACT INFORMATION */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <h2 style={h2Style}>14. Contact Information</h2>

        <h3 style={h3Style}>14.1 Data Controller</h3>
        <p style={pStyle}>
          The data controller for the purposes of the GDPR/UK GDPR is:
        </p>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 24,
            fontFamily: mono,
            fontSize: 14,
            lineHeight: 1.8,
            color: T.textSoft,
          }}
        >
          AIM Performance Intelligence, Inc.
          <br />
          San Francisco, California
          <br />
          United States of America
          <br />
          Email:{" "}
          <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>
            privacy@aim.ai
          </a>
        </div>

        <h3 style={h3Style}>14.2 Data Protection Officer</h3>
        <p style={pStyle}>
          We have appointed a Data Protection Officer (DPO) who can be reached for
          any questions or concerns regarding this Policy, our data processing
          practices, or to exercise your data protection rights:
        </p>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 24,
            fontFamily: mono,
            fontSize: 14,
            lineHeight: 1.8,
            color: T.textSoft,
          }}
        >
          Data Protection Officer
          <br />
          AIM Performance Intelligence, Inc.
          <br />
          Email:{" "}
          <a href="mailto:dpo@aim.ai" style={{ color: T.accent }}>
            dpo@aim.ai
          </a>
        </div>

        <h3 style={h3Style}>14.3 EU Representative</h3>
        <p style={pStyle}>
          Pursuant to Article 27 of the GDPR, we have appointed a representative
          in the European Union for data subjects in the EEA to contact regarding
          our processing of personal data:
        </p>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 24,
            fontFamily: mono,
            fontSize: 14,
            lineHeight: 1.8,
            color: T.textSoft,
          }}
        >
          EU Data Protection Representative
          <br />
          AIM Performance Intelligence, Inc.
          <br />
          Email:{" "}
          <a href="mailto:eu-representative@aim.ai" style={{ color: T.accent }}>
            eu-representative@aim.ai
          </a>
        </div>
        <p style={pStyle}>
          For questions specific to the UK GDPR, you may also contact the UK
          Information Commissioner's Office (ICO) directly at{" "}
          <a
            href="https://ico.org.uk"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.accent }}
          >
            ico.org.uk
          </a>
          .
        </p>

        <h3 style={h3Style}>14.4 General Inquiries</h3>
        <p style={pStyle}>
          For general privacy inquiries, data access requests, or complaints, you
          may contact us at any time at{" "}
          <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>
            privacy@aim.ai
          </a>
          . We are committed to resolving any concerns you may have about our
          collection and use of your personal data. If you are not satisfied with
          our response, you have the right to lodge a complaint with your local
          supervisory authority.
        </p>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 64,
            paddingTop: 32,
            borderTop: `1px solid ${T.border}`,
            color: T.textDim,
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <p>
            &copy; {new Date().getFullYear()} AIM Performance Intelligence, Inc.
            All rights reserved.
          </p>
          <p style={{ marginTop: 8 }}>
            This Privacy Policy is effective as of March 1, 2026. This document
            was prepared by legal counsel for AIM Performance Intelligence, Inc.
            and is intended to be legally binding. Nothing in this Policy shall be
            construed as legal advice to any third party.
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 24 }}>
            <Link
              to="/legal/terms"
              style={{ color: T.textSoft, textDecoration: "none", fontSize: 13 }}
            >
              Terms of Service
            </Link>
            <Link
              to="/legal/privacy"
              style={{ color: T.textSoft, textDecoration: "none", fontSize: 13 }}
            >
              Privacy Policy
            </Link>
            <Link
              to="/"
              style={{ color: T.textSoft, textDecoration: "none", fontSize: 13 }}
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
