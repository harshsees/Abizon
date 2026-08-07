"use client";

/**
 * Schengen appointment availability board.
 *
 * Filterable by mission and city. Availability is expressed as a wait band
 * rather than an exact slot count — slot counts move minute to minute and a
 * precise number on a page that isn't live would be worse than no number.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BellRing, MapPin } from "lucide-react";

import { fadeUp, staggerContainer, VIEWPORT } from "@/lib/motion";

type Availability = "open" | "limited" | "waitlist";

type Mission = {
  country: string;
  code: string;
  city: string;
  availability: Availability;
  wait: string;
  centre: string;
};

const MISSIONS: Mission[] = [
  { country: "France", code: "fr", city: "New Delhi", availability: "open", wait: "6–9 days", centre: "VFS Global" },
  { country: "France", code: "fr", city: "Mumbai", availability: "limited", wait: "14–18 days", centre: "VFS Global" },
  { country: "Germany", code: "de", city: "New Delhi", availability: "limited", wait: "16–21 days", centre: "VFS Global" },
  { country: "Germany", code: "de", city: "Bengaluru", availability: "open", wait: "8–11 days", centre: "VFS Global" },
  { country: "Italy", code: "it", city: "New Delhi", availability: "waitlist", wait: "31+ days", centre: "VFS Global" },
  { country: "Italy", code: "it", city: "Mumbai", availability: "waitlist", wait: "28+ days", centre: "VFS Global" },
  { country: "Netherlands", code: "nl", city: "New Delhi", availability: "open", wait: "5–8 days", centre: "VFS Global" },
  { country: "Spain", code: "es", city: "New Delhi", availability: "limited", wait: "17–22 days", centre: "BLS International" },
  { country: "Spain", code: "es", city: "Mumbai", availability: "waitlist", wait: "26+ days", centre: "BLS International" },
  { country: "Switzerland", code: "ch", city: "New Delhi", availability: "open", wait: "4–7 days", centre: "VFS Global" },
  { country: "Austria", code: "at", city: "New Delhi", availability: "open", wait: "7–10 days", centre: "VFS Global" },
  { country: "Greece", code: "gr", city: "New Delhi", availability: "limited", wait: "13–17 days", centre: "VFS Global" },
  { country: "Portugal", code: "pt", city: "New Delhi", availability: "open", wait: "9–12 days", centre: "VFS Global" },
  { country: "Czech Republic", code: "cz", city: "New Delhi", availability: "open", wait: "6–9 days", centre: "VFS Global" },
  { country: "Belgium", code: "be", city: "New Delhi", availability: "limited", wait: "15–19 days", centre: "VFS Global" },
];

const AVAILABILITY_META: Record<
  Availability,
  { label: string; chip: string; dot: string }
> = {
  open: {
    label: "Slots open",
    chip: "bg-success-subtle text-success-subtle-foreground",
    dot: "bg-success",
  },
  limited: {
    label: "Limited",
    chip: "bg-warning-subtle text-warning-subtle-foreground",
    dot: "bg-warning",
  },
  waitlist: {
    label: "Waitlist only",
    chip: "bg-destructive-subtle text-destructive-subtle-foreground",
    dot: "bg-destructive",
  },
};

export function SchengenAppointmentBoard() {
  const [city, setCity] = useState<string>("All cities");

  const cities = useMemo(
    () => ["All cities", ...new Set(MISSIONS.map((m) => m.city))],
    [],
  );

  const visible = useMemo(
    () => (city === "All cities" ? MISSIONS : MISSIONS.filter((m) => m.city === city)),
    [city],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter by city"
          className="flex flex-wrap gap-2"
        >
          {cities.map((option) => (
            <button
              key={option}
              role="tab"
              aria-selected={city === option}
              onClick={() => setCity(option)}
              className={`rounded-full border px-4 py-2 text-xs font-bold ${
                city === option
                  ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span data-numeric className="font-bold text-foreground">
            {visible.length}
          </span>{" "}
          of {MISSIONS.length} missions
        </p>
      </div>

      <motion.ul
        key={city}
        variants={staggerContainer(0.04)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="mt-6 space-y-2.5"
      >
        {visible.map((mission) => {
          const meta = AVAILABILITY_META[mission.availability];
          return (
            <motion.li
              key={`${mission.country}-${mission.city}`}
              variants={fadeUp}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-e1"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border">
                <img
                  src={`https://flagcdn.com/w80/${mission.code}.png`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full scale-110 object-cover"
                />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">{mission.country}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {mission.city} · {mission.centre}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-wider ${meta.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                <p data-numeric className="mt-1 text-xs font-semibold text-muted-foreground">
                  {mission.wait}
                </p>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-sunken p-5">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="max-w-md text-sm text-muted-foreground">
            Slots at waitlisted missions are released without warning, often at night. We
            monitor continuously and book the moment one opens.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:bg-primary-hover"
        >
          Start a Schengen application
        </Link>
      </div>
    </div>
  );
}
