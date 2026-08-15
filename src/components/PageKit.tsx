"use client";

/**
 * Shared building blocks for the standalone pages linked from the footer.
 *
 * There are thirty of these pages. Without a kit they drift: one uses a 28px
 * radius and another 32px, one animates in at 50px travel and another at 16px,
 * and the set stops reading as one site. Everything here is composed from the
 * semantic tokens in globals.css and the shared curves in lib/motion.ts, so a
 * change to either propagates to all thirty at once.
 *
 * These are client components (they animate), but they are designed to be
 * rendered *by* server components — each page stays a server component so it
 * can export its own `metadata`.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { fadeUp, staggerContainer, VIEWPORT } from "@/lib/motion";

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Small pill above the fold — a status, a count, a promise. */
  badge?: ReactNode;
  actions?: ReactNode;
  /** Dark treatment for pages that want more presence (Careers, Atlas). */
  tone?: "light" | "dark";
};

export function PageHero({
  eyebrow,
  title,
  description,
  badge,
  actions,
  tone = "light",
}: PageHeroProps) {
  const dark = tone === "dark";

  return (
    <section
      className={`relative overflow-hidden border-b ${
        dark ? "border-slate-800 bg-slate-950" : "border-border bg-surface"
      }`}
    >
      {/* Dot grid, masked to fade out before it reaches the text. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] ${
          dark
            ? "bg-[radial-gradient(#1e293b_1px,transparent_1px)]"
            : "bg-[radial-gradient(var(--color-border)_1px,transparent_1px)]"
        }`}
      />

      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center md:px-6 md:py-24">
        <motion.div
          variants={staggerContainer(0.07)}
          initial="hidden"
          animate="visible"
        >
          {eyebrow && (
            <motion.p
              variants={fadeUp}
              className={`text-2xs font-black uppercase tracking-widest ${
                dark ? "text-primary" : "text-primary"
              }`}
            >
              {eyebrow}
            </motion.p>
          )}

          <motion.h1
            variants={fadeUp}
            className={`mt-3 text-4xl font-black tracking-tight md:text-5xl ${
              dark ? "text-white" : "text-foreground"
            }`}
          >
            {title}
          </motion.h1>

          {description && (
            <motion.p
              variants={fadeUp}
              className={`mx-auto mt-5 max-w-2xl text-base leading-relaxed ${
                dark ? "text-slate-300" : "text-muted-foreground"
              }`}
            >
              {description}
            </motion.p>
          )}

          {badge && (
            <motion.div variants={fadeUp} className="mt-6 flex justify-center">
              {badge}
            </motion.div>
          )}

          {actions && (
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              {actions}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Section                                                                    */
/* -------------------------------------------------------------------------- */

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Alternating background, to separate adjacent bands without a rule. */
  muted?: boolean;
  className?: string;
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  muted = false,
  className = "",
}: SectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${muted ? "bg-surface-sunken" : ""} ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        {(eyebrow || title || description) && (
          <motion.header
            variants={staggerContainer(0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            className="max-w-3xl"
          >
            {eyebrow && (
              <motion.p
                variants={fadeUp}
                className="text-2xs font-black uppercase tracking-widest text-primary"
              >
                {eyebrow}
              </motion.p>
            )}
            {title && (
              <motion.h2
                variants={fadeUp}
                className="mt-2.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              >
                {title}
              </motion.h2>
            )}
            {description && (
              <motion.p
                variants={fadeUp}
                className="mt-3 text-base leading-relaxed text-muted-foreground"
              >
                {description}
              </motion.p>
            )}
          </motion.header>
        )}

        <div className={eyebrow || title || description ? "mt-10" : ""}>{children}</div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * PHASE 8C: `value: null` means "we do not have this number yet".
 *
 * Every StatGrid on the site was filled with invented operating metrics —
 * "99.2% on-time delivery, trailing 90 days", "95.1% approval rate, trailing
 * quarter" — rendered in the same heavy numeral as a real figure and captioned
 * with a measurement window that implied someone had measured it.
 *
 * The label is worth keeping even when the number is not: it says what Abizon
 * intends to publish and be held to. The value is what must not be invented.
 * `null` renders the commitment without the fabrication.
 */
export type Stat = { value: string | null; label: string; hint?: string };

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <motion.dl
      variants={staggerContainer(0.06)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className="grid grid-cols-2 gap-4 md:grid-cols-4"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={fadeUp}
          className="rounded-2xl border border-border bg-surface p-5 shadow-e1"
        >
          <dt className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            {stat.label}
          </dt>
          {stat.value === null ? (
            // Deliberately not in the numeral face or the numeral size. An
            // unpublished metric must not occupy the visual slot of a measured
            // one — at 3xl black, "Not published" still reads as a headline
            // figure at a glance.
            <dd className="mt-2 text-sm font-semibold leading-snug text-muted-foreground">
              Not published yet
            </dd>
          ) : (
            <dd
              data-numeric
              className="mt-2 text-3xl font-black tracking-tight text-foreground"
            >
              {stat.value}
            </dd>
          )}
          {stat.hint && (
            <p className="mt-1.5 text-xs text-muted-foreground">{stat.hint}</p>
          )}
        </motion.div>
      ))}
    </motion.dl>
  );
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

export type FeatureItem = {
  /**
   * A rendered element, not a component reference. These pages are server
   * components and this grid is a client component — a function cannot cross
   * that boundary, but an already-rendered element serialises into the RSC
   * payload fine. So callers pass `<Globe2 className="h-5 w-5" />`.
   */
  icon?: ReactNode;
  title: string;
  description: string;
  href?: string;
  meta?: string;
};

export function FeatureGrid({
  items,
  columns = 3,
}: {
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
}) {
  const cols =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <motion.ul
      variants={staggerContainer(0.05)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className={`grid grid-cols-1 gap-4 ${cols}`}
    >
      {items.map((item) => {
        const body = (
          <>
            {item.icon && (
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary-subtle-foreground">
                {item.icon}
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
              {item.meta && (
                <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-2xs font-bold text-muted-foreground">
                  {item.meta}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            {item.href && (
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                Learn more
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[var(--duration-base)] ease-out group-hover:translate-x-0.5" />
              </span>
            )}
          </>
        );

        return (
          <motion.li key={item.title} variants={fadeUp}>
            {item.href ? (
              <Link
                href={item.href}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-e1 transition-shadow duration-[var(--duration-base)] ease-out hover:shadow-e3"
              >
                {body}
              </Link>
            ) : (
              <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-e1">
                {body}
              </div>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

export type Step = { title: string; description: string };

export function StepList({ steps }: { steps: Step[] }) {
  return (
    <motion.ol
      variants={staggerContainer(0.07)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className="relative space-y-6 border-l border-border pl-8"
    >
      {steps.map((step, index) => (
        <motion.li key={step.title} variants={fadeUp} className="relative">
          <span
            data-numeric
            className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-2xs font-black text-foreground"
          >
            {index + 1}
          </span>
          <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>
        </motion.li>
      ))}
    </motion.ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Prose                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Long-form copy. Styled with descendant selectors rather than the typography
 * plugin, which isn't installed — and adding it for six pages of policy text
 * would be a lot of CSS for the benefit.
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        max-w-3xl text-sm leading-relaxed text-muted-foreground
        [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
        [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground
        [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground
        [&_li]:mb-2 [&_li]:pl-1
        [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5
        [&_p]:mb-4
        [&_strong]:font-semibold [&_strong]:text-subtle-foreground
        [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5
      "
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Callout                                                                    */
/* -------------------------------------------------------------------------- */

const CALLOUT_TONES = {
  info: "border-accent-subtle bg-accent-subtle text-accent-subtle-foreground",
  success: "border-success-subtle bg-success-subtle text-success-subtle-foreground",
  warning: "border-primary-border bg-warning-subtle text-warning-subtle-foreground",
  danger: "border-destructive-subtle bg-destructive-subtle text-destructive-subtle-foreground",
} as const;

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${CALLOUT_TONES[tone]}`}>
      {title && <p className="text-sm font-bold">{title}</p>}
      <div className={`text-sm leading-relaxed ${title ? "mt-1.5" : ""}`}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CTA                                                                        */
/* -------------------------------------------------------------------------- */

export function CTABand({
  title,
  description,
  href = "/",
  label = "Browse destinations",
}: {
  title: string;
  description?: string;
  href?: string;
  label?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-slate-950 px-6 py-10 md:flex-row md:items-center md:px-10"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              {description}
            </p>
          )}
        </div>

        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
        >
          {label}
          <ArrowRight className="h-4 w-4 transition-transform duration-[var(--duration-base)] ease-out group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </section>
  );
}
