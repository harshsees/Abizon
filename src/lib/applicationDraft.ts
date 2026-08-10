/**
 * APPLICATION DRAFTS
 * ---------------------------------------------------------------------------
 * Lets a country page offer "Resume application" instead of always "Start
 * application", without pretending there is a server.
 *
 * WHAT THIS IS: a record, in this browser's localStorage, that the visitor
 * began an application for a country and what they chose on the way in.
 *
 * WHAT THIS IS NOT: an account, a synced application, or a submission. It does
 * not survive a different device, a different browser, or cleared site data,
 * and nothing here is sent anywhere. The UI copy is written to match that — it
 * says the application was started, never that it is saved to an account.
 *
 * When a real applications API exists, replace the three functions below and
 * the panel needs no changes: it already treats the draft as "possibly absent".
 */

const STORAGE_KEY = "keyrise.application.drafts.v1";

/** How long a draft stays offerable before it is treated as stale. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type ApplicationDraft = {
  /** Country slug — the same identifier the apply route takes. */
  slug: string;
  /** Epoch ms. Used to expire drafts and to render "started 2 days ago". */
  startedAt: number;
  /** What the visitor chose on the country page, if anything. */
  travellers?: number;
  /** ISO date (yyyy-mm-dd) when a specific travel date was picked. */
  travelDate?: string;
  /** Index into the processing options. */
  plan?: number;
};

type DraftMap = Record<string, ApplicationDraft>;

function read(): DraftMap {
  // SSR and privacy modes both need to be survivable, not just handled.
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DraftMap) : {};
  } catch {
    return {};
  }
}

function write(map: DraftMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota or a blocked store. A draft is a convenience, never a
    // precondition — failing to save one must not break starting an
    // application.
  }
}

/** The draft for a country, if there is a fresh one. */
export function getDraft(slug: string): ApplicationDraft | undefined {
  return freshOnly(read()[slug]);
}

function freshOnly(draft?: ApplicationDraft): ApplicationDraft | undefined {
  if (!draft) return undefined;
  return Date.now() - draft.startedAt > MAX_AGE_MS ? undefined : draft;
}

/* -------------------------------------------------------------------------- */
/* React integration                                                          */
/* -------------------------------------------------------------------------- */

/**
 * localStorage is an external store, so components read it through
 * `useSyncExternalStore` rather than an effect that calls setState on mount.
 * That is not lint appeasement: the effect approach renders once with "no
 * draft", then again with one, so the CTA visibly flips from "Start" to
 * "Resume" after paint. This way React has the client value before it commits.
 *
 * `getSnapshot` must be referentially stable between real changes or React
 * re-renders forever, so the parsed map is cached against the raw string.
 */
const EMPTY: DraftMap = {};

let cachedRaw: string | null = null;
let cachedMap: DraftMap = EMPTY;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing a draft should update this one.
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

export function getDraftsSnapshot(): DraftMap {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedMap = raw ? (JSON.parse(raw) as DraftMap) : EMPTY;
    } catch {
      cachedMap = EMPTY;
    }
  }
  return cachedMap;
}

/** The server has no drafts, and must not pretend otherwise. */
export function getServerDraftsSnapshot(): DraftMap {
  return EMPTY;
}

/** Read one country's draft out of a snapshot. */
export function selectDraft(
  drafts: DraftMap,
  slug: string,
): ApplicationDraft | undefined {
  return freshOnly(drafts[slug]);
}

/** Record that an application was begun, or update what it carries. */
export function saveDraft(
  slug: string,
  details: Omit<ApplicationDraft, "slug" | "startedAt"> = {},
): void {
  const map = { ...read() };
  map[slug] = {
    slug,
    startedAt: map[slug]?.startedAt ?? Date.now(),
    ...details,
  };
  write(map);
  notify();
}

export function clearDraft(slug: string): void {
  const map = { ...read() };
  delete map[slug];
  write(map);
  notify();
}

/** "today", "yesterday", "3 days ago" — for the resume prompt. */
export function describeAge(startedAt: number): string {
  const days = Math.floor((Date.now() - startedAt) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
