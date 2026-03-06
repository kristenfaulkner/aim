import { Link } from "react-router-dom";
import { T, font } from "../../theme/tokens";
import SEO from "../../components/SEO";

const h2 = { fontSize: 22, fontWeight: 700, marginTop: 48, marginBottom: 16, color: T.text, letterSpacing: "-0.02em" };
const h3 = { fontSize: 17, fontWeight: 600, marginTop: 32, marginBottom: 12, color: T.text };
const p = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 16 };
const ul = { paddingLeft: 24, marginBottom: 16 };
const li = { fontSize: 15, color: T.textSoft, lineHeight: 1.8, marginBottom: 8 };
const bold = { fontWeight: 600, color: T.text };
const uppercase = { textTransform: "uppercase", fontWeight: 700, color: T.text };

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font }}>
      <SEO title="Terms of Service" path="/terms" description="AIM Terms of Service. Review the terms governing your use of the AIM performance intelligence platform." />
      <nav style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.text }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: T.bg }}>AI</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}><span style={{ background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>M</span>
        </Link>
        <Link to="/" style={{ color: T.textSoft, textDecoration: "none", fontSize: 14 }}>&#8592; Back to Home</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: T.textDim, fontSize: 14, marginBottom: 48 }}>Last updated: March 1, 2026</p>

        {/* ─── INTRODUCTION ─── */}
        <p style={p}>
          These Terms of Service (<span style={bold}>"Terms"</span>) constitute a legally binding agreement between you (<span style={bold}>"User," "you," or "your"</span>) and <span style={bold}>AIM Performance Intelligence, Inc.</span>, a Delaware C-corporation with its principal offices in San Francisco, California (<span style={bold}>"AIM," "Company," "we," "us," or "our"</span>). These Terms govern your access to and use of the AIM platform, including our website, mobile applications, APIs, AI-powered analytics engine, and all related services (collectively, the <span style={bold}>"Service"</span>).
        </p>
        <p style={p}>
          AIM is an AI-powered performance intelligence platform designed for endurance athletes. The Service aggregates data from third-party fitness devices, wearables, and health data sources, and applies proprietary artificial intelligence models to deliver performance, recovery, health, and training insights. The Service is founded by Kristen Faulkner, 2x Olympic Gold Medalist.
        </p>
        <p style={{ ...p, padding: "16px 20px", background: T.accentDim, borderRadius: 10, border: `1px solid ${T.accentMid}` }}>
          <span style={bold}>PLEASE READ THESE TERMS CAREFULLY.</span> By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link to="/privacy" style={{ color: T.accent }}>Privacy Policy</Link>, which is incorporated herein by reference. If you do not agree to these Terms, you must not access or use the Service.
        </p>
        <p style={{ ...p, padding: "16px 20px", background: "rgba(255,71,87,0.08)", borderRadius: 10, border: "1px solid rgba(255,71,87,0.2)", marginTop: 16 }}>
          <span style={{ ...bold, color: T.danger }}>IMPORTANT NOTICE REGARDING ARBITRATION:</span> These Terms contain a binding arbitration clause and a class action waiver in Section 14. By agreeing to these Terms, you agree that disputes between you and AIM will be resolved through binding individual arbitration, and you waive your right to participate in a class action lawsuit or class-wide arbitration, except as set forth in Section 14. You may opt out of the arbitration provision within thirty (30) days of first accepting these Terms by following the procedure described in Section 14.
        </p>

        {/* ─── 1. ACCEPTANCE OF TERMS ─── */}
        <h2 style={h2}>1. Acceptance of Terms</h2>
        <p style={p}>
          By accessing or using the Service in any manner, including but not limited to visiting or browsing the website, creating an account, subscribing to a plan, connecting a third-party data source, or using any feature of the platform, you expressly agree to be bound by these Terms and all applicable laws and regulations. These Terms apply to all visitors, users, and others who access or use the Service.
        </p>
        <p style={p}>
          If you are using the Service on behalf of an organization (such as a team, club, or employer), you represent and warrant that you have the authority to bind that organization to these Terms, and "you" and "your" shall refer to both you individually and such organization.
        </p>
        <p style={p}>
          Your continued use of the Service following any modifications to these Terms (as described in Section 16) constitutes your acceptance of the modified Terms.
        </p>

        {/* ─── 2. ELIGIBILITY ─── */}
        <h2 style={h2}>2. Eligibility</h2>
        <p style={p}>
          You must be at least sixteen (16) years of age to use the Service. If you are between the ages of 16 and 18 (or the age of legal majority in your jurisdiction), you may only use the Service with the consent and under the supervision of a parent or legal guardian who agrees to be bound by these Terms on your behalf.
        </p>
        <p style={p}>
          By using the Service, you represent and warrant that:
        </p>
        <ul style={ul}>
          <li style={li}>You are at least 16 years of age;</li>
          <li style={li}>If you are a minor in your jurisdiction, you have obtained verifiable consent from a parent or legal guardian;</li>
          <li style={li}>You have the legal capacity to enter into a binding agreement;</li>
          <li style={li}>You are not barred from using the Service under any applicable laws or regulations;</li>
          <li style={li}>Your use of the Service does not violate any applicable law or regulation in your jurisdiction;</li>
          <li style={li}>You have not previously been suspended or removed from the Service.</li>
        </ul>
        <p style={p}>
          We reserve the right to request proof of age or parental/guardian consent at any time and to suspend or terminate accounts that do not comply with this eligibility requirement.
        </p>

        {/* ─── 3. ACCOUNT REGISTRATION & SECURITY ─── */}
        <h2 style={h2}>3. Account Registration & Security</h2>
        <p style={p}>
          To access certain features of the Service, you must register for an account. When you register, you agree to:
        </p>
        <ul style={ul}>
          <li style={li}>Provide accurate, current, and complete registration information;</li>
          <li style={li}>Maintain and promptly update your account information to keep it accurate, current, and complete;</li>
          <li style={li}>Maintain the security and confidentiality of your login credentials, including your password;</li>
          <li style={li}>Not share your account credentials with any third party;</li>
          <li style={li}>Immediately notify AIM of any unauthorized use of your account or any other breach of security at <span style={bold}>legal@aimfitness.ai</span>;</li>
          <li style={li}>Accept responsibility for all activities that occur under your account, whether or not authorized by you.</li>
        </ul>
        <p style={p}>
          You may not create more than one account per person. You may not use another person's account without their permission. AIM reserves the right to suspend or terminate your account if any information provided during registration or thereafter proves to be inaccurate, not current, or incomplete, or if AIM has reasonable grounds to suspect such inaccuracy.
        </p>
        <p style={p}>
          AIM will not be liable for any loss or damage arising from your failure to comply with these account security obligations.
        </p>

        {/* ─── 4. DESCRIPTION OF SERVICE ─── */}
        <h2 style={h2}>4. Description of Service</h2>
        <p style={p}>
          AIM is an AI-powered performance intelligence platform designed to help endurance athletes understand, track, and optimize their athletic performance. The Service includes, but is not limited to, the following features:
        </p>
        <ul style={ul}>
          <li style={li}><span style={bold}>Data Aggregation:</span> Integration with eighteen-plus (18+) third-party fitness and health data sources, including but not limited to Strava, Wahoo, Garmin, Oura, WHOOP, Eight Sleep, and Withings, to collect and consolidate your athletic, physiological, and wellness data;</li>
          <li style={li}><span style={bold}>Health Data Collection:</span> Facilitation of the upload and storage of blood work panels, DEXA body composition scan results, and other health-related data that you voluntarily provide;</li>
          <li style={li}><span style={bold}>AI-Powered Analysis:</span> Application of proprietary artificial intelligence and machine learning models to analyze your aggregated performance, health, recovery, and training data;</li>
          <li style={li}><span style={bold}>Insights & Recommendations:</span> Generation of personalized performance insights, training recommendations, recovery assessments, and trend analyses based on your data;</li>
          <li style={li}><span style={bold}>Dashboard & Reporting:</span> Interactive dashboards, visualizations, and reports to track your athletic performance metrics over time.</li>
          <li style={li}><span style={bold}>SMS AI Coaching:</span> Optional text message-based workout summaries, training insights, and conversational coaching delivered via Twilio, Inc. You may opt in or out of SMS features at any time in your account settings.</li>
        </ul>
        <p style={p}>
          The specific features available to you will depend on your subscription tier, as described in Section 6. AIM reserves the right to modify, update, or discontinue any aspect of the Service at any time, with or without notice, subject to applicable law.
        </p>

        <h3 style={h3}>4.2 Third-Party Data Processing</h3>
        <p style={p}>
          By using the Service, you acknowledge that your health and fitness data may be transmitted to <span style={bold}>Anthropic, PBC</span> ("Anthropic"), the provider of the Claude AI model that powers AIM's analysis engine. Your data transmitted to Anthropic is processed solely to generate your personalized insights and is <span style={bold}>not used by Anthropic to train their AI models</span>. Anthropic operates under a commercial API data processing agreement with AIM. For users who opt in to SMS features, your phone number and message content are processed by <span style={bold}>Twilio, Inc.</span> ("Twilio") solely for message delivery. Please refer to our <Link to="/privacy">Privacy Policy</Link> for full details on our sub-processors.
        </p>

        {/* ─── 5. MEDICAL DISCLAIMER ─── */}
        <h2 style={{ ...h2, color: T.danger }}>5. Medical Disclaimer</h2>
        <div style={{ padding: "24px", background: "rgba(255,71,87,0.06)", borderRadius: 12, border: "1px solid rgba(255,71,87,0.15)", marginBottom: 24 }}>
          <p style={{ ...p, ...uppercase, color: T.danger, fontSize: 14, letterSpacing: "0.05em", marginBottom: 16 }}>
            CRITICAL NOTICE &mdash; PLEASE READ CAREFULLY
          </p>
          <p style={{ ...p, fontWeight: 500 }}>
            THE SERVICE IS <span style={{ ...bold, color: T.danger }}>NOT</span> A MEDICAL DEVICE. THE SERVICE IS <span style={{ ...bold, color: T.danger }}>NOT</span> INTENDED TO DIAGNOSE, TREAT, CURE, OR PREVENT ANY DISEASE OR MEDICAL CONDITION. THE SERVICE DOES <span style={{ ...bold, color: T.danger }}>NOT</span> PROVIDE MEDICAL ADVICE, AND NOTHING CONTAINED IN THE SERVICE SHOULD BE CONSTRUED AS MEDICAL ADVICE, A MEDICAL DIAGNOSIS, OR A TREATMENT RECOMMENDATION.
          </p>
          <p style={p}>
            AIM is a performance intelligence and analytics platform. All insights, recommendations, analyses, scores, trends, and other outputs generated by the Service (collectively, <span style={bold}>"AI Outputs"</span>) are provided for <span style={bold}>informational and educational purposes only</span>. AI Outputs are generated by artificial intelligence models that analyze statistical patterns in your data and are inherently probabilistic in nature. They are not, and should not be treated as, professional medical, health, nutritional, fitness, or therapeutic advice.
          </p>
          <p style={p}>
            <span style={bold}>You acknowledge and agree that:</span>
          </p>
          <ul style={ul}>
            <li style={li}>The Service is not a substitute for professional medical advice, diagnosis, or treatment from a qualified healthcare provider;</li>
            <li style={li}>You should <span style={bold}>always</span> consult with a qualified physician, sports medicine specialist, or other licensed healthcare professional before making any decisions regarding your health, fitness, nutrition, training regimen, or medical care;</li>
            <li style={li}>You should <span style={bold}>never</span> disregard professional medical advice or delay seeking medical treatment based on any information, insight, or recommendation provided by the Service;</li>
            <li style={li}>AI Outputs may be inaccurate, incomplete, or not applicable to your specific physiological condition, medical history, or circumstances;</li>
            <li style={li}>The analysis of blood work panels, DEXA scans, and other health data by the Service is not equivalent to clinical interpretation by a licensed medical professional;</li>
            <li style={li}>If you experience any medical emergency or believe you have a medical condition, you should immediately contact your healthcare provider or emergency services;</li>
            <li style={li}>Your reliance on any AI Outputs is solely at your own risk;</li>
            <li style={li}>AIM does not maintain a doctor-patient, therapist-patient, or any other professional healthcare relationship with you.</li>
          </ul>
          <p style={{ ...p, marginBottom: 0 }}>
            <span style={bold}>BY USING THE SERVICE, YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT AIM IS NOT RESPONSIBLE OR LIABLE FOR ANY HEALTH OUTCOMES, INJURIES, OR DAMAGES THAT MAY RESULT FROM YOUR USE OF OR RELIANCE ON THE SERVICE OR ANY AI OUTPUTS.</span>
          </p>
        </div>

        {/* ─── 6. SUBSCRIPTION PLANS & BILLING ─── */}
        <h2 style={h2}>6. Subscription Plans & Billing</h2>

        <h3 style={h3}>6.1 Subscription Tiers</h3>
        <p style={p}>
          AIM offers three subscription tiers, each providing different levels of access to the Service:
        </p>
        <ul style={ul}>
          <li style={li}><span style={bold}>Starter:</span> $19.00 per month;</li>
          <li style={li}><span style={bold}>Pro:</span> $49.00 per month;</li>
          <li style={li}><span style={bold}>Elite:</span> $99.00 per month.</li>
        </ul>
        <p style={p}>
          All prices are in United States Dollars (USD) unless otherwise specified at the time of purchase. AIM reserves the right to change subscription pricing at any time upon thirty (30) days' prior written notice. Price changes will take effect at the start of your next billing cycle following such notice.
        </p>

        <h3 style={h3}>6.2 Free Trial</h3>
        <p style={p}>
          AIM may offer a fourteen (14) day free trial to eligible new users. During the free trial period, you will have access to the features of the subscription tier you selected at no charge. At the end of the free trial period, your subscription will automatically convert to a paid subscription at the applicable rate, and your designated payment method will be charged, unless you cancel before the trial period expires.
        </p>
        <p style={p}>
          You will receive a reminder notification before your free trial expires. Free trial eligibility is limited to one trial per person. AIM reserves the right to modify, suspend, or discontinue the free trial offer at any time without notice.
        </p>

        <h3 style={h3}>6.3 Payment Processing</h3>
        <p style={p}>
          All payments are processed through Stripe, Inc. (<span style={bold}>"Stripe"</span>), our third-party payment processor. By providing your payment information, you authorize AIM and Stripe to charge the applicable subscription fees to your designated payment method. You agree to abide by Stripe's terms of service and any other applicable payment terms.
        </p>
        <p style={p}>
          You are responsible for providing accurate and current payment information. If your payment method fails or your account is past due, AIM may suspend or terminate your access to the Service. AIM may also attempt to re-process failed payments periodically.
        </p>

        <h3 style={h3}>6.4 Auto-Renewal</h3>
        <p style={p}>
          All subscription plans automatically renew at the end of each monthly billing cycle at the then-current subscription rate unless you cancel your subscription before the renewal date. You acknowledge and agree that your payment method will be automatically charged at each renewal.
        </p>

        <h3 style={h3}>6.5 Cancellation</h3>
        <p style={p}>
          You may cancel your subscription at any time through your account settings or by contacting us at <span style={bold}>legal@aimfitness.ai</span>. Cancellation will take effect at the end of your current billing period. You will continue to have access to your subscribed tier's features until the end of the billing period for which you have already paid. No partial refunds will be issued for unused portions of a billing period, except as described in Section 6.6.
        </p>

        <h3 style={h3}>6.6 Refund Policy</h3>
        <p style={p}>
          If you cancel your subscription within the first thirty (30) days following your initial paid subscription charge (not including the free trial period), you are eligible for a pro-rated refund for the unused portion of your subscription period. Refund requests must be submitted to <span style={bold}>legal@aimfitness.ai</span> within this thirty (30) day window.
        </p>
        <p style={p}>
          After the initial thirty (30) day period, all subscription fees are non-refundable, except as required by applicable law. AIM reserves the right to issue refunds or credits at its sole discretion in other circumstances.
        </p>

        <h3 style={h3}>6.7 Taxes</h3>
        <p style={p}>
          Subscription fees are exclusive of all applicable sales, use, value-added, goods and services, withholding, or similar taxes. You are solely responsible for paying any such taxes that may apply to your subscription, except for taxes based on AIM's net income.
        </p>

        {/* ─── 7. THIRD-PARTY INTEGRATIONS ─── */}
        <h2 style={h2}>7. Third-Party Integrations</h2>
        <p style={p}>
          The Service enables you to connect and integrate with various third-party fitness devices, wearables, applications, and data platforms (collectively, <span style={bold}>"Third-Party Services"</span>), including but not limited to Strava, Wahoo, Garmin, Oura, WHOOP, Eight Sleep, and Withings.
        </p>

        <h3 style={h3}>7.1 Authorization</h3>
        <p style={p}>
          By connecting a Third-Party Service to your AIM account, you expressly authorize AIM to access, retrieve, and process your data from such Third-Party Service through its application programming interface (API) or other authorized data exchange mechanisms. You represent and warrant that you have the right to authorize such access and that doing so does not violate any agreement you have with the Third-Party Service.
        </p>

        <h3 style={h3}>7.2 Third-Party Terms</h3>
        <p style={p}>
          Your use of any Third-Party Service is governed by that Third-Party Service's own terms of service, privacy policy, and other applicable agreements. You are solely responsible for reviewing and complying with the terms and policies of any Third-Party Service you connect to AIM. AIM is not a party to your agreements with Third-Party Services.
        </p>

        <h3 style={h3}>7.3 Data Accuracy & Availability</h3>
        <p style={p}>
          AIM does not control, endorse, or assume any responsibility for the accuracy, completeness, reliability, timeliness, or availability of data provided by Third-Party Services. Data transmitted from Third-Party Services may be delayed, inaccurate, incomplete, or unavailable due to factors beyond AIM's control, including but not limited to device malfunctions, API changes, service outages, or connectivity issues. AIM shall not be liable for any errors, omissions, or inaccuracies in data received from Third-Party Services, or for any decisions or actions taken based on such data.
        </p>

        <h3 style={h3}>7.4 Changes to Third-Party Integrations</h3>
        <p style={p}>
          Third-Party Services may modify, restrict, or discontinue their APIs or data sharing capabilities at any time without notice to AIM. AIM does not guarantee that any particular Third-Party Service integration will remain available or function in any specific manner. AIM shall not be liable for any loss of functionality resulting from changes made by Third-Party Services.
        </p>

        {/* ─── 8. INTELLECTUAL PROPERTY ─── */}
        <h2 style={h2}>8. Intellectual Property</h2>

        <h3 style={h3}>8.1 AIM's Intellectual Property</h3>
        <p style={p}>
          The Service, including but not limited to its software, code, algorithms, artificial intelligence models, machine learning models, analysis frameworks, methodologies, user interface design, graphics, logos, trademarks, trade names, domain names, documentation, and all related intellectual property (collectively, <span style={bold}>"AIM IP"</span>), is and shall remain the exclusive property of AIM Performance Intelligence, Inc. and its licensors. AIM IP is protected by copyright, trademark, patent, trade secret, and other intellectual property laws of the United States and international jurisdictions.
        </p>
        <p style={p}>
          Nothing in these Terms grants you any right, title, or interest in or to any AIM IP, except for the limited license to access and use the Service as expressly set forth herein. All rights not expressly granted are reserved by AIM.
        </p>

        <h3 style={h3}>8.2 User Ownership of Data</h3>
        <p style={p}>
          You retain all ownership rights in and to the data you provide to or generate through the Service, including your athletic performance data, health data, blood work panels, body composition data, and other personal data you submit (collectively, <span style={bold}>"User Data"</span>). Nothing in these Terms transfers ownership of your User Data to AIM.
        </p>

        <h3 style={h3}>8.3 Feedback</h3>
        <p style={p}>
          If you provide AIM with any feedback, suggestions, ideas, improvements, bug reports, or other communications regarding the Service (<span style={bold}>"Feedback"</span>), you hereby assign to AIM all right, title, and interest in and to such Feedback. AIM shall be free to use, reproduce, modify, distribute, and commercialize Feedback without any obligation, compensation, or attribution to you.
        </p>

        {/* ─── 9. USER DATA & LICENSE ─── */}
        <h2 style={h2}>9. User Data & License</h2>

        <h3 style={h3}>9.1 License to Process User Data</h3>
        <p style={p}>
          By using the Service, you grant AIM a non-exclusive, worldwide, royalty-free, sublicensable license to access, collect, store, process, analyze, display, and transmit your User Data solely for the purposes of:
        </p>
        <ul style={ul}>
          <li style={li}>Providing, maintaining, and improving the Service and its features;</li>
          <li style={li}>Generating personalized AI Outputs, insights, and recommendations for you;</li>
          <li style={li}>Providing customer support related to your use of the Service;</li>
          <li style={li}>Complying with applicable legal obligations.</li>
        </ul>
        <p style={p}>
          This license continues for the duration of your use of the Service and for a reasonable period thereafter necessary for AIM to fulfill its obligations, including data retention requirements. You may revoke this license by deleting your account, subject to AIM's data retention policies as described in our <Link to="/privacy" style={{ color: T.accent }}>Privacy Policy</Link>.
        </p>

        <h3 style={h3}>9.2 Anonymized & Aggregated Data</h3>
        <p style={p}>
          You acknowledge and agree that AIM may create anonymized, de-identified, and/or aggregated data derived from your User Data (<span style={bold}>"Aggregated Data"</span>). Aggregated Data will not identify you personally or be reasonably capable of being re-identified to you. AIM may use Aggregated Data for any lawful purpose, including but not limited to:
        </p>
        <ul style={ul}>
          <li style={li}>Training, improving, and refining AIM's artificial intelligence and machine learning models;</li>
          <li style={li}>Conducting research and development to enhance the Service;</li>
          <li style={li}>Generating benchmarks, statistical analyses, and industry insights;</li>
          <li style={li}>Publishing de-identified research or reports.</li>
        </ul>
        <p style={p}>
          AIM's right to use Aggregated Data survives the termination of your account and these Terms.
        </p>

        <h3 style={h3}>9.3 Data Security</h3>
        <p style={p}>
          AIM implements commercially reasonable technical and organizational measures to protect your User Data against unauthorized access, alteration, disclosure, or destruction. However, no method of electronic transmission or storage is completely secure, and AIM cannot guarantee absolute security. You acknowledge and accept this inherent risk.
        </p>

        {/* ─── 10. PROHIBITED CONDUCT ─── */}
        <h2 style={h2}>10. Prohibited Conduct</h2>
        <p style={p}>
          You agree not to engage in any of the following prohibited activities in connection with your use of the Service:
        </p>
        <ul style={ul}>
          <li style={li}><span style={bold}>Reverse Engineering:</span> Reverse engineer, decompile, disassemble, decrypt, or otherwise attempt to derive the source code, algorithms, data structures, or underlying ideas of any part of the Service, including AIM's AI models and analysis frameworks;</li>
          <li style={li}><span style={bold}>Scraping & Automated Access:</span> Use any robot, spider, scraper, crawler, or other automated means to access, extract, copy, or monitor any portion of the Service or its data without AIM's express written permission;</li>
          <li style={li}><span style={bold}>Account Sharing:</span> Share, transfer, sell, or otherwise make your account credentials available to any third party, or allow multiple individuals to use a single account;</li>
          <li style={li}><span style={bold}>Malicious Content:</span> Upload, transmit, or distribute any viruses, worms, trojan horses, ransomware, spyware, malware, or any other malicious or harmful code, files, or programs;</li>
          <li style={li}><span style={bold}>Unauthorized Access:</span> Attempt to gain unauthorized access to any part of the Service, other users' accounts, or any systems, networks, or servers connected to the Service;</li>
          <li style={li}><span style={bold}>Interference:</span> Interfere with, disrupt, or impose an unreasonable or disproportionately large load on the Service's infrastructure, networks, or servers;</li>
          <li style={li}><span style={bold}>Circumvention:</span> Circumvent, disable, or otherwise interfere with any security-related features of the Service, including features that prevent or restrict use, copying, or access;</li>
          <li style={li}><span style={bold}>Misrepresentation:</span> Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity;</li>
          <li style={li}><span style={bold}>Resale:</span> Resell, sublicense, redistribute, or make available the Service or any AI Outputs to any third party for commercial purposes without AIM's prior written consent;</li>
          <li style={li}><span style={bold}>Competitive Use:</span> Use the Service or any AI Outputs to develop, train, or improve a competing product or service;</li>
          <li style={li}><span style={bold}>Fraudulent Activity:</span> Use the Service for any fraudulent, illegal, or unauthorized purpose, or in any manner that violates any applicable local, state, national, or international law or regulation;</li>
          <li style={li}><span style={bold}>Data Manipulation:</span> Intentionally submit false, misleading, or fabricated data to the Service with the intent to corrupt AI Outputs, manipulate insights, or deceive other users.</li>
        </ul>
        <p style={p}>
          AIM reserves the right to investigate and take appropriate legal action against anyone who, in AIM's sole discretion, violates this provision, including without limitation removing offending content, suspending or terminating the violator's account, and reporting such activity to law enforcement authorities.
        </p>

        {/* ─── 11. DISCLAIMER OF WARRANTIES ─── */}
        <h2 style={h2}>11. Disclaimer of Warranties</h2>
        <div style={{ padding: "24px", background: T.gradientSubtle, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 16 }}>
          <p style={{ ...p, ...uppercase, fontSize: 14, letterSpacing: "0.03em" }}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          </p>
          <p style={p}>
            AIM EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul style={ul}>
            <li style={li}>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT;</li>
            <li style={li}>ANY WARRANTIES ARISING FROM COURSE OF DEALING, COURSE OF PERFORMANCE, OR USAGE OF TRADE;</li>
            <li style={li}>ANY WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, VIRUS-FREE, OR THAT DEFECTS WILL BE CORRECTED;</li>
            <li style={li}>ANY WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, TIMELINESS, OR USEFULNESS OF ANY AI OUTPUTS, INSIGHTS, RECOMMENDATIONS, OR ANALYSES PROVIDED BY THE SERVICE;</li>
            <li style={li}>ANY WARRANTIES REGARDING THE ACCURACY OR COMPLETENESS OF DATA RECEIVED FROM THIRD-PARTY SERVICES;</li>
            <li style={li}>ANY WARRANTIES THAT THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS OR ACHIEVE ANY PARTICULAR RESULTS.</li>
          </ul>
          <p style={{ ...p, marginBottom: 0 }}>
            YOU ACKNOWLEDGE AND AGREE THAT AI OUTPUTS ARE GENERATED BY PROBABILISTIC MACHINE LEARNING MODELS AND MAY CONTAIN ERRORS, INACCURACIES, OR OMISSIONS. AIM DOES NOT GUARANTEE THE ACCURACY, CORRECTNESS, OR RELIABILITY OF ANY AI OUTPUT. YOUR USE OF AND RELIANCE ON AI OUTPUTS IS ENTIRELY AT YOUR OWN RISK.
          </p>
        </div>

        {/* ─── 12. LIMITATION OF LIABILITY ─── */}
        <h2 style={h2}>12. Limitation of Liability</h2>
        <p style={{ ...p, ...uppercase, fontSize: 14, letterSpacing: "0.03em" }}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
        </p>

        <h3 style={h3}>12.1 Exclusion of Certain Damages</h3>
        <p style={p}>
          IN NO EVENT SHALL AIM, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SERVICE PROVIDERS (COLLECTIVELY, THE <span style={bold}>"AIM PARTIES"</span>) BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH:
        </p>
        <ul style={ul}>
          <li style={li}>Your use of or inability to use the Service;</li>
          <li style={li}>Any AI Outputs, insights, recommendations, or analyses provided by the Service;</li>
          <li style={li}>Any health outcomes, injuries, or physical harm related to your use of or reliance on the Service;</li>
          <li style={li}>Any unauthorized access to or alteration of your data or transmissions;</li>
          <li style={li}>Any errors, inaccuracies, or omissions in data from Third-Party Services;</li>
          <li style={li}>Any conduct or content of any third party on the Service;</li>
          <li style={li}>Any other matter relating to the Service;</li>
        </ul>
        <p style={p}>
          WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT AIM HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>

        <h3 style={h3}>12.2 Cap on Liability</h3>
        <p style={p}>
          IN NO EVENT SHALL THE AGGREGATE LIABILITY OF THE AIM PARTIES ARISING OUT OF OR RELATED TO THESE TERMS OR YOUR USE OF THE SERVICE EXCEED THE TOTAL AMOUNT OF FEES ACTUALLY PAID BY YOU TO AIM DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED UNITED STATES DOLLARS ($100.00), WHICHEVER IS GREATER.
        </p>

        <h3 style={h3}>12.3 Jurisdictional Limitations</h3>
        <p style={p}>
          Some jurisdictions do not allow the exclusion or limitation of certain warranties or damages. In such jurisdictions, the limitations set forth in this section shall apply to the fullest extent permitted by applicable law. Nothing in these Terms shall exclude or limit liability that cannot be excluded or limited under applicable law.
        </p>

        {/* ─── 13. INDEMNIFICATION ─── */}
        <h2 style={h2}>13. Indemnification</h2>
        <p style={p}>
          You agree to indemnify, defend, and hold harmless the AIM Parties from and against any and all claims, demands, actions, suits, proceedings, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees and court costs) arising out of or relating to:
        </p>
        <ul style={ul}>
          <li style={li}>Your use of or access to the Service;</li>
          <li style={li}>Your violation of these Terms or any applicable law or regulation;</li>
          <li style={li}>Your violation of any rights of a third party, including intellectual property rights or privacy rights;</li>
          <li style={li}>Any User Data you provide to the Service;</li>
          <li style={li}>Any health decisions, training decisions, or other actions you take based on AI Outputs or other information provided by the Service;</li>
          <li style={li}>Your connection to or use of any Third-Party Services through the Service.</li>
        </ul>
        <p style={p}>
          AIM reserves the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify AIM, and you agree to cooperate with AIM's defense of such claims. You agree not to settle any such matter without the prior written consent of AIM. AIM will use reasonable efforts to notify you of any such claim, action, or proceeding upon becoming aware of it.
        </p>

        {/* ─── 14. GOVERNING LAW & DISPUTE RESOLUTION ─── */}
        <h2 style={h2}>14. Governing Law & Dispute Resolution</h2>

        <h3 style={h3}>14.1 Governing Law</h3>
        <p style={p}>
          These Terms and any dispute or claim arising out of or in connection with them or their subject matter (including non-contractual disputes or claims) shall be governed by and construed in accordance with the laws of the State of Delaware, United States of America, without giving effect to any choice-of-law or conflict-of-law provisions that would cause the application of the laws of any other jurisdiction.
        </p>

        <h3 style={h3}>14.2 Binding Arbitration</h3>
        <p style={p}>
          <span style={bold}>You and AIM agree that any dispute, claim, or controversy arising out of or relating to these Terms, the Service, or the relationship between you and AIM (collectively, <span style={bold}>"Disputes"</span>) will be resolved exclusively through final and binding arbitration,</span> rather than in court, except that: (a) either party may assert claims in small claims court if the claims qualify; and (b) either party may seek injunctive or other equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights.
        </p>
        <p style={p}>
          Arbitration shall be administered by JAMS under its Comprehensive Arbitration Rules and Procedures, or, if JAMS is unavailable, by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration shall be conducted by a single arbitrator, in the English language, and shall take place in San Francisco, California, or, at your election, may be conducted remotely by videoconference or telephone. The arbitrator shall have the authority to grant any remedy that would be available in a court of competent jurisdiction.
        </p>
        <p style={p}>
          The arbitrator's decision shall be final, binding, and enforceable in any court of competent jurisdiction. Judgment upon the award rendered by the arbitrator may be entered in any court having jurisdiction thereof.
        </p>

        <h3 style={h3}>14.3 Class Action Waiver</h3>
        <p style={{ ...p, padding: "16px 20px", background: "rgba(255,71,87,0.06)", borderRadius: 10, border: "1px solid rgba(255,71,87,0.15)" }}>
          <span style={{ ...bold, color: T.danger }}>YOU AND AIM AGREE THAT EACH PARTY MAY BRING DISPUTES AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION OR PROCEEDING.</span> The arbitrator may not consolidate more than one person's claims and may not otherwise preside over any form of a class, consolidated, or representative proceeding. If this class action waiver is found to be unenforceable, then the entirety of this arbitration provision (other than the waiver of jury trial in Section 14.5) shall be null and void, and the Dispute shall be resolved in court as set forth in Section 14.6.
        </p>

        <h3 style={h3}>14.4 Opt-Out</h3>
        <p style={p}>
          You have the right to opt out of the arbitration and class action waiver provisions of this Section 14 by sending written notice of your decision to opt out to <span style={bold}>legal@aimfitness.ai</span> within thirty (30) days of first accepting these Terms. Your notice must include your full name, mailing address, and a clear statement that you wish to opt out of the arbitration and class action waiver provisions. If you opt out, neither you nor AIM will be bound by the arbitration provisions of this section, but all other provisions of these Terms will continue to apply.
        </p>

        <h3 style={h3}>14.5 Waiver of Jury Trial</h3>
        <p style={p}>
          TO THE FULLEST EXTENT PERMITTED BY LAW, YOU AND AIM EACH WAIVE THE RIGHT TO A JURY TRIAL IN CONNECTION WITH ANY DISPUTE ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE.
        </p>

        <h3 style={h3}>14.6 Forum for Litigation</h3>
        <p style={p}>
          To the extent that the arbitration provisions of this Section 14 do not apply to a Dispute, or where a Dispute is determined to be non-arbitrable, you and AIM agree that any judicial proceeding shall be brought exclusively in the state or federal courts located in Wilmington, Delaware, and you and AIM each consent to the exclusive jurisdiction and venue of such courts and waive any objection based on inconvenient forum.
        </p>

        {/* ─── 15. TERMINATION ─── */}
        <h2 style={h2}>15. Termination</h2>

        <h3 style={h3}>15.1 Termination by You</h3>
        <p style={p}>
          You may terminate your account and these Terms at any time by canceling your subscription and deleting your account through your account settings, or by contacting us at <span style={bold}>legal@aimfitness.ai</span>. Termination of your account will result in the cancellation of your subscription at the end of the current billing period.
        </p>

        <h3 style={h3}>15.2 Termination by AIM</h3>
        <p style={p}>
          AIM may suspend or terminate your account and access to the Service at any time, with or without cause, and with or without notice, including but not limited to situations where:
        </p>
        <ul style={ul}>
          <li style={li}>You breach any provision of these Terms;</li>
          <li style={li}>AIM is required to do so by law or regulation;</li>
          <li style={li}>AIM reasonably believes your conduct creates liability or risk for AIM, its users, or third parties;</li>
          <li style={li}>Your account has been inactive for an extended period;</li>
          <li style={li}>AIM decides to discontinue the Service or any part thereof.</li>
        </ul>
        <p style={p}>
          If AIM terminates your account for cause (i.e., breach of these Terms), you will not be entitled to any refund. If AIM terminates your account without cause or discontinues the Service entirely, AIM will provide a pro-rated refund for any prepaid subscription fees corresponding to the unused portion of your current billing period.
        </p>

        <h3 style={h3}>15.3 Effect of Termination</h3>
        <p style={p}>
          Upon termination of your account:
        </p>
        <ul style={ul}>
          <li style={li}>Your right to access and use the Service will immediately cease;</li>
          <li style={li}>AIM may, but is not obligated to, delete your User Data in accordance with our <Link to="/privacy" style={{ color: T.accent }}>Privacy Policy</Link> and applicable data retention requirements;</li>
          <li style={li}>You may request a copy of your User Data prior to termination, subject to AIM's data export capabilities and applicable law;</li>
          <li style={li}>Any outstanding payment obligations, and the provisions of Sections 5, 8, 9.2, 10, 11, 12, 13, 14, 15.3, 17, and 18 shall survive termination.</li>
        </ul>
        <p style={p}>
          AIM recommends that you export or download any User Data you wish to retain before terminating your account. AIM shall not be liable for any loss of User Data following account termination.
        </p>

        {/* ─── 16. MODIFICATIONS TO TERMS ─── */}
        <h2 style={h2}>16. Modifications to Terms</h2>
        <p style={p}>
          AIM reserves the right to modify, amend, or update these Terms at any time at its sole discretion. When we make material changes to these Terms, we will:
        </p>
        <ul style={ul}>
          <li style={li}>Provide you with at least thirty (30) days' prior notice before the changes take effect;</li>
          <li style={li}>Notify you of the changes through reasonable means, which may include email notification to the address associated with your account, an in-app notification, or a prominent notice posted on our website;</li>
          <li style={li}>Update the "Last updated" date at the top of these Terms.</li>
        </ul>
        <p style={p}>
          Your continued use of the Service after the effective date of the modified Terms constitutes your acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the Service and terminate your account before the effective date of the modifications.
        </p>
        <p style={p}>
          For non-material changes (such as typographical corrections, formatting adjustments, or clarifications that do not substantively affect your rights or obligations), AIM may update these Terms without prior notice, though we will update the "Last updated" date accordingly.
        </p>

        {/* ─── 17. GENERAL PROVISIONS ─── */}
        <h2 style={h2}>17. General Provisions</h2>

        <h3 style={h3}>17.1 Severability</h3>
        <p style={p}>
          If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court or arbitrator of competent jurisdiction, the invalidity, illegality, or unenforceability of such provision shall not affect any other provision of these Terms. The remaining provisions shall continue in full force and effect. The invalid, illegal, or unenforceable provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable while preserving its original intent as closely as possible.
        </p>

        <h3 style={h3}>17.2 Waiver</h3>
        <p style={p}>
          The failure of AIM to exercise or enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver of any provision of these Terms shall be effective only if in writing and signed by an authorized representative of AIM. A waiver of any right or provision on one occasion shall not be deemed a waiver of such right or provision on any subsequent occasion.
        </p>

        <h3 style={h3}>17.3 Entire Agreement</h3>
        <p style={p}>
          These Terms, together with the <Link to="/privacy" style={{ color: T.accent }}>Privacy Policy</Link> and any other legal notices or policies published by AIM on the Service, constitute the entire agreement between you and AIM regarding the subject matter hereof and supersede all prior and contemporaneous agreements, representations, warranties, and understandings, whether written or oral, regarding such subject matter.
        </p>

        <h3 style={h3}>17.4 Assignment</h3>
        <p style={p}>
          You may not assign or transfer these Terms, or any rights or obligations hereunder, in whole or in part, without the prior written consent of AIM. AIM may assign or transfer these Terms, or any rights or obligations hereunder, in whole or in part, without restriction, including in connection with a merger, acquisition, reorganization, or sale of all or substantially all of its assets. Any purported assignment in violation of this section shall be null and void. Subject to the foregoing, these Terms shall bind and inure to the benefit of the parties, their successors, and permitted assigns.
        </p>

        <h3 style={h3}>17.5 Force Majeure</h3>
        <p style={p}>
          AIM shall not be liable for any delay or failure to perform its obligations under these Terms resulting from causes beyond its reasonable control, including but not limited to acts of God, natural disasters, pandemics, epidemics, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, earthquakes, power outages, internet or telecommunications failures, cyberattacks, strikes, or shortages of labor, materials, or equipment.
        </p>

        <h3 style={h3}>17.6 No Third-Party Beneficiaries</h3>
        <p style={p}>
          These Terms do not confer any third-party beneficiary rights. Nothing in these Terms, express or implied, is intended to or shall confer upon any person or entity other than you and AIM any legal or equitable right, benefit, or remedy of any nature under or by reason of these Terms.
        </p>

        <h3 style={h3}>17.7 Headings</h3>
        <p style={p}>
          The section headings in these Terms are for convenience only and shall not affect the interpretation of these Terms.
        </p>

        <h3 style={h3}>17.8 Electronic Communications</h3>
        <p style={p}>
          By using the Service, you consent to receiving electronic communications from AIM. These communications may include emails, in-app notifications, push notifications, and other communications regarding the Service, your account, billing, or changes to these Terms. You agree that all agreements, notices, disclosures, and other communications provided to you electronically satisfy any legal requirement that such communications be in writing.
        </p>

        <h3 style={h3}>17.9 Export Compliance</h3>
        <p style={p}>
          You agree that your use of the Service will comply with all applicable export control laws and regulations, including the U.S. Export Administration Regulations and sanctions programs administered by the U.S. Department of the Treasury's Office of Foreign Assets Control (OFAC). You represent and warrant that you are not located in, organized under the laws of, or a resident of any country or territory subject to comprehensive U.S. sanctions, and that you are not a person identified on any U.S. government restricted-party list.
        </p>

        {/* ─── 18. CONTACT INFORMATION ─── */}
        <h2 style={h2}>18. Contact Information</h2>
        <p style={p}>
          If you have any questions, concerns, or requests regarding these Terms of Service, please contact us at:
        </p>
        <div style={{ padding: "24px", background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 16 }}>
          <p style={{ ...p, marginBottom: 8 }}><span style={bold}>AIM Performance Intelligence, Inc.</span></p>
          <p style={{ ...p, marginBottom: 8 }}>San Francisco, California, United States</p>
          <p style={{ ...p, marginBottom: 8 }}>Email: <span style={{ color: T.accent }}>legal@aimfitness.ai</span></p>
          <p style={{ ...p, marginBottom: 0 }}>Please include "Terms of Service Inquiry" in the subject line of your email to ensure prompt routing of your correspondence.</p>
        </div>

        {/* ─── FOOTER ─── */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
          <p style={{ ...p, color: T.textDim, fontSize: 13 }}>
            &copy; {new Date().getFullYear()} AIM Performance Intelligence, Inc. All rights reserved.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
            <Link to="/privacy" style={{ color: T.textDim, textDecoration: "none", fontSize: 13 }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: T.textSoft, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
