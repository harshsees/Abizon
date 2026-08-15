import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/ProfileView";
import { requireUser } from "@/lib/auth/dal";

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
 */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return <ProfileView phoneE164={user.phoneE164} />;
}
