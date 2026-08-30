"use client";

/**
 * /dev/scan-debug — what the passport reader actually sees.
 *
 * The reader is three stages deep (crop and normalise, OCR, recover), it runs
 * in a worker, and its only output to the flow is "read" or "not read". When it
 * says "not read" there is no way from the outside to tell which stage gave up,
 * and tuning any of them by guesswork means changing something and watching a
 * boolean.
 *
 * This page prints every stage: the prepared crop as an image, the raw OCR text
 * for it, the normalised candidate lines, and the parse with its check digits.
 * It is the tool the pipeline was tuned with and the one to open the next time
 * a real passport fails to read.
 *
 * It sits beside `/dev/payment-preview`, which exists for the same reason: a
 * developer-facing view of something the product hides. Neither is linked from
 * anywhere.
 */

import { useState } from "react";

import { prepare } from "@/lib/passport/preprocess";
import { normaliseLine, recoverMrz } from "@/lib/passport/recover";

type Pass = {
  label: string;
  imageUrl: string;
  text: string;
  candidates: string[];
};

const WINDOWS = [
  { label: "Bottom 38% (the MRZ window)", region: { x: 0, y: 0.62, width: 1, height: 0.38 } },
  { label: "Whole page (the fallback)", region: { x: 0, y: 0, width: 1, height: 1 } },
];

export default function ScanDebugPage() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [summary, setSummary] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = async (file: File) => {
    setBusy(true);
    setPasses([]);
    setSummary(undefined);

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/tesseract-core-simd-lstm.wasm.js",
      langPath: "/tesseract",
      gzip: false,
    });
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      // `PSM.SINGLE_BLOCK`. Written as the enum's own value because the
      // typings take the enum, and importing it here just for a debug page
      // would pull the engine into this route's bundle at module scope.
      tessedit_pageseg_mode: "6" as never,
    });

    const found: Pass[] = [];

    for (const { label, region } of WINDOWS) {
      const prepared = await prepare(file, region);
      const result = await worker.recognize(prepared.blob);
      const text = result.data.text ?? "";

      found.push({
        label,
        imageUrl: URL.createObjectURL(prepared.blob),
        text,
        candidates: text
          .split(/\r?\n/)
          .map(normaliseLine)
          .filter((line) => line.length > 0),
      });

      const recovered = recoverMrz(text);
      if (recovered) {
        setSummary(
          [
            `PARSED from "${label}"`,
            `  checks passed: ${recovered.result.allChecksPassed}`,
            `  ${JSON.stringify(recovered.result.checks)}`,
            `  ${JSON.stringify(recovered.result.fields, null, 2)}`,
          ].join("\n"),
        );
        break;
      }
    }

    await worker.terminate();
    setPasses(found);
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Passport reader debug</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Drop a passport photograph in. Every stage of the read is printed below.
        Nothing leaves this browser.
      </p>

      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void run(file);
        }}
        className="mt-6 block text-sm"
      />

      {busy && <p className="mt-6 text-sm">Reading…</p>}

      {summary && (
        <pre className="mt-6 overflow-x-auto rounded-lg bg-success-subtle p-4 text-xs">
          {summary}
        </pre>
      )}

      {passes.map((pass) => (
        <section key={pass.label} className="mt-10">
          <h2 className="text-base font-bold text-foreground">{pass.label}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL
              made in this tab, on a page no user reaches. */}
          <img
            src={pass.imageUrl}
            alt=""
            className="mt-3 w-full rounded border border-border"
          />
          <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Raw OCR text
          </h3>
          <pre className="mt-1 overflow-x-auto rounded bg-surface-sunken p-3 text-[11px] leading-tight">
            {pass.text || "(nothing)"}
          </pre>
          <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Normalised candidate lines, with lengths
          </h3>
          <pre className="mt-1 overflow-x-auto rounded bg-surface-sunken p-3 text-[11px] leading-tight">
            {pass.candidates
              .map((line) => `${String(line.length).padStart(3)}  ${line}`)
              .join("\n") || "(none)"}
          </pre>
        </section>
      ))}
    </main>
  );
}
