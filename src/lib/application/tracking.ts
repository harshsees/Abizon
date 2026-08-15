import "server-only";

import { trackByReference } from "@/lib/applications/repository";
import { capabilities } from "@/lib/env";
import {
  statusFromDatabase,
  type ApplicationStatusId,
  type TrackingLookup,
} from "./status";

/**
 * THE LOOKUP THE STATUS MODEL WAS BUILT AROUND.
 * ---------------------------------------------------------------------------
 * `status.ts` used to carry a stub of this that returned `{ available: false }`
 * unconditionally, with a comment saying it was "the one function to implement
 * when an applications API exists". This is that implementation, and it lives
 * in its own file for one reason: `status.ts` is imported by `TrackingTimeline`,
 * which is a client component, and a database import there would end the build.
 * The model stays shared; the query is server-only.
 *
 * ── What a reference discloses, and why that is the ceiling ──
 *
 * `/track/<reference>` is a public page — deliberately, because the most common
 * use of it is an applicant reading their reference off a message on a phone
 * they are not signed in on. A reference is eight characters from a 32-letter
 * alphabet, which is not a secret, so this returns only what somebody guessing
 * one should be allowed to learn: that an application exists, which destination
 * it is for, and how far along it is.
 *
 * No name, no passport number, no document, no contact detail. That is enforced
 * by `trackByReference` selecting four columns rather than by this file
 * remembering to strip anything.
 */
export async function lookupApplicationStatus(
  reference: string,
): Promise<TrackingLookup> {
  // No database means nothing was consulted, and the page must say so rather
  // than reporting "not found" — which would tell an applicant their
  // application does not exist when in fact nobody looked.
  if (!capabilities.database()) {
    return { available: false, reason: "no-status-service" };
  }

  // Cheap rejection of anything that cannot be a reference, before a query.
  // `ABZ-XXXX-XXXX`, from an alphabet with no I, O, 0 or 1 — see `newReference`.
  const cleaned = reference.trim().toUpperCase();
  if (!/^ABZ-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(cleaned)) {
    return { available: false, reason: "not-found" };
  }

  const found = await trackByReference(cleaned);
  if (!found) {
    return { available: false, reason: "not-found" };
  }

  return {
    available: true,
    reference: found.reference,
    countrySlug: found.countrySlug,
    status: statusFromDatabase(found.status),
    events: found.events.map((event, index) => ({
      // `application_events` rows have ids, and they are not returned: an id is
      // a handle to a record, and a public page has no business handing out
      // handles to records. The index is enough for a React key.
      id: `${found.reference}-${index}`,
      status: statusFromDatabase(event.status) as ApplicationStatusId,
      at: new Date(event.at).toISOString(),
      note: event.note ?? undefined,
    })),
  };
}
