import { Link } from "react-router-dom"
import { LegalLayout, Section } from "./LegalLayout"
import { LEGAL, SITE } from "../../legal/siteConfig"

// A starting point only. Liability limitations in consumer terms are strictly limited under
// German law (§§ 305–310 BGB) — have these reviewed before launch.
export default function Terms() {
  const c = LEGAL.controller

  return (
    <LegalLayout title="Terms of Service" subtitle="Nutzungsbedingungen">
      <p className="font-medium">[DRAFT — HAVE THESE TERMS REVIEWED BY A LAWYER BEFORE LAUNCH]</p>

      <Section id="scope" title="1. Scope">
        <p>
          These terms apply to the use of {SITE.name} ({SITE.url}), provided by {c.name}, {c.street},{" "}
          {c.postcodeCity} (“we”). By creating an account you accept these terms.
        </p>
      </Section>

      <Section id="service" title="2. The service">
        <p>
          {SITE.name} helps you record expenses, scan receipts, view spending statistics and split bills with other
          users. The service is provided free of charge. [CONFIRM — if you ever charge for it, these terms and the
          Impressum/Privacy Policy need payment, withdrawal and consumer-rights sections.] We may change, restrict or
          discontinue features; we will give reasonable notice before discontinuing the service and you can export
          your data at any time.
        </p>
      </Section>

      <Section id="account" title="3. Your account">
        <ul>
          <li>You must be at least {LEGAL.minimumAge} years old.</li>
          <li>You sign in with your Google account and are responsible for keeping it secure.</li>
          <li>You may delete your account at any time in Settings.</li>
        </ul>
      </Section>

      <Section id="use" title="4. Acceptable use">
        <p>You must not:</p>
        <ul>
          <li>add people to groups or splits without their knowledge, or enter false amounts for others;</li>
          <li>upload content you have no right to use, or images containing other people's personal data;</li>
          <li>try to access other users' data, overload or attack the service, or bypass its limits.</li>
        </ul>
        <p>We may suspend accounts that seriously or repeatedly breach these rules.</p>
      </Section>

      <Section id="content" title="5. Your content">
        <p>
          You keep all rights to the data you enter. You allow us to store and process it only as needed to provide
          the service, as described in the <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </Section>

      <Section id="disclaimer" title="6. No financial advice — AI and calculations">
        <p>
          {SITE.name} is a personal record-keeping tool. Nothing in the app is financial, tax or legal advice.
          Receipt scanning and AI insights are generated automatically and may be wrong or incomplete — always check
          the extracted amounts before saving. Split balances are informational; settling debts between users happens
          outside the app and is solely a matter between those users.
        </p>
      </Section>

      <Section id="availability" title="7. Availability">
        <p>
          We aim to keep the service available but cannot guarantee uninterrupted access. Please export your data
          regularly if it is important to you.
        </p>
      </Section>

      <Section id="liability" title="8. Liability">
        <p>
          We are liable without limitation for intent and gross negligence, for injury to life, body or health, and
          under the German Product Liability Act. For slight negligence we are only liable for breach of an essential
          contractual obligation (one whose fulfilment makes proper performance possible and on which you may
          regularly rely), limited to the typical, foreseeable damage. [LAWYER REVIEW REQUIRED]
        </p>
      </Section>

      <Section id="changes" title="9. Changes to these terms">
        <p>
          We may amend these terms for valid reasons (e.g. new features or legal changes). We will notify you in the
          app at least [NOTICE PERIOD, e.g. 4 weeks] in advance; you can object or delete your account.
        </p>
      </Section>

      <Section id="law" title="10. Governing law">
        <p>
          {LEGAL.governingLaw}, excluding the UN Convention on Contracts for the International Sale of Goods. If you
          are a consumer, this choice of law does not deprive you of the protection of the mandatory provisions of the
          country where you habitually reside.
        </p>
      </Section>

      <Section id="contact" title="11. Contact">
        <p>{c.email}</p>
      </Section>
    </LegalLayout>
  )
}
