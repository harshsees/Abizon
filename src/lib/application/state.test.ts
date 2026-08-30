import { describe, expect, it } from "vitest";

import { countryFromSlug } from "@/lib/countryVisa";
import {
  applicationReducer,
  blockingReason,
  createTraveller,
  documentKey,
  initialState,
  type ApplicationState,
  type DocumentEntry,
  type RestorePayload,
} from "./state";

/**
 * The two pieces of state logic the server wiring added, both of which are
 * easier to get wrong than they look.
 */

/** Thailand asks for a passport and a photograph, which makes it the useful
 *  fixture — a destination requiring nothing would pass every document test. */
const country = countryFromSlug("thailand")!;

function stored(): DocumentEntry {
  return { source: "upload", providedAt: 1, upload: "stored" };
}

function withTravellers(names: string[]): ApplicationState {
  return initialState({
    countrySlug: "thailand",
    travellers: names.map((name) => createTraveller(name)),
  });
}

/**
 * Everything the documents step asks for BESIDES the files.
 *
 * The passport fields and the contact pair used to gate a `details` step of
 * their own. They gate `documents` now, because the screen that collects them
 * — the review of what the scan read — happens inside the passport capture
 * rather than after it. A test about uploads should not have to know that, so
 * it says it here once.
 */
function withConfirmedDetails(state: ApplicationState): ApplicationState {
  for (const traveller of state.travellers) {
    state.details[traveller.id] = {
      fullName: "ASHA KUMARI",
      dateOfBirth: "1994-03-02",
      passportNumber: "Z1234567",
      passportExpiry: "2032-09-01",
      nationality: "Indian",
      gender: "Female",
    };
  }
  state.contact = { email: "asha@example.com", phone: "+919876543210" };
  return state;
}

/* -------------------------------------------------------------------------- */

describe("blockingReason — documents", () => {
  it("passes when every required document is attached and confirmed", () => {
    const state = withConfirmedDetails(withTravellers(["ASHA"]));
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = stored();
    state.documents[documentKey(traveller.id, "photograph")] = stored();

    expect(blockingReason(state, country, "documents")).toBeUndefined();
  });

  it("blocks until the passport fields have been reviewed", () => {
    // Both files attached, nothing confirmed. The review screen lives inside
    // this step, so this is the state somebody is in the moment a scan
    // finishes and before they have looked at what it read.
    const state = withTravellers(["ASHA"]);
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = stored();
    state.documents[documentKey(traveller.id, "photograph")] = stored();

    expect(blockingReason(state, country, "documents")).toMatch(
      /passport details are incomplete for ASHA/i,
    );
  });

  it("blocks without an email and phone number, and asks for both", () => {
    const state = withConfirmedDetails(withTravellers(["ASHA"]));
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = stored();
    state.documents[documentKey(traveller.id, "photograph")] = stored();
    state.contact = { email: "", phone: "" };

    expect(blockingReason(state, country, "documents")).toMatch(/email address/i);
  });

  it("blocks on a failed upload, and says why", () => {
    const state = withTravellers(["ASHA"]);
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = {
      source: "upload",
      providedAt: 1,
      upload: "failed",
      error: "The upload did not complete.",
    };
    state.documents[documentKey(traveller.id, "photograph")] = stored();

    // A file attached in the tab and absent on the server would otherwise carry
    // the applicant to submission believing they had filed.
    expect(blockingReason(state, country, "documents")).toBe(
      "The upload did not complete.",
    );
  });

  it("blocks while an upload is still in flight", () => {
    const state = withTravellers(["ASHA"]);
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = {
      source: "upload",
      providedAt: 1,
      upload: "uploading",
    };
    state.documents[documentKey(traveller.id, "photograph")] = stored();

    expect(blockingReason(state, country, "documents")).toMatch(/still uploading/i);
  });

  it("still allows a purely local flow, where nothing has been uploaded", () => {
    const state = withConfirmedDetails(withTravellers(["ASHA"]));
    const [traveller] = state.travellers;

    // Signed out, or no database. `local` is not a failure and must not block —
    // the flow worked this way before there was a server and still does.
    state.documents[documentKey(traveller.id, "passport")] = {
      source: "upload",
      providedAt: 1,
      upload: "local",
    };
    state.documents[documentKey(traveller.id, "photograph")] = {
      source: "capture",
      providedAt: 1,
      upload: "local",
    };

    expect(blockingReason(state, country, "documents")).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe("setDocumentUpload", () => {
  it("releases the bytes once the upload has succeeded", () => {
    const state = withTravellers(["ASHA"]);
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = {
      source: "upload",
      providedAt: 1,
      upload: "uploading",
      blob: new Blob(["x"]),
    };

    const next = applicationReducer(state, {
      type: "setDocumentUpload",
      travellerId: traveller.id,
      kind: "passport",
      patch: { upload: "stored", documentId: "doc-1" },
    });

    const entry = next.documents[documentKey(traveller.id, "passport")];

    // Four passport scans held for the rest of a session is tens of megabytes
    // on the device least able to spare them, and there is nothing left to
    // retry with once the server has the file.
    expect(entry.blob).toBeUndefined();
    expect(entry.documentId).toBe("doc-1");
  });

  it("keeps the bytes when the upload failed, so a retry has something to send", () => {
    const state = withTravellers(["ASHA"]);
    const [traveller] = state.travellers;

    state.documents[documentKey(traveller.id, "passport")] = {
      source: "upload",
      providedAt: 1,
      upload: "uploading",
      blob: new Blob(["x"]),
    };

    const next = applicationReducer(state, {
      type: "setDocumentUpload",
      travellerId: traveller.id,
      kind: "passport",
      patch: { upload: "failed", error: "Connection lost." },
    });

    const entry = next.documents[documentKey(traveller.id, "passport")];
    expect(entry.blob).toBeDefined();
    expect(entry.error).toBe("Connection lost.");
  });

  it("is inert against a document that was cleared while in flight", () => {
    const state = withTravellers(["ASHA"]);
    const [traveller] = state.travellers;

    // Writing the result back would resurrect a row the applicant just removed.
    const next = applicationReducer(state, {
      type: "setDocumentUpload",
      travellerId: traveller.id,
      kind: "passport",
      patch: { upload: "stored", documentId: "doc-1" },
    });

    expect(next).toBe(state);
  });
});

/* -------------------------------------------------------------------------- */

describe("restore", () => {
  const payload: RestorePayload = {
    travellers: [
      {
        position: 0,
        fullName: "ASHA MENON",
        dateOfBirth: "1990-01-01",
        passportNumber: "L898902C",
        passportExpiry: "2030-01-01",
        nationality: "Indian",
        gender: "female",
        email: "asha@example.com",
        phone: "+919882515043",
      },
    ],
    documents: [
      {
        id: "doc-1",
        travellerPosition: 0,
        kind: "passport",
        status: "pending",
        rejectionReason: null,
      },
    ],
    plan: 1,
    travelDate: "2026-09-01",
    travelWindow: null,
    step: "review",
  };

  it("adopts the whole party when this tab has none", () => {
    const next = applicationReducer(initialState({ countrySlug: "thailand" }), {
      type: "restore",
      payload,
    });

    expect(next.travellers).toHaveLength(1);
    // The card shows a first name; the passport carries the full one.
    expect(next.travellers[0].firstName).toBe("ASHA");

    const details = next.details[next.travellers[0].id];
    expect(details.fullName).toBe("ASHA MENON");
    expect(details.passportNumber).toBe("L898902C");

    expect(next.contact.email).toBe("asha@example.com");
    expect(next.plan).toBe(1);
    expect(next.travelDate).toBe("2026-09-01");
  });

  it("restores a stored document, so an uploaded passport is not asked for twice", () => {
    const next = applicationReducer(initialState({ countrySlug: "thailand" }), {
      type: "restore",
      payload,
    });

    const entry = next.documents[documentKey(next.travellers[0].id, "passport")];
    expect(entry.upload).toBe("stored");
    expect(entry.documentId).toBe("doc-1");
  });

  it("carries a rejection reason back with the document", () => {
    const next = applicationReducer(initialState({ countrySlug: "thailand" }), {
      type: "restore",
      payload: {
        ...payload,
        documents: [
          {
            id: "doc-1",
            travellerPosition: 0,
            kind: "passport",
            status: "rejected",
            rejectionReason: "The number is not legible.",
          },
        ],
      },
    });

    const entry = next.documents[documentKey(next.travellers[0].id, "passport")];
    expect(entry.error).toBe("The number is not legible.");
  });

  it("never overwrites something already typed in this tab", () => {
    const state = withTravellers(["PRIYA"]);
    const [traveller] = state.travellers;

    state.details[traveller.id] = {
      fullName: "PRIYA SHARMA",
      dateOfBirth: "",
      passportNumber: "Z123456",
      passportExpiry: "",
      nationality: "",
      gender: "",
    };

    const next = applicationReducer(state, { type: "restore", payload });
    const details = next.details[traveller.id];

    // The server call resolves after the first paint, so the applicant may be
    // mid-field. What they typed is newer and they are watching it.
    expect(details.fullName).toBe("PRIYA SHARMA");
    expect(details.passportNumber).toBe("Z123456");

    // Empty fields are still filled — that is the useful half of the merge.
    expect(details.dateOfBirth).toBe("1990-01-01");
    expect(details.nationality).toBe("Indian");

    // And the party is not replaced out from under them.
    expect(next.travellers).toHaveLength(1);
    expect(next.travellers[0].firstName).toBe("PRIYA");
  });

  it("does not let the server's plan override one chosen in this tab", () => {
    const state = { ...withTravellers(["PRIYA"]), plan: 0 };
    const withExpress = applicationReducer(state, {
      type: "restore",
      payload: { ...payload, plan: 1 },
    });

    // `plan: 0` is Standard and is also the default, so it cannot be
    // distinguished from "not chosen" — the server's value is taken. Asserted
    // so the behaviour is deliberate rather than accidental.
    expect(withExpress.plan).toBe(1);
  });
});
