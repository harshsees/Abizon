"use client";

/**
 * The full-width black promise bands.
 *
 * The reference uses this slab twice, and the repetition is the point: it is
 * the one treatment on the page that stops being a document and makes a
 * promise, so it appears once at the end of Documents (screenshot 5) and once
 * at the end of Visa Process (screenshot 8). Both are the same object — a wide
 * near-black slab lit from above, a line mark, a display-serif sentence whose
 * payload word is green, and one quiet line underneath.
 *
 *   GuaranteeBand   closes Documents. States WHEN the visa arrives.
 *   NoChargeBand    closes Visa Process. States what happens if it does not.
 *
 * They were one component and one band before; `PromiseBand` is the shell they
 * now share, so the second one cannot drift from the first.
 *
 * WHAT THEY SAY, and what they deliberately do not.
 *
 * The reference prints a date *and a clock time* ("14th Aug, 12:01 pm").
 * Keyrise has no delivery-time source — `VisaGuarantee` has carried that
 * distinction since Phase 4, printing a time only when handed a real
 * `guaranteedAt` and a date alone otherwise. These follow the same rule: today
 * + `deliveryDays` is arithmetic on a real SLA, an hour would be invention.
 *
 * The date is computed on the client, after mount, for a reason. Rendering it
 * during SSR bakes the build date into a statically-generated page, so a page
 * built on the 12th would still promise the 13th in September. Until it
 * resolves, the band states the guarantee without the date rather than
 * flashing a wrong one.
 *
 * ── THE REVEAL ────────────────────────────────────────────────────────────
 *
 * Measured off the reference recording (image_video/Dubai/Recording
 * 2026-08-12 041840.mp4) between 6.1s and 7.4s. The slab does not fade or rise
 * into place: it starts as a small black PILL sitting where the clock icon
 * will end up, and grows outward from that centre — width first, then height —
 * until it is the full slab, with the corner radius relaxing from a pill to
 * the slab's own 28px as it goes. The sentence fades in a beat before the
 * growth finishes, so it is legible while the edges are still travelling.
 *
 * It is scrubbed, not triggered. In the recording the slab's size tracks the
 * scrollbar one-to-one — stop scrolling mid-way and it stops mid-way — which
 * is what makes it read as the reader opening the band rather than the page
 * playing an animation at them.
 *
 * SCRUBBED FORWARDS ONLY. The scroll progress is latched at its high-water mark
 * (see `opened` below), so scrolling back up does not un-open a band that has
 * already opened. Reversing was the literal reading of "scrubbed" and it was
 * wrong: it made the reader feel they had undone something by looking back.
 *
 * HOW, and why not the obvious way. `clip-path: inset()` on the slab itself,
 * in pixels off a measured box. The obvious way is `scale`, and it is wrong
 * twice over: scaling a slab from 7% to 100% stretches the icon and the type
 * inside it like a rubber sheet, and the corner radius scales with it, so the
 * pill's 22px radius would arrive as a 300px blob. Clipping leaves everything
 * inside at its final size and only moves the four edges, which is exactly
 * what the recording shows. The layout box is full-size throughout, so nothing
 * below the band shifts while it opens.
 *
 * Pixels rather than percentages because the pill has to stay a pill. A
 * percentage inset gives a shape proportional to the slab, and the slab is
 * ~240px tall on desktop and ~330px tall on a phone where the sentence wraps
 * to three lines — the same percentages that make a horizontal pill on one
 * make a vertical lozenge on the other.
 */

import { AlarmClock, ShieldCheck } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

function formatGuaranteeDate(daysAhead: number): string {
  const due = new Date();
  due.setDate(due.getDate() + daysAhead);

  const day = due.getDate();
  const month = due.toLocaleDateString("en-IN", { month: "short" });
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} ${month}`;
}

/** The date never changes while the page is open, so nothing to subscribe to. */
const noSubscribe = () => () => {};

/* -------------------------------------------------------------------------- */
/* The shared slab                                                            */
/* -------------------------------------------------------------------------- */

/** The pill the slab grows out of, measured off the reference at 6.6s. */
const PILL_W = 88;
const PILL_H = 44;
/** The slab's resting radius. Matches `rounded-[28px]` below. */
const SLAB_RADIUS = 28;

type PromiseBandProps = {
  icon: typeof AlarmClock;
  /** The display-serif sentence. Wrap the payload word in `<Accent>`. */
  children: ReactNode;
  caption: string;
};

export function PromiseBand({ icon: Icon, children, caption }: PromiseBandProps) {
  const slabRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  /**
   * The slab's own box, as motion values rather than state.
   *
   * They feed a `useTransform` alongside the scroll progress, so a resize
   * recomputes the clip on the next frame without re-rendering the component —
   * and, more importantly, without the transform closing over a stale width the
   * way a `useState` box would on the first frame after a breakpoint change.
   */
  const boxWidth = useMotionValue(0);
  const boxHeight = useMotionValue(0);
  /**
   * Where the mark's centre sits inside the slab.
   *
   * The pill is centred on the ICON, not on the slab, and the two are nowhere
   * near each other: the icon sits above three lines of copy, so it is roughly
   * a third of the way down. Centring the pill on the slab instead framed the
   * middle of the sentence and left the mark clipped out entirely — the one
   * element that has to be visible at rest.
   */
  const markCentre = useMotionValue(0);

  useEffect(() => {
    const element = slabRef.current;
    if (!element) return;

    const measure = () => {
      boxWidth.set(element.offsetWidth);
      boxHeight.set(element.offsetHeight);

      // Rects rather than `offsetTop`: the mark is two positioned ancestors
      // deep, so an offset chain would have to be walked, and a rect
      // subtraction is both shorter and immune to a wrapper gaining
      // `position: relative` later.
      const mark = markRef.current;
      if (mark) {
        const slab = element.getBoundingClientRect();
        const glyph = mark.getBoundingClientRect();
        markCentre.set(glyph.top - slab.top + glyph.height / 2);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [boxWidth, boxHeight, markCentre]);

  /**
   * Starts opening as the slab's top edge crosses 90% of the viewport and is
   * fully open once its centre has reached 55% — i.e. it finishes just before
   * the band sits centred, which is where the recording finishes it.
   */
  const { scrollYProgress } = useScroll({
    target: slabRef,
    offset: ["start 90%", "center 55%"],
  });

  /**
   * THE RATCHET.
   *
   * `scrollYProgress` is symmetric: it falls again on the way back up, so the
   * band closed itself whenever the reader scrolled up past it. That is right
   * for a parallax and wrong for this, because this is not decoration tracking
   * the scrollbar — it is a slab being *opened*, and an opened thing does not
   * re-close because you looked away. The reference recording only ever plays
   * it forwards.
   *
   * So the value that drives the clip is a separate motion value holding the
   * high-water mark. It is written from a subscription rather than derived with
   * `useTransform`, because a transform is a pure function of its inputs and
   * cannot remember anything; the memory is the point. No state and no
   * re-render — the subscription runs on the scroll frame and writes straight
   * to the motion value, which is what keeps this off the React render path.
   */
  const opened = useMotionValue(0);

  useEffect(() => {
    const latch = (value: number) => {
      if (value > opened.get()) opened.set(value);
    };
    latch(scrollYProgress.get()); // a band already past on load starts open
    return scrollYProgress.on("change", latch);
  }, [scrollYProgress, opened]);

  const clipPath = useTransform(
    [opened, boxWidth, boxHeight, markCentre],
    ([progress, width, height, centre]: number[]) => {
      const closed = 1 - progress;
      const insetX = Math.max(0, ((width - PILL_W) / 2) * closed);
      // Asymmetric: the window closes onto the mark, so the two vertical
      // insets are whatever it takes to leave a PILL_H-tall band around it.
      const top = Math.max(0, (centre - PILL_H / 2) * closed);
      const bottom = Math.max(0, (height - centre - PILL_H / 2) * closed);
      const radius = SLAB_RADIUS + (PILL_H / 2 - SLAB_RADIUS) * closed;
      return `inset(${top}px ${insetX}px ${bottom}px ${insetX}px round ${radius}px)`;
    },
  );

  // The sentence arrives while the edges are still moving, per the recording.
  // Driven by the latched value too, or the copy would fade back out on the way
  // up while the slab it sits in stayed open.
  const copyOpacity = useTransform(opened, [0.35, 0.78], [0, 1]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
      {/* Lit from the upper left rather than flat black, so the slab has a
          source. Matches the plate's logic in CountryImagePlate. */}
      <motion.div
        ref={slabRef}
        style={reduceMotion ? undefined : { clipPath }}
        className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(105deg,#33333A_0%,#141418_38%,#08080A_100%)] px-6 py-14 text-center will-change-[clip-path] md:px-12 md:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/3 left-1/3 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-white opacity-[0.05] blur-3xl"
        />

        <div className="relative">
          {/* Never faded: at rest the pill contains nothing but this mark, so
              it is the one thing that has to be there from the first frame.
              The span is here only to be measured: it gives the ref a plain
              element to hold rather than depending on how the icon library
              forwards refs into its SVG. */}
          <span ref={markRef} className="mx-auto block h-9 w-9">
            <Icon aria-hidden className="h-9 w-9 text-white" strokeWidth={1.5} />
          </span>

          <motion.p
            style={reduceMotion ? undefined : { opacity: copyOpacity }}
            className="type-h2 mx-auto mt-6 max-w-3xl text-balance text-white"
          >
            {children}
          </motion.p>

          <motion.p
            style={reduceMotion ? undefined : { opacity: copyOpacity }}
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base"
          >
            {caption}
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

/** The one green the bands use. Reserved for the word carrying the promise. */
function Accent({ children }: { children: ReactNode }) {
  return <span className="text-[#5DE28E]">{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* The two instances                                                          */
/* -------------------------------------------------------------------------- */

export function GuaranteeBand({
  countryName,
  deliveryDays,
}: {
  countryName: string;
  /** The dataset's real SLA. */
  deliveryDays: number;
}) {
  /**
   * `useSyncExternalStore` rather than an effect writing state: the server
   * snapshot is `null` (no date in the prerendered HTML, so the build date
   * cannot be baked into a static page) and the client snapshot is today's
   * date. React swaps them at hydration without a cascading render, which an
   * effect-plus-setState would cause.
   */
  const dueDate = useSyncExternalStore(
    noSubscribe,
    () => formatGuaranteeDate(deliveryDays),
    () => null,
  );

  return (
    <PromiseBand
      icon={AlarmClock}
      caption="No ambiguity. You know when your visa arrives before you apply."
    >
      Get your {countryName} visa on or before{" "}
      <Accent>
        {dueDate ??
          `${deliveryDays} ${deliveryDays === 1 ? "day" : "days"} from filing`}
      </Accent>
    </PromiseBand>
  );
}

export function NoChargeBand() {
  return (
    <PromiseBand
      icon={ShieldCheck}
      caption="When we don't keep our promise, we don't expect anything back."
    >
      Visa not on time? <Accent>No charge.</Accent>
    </PromiseBand>
  );
}
