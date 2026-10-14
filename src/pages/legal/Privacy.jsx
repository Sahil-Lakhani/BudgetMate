import { Link } from "react-router-dom"
import { LegalLayout, Section } from "./LegalLayout"
import { LEGAL, SITE } from "../../legal/siteConfig"
import { useConsent, OPTIONAL_SERVICES } from "../../context/ConsentContext"

// Describes what the code in this repository actually does. If you add a service
// (analytics, email, payments, …) update this page and ConsentContext first.
export default function Privacy() {
  const { openPreferences } = useConsent()
  const c = LEGAL.controller

  return (
    <LegalLayout title="Privacy Policy" subtitle="Datenschutzerklärung">
      <p>
        This policy explains which personal data {SITE.name} (“we”, “us”) processes when you use the web app at{" "}
        {SITE.url}, why, on which legal basis, and what rights you have under the EU General Data Protection
        Regulation (GDPR).
      </p>

      <Section id="controller" title="1. Controller">
        <address>
          {c.name}<br />
          {c.street}<br />
          {c.postcodeCity}<br />
          {c.country}<br />
          Email: {c.email}
        </address>
        <p>Data protection officer: {LEGAL.dpo}</p>
      </Section>

      <Section id="overview" title="2. Overview">
        <ul>
          <li>You sign in with your Google account. We store the expenses, receipts details, budget settings, groups and splits you enter.</li>
          <li>Receipt photos and (only if you switch it on) last month's spending are sent to Google's Gemini AI to be analysed. We do not store the photos.</li>
          <li>We do <strong>not</strong> use analytics, advertising, tracking pixels, newsletters or payment providers.</li>
          <li>Optional: Google reCAPTCHA (bot protection) — only with your consent.</li>
          <li>You can export or delete all your data yourself under Settings → Your data.</li>
        </ul>
      </Section>

      <Section id="hosting" title="3. Hosting and server logs">
        <p>
          The app is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. When you open the app,
          Vercel automatically processes technical data needed to deliver it and keep it secure: IP address, date and
          time, requested URL, referrer, browser and operating system. Legal basis: Art. 6(1)(f) GDPR (our legitimate
          interest in operating a secure website). Retention: [VERCEL LOG RETENTION — check your Vercel plan].
        </p>
        <p>
          Requests to our AI endpoint (<code>/api/gemini</code>) also run on Vercel. They include your sign-in token
          (to check that you are logged in) and the content you send for analysis; we do not store that content.
        </p>
      </Section>

      <Section id="account" title="4. Account and sign-in (Firebase Authentication)">
        <p>
          You sign in with Google through Firebase Authentication (Google Ireland Ltd., Gordon House, Barrow Street,
          Dublin 4, Ireland; parent Google LLC, USA). We receive and store your Google user ID, name, email address and
          profile-photo URL. Your sign-in session is kept in your browser's local storage/IndexedDB.
        </p>
        <p>
          Your name, email address and profile photo are also stored in a profile that other signed-in users can find
          by searching your exact email address or the beginning of your name, so they can add you to a group.
        </p>
        <p>
          Legal basis: Art. 6(1)(b) GDPR (providing the service you signed up for). Retention: until you delete your
          account. Minimum age to use {SITE.name}: {LEGAL.minimumAge} years.
        </p>
      </Section>

      <Section id="data" title="5. Your finance data (Cloud Firestore)">
        <p>We store the following in Google Cloud Firestore (location: {LEGAL.firestoreLocation}):</p>
        <ul>
          <li>Expenses: merchant, location, date, amounts, line items and categories</li>
          <li>Settings: currency, monthly income, savings goal, AI-insights preference</li>
          <li>Groups: group name and members (name, email, photo); splits: merchant, date, total, each person's share and whether it was settled</li>
          <li>In-app notifications (e.g. “X added you to a group”)</li>
        </ul>
        <p>
          Your expenses and settings are only readable by you. Groups and splits are visible to the members of the
          group. When a split is settled, a matching entry is written to the ledgers of the payer and the person who
          paid back.
        </p>
        <p>
          Legal basis: Art. 6(1)(b) GDPR. Retention: until you delete the entry or your account. When you delete your
          account, split records you shared with others remain visible to the other members of those groups, because
          they are part of their records too (Art. 6(1)(f) GDPR). [CONFIRM THIS APPROACH WITH YOUR LAWYER]
        </p>
      </Section>

      <Section id="ai" title="6. Receipt scanning and AI insights (Google Gemini)">
        <p>
          When you tap “Analyze Receipt”, the photo (resized, with photo metadata such as GPS location removed) is sent
          via our server to the Gemini API of Google (Google Ireland Ltd. / Google LLC) to extract merchant, date and
          items. You review the result before anything is saved. We do not store the photo. Legal basis: Art. 6(1)(b)
          GDPR — you actively request this function.
        </p>
        <p>
          AI insights are <strong>off by default</strong>. If you switch them on in Settings, your previous month's
          expenses (date, merchant, amounts, items and categories — no name or email) are sent to Gemini once a month
          to generate saving tips, which are cached in your browser. Legal basis: your consent, Art. 6(1)(a) GDPR,
          which you can withdraw at any time by switching the setting off.
        </p>
        <p>
          Receipts can reveal sensitive information (for example, pharmacy purchases). Please do not scan receipts you
          do not want analysed. Google processes this data as our processor under its terms for the paid Gemini API;
          according to those terms it is not used to train Google's models. Google may retain it for a limited period
          for abuse monitoring: [GEMINI RETENTION — verify in Google's current Gemini API terms].
        </p>
      </Section>

      <Section id="cookies" title="7. Cookies and local storage">
        <p>We only store the following on your device without asking, because they are strictly necessary for the service you request (§ 25(2) no. 2 TDDDG):</p>
        <ul>
          <li><strong>Firebase sign-in session</strong> (IndexedDB/local storage) — keeps you logged in, until you sign out</li>
          <li><strong>theme</strong> — light/dark mode choice, until you clear it</li>
          <li><strong>bm_consent</strong> — your choices in this banner, until you change them</li>
          <li><strong>rateLimit_*</strong> — timestamps of recent actions to prevent accidental overuse, a few minutes</li>
          <li><strong>insights_*</strong> — cached AI tips (only if enabled), removed when you sign out</li>
        </ul>
        <p>Optional services that are only loaded after your consent (§ 25(1) TDDDG, Art. 6(1)(a) GDPR):</p>
        <ul>
          {OPTIONAL_SERVICES.map((s) => (
            <li key={s.id}><strong>{s.name}</strong> — {s.purpose} Provider: {s.provider}. {s.transfer}</li>
          ))}
        </ul>
        <p>
          You can change or withdraw your consent at any time with effect for the future:{" "}
          <button type="button" onClick={openPreferences} className="underline font-medium">Open cookie settings</button>.
        </p>
      </Section>

      <Section id="google-content" title="8. Profile pictures">
        <p>
          Profile pictures of you and your group members are loaded directly from Google's servers
          (googleusercontent.com). Your browser therefore connects to Google, which receives your IP address. Legal
          basis: Art. 6(1)(b) GDPR (showing who is in a group). We send no referrer with these requests.
        </p>
      </Section>

      <Section id="recipients" title="9. Recipients and processors">
        <ul>
          <li>Vercel Inc. (USA) — hosting and server functions</li>
          <li>Google Ireland Ltd. / Google LLC (USA) — Firebase Authentication, Cloud Firestore, Gemini API, reCAPTCHA (only with consent)</li>
          <li>Other members of your groups — the group and split data described above</li>
        </ul>
        <p>
          We have data processing agreements (Art. 28 GDPR) with our processors: [CONFIRM THAT YOU HAVE ACCEPTED THE
          VERCEL DPA AND THE GOOGLE CLOUD / FIREBASE DATA PROCESSING TERMS].
        </p>
      </Section>

      <Section id="transfers" title="10. Transfers outside the EU">
        <p>
          Google LLC and Vercel Inc. are based in the USA. Where a recipient is certified under the EU-U.S. Data
          Privacy Framework, transfers are based on the European Commission's adequacy decision (Art. 45 GDPR);
          otherwise on the EU Standard Contractual Clauses (Art. 46(2)(c) GDPR).
        </p>
      </Section>

      <Section id="rights" title="11. Your rights">
        <p>You have the right to:</p>
        <ul>
          <li>access your data (Art. 15 GDPR)</li>
          <li>rectification (Art. 16)</li>
          <li>erasure (Art. 17)</li>
          <li>restriction of processing (Art. 18)</li>
          <li>data portability (Art. 20)</li>
          <li><strong>object</strong> to processing based on legitimate interests (Art. 21)</li>
          <li>withdraw consent at any time with effect for the future (Art. 7(3))</li>
          <li>lodge a complaint with a supervisory authority (Art. 77), e.g. {LEGAL.supervisoryAuthority}</li>
        </ul>
        <p>
          You can export all your data or delete your account and data yourself at any time in{" "}
          <Link to="/settings" className="underline">Settings → Your data</Link>. For anything else, email {c.email}.
        </p>
      </Section>

      <Section id="obligation" title="12. Is providing data required?">
        <p>
          You are not legally obliged to provide data. Without signing in with Google, you cannot use the app. We do
          not use automated decision-making or profiling within the meaning of Art. 22 GDPR; AI insights are
          suggestions only.
        </p>
      </Section>

      <Section id="security" title="13. Security">
        <p>
          All connections use HTTPS. Access to your data is restricted by database security rules so that only you
          (and, for group data, the group members) can read it.
        </p>
      </Section>

      <Section id="changes" title="14. Changes">
        <p>We will update this policy when the app or the law changes. The current version is always available on this page.</p>
      </Section>
    </LegalLayout>
  )
}
