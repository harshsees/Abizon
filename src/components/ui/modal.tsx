"use client";

/**
 * Modal — adapted from 21st.dev `@ddoemonn/modal`.
 *
 * Provides the accessibility machinery every dialog in this app was missing:
 * focus trap, focus restore, Escape to close, background scroll lock,
 * `inert` on sibling content, `role="dialog"` + `aria-modal`, and a
 * stacking-aware Escape handler for nested modals.
 *
 * Changes from source:
 *  - `motion/react` import swapped for `framer-motion` (the installed package)
 *  - stone palette + hardcoded #4568FF focus colour swapped for design tokens
 *  - z-index pulled from the token ladder instead of a literal
 *  - `useModal` re-exported so dialogs with bespoke chrome (e.g. the date
 *    picker) get the same behaviour without the default shell
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { DURATION, EASE as MOTION_EASE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Pulled from the shared motion contract so the dialog agrees with every
// other surface; it previously carried three private curve constants.
const EASE = MOTION_EASE.out;
const LEAVE = MOTION_EASE.in;
const SURFACE = SPRING.snappy;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * `false` while rendering on the server, `true` once hydrated — so the portal
 * target is resolved without a setState-in-effect round trip.
 */
const subscribeToNothing = () => () => {};
const useIsMounted = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "summary",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex !== -1 &&
      !el.hasAttribute("inert") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.getClientRects().length > 0,
  );
}

let locks = 0;
let releaseLock: (() => void) | null = null;

function lockDocumentScroll() {
  locks += 1;
  if (locks > 1) return;

  const body = document.body;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  const overflow = body.style.overflow;
  const paddingRight = body.style.paddingRight;
  const base = Number.parseFloat(window.getComputedStyle(body).paddingRight);

  body.style.overflow = "hidden";
  if (gap > 0) {
    body.style.paddingRight = `${(Number.isFinite(base) ? base : 0) + gap}px`;
  }

  releaseLock = () => {
    body.style.overflow = overflow;
    body.style.paddingRight = paddingRight;
  };
}

function unlockDocumentScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  releaseLock?.();
  releaseLock = null;
}

const stack: object[] = [];

export type UseModalOptions = {
  open: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  lockScroll?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  container?: HTMLElement | null;
};

export function useModal({
  open,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  lockScroll = true,
  initialFocusRef,
  container,
}: UseModalOptions) {
  const mounted = useIsMounted();
  const target = mounted ? (container === undefined ? document.body : container) : null;

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const downedOutside = useRef(false);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  // Latest props, read from stable event handlers so they never go stale
  // without re-subscribing every listener. Declared before the effects that
  // read it, so it is already current by the time any of them run.
  const latest = useRef({ onClose, closeOnEscape, closeOnBackdrop, initialFocusRef });
  useEffect(() => {
    latest.current = { onClose, closeOnEscape, closeOnBackdrop, initialFocusRef };
  });

  const close = useCallback(() => latest.current.onClose(), []);

  useIsomorphicLayoutEffect(() => {
    if (!open || !lockScroll) return;
    lockDocumentScroll();
    return () => unlockDocumentScroll();
  }, [open, lockScroll]);

  // Hide sibling content from assistive tech while the dialog is open.
  useEffect(() => {
    if (!open || !target) return;
    const overlay = overlayRef.current;
    const parent = overlay?.parentElement;
    if (!overlay || !parent) return;

    const changed: Array<[Element, string | null]> = [];
    for (const child of Array.from(parent.children)) {
      if (child === overlay) continue;
      changed.push([child, child.getAttribute("inert")]);
      child.setAttribute("inert", "");
    }

    return () => {
      for (const [child, previous] of changed) {
        if (previous === null) child.removeAttribute("inert");
        else child.setAttribute("inert", previous);
      }
    };
  }, [open, target]);

  // Escape closes only the topmost dialog.
  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (stack[stack.length - 1] !== token) return;
      if (!latest.current.closeOnEscape) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current.onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = stack.indexOf(token);
      if (index > -1) stack.splice(index, 1);
    };
  }, [open]);

  // Pull stray focus back into the panel.
  useEffect(() => {
    if (!open || !target) return;
    const onFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current;
      const node = event.target as Node | null;
      if (!panel || !node || panel.contains(node)) return;
      panel.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [open, target]);

  // Move focus in on open, restore it on close.
  useEffect(() => {
    if (!open || !target) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const preferred = latest.current.initialFocusRef?.current;
    (preferred ?? focusableWithin(panel)[0] ?? panel).focus({ preventScroll: true });

    return () => {
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, target]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const items = focusableWithin(panel);
    if (items.length === 0) {
      event.preventDefault();
      panel.focus({ preventScroll: true });
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    const panel = panelRef.current;
    downedOutside.current = !panel?.contains(event.target as Node);
  }, []);

  const onClick = useCallback((event: React.MouseEvent) => {
    const panel = panelRef.current;
    if (!latest.current.closeOnBackdrop) return;
    if (panel?.contains(event.target as Node)) return;
    if (!downedOutside.current) return;
    downedOutside.current = false;
    latest.current.onClose();
  }, []);

  return {
    target,
    titleId,
    descriptionId,
    overlayProps: { ref: overlayRef, onPointerDown, onClick },
    panelProps: {
      ref: panelRef,
      role: "dialog" as const,
      "aria-modal": true as const,
      "aria-labelledby": titleId,
      tabIndex: -1 as const,
      onKeyDown,
    },
    close,
  };
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
} as const;

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Hide the title visually while keeping it for screen readers. */
  hideTitle?: boolean;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  closeLabel?: string;
  showClose?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close dialog",
  showClose = true,
  closeOnEscape = true,
  closeOnBackdrop = true,
  initialFocusRef,
  className,
}: ModalProps) {
  const reduced = useReducedMotion();

  const { target, titleId, descriptionId, overlayProps, panelProps } = useModal({
    open,
    onClose,
    closeOnEscape,
    closeOnBackdrop,
    initialFocusRef,
  });

  const variants = useMemo(() => {
    if (reduced) {
      const instant = {
        closed: { opacity: 0 },
        open: { opacity: 1, transition: { duration: 0 } },
        gone: { opacity: 0, transition: { duration: 0 } },
      };
      return { backdrop: instant, panel: instant };
    }
    return {
      backdrop: {
        closed: { opacity: 0 },
        open: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
        gone: { opacity: 0, transition: { duration: DURATION.exit, ease: LEAVE } },
      },
      panel: {
        closed: { opacity: 0, scale: 0.96, y: 12 },
        open: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { ...SURFACE, opacity: { duration: DURATION.fast, ease: EASE } },
        },
        gone: {
          opacity: 0,
          scale: 0.98,
          y: 6,
          transition: { duration: DURATION.exit, ease: LEAVE },
        },
      },
    };
  }, [reduced]);

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal"
          {...overlayProps}
          initial="closed"
          animate="open"
          exit="gone"
          variants={{ closed: {}, open: {}, gone: {} }}
          className="fixed inset-0 z-[60] grid place-items-center p-4 sm:p-6"
        >
          <motion.div
            aria-hidden="true"
            variants={variants.backdrop}
            style={{ touchAction: "none" }}
            className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
          />
          <motion.div
            {...panelProps}
            aria-describedby={description ? descriptionId : undefined}
            variants={variants.panel}
            className={cn(
              "relative flex max-h-[min(85vh,44rem)] w-full flex-col overflow-hidden",
              "rounded-xl border border-border bg-surface text-foreground shadow-e5 outline-none",
              SIZES[size],
              className,
            )}
          >
            <div
              className={cn(
                "flex shrink-0 items-start gap-3 px-6 pt-6",
                hideTitle && !description ? "sr-only" : "pb-4",
              )}
            >
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className={cn(
                    "text-lg font-bold tracking-tight text-foreground",
                    hideTitle && "sr-only",
                  )}
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    id={descriptionId}
                    className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {description}
                  </p>
                ) : null}
              </div>

              {showClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="-mr-2 -mt-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {children ? (
              // `data-lenis-prevent` keeps a wheel gesture inside a tall
              // dialog from being consumed by the smooth-scrolled page behind.
              <div
                data-lenis-prevent
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 text-sm leading-relaxed"
              >
                {children}
              </div>
            ) : null}

            {footer ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-surface-sunken px-6 py-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    target,
  );
}

export default Modal;
