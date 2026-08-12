"use client";

/**
 * The country visa page shell.
 *
 * One shell, ~154 destinations. It renders universal chrome and hands each
 * section a `CountryVisaConfig`; nothing here knows about a specific country,
 * and the places that used to (the UAE emirates block, the sticker-visa
 * assumptions, the partner logos) branch on config instead.
 *
 * Phase 4 turned this from an information page with an application card
 * attached into an application page with information beneath it. Three things
 * changed structurally:
 *
 *   1. `ApplicationCard` and `VisaPlanSelector` are gone. Both let the user
 *      choose a processing speed, in different visual languages, with
 *      different invented delivery times. `CountryApplicationPanel` is now the
 *      only place an application is configured or begun.
 *   2. The panel is FIRST in the document, and `order` puts it in the right
 *      column on desktop. Previously the mobile application card was rendered
 *      last, so a phone user scrolled past nine informational sections before
 *      reaching the thing the page exists for.
 *   3. `TravelPlanModal` is gone with its hardcoded "Aug 19, 2026" threshold.
 *      The travel-date question is asked inline in the panel, and an exact date
 *      still opens the existing picker.
 *
 * The route (`app/visa/[countrySlug]/page.tsx`) stays a server component so all
 * ~152 pages keep prerendering with their own metadata.
 *
 * Phase 4.1 was an integrity pass, not a redesign. Three sections left the
 * information column entirely because everything they displayed was invented:
 *
 *   VisaStatistics   a seven-point processing-time chart and an approval-rating
 *                    chart, both hardcoded to a fixed week in July and served
 *                    identically to all 154 destinations. "4 Days 1 Hr" and
 *                    "98.5% Approval Rate" had no source. Deleted; the slot for
 *                    a real series is `CountryVisaConfig.processingTime`.
 *   ApprovalChances  a quiz ending on a percentage, promoted by a "100%" gauge.
 *                    Replaced by `BeforeYouApply`, which said what affects a
 *                    decision and quantified nothing. That too is now gone —
 *                    see below.
 *   VisaPartners     three hand-drawn crests captioned Ministry of Foreign
 *                    Affairs, Government of Dubai and IATA. No partnership with
 *                    any of them is recorded anywhere in this project.
 *
 * PHASE 9 is a composition pass, and its subject is the information column.
 * The column had grown to five prose sections stacked beside a card that
 * finished a third of the way down it, which is why the card had to be sticky
 * and why the page read as two documents racing each other. Four things left:
 *
 *   FeeBreakdown     moved INTO the card as a closed drawer. It was a
 *                    permanent section restating the three figures printed in
 *                    the ledger eighteen inches to its right.
 *   WhyKeyrise       four claims, every one of which is stated again by the
 *                    risk banner on the card, the comparison table, or the
 *                    guarantee bands. Removing it removed no information.
 *   BeforeYouApply   "What a decision turns on" — true, careful, and four
 *                    paragraphs of caveat wedged between the document list and
 *                    the delivery promise, where it read as hedging.
 *   EmiratesCoverage out of the grid and into its own full-width section, so
 *                    the grid can end at the fact cards for every destination
 *                    rather than only for the 153 that are not the UAE.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppointmentRequirements } from "@/components/AppointmentRequirements";
import { CountryApplicationPanel } from "@/components/CountryApplicationPanel";
import { CountryHero } from "@/components/CountryHero";
import { DatePickerModal } from "@/components/DatePickerModal";
import { EmiratesCoverage } from "@/components/EmiratesCoverage";
import { FAQAccordion } from "@/components/FAQAccordion";
import { GuaranteeBand, NoChargeBand } from "@/components/GuaranteeBand";
import { Footer } from "@/components/Footer";
import { RelatedVisas } from "@/components/RelatedVisas";
import { Reviews } from "@/components/Reviews";
import { SiteHeader } from "@/components/SiteHeader";
import { SubNavbar } from "@/components/SubNavbar";
import { VisaComparison } from "@/components/VisaComparison";
import { VisaOverview } from "@/components/VisaOverview";
import { VisaProcess } from "@/components/VisaProcess";
import { VisaRequirements } from "@/components/VisaRequirements";
import { Country } from "@/data/countries";
import { resolveCountryVisaConfig, type CountryVisaConfig } from "@/lib/countryVisa";
import { useHeadingReveal, useSectionReveal } from "@/hooks/usePremiumMotion";

const APPLICATION_ANCHOR = "application";

export function CountryVisaPage({ country }: { country: Country }) {
  const router = useRouter();
  const config = resolveCountryVisaConfig(country);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [travelDate, setTravelDate] = useState<Date | undefined>();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement>(null);

  useHeadingReveal(pageContainerRef, ".js-reveal-heading");
  useSectionReveal(
    pageContainerRef,
    ".js-info-item, .js-checklist-item, .js-review-card, .js-faq-item",
  );

  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById("destinations");
      if (heroEl) setScrolledPastHero(window.scrollY > heroEl.offsetHeight - 55);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * The slug, not the display name. `/apply?country=dubai` is readable,
   * shareable and round-trips through `countryFromSlug`.
   */
  const startApplication = (details: {
    travellers: number;
    plan: number;
    travelWindow?: "soon" | "later";
  }) => {
    const query = new URLSearchParams({
      country: config.slug,
      travellers: String(details.travellers),
      plan: String(details.plan),
    });
    if (travelDate) query.set("date", travelDate.toISOString().split("T")[0]);
    // `when` carries the loose travel answer. Without it the application asked
    // "when do you plan to travel?" again, one screen after the panel had.
    if (details.travelWindow) query.set("when", details.travelWindow);
    router.push(`/apply?${query.toString()}`);
  };

  /** The hero and the mobile bar send the user to the panel to configure. */
  const focusApplication = () => {
    document
      .getElementById(APPLICATION_ANCHOR)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * The hero's primary action. The reference makes "Check Required Documents"
   * the hero CTA and keeps "Start Application" in the sub-nav — the hero asks
   * for a look, not a decision, which is the right order for a page whose job
   * is to answer "can I even do this" before "shall I".
   */
  const focusDocuments = () => {
    document
      .getElementById("documents")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * PHASE 7B §5 — an application panel only where an application exists.
   *
   * 30 destinations in the dataset are `Visa Free`. Their government fee is ₹0,
   * but the panel still added the Keyrise service fee and GST and printed a
   * total — so a visa-free country page quoted ₹1,769 for a visa nobody needs
   * to buy, beside a hero that had already (correctly) hidden its CTA. The fee
   * breakdown below did the same.
   *
   * Both are now gated on the flow. `VisaFreeNotice` states the entry rules
   * that ARE known and offers nothing to purchase.
   */
  const applicable = config.flow !== "visa-free";

  const applicationPanel = (
    <CountryApplicationPanel
      config={config}
      travelDate={travelDate}
      onPickDate={() => setIsDatePickerOpen(true)}
      onStart={startApplication}
    />
  );

  return (
    <div ref={pageContainerRef} className="relative flex flex-1 flex-col bg-background">
      <SiteHeader forceHide={scrolledPastHero} />

      <main id="main-content" tabIndex={-1} className="flex-1 pb-24 md:pb-0">
        <div id="destinations" className="scroll-mt-28">
          <CountryHero config={config} onCheckDocuments={focusDocuments} />
        </div>

        <SubNavbar
          isSticky={scrolledPastHero}
          onStart={applicable ? focusApplication : undefined}
          guaranteeLabel={
            applicable
              ? `Visa guaranteed in exactly ${config.deliveryDays} ${
                  config.deliveryDays === 1 ? "day" : "days"
                }`
              : undefined
          }
          sections={[
            "visa-info",
            "documents",
            ...(applicable ? ["visa-process"] : []),
            "reviews",
            "faqs",
          ]}
        />

        {/* ══ 1. VISA INFO ═══════════════════════════════════════════════
            The only two-column region on the page, and the left column now
            ends where its facts do.

            It used to carry the fee breakdown, "Why Keyrise" and the emirates
            block underneath the three fact cards, which made it roughly twice
            the card's height — so the card was `md:sticky` and tracked the
            reader down a column of prose it had nothing to do with. The fee
            breakdown moved INTO the card as a drawer (it was restating the
            card's own figures), "Why Keyrise" is gone, and the emirates block
            is a full-width section below.

            What is left is three cards beside one card. `items-start` leaves
            the left column at its natural height and the section takes the
            card's, so the facts stay put, the card runs to its own end, and
            the next section starts under both. That empty space beneath the
            facts is the composition, not a gap to fill: it is what stops the
            page reading as two competing columns of text.

            No `md:sticky` any more. Sticky on an element taller than its
            container does nothing but cost a compositor layer. */}
        <section id="visa-info" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16 md:px-6 md:pt-14 md:pb-24">
            <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
              {/* Application first in the document, right-hand column on
                  desktop — so a phone reaches it without scrolling past the
                  whole information column first. */}
              <div id={APPLICATION_ANCHOR} className="scroll-mt-24 md:order-2">
                {applicable ? applicationPanel : <VisaFreeNotice config={config} />}
              </div>

              {/* Everything the reader needs to judge the visa itself.

                  Sticky, and it is the SHORT column that sticks now — the
                  reverse of what this page used to do. The facts are what the
                  reader checks the card against ("60 days validity, e-visa,
                  paperless — for ₹8,099?"), so they should still be there when
                  the reader has scrolled down to the ledger. It releases at the
                  section boundary, which is where the card ends. */}
              <div className="md:order-1 md:sticky md:top-[92px]">
                <VisaOverview country={country} />

                {/* Renders only for the embassy flow. */}
                <AppointmentRequirements config={config} />
              </div>
            </div>
          </div>
        </section>

        {/* Country-scoped extras. Only the UAE declares one today. Full width
            from here down, like every other section below the grid. */}
        {config.additionalSections?.includes("emirates") && (
          <section className="pb-14 md:pb-20">
            <div className="mx-auto w-full max-w-3xl px-4 md:px-6">
              <EmiratesCoverage />
            </div>
          </section>
        )}

        {/* ══ 2. DOCUMENTS ══════════════════════════════════════════════
            Full width and centred from here down. The reference switches to a
            single centred column the moment the application card ends, and the
            switch is what tells the reader the configuring is over and the
            explaining has begun. */}
        <section id="documents" className="scroll-mt-24 py-14 md:py-20">
          <VisaRequirements
            country={country}
            deliveryDays={applicable ? config.deliveryDays : undefined}
            onStart={applicable ? focusApplication : undefined}
          />

          {/* The band that closes the section: what the reader has just been
              asked to provide, and the date it buys them. */}
          {applicable && (
            <div className="mt-16 md:mt-24">
              <GuaranteeBand
                countryName={config.displayName}
                deliveryDays={config.deliveryDays}
              />
            </div>
          )}
        </section>

        {/* ══ 3. VISA PROCESS ═══════════════════════════════════════════ */}
        {applicable && (
          <section id="visa-process" className="scroll-mt-24 py-14 md:py-20">
            <VisaProcess countryName={config.displayName} />

            <div className="mt-16 md:mt-24">
              <VisaComparison />
            </div>

            <div className="mt-16 md:mt-24">
              <NoChargeBand />
            </div>
          </section>
        )}

        {/* ══ 4. REVIEWS ════════════════════════════════════════════════ */}
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <Reviews countryName={config.displayName} />
        </div>

        {/* ══ 5. FAQS ═══════════════════════════════════════════════════
            The accordion owns its own container and measure now, so this
            passes padding only. It used to be handed `w-full max-w-3xl`, which
            fought the component's own layout. */}
        <div className="py-14 md:py-20">
          <FAQAccordion
            countryName={config.displayName}
            deliveryDays={config.deliveryDays}
            flow={config.flow}
            documents={country.documents}
          />
        </div>

        {/* The closing strip. No tab of its own — the reference leaves FAQs
            highlighted while the reader is looking at it. */}
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <RelatedVisas current={country} />
        </div>
      </main>

      {/* Mobile application bar. Sends the user up to the panel rather than
          starting blind, so the same choices are made on both breakpoints.

          PHASE 8D §20: `p-3` alone put the button under the home indicator on
          a notched phone. `ApplicationShell` already accounts for this; the
          country page's bar did not. `main` carries pb-24, which clears the
          bar's own height at the end of the document. */}
      {applicable && (
      <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={focusApplication}
          className="block w-full cursor-pointer rounded-xl bg-primary px-4 py-3.5 text-center text-sm font-bold text-on-primary hover:bg-primary-hover"
        >
          Start {config.displayName} application
        </button>
      </div>
      )}

      <Footer />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={(date) => {
          setTravelDate(date);
          setIsDatePickerOpen(false);
        }}
      />
    </div>
  );
}

/**
 * What a visa-free destination gets instead of an application panel.
 *
 * States only what the dataset actually knows — the visa type and how long you
 * may stay — and offers nothing to buy. There is no fee, no delivery estimate
 * and no CTA, because none of those exist for a country you can simply fly to.
 */
function VisaFreeNotice({ config }: { config: CountryVisaConfig }) {
  return (
    <aside className="w-full rounded-2xl border border-border bg-surface p-5 shadow-e2 md:p-6">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        No visa required
      </p>
      <h2 className="type-h3 mt-2 text-foreground">
        Indian passport holders can enter {config.displayName} without a visa
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        There is nothing to apply for and nothing to pay Keyrise. Check the
        entry conditions below before you travel — a visa-free entry still has
        rules about passport validity and onward travel.
      </p>

      {config.validity && (
        <dl className="mt-5 divide-y divide-border border-t border-border">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-2xs text-muted-foreground">Permitted stay</dt>
            <dd className="text-xs font-semibold text-foreground">{config.validity}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-2xs text-muted-foreground">Entry type</dt>
            <dd className="text-xs font-semibold text-foreground">{config.visaType}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
