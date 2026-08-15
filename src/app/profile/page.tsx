import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/ProfileView";
import { listApplications } from "@/lib/applications/repository";
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
 * status, dates. No traveller names, no passport numbers, no documents. A
 * server component that serialises a whole record into the client bundle is how
 * personal data ends up in the RSC payload of a page that only wanted to show a
 * status chip.
 */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  // Without a database there are no applications to list, and the page says so
  // rather than showing an empty state that implies there are none.
  const applications = capabilities.database()
    ? (await listApplications(user.id)).map((application) => ({
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
