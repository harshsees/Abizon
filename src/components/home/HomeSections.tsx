"use client";

/**
 * THE HOMEPAGE BELOW THE HALL.
 *
 * The stage above is a daylight sky whose floor is this page's paper, and the
 * sections carry on on that paper. They are set like a printed brochure rather than a stack of
 * glowing cards: a numbered label in the left margin, a serif headline, hairline
 * rules between rows, and one worked object per section — a proportional bar,
 * a ledger, a mock of the application, a receipt — instead of icon tiles.
 *
 * The order puts something to act on first, then the reassurance, then the
 * explanation for anyone who wants it:
 *   01  Where can I go?                     Collections
 *   02  What do I have to do?               HowItWorks
 *   03  Why should I trust you with it?     Guarantee
 *   04  What is abizon?                     About
 *   05  What will you do for me?            Services
 *   06  What else is here?                  Tools
 *   07  Questions, then a way back up.      Faq, Closing
 * Each section takes its number from the page, so the order lives only in
 * `app/page.tsx`.
 *
 * The rule from the previous version still holds: every number is computed
 * from `countriesData` and every link goes to a route that exists. There are no
 * testimonials, ratings or customer counts here, because Abizon has none that
 * are real yet (see `Reviews.tsx`).
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ClipboardCheck,
  FileSearch,
  Globe2,
  ListChecks,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { CountryImagePlate } from "@/components/CountryImagePlate";
import type { FilterValues } from "@/components/CountryFilters";
import { countriesData, getCountrySlug, type Country } from "@/data/countries";
import { ARRIVAL_CARDS, arrivalCardFor } from "@/lib/arrivalCard";
import { visaOptionsFor } from "@/data/visaOptions";
import { countryCardImage } from "@/lib/countryImagery";
import { formatGovernmentFee, formatShortDate } from "@/lib/countryVisa";
import { cn } from "@/lib/utils";

import { Stamp } from "./PassportMarks";
import { RouteMap } from "./RouteMap";

type ShowInHall = (filters: Partial<FilterValues>) => void;

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

/** The pill label used directly under the stage. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-raised px-2.5 py-1 text-[11px] font-medium text-ink-muted">
      {children}
    </span>
  );
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** The margin label: section number and name, small caps, faint. */
function Label({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">
      <span className="font-mono tracking-normal text-ink">{index}</span>
      <span aria-hidden className="h-px w-4 bg-rule" />
      {children}
    </p>
  );
}

/**
 * Every section opens the same way: a hairline across the full measure, the
 * label in the left margin, the headline beside it.
 */
function SectionHead({
  index,
  label,
  title,
  id,
  aside,
}: {
  index: string;
  label: string;
  title: ReactNode;
  id: string;
  aside?: ReactNode;
}) {
  return (
    <Reveal className="grid grid-cols-1 gap-5 border-t border-rule pt-6 md:grid-cols-[200px_1fr] md:gap-8">
      <Label index={index}>{label}</Label>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h2
          id={id}
          className="max-w-3xl font-serif text-[34px] font-light leading-[1.06] tracking-[-0.02em] text-ink md:text-[52px]"
        >
          {title}
        </h2>
        {aside}
      </div>
    </Reveal>
  );
}

function TextLink({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const className =
    "group inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-ink underline decoration-rule decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink";
  const inner = (
    <>
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/** One row per destination: a couple of countries carry two products. */
function uniqueDestinations(rows: Country[]): Country[] {
  const seen = new Set<string>();
  return rows.filter((c) => {
    const slug = getCountrySlug(c.name);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

const SECTION = "py-16 md:py-24";

/* -------------------------------------------------------------------------- */
/* About — what abizon is, in plain words, and where an Indian passport goes  */
/* -------------------------------------------------------------------------- */

const VISA_KINDS: {
  type: Country["visaType"];
  label: string;
  body: string;
  /** Tone of the segment: an ink ramp, darkest for the most involved. */
  tone: string;
  onTone: string;
}[] = [
  {
    type: "E-Visa",
    label: "E-visa",
    body: "Apply online. Your visa comes by email.",
    tone: "bg-ink",
    onTone: "text-paper",
  },
  {
    type: "Sticker Visa",
    label: "Embassy visa",
    body: "You visit the embassy. We prepare your papers.",
    tone: "bg-ink/65",
    onTone: "text-paper",
  },
  {
    type: "Visa on Arrival",
    label: "Visa on arrival",
    body: "You get the visa when you land.",
    tone: "bg-ink/35",
    onTone: "text-ink",
  },
  {
    type: "Visa Free",
    label: "Visa free",
    body: "No visa needed. Just your passport.",
    tone: "bg-ink/[0.12]",
    onTone: "text-ink",
  },
];

/** Three questions a newcomer has, answered in a sentence each. */
const ABOUT: { q: string; a: string }[] = [
  {
    q: "Who we are",
    a: "An online visa service for people travelling on an Indian passport.",
  },
  {
    q: "What we do",
    a: "We check your documents, send your application to the government, and follow it until your visa arrives.",
  },
  {
    q: "What you get",
    a: "Your visa's delivery date before you pay. If we are late, you don't pay our fee.",
  },
];

export function About({ index, onShowInHall }: { index: string; onShowInHall: ShowInHall }) {
  const total = countriesData.length;
  const counts = useMemo(
    () =>
      Object.fromEntries(
        VISA_KINDS.map((k) => [k.type, countriesData.filter((c) => c.visaType === k.type).length]),
      ) as Record<Country["visaType"], number>,
    [],
  );
  const [hover, setHover] = useState<Country["visaType"] | null>(null);

  return (
    <section aria-labelledby="about-title" className={SECTION}>
      <SectionHead
        index={index}
        label="About abizon"
        id="about-title"
        title="We apply for your visa, so you don't have to."
      />

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-[200px_1fr]">
        <div aria-hidden className="hidden md:block" />
        {/* A <dl> may hold only one layer of <div> around its pairs, so the
            Reveal is that layer rather than a wrapper around it. */}
        <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {ABOUT.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05} className="border-t border-ink pt-4">
              <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">{item.q}</dt>
              <dd className="mt-3 font-serif text-[21px] leading-snug text-ink md:text-[23px]">{item.a}</dd>
            </Reveal>
          ))}
        </dl>
      </div>

      {/* The catalogue on the map, from where the reader is standing, and
          then what it asks of their passport, as one bar. */}
      <Reveal className="mt-16 md:mt-20" delay={0.05}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-8">
          <p className="text-sm leading-snug text-ink-muted md:pt-1">
            <span className="block font-medium text-ink">Where you can go from India</span>
            <span className="mt-1 block">{total} countries, split by the kind of visa they ask for.</span>
            <span className="mt-2 hidden text-ink-faint md:block">Point at a visa type to see where it takes you.</span>
          </p>
          <div>
            <div className="mb-6 md:mb-8">
              <RouteMap highlight={hover} />
            </div>
            <div className="flex h-12 w-full gap-[3px] overflow-hidden rounded-lg md:h-14" role="list">
              {VISA_KINDS.map((k) => {
                const n = counts[k.type];
                if (!n) return null;
                const active = hover === k.type;
                // The list item is its own element: a <button> cannot take
                // role="listitem" without losing its role as a button.
                return (
                  <div key={k.type} role="listitem" className="flex min-w-0" style={{ flexGrow: n, flexBasis: 0 }}>
                    <button
                      type="button"
                      aria-label={`${k.label}: ${n} countries. Show them at the top of the page.`}
                      onClick={() => onShowInHall({ type: k.type })}
                      onMouseEnter={() => setHover(k.type)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(k.type)}
                      onBlur={() => setHover(null)}
                      className={cn(
                        "flex w-full min-w-0 cursor-pointer items-center px-3 font-mono text-xs tabular-nums transition-colors duration-200",
                        active ? "bg-primary text-on-primary" : cn(k.tone, k.onTone),
                      )}
                    >
                      <span className="truncate">{n}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {VISA_KINDS.map((k) => {
                const n = counts[k.type];
                if (!n) return null;
                const active = hover === k.type;
                return (
                  <div
                    key={k.type}
                    onMouseEnter={() => setHover(k.type)}
                    onMouseLeave={() => setHover(null)}
                    className="border-t border-rule pt-4"
                  >
                    <dt className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <span
                        aria-hidden
                        className={cn(
                          "h-2.5 w-2.5 rounded-[2px] ring-1 ring-ink/10 transition-colors",
                          active ? "bg-primary" : k.tone,
                        )}
                      />
                      {k.label}
                    </dt>
                    <dd>
                      <span className="mt-2 block font-serif text-[40px] leading-none tracking-[-0.02em] text-ink tabular-nums">
                        {n}
                      </span>
                      <span className="mt-2 block text-[14px] leading-relaxed text-ink-muted">{k.body}</span>
                      <button
                        type="button"
                        onClick={() => onShowInHall({ type: k.type })}
                        className="mt-3 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-ink hover:text-primary"
                      >
                        Show these countries
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* What we help with — every kind of help, one plain line each                 */
/* -------------------------------------------------------------------------- */

export function Services({ index, onShowInHall }: { index: string; onShowInHall: ShowInHall }) {
  const count = (type: Country["visaType"]) => countriesData.filter((c) => c.visaType === type).length;
  const arrivalCards = useMemo(
    () =>
      Object.keys(ARRIVAL_CARDS)
        .map((slug) => ({ slug, country: countriesData.find((c) => getCountrySlug(c.name) === slug) }))
        .filter((a): a is { slug: string; country: Country } => Boolean(a.country)),
    [],
  );

  const rows: { title: string; body: ReactNode; action: ReactNode }[] = [
    {
      title: "E-visas",
      body: `Apply online and get your visa by email. Available for ${count("E-Visa")} countries.`,
      action: <TextLink onClick={() => onShowInHall({ type: "E-Visa" })}>Show e-visa countries</TextLink>,
    },
    {
      title: "Embassy visas",
      body: "For countries like the UK and the Schengen area, where you visit the embassy. We prepare your papers and tell you what to bring.",
      action: <TextLink onClick={() => onShowInHall({ type: "Sticker Visa" })}>Show embassy visa countries</TextLink>,
    },
    {
      title: "Arrival cards",
      body: (
        <>
          Free. Some countries ask you to fill in a form before you land. We fill it in for you.
          <span className="mt-3 flex flex-wrap gap-1.5">
            {arrivalCards.map(({ slug, country }) => (
              <Link
                key={slug}
                href={`/arrival-card/${slug}`}
                className="rounded-full border border-rule bg-paper-raised px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                {country.name}
              </Link>
            ))}
          </span>
        </>
      ),
      action: null,
    },
    {
      title: "No visa needed",
      body: "Visa free, or a visa you get when you land. We tell you what to show at the airport.",
      action: <TextLink onClick={() => onShowInHall({ type: "Visa Free" })}>Show visa-free countries</TextLink>,
    },
    {
      title: "Student visas",
      body: "Studying in the US, UK, Canada, Australia or Europe? We help with the visa and the proof of funds each country asks for.",
      action: <TextLink href="/student-visa">Student visas</TextLink>,
    },
    {
      title: "Visa refused?",
      body: "We find out why, tell you honestly whether trying again will work, and if you do, you pay only the government fee.",
      action: <TextLink href="/rejection-recovery">Apply again</TextLink>,
    },
    {
      title: "Armed forces",
      body: "Serving or retired? You and your family pay no service fee, on any visa.",
      action: <TextLink href="/defense-personnel">How it works</TextLink>,
    },
  ];

  return (
    <section aria-labelledby="services-title" className={SECTION}>
      <SectionHead index={index} label="Our services" id="services-title" title="What we can help you with." />

      <ol className="mt-10 border-t border-rule md:mt-14">
        {rows.map((row, i) => (
          <li key={row.title}>
            <Reveal delay={i * 0.03}>
              <div className="grid grid-cols-1 gap-3 border-b border-rule py-7 md:grid-cols-[200px_minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-8 md:py-8">
                <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-[24px] leading-tight tracking-[-0.01em] text-ink md:text-[28px]">
                  {row.title}
                </h3>
                <div className="max-w-xl">
                  <div className="text-[16px] leading-relaxed text-ink-muted">{row.body}</div>
                  {row.action && <div className="mt-3">{row.action}</div>}
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 03 How it works — the four screens, with a working mock of each             */
/* -------------------------------------------------------------------------- */

const STEPS: { title: string; body: string }[] = [
  {
    title: "Choose your dates",
    body: "Tell us when you travel. The plans on offer, and the delivery date we promise, are measured from it.",
  },
  {
    title: "Add who's going",
    body: "Everyone on the trip, and who is paying for it — the question every consulate's form asks.",
  },
  {
    title: "Scan your passport",
    body: "The details are read from the photo page on your device, so there is no form to retype.",
  },
  {
    title: "Pay, then follow it",
    body: "Check out, and follow the application on the tracking page until it is decided.",
  },
];

export function HowItWorks({ index }: { index: string }) {
  const [step, setStep] = useState(0);

  return (
    <section aria-labelledby="how-title" className={SECTION}>
      <SectionHead
        index={index}
        label="How it works"
        id="how-title"
        title="Four screens. Then it's our job."
      />

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-[200px_1fr] md:gap-8">
        <div aria-hidden className="hidden md:block">
          <Stamp code="DXB" line="DUBAI · ARRIVED" word="ADMITTED" tone="amber" rotate={-9} className="mt-24 h-36 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <ol className="flex flex-col" aria-label="Application steps">
            {STEPS.map((s, i) => {
              const active = i === step;
              return (
                <li key={s.title} className="border-t border-rule last:border-b">
                  <button
                    type="button"
                    aria-expanded={active}
                    onClick={() => setStep(i)}
                    onMouseEnter={() => setStep(i)}
                    className="relative flex w-full cursor-pointer gap-5 py-5 text-left"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -top-px left-0 h-px bg-ink transition-[width] duration-500 ease-out",
                        active ? "w-full" : "w-0",
                      )}
                    />
                    <span className={cn("font-mono text-xs transition-colors", active ? "text-ink" : "text-ink-faint")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block font-serif text-[22px] leading-tight tracking-[-0.01em] transition-colors md:text-[24px]",
                          active ? "text-ink" : "text-ink-faint",
                        )}
                      >
                        {s.title}
                      </span>
                      <span
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                          active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <span className="overflow-hidden">
                          <span className="block pt-2 text-[15px] leading-relaxed text-ink-muted">{s.body}</span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-rule bg-paper-raised shadow-[0_1px_0_rgba(22,23,27,0.04),0_24px_48px_-24px_rgba(22,23,27,0.18)]">
              <div className="flex items-center justify-between border-b border-rule px-5 py-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  Example application · UAE
                </span>
                <span className="font-mono text-[11px] text-ink-faint">Step {step + 1} of 4</span>
              </div>
              <div key={step} className="animate-stage-title min-h-[330px] p-5 md:min-h-[360px] md:p-7">
                {step === 0 && <MockDates />}
                {step === 1 && <MockTravellers />}
                {step === 2 && <MockPassport />}
                {step === 3 && <MockTracking />}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MockHeading({ children }: { children: ReactNode }) {
  return <p className="font-serif text-[22px] leading-tight tracking-[-0.01em] text-ink">{children}</p>;
}

function MockDates() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <MockHeading>When do you travel?</MockHeading>
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div
            key={d}
            className={cn(
              "flex flex-col items-center rounded-lg border py-2.5",
              i === 4 ? "border-ink bg-ink text-paper" : "border-rule text-ink-muted",
            )}
          >
            <span className="text-[10px] uppercase tracking-wider opacity-70">{d}</span>
            <span className="mt-1 font-mono text-sm tabular-nums">{12 + i}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 divide-y divide-rule rounded-xl border border-rule">
        <MockRow label="Departure" value="Friday" />
        <MockRow label="Visa" value="E-visa · 60 days" />
        <MockRow label="Delivered by" value="Before you fly" strong />
      </div>
    </div>
  );
}

function MockTravellers() {
  return (
    <div>
      <MockHeading>Who&rsquo;s going?</MockHeading>
      <div className="mt-5 space-y-2">
        {[
          { n: "Traveller 1", k: "Adult", done: true },
          { n: "Traveller 2", k: "Adult", done: true },
          { n: "Traveller 3", k: "Child", done: false },
        ].map((t) => (
          <div key={t.n} className="flex items-center justify-between rounded-xl border border-rule px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper-sunken font-mono text-[11px] text-ink-muted">
                {t.n.slice(-1)}
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">{t.n}</span>
                <span className="block text-xs text-ink-faint">{t.k}</span>
              </span>
            </span>
            {t.done ? (
              <span className="inline-flex items-center gap-1 text-xs text-success-subtle-foreground">
                <Check className="h-3.5 w-3.5" aria-hidden /> Passport read
              </span>
            ) : (
              <span className="text-xs text-ink-faint">Add passport</span>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-rule px-4 py-3 text-sm text-ink-faint">
          <Plus className="h-4 w-4" aria-hidden /> Add traveller
        </div>
      </div>
      <div className="mt-4 divide-y divide-rule rounded-xl border border-rule">
        <MockRow label="Paying for the trip" value="Traveller 1" />
      </div>
    </div>
  );
}

function MockPassport() {
  return (
    <div>
      <MockHeading>Passport, photo page up</MockHeading>
      <div className="relative mt-5 overflow-hidden rounded-xl border border-rule bg-paper-sunken/60 p-4">
        <div className="flex gap-4">
          <div aria-hidden className="h-24 w-20 flex-shrink-0 rounded-md bg-ink/10" />
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            {[
              ["Surname", "SPECIMEN"],
              ["Given names", "SAMPLE"],
              ["Nationality", "INDIAN"],
              ["Date of birth", "01 JAN 1990"],
              ["Passport no.", "Z0000000"],
              ["Expiry", "01 JAN 2030"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="uppercase tracking-wider text-ink-faint">{k}</dt>
                <dd className="font-mono text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mt-4 overflow-hidden rounded-md bg-paper-raised px-3 py-2 font-mono text-[10px] leading-[1.6] tracking-[0.08em] text-ink sm:text-[11px]">
          <p className="truncate">P&lt;INDSPECIMEN&lt;&lt;SAMPLE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
          <p className="truncate">Z0000000&lt;0IND9001017M3001015&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;04</p>
          <span aria-hidden className="mrz-scan pointer-events-none absolute inset-0" />
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
        <Check className="h-3.5 w-3.5 text-success-subtle-foreground" aria-hidden />
        Read on your device and checked against the passport&rsquo;s own check digits.
      </p>
    </div>
  );
}

function MockTracking() {
  const stages = [
    { t: "Payment received", s: "done" },
    { t: "Documents checked", s: "done" },
    { t: "Filed with the authority", s: "now" },
    { t: "Decision", s: "next" },
  ] as const;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <MockHeading>Your application</MockHeading>
        <span className="font-mono text-[11px] text-ink-faint">Ref · EXAMPLE</span>
      </div>
      <ol className="relative mt-6 space-y-5 pl-7">
        <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-rule" />
        {stages.map((st) => (
          <li key={st.t} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute -left-7 top-0.5 grid h-[15px] w-[15px] place-items-center rounded-full border",
                st.s === "done" && "border-ink bg-ink text-paper",
                st.s === "now" && "border-primary bg-paper-raised",
                st.s === "next" && "border-rule bg-paper-raised",
              )}
            >
              {st.s === "done" && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              {st.s === "now" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
            </span>
            <p className={cn("text-sm", st.s === "next" ? "text-ink-faint" : "font-medium text-ink")}>{st.t}</p>
            {st.s === "now" && <p className="mt-0.5 text-xs text-ink-muted">You&rsquo;ll get an email the moment this changes.</p>}
          </li>
        ))}
      </ol>
      <div className="mt-7 divide-y divide-rule rounded-xl border border-rule">
        <MockRow label="Promised by" value="The date on your receipt" strong />
      </div>
    </div>
  );
}

function MockRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className={cn("text-right", strong ? "font-medium text-ink" : "text-ink")}>{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 04 The promise — a receipt for a real destination                           */
/* -------------------------------------------------------------------------- */

// Gulf priorities first, then a quick e-visa, as on the price list.
const RECEIPT_CODES = ["ae", "om", "bh", "vn"];

export function Guarantee({ index }: { index: string }) {
  const options = useMemo(
    () =>
      RECEIPT_CODES.map((code) => countriesData.find((c) => c.code === code && c.visaType === "E-Visa")).filter(
        (c): c is Country => Boolean(c),
      ),
    [],
  );
  const [code, setCode] = useState(options[0]?.code);
  const country = options.find((c) => c.code === code) ?? options[0];

  // Today + the delivery promise. Computed after mount: rendered on the server
  // it would bake the build date into the page (see `GuaranteeBand`).
  const [deliverBy, setDeliverBy] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (country) setDeliverBy(formatShortDate(country.deliveryDays));
  }, [country]);

  if (!country) return null;

  return (
    <section aria-labelledby="promise-title" className={SECTION}>
      <SectionHead index={index} label="The promise" id="promise-title" title="The date comes first. Then the price." />

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-[200px_1fr] md:gap-8">
        <div aria-hidden className="hidden md:block">
          <Stamp code="BKK" line="IMMIGRATION · THAILAND" word="VISA ON FILE" shape="box" rotate={6} className="mt-40 h-36 w-36" />
        </div>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
          <Reveal>
            <p className="max-w-lg text-[17px] leading-relaxed text-ink-muted">
              Before you pay, you see the day your visa will be delivered. It is measured from a complete
              application, and it is ours to keep:{" "}
              <span className="text-ink">if we miss it, the abizon fee is waived.</span>
            </p>
            <ul className="mt-8 max-w-lg divide-y divide-rule border-y border-rule">
              {[
                ["One price, everything in it", "The price you see includes the government's fee, our service and taxes. Nothing is added at checkout."],
                ["Checked before it's filed", "Documents are checked against the destination's rules, so problems surface with us, not at a consulate."],
                ["No surprise at the end", "The total on the receipt is the total you are charged."],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-4 py-4">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink" aria-hidden />
                  <span>
                    <span className="block text-[15px] font-medium text-ink">{t}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <TextLink href="/refunds-policy">What the guarantee covers</TextLink>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div role="tablist" aria-label="Example destination" className="mb-3 flex flex-wrap gap-1.5">
              {options.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="tab"
                  aria-selected={c.code === country.code}
                  onClick={() => setCode(c.code)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    c.code === country.code
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-muted hover:border-ink hover:text-ink",
                  )}
                >
                  {c.name === "United Arab Emirates" ? "UAE" : c.name}
                </button>
              ))}
            </div>

            {/* The receipt. */}
            <div className="relative rounded-2xl border border-rule bg-paper-raised shadow-[0_24px_48px_-28px_rgba(22,23,27,0.25)]">
              <div className="px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">Before you pay</p>
                    <p className="mt-1 font-serif text-[26px] leading-tight tracking-[-0.01em] text-ink">{country.name}</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/w80/${country.code}.png`}
                    alt=""
                    className="mt-1 h-6 w-9 rounded-[3px] object-cover ring-1 ring-ink/10"
                    loading="lazy"
                  />
                </div>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <ReceiptLine k="Visa" v={visaOptionsFor(country.code)[0]?.title ?? country.visaType} />
                  <ReceiptLine k="Price from" v={formatGovernmentFee(country.fees)} mono />
                  <ReceiptLine k="Government fee" v="Included" faint />
                  <ReceiptLine k="Service and taxes" v="Included" faint />
                </dl>
              </div>

              {/* Perforation. */}
              <div aria-hidden className="mx-6 border-t border-dashed border-rule" />

              <div className="px-6 pb-6 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">Delivered by</p>
                    <p className="mt-1 font-serif text-[34px] leading-none tracking-[-0.02em] text-ink tabular-nums" aria-live="polite">
                      {deliverBy ?? "—"}
                    </p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {country.deliveryDays === 1 ? "Within a day" : `Within ${country.deliveryDays} days`} of a
                      complete application, if you applied today
                    </p>
                  </div>
                  <span className="-rotate-6 rounded-md border-2 border-primary px-2 py-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-primary">
                    Late?
                    <br />
                    Fee waived
                  </span>
                </div>
                <Link
                  href={`/visa/${getCountrySlug(country.name)}`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
                >
                  Start a {country.name === "United Arab Emirates" ? "UAE" : country.name} application
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ReceiptLine({ k, v, mono, faint }: { k: string; v: string; mono?: boolean; faint?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      {/* The dotted leader lives inside the <dt>: a <dl>'s row may hold only
          its <dt> and <dd>. */}
      <dt className="flex flex-1 items-baseline gap-3 text-ink-muted">
        {k}
        <span aria-hidden className="flex-1 translate-y-[-3px] border-b border-dotted border-rule" />
      </dt>
      <dd className={cn("text-right", mono && "font-mono tabular-nums", faint ? "text-ink-faint" : "text-ink")}>{v}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 05 Collections — destinations, grouped the way people decide                 */
/* -------------------------------------------------------------------------- */

type Collection = {
  id: string;
  label: string;
  match: (c: Country) => boolean;
  /** The filters that show exactly this collection in the hall. */
  filters: Partial<FilterValues>;
};

const COLLECTIONS: Collection[] = [
  {
    id: "free",
    label: "Visa free",
    match: (c) => c.visaType === "Visa Free",
    filters: { type: "Visa Free" },
  },
  {
    id: "arrival",
    label: "On arrival",
    match: (c) => c.visaType === "Visa on Arrival",
    filters: { type: "Visa on Arrival" },
  },
  {
    id: "paperless",
    label: "No documents",
    match: (c) => c.documents === "No Documents Required",
    filters: { documents: "No Documents Required" },
  },
  {
    id: "fast",
    label: "E-visa in 24 hours",
    match: (c) => c.visaType === "E-Visa" && c.deliveryDays <= 1,
    filters: { type: "E-Visa", delivery: "Within 24 Hours" },
  },
];

export function Collections({ index, onShowInHall }: { index: string; onShowInHall: ShowInHall }) {
  // The count is what the hall will hold once the collection's filters are
  // applied, so it is taken over every product row, like the hall's.
  const lists = useMemo(
    () =>
      Object.fromEntries(COLLECTIONS.map((col) => [col.id, countriesData.filter(col.match)])) as Record<
        string,
        Country[]
      >,
    [],
  );
  const available = COLLECTIONS.filter((c) => lists[c.id].length > 0);
  const [activeId, setActiveId] = useState(available[0]?.id);
  const active = available.find((c) => c.id === activeId) ?? available[0];
  if (!active) return null;
  const rows = lists[active.id];
  // Destinations with a photograph first: a row of plates reads as missing
  // images, while one plate among photographs reads as chosen.
  const tiles = uniqueDestinations(rows)
    .map((c, i) => ({ c, i, photo: countryCardImage(getCountrySlug(c.name)) }))
    .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || a.i - b.i)
    .slice(0, 4);

  return (
    <section aria-labelledby="collections-title" className={SECTION}>
      <SectionHead
        index={index}
        label="Destinations"
        id="collections-title"
        title="Start where it's easiest."
        aside={<TextLink onClick={() => onShowInHall(active.filters)}>All {rows.length} in the hall</TextLink>}
      />

      <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-[200px_1fr] md:gap-8">
        <div role="tablist" aria-label="Collections" className="flex flex-wrap gap-1.5 md:flex-col md:items-start md:gap-0">
          {available.map((col) => {
            const on = col.id === active.id;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveId(col.id)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors md:w-full md:rounded-none md:border-0 md:border-l-2 md:px-0 md:py-2.5 md:pl-4 md:text-sm",
                  on
                    ? "border-ink bg-ink text-paper md:bg-transparent md:text-ink"
                    : "border-rule text-ink-muted hover:text-ink md:border-transparent",
                )}
              >
                {col.label}
                <span className={cn("ml-1.5 font-mono tabular-nums", on ? "opacity-60" : "text-ink-faint")}>
                  {lists[col.id].length}
                </span>
              </button>
            );
          })}
        </div>

        <div key={active.id} className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {tiles.map(({ c, photo }, i) => (
            <Reveal key={c.code + c.id} delay={i * 0.05}>
              <Tile country={c} photo={photo} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tile({ country, photo }: { country: Country; photo: ReturnType<typeof countryCardImage> }) {
  const slug = getCountrySlug(country.name);
  return (
    <Link
      href={`/visa/${slug}`}
      className="group block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-paper-sunken">
        <CountryImagePlate seed={country.code} />
        {photo && (
          <Image
            src={photo.src}
            fill
            sizes="(min-width: 1024px) 22vw, 50vw"
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
        {/* A delivery time only means something where there is a visa to deliver. */}
        {(country.visaType === "E-Visa" || country.visaType === "Sticker Visa") && (
          <span className="absolute left-3 top-3 rounded-full bg-paper-raised/90 px-2 py-0.5 font-mono text-[10px] text-ink backdrop-blur">
            {country.deliveryDays === 1 ? "24h" : `${country.deliveryDays} days`}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-[19px] leading-tight text-ink">{country.name}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {country.visaType} ·{" "}
            {country.visaType === "Visa Free" ? country.validity : formatGovernmentFee(country.fees)}
          </p>
        </div>
        <ArrowUpRight
          className="mt-1 h-4 w-4 flex-shrink-0 text-ink-faint transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
          aria-hidden
        />
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* 06 Tools                                                                     */
/* -------------------------------------------------------------------------- */

const TOOLS: { Icon: LucideIcon; title: string; body: string; href: string }[] = [
  {
    Icon: ListChecks,
    title: "Visa requirements",
    body: "Visa type, validity, documents and fees for each destination, in one place.",
    href: "/tools/visa-requirements",
  },
  {
    Icon: Camera,
    title: "Visa photo creator",
    body: "Check a photograph against the size and specification an application demands.",
    href: "/tools/visa-photo-creator",
  },
  {
    Icon: ClipboardCheck,
    title: "Schengen appointments",
    body: "Look up appointment availability before you plan a trip around it.",
    href: "/tools/schengen-appointment-checker",
  },
  {
    Icon: Globe2,
    title: "Passport index",
    body: "How passports rank against each other, and where each one can travel.",
    href: "/passport-index",
  },
  {
    Icon: FileSearch,
    title: "Track an application",
    body: "Follow an application you have filed, from submission to decision.",
    href: "/track",
  },
];

export function Tools({ index }: { index: string }) {
  return (
    <section aria-labelledby="tools-title" className={SECTION}>
      <SectionHead
        index={index}
        label="Free tools"
        id="tools-title"
        title="Useful before you've decided anything."
        aside={<TextLink href="/tools">All tools</TextLink>}
      />

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-[200px_1fr]">
        <div aria-hidden className="hidden md:block">
          <Stamp code="SIN" line="SINGAPORE · ARRIVAL" word="ENTRY" rotate={-4} className="mt-10 h-32 w-32" />
        </div>
        {/* Hairlines from the gap: the list is ruled, and each cell sits on paper. */}
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <li key={t.href} className="bg-paper">
              <Reveal delay={i * 0.04} className="h-full">
                <Link href={t.href} className="group flex h-full flex-col p-6 transition-colors hover:bg-paper-raised">
                  <span className="flex items-center justify-between">
                    <t.Icon className="h-5 w-5 text-ink" strokeWidth={1.5} aria-hidden />
                    <ArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" aria-hidden />
                  </span>
                  <span className="mt-8 block font-serif text-[21px] leading-tight text-ink">{t.title}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-ink-muted">{t.body}</span>
                </Link>
              </Reveal>
            </li>
          ))}
          <li className="bg-paper">
            <div className="flex h-full flex-col justify-end bg-paper-sunken/50 p-6">
              <p className="text-sm leading-relaxed text-ink-muted">
                None of these need an account or an application.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                          */
/* -------------------------------------------------------------------------- */

function useFaqs(): { q: string; a: string }[] {
  return useMemo(() => {
    const all = uniqueDestinations(countriesData);
    const names = (list: Country[], n = 3) => list.slice(0, n).map((c) => c.name).join(", ");

    const fast = all.filter((c) => c.deliveryDays <= 1);
    const free = all.filter((c) => c.visaType === "Visa Free");
    const noDocs = all.filter((c) => c.documents === "No Documents Required");
    const passportOnly = all.filter((c) => c.documents === "Passport Only");
    const photoPassport = all.filter((c) => c.documents === "Photo + Passport");
    const arrival = all.filter((c) => arrivalCardFor(getCountrySlug(c.name)));

    const faqs = [
      {
        q: "What does abizon actually do?",
        a: "We prepare and file visa applications for Indian passport holders. You choose a destination and answer four screens; we check your documents against that country's rules, submit the application, and follow it to a decision. The delivery date is shown before you pay, and if we miss it our fee is waived.",
      },
      {
        q: "How many destinations can I apply for?",
        a: `${countriesData.length}. Every one of them is a card in the hall at the top of this page; the filters beneath it narrow the hall to what fits your trip.`,
      },
      {
        q: "Which visas are delivered within a day?",
        a: `${fast.length} destinations deliver within 24 hours, including ${names(fast)}. Set "Visa delivery" to "Within 24 Hours" to see them all in the hall.`,
      },
      {
        q: "Do I need to upload documents?",
        a: `It depends on the destination. ${noDocs.length} need no documents at all, ${passportOnly.length} need only your passport, and ${photoPassport.length} need a photograph and your passport. Each destination's visa page says which.`,
      },
      {
        q: "Where can I travel without a visa?",
        a: free.length
          ? `${free.length} destinations in the catalogue are visa free, including ${names(free)}. Choose "Visa Free" under Type to see them in the hall.`
          : "None of the destinations in the catalogue are currently visa free.",
      },
      {
        q: "How do I track an application?",
        a: "Open the tracking page from the icon at the top right of this page, or go to abizonvisa.com/track, and follow the application from submission to decision.",
      },
    ];
    if (arrival.length) {
      faqs.push({
        q: "Do you help with arrival cards?",
        a: `Yes, for free, for ${arrival.length} destinations whose arrival card we have checked: ${names(arrival, 5)}.`,
      });
    }
    return faqs;
  }, []);
}

export function Faq({ index }: { index: string }) {
  const faqs = useFaqs();
  const [open, setOpen] = useState(0);

  return (
    <section aria-labelledby="faq-title" className={SECTION}>
      <SectionHead index={index} label="Questions" id="faq-title" title="Asked before the first application." />

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-[200px_1fr]">
        <div aria-hidden className="hidden md:block">
          <Stamp code="BOM" line="MUMBAI · DEPARTED" word="BON VOYAGE" tone="amber" rotate={8} className="mt-20 h-36 w-36" />
        </div>
        <div className="max-w-3xl border-t border-rule">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-rule">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left font-serif text-[19px] leading-snug text-ink md:text-[21px]"
                  >
                    {f.q}
                    <Plus
                      aria-hidden
                      className={cn(
                        "h-4 w-4 flex-shrink-0 text-ink-muted transition-transform duration-300",
                        isOpen && "rotate-45",
                      )}
                    />
                  </button>
                </h3>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Closing                                                                      */
/* -------------------------------------------------------------------------- */

export function Closing({ onBackToHall }: { onBackToHall: () => void }) {
  return (
    <section className="pb-20 pt-8 md:pb-28">
      <Reveal>
        <div className="border-t border-ink pt-10 md:pt-14">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-[14ch] font-serif text-[48px] font-light leading-[0.98] tracking-[-0.03em] text-ink md:text-[88px]">
              Where are you going next?
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBackToHall}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
              >
                Choose a destination
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </button>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                Track an application
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
