// ─────────────────────────────────────────────────────────────────────────────
// Legal & business details used by the Privacy Policy, Impressum and Terms.
// EVERY value in [BRACKETS] must be replaced before launch. Nothing here was
// invented — the brackets mark information only you can provide.
// Have the final texts reviewed by a qualified lawyer.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  name: "BudgetMate",
  url: import.meta.env.VITE_SITE_URL || "[SITE URL]",
}

export const LEGAL = {
  // Date shown as "Last updated" on each legal page — change whenever you edit them
  lastUpdated: "[DATE OF LAST UPDATE, e.g. 1 October 2026]",

  // Controller (Verantwortlicher) under Art. 4(7) GDPR and provider under § 5 DDG
  controller: {
    name: "[LEGAL NAME — full name of the person or company]",
    legalForm: "[LEGAL FORM — e.g. private individual / Einzelunternehmen / UG (haftungsbeschränkt) / GmbH; delete if a private individual]",
    representative: "[AUTHORISED REPRESENTATIVE — e.g. managing director; delete if a private individual]",
    street: "[STREET AND HOUSE NUMBER — must be a serviceable address, not a P.O. box]",
    postcodeCity: "[POSTCODE CITY]",
    country: "[COUNTRY]",
    email: "[EMAIL]",
    phone: "[PHONE NUMBER — or a second fast, direct contact channel such as a contact form]",
  },

  // Delete the lines that do not apply to you (e.g. a private individual has no register entry)
  company: {
    register: "[COMMERCIAL REGISTER AND NUMBER — e.g. Amtsgericht München, HRB 123456; delete if not registered]",
    vatId: "[VAT ID under § 27a UStG — delete if you have none]",
  },

  // Person responsible for content under § 18(2) MStV (only needed for journalistic/editorial content)
  contentResponsible: "[NAME AND ADDRESS — delete this if the site has no journalistic/editorial content]",

  // Data protection officer — only required in certain cases (Art. 37 GDPR / § 38 BDSG)
  dpo: "[DATA PROTECTION OFFICER CONTACT — or delete if you are not required to appoint one]",

  // Competent data-protection supervisory authority (usually the one of your German state)
  supervisoryAuthority: "[SUPERVISORY AUTHORITY — name, address and website of the authority for your state]",

  // Where your Firestore database lives (Firebase console → Firestore → Settings → Location)
  firestoreLocation: "[FIRESTORE LOCATION — e.g. eur3 (Europe) / europe-west3 (Frankfurt)]",

  // Minimum age to create an account (GDPR Art. 8 default in Germany is 16)
  minimumAge: "[MINIMUM AGE — e.g. 16]",

  // Governing law / court clauses for the Terms
  governingLaw: "[GOVERNING LAW — e.g. the laws of the Federal Republic of Germany]",
}
