"use client";

/**
 * THE HOMEPAGE BELOW THE HALL — set in getlayers' language on the same space
 * background as the destination stage: a pill eyebrow over a light display
 * headline, an "All →" link on the right, media rows with a caption line,
 * numbered steps, a list beside a live preview, one large call-to-action card
 * and a two-column FAQ.
 *
 * Every number on this page is computed from `countriesData` and every link
 * goes to a route that exists. Nothing here is copy that could drift from the
 * product: if the dataset changes, the counts change with it.
 */

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  Globe2,
  ListChecks,
  ScanLine,
  Users,
  type LucideIcon,
} from "lucide-react";

import { CountryImagePlate } from "@/components/CountryImagePlate";
import type { FilterValues } from "@/components/CountryFilters";
import { countriesData, getCountrySlug, type Country } from "@/data/countries";
import { arrivalCardFor } from "@/lib/arrivalCard";
import { countryCardImage } from "@/lib/countryImagery";
import { formatGovernmentFee } from "@/lib/countryVisa";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/60">
      {children}
    </span>
  );
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[34px] font-extralight leading-[1.05] tracking-[-0.02em] text-white md:text-[52px]">
          {title}
        </h2>
      </div>
      {action}
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

type Collection = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  match: (c: Country) => boolean;
  /** The filters that show exactly this collection in the hall. */
  filters: Partial<FilterValues>;
};

const COLLECTIONS: Collection[] = [
  {
    id: "free",
    label: "Visa free",
    eyebrow: "No visa needed",
    title: "Just take your passport",
    match: (c) => c.visaType === "Visa Free",
    filters: { type: "Visa Free" },
  },
  {
    id: "arrival",
    label: "On arrival",
    eyebrow: "Granted at the border",
    title: "Visas on arrival",
    match: (c) => c.visaType === "Visa on Arrival",
    filters: { type: "Visa on Arrival" },
  },
  {
    id: "paperless",
    label: "No documents",
    eyebrow: "Nothing to upload",
    title: "No documents required",
    match: (c) => c.documents === "No Documents Required",
    filters: { documents: "No Documents Required" },
  },
  {
    id: "fast",
    label: "E-visa in 24h",
    eyebrow: "Delivered within a day",
    title: "E-visas in 24 hours",
    match: (c) => c.visaType === "E-Visa" && c.deliveryDays <= 1,
    filters: { type: "E-Visa", delivery: "Within 24 Hours" },
  },
];

export function Collections({ onShowInHall }: { onShowInHall: (filters: Partial<FilterValues>) => void }) {
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
  // The tiles show one per destination: a couple of countries carry two
  // products, and the same photograph twice in a row of four reads as a bug.
  const seen = new Set<string>();
  const tiles = rows.filter((c) => {
    const slug = getCountrySlug(c.name);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  return (
    <section aria-labelledby="collections-title" className="py-16 md:py-20">
      <SectionHead
        eyebrow={active.eyebrow}
        title={<span id="collections-title">{active.title}</span>}
        action={
          <button
            type="button"
            onClick={() => onShowInHall(active.filters)}
            className="group inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-white/55 transition-colors hover:text-white"
          >
            All {rows.length} in the hall
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        }
      />

      <div role="tablist" aria-label="Collections" className="mb-6 flex flex-wrap gap-1.5">
        {available.map((col) => (
          <button
            key={col.id}
            type="button"
            role="tab"
            aria-selected={col.id === active.id}
            onClick={() => setActiveId(col.id)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              col.id === active.id
                ? "border-white/80 bg-white text-slate-950"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white",
            )}
          >
            {col.label}
            <span className={cn("ml-1.5 tabular-nums", col.id === active.id ? "text-slate-500" : "text-white/35")}>
              {lists[col.id].length}
            </span>
          </button>
        ))}
      </div>

      <div key={active.id} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.slice(0, 4).map((country, i) => (
          <Reveal key={country.code + country.id} delay={i * 0.06}>
            <Tile country={country} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Tile({ country }: { country: Country }) {
  const slug = getCountrySlug(country.name);
  const photo = countryCardImage(slug);
  return (
    <Link href={`/visa/${slug}`} className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300">
      <div className="relative aspect-[16/11] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-[border-color,box-shadow] duration-500 group-hover:border-white/25 group-hover:shadow-[0_0_40px_rgba(125,170,255,0.12)]">
        <CountryImagePlate seed={country.code} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/30 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 px-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://flagcdn.com/w40/${country.code}.png`} alt="" className="h-3.5 w-5 flex-shrink-0 rounded-[2px] object-cover" loading="lazy" />
          <span className="truncate text-sm font-medium text-white">{country.name}</span>
        </span>
        <span className="hidden flex-shrink-0 font-mono text-[11px] text-white/45 sm:inline">
          {country.visaType} · {formatGovernmentFee(country.fees)}
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                               */
/* -------------------------------------------------------------------------- */

const STEPS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: CalendarDays,
    title: "Choose your dates",
    body: "Tell us when you travel. The plans on offer and the delivery promise are measured from that date.",
  },
  {
    Icon: Users,
    title: "Add who’s going",
    body: "Everyone on the trip, and who is sponsoring it — the question every consulate’s form asks.",
  },
  {
    Icon: ScanLine,
    title: "Scan your passport",
    body: "The passport details are read from the scan, so there is no form to retype. Upload what the destination asks for.",
  },
  {
    Icon: CreditCard,
    title: "Pay and track",
    body: "Check out, then follow the application from the tracking page until it is decided.",
  },
];

export function Steps() {
  return (
    <section aria-labelledby="steps-title" className="py-16 md:py-20">
      <Reveal className="mx-auto mb-12 max-w-2xl text-center">
        <div className="mx-auto mb-5 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
          <Globe2 className="h-4.5 w-4.5" aria-hidden />
        </div>
        <h2 id="steps-title" className="text-[34px] font-extralight leading-[1.08] tracking-[-0.02em] text-white md:text-[52px]">
          From a card in the hall
          <br className="hidden sm:block" /> to a filed application
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm font-light text-white/50">
          Four screens, in the order the application asks them.
        </p>
      </Reveal>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Reveal delay={i * 0.08} className="h-full">
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-colors duration-500 hover:border-white/20 hover:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/80">
                    <step.Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="font-mono text-[11px] text-white/35">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-6 text-[15px] font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">{step.body}</p>
                <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-sky-400/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Tools                                                                      */
/* -------------------------------------------------------------------------- */

const TOOLS: { Icon: LucideIcon; title: string; body: string; href: string; hue: number }[] = [
  {
    Icon: ListChecks,
    title: "Visa requirements",
    body: "What each destination asks for — visa type, validity, documents and fees — in one place.",
    href: "/tools/visa-requirements",
    hue: 215,
  },
  {
    Icon: Camera,
    title: "Visa photo creator",
    body: "Check a photograph against the size and specification a visa application demands.",
    href: "/tools/visa-photo-creator",
    hue: 265,
  },
  {
    Icon: ClipboardCheck,
    title: "Schengen appointment checker",
    body: "Look up appointment availability before you plan a Schengen trip around it.",
    href: "/tools/schengen-appointment-checker",
    hue: 190,
  },
  {
    Icon: Globe2,
    title: "Passport index",
    body: "How passports rank against each other, and where each one can travel.",
    href: "/passport-index",
    hue: 240,
  },
  {
    Icon: FileSearch,
    title: "Track an application",
    body: "Follow an application you have filed, from submission to decision.",
    href: "/track",
    hue: 160,
  },
];

export function Tools() {
  const [index, setIndex] = useState(0);
  const tool = TOOLS[index];

  return (
    <section aria-labelledby="tools-title" className="py-16 md:py-20">
      <SectionHead
        eyebrow="Free to use"
        title={<span id="tools-title">Everything around the visa</span>}
        action={
          <Link href="/tools" className="group inline-flex items-center gap-1.5 text-xs font-medium text-white/55 hover:text-white">
            All tools
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* The preview. */}
        <Reveal>
          <div className="relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 p-7 md:min-h-[420px] md:p-9">
            <div
              aria-hidden
              className="absolute inset-0 transition-[background] duration-700"
              style={{
                background: `radial-gradient(80% 70% at 75% 15%, hsl(${tool.hue} 80% 55% / 0.32), transparent 60%), radial-gradient(60% 60% at 15% 100%, hsl(${tool.hue + 40} 70% 45% / 0.22), transparent 70%), #070a16`,
              }}
            />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_70%_20%,#000,transparent_70%)]" />
            <tool.Icon aria-hidden className="absolute right-8 top-8 h-24 w-24 text-white/10 md:h-32 md:w-32" strokeWidth={1} />
            <div key={tool.href} className="animate-stage-title relative">
              <span className="font-mono text-[11px] text-white/40">{String(index + 1).padStart(2, "0")} / {String(TOOLS.length).padStart(2, "0")}</span>
              <h3 className="mt-2 text-3xl font-extralight tracking-[-0.01em] text-white md:text-4xl">{tool.title}</h3>
              <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/60">{tool.body}</p>
              <Link
                href={tool.href}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition-transform hover:-translate-y-px"
              >
                Open {tool.title.toLowerCase()}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* The list. */}
        <ul className="flex flex-col gap-2">
          {TOOLS.map((t, i) => (
            <li key={t.href}>
              <Reveal delay={i * 0.05}>
                <Link
                  href={t.href}
                  onMouseEnter={() => setIndex(i)}
                  onFocus={() => setIndex(i)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-3 pr-4 transition-colors duration-300",
                    i === index ? "border-white/20 bg-white/[0.06]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15",
                  )}
                >
                  <span
                    className="grid h-14 w-20 flex-shrink-0 place-items-center rounded-xl border border-white/10"
                    style={{ background: `radial-gradient(circle at 70% 20%, hsl(${t.hue} 80% 55% / 0.35), #0a0d19 70%)` }}
                  >
                    <t.Icon className="h-5 w-5 text-white/85" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">{t.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/45">{t.body}</span>
                  </span>
                  <ArrowUpRight className={cn("h-4 w-4 flex-shrink-0 transition-colors", i === index ? "text-white" : "text-white/30")} aria-hidden />
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Call to action                                                             */
/* -------------------------------------------------------------------------- */

export function CtaCard({ onBackToHall }: { onBackToHall: () => void }) {
  return (
    <section className="py-12 md:py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 px-6 py-16 text-center md:px-10 md:py-24">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(110,90,255,0.32),transparent_70%),radial-gradient(50%_60%_at_50%_120%,rgba(60,140,255,0.24),transparent_70%),#060915]" />
          <div aria-hidden className="space-stars absolute inset-0 opacity-70" />
          <div className="relative">
            <h2 className="text-[38px] font-extralight leading-[1.04] tracking-[-0.02em] text-white md:text-[60px]">
              Every visa, in one place
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm font-light text-white/55">
              {countriesData.length} destinations in one hall. Pick a card and the planet takes you there.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onBackToHall}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_40px_rgba(140,170,255,0.35)] transition-transform hover:-translate-y-px"
              >
                Back to the hall
                <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-950 text-white">
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </span>
              </button>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:border-white/30"
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

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function useFaqs(): { q: string; a: string }[] {
  return useMemo(() => {
    const unique = new Map<string, Country>();
    countriesData.forEach((c) => {
      const slug = getCountrySlug(c.name);
      if (!unique.has(slug)) unique.set(slug, c);
    });
    const all = [...unique.values()];
    const names = (list: Country[], n = 3) => list.slice(0, n).map((c) => c.name).join(", ");

    const fast = all.filter((c) => c.deliveryDays <= 1);
    const free = all.filter((c) => c.visaType === "Visa Free");
    const noDocs = all.filter((c) => c.documents === "No Documents Required");
    const passportOnly = all.filter((c) => c.documents === "Passport Only");
    const photoPassport = all.filter((c) => c.documents === "Photo + Passport");
    const arrival = all.filter((c) => arrivalCardFor(getCountrySlug(c.name)));

    const faqs = [
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
        a: `Yes, for ${arrival.length} destinations whose free arrival card we have checked: ${names(arrival, 5)}. It appears on the destination's visa page.`,
      });
    }
    return faqs;
  }, []);
}

export function Faq() {
  const faqs = useFaqs();
  const [open, setOpen] = useState(0);

  return (
    <section aria-labelledby="faq-title" className="grid grid-cols-1 gap-10 py-16 md:py-20 lg:grid-cols-[1fr_1.4fr]">
      <Reveal>
        <h2 id="faq-title" className="text-[34px] font-extralight leading-[1.05] tracking-[-0.02em] text-white md:text-[52px]">
          Frequently asked
          <br /> questions
        </h2>
      </Reveal>
      <div className="flex flex-col gap-2">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={i * 0.04}>
              <div className={cn("rounded-2xl border transition-colors", isOpen ? "border-white/15 bg-white/[0.04]" : "border-white/[0.07] bg-white/[0.02]")}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-white"
                  >
                    {f.q}
                    <ChevronDown aria-hidden className={cn("h-4 w-4 flex-shrink-0 text-white/50 transition-transform duration-300", isOpen && "rotate-180")} />
                  </button>
                </h3>
                <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[13px] leading-relaxed text-white/55">{f.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
