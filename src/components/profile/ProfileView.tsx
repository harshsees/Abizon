"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LogOut,
  User,
  Sparkles,
  FileText,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

import { Wordmark } from "@/components/Wordmark";
import { signOut } from "@/app/actions/auth";
import { formatE164 } from "@/lib/auth/phone";

/**
 * The signed-in profile screen.
 *
 * Split out of `app/profile/page.tsx` when login landed: the route is a Server
 * Component that establishes who the user is and what they have, and this is
 * the client half that needs state for the tabs. Identity and data are both
 * passed in rather than fetched here, so there is exactly one place — the route
 * — where "who is signed in" and "what may they see" are decided.
 *
 * ── TWO THINGS WERE REMOVED WHEN THE APPLICATIONS BECAME REAL ──
 *
 * **The verification QR code and its countdown.** A hand-drawn SVG of a QR
 * pattern that encodes nothing, under a timer counting down from 45 and
 * resetting, labelled "Verification QR — expires in N". It verified nothing,
 * expired nothing, and could not be scanned. It is the same class of thing the
 * apply flow was rebuilt to remove — a 900ms timer that said "approved", a
 * reference minted from a passport number — and it survived only because
 * nothing in this file had been real enough to contrast it with.
 *
 * **The hardcoded zeroes.** "Purchased Applications: 0" and "Ongoing
 * Applications: 0" were literals, correct only for as long as there were no
 * applications. They are counts now.
 *
 * "Purchased" has gone with them: nothing here is purchased, because Abizon
 * cannot take a payment online. The tabs say what the statuses actually are.
 */

export type ProfileApplication = {
  id: string;
  reference: string;
  countrySlug: string;
  countryName: string;
  status: string;
  travellerCount: number;
  travelDate: string | null;
  updatedAt: number;
  submittedAt: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "In progress",
  ready: "Ready to submit",
  submitted: "Submitted",
  received: "Documents checked",
  processing: "With the authority",
  decided: "Decision issued",
  closed: "Completed",
  withdrawn: "Withdrawn",
};

export function ProfileView({
  phoneE164,
  applications,
  backendReady,
}: {
  phoneE164: string;
  applications: ProfileApplication[];
  backendReady: boolean;
}) {
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<"open" | "submitted">("open");

  // `draft` is the only status the applicant can still edit. Everything else is
  // with Abizon, which is the line the two tabs are drawn along — not "paid"
  // and "unpaid", which would describe a transaction that does not happen here.
  const open = applications.filter((application) => application.status === "draft");
  const submitted = applications.filter((application) => application.status !== "draft");

  const shown = activeSubTab === "open" ? open : submitted;

  return (
    <div className="min-h-screen bg-[#f7f7fa] flex flex-col font-sans antialiased text-slate-800 pb-20">
      
      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3.5 md:px-6">
          
          {/* Left section: Logo & Slogan */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <svg className="w-8 h-8 text-black" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 80 L50 20 L85 80 Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M40 55 L60 55" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                <path d="M50 20 L55 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              </svg>
              <Wordmark className="text-xl" />
            </Link>
            
            {/* Slogan */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[10px] font-extrabold tracking-widest text-primary uppercase">
                Visas On Time
              </span>
            </div>
          </div>

          {/* Right Section: Sign out.
              This button carried a LogOut icon and an aria-label of "Back to
              home" while only calling router.push("/") — it looked like a sign
              out and was not one. Now there is a session to end, it ends it. */}
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-muted-foreground hover:text-slate-800 transition duration-200 cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      {/* 2. BODY CONTENT LAYOUT */}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR (Profile details, Loyalty, QR) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/70 shadow-sm rounded-3xl p-6 flex flex-col items-center">
            
            {/* Large double-ringed User Avatar */}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-100 bg-[#f3f4f6]/80 shadow-sm">
              <div className="absolute inset-2.5 rounded-full bg-slate-200/50 flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>

            {/* Phone Number */}
            <h2 className="text-slate-800 font-extrabold text-sm mt-4 tracking-wide tabular-nums">
              {formatE164(phoneE164)}
            </h2>

            {/* Statistics */}
            <div className="w-full grid grid-cols-2 divide-x divide-slate-100 border-y border-slate-100 py-5 my-6 text-center">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 leading-none tabular-nums">
                  {open.length}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 leading-none">
                  In<br/>progress
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 leading-none tabular-nums">
                  {submitted.length}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 leading-none">
                  With<br/>Abizon
                </span>
              </div>
            </div>

            {/* Loyalty Program Section */}
            <div className="w-full flex flex-col items-start text-left mb-6">
              <h3 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
                Loyalty Program
              </h3>
              
              <div className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Link a program</h4>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Earn points per visa.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* The verification QR that used to sit here has been removed.
                It was a hand-drawn SVG of a QR pattern encoding nothing,
                under a countdown from 45 that reset forever, labelled
                "Verification QR, expires in N". Nothing scanned it,
                nothing expired, and nothing was verified. See the header. */}

          </div>

          {/* RIGHT CONTENT PANEL (Tabs, empty applications dashboard) */}
          <div className="lg:col-span-8 flex flex-col">
            
            {/* Navigation Tabs. The counts are on the tabs because the whole
                question somebody opens this page with is "how many of each",
                and a tab that answers it saves the click that would. */}
            <div className="flex border-b border-slate-200">
              <TabButton
                active={activeSubTab === "open"}
                count={open.length}
                onClick={() => setActiveSubTab("open")}
              >
                In progress
              </TabButton>

              <TabButton
                active={activeSubTab === "submitted"}
                count={submitted.length}
                onClick={() => setActiveSubTab("submitted")}
              >
                With Abizon
              </TabButton>
            </div>

            {!backendReady ? (
              <EmptyPanel
                title="Applications are not stored on this deployment"
                body="This environment has no database, so nothing you start is saved. That is a configuration state, not an empty account."
              />
            ) : shown.length === 0 ? (
              <EmptyPanel
                title={
                  activeSubTab === "open"
                    ? "Nothing in progress"
                    : "Nothing with Abizon yet"
                }
                body={
                  activeSubTab === "open"
                    ? "Applications you start appear here and stay until you submit them. You can pick one up on any device."
                    : "Once you submit an application it moves here, and you can follow it by reference."
                }
                action={
                  activeSubTab === "open" ? (
                    <button
                      onClick={() => router.push("/")}
                      className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover px-8 py-3.5 text-center text-sm font-bold text-white shadow-md hover:shadow-lg transition duration-200 active:scale-98 cursor-pointer"
                    >
                      <span>Browse destinations</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : null
                }
              />
            ) : (
              <ul className="mt-6 space-y-3">
                {shown.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={
                        // In progress goes back into the flow; submitted goes
                        // to tracking. Two different intentions, and sending
                        // both to the same place would mean one of them
                        // arriving somewhere that cannot help.
                        application.status === "draft"
                          ? `/apply?country=${application.countrySlug}`
                          : `/track/${application.reference}`
                      }
                      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:border-slate-300"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-muted-foreground">
                        <FileText className="h-4.5 w-4.5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold text-slate-900">
                          {application.countryName}
                        </span>
                        <span
                          data-numeric
                          className="mt-0.5 block font-mono text-[11px] font-bold text-muted-foreground"
                        >
                          {application.reference} ·{" "}
                          {application.travellerCount === 1
                            ? "1 traveller"
                            : `${application.travellerCount} travellers`}
                          {application.travelDate ? ` · ${application.travelDate}` : ""}
                        </span>
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                        {STATUS_LABEL[application.status] ?? application.status}
                      </span>

                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

          </div>

        </div>
      </main>

    </div>
  );
}

/**
 * A tab with its count. Extracted because there are two of them and the
 * animated underline needs a shared `layoutId` — exactly the kind of detail
 * that drifts when the markup is duplicated.
 */
function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-bold tracking-wide transition-colors cursor-pointer ${
        active ? "text-primary" : "text-muted-foreground hover:text-slate-600"
      }`}
    >
      {children}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-slate-600">
        {count}
      </span>
      {active && (
        <motion.div
          layoutId="profile-tab-underline"
          className="absolute bottom-0 inset-x-0 h-0.75 bg-primary"
        />
      )}
    </button>
  );
}

/**
 * The empty state, which now has more than one cause.
 *
 * "No Applications Found" used to be hardcoded and was therefore always true.
 * There are three distinct reasons the panel can be empty — no database,
 * nothing in progress, nothing submitted — and they want different sentences,
 * because only two of them are about the applicant at all.
 */
function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50/45 border border-slate-200/50 rounded-3xl p-10 md:p-16 flex flex-col items-center justify-center text-center mt-6 min-h-[420px] shadow-sm">
      <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-muted-foreground mb-6">
        <FileText className="w-7 h-7 stroke-[1.5]" />
      </div>

      <h3 className="text-lg font-black text-slate-900">{title}</h3>

      <p className="text-muted-foreground text-sm max-w-sm mt-2 leading-relaxed">
        {body}
      </p>

      {action}
    </div>
  );
}
