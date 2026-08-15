import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * WHO MAY RUN A SCHEDULED JOB.
 * ---------------------------------------------------------------------------
 * These endpoints delete documents and purge tables. Unauthenticated, they are
 * public buttons for destroying data, and they are on predictable URLs.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on every invocation.
 * That is the whole mechanism, and it is enough *provided* the secret is
 * actually set — `env.ts` makes it mandatory in production for exactly that
 * reason, because the failure mode of "forgot to set it" would otherwise be a
 * job that anyone can trigger rather than one that does not run.
 *
 * Compared in constant time. The window is small, but a secret compared with
 * `===` leaks its length and its matching prefix to anyone willing to make
 * enough requests, and the fix is one function call.
 */
export function cronAuthorised(request: Request): boolean {
  const secret = env().CRON_SECRET;

  // In development, a missing secret means the job can be triggered by hand,
  // which is how anyone tests one. Production requires it.
  if (!secret) return process.env.NODE_ENV !== "production";

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const provided = Buffer.from(header);
  const wanted = Buffer.from(expected);

  if (provided.length !== wanted.length) return false;
  return timingSafeEqual(provided, wanted);
}

/**
 * Jobs return their counts. It is tempting to make them return nothing, and it
 * is worth the extra line: "the retention job ran" is not the same claim as
 * "the retention job deleted eleven documents", and only the second one tells
 * you it is working.
 */
export function cronResponse(job: string, result: Record<string, number | string>): Response {
  console.info(`[cron] ${job}`, result);
  return Response.json({ job, ranAt: new Date().toISOString(), ...result });
}

export function cronDenied(): Response {
  // 404 rather than 401. An unauthenticated caller learns nothing about whether
  // the endpoint exists, and there is no legitimate caller to help.
  return new Response("Not found", { status: 404 });
}
