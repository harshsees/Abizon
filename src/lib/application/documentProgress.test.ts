import { describe, expect, it } from "vitest";

import {
  documentHeadline,
  stageCounts,
  summariseDocuments,
  type DocumentProgressInput,
} from "./documentProgress";

function docs(...statuses: string[]): DocumentProgressInput[] {
  return statuses.map((status, index) => ({
    kind: "passport",
    status,
    travellerPosition: 0,
    rejectionReason: status === "rejected" ? "Not legible." : null,
    uploadedAt: index,
  }));
}

describe("summariseDocuments", () => {
  it("counts nothing as nothing rather than dividing by zero", () => {
    expect(summariseDocuments([])).toEqual({
      total: 0,
      checking: 0,
      verified: 0,
      rejected: 0,
      percent: 0,
    });
  });

  it("counts every row as uploaded, because the row IS the upload", () => {
    // There is no `uploaded` value in the enum and there should not be: a row
    // exists only after the bytes were downloaded, normalised and recorded.
    const summary = summariseDocuments(docs("pending", "accepted", "rejected"));
    expect(summary.total).toBe(3);
    expect(summary.checking).toBe(1);
    expect(summary.verified).toBe(1);
    expect(summary.rejected).toBe(1);
  });

  it("reads a third of the way along when everything is freshly uploaded", () => {
    expect(summariseDocuments(docs("pending", "pending", "pending")).percent).toBe(67);
  });

  it("reads full only when everything is accepted", () => {
    expect(summariseDocuments(docs("accepted", "accepted")).percent).toBe(100);
  });

  it("averages rather than taking the least advanced", () => {
    // A bar driven by the minimum would show no movement until the last
    // straggler lands, which is the shape that makes a bar feel broken.
    const summary = summariseDocuments(docs("accepted", "accepted", "accepted", "pending"));
    expect(summary.percent).toBeGreaterThan(
      summariseDocuments(docs("pending", "pending", "pending", "pending")).percent,
    );
  });

  it("does not let a set of rejections read as nearly finished", () => {
    // A rejection has been looked at, so it is past "uploaded" — and it is not
    // going to become verified without being replaced, so it earns no credit
    // for the review stage.
    expect(summariseDocuments(docs("rejected", "rejected", "rejected")).percent).toBe(33);
  });

  it("treats a status it has not been taught as the least advanced", () => {
    expect(summariseDocuments(docs("something_new")).percent).toBe(33);
  });
});

describe("stageCounts", () => {
  it("is cumulative, because a verified document was also uploaded", () => {
    // Partitioned, "Uploaded" would read 0 for a fully verified set — true of
    // the enum and false of the applicant, who uploaded five things.
    const counts = stageCounts(summariseDocuments(docs("accepted", "accepted", "pending")));
    expect(counts).toEqual({ uploaded: 3, checking: 3, verified: 2 });
  });

  it("leaves a rejection out of the two later stages but not the first", () => {
    const counts = stageCounts(summariseDocuments(docs("rejected", "accepted")));
    expect(counts).toEqual({ uploaded: 2, checking: 1, verified: 1 });
  });
});

describe("documentHeadline", () => {
  it("leads with a rejection, whatever else is true", () => {
    // The only state that needs the applicant to do something. Buried under
    // "3 of 4 verified" it gets missed until a consulate asks.
    expect(
      documentHeadline(summariseDocuments(docs("accepted", "accepted", "accepted", "rejected"))),
    ).toBe("One document needs replacing");

    expect(documentHeadline(summariseDocuments(docs("rejected", "rejected")))).toBe(
      "2 documents need replacing",
    );
  });

  it("says so when everything is through", () => {
    expect(documentHeadline(summariseDocuments(docs("accepted")))).toBe(
      "Your document is verified",
    );
    expect(documentHeadline(summariseDocuments(docs("accepted", "accepted")))).toBe(
      "All documents verified",
    );
  });

  it("counts the way through when it is partly done", () => {
    expect(documentHeadline(summariseDocuments(docs("accepted", "pending", "pending")))).toBe(
      "1 of 3 verified",
    );
  });

  it("does not imply an empty account is an empty stage", () => {
    expect(documentHeadline(summariseDocuments([]))).toBe("No documents uploaded yet");
  });
});
