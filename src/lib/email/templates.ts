import "server-only";

import { siteUrl } from "@/lib/env";

/**
 * EMAIL TEMPLATES — hand-written HTML, and the reason that is not a step
 * backwards.
 * ---------------------------------------------------------------------------
 * The stack document named React Email. On installing it, every one of its
 * packages came back marked deprecated on npm, and shipping a deprecated
 * dependency into the layer that tells applicants what is happening to their
 * passport is a poor trade for some JSX. It was removed.
 *
 * What it was buying is small here: this application sends five kinds of
 * message, all of them a heading, two paragraphs and one button. The layout
 * below is forty lines and has no upgrade path to worry about.
 *
 * ── The rules email clients impose, which is why this looks like 2004 ──
 *
 *   - Tables, not flexbox. Outlook renders through Word's HTML engine.
 *   - Inline styles. Gmail strips `<style>` blocks in some contexts.
 *   - No external images. Most clients block them by default, so anything
 *     load-bearing must be text.
 *   - A plain-text alternative for every message. Some people read mail that
 *     way, and its absence is itself a spam signal.
 *
 * ── One thing that is a policy, not a style ──
 *
 * No passport number, no date of birth, and no document ever appears in an
 * email. Mail is stored unencrypted on servers we do not control and forwarded
 * by people who do not think about it. The reference is safe to send because it
 * discloses only status; everything else stays behind a sign-in.
 */

const BRAND = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e5e5e5";

export type Email = {
  subject: string;
  html: string;
  text: string;
};

function layout(input: {
  preheader: string;
  heading: string;
  body: string[];
  action?: { label: string; href: string };
  footnote?: string;
}): string {
  const paragraphs = input.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND};">${line}</p>`,
    )
    .join("");

  const button = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
         <tr><td style="background:${BRAND};border-radius:6px;">
           <a href="${input.action.href}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${input.action.label}</a>
         </td></tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f4;">
  <!-- The preheader is what a phone shows under the subject line. Left out, the
       client fills it with the first words of the body, which is usually the
       word "Hello". -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${input.preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:10px;">
        <tr><td style="padding:28px 28px 0;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND};">Abizon</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND};">${input.heading}</h1>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          ${paragraphs}
          ${button}
          ${
            input.footnote
              ? `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${MUTED};">${input.footnote}</p>`
              : ""
          }
        </td></tr>
      </table>

      <p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:${MUTED};max-width:520px;">
        This message was sent by Abizon about a visa application you started.
        We will never ask for a one-time code, a password or a payment by email.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/** The plain-text alternative. Not a stripped copy of the HTML — written so it
 *  reads as a message rather than as the wreckage of one. */
function plain(lines: string[], action?: { label: string; href: string }): string {
  const body = lines.join("\n\n");
  const tail = action ? `\n\n${action.label}: ${action.href}` : "";
  return `ABIZON\n\n${body}${tail}\n\n—\nWe will never ask for a one-time code, a password or a payment by email.`;
}

/* -------------------------------------------------------------------------- */

export function applicationReceived(input: {
  name: string;
  reference: string;
  country: string;
}): Email {
  const action = {
    label: "Track this application",
    href: `${siteUrl()}/track/${input.reference}`,
  };

  const body = [
    `${input.name}, we have your application for ${input.country}.`,
    `Your reference is <strong>${input.reference}</strong>. Quote it if you contact us — it is the fastest way for anyone here to find your file.`,
    "We will check your documents and write again when the status changes. You do not need to do anything in the meantime.",
  ];

  return {
    subject: `Application ${input.reference} received — ${input.country}`,
    html: layout({
      preheader: `Reference ${input.reference}. We will write again when the status changes.`,
      heading: "We have your application",
      body,
      action,
      footnote:
        "Keep this reference. Anyone who has it can see the status of the application, so treat it as you would a booking reference.",
    }),
    text: plain(
      [
        `${input.name}, we have your application for ${input.country}.`,
        `Your reference is ${input.reference}. Quote it if you contact us.`,
        "We will check your documents and write again when the status changes.",
      ],
      action,
    ),
  };
}

export function statusChanged(input: {
  name: string;
  reference: string;
  country: string;
  status: string;
  headline: string;
  detail: string;
  note?: string | null;
}): Email {
  const action = {
    label: "See the full history",
    href: `${siteUrl()}/track/${input.reference}`,
  };

  const body = [
    `${input.name}, there is an update on your ${input.country} application.`,
    input.detail,
    ...(input.note ? [`<em>${input.note}</em>`] : []),
  ];

  return {
    subject: `${input.headline} — ${input.reference}`,
    html: layout({
      preheader: input.detail,
      heading: input.headline,
      body,
      action,
    }),
    text: plain(
      [
        `${input.name}, there is an update on your ${input.country} application.`,
        input.detail,
        ...(input.note ? [input.note] : []),
      ],
      action,
    ),
  };
}

export function documentRejected(input: {
  name: string;
  reference: string;
  documentLabel: string;
  reason: string;
}): Email {
  const action = { label: "Replace the document", href: `${siteUrl()}/profile` };

  const body = [
    `${input.name}, we need a new ${input.documentLabel.toLowerCase()} for application ${input.reference}.`,
    // The reason is the entire point of the message. A rejection without one
    // produces a second upload with the same problem and a support call.
    `<strong>Why:</strong> ${input.reason}`,
    "Sign in and upload a replacement. Nothing else on your application has changed and you do not need to start again.",
  ];

  return {
    subject: `Action needed on ${input.reference}`,
    html: layout({
      preheader: `Your ${input.documentLabel.toLowerCase()} needs replacing.`,
      heading: "One document needs replacing",
      body,
      action,
    }),
    text: plain(
      [
        `${input.name}, we need a new ${input.documentLabel.toLowerCase()} for application ${input.reference}.`,
        `Why: ${input.reason}`,
        "Sign in and upload a replacement.",
      ],
      action,
    ),
  };
}

export function erasureAcknowledged(input: {
  name: string;
  scheduledFor: string | null;
}): Email {
  const body = [
    `${input.name}, we have recorded your request to delete the personal data we hold about you.`,
    input.scheduledFor
      ? `You have an application still in progress, so the deletion is scheduled for <strong>${input.scheduledFor}</strong>, once that application closes. We cannot delete documents a consulate is still working from.`
      : "There is nothing in progress, so the deletion will be completed within seven days.",
    "We will write once it is done. Some records — that an application existed, and when it was deleted — are kept because we are required to be able to show it.",
  ];

  return {
    subject: "Your deletion request",
    html: layout({
      preheader: "We have recorded your request and will confirm when it is done.",
      heading: "We have your deletion request",
      body,
      footnote:
        "If you did not make this request, reply to this message immediately.",
    }),
    text: plain([
      `${input.name}, we have recorded your request to delete the personal data we hold about you.`,
      input.scheduledFor
        ? `Deletion is scheduled for ${input.scheduledFor}, once your in-progress application closes.`
        : "The deletion will be completed within seven days.",
      "We will write once it is done.",
    ]),
  };
}
