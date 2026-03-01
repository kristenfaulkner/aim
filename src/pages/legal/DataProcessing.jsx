import { Link } from "react-router-dom";
import { T, font } from "../../theme/tokens";

const h2 = { fontSize: 22, fontWeight: 700, marginTop: 48, marginBottom: 16, letterSpacing: "-0.02em" };
const h3 = { fontSize: 17, fontWeight: 600, marginTop: 32, marginBottom: 12 };
const p = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 16 };
const ul = { paddingLeft: 24, marginBottom: 16 };
const li = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 8 };

export default function DataProcessing() {
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
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Data Processing Agreement</h1>
        <p style={{ color: T.textDim, fontSize: 14, marginBottom: 48 }}>Last updated: March 1, 2026</p>

        <p style={p}>
          This Data Processing Agreement ("DPA") forms part of the Terms of Service between AIM Performance Intelligence, Inc. ("AIM," "we," "us," or "our"), a Delaware C-corporation headquartered in San Francisco, California, and the individual or entity using our services ("you," "your," or "User"). This DPA sets forth the terms and conditions under which AIM processes Personal Data on behalf of or in connection with the User's use of the AIM performance intelligence platform (the "Service").
        </p>
        <p style={p}>
          This DPA is entered into in accordance with, and supplements, the AIM Terms of Service and Privacy Policy. In the event of any conflict between this DPA and the Terms of Service, the provisions of this DPA shall prevail with respect to data processing matters.
        </p>

        {/* ── 1. DEFINITIONS ── */}
        <h2 style={h2}>1. Definitions</h2>
        <p style={p}>For the purposes of this DPA, the following terms shall have the meanings set out below. Capitalized terms not defined herein shall have the meanings given to them in the Terms of Service or applicable Data Protection Laws.</p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>"Controller"</strong> means the natural or legal person, public authority, agency, or other body which, alone or jointly with others, determines the purposes and means of the processing of Personal Data. In the context of this DPA, the User acts as a Controller with respect to their own Personal Data, and AIM acts as a Controller for certain processing activities described in Section 3.</li>
          <li style={li}><strong style={{ color: T.text }}>"Processor"</strong> means a natural or legal person, public authority, agency, or other body which processes Personal Data on behalf of the Controller. AIM acts as a Processor when processing Personal Data on behalf of the User to provide the Service.</li>
          <li style={li}><strong style={{ color: T.text }}>"Data Subject"</strong> means an identified or identifiable natural person to whom Personal Data relates. In the context of the Service, the Data Subject is the User whose health, fitness, and performance data is processed.</li>
          <li style={li}><strong style={{ color: T.text }}>"Personal Data"</strong> means any information relating to an identified or identifiable natural person, as defined under Article 4(1) of the GDPR, the UK GDPR, the California Consumer Privacy Act (CCPA), and other applicable data protection legislation.</li>
          <li style={li}><strong style={{ color: T.text }}>"Special Category Data"</strong> means Personal Data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, data concerning health, or data concerning a natural person's sex life or sexual orientation, as defined under Article 9 of the GDPR. Health and fitness data processed by AIM constitutes Special Category Data.</li>
          <li style={li}><strong style={{ color: T.text }}>"Processing"</strong> means any operation or set of operations which is performed on Personal Data or on sets of Personal Data, whether or not by automated means, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure, or destruction.</li>
          <li style={li}><strong style={{ color: T.text }}>"Sub-Processor"</strong> means any third-party Processor engaged by AIM to process Personal Data on behalf of the User in connection with the provision of the Service.</li>
          <li style={li}><strong style={{ color: T.text }}>"Data Protection Laws"</strong> means all applicable data protection and privacy legislation, including but not limited to the EU General Data Protection Regulation (Regulation (EU) 2016/679) ("GDPR"), the UK General Data Protection Regulation ("UK GDPR"), the Data Protection Act 2018, the California Consumer Privacy Act as amended by the California Privacy Rights Act ("CCPA/CPRA"), and any other applicable national or state data protection laws.</li>
          <li style={li}><strong style={{ color: T.text }}>"Standard Contractual Clauses" (SCCs)</strong> means the standard contractual clauses for the transfer of Personal Data to third countries adopted by the European Commission pursuant to Decision (EU) 2021/914, as may be amended or replaced from time to time.</li>
          <li style={li}><strong style={{ color: T.text }}>"Data Breach"</strong> means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, Personal Data transmitted, stored, or otherwise processed.</li>
        </ul>

        {/* ── 2. SCOPE & PURPOSE ── */}
        <h2 style={h2}>2. Scope and Purpose of Processing</h2>
        <p style={p}>
          AIM is an AI-powered performance intelligence platform designed for endurance athletes. The Service integrates with third-party health and fitness platforms, collects and analyzes physiological data, and delivers personalized insights, recommendations, and performance analytics to Users.
        </p>
        <p style={p}>
          The purpose of processing Personal Data under this DPA is to:
        </p>
        <ul style={ul}>
          <li style={li}>Provide the core Service functionality, including the collection, aggregation, analysis, and display of health and fitness data from connected third-party platforms (e.g., Garmin, Strava, Whoop, Apple Health, blood testing laboratories).</li>
          <li style={li}>Perform AI-driven analysis of physiological metrics to generate personalized performance insights, training recommendations, recovery assessments, and health trend analysis.</li>
          <li style={li}>Store and maintain User data securely to enable longitudinal tracking of performance metrics, health biomarkers, and fitness progression over time.</li>
          <li style={li}>Facilitate data export and portability in machine-readable formats in compliance with GDPR Article 20.</li>
          <li style={li}>Process payments and manage subscription services.</li>
          <li style={li}>Communicate with Users regarding service updates, feature releases, and account-related matters.</li>
          <li style={li}>Comply with legal obligations, enforce our Terms of Service, and protect the rights, property, or safety of AIM and its Users.</li>
        </ul>
        <p style={p}>
          AIM shall not process Personal Data for any purpose other than those specified in this DPA, the Terms of Service, and the Privacy Policy, unless required to do so by applicable law. In such a case, AIM shall inform the User of that legal requirement before processing, unless prohibited by law from doing so on important grounds of public interest.
        </p>

        {/* ── 3. CONTROLLER & PROCESSOR ROLES ── */}
        <h2 style={h2}>3. Data Controller and Processor Roles</h2>
        <p style={p}>
          The allocation of Controller and Processor roles under this DPA reflects the operational reality of the Service:
        </p>

        <h3 style={h3}>3.1 AIM as Processor</h3>
        <p style={p}>
          When AIM processes Personal Data solely on behalf of and under the instructions of the User to provide the Service, AIM acts as a Data Processor. This includes:
        </p>
        <ul style={ul}>
          <li style={li}>Receiving and storing health and fitness data from third-party integrations initiated and authorized by the User.</li>
          <li style={li}>Performing AI-powered analysis on User data to generate personalized insights and recommendations as part of the contracted Service.</li>
          <li style={li}>Displaying, exporting, and transmitting User data at the User's direction.</li>
          <li style={li}>Maintaining and securing stored User data throughout the period of service provision.</li>
        </ul>

        <h3 style={h3}>3.2 AIM as Controller</h3>
        <p style={p}>
          AIM acts as an independent Data Controller for certain processing activities where AIM determines the purposes and means of processing. This includes:
        </p>
        <ul style={ul}>
          <li style={li}>Account administration, authentication, and identity verification.</li>
          <li style={li}>Payment processing, billing, invoicing, and fraud prevention.</li>
          <li style={li}>Service improvement and development through aggregated and anonymized analytics (where data has been irreversibly anonymized such that it no longer constitutes Personal Data).</li>
          <li style={li}>Compliance with legal and regulatory obligations.</li>
          <li style={li}>Communication of service-related notices, security alerts, and administrative messages.</li>
          <li style={li}>Enforcement of Terms of Service and protection of AIM's legal rights.</li>
        </ul>

        <h3 style={h3}>3.3 User as Data Subject</h3>
        <p style={p}>
          The User is the Data Subject whose Personal Data is processed under this DPA. Users provide their data directly to AIM and authorize the collection of additional data through third-party integrations. Users retain all rights afforded to Data Subjects under applicable Data Protection Laws, as described in our <Link to="/legal/gdpr" style={{ color: T.accent }}>GDPR Rights &amp; Compliance</Link> page.
        </p>

        {/* ── 4. CATEGORIES OF DATA ── */}
        <h2 style={h2}>4. Categories of Data Processed</h2>
        <p style={p}>
          AIM processes the following categories of Personal Data in connection with the provision of the Service:
        </p>

        <h3 style={h3}>4.1 Identity Data</h3>
        <ul style={ul}>
          <li style={li}>Full name, display name, username, and profile photograph.</li>
          <li style={li}>Date of birth, age, biological sex, and gender identity (where voluntarily provided).</li>
          <li style={li}>Account credentials (passwords are stored only in irreversibly hashed form).</li>
        </ul>

        <h3 style={h3}>4.2 Contact Data</h3>
        <ul style={ul}>
          <li style={li}>Email address (primary and secondary).</li>
          <li style={li}>Phone number (where provided for account security or communication preferences).</li>
          <li style={li}>Mailing address (where provided for billing or regulatory purposes).</li>
        </ul>

        <h3 style={h3}>4.3 Health and Fitness Metrics (Special Category Data)</h3>
        <ul style={ul}>
          <li style={li}>Heart rate data (resting, active, maximum, heart rate variability, recovery metrics).</li>
          <li style={li}>Training and workout data (activity type, duration, distance, pace, power output, cadence, elevation, training load, training stress scores).</li>
          <li style={li}>VO2 max estimates, lactate threshold estimates, and aerobic/anaerobic capacity metrics.</li>
          <li style={li}>Recovery scores, strain scores, and readiness metrics from wearable devices.</li>
          <li style={li}>GPS and route data associated with outdoor activities.</li>
        </ul>

        <h3 style={h3}>4.4 Blood Work and Biomarker Data (Special Category Data)</h3>
        <ul style={ul}>
          <li style={li}>Complete blood count (CBC), metabolic panels, lipid panels, and thyroid function tests.</li>
          <li style={li}>Hormone levels (testosterone, cortisol, estrogen, progesterone, DHEA-S, IGF-1).</li>
          <li style={li}>Vitamin and mineral levels (Vitamin D, B12, iron/ferritin, magnesium, zinc).</li>
          <li style={li}>Inflammatory markers (CRP, ESR, homocysteine).</li>
          <li style={li}>Metabolic markers (fasting glucose, HbA1c, insulin).</li>
          <li style={li}>Any other blood panel results voluntarily uploaded or connected by the User.</li>
        </ul>

        <h3 style={h3}>4.5 Body Composition Data (Special Category Data)</h3>
        <ul style={ul}>
          <li style={li}>Height, weight, and body mass index (BMI).</li>
          <li style={li}>Body fat percentage, lean muscle mass, bone density, and visceral fat estimates.</li>
          <li style={li}>DEXA scan results and other body composition assessments.</li>
        </ul>

        <h3 style={h3}>4.6 Sleep Data (Special Category Data)</h3>
        <ul style={ul}>
          <li style={li}>Sleep duration, sleep stages (light, deep, REM), sleep efficiency, and sleep latency.</li>
          <li style={li}>Respiratory rate during sleep, blood oxygen saturation (SpO2), and nocturnal heart rate variability.</li>
          <li style={li}>Sleep consistency scores and circadian rhythm data.</li>
        </ul>

        <h3 style={h3}>4.7 Payment and Transaction Data</h3>
        <ul style={ul}>
          <li style={li}>Payment card details (processed and stored exclusively by our PCI DSS-compliant payment processor; AIM does not store full card numbers).</li>
          <li style={li}>Billing address, transaction history, subscription plan details, and invoice records.</li>
        </ul>

        <h3 style={h3}>4.8 Technical and Usage Data</h3>
        <ul style={ul}>
          <li style={li}>IP address, device type, operating system, browser type, and version.</li>
          <li style={li}>Usage logs, feature interaction data, session duration, and referral sources.</li>
          <li style={li}>API integration connection status and synchronization logs.</li>
        </ul>

        {/* ── 5. PROCESSING ACTIVITIES ── */}
        <h2 style={h2}>5. Processing Activities</h2>
        <p style={p}>
          AIM undertakes the following processing activities in connection with the provision of the Service:
        </p>

        <h3 style={h3}>5.1 Collection via API Integrations</h3>
        <p style={p}>
          AIM collects Personal Data through authenticated API connections to third-party health and fitness platforms, initiated and authorized by the User through OAuth 2.0 or equivalent secure authorization protocols. Data is retrieved at regular intervals or on-demand at the User's request. AIM only accesses the data scopes explicitly authorized by the User during the connection process.
        </p>

        <h3 style={h3}>5.2 AI-Powered Analysis</h3>
        <p style={p}>
          AIM processes health, fitness, and biomarker data using proprietary artificial intelligence and machine learning models to generate personalized performance insights, trend analysis, anomaly detection, training recommendations, recovery assessments, and health optimization suggestions. AI analysis is performed on the User's individual data set and is designed to augment, not replace, professional medical or coaching advice.
        </p>
        <p style={p}>
          AIM's AI models may be trained on aggregated and anonymized data sets. Individual User data is never shared with third parties for model training purposes, and AIM maintains strict technical and organizational measures to prevent re-identification of anonymized data.
        </p>

        <h3 style={h3}>5.3 Secure Storage</h3>
        <p style={p}>
          Personal Data is stored on secure, encrypted infrastructure provided by our cloud hosting Sub-Processors. Data is encrypted at rest using AES-256 encryption and in transit using TLS 1.3. Access to stored data is governed by role-based access controls, multi-factor authentication, and the principle of least privilege.
        </p>

        <h3 style={h3}>5.4 Display and Visualization</h3>
        <p style={p}>
          AIM processes and displays Personal Data within the Service interface through dashboards, charts, reports, and AI-generated summaries, accessible only to the authenticated User.
        </p>

        <h3 style={h3}>5.5 Data Export and Portability</h3>
        <p style={p}>
          AIM enables Users to export their Personal Data in structured, commonly used, and machine-readable formats (including CSV and JSON) in compliance with the right to data portability under GDPR Article 20 and equivalent provisions of other applicable Data Protection Laws.
        </p>

        {/* ── 6. SUB-PROCESSORS ── */}
        <h2 style={h2}>6. Sub-Processors</h2>
        <p style={p}>
          The User provides general authorization for AIM to engage Sub-Processors to assist in providing the Service, subject to the requirements set out in this Section.
        </p>

        <h3 style={h3}>6.1 Categories of Sub-Processors</h3>
        <p style={p}>AIM engages Sub-Processors in the following categories:</p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Cloud Infrastructure and Hosting:</strong> Provision of secure, scalable cloud computing infrastructure for data storage, processing, and application hosting. Sub-Processors in this category maintain SOC 2 Type II certification and ISO 27001 compliance.</li>
          <li style={li}><strong style={{ color: T.text }}>Payment Processing:</strong> Secure processing of payment transactions, subscription management, and billing. Payment Sub-Processors are PCI DSS Level 1 certified and do not share payment card data with AIM.</li>
          <li style={li}><strong style={{ color: T.text }}>Analytics and Performance Monitoring:</strong> Collection and analysis of aggregated, anonymized usage data to monitor Service performance, identify errors, and improve the user experience. Analytics Sub-Processors process only pseudonymized or anonymized data where technically feasible.</li>
          <li style={li}><strong style={{ color: T.text }}>Email and Communication Services:</strong> Delivery of transactional emails (account verification, password resets, security alerts) and service communications. Communication Sub-Processors process only the minimum data necessary for message delivery.</li>
          <li style={li}><strong style={{ color: T.text }}>Customer Support Tools:</strong> Provision of customer support infrastructure, including ticketing systems and communication channels, to facilitate User support requests.</li>
        </ul>

        <h3 style={h3}>6.2 Sub-Processor Obligations</h3>
        <p style={p}>
          AIM imposes data protection obligations on each Sub-Processor through written agreements that require, at minimum:
        </p>
        <ul style={ul}>
          <li style={li}>Processing Personal Data only on documented instructions from AIM and solely for the purpose of providing the sub-processed service.</li>
          <li style={li}>Implementing appropriate technical and organizational security measures consistent with the requirements of this DPA.</li>
          <li style={li}>Ensuring that persons authorized to process Personal Data have committed to confidentiality obligations.</li>
          <li style={li}>Assisting AIM in responding to Data Subject rights requests and complying with obligations under Articles 32 through 36 of the GDPR.</li>
          <li style={li}>Deleting or returning all Personal Data upon termination of the sub-processing agreement, at AIM's election.</li>
          <li style={li}>Making available all information necessary to demonstrate compliance and allowing for audits.</li>
        </ul>

        <h3 style={h3}>6.3 Notification of Sub-Processor Changes</h3>
        <p style={p}>
          AIM shall provide Users with at least thirty (30) days' prior written notice before engaging any new Sub-Processor or replacing an existing Sub-Processor, by publishing updates to the Sub-Processor list on our website and, where applicable, by direct notification to Users. Users may object to the engagement of a new Sub-Processor on reasonable data protection grounds by contacting <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a> within fourteen (14) days of receiving notice. AIM will work in good faith to address any reasonable objections. If AIM is unable to address the objection to the User's reasonable satisfaction, the User may terminate the affected Service by providing written notice.
        </p>

        {/* ── 7. DATA SUBJECT RIGHTS ── */}
        <h2 style={h2}>7. Data Subject Rights</h2>
        <p style={p}>
          AIM is committed to facilitating the exercise of Data Subject rights under applicable Data Protection Laws. For a comprehensive overview of your rights, please see our <Link to="/legal/gdpr" style={{ color: T.accent }}>GDPR Rights &amp; Compliance</Link> page.
        </p>

        <h3 style={h3}>7.1 AIM's Obligations as Processor</h3>
        <p style={p}>
          Where AIM acts as a Processor, AIM shall:
        </p>
        <ul style={ul}>
          <li style={li}>Promptly notify the User if AIM receives a request from a Data Subject in relation to the processing of their Personal Data under this DPA.</li>
          <li style={li}>Provide reasonable assistance to the User in responding to Data Subject requests, taking into account the nature of the processing and the information available to AIM.</li>
          <li style={li}>Not respond directly to a Data Subject request without the User's prior authorization, except to direct the Data Subject to the User, unless legally required to do so.</li>
          <li style={li}>Implement and maintain technical capabilities to support the User in fulfilling Data Subject requests, including the ability to access, rectify, erase, restrict, and export Personal Data.</li>
        </ul>

        <h3 style={h3}>7.2 AIM's Obligations as Controller</h3>
        <p style={p}>
          Where AIM acts as a Controller, AIM shall directly handle Data Subject rights requests in accordance with applicable Data Protection Laws, including:
        </p>
        <ul style={ul}>
          <li style={li}>Responding to requests within thirty (30) days of receipt, with the possibility of extension by two further months where necessary, taking into account the complexity and number of requests.</li>
          <li style={li}>Providing information on actions taken in response to a request free of charge, unless requests are manifestly unfounded or excessive.</li>
          <li style={li}>Verifying the identity of the Data Subject before processing any rights request to protect against unauthorized access.</li>
        </ul>

        <h3 style={h3}>7.3 Self-Service Data Controls</h3>
        <p style={p}>
          AIM provides in-platform tools that enable Users to exercise certain rights directly, including the ability to view, download, correct, and delete their data, disconnect third-party integrations, and manage consent preferences through account settings.
        </p>

        {/* ── 8. SECURITY MEASURES ── */}
        <h2 style={h2}>8. Security Measures</h2>
        <p style={p}>
          AIM implements and maintains appropriate technical and organizational measures to ensure a level of security appropriate to the risk of processing, in accordance with Article 32 of the GDPR and industry best practices. These measures include, but are not limited to:
        </p>

        <h3 style={h3}>8.1 Encryption</h3>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>In Transit:</strong> All data transmitted between Users and AIM, and between AIM and its Sub-Processors, is encrypted using TLS 1.3 (Transport Layer Security). AIM enforces HTTPS across all endpoints and does not support deprecated encryption protocols.</li>
          <li style={li}><strong style={{ color: T.text }}>At Rest:</strong> All Personal Data stored within AIM's infrastructure is encrypted using AES-256 (Advanced Encryption Standard with 256-bit keys). Encryption keys are managed through a dedicated key management service with automatic key rotation.</li>
        </ul>

        <h3 style={h3}>8.2 Access Controls</h3>
        <ul style={ul}>
          <li style={li}>Role-based access control (RBAC) ensuring that AIM personnel access only the minimum data necessary for their specific role and responsibilities.</li>
          <li style={li}>Multi-factor authentication (MFA) required for all AIM personnel accessing systems that process Personal Data.</li>
          <li style={li}>Principle of least privilege applied to all system accounts, service accounts, and API keys.</li>
          <li style={li}>Regular access reviews conducted at least quarterly to verify that access privileges remain appropriate and that dormant accounts are deactivated.</li>
        </ul>

        <h3 style={h3}>8.3 Audit Logging</h3>
        <ul style={ul}>
          <li style={li}>Comprehensive audit logging of all access to, and modifications of, Personal Data, including the identity of the accessor, timestamp, action performed, and data affected.</li>
          <li style={li}>Audit logs are stored in a tamper-evident, append-only log store with a minimum retention period of twelve (12) months.</li>
          <li style={li}>Automated monitoring and alerting systems to detect anomalous access patterns and potential security incidents.</li>
        </ul>

        <h3 style={h3}>8.4 Infrastructure Security</h3>
        <ul style={ul}>
          <li style={li}>Network segmentation and firewalls to isolate processing environments and restrict unauthorized network access.</li>
          <li style={li}>Regular vulnerability scanning and penetration testing conducted by qualified independent third parties at least annually.</li>
          <li style={li}>Secure software development lifecycle (SSDLC) practices, including code reviews, static analysis, and dependency scanning.</li>
          <li style={li}>Disaster recovery and business continuity plans with regular testing.</li>
        </ul>

        <h3 style={h3}>8.5 Personnel Security</h3>
        <ul style={ul}>
          <li style={li}>Background checks conducted on all AIM personnel with access to Personal Data, in accordance with applicable law.</li>
          <li style={li}>Mandatory data protection and security awareness training for all personnel upon hire and at least annually thereafter.</li>
          <li style={li}>Confidentiality obligations binding all personnel with access to Personal Data.</li>
        </ul>

        <h3 style={h3}>8.6 Incident Response</h3>
        <ul style={ul}>
          <li style={li}>Documented incident response plan with defined roles, responsibilities, escalation procedures, and communication protocols.</li>
          <li style={li}>Dedicated incident response team available to respond to security incidents around the clock.</li>
          <li style={li}>Post-incident review process to identify root causes and implement corrective and preventive measures.</li>
        </ul>

        {/* ── 9. DATA BREACH NOTIFICATION ── */}
        <h2 style={h2}>9. Data Breach Notification</h2>

        <h3 style={h3}>9.1 Notification to Users</h3>
        <p style={p}>
          In the event of a Data Breach affecting Personal Data processed under this DPA, AIM shall notify the affected User without undue delay and in any event no later than seventy-two (72) hours after becoming aware of the breach, in accordance with Article 33 of the GDPR. Where the notification cannot be provided within 72 hours, AIM shall provide a reasoned justification for the delay.
        </p>

        <h3 style={h3}>9.2 Content of Notification</h3>
        <p style={p}>The breach notification shall include, at minimum:</p>
        <ul style={ul}>
          <li style={li}>A description of the nature of the Data Breach, including, where possible, the categories and approximate number of Data Subjects affected and the categories and approximate number of Personal Data records affected.</li>
          <li style={li}>The name and contact details of AIM's Data Protection Officer or other contact point where more information can be obtained.</li>
          <li style={li}>A description of the likely consequences of the Data Breach.</li>
          <li style={li}>A description of the measures taken or proposed to be taken by AIM to address the Data Breach, including, where appropriate, measures to mitigate its possible adverse effects.</li>
        </ul>

        <h3 style={h3}>9.3 Notification to Supervisory Authorities</h3>
        <p style={p}>
          Where AIM acts as a Controller, AIM shall notify the relevant supervisory authority of a Data Breach in accordance with Article 33 of the GDPR, unless the breach is unlikely to result in a risk to the rights and freedoms of natural persons. Where AIM acts as a Processor, AIM shall assist the User in meeting its own breach notification obligations.
        </p>

        <h3 style={h3}>9.4 Notification to Data Subjects</h3>
        <p style={p}>
          Where a Data Breach is likely to result in a high risk to the rights and freedoms of the affected Data Subjects, AIM shall, in accordance with Article 34 of the GDPR, communicate the breach to the affected Data Subjects without undue delay in clear and plain language, describing the nature of the breach and the steps they can take to protect themselves.
        </p>

        {/* ── 10. INTERNATIONAL TRANSFERS ── */}
        <h2 style={h2}>10. International Data Transfers</h2>
        <p style={p}>
          AIM is headquartered in the United States. As such, Personal Data collected from Users in the European Economic Area (EEA), the United Kingdom, and Switzerland may be transferred to, and processed in, the United States and other countries that may not provide an equivalent level of data protection.
        </p>

        <h3 style={h3}>10.1 EU-US Data Privacy Framework</h3>
        <p style={p}>
          AIM participates in and has certified its compliance with the EU-U.S. Data Privacy Framework (DPF), the UK Extension to the EU-U.S. DPF, and the Swiss-U.S. DPF, as administered by the U.S. Department of Commerce. AIM is committed to subjecting all Personal Data received from EEA member countries, the United Kingdom, and Switzerland in reliance on the DPF to the Framework's applicable Principles.
        </p>

        <h3 style={h3}>10.2 Standard Contractual Clauses</h3>
        <p style={p}>
          In addition to, or where the DPF is not applicable, AIM relies on the European Commission's Standard Contractual Clauses (SCCs) adopted pursuant to Commission Implementing Decision (EU) 2021/914, including the UK Addendum to the EU SCCs where applicable, as a lawful mechanism for the transfer of Personal Data from the EEA and the United Kingdom to the United States and other third countries. Copies of the executed SCCs are available upon request by contacting <a href="mailto:dpo@aim.ai" style={{ color: T.accent }}>dpo@aim.ai</a>.
        </p>

        <h3 style={h3}>10.3 Transfer Impact Assessments</h3>
        <p style={p}>
          AIM conducts transfer impact assessments for international data transfers to evaluate the legal framework and practices of the destination country, the specific circumstances of the transfer, and the supplementary measures implemented to ensure that the transferred data is afforded a level of protection essentially equivalent to that guaranteed within the EEA.
        </p>

        <h3 style={h3}>10.4 Supplementary Measures</h3>
        <p style={p}>
          Where necessary, AIM implements supplementary technical, organizational, and contractual measures to ensure the effective protection of transferred Personal Data, including strong encryption, pseudonymization, access controls, and contractual commitments regarding government access requests.
        </p>

        {/* ── 11. DATA RETENTION & DELETION ── */}
        <h2 style={h2}>11. Data Retention and Deletion</h2>

        <h3 style={h3}>11.1 Retention Periods</h3>
        <p style={p}>
          AIM retains Personal Data only for as long as necessary to fulfill the purposes for which it was collected and processed, as described in this DPA and the Privacy Policy, or as required by applicable law. Specific retention periods include:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Account and Profile Data:</strong> Retained for the duration of the User's active account and for a period of thirty (30) days following account deletion to allow for account recovery.</li>
          <li style={li}><strong style={{ color: T.text }}>Health and Fitness Data:</strong> Retained for the duration of the User's active account. Upon account deletion, health and fitness data is permanently deleted within thirty (30) days, subject to any legal retention obligations.</li>
          <li style={li}><strong style={{ color: T.text }}>Payment and Transaction Records:</strong> Retained for a minimum of seven (7) years following the transaction date, as required by applicable tax and financial regulations.</li>
          <li style={li}><strong style={{ color: T.text }}>Audit Logs:</strong> Retained for a minimum of twelve (12) months for security and compliance purposes.</li>
          <li style={li}><strong style={{ color: T.text }}>Anonymized and Aggregated Data:</strong> May be retained indefinitely, as such data does not constitute Personal Data.</li>
        </ul>

        <h3 style={h3}>11.2 Deletion Procedures</h3>
        <p style={p}>
          Upon termination of the Service or upon receipt of a valid deletion request from a User, AIM shall:
        </p>
        <ul style={ul}>
          <li style={li}>Delete or irreversibly anonymize all Personal Data within thirty (30) days, unless retention is required by applicable law or regulation.</li>
          <li style={li}>Instruct all Sub-Processors to delete or return the User's Personal Data in their possession within the same timeframe.</li>
          <li style={li}>Provide written confirmation of deletion upon request.</li>
          <li style={li}>Ensure that data in backup systems is deleted or overwritten in accordance with AIM's backup rotation schedule, which does not exceed ninety (90) days.</li>
        </ul>

        <h3 style={h3}>11.3 Data Portability Before Deletion</h3>
        <p style={p}>
          AIM encourages Users to export their data before requesting account deletion. AIM provides self-service data export tools within the platform, enabling Users to download their complete data set in structured, commonly used, and machine-readable formats prior to deletion.
        </p>

        {/* ── 12. AUDIT RIGHTS ── */}
        <h2 style={h2}>12. Audit Rights</h2>

        <h3 style={h3}>12.1 AIM's Audit Obligations</h3>
        <p style={p}>
          AIM shall make available to the User all information necessary to demonstrate compliance with the obligations set out in this DPA and applicable Data Protection Laws, and shall allow for and contribute to audits, including inspections, conducted by the User or an auditor mandated by the User, in accordance with Article 28(3)(h) of the GDPR.
        </p>

        <h3 style={h3}>12.2 Audit Procedures</h3>
        <ul style={ul}>
          <li style={li}>The User shall provide AIM with at least thirty (30) days' prior written notice of any audit or inspection request.</li>
          <li style={li}>Audits shall be conducted during normal business hours, with due regard for AIM's operational requirements and the confidentiality of other Users' data.</li>
          <li style={li}>The User shall bear the costs of any audit it initiates, unless the audit reveals a material breach of this DPA by AIM, in which case AIM shall bear the reasonable costs of the audit.</li>
          <li style={li}>The User's auditor shall be bound by appropriate confidentiality obligations and shall not be a competitor of AIM.</li>
        </ul>

        <h3 style={h3}>12.3 Third-Party Certifications</h3>
        <p style={p}>
          AIM shall maintain current SOC 2 Type II certification and shall make audit reports available to the User upon request, subject to confidentiality obligations. Where such reports address the User's audit concerns, AIM may propose the use of these reports as an alternative to a direct audit, provided that the User retains the right to conduct a direct audit where the third-party reports are insufficient.
        </p>

        {/* ── 13. TERM & TERMINATION ── */}
        <h2 style={h2}>13. Term and Termination</h2>

        <h3 style={h3}>13.1 Term</h3>
        <p style={p}>
          This DPA shall become effective on the date the User accepts the Terms of Service or begins using the Service, whichever is earlier, and shall remain in effect for as long as AIM processes Personal Data on behalf of or in connection with the User's use of the Service.
        </p>

        <h3 style={h3}>13.2 Termination</h3>
        <p style={p}>
          This DPA shall automatically terminate upon the termination or expiration of the User's use of the Service, subject to AIM's obligations regarding data retention and deletion as set out in Section 11 of this DPA.
        </p>

        <h3 style={h3}>13.3 Effects of Termination</h3>
        <p style={p}>Upon termination of this DPA, AIM shall:</p>
        <ul style={ul}>
          <li style={li}>Cease all processing of Personal Data on behalf of the User, except as necessary to comply with applicable law.</li>
          <li style={li}>Delete or return all Personal Data to the User in accordance with Section 11, at the User's election, unless applicable law requires continued storage.</li>
          <li style={li}>Provide the User with a reasonable opportunity to export their data before deletion, in accordance with Section 11.3.</li>
          <li style={li}>Certify in writing the deletion of all Personal Data upon completion, if requested by the User.</li>
        </ul>

        <h3 style={h3}>13.4 Survival</h3>
        <p style={p}>
          The provisions of this DPA that by their nature should survive termination, including but not limited to Sections 1, 8, 9, 10, 11, 12, and 14, shall survive the termination of this DPA and continue to apply for as long as AIM retains any Personal Data.
        </p>

        {/* ── 14. LIABILITY ── */}
        <h2 style={h2}>14. Liability</h2>

        <h3 style={h3}>14.1 Allocation of Liability</h3>
        <p style={p}>
          Each party shall be liable for damage caused by processing that infringes applicable Data Protection Laws, in accordance with the allocation of responsibility set out in the GDPR, UK GDPR, and other applicable legislation. Specifically:
        </p>
        <ul style={ul}>
          <li style={li}>Where AIM acts as a Controller, AIM shall be liable for damage caused by processing which infringes the applicable Data Protection Laws.</li>
          <li style={li}>Where AIM acts as a Processor, AIM shall be liable for damage caused by processing only where it has not complied with obligations specifically directed to Processors under the applicable Data Protection Laws, or where it has acted outside of or contrary to the lawful instructions of the User.</li>
        </ul>

        <h3 style={h3}>14.2 Indemnification</h3>
        <p style={p}>
          Each party shall indemnify the other party against all claims, damages, losses, costs, and expenses (including reasonable legal fees) arising from or in connection with any breach of this DPA by the indemnifying party, provided that the indemnified party provides prompt notice of the claim, reasonable cooperation in the defense, and sole control of the defense and settlement to the indemnifying party.
        </p>

        <h3 style={h3}>14.3 Limitation of Liability</h3>
        <p style={p}>
          The total aggregate liability of either party under or in connection with this DPA, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, shall be subject to the limitations of liability set out in the Terms of Service. Nothing in this DPA shall exclude or limit either party's liability for fraud, gross negligence, willful misconduct, death or personal injury caused by negligence, or any liability that cannot be excluded or limited by applicable law.
        </p>

        <h3 style={h3}>14.4 Data Subject Claims</h3>
        <p style={p}>
          Where a Data Subject exercises their right to compensation under Article 82 of the GDPR against AIM, AIM shall be entitled to recover from the User that part of the compensation corresponding to the User's share of responsibility for the damage, if any. Similarly, where a Data Subject exercises a claim against the User, the User shall be entitled to recover from AIM that part of the compensation corresponding to AIM's share of responsibility.
        </p>

        {/* ── CONTACT ── */}
        <h2 style={h2}>Contact Information</h2>
        <p style={p}>
          For questions, concerns, or requests regarding this Data Processing Agreement, please contact:
        </p>
        <ul style={ul}>
          <li style={li}><strong style={{ color: T.text }}>Privacy Team:</strong> <a href="mailto:privacy@aim.ai" style={{ color: T.accent }}>privacy@aim.ai</a></li>
          <li style={li}><strong style={{ color: T.text }}>Data Protection Officer:</strong> <a href="mailto:dpo@aim.ai" style={{ color: T.accent }}>dpo@aim.ai</a></li>
          <li style={li}><strong style={{ color: T.text }}>Mailing Address:</strong> AIM Performance Intelligence, Inc., San Francisco, California, United States</li>
        </ul>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.7 }}>
            This Data Processing Agreement is governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws principles, except to the extent that mandatory provisions of applicable Data Protection Laws require otherwise. See also our{" "}
            <Link to="/legal/privacy" style={{ color: T.accent }}>Privacy Policy</Link>,{" "}
            <Link to="/legal/terms" style={{ color: T.accent }}>Terms of Service</Link>, and{" "}
            <Link to="/legal/gdpr" style={{ color: T.accent }}>GDPR Rights &amp; Compliance</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
