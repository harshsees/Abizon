"use client";

/**
 * Visa photo specification explorer.
 *
 * The diagram is drawn to scale from the selected spec rather than being a
 * fixed illustration — the whole point of the tool is that Schengen and US
 * photos are different shapes, and a generic outline would hide exactly the
 * thing someone came here to check.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Info, X } from "lucide-react";

import { DURATION, EASE } from "@/lib/motion";

type Spec = {
  id: string;
  country: string;
  flag: string;
  /** Millimetres. */
  width: number;
  height: number;
  /** Chin-to-crown height, as a share of total photo height. */
  headMin: number;
  headMax: number;
  background: string;
  notes: string[];
};

const SPECS: Spec[] = [
  {
    id: "schengen",
    country: "Schengen Area",
    flag: "eu",
    width: 35,
    height: 45,
    headMin: 0.7,
    headMax: 0.8,
    background: "Light grey or off-white",
    notes: [
      "Taken within the last 6 months",
      "Neutral expression, mouth closed, both eyes open",
      "No glasses at all — this rule tightened in 2016 and catches most people",
      "Head centred and facing the camera squarely",
    ],
  },
  {
    id: "us",
    country: "United States",
    flag: "us",
    width: 51,
    height: 51,
    headMin: 0.5,
    headMax: 0.69,
    background: "Plain white or off-white",
    notes: [
      "Square format — 2 × 2 inches exactly",
      "Taken within the last 6 months",
      "No glasses, no head covering unless worn daily for religious reasons",
      "Digital uploads must be at least 600 × 600 pixels",
    ],
  },
  {
    id: "uk",
    country: "United Kingdom",
    flag: "gb",
    width: 35,
    height: 45,
    headMin: 0.62,
    headMax: 0.76,
    background: "Light grey or cream — never pure white",
    notes: [
      "No shadows on the face or behind the head",
      "Neutral expression with mouth closed",
      "Nothing covering the face, including hair across the eyes",
      "Must be in sharp focus with no visible compression artefacts",
    ],
  },
  {
    id: "japan",
    country: "Japan",
    flag: "jp",
    width: 45,
    height: 45,
    headMin: 0.6,
    headMax: 0.7,
    background: "Plain white",
    notes: [
      "Square format — 45 × 45mm",
      "Taken within the last 6 months",
      "Head and shoulders visible, no hats or hair ornaments",
      "Name and date of birth written on the reverse for paper submissions",
    ],
  },
  {
    id: "india",
    country: "India",
    flag: "in",
    width: 51,
    height: 51,
    headMin: 0.6,
    headMax: 0.75,
    background: "Plain white",
    notes: [
      "Square format — 2 × 2 inches",
      "Full face, front view, eyes open",
      "No staples, and no part of the face obscured",
      "Digital uploads between 10KB and 1MB in JPEG format",
    ],
  },
  {
    id: "uae",
    country: "United Arab Emirates",
    flag: "ae",
    width: 43,
    height: 55,
    headMin: 0.6,
    headMax: 0.72,
    background: "Plain white",
    notes: [
      "Both ears should be visible where hair permits",
      "No uniforms, and no clothing that resembles one",
      "Taken within the last 3 months — shorter than most countries",
      "Beards are acceptable if habitually worn",
    ],
  },
];

export function PhotoSpecTool() {
  const [active, setActive] = useState<Spec>(SPECS[0]);

  // Scale the drawing so the tallest spec fits a fixed box.
  const SCALE = 4;
  const boxW = active.width * SCALE;
  const boxH = active.height * SCALE;
  const headTop = boxH * (1 - active.headMax) * 0.55;
  const headH = boxH * ((active.headMin + active.headMax) / 2);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Spec picker */}
      <div
        role="tablist"
        aria-label="Destination photo specification"
        className="flex flex-wrap justify-center gap-2"
      >
        {SPECS.map((spec) => {
          const selected = spec.id === active.id;
          return (
            <button
              key={spec.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(spec)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${
                selected
                  ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong"
              }`}
            >
              <span className="h-4 w-5 overflow-hidden rounded-[2px]">
                <img
                  src={`https://flagcdn.com/w40/${spec.flag}.png`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
              {spec.country}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr] md:items-start">
        {/* Scale diagram */}
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-6 shadow-e1">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION.base, ease: EASE.out }}
            className="relative border border-border-strong bg-surface-sunken"
            style={{ width: boxW, height: boxH }}
          >
            {/* Head oval, sized to the mid-point of the permitted range */}
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-[50%] border-2 border-dashed border-primary/70"
              style={{ top: headTop, height: headH, width: headH * 0.72 }}
            />
            {/* Shoulders */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[50%] border-2 border-dashed border-border-strong"
              style={{ height: boxH * 0.16, width: boxW * 0.78 }}
            />

            {/* Head-height bracket */}
            <div
              className="absolute -left-6 flex flex-col items-center"
              style={{ top: headTop, height: headH }}
            >
              <span className="h-full w-px bg-primary" />
            </div>
          </motion.div>

          <dl className="mt-5 space-y-1.5 text-center">
            <div>
              <dt className="sr-only">Dimensions</dt>
              <dd data-numeric className="text-sm font-black text-foreground">
                {active.width} × {active.height} mm
              </dd>
            </div>
            <div>
              <dt className="sr-only">Head height</dt>
              <dd data-numeric className="text-2xs font-semibold text-primary">
                Head {Math.round(active.headMin * 100)}–{Math.round(active.headMax * 100)}% of
                height
              </dd>
            </div>
          </dl>
        </div>

        {/* Requirements */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {active.country} photo requirements
          </h3>

          <dl className="mt-4 grid grid-cols-2 gap-4 border-b border-border pb-5">
            {[
              ["Size", `${active.width} × ${active.height} mm`],
              ["Background", active.background],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-5 space-y-2.5">
            {active.notes.map((note) => (
              <li key={note} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-subtle-foreground">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{note}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2.5 border-t border-border pt-5">
            <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
              Rejected for
            </p>
            {[
              "Smiling, or any expression other than neutral",
              "Shadows behind the head or across one side of the face",
              "Photos cropped from a group picture or a selfie at arm's length",
            ].map((reason) => (
              <div key={reason} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-destructive-subtle text-destructive-subtle-foreground">
                  <X className="h-3 w-3 stroke-[3]" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-surface-sunken p-3.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              When you apply through Abizon, your photo is checked against this specification
              automatically before submission — an uncertain photo is flagged for human review
              rather than rejected outright.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
