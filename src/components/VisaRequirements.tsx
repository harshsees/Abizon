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
 * Everything shown is still derived from `country.documents` — the only
 * requirement data Keyrise has — through `lib/application/documents.ts`, which
 * is shared with the application flow so the two cannot disagree about what a
 * destination asks for. Dubai is "Passport Only", so Dubai renders one card,
 * and the heading says one.
 *
 * WHAT IS NOT REPRODUCED. The reference's figure strip reads "03 MIN fastest
 * time taken to apply / 07 MIN avg. time taken to apply". Those are telemetry
 * from a live product with real applicants; Keyrise has neither. The strip is
 * kept — it is load-bearing for the composition — carrying two figures the
 * dataset actually holds: how many documents, and how many days.
 *
 * The illustrations are drawn, not photographed, and announce nothing to a
 * screen reader: they are decoration for a label that is already written out.
 */

import { requiredDocuments, type DocumentKind } from "@/lib/application/documents";
import { Country } from "@/data/countries";
import { displayCountryName } from "@/lib/countryVisa";

type VisaRequirementsProps = {
  country: Country;
  /** The dataset's SLA, for the second figure in the strip. */
  deliveryDays?: number;
  /** Renders the section's closing action. Omitted where nothing is applicable. */
  onStart?: () => void;
};

export function VisaRequirements({
  country,
  deliveryDays,
  onStart,
}: VisaRequirementsProps) {
  const displayName = displayCountryName(country);
  const requirements = requiredDocuments(country.documents);
  const count = requirements.length;

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
        {count === 0
          ? "No documents required"
          : `Only ${count} document${count === 1 ? "" : "s"} required`}
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

      {count === 0 ? (
        <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-muted-foreground">
          {displayName} does not ask Indian passport holders for documents
          before you travel. If that changes, the application will tell you what
          is needed before you file.
        </p>
      ) : (
        <>
          <ul
            className={`mx-auto mt-10 grid max-w-3xl gap-5 ${
              count === 1 ? "sm:max-w-sm" : "sm:grid-cols-2"
            }`}
          >
            {requirements.map((requirement) => (
              <li
                key={requirement.kind}
                className="js-checklist-item flex flex-col items-center rounded-3xl bg-surface-sunken px-6 py-10"
              >
                <DocumentArtwork kind={requirement.kind} />
                <p className="mt-8 text-lg font-bold text-foreground">
                  {requirement.label}
                </p>
                <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
                  {requirement.detail}
                </p>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Everything above is checked against {displayName}&rsquo;s
            requirements before your application is filed. You can scan each one
            with your phone — nothing needs printing or posting.
          </p>
        </>
      )}

      {onStart && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-13 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-9 text-sm font-bold text-foreground shadow-e1 transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-surface-sunken active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
          >
            Start Application
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The card illustrations.
 *
 * Drawn here rather than sourced, because the reference's are photographs of a
 * real Indian passport and a real applicant's face — neither of which Keyrise
 * has a licence to. `aria-hidden` throughout: the document's name sits directly
 * beneath in text.
 */
function DocumentArtwork({ kind }: { kind: DocumentKind }) {
  if (kind === "photograph") {
    return (
      <div aria-hidden className="relative">
        {/* The 42mm crop guides the reference prints around its sample photo —
            the same measurement the live-capture frame guide uses. */}
        <CropTicks />
        <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl bg-foreground">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="38" r="18" className="fill-white/85" />
            <path
              d="M14 100c0-20 16-32 36-32s36 12 36 32z"
              className="fill-white/85"
            />
          </svg>
        </div>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-2xs text-muted-foreground">
          42 mm
        </span>
      </div>
    );
  }

  // Passport: a closed booklet, standing, catching light down one edge.
  return (
    <div
      aria-hidden
      className="flex h-36 w-[6.5rem] flex-col items-center justify-center rounded-md bg-[linear-gradient(105deg,#3B3B46_0%,#1C1C22_38%,#2A2A33_100%)] shadow-e3"
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

/** The four corner ticks that frame the reference's photo sample. */
function CropTicks() {
  const corner =
    "absolute h-4 w-4 border-border-strong text-transparent";
  return (
    <>
      <span className={`${corner} -left-3 -top-3 border-l border-t`} />
      <span className={`${corner} -right-3 -top-3 border-r border-t`} />
      <span className={`${corner} -bottom-3 -left-3 border-b border-l`} />
      <span className={`${corner} -bottom-3 -right-3 border-b border-r`} />
    </>
  );
}
