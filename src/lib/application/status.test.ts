import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUSES,
  SEQUENCE_STATUSES,
  statusFromDatabase,
  statusIndex,
} from "./status";

/**
 * The vocabulary translation between the schema and the interface.
 *
 * The database names an event — `decided`, `closed` — and the interface names
 * what the applicant sees — "Decision issued", "Delivered". One translation, in
 * one place, tested, because the failure mode of getting it wrong is a tracking
 * page that shows the wrong stage rather than an error anybody notices.
 */

describe("statusFromDatabase", () => {
  it("translates the two names that differ", () => {
    expect(statusFromDatabase("decided")).toBe("decision");
    expect(statusFromDatabase("closed")).toBe("completed");
  });

  it("passes through the ones that match", () => {
    for (const value of [
      "draft",
      "ready",
      "submitted",
      "received",
      "processing",
      "withdrawn",
    ]) {
      expect(statusFromDatabase(value)).toBe(value);
    }
  });

  it("falls back to the last thing certainly true, not to an invented stage", () => {
    // A schema that has moved ahead of the interface. Reporting `submitted` is
    // safe: anything with a status at all has been submitted.
    expect(statusFromDatabase("something-new")).toBe("submitted");
  });

  it("covers every status the database enum can hold", () => {
    // The schema's `application_status` enum, verbatim. If a value is added
    // there and not handled here, this fails rather than silently becoming
    // "submitted" on the tracking page.
    const enumValues = [
      "draft",
      "ready",
      "submitted",
      "received",
      "processing",
      "decided",
      "closed",
      "withdrawn",
    ];

    for (const value of enumValues) {
      const translated = statusFromDatabase(value);
      expect(APPLICATION_STATUSES.map((status) => status.id)).toContain(translated);
    }
  });
});

describe("the lifecycle", () => {
  it("keeps withdrawn out of the journey", () => {
    // It is where an application stops, not a stage everybody passes through.
    // Drawing it as step eight would be wrong for every application that never
    // reaches it, which is almost all of them.
    expect(SEQUENCE_STATUSES.map((status) => status.id)).not.toContain("withdrawn");
    expect(statusIndex("withdrawn")).toBe(-1);
  });

  it("orders the journey as it actually happens", () => {
    expect(SEQUENCE_STATUSES.map((status) => status.id)).toEqual([
      "draft",
      "ready",
      "submitted",
      "received",
      "processing",
      "decision",
      "completed",
    ]);
  });

  it("reports every status as supported, now that each has a source", () => {
    // This assertion is the point of the file. Every one of these used to be
    // `supported: false` from `submitted` onward, because nothing could observe
    // them. They are observable now — the first two from the application state,
    // the rest from a transition a named member of staff recorded — and if that
    // ever stops being true this test is what says so.
    for (const status of APPLICATION_STATUSES) {
      expect(status.supported).toBe(true);
    }
  });
});
