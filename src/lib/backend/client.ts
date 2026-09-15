import "server-only";

import { randomUUID } from "node:crypto";

import { SignJWT } from "jose";

import { env } from "@/lib/env";

/**
 * THE BACKEND SERVICE CLIENT — how this app calls `backend/`.
 * ---------------------------------------------------------------------------
 * The Python service holds the only AWS role that can touch the documents
 * bucket, runs the Celery workers, and calls Claude on Bedrock. It is not
 * reachable from the internet; this server calls it over the Docker network.
 *
 * ── Who is asking, on every call ──
 *
 * A 60-second HS256 token, signed with `SERVICE_JWT_SECRET`, naming the person
 * this request is for:
 *
 *   applicant   their user id, plus `kp` — the one key prefix
 *               `<applicationId>/<travellerId>/` they may touch
 *   staff       their staff id and *current* role (read from the row by
 *               `requireRole`, never from the cookie)
 *   system      scheduled jobs acting for nobody
 *
 * This app still does every ownership check first. The token means a bug here
 * that names the wrong traveller is refused *there* as well, and the backend's
 * `rbac.json` decides what each role may do.
 *
 * The claim layout must match `backend/app/core/security.py`, which rejects any
 * token whose lifetime is longer than a minute.
 */

export type StaffRole = "viewer" | "processor" | "admin";

export type BackendPrincipal =
  | { type: "applicant"; id: string; keyPrefix: string }
  | { type: "staff"; id: string; role: StaffRole }
  | { type: "system" };

export const SERVICE_TOKEN = {
  issuer: "abizon-web",
  audience: "abizon-backend",
  ttlSeconds: 60,
} as const;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * A failure reported by the backend, carrying its error envelope. `message` is
 * written by the backend to be safe to show; `requestId` joins this to the
 * backend's log line.
 */
export class BackendError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

function claimsFor(principal: BackendPrincipal): { subject: string; claims: Record<string, string> } {
  switch (principal.type) {
    case "applicant":
      return {
        subject: principal.id,
        claims: { typ: "applicant", role: "applicant", kp: principal.keyPrefix },
      };
    case "staff":
      return { subject: principal.id, claims: { typ: "staff", role: principal.role } };
    case "system":
      return { subject: "web", claims: { typ: "system", role: "system" } };
  }
}

export async function signServiceToken(principal: BackendPrincipal): Promise<string> {
  const secret = env().SERVICE_JWT_SECRET;
  if (!secret) {
    throw new Error("SERVICE_JWT_SECRET is not set, so the backend service cannot be called.");
  }

  const { subject, claims } = claimsFor(principal);

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(SERVICE_TOKEN.issuer)
    .setAudience(SERVICE_TOKEN.audience)
    .setSubject(subject)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SERVICE_TOKEN.ttlSeconds}s`)
    .sign(new TextEncoder().encode(secret));
}

function baseUrl(): string {
  const url = env().BACKEND_URL;
  if (!url) throw new Error("BACKEND_URL is not set, so the backend service cannot be called.");
  return url.replace(/\/$/, "");
}

export async function backendRequest<T>(
  principal: BackendPrincipal,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  options: { idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${await signServiceToken(principal)}`,
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[backend] unreachable", error instanceof Error ? error.message : error);
    throw new BackendError(503, "backend_unreachable", "The document service is unavailable. Try again shortly.");
  }

  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; request_id?: string };
    } | null;

    throw new BackendError(
      response.status,
      envelope?.error?.code ?? "backend_error",
      envelope?.error?.message ?? "The document service returned an error.",
      envelope?.error?.request_id ?? response.headers.get("x-request-id") ?? undefined,
    );
  }

  return (await response.json()) as T;
}

/** For `/api/health`. Liveness only — the backend reports its own dependencies. */
export async function pingBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl()}/health/live`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
