import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/ProfileView";
import { listApplications, listDocumentProgress } from "@/lib/applications/repository";
import { requireUser } from "@/lib/auth/dal";
import { resolveCountry } from "@/lib/countryCatalogue";
import { capabilities } from "@/lib/env";

export const metadata: Metadata = {
  title: "Your profile | Abizon",
  description: "Your Abizon account, applications and travel documents.",
  robots: { index: false, follow: false },
};

/**
 * `proxy.ts` has already bounced signed-out visitors before this renders, but
 * `requireUser()` runs anyway and is the check that actually matters. The proxy
 * is an optimisation on the redirect; this is the authorisation.
 *
 * Forced dynamic because the page is per-user by definition. Without it a
 * build-time render could produce one cached profile served to everybody.
 *
 * THE APPLICATION LIST IS FETCHED HERE, not in the client component. It is the
 * same rule as the identity: one place decides what this user may see, and it
 * is the route. `listApplications` scopes to `userId` in its `where` clause, so
 * there is no version of this that returns somebody else's applications.
 *
 * Only what the list needs crosses the boundary — reference, destination,
 * status, dates, and now each document's KIND and REVIEW STATE. No traveller
 * names, no passport numbers, no storage paths. A server component that
 * serialises a whole record into the client bundle is how personal data ends
 * up in the RSC payload of a page that only wanted to show a status chip.
 *
 * The document rows are the newest thing to cross that boundary and the line
 * was redrawn rather than moved: `listDocumentProgress` selects five columns,
 * and `storage_path` — the one value that, with a service key, addresses
 * somebody's passport scan — is not among them. The tracker is labelled
 * "Traveller 2" rather than by name for the same reason, and that is enough to
 * tell two passports apart, which is all it has to do.
 */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  // Without a database there are no applications to list, and the page says so
  // rather than showing an empty state that implies there are none.
  //
  // Two queries in parallel rather than one per application: see
  // `listDocumentProgress` for why the obvious shape is nineteen round trips
  // for an applicant with six applications.
  const [applicationRows, documentRows] = capabilities.database()
    ? await Promise.all([listApplications(user.id), listDocumentProgress(user.id)])
    : [[], []];

  const documentsByApplication = new Map<string, typeof documentRows>();
  for (const document of documentRows) {
    const existing = documentsByApplication.get(document.applicationId);
    if (existing) existing.push(document);
    else documentsByApplication.set(document.applicationId, [document]);
  }

  const applications = capabilities.database()
    ? applicationRows.map((application) => ({
        id: application.id,
        reference: application.reference,
        countrySlug: application.countrySlug,
        countryName:
          resolveCountry(application.countrySlug)?.name ?? application.countrySlug,
        status: application.status,
        travellerCount: application.travellerCount,
        travelDate: application.travelDate,
        updatedAt: application.updatedAt,
        submittedAt: application.submittedAt,
        documents: (documentsByApplication.get(application.id) ?? []).map((document) => ({
          kind: document.kind,
          status: document.status,
          travellerPosition: document.travellerPosition,
          rejectionReason: document.rejectionReason,
          uploadedAt: document.uploadedAt,
        })),
      }))
    : [];

  return (
    <ProfileView
      phoneE164={user.phoneE164}
      applications={applications}
      backendReady={capabilities.database()}
    />
  );
}
