"use client";

/**
 * THE CAPTURE TAKEOVER
 * ---------------------------------------------------------------------------
 * Every screen that asks for one image — the photograph, the passport's photo
 * page, its back page — is this frame with a different middle.
 *
 * It is a takeover rather than a panel, and that is the reference's decision
 * and the right one: the progress meter and the step rail both disappear while
 * a camera is open or a passport is being chosen. Supplying a document needs
 * two hands and the whole screen, and a percentage counting up in the corner
 * while somebody holds a passport to a webcam is noise at the exact moment
 * there is least attention to spare.
 *
 * THE HEADLINE IS TWO LINES, and the split carries meaning rather than being a
 * line break. The first line names the thing ("Passport,"); the second, in the
 * brand colour, is the instruction ("photo page up"). It is set in the serif
 * display face, which everywhere else in this product is reserved for
 * editorial voice and destination names — here it marks the three screens where
 * the flow stops being a form and asks the applicant to do something physical.
 *
 * The reference sets that second line in indigo. This sets it in
 * `--color-primary`, which is the same decision expressed in this product's
 * palette.
 */

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { ApplyBack } from "../ApplyChrome";

export type CaptureMethod = "camera" | "upload";

export type CaptureMethodOption = {
  id: CaptureMethod;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function CaptureTakeover({
  titleTop,
  titleAccent,
  methods,
  method,
  onMethodChange,
  onBack,
  onClose,
  aside,
  children,
}: {
  /** First line, in ink. */
  titleTop: string;
  /** Second line, in the brand colour. */
  titleAccent: string;
  /** Omit to hide the switcher entirely — the confirm screen has no methods. */
  methods?: CaptureMethodOption[];
  method?: CaptureMethod;
  onMethodChange?: (method: CaptureMethod) => void;
  onBack: () => void;
  /** The X. Omitted where there is nothing to return to. */
  onClose?: () => void;
  /** The guidance card, floated top-right on wide screens. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  // Escape leaves the takeover the same way the X does. A full-screen layer
  // that traps you until you find the right control is the thing people mean
  // when they say a flow feels heavy.
  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${titleTop} ${titleAccent}`}
      className="fixed inset-0 z-modal flex flex-col overflow-y-auto bg-surface"
    >
      <ApplyBack onClick={onBack} />

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close and go back to your documents"
          className="fixed right-4 top-4 z-raised flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-subtle-foreground transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-foreground md:right-6 md:top-6"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}

      {/* The guidance card. Absolutely placed so it never pushes the pane off
          the page's centre line — the reference keeps the drop zone centred on
          the viewport with the card floating beside it, and a flex row would
          give up that alignment the moment the card appeared.

          Two constraints decide where it can appear at all. It needs the
          margin beside an 820px content column to be wider than the card,
          which does not happen until `2xl`; and it must clear the close
          button, which owns the top-right corner. Hence `top-24` rather than
          matching the X's own inset. Below that width there is nowhere to put
          it that is not on top of something, so it is not put anywhere. */}
      {aside && (
        <div className="pointer-events-none absolute right-8 top-[88px] hidden min-[1340px]:block">
          {aside}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center px-5 pb-10 pt-[72px] md:pt-20">
        <h1 className="text-center font-display text-[26px] font-medium leading-[1.16] tracking-[-0.015em] text-foreground sm:text-[30px] md:text-[34px]">
          {titleTop}
          <br />
          <span className="text-primary">{titleAccent}</span>
        </h1>

        <div className="mt-8 flex w-full flex-1 flex-col items-center justify-center md:mt-9">
          {children}
        </div>

        {methods && methods.length > 1 && method && onMethodChange && (
          <div className="mt-8 flex justify-center">
            <div
              role="group"
              aria-label="How to supply this document"
              className="flex items-center gap-1 rounded-full bg-surface-sunken p-1"
            >
              {methods.map(({ id, label, Icon }) => {
                const active = id === method;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onMethodChange(id)}
                    aria-pressed={active}
                    className={[
                      "flex h-[38px] cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-semibold",
                      "transition-colors duration-[--duration-fast] ease-[--ease-out]",
                      active
                        ? "bg-foreground text-background shadow-e1"
                        : "text-subtle-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon aria-hidden className="size-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
