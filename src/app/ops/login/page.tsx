import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { OpsLoginForm } from "@/components/ops/OpsLoginForm";
import { capabilities } from "@/lib/env";
import { getCurrentStaff } from "@/lib/ops/dal";

export default async function OpsLoginPage() {
  // Without a database there are no staff accounts to authenticate against, and
  // a form that cannot possibly succeed is worse than a page saying so.
  if (!capabilities.database() || !capabilities.opsConsole()) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <div className="rounded-card border border-border bg-surface p-6">
          <h1 className="font-serif text-xl font-bold text-foreground">
            The ops console is not configured
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            It needs <code className="font-mono text-xs">DATABASE_URL</code> and{" "}
            <code className="font-mono text-xs">OPS_SESSION_SECRET</code>. See{" "}
            <code className="font-mono text-xs">docs/backend/stack.md</code> §6.
          </p>
        </div>
      </main>
    );
  }

  const staff = await getCurrentStaff();
  if (staff) redirect("/ops");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-card border border-border bg-surface p-6 shadow-e2 sm:p-8">
        <div className="mb-6 flex size-11 items-center justify-center rounded-md bg-primary-subtle text-primary-subtle-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>

        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          abizon ops
        </h1>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-muted-foreground">
          Staff access. Every application you open and every document you view is
          recorded against your account.
        </p>

        <OpsLoginForm />
      </div>

      {/* Said on the sign-in screen rather than in a policy document, because
          this is the moment somebody is deciding whether to look something up
          "just to check". */}
      <p className="mt-5 text-2xs leading-relaxed text-muted-foreground">
        This console holds passport scans and dates of birth belonging to real
        people. Access is logged with your name against it and the log is
        retained.
      </p>
    </main>
  );
}
