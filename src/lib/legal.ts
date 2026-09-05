/**
 * THE FACTS INDIAN LAW REQUIRES THIS SITE TO PUBLISH
 * ---------------------------------------------------------------------------
 * Three separate instruments oblige an Indian consumer-facing service to state
 * who it is and who to complain to, and they do not agree on the details — so
 * the details live here once and the pages read them, rather than three legal
 * pages each carrying their own copy of an address that will be edited in two
 * of them.
 *
 *   Consumer Protection (E-Commerce) Rules 2020, r.4(3) and r.5(3)
 *       The legal name of the entity, the address of its headquarters and
 *       branches, its customer care contact, and the name, contact and
 *       designation of a Grievance Officer. Complaints acknowledged within
 *       FORTY-EIGHT HOURS and redressed within ONE MONTH of receipt.
 *
 *   IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021,
 *   r.3(2)
 *       A Grievance Officer, named, with contact details published on the
 *       site. Complaints acknowledged within TWENTY-FOUR HOURS and disposed of
 *       within FIFTEEN DAYS.
 *
 *   Digital Personal Data Protection Act 2023, s.13 and s.5
 *       A readily available means of grievance redressal for Data Principals,
 *       and the contact details of a person able to answer questions about the
 *       processing. Escalation to the Data Protection Board of India once the
 *       organisation's own process is exhausted.
 *
 * WHERE THEY DISAGREE, THE SHORTER PERIOD IS PUBLISHED. Twenty-four hours to
 * acknowledge and fifteen days to resolve satisfies all three; forty-eight
 * hours and a month satisfies one of them and breaches another. A published
 * commitment is also a promise to the person reading it, so the site should
 * not advertise the longest period it can defend.
 *
 * ── Why the values are empty and the pages say so ──
 *
 * A registered company name, a CIN, a GSTIN and the name of a real employee
 * are facts about a business, and this file has no way to know any of them.
 * Inventing them would put a fabricated corporate identity and a fabricated
 * officer on a page whose entire purpose is to be relied upon — which is worse
 * than publishing nothing, because nothing is visibly incomplete and a
 * plausible fake is not.
 *
 * So they are blank, `disclosuresComplete()` reports it, and the legal pages
 * render a visible gap rather than quietly dropping the statutory section. A
 * missing disclosure that is obvious gets filled in; one that is silent does
 * not.
 *
 * TO GO LIVE: fill in every field below. Nothing else needs changing.
 */

export type LegalEntity = {
  /** As registered with the MCA, including the suffix. */
  registeredName: string;
  /** Corporate Identity Number, if incorporated. */
  cin: string;
  /** GST Identification Number. Required on the invoice as well as here. */
  gstin: string;
  /** The registered office, as filed. Not a trading address. */
  registeredAddress: string;
};

export type GrievanceOfficer = {
  /** A named individual. The Rules require a name, not a role mailbox. */
  name: string;
  designation: string;
  email: string;
  /** The address at which the officer may be served. */
  address: string;
  /** Optional. A phone number is not required by either set of rules. */
  phone?: string;
};

export const LEGAL_ENTITY: LegalEntity = {
  registeredName: "",
  cin: "",
  gstin: "",
  registeredAddress: "",
};

export const GRIEVANCE_OFFICER: GrievanceOfficer = {
  name: "",
  designation: "Grievance Officer",
  email: "grievance@abizon.com",
  address: "",
};

/**
 * The periods, as published.
 *
 * Constants rather than sentences in the copy, because they appear on three
 * pages and in the acknowledgement email, and a promise that says fifteen days
 * in one place and thirty in another is a promise that has already been broken
 * once by whoever is reading it.
 */
export const GRIEVANCE_ACKNOWLEDGEMENT_HOURS = 24;
export const GRIEVANCE_RESOLUTION_DAYS = 15;

/** GST on the service fee. The government fee is a pass-through and is not
 *  a supply by us, so it is not taxed here — see the terms. */
export const GST_RATE_PERCENT = 18;

/**
 * Is every statutory field filled in?
 *
 * The pages branch on this. A page that renders a Grievance Officer section
 * with an empty name is publishing a false compliance claim; a page that omits
 * it entirely is silently non-compliant. The third option — saying plainly
 * that it is not yet published — is the only one that is both honest and
 * fixable.
 */
export function disclosuresComplete(): boolean {
  return (
    LEGAL_ENTITY.registeredName.trim().length > 0 &&
    LEGAL_ENTITY.registeredAddress.trim().length > 0 &&
    LEGAL_ENTITY.gstin.trim().length > 0 &&
    GRIEVANCE_OFFICER.name.trim().length > 0 &&
    GRIEVANCE_OFFICER.address.trim().length > 0
  );
}
