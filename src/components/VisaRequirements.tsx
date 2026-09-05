"use client";

/**
 * Required documents — rebuilt to the reference composition (screenshot 4).
 *
 * The reference centres this section on the page and leads with the *count* in
 * display serif ("Only 2 documents required"), then a small strip of figures,
 * then one large card per document with an illustration of the thing itself,
 * then a single outlined action. The previous version was a left-column
 * hairline list; it said the same words at a quarter of the volume, in the
 * middle of a two-column layout that had already ended.
 *
 * Everything shown is derived through `lib/application/documents.ts`, which is
 * shared with the application flow so the two cannot disagree about what an
 * application asks for.
 *
 * ── The two groups, and why the page has to keep them apart ──
 *
 * There are now two kinds of requirement, and collapsing them into one list is
 * the mistake this section is written to avoid:
 *
 *   the destination's   passport, and for some destinations a photograph.
 *                       Read from `country.documents`, so Dubai shows one card
 *                       and Thailand shows two — and a visa-free destination
 *                       shows none, which is the honest answer to "what does
 *                       this consulate want from you".
 *   ours                PAN card, return ticket, hotel booking. The same three
 *                       everywhere, because they are what Abizon must hold to
 *                       file on somebody's behalf rather than anything the
 *                       destination has asked for.
 *
 * Printed as one list, a destination that asks for nothing would read "3
 * documents required" under a heading about that country — a page that appears
 * to contradict the visa-free badge two sections above it. Printed as two, the
 * page says exactly what is true: the country wants nothing, and we want three
 * things, and here is which is which.
 *
 * WHAT IS NOT REPRODUCED. The reference's figure strip reads "03 MIN fastest
 * time taken to apply / 07 MIN avg. time taken to apply". Those are telemetry
 * from a live product with real applicants; Abizon has neither. The strip is
 * kept — it is load-bearing for the composition — carrying two figures the
 * dataset actually holds: how many documents, and how many days.
 *
 * The illustrations are drawn, not photographed, and announce nothing to a
 * screen reader: they are decoration for a label that is already written out.
 */

import {
  destinationDocuments,
  partyDocuments,
  type DocumentKind,
  type DocumentRequirement,
} from "@/lib/application/documents";
import { Country } from "@/data/countries";
import { displayCountryName } from "@/lib/countryVisa";

type VisaRequirementsProps = {
  country: Country;
  /** The dataset's SLA, for the second figure in the strip. */
  deliveryDays?: number;
};

export function VisaRequirements({
  country,
  deliveryDays,
}: VisaRequirementsProps) {
  const displayName = displayCountryName(country);
  const destination = destinationDocuments(country.documents);
  const party = partyDocuments();
  const count = destination.length + party.length;

  const figures: Array<{ value: string; label: string }> = [
    {
      value: String(count).padStart(2, "0"),
      label: count === 1 ? "Document to prepare" : "Documents to prepare",
    },
  ];
  if (typeof deliveryDays === "number") {
    figures.push({
      value: String(deliveryDays).padStart(2, "0"),
      label: deliveryDays === 1 ? "Day, guaranteed" : "Days, guaranteed",
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 text-center md:px-6">
      <h2 className="type-h2 text-balance text-foreground js-reveal-heading">
        {`Only ${count} document${count === 1 ? "" : "s"} required`}
      </h2>

      {/* The figure strip. Two cells, split by a hairline, exactly as the
          reference sets it — but every number here is read from the dataset. */}
      <dl className="mt-8 flex items-stretch justify-center divide-x divide-border">
        {figures.map((figure) => (
          <div key={figure.label} className="px-8 md:px-10">
            <dd
              data-numeric
              className="text-xl font-bold tracking-tight text-foreground"
            >
              {figure.value}
            </dd>
            <dt className="mt-1.5 max-w-[9rem] text-2xs font-bold uppercase leading-snug tracking-[0.1em] text-muted-foreground">
              {figure.label}
            </dt>
          </div>
        ))}
      </dl>

      <RequirementGroup
        heading={`What ${displayName} asks for`}
        /* The empty case is a sentence rather than an omitted section. A
           destination that wants nothing is a selling point, and dropping the
           heading would leave the page looking as though the three below were
           the consulate's. */
        empty={`${displayName} does not ask Indian passport holders for documents of its own. Everything below is what we need in order to file.`}
        requirements={destination}
      />

      <RequirementGroup
        heading="What we need to file for you"
        note="Asked once per application, whoever else is travelling with you — one PAN, one booked way home, one place to stay."
        requirements={party}
      />

      <p className="mx-auto mt-12 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Everything above is checked against {displayName}&rsquo;s requirements
        before your application is filed. You can scan each one with your phone
        — nothing needs printing or posting.
      </p>

      {/* There was a second `Start Application` here, under the document
          list. It has gone, and nothing replaced it: the sub-nav carries
          the application CTA from the moment the hero leaves the screen, so
          this one sat a few hundred pixels below a control saying the same
          thing, and the reader who had just finished reading what to bring
          was offered the same door twice. */}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One headed group of document cards.
 *
 * The grid steps to three columns at exactly three cards, so a group never
 * ends on a lone card stranded in a row of its own — which is what three
 * documents did in a two-column grid, and it reads as a layout that failed
 * halfway rather than as a set of three.
 */
function RequirementGroup({
  heading,
  note,
  empty,
  requirements,
}: {
  heading: string;
  note?: string;
  /** Shown instead of the grid when the group is empty. */
  empty?: string;
  requirements: DocumentRequirement[];
}) {
  const columns =
    requirements.length === 1
      ? "sm:max-w-sm"
      : requirements.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <section className="mt-12">
      <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {heading}
      </h3>

      {requirements.length === 0 ? (
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {empty}
        </p>
      ) : (
        <>
          {note && (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {note}
            </p>
          )}

          <ul className={`mx-auto mt-7 grid max-w-3xl gap-5 ${columns}`}>
            {requirements.map((requirement) => (
              <li
                key={requirement.kind}
                className="js-checklist-item flex flex-col items-center rounded-3xl bg-surface-sunken px-6 py-10"
              >
                {/* THE STAGE. Every prop is laid out inside a fixed-height box
                    rather than sizing the card itself.

                    Without it the cards in a group do not line up: the passport
                    is a 144x104 booklet, the photograph is a 144x144 square
                    whose crop ticks extend 12px past it on every side and whose
                    "42 mm" measurement hangs 24px below — so the photograph
                    card's label sat lower than the passport card's, and the
                    measurement collided with it. The stage is tall enough for
                    the ticks and the measurement, the props are bottom-aligned
                    in it, and every label lands on the same line. `items-end`
                    because a passport stands on a surface and a photograph is
                    pinned to one; both read as resting. */}
                <div className="flex h-[13.5rem] w-full items-end justify-center">
                  <DocumentArtwork kind={requirement.kind} />
                </div>
                <p className="mt-6 text-lg font-bold text-foreground">
                  {requirement.label}
                </p>
                <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
                  {requirement.detail}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * The card illustrations.
 *
 * Drawn here rather than sourced, because the reference's are photographs of a
 * real Indian passport and a real applicant's face — neither of which Abizon
 * has a licence to. `aria-hidden` throughout: the document's name sits directly
 * beneath in text.
 */
function DocumentArtwork({ kind }: { kind: DocumentKind }) {
  if (kind === "photograph") {
    return (
      // `pb-7` reserves the measurement's own line inside the prop, so the
      // stage above can bottom-align this against the passport without the
      // "42 mm" hanging into the label beneath. The crop ticks get `mx-3` for
      // the same reason on the horizontal axis.
      <div aria-hidden className="relative mx-3 pb-7">
        {/* The 42mm crop guides the reference prints around its sample photo —
            the same measurement the live-capture frame guide uses. */}
        <CropTicks />
        <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl bg-foreground shadow-e3">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="38" r="18" className="fill-white/85" />
            <path
              d="M14 100c0-20 16-32 36-32s36 12 36 32z"
              className="fill-white/85"
            />
          </svg>
        </div>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xs text-muted-foreground">
          42 mm
        </span>
      </div>
    );
  }

  if (kind === "panCard") {
    /**
     * A PAN card, at its real proportions.
     *
     * ISO/IEC 7810 ID-1: 85.6 x 53.98mm, i.e. 1.586:1 — the same card as a
     * credit card, which is what makes it recognisable at this size without a
     * single word on it being legible. 176x111 is that ratio at the width the
     * passport booklet occupies.
     *
     * Nothing here is a real number or a real name. The strip below the
     * portrait is four bars of decreasing length, which reads as printed
     * fields; writing a plausible ten-character PAN on a public marketing page
     * is how a format ends up in somebody's test data.
     */
    return (
      <div
        aria-hidden
        className="flex h-[6.9375rem] w-44 flex-col justify-between rounded-lg bg-[linear-gradient(135deg,#1D4ED8_0%,#1E3A8A_58%,#172554_100%)] p-3 shadow-e3"
      >
        <div className="flex items-start justify-between">
          <span className="text-[6px] font-bold uppercase leading-tight tracking-[0.14em] text-white/70">
            Income Tax
            <br />
            Department
          </span>
          <span className="size-4 rounded-full bg-white/25" />
        </div>

        <div className="flex items-end gap-2.5">
          {/* The portrait window every PAN card carries, bottom-left. */}
          <span className="flex h-11 w-9 items-end justify-center overflow-hidden rounded-sm bg-white/85">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <circle cx="50" cy="34" r="16" className="fill-slate-500" />
              <path d="M16 100c0-19 15-30 34-30s34 11 34 30z" className="fill-slate-500" />
            </svg>
          </span>

          <span className="flex flex-1 flex-col gap-[3px] pb-1">
            <span className="h-[3px] w-full rounded-full bg-white/60" />
            <span className="h-[3px] w-4/5 rounded-full bg-white/35" />
            <span className="h-[3px] w-3/5 rounded-full bg-white/35" />
            <span className="mt-1 h-[5px] w-11/12 rounded-full bg-amber-300/80" />
          </span>
        </div>
      </div>
    );
  }

  if (kind === "returnTicket") {
    /**
     * A boarding pass, torn.
     *
     * The notch pair and the dashed rule are the whole idea: they are what
     * distinguishes a ticket from the hotel voucher beside it, which is
     * otherwise the same white rectangle with lines on it. The two notches are
     * circles in the card's own background colour punched over the edges,
     * which is cheaper and sharper than a clip-path and survives a theme
     * change, because they inherit the surface they sit on.
     *
     * The arrow between the two airport codes points one way and the copy says
     * "return", which is not a contradiction: what is being asked for is the
     * inbound leg — the flight home — and this is that flight.
     */
    return (
      <div
        aria-hidden
        className="relative flex h-[8.5rem] w-44 flex-col rounded-xl bg-surface shadow-e3"
      >
        <div className="flex flex-1 flex-col justify-center gap-2 px-4">
          <span className="text-[6px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Boarding pass
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold leading-none tracking-tight text-foreground">
              NRT
            </span>
            <svg viewBox="0 0 24 12" className="h-2.5 flex-1 text-border-strong">
              <path
                d="M0 6h20M16 2l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[15px] font-bold leading-none tracking-tight text-foreground">
              DEL
            </span>
          </div>
          <span className="h-[3px] w-3/5 rounded-full bg-border" />
        </div>

        {/* The tear. Notches first, then the perforation between them. */}
        <span className="absolute -left-2 top-[62%] size-4 -translate-y-1/2 rounded-full bg-surface-sunken" />
        <span className="absolute -right-2 top-[62%] size-4 -translate-y-1/2 rounded-full bg-surface-sunken" />
        <span className="absolute inset-x-3 top-[62%] border-t border-dashed border-border" />

        <div className="flex h-[38%] items-center gap-1 px-4">
          {/* A barcode, as bars of varying width. Fixed rather than random:
              a stub that redraws itself differently on every render is a
              distraction on a page nobody is meant to be watching. */}
          {[2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 2].map((width, index) => (
            <span
              key={index}
              style={{ width: `${width}px` }}
              className="h-6 bg-foreground/70"
            />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "hotelStay") {
    /**
     * A hotel, as a facade.
     *
     * The obvious drawing here is a bed, and a bed at 140px is a grey
     * rectangle with a smaller grey rectangle on it. A building with lit
     * windows reads instantly at any size, and the lit-versus-dark windows are
     * what make it read as occupied rather than as a block of flats.
     *
     * The awning strip at the base is what separates it from an office block.
     */
    return (
      <div aria-hidden className="flex flex-col items-center">
        <div className="flex h-[8.75rem] w-[8.5rem] flex-col overflow-hidden rounded-t-xl bg-[linear-gradient(160deg,#334155_0%,#1E293B_100%)] shadow-e3">
          <span className="mt-3 self-center text-[6px] font-bold uppercase tracking-[0.2em] text-amber-200/70">
            Hotel
          </span>

          {/* Four rows of five windows, two of them dark. Laid out as a grid so
              the facade stays even if the box is resized. */}
          <div className="mt-3 grid flex-1 grid-cols-5 gap-1.5 px-3">
            {Array.from({ length: 20 }).map((_, index) => (
              <span
                key={index}
                className={
                  index === 6 || index === 13 || index === 17
                    ? "rounded-[2px] bg-white/10"
                    : "rounded-[2px] bg-amber-200/55"
                }
              />
            ))}
          </div>

          {/* The doorway, and the awning over it. */}
          <div className="relative mt-2 flex h-7 justify-center">
            <span className="h-full w-7 rounded-t-full bg-amber-200/70" />
          </div>
        </div>
        <span className="h-1.5 w-[9.5rem] rounded-b-sm bg-border-strong" />
      </div>
    );
  }

  // Passport: a closed booklet, standing, catching light down one edge.
  return (
    <div
      aria-hidden
      className="flex h-40 w-[7rem] flex-col items-center justify-center rounded-md bg-[linear-gradient(105deg,#3B3B46_0%,#1C1C22_38%,#2A2A33_100%)] shadow-e3"
    >
      <span className="text-[6px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
        Republic of India
      </span>
      <svg viewBox="0 0 40 40" className="mt-6 h-10 w-10 fill-amber-200/60">
        <circle cx="20" cy="9" r="4" />
        <path d="M8 16h24l-3 8H11z" />
        <path d="M12 26h16l-2 7H14z" />
      </svg>
      <span className="mt-6 text-[6px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
        Passport
      </span>
    </div>
  );
}

/**
 * The four corner ticks that frame the reference's photo sample.
 *
 * Positioned against the 144px photo square, not against the wrapper — the
 * wrapper carries `pb-7` for the measurement, so a `-bottom-3` measured from it
 * would put the lower ticks 28px below the photograph instead of 12px.
 */
function CropTicks() {
  const corner = "absolute h-4 w-4 border-border-strong text-transparent";
  return (
    <>
      <span className={`${corner} -left-3 -top-3 border-l border-t`} />
      <span className={`${corner} -right-3 -top-3 border-r border-t`} />
      <span className={`${corner} -left-3 top-[8.75rem] border-b border-l`} />
      <span className={`${corner} -right-3 top-[8.75rem] border-b border-r`} />
    </>
  );
}
