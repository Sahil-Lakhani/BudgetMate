import { LegalLayout, Section } from "./LegalLayout"
import { LEGAL } from "../../legal/siteConfig"

export default function Imprint() {
  const c = LEGAL.controller

  return (
    <LegalLayout title="Impressum" subtitle="Legal notice — information pursuant to § 5 DDG">
      <Section id="provider" title="Provider">
        <address>
          {c.name}<br />
          {c.legalForm}<br />
          {c.street}<br />
          {c.postcodeCity}<br />
          {c.country}
        </address>
        <p>Represented by: {c.representative}</p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          Email: {c.email}<br />
          Phone: {c.phone}
        </p>
      </Section>

      <Section id="register" title="Register and VAT">
        <p>
          {LEGAL.company.register}<br />
          VAT ID: {LEGAL.company.vatId}
        </p>
      </Section>

      <Section id="content" title="Responsible for content (§ 18(2) MStV)">
        <p>{LEGAL.contentResponsible}</p>
      </Section>

      <Section id="dispute" title="Consumer dispute resolution">
        <p>
          We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer
          arbitration board (§ 36 VSBG). [CONFIRM OR CHANGE THIS STATEMENT]
        </p>
      </Section>

      <Section id="liability" title="Liability for links">
        <p>
          This app contains links to external websites over whose content we have no influence. The respective
          provider is responsible for linked content. We will remove such links promptly if we become aware of any
          infringement.
        </p>
      </Section>
    </LegalLayout>
  )
}
