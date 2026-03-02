import { Link } from "react-router-dom";
import { T, font } from "../../theme/tokens";

const h2 = { fontSize: 22, fontWeight: 700, marginTop: 48, marginBottom: 16, letterSpacing: "-0.02em" };
const h3 = { fontSize: 17, fontWeight: 600, marginTop: 32, marginBottom: 12 };
const p = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 16 };
const ul = { paddingLeft: 24, marginBottom: 16 };
const li = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 8 };

export default function GDPR() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <nav style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </Link>
        <Link to="/" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14 }}>&larr; Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>GDPR Rights &amp; Compliance</h1>
        <p style={{ color: T.textDim, fontSize: 14, marginBottom: 48 }}>Last updated: March 1, 2026</p>

        {/* ── 1. OUR COMMITMENT ── */}
        <h2 style={h2}>1. Our Commitment to Data Protection</h2>
        <p style={p}>
          AIM Performance Intelligence, Inc. ("AIM," "we," "us," or "our") is committed to protecting the privacy and personal data of all individuals who use our AI-powered performance intelligence platform. We recognize that our Users entrust us with sensitive health and fitness data, and we take that responsibility with the utmost seriousness.
        </p>
        <p style={p}>
          As a platform serving a global user base, AIM is designed from the ground up to comply with the European Union General Data Protection Regulation (Regulation (EU) 2016/679) ("GDPR"), the United Kingdom General Data Protection Regulation ("UK GDPR"), the Data Protection Act 2018, the California Consumer Privacy Act as amended by the California Privacy Rights Act ("CCPA/CPRA"), and other applicable data protection legislation worldwide.
        </p>
        <p style={p}>
          This page explains how we comply with the GDPR and UK GDPR, the legal bases upon which we process your data, and the rights you have as a Data Subject. It supplements our <Link to="/legal/privacy" style={{ color: T.accent }}>Privacy Policy</Link>, <Link to="/legal/terms" style={{ color: T.accent }}>Terms of Service</Link>, and <Link to="/legal/data-processing" style={{ color: T.accent }}>Data Processing Agreement</Link>.
        </p>
        <p style={p}>
          We are committed to the principles of lawfulness, fairness, and transparency; purpose limitation; data minimization; accuracy; storage limitation; integrity and confidentiality; and accountability as set forth in Article 5 of the GDPR. These principles guide every aspect of how we design, build, and operate our platform.
        </p>

        {/* ── 2. LEGAL BASIS ── */}
        <h2 style={h2}>2. Legal Basis for Processing</h2>
        <p style={p}>
          Under the GDPR, we must have a valid legal basis for each processing activity involving your Personal Data. Below, we set out the legal bases upon which AIM relies for different categories of processing.
        </p>

        <h3 style={h3}>2.1 Article 6 -- General Conditions for Lawful Processing</h3>
        <p style={p}>AIM relies on the following legal bases under Article 6(1) of the GDPR:</p>

        <p style={{ ...p, marginTop: 20 }}><strong style={{ color: T.text }}>Consent (Article 6(1)(a))</strong></p>
        <p style={p}>
          Where you have given clear, affirmative consent to the processing of your Personal Data for one or more specific purposes. You provide consent when you create an account, connect third-party integrations, or opt in to optional features. Consent for specific processing activities is obtained through clear, granular consent mechanisms that allow you to understand exactly what data will be processed and for what purpose. You may withdraw your consent at any time, as described in Section 3.8 below, without affecting the lawfulness of processing based on consent before its withdrawal.
        </p>

        <p style={{ ...p, marginTop: 20 }}><strong style={{ color: T.text }}>Performance of a Contract (Article 6(1)(b))</strong></p>
        <p style={p}>
          Where processing is necessary for the performance of a contract to which you are a party, or in order to take steps at your request prior to entering into a contract. This includes processing necessary to provide the core AIM Service: receiving your health and fitness data from connected platforms, performing AI analysis, generating personalized insights and recommendations, displaying your data within the platform, processing payments for your subscription, and providing customer support.
        </p>

        <p style={{ ...p, marginTop: 20 }}><strong style={{ color: T.text }}>Legitimate Interests (Article 6(1)(f))</strong></p>
        <p style={p}>
          Where processing is necessary for the purposes of the legitimate interests pursued by AIM, except where such interests are overridden by your interests, fundamental rights, or freedoms. We rely on legitimate interests for:
        </p>
        <ul style={ul}>
          <li style={li}>Improving and developing the Service through aggregated, anonymized analytics and usage patterns.</li>
          <li style={li}>Ensuring the security and integrity of the platform, including fraud detection and prevention.</li>
          <li style={li}>Communicating with you about service updates, new features, and changes that may affect your use of the platform.</li>
          <li style={li}>Enforcing our Terms of Service and protecting AIM's legal rights.</li>
          <li style={li}>Conducting internal research and development to enhance our AI models using anonymized data sets.</li>
        </ul>
        <p style={p}>
          We conduct a legitimate interest assessment (LIA) for each processing activity that relies on this basis, balancing our interests against the potential impact on your rights and freedoms. You have the right to object to processing based on legitimate interests, as described in Section 3.6 below.
        </p>

        <p style={{ ...p, marginTop: 20 }}><strong style={{ color: T.text }}>Legal Obligation (Article 6(1)(c))</strong></p>
        <p style={p}>
          Where processing is necessary for compliance with a legal obligation to which AIM is subject, including tax and financial reporting obligations, responding to lawful requests from public authorities, and maintaining records required by applicable law.
        </p>

        <h3 style={h3}>2.2 Article 9 -- Processing of Special Categories of Personal Data</h3>
        <p style={p}>
          AIM processes data concerning health, which constitutes a Special Category of Personal Data under Article 9 of the GDPR. The processing of Special Category Data is generally prohibited unless one of the exceptions set out in Article 9(2) applies.
        </p>
        <p style={p}>
          AIM relies on the following exception:
        </p>

        <p style={{ ...p, marginTop: 20 }}><strong style={{ color: T.text }}>Explicit Consent (Article 9(2)(a))</strong></p>
        <p style={p}>
          You provide explicit consent to the processing of your health and fitness data when you create an AIM account and connect your health data sources. This explicit consent is obtained through a clear, specific, and unambiguous consent flow that:
        </p>
        <ul style={ul}>
          <li style={li}>Clearly identifies the specific categories of health data that will be processed (e.g., heart rate, blood work, sleep data, body composition, training metrics).</li>
          <li style={li}>Explains the purposes for which the data will be processed (AI-powered analysis, personalized insights, longitudinal tracking).</li>
          <li style={li}>Informs you that the data constitutes Special Category Data under the GDPR and requires your explicit consent.</li>
          <li style={li}>Provides a separate, affirmative action to consent (not bundled with general terms of service acceptance).</li>
          <li style={li}>Clearly states your right to withdraw consent at any time and explains how to do so.</li>
        </ul>
        <p style={p}>
          You may withdraw your explicit consent to the processing of health data at any time. Withdrawal of consent will result in the cessation of processing of your health data and may affect your ability to use certain features of the Service that depend on that data. Withdrawal of consent does not affect the lawfulness of processing carried out prior to the withdrawal.
        </p>

        {/* ── 3. YOUR RIGHTS ── */}
        <h2 style={h2}>3. Your Rights Under the GDPR</h2>
        <p style={p}>
          As a Data Subject, you have a number of rights under the GDPR and UK GDPR in relation to the Personal Data we hold about you. AIM is committed to facilitating the exercise of these rights promptly and transparently. Below is a comprehensive overview of each right and how AIM supports it.
        </p>

        <h3 style={h3}>3.1 Right of Access (Article 15)</h3>
        <p style={p}>
          You have the right to obtain from AIM confirmation as to whether or not your Personal Data is being processed, and where that is the case, access to the Personal Data together with the following information:
        </p>
        <ul style={ul}>
          <li style={li}>The purposes of the processing.</li>
          <li style={li}>The categories of Personal Data concerned.</li>
          <li style={li}>The recipients or categories of recipients to whom the Personal Data has been or will be disclosed, in particular recipients in third countries or international organizations.</li>
          <li style={li}>Where possible, the envisaged period for which the Personal Data will be stored, or, if not possible, the criteria used to determine that period.</li>
          <li style={li}>The existence of the right to request rectification, erasure, restriction of processing, or to object to processing.</li>
          <li style={li}>The right to lodge a complaint with a supervisory authority.</li>
          <li style={li}>Where the Personal Data is not collected from you, any available information as to its source.</li>
          <li style={li}>The existence of automated decision-making, including profiling, and meaningful information about the logic involved, as well as the significance and the envisaged consequences of such processing.</li>
        </ul>
        <p style={p}>
          <strong style={{ color: T.text }}>How AIM facilitates this right:</strong> You can access the majority of your Personal Data directly within the AIM platform through your account dashboard and settings. For a complete data access request, including information about processing activities, recipients, and retention periods, you may submit a Subject Access Request (SAR) to <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>. AIM will provide a copy of the Personal Data undergoing processing in a commonly used electronic form, free of charge. Additional copies may be subject to a reasonable fee based on administrative costs.
        </p>

        <h3 style={h3}>3.2 Right to Rectification (Article 16)</h3>
        <p style={p}>
          You have the right to obtain without undue delay the rectification of inaccurate Personal Data concerning you. Taking into account the purposes of the processing, you also have the right to have incomplete Personal Data completed, including by means of providing a supplementary statement.
        </p>
        <p style={p}>
          <strong style={{ color: T.text }}>How AIM facilitates this right:</strong> You can correct most Personal Data directly within the AIM platform through your profile and account settings. For data that cannot be corrected through self-service tools, or for data received from third-party integrations, you may submit a rectification request to <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>. Where the rectification concerns data sourced from a third-party integration, AIM will assist you in identifying the source and, where possible, updating the data. AIM will also notify any recipients to whom the inaccurate data was disclosed, unless this proves impossible or involves disproportionate effort.
        </p>

        <h3 style={h3}>3.3 Right to Erasure -- "Right to be Forgotten" (Article 17)</h3>
        <p style={p}>
          You have the right to obtain the erasure of your Personal Data without undue delay where one of the following grounds applies:
        </p>
        <ul style={ul}>
          <li style={li}>The Personal Data is no longer necessary in relation to the purposes for which it was collected or otherwise processed.</li>
          <li style={li}>You withdraw your consent on which the processing is based and there is no other legal ground for the processing.</li>
          <li style={li}>You object to the processing pursuant to Article 21(1) and there are no overriding legitimate grounds for the processing, or you object to the processing pursuant to Article 21(2).</li>
          <li style={li}>The Personal Data has been unlawfully processed.</li>
          <li style={li}>The Personal Data must be erased for compliance with a legal obligation to which AIM is subject.</li>
        </ul>
        <p style={p}>
          <strong style={{ color: T.text }}>How AIM facilitates this right:</strong> You can delete your account and all associated data through the account settings within the AIM platform. Upon account deletion, AIM will erase all Personal Data within thirty (30) days, except where retention is required by law (e.g., financial transaction records). You may also request selective erasure of specific data categories by contacting <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>. AIM will notify all Sub-Processors to delete the relevant data and will confirm deletion in writing upon request.
        </p>
        <p style={p}>
          <strong style={{ color: T.text }}>Exceptions:</strong> The right to erasure does not apply to the extent that processing is necessary for compliance with a legal obligation, for the establishment, exercise, or defense of legal claims, or for archiving purposes in the public interest.
        </p>

        <h3 style={h3}>3.4 Right to Restriction of Processing (Article 18)</h3>
        <p style={p}>
          You have the right to obtain restriction of processing where one of the following applies:
        </p>
        <ul style={ul}>
          <li style={li}>The accuracy of the Personal Data is contested by you, for a period enabling AIM to verify the accuracy of the data.</li>
          <li style={li}>The processing is unlawful and you oppose the erasure of the Personal Data and request the restriction of its use instead.</li>
          <li style={li}>AIM no longer needs the Personal Data for the purposes of the processing, but you require it for the establishment, exercise, or defense of legal claims.</li>
          <li style={li}>You have objected to processing pursuant to Article 21(1) pending the verification of whether AIM's legitimate grounds override yours.</li>
        </ul>
        <p style={p}>
          <strong style={{ color: T.text }}>How AIM facilitates this right:</strong> Where processing has been restricted, AIM will only store your Personal Data and will not further process it (except with your consent, for the establishment, exercise, or defense of legal claims, for the protection of the rights of another natural or legal person, or for reasons of important public interest). AIM will inform you before any restriction of processing is lifted. To request restriction, contact <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>.
        </p>

        <h3 style={h3}>3.5 Right to Data Portability (Article 20)</h3>
        <p style={p}>
          You have the right to receive your Personal Data in a structured, commonly used, and machine-readable format, and to transmit that data to another controller without hindrance from AIM, where:
        </p>
        <ul style={ul}>
          <li style={li}>The processing is based on your consent (Article 6(1)(a) or Article 9(2)(a)) or on the performance of a contract (Article 6(1)(b)); and</li>
          <li style={li}>The processing is carried out by automated means.</li>
        </ul>
        <p style={p}>
          You also have the right to have the Personal Data transmitted directly from AIM to another controller, where technically feasible.
        </p>
        <p style={p}>
          <strong style={{ color: T.text }}>How AIM facilitates this right:</strong> AIM provides built-in data export functionality that allows you to download your complete data set, including all health metrics, fitness data, blood work results, body composition data, sleep data, and AI-generated insights, in structured machine-readable formats (CSV and JSON). You can initiate a data export from your account settings at any time. For direct controller-to-controller transfer requests, contact <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>.
        </p>

        <h3 style={h3}>3.6 Right to Object (Article 21)</h3>
        <p style={p}>
          You have the right to object, on grounds relating to your particular situation, at any time to the processing of your Personal Data which is based on Article 6(1)(e) (public interest) or Article 6(1)(f) (legitimate interests), including profiling based on those provisions. Upon objection, AIM shall no longer process the Personal Data unless AIM demonstrates compelling legitimate grounds for the processing which override your interests, rights, and freedoms, or for the establishment, exercise, or defense of legal claims.
        </p>
        <p style={p}>
          Where Personal Data is processed for direct marketing purposes, you have the right to object at any time to the processing of your Personal Data for such marketing, including profiling to the extent that it is related to such direct marketing. Where you object to processing for direct marketing purposes, the Personal Data shall no longer be processed for such purposes.
        </p>
        <p style={p}>
          <strong style={{ color: T.text }}>How AIM facilitates this right:</strong> You can manage your communication preferences and opt out of marketing communications through your account settings or by using the unsubscribe link in any marketing email. For objections to other processing activities based on legitimate interests, contact <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a> with details of the specific processing activity to which you object and the grounds for your objection.
        </p>

        <h3 style={h3}>3.7 Rights Related to Automated Decision-Making and Profiling (Article 22)</h3>
        <p style={p}>
          You have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning you or similarly significantly affects you.
        </p>
        <p style={p}>
          <strong style={{ color: T.text }}>AIM's approach to automated decision-making:</strong> AIM uses artificial intelligence and machine learning to analyze your health and fitness data and generate personalized insights, recommendations, and performance assessments. However, AIM's AI-generated outputs are designed as informational tools to support your decision-making and do not constitute decisions that produce legal effects or similarly significantly affect you. AIM's AI analysis:
        </p>
        <ul style={ul}>
          <li style={li}>Does not make binding decisions regarding your health, fitness, or well-being.</li>
          <li style={li}>Does not restrict your access to services, opportunities, or benefits.</li>
          <li style={li}>Is presented as recommendations and insights, not directives or diagnoses.</li>
          <li style={li}>Does not replace professional medical, nutritional, or coaching advice.</li>
        </ul>
        <p style={p}>
          Nevertheless, AIM is committed to transparency about its AI processing. You have the right to:
        </p>
        <ul style={ul}>
          <li style={li}>Receive meaningful information about the logic involved in AI-generated insights and how your data is used to generate them.</li>
          <li style={li}>Request human review of any AI-generated assessment or recommendation that you believe may significantly affect you.</li>
          <li style={li}>Express your point of view and contest any AI-generated output.</li>
          <li style={li}>Opt out of specific AI analysis features while retaining access to manual data tracking and display features.</li>
        </ul>

        <h3 style={h3}>3.8 Right to Withdraw Consent</h3>
        <p style={p}>
          Where AIM's processing of your Personal Data is based on consent (including explicit consent for Special Category Data), you have the right to withdraw your consent at any time. The withdrawal of consent shall not affect the lawfulness of processing based on consent before its withdrawal.
        </p>
        <p style={p}>
          <strong style={{ color: T.text }}>How to withdraw consent:</strong>
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Third-party integrations:</strong> You can disconnect any third-party data source (e.g., Garmin, Strava, Whoop, Apple Health) at any time through your account settings. Disconnecting an integration will stop further data collection from that source.</li>
          <li style={li}><strong style={{ color: T.text }}>Health data processing:</strong> You can withdraw consent for the processing of specific categories of health data through your privacy settings or by contacting <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a>.</li>
          <li style={li}><strong style={{ color: T.text }}>Marketing communications:</strong> You can withdraw consent for marketing communications at any time using the unsubscribe link in any marketing email or through your notification settings.</li>
          <li style={li}><strong style={{ color: T.text }}>Complete withdrawal:</strong> You may withdraw all consent by deleting your account, which will trigger the deletion of all Personal Data in accordance with our <Link to="/legal/data-processing" style={{ color: T.accent }}>Data Processing Agreement</Link>.</li>
        </ul>
        <p style={p}>
          AIM will process your consent withdrawal without undue delay, and in any event within seven (7) business days of receiving your request.
        </p>

        {/* ── 4. EXERCISING YOUR RIGHTS ── */}
        <h2 style={h2}>4. How to Exercise Your Rights</h2>

        <h3 style={h3}>4.1 Submitting a Request</h3>
        <p style={p}>
          You may exercise any of the rights described in Section 3 by contacting us through the following channels:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Email:</strong> <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a></li>
          <li style={li}><strong style={{ color: T.text }}>In-Platform:</strong> Through the privacy and data management tools in your account settings.</li>
          <li style={li}><strong style={{ color: T.text }}>Mail:</strong> AIM Performance Intelligence, Inc., Attn: Privacy Team, San Francisco, California, United States.</li>
        </ul>
        <p style={p}>
          When submitting a request, please include sufficient information to allow us to identify you and understand the nature of your request, including:
        </p>
        <ul style={ul}>
          <li style={li}>Your full name and the email address associated with your AIM account.</li>
          <li style={li}>A clear description of the right you wish to exercise.</li>
          <li style={li}>Any specific data or processing activities your request relates to.</li>
          <li style={li}>Your preferred method of response (email, secure download link, etc.).</li>
        </ul>

        <h3 style={h3}>4.2 Identity Verification</h3>
        <p style={p}>
          To protect your privacy and ensure that your Personal Data is not disclosed to unauthorized persons, AIM will verify your identity before processing any Data Subject rights request. Verification measures may include:
        </p>
        <ul style={ul}>
          <li style={li}>Confirming your identity through the email address associated with your AIM account.</li>
          <li style={li}>Requesting additional identifying information if we are unable to verify your identity through your email alone.</li>
          <li style={li}>In-platform authentication (where you submit requests while logged into your account).</li>
        </ul>
        <p style={p}>
          AIM will not request more information than is necessary for verification purposes and will process the verification using a secure, confidential process.
        </p>

        <h3 style={h3}>4.3 Response Timeline</h3>
        <p style={p}>
          AIM will respond to your Data Subject rights request without undue delay and in any event within thirty (30) days of receiving the request. If the request is particularly complex or if we have received a large number of requests, AIM may extend the response period by a further two (2) months, in accordance with Article 12(3) of the GDPR. In such cases, AIM will inform you of the extension within the initial thirty-day period, together with the reasons for the delay.
        </p>

        <h3 style={h3}>4.4 Fees</h3>
        <p style={p}>
          AIM will process your rights requests free of charge. However, where requests are manifestly unfounded or excessive, in particular because of their repetitive character, AIM may either charge a reasonable fee taking into account the administrative costs of providing the information or communication or taking the action requested, or refuse to act on the request, in accordance with Article 12(5) of the GDPR.
        </p>

        <h3 style={h3}>4.5 Authorized Agents</h3>
        <p style={p}>
          You may designate an authorized agent to submit a Data Subject rights request on your behalf. AIM will require written proof of the agent's authorization (such as a signed power of attorney or a written declaration from you) and may independently verify your identity before processing the request.
        </p>

        {/* ── 5. DATA PROTECTION OFFICER ── */}
        <h2 style={h2}>5. Data Protection Officer</h2>
        <p style={p}>
          AIM has appointed a Data Protection Officer (DPO) to oversee compliance with the GDPR, UK GDPR, and other applicable data protection legislation. The DPO is responsible for:
        </p>
        <ul style={ul}>
          <li style={li}>Informing and advising AIM and its employees about their obligations under data protection legislation.</li>
          <li style={li}>Monitoring compliance with the GDPR, UK GDPR, and AIM's internal data protection policies.</li>
          <li style={li}>Providing advice on Data Protection Impact Assessments (DPIAs) and monitoring their performance.</li>
          <li style={li}>Cooperating with supervisory authorities and acting as the contact point for supervisory authorities on issues relating to processing.</li>
          <li style={li}>Serving as the primary contact for Data Subjects regarding all matters related to the processing of their Personal Data and the exercise of their rights.</li>
        </ul>
        <p style={p}>
          You may contact our Data Protection Officer at any time regarding questions, concerns, or requests related to data protection:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Email:</strong> <a href="mailto:dpo@aim.ai" style={{ color: T.accent }}>dpo@aim.ai</a></li>
          <li style={li}><strong style={{ color: T.text }}>Mail:</strong> Data Protection Officer, AIM Performance Intelligence, Inc., San Francisco, California, United States</li>
        </ul>

        {/* ── 6. EU REPRESENTATIVE ── */}
        <h2 style={h2}>6. EU Representative</h2>
        <p style={p}>
          As AIM is established outside the European Union and processes Personal Data of Data Subjects within the EU, AIM has appointed an EU Representative in accordance with Article 27 of the GDPR. The EU Representative serves as a point of contact for Data Subjects and supervisory authorities within the EU.
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>EU Representative:</strong> To be appointed prior to commercial launch in the EU</li>
          <li style={li}><strong style={{ color: T.text }}>Address:</strong> To be confirmed</li>
          <li style={li}><strong style={{ color: T.text }}>Email:</strong> privacy@aim.ai (interim contact)</li>
        </ul>
        <p style={p}>
          AIM has similarly appointed a UK Representative for the purposes of the UK GDPR:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>UK Representative:</strong> To be appointed prior to commercial launch in the UK</li>
          <li style={li}><strong style={{ color: T.text }}>Address:</strong> To be confirmed</li>
          <li style={li}><strong style={{ color: T.text }}>Email:</strong> privacy@aim.ai (interim contact)</li>
        </ul>
        <p style={p}>
          You may contact the EU or UK Representative with respect to any matter related to the processing of your Personal Data under the GDPR or UK GDPR, including to exercise your Data Subject rights.
        </p>

        {/* ── 7. SUPERVISORY AUTHORITY ── */}
        <h2 style={h2}>7. Supervisory Authority</h2>
        <p style={p}>
          If you believe that AIM's processing of your Personal Data infringes the GDPR, the UK GDPR, or any other applicable data protection legislation, you have the right to lodge a complaint with a supervisory authority, in particular in the EU Member State of your habitual residence, place of work, or place of the alleged infringement, in accordance with Article 77 of the GDPR.
        </p>
        <p style={p}>
          We encourage you to contact us first at <a href="mailto:dpo@aim.ai" style={{ color: T.accent }}>dpo@aim.ai</a> so that we can attempt to address your concerns directly. However, this does not prejudice your right to lodge a complaint with a supervisory authority at any time.
        </p>
        <p style={p}>
          Relevant supervisory authorities include, but are not limited to:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Ireland:</strong> Data Protection Commission (DPC) -- <a href="https://www.dataprotection.ie" style={{ color: T.accent }} target="_blank" rel="noopener noreferrer">www.dataprotection.ie</a></li>
          <li style={li}><strong style={{ color: T.text }}>United Kingdom:</strong> Information Commissioner's Office (ICO) -- <a href="https://ico.org.uk" style={{ color: T.accent }} target="_blank" rel="noopener noreferrer">ico.org.uk</a></li>
          <li style={li}><strong style={{ color: T.text }}>Germany:</strong> Federal Commissioner for Data Protection and Freedom of Information (BfDI)</li>
          <li style={li}><strong style={{ color: T.text }}>France:</strong> Commission Nationale de l'Informatique et des Libertes (CNIL)</li>
          <li style={li}><strong style={{ color: T.text }}>Netherlands:</strong> Autoriteit Persoonsgegevens (AP)</li>
        </ul>
        <p style={p}>
          A full list of EEA supervisory authorities is available on the European Data Protection Board (EDPB) website at <a href="https://edpb.europa.eu" style={{ color: T.accent }} target="_blank" rel="noopener noreferrer">edpb.europa.eu</a>.
        </p>

        {/* ── 8. DPIAs ── */}
        <h2 style={h2}>8. Data Protection Impact Assessments</h2>
        <p style={p}>
          In accordance with Article 35 of the GDPR, AIM conducts Data Protection Impact Assessments (DPIAs) for processing activities that are likely to result in a high risk to the rights and freedoms of natural persons. Given that AIM processes health data at scale using AI and automated processing techniques, DPIAs are a core component of our data protection compliance program.
        </p>

        <h3 style={h3}>8.1 When DPIAs Are Conducted</h3>
        <p style={p}>AIM conducts DPIAs in the following circumstances:</p>
        <ul style={ul}>
          <li style={li}>Before introducing any new processing activity involving Special Category Data (health and fitness data).</li>
          <li style={li}>Before implementing new AI or machine learning models that process Personal Data, including evaluating the logic, significance, and potential consequences of automated processing.</li>
          <li style={li}>When introducing new third-party integrations or Sub-Processors that will have access to Personal Data.</li>
          <li style={li}>When significantly changing existing processing activities, data flows, or security architectures.</li>
          <li style={li}>When processing Personal Data on a large scale, or when using new technologies that may present novel data protection risks.</li>
          <li style={li}>Periodically for existing high-risk processing activities, to ensure continued compliance and to incorporate any changes in regulatory guidance or best practices.</li>
        </ul>

        <h3 style={h3}>8.2 DPIA Methodology</h3>
        <p style={p}>Each DPIA conducted by AIM includes:</p>
        <ul style={ul}>
          <li style={li}>A systematic description of the envisaged processing operations and the purposes of the processing, including, where applicable, the legitimate interest pursued.</li>
          <li style={li}>An assessment of the necessity and proportionality of the processing operations in relation to the purposes.</li>
          <li style={li}>An assessment of the risks to the rights and freedoms of Data Subjects, including consideration of the nature, scope, context, and purposes of the processing.</li>
          <li style={li}>The measures envisaged to address the risks, including safeguards, security measures, and mechanisms to ensure the protection of Personal Data and to demonstrate compliance.</li>
          <li style={li}>Consultation with the Data Protection Officer throughout the DPIA process.</li>
        </ul>

        <h3 style={h3}>8.3 Prior Consultation</h3>
        <p style={p}>
          Where a DPIA indicates that processing would result in a high risk in the absence of measures taken by AIM to mitigate the risk, AIM shall consult with the relevant supervisory authority prior to processing, in accordance with Article 36 of the GDPR.
        </p>

        {/* ── 9. PRIVACY BY DESIGN & DEFAULT ── */}
        <h2 style={h2}>9. Privacy by Design and Default</h2>
        <p style={p}>
          In accordance with Article 25 of the GDPR, AIM implements data protection by design and by default throughout the development and operation of the platform. This means that data protection considerations are integrated into every stage of the product lifecycle, from initial concept and design through development, deployment, and ongoing operation.
        </p>

        <h3 style={h3}>9.1 Privacy by Design</h3>
        <p style={p}>AIM's approach to privacy by design includes:</p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Data Minimization:</strong> We collect and process only the Personal Data that is necessary and relevant for the specific purposes described in our Privacy Policy and this page. We do not collect data "just in case" or for undefined future purposes.</li>
          <li style={li}><strong style={{ color: T.text }}>Purpose Limitation:</strong> Personal Data is collected for specified, explicit, and legitimate purposes and is not further processed in a manner that is incompatible with those purposes.</li>
          <li style={li}><strong style={{ color: T.text }}>Pseudonymization and Anonymization:</strong> Where possible, we use pseudonymization and anonymization techniques to reduce the identifiability of data used for analytics, research, and AI model development.</li>
          <li style={li}><strong style={{ color: T.text }}>Security-First Architecture:</strong> Data protection and security are foundational requirements in our system architecture, not afterthoughts. Encryption, access controls, and audit logging are built into the core infrastructure.</li>
          <li style={li}><strong style={{ color: T.text }}>Transparent Data Flows:</strong> We maintain clear documentation of all data flows, processing activities, and data sharing arrangements, enabling ongoing compliance monitoring and facilitating Data Subject access requests.</li>
          <li style={li}><strong style={{ color: T.text }}>Secure Development Practices:</strong> Our engineering team follows secure software development lifecycle (SSDLC) practices, including threat modeling, secure code review, static and dynamic analysis, and regular security testing.</li>
        </ul>

        <h3 style={h3}>9.2 Privacy by Default</h3>
        <p style={p}>AIM's approach to privacy by default includes:</p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Default Privacy Settings:</strong> AIM's default settings are configured to provide the highest level of privacy protection. Users must affirmatively opt in to any data sharing, third-party integrations, or optional processing activities.</li>
          <li style={li}><strong style={{ color: T.text }}>Minimal Data Exposure:</strong> By default, only the minimum amount of Personal Data necessary for the Service is processed. Additional data processing (such as connecting new data sources or enabling optional analytics features) requires explicit User action.</li>
          <li style={li}><strong style={{ color: T.text }}>No Public Profiles:</strong> User profiles and data are private by default. AIM does not make any Personal Data publicly accessible without explicit User consent.</li>
          <li style={li}><strong style={{ color: T.text }}>Automatic Data Retention Limits:</strong> AIM applies defined retention periods to all categories of Personal Data and automatically purges data that is no longer necessary for its stated purpose, unless retention is required by law.</li>
          <li style={li}><strong style={{ color: T.text }}>Granular Consent Controls:</strong> Users have granular control over which data sources are connected, which categories of data are processed, and which features are enabled, allowing them to tailor data processing to their preferences.</li>
        </ul>

        {/* ── 10. CROSS-BORDER TRANSFERS ── */}
        <h2 style={h2}>10. Cross-Border Data Transfers and Safeguards</h2>
        <p style={p}>
          AIM is a Delaware C-corporation headquartered in San Francisco, California, United States. As a platform serving a global user base, Personal Data collected from Users in the European Economic Area (EEA), the United Kingdom, and Switzerland is transferred to, and processed in, the United States. AIM recognizes that such transfers require appropriate safeguards to ensure that your Personal Data remains protected in accordance with the GDPR and UK GDPR.
        </p>

        <h3 style={h3}>10.1 Transfer Mechanisms</h3>
        <p style={p}>AIM relies on the following lawful mechanisms for international data transfers:</p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>EU-U.S. Data Privacy Framework (DPF):</strong> AIM participates in and has certified its compliance with the EU-U.S. Data Privacy Framework, the UK Extension to the EU-U.S. DPF, and the Swiss-U.S. DPF. AIM commits to the DPF Principles of notice, choice, accountability for onward transfer, security, data integrity and purpose limitation, access, and recourse, enforcement, and liability.</li>
          <li style={li}><strong style={{ color: T.text }}>Standard Contractual Clauses (SCCs):</strong> Where the DPF does not apply or as a supplementary safeguard, AIM enters into the European Commission's Standard Contractual Clauses (Decision (EU) 2021/914) with data importers and Sub-Processors. For UK transfers, AIM uses the UK Addendum (International Data Transfer Addendum) to the EU SCCs issued by the UK Information Commissioner.</li>
          <li style={li}><strong style={{ color: T.text }}>Adequacy Decisions:</strong> Where applicable, AIM may transfer data to countries that have received an adequacy decision from the European Commission or the UK Secretary of State, recognizing that the country provides an adequate level of data protection.</li>
        </ul>

        <h3 style={h3}>10.2 Transfer Impact Assessments</h3>
        <p style={p}>
          In accordance with the guidance of the European Data Protection Board (EDPB) and the Schrems II decision of the Court of Justice of the European Union, AIM conducts Transfer Impact Assessments (TIAs) for all international data transfers to evaluate:
        </p>
        <ul style={ul}>
          <li style={li}>The legal framework and government access practices of the destination country.</li>
          <li style={li}>The specific circumstances of the transfer, including the nature of the data, the transfer mechanism used, and the contractual and technical safeguards in place.</li>
          <li style={li}>Whether supplementary measures are necessary to ensure an essentially equivalent level of protection.</li>
        </ul>

        <h3 style={h3}>10.3 Supplementary Safeguards</h3>
        <p style={p}>AIM implements the following supplementary safeguards for international data transfers:</p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Technical Measures:</strong> End-to-end encryption of data in transit (TLS 1.3) and at rest (AES-256), pseudonymization of data where feasible, strict access controls, and secure key management with keys stored separately from the data.</li>
          <li style={li}><strong style={{ color: T.text }}>Organizational Measures:</strong> Internal data protection policies, mandatory employee training, confidentiality agreements, regular compliance audits, and appointment of a dedicated Data Protection Officer.</li>
          <li style={li}><strong style={{ color: T.text }}>Contractual Measures:</strong> Binding obligations on Sub-Processors to implement equivalent safeguards, contractual commitments to challenge disproportionate or unlawful government access requests, and transparency reporting on government data requests received.</li>
        </ul>

        <h3 style={h3}>10.4 Government Access Requests</h3>
        <p style={p}>
          AIM is committed to transparency regarding government access to User data. AIM will:
        </p>
        <ul style={ul}>
          <li style={li}>Carefully review all government data access requests for legal validity and scope.</li>
          <li style={li}>Challenge requests that are overbroad, disproportionate, or otherwise inconsistent with applicable law, including requests that conflict with GDPR protections.</li>
          <li style={li}>Notify affected Users of government access requests to the extent permitted by law.</li>
          <li style={li}>Provide only the minimum amount of data necessary to comply with legally valid requests.</li>
          <li style={li}>Publish a transparency report detailing the number and nature of government requests received, to the extent permitted by law.</li>
        </ul>

        {/* ── CONTACT & FOOTER ── */}
        <h2 style={h2}>Questions and Contact</h2>
        <p style={p}>
          If you have any questions about your rights under the GDPR, how AIM processes your data, or if you wish to exercise any of the rights described on this page, please contact us:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Privacy Team:</strong> <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a></li>
          <li style={li}><strong style={{ color: T.text }}>Data Protection Officer:</strong> <a href="mailto:dpo@aim.ai" style={{ color: T.accent }}>dpo@aim.ai</a></li>
          <li style={li}><strong style={{ color: T.text }}>Mailing Address:</strong> AIM Performance Intelligence, Inc., San Francisco, California, United States</li>
        </ul>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.7 }}>
            This page is provided for informational purposes and does not constitute legal advice. AIM's data protection practices are governed by our{" "}
            <Link to="/legal/privacy" style={{ color: T.accent }}>Privacy Policy</Link>,{" "}
            <Link to="/legal/terms" style={{ color: T.accent }}>Terms of Service</Link>, and{" "}
            <Link to="/legal/data-processing" style={{ color: T.accent }}>Data Processing Agreement</Link>.
            For CCPA-specific disclosures, please see our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
