import "server-only";

import { createHash } from "node:crypto";

import { Resend } from "resend";

import { db } from "@/lib/db/client";
import { emailLog } from "@/lib/db/schema";
import { capabilities, env } from "@/lib/env";
import type { Email } from "./templates";

/**
 * SENDING.
 * ---------------------------------------------------------------------------
 * Until now nothing in this system could tell an applicant anything. That
 * blocked "we have your application", "this document needs replacing", "the
 * consulate has decided" and the acknowledgement DPDP requires for a deletion
 * request — which is to say, it blocked the entire relationship after the
 * moment of payment.
 *
 * ── Three properties, in order of how much trouble their absence causes ──
 *
 * 1. **Sending never throws into the caller.** An application that fails to
 *    submit because the confirmation email bounced is a far worse outcome than
 *    an application that submits and sends no email. The send is reported and
 *    swallowed; `emailLog` records that it failed.
 *
 * 2. **Every attempt is written down.** "They say they never got it" is one of
 *    the most common support conversations there is, and it is unanswerable
 *    without a record of what was sent, when, and what the provider said. The
 *    address is stored as a hash, not in the clear — it is already on the
 *    traveller row, and a second copy in a log table is a second copy to leak.
 *
 * 3. **No key means the message is printed, not dropped.** A developer working
 *    on the submit flow should be able to read the confirmation in their
 *    terminal. Silently discarding it would make the whole email layer look
 *    like it works right up until production.
 *
 * ── The part that is not code ──
 *
 * SPF, DKIM and DMARC on the sending domain, before the first real message.
 * Transactional mail from a fresh domain without them goes to spam, and
 * "the applicant never got the email" then looks identical to "the application
 * vanished". This is a DNS afternoon and it has to happen early.
 */

let client: Resend | null | undefined;

function resend(): Resend | null {
  if (client !== undefined) return client;
  client = capabilities.email() ? new Resend(env().RESEND_API_KEY!) : null;
  return client;
}

/** Grouping key for the log. Lowercased first, or the same person appears twice
 *  because one form capitalised their address. */
function hashRecipient(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex");
}

export type SendContext = {
  template: string;
  userId?: string;
  applicationId?: string;
};

export async function sendEmail(
  to: string,
  message: Email,
  context: SendContext,
): Promise<{ ok: boolean }> {
  const database = db();
  const recipientHash = hashRecipient(to);

  const record = async (status: string, providerId?: string, error?: string) => {
    if (!database) return;
    try {
      await database.insert(emailLog).values({
        recipientHash,
        template: context.template,
        subject: message.subject,
        userId: context.userId ?? null,
        applicationId: context.applicationId ?? null,
        providerId: providerId ?? null,
        status,
        error: error ?? null,
      });
    } catch (logError) {
      console.error("[email] could not write to the email log", logError);
    }
  };

  const transport = resend();

  if (!transport) {
    // Development. Print enough to read the message and to see that the right
    // one was chosen, without dumping a screen of HTML into the terminal.
    if (process.env.NODE_ENV !== "test") {
      console.info(
        `\n  [email] Not configured — nothing sent.\n` +
          `  To:       ${to}\n` +
          `  Subject:  ${message.subject}\n` +
          `  Template: ${context.template}\n\n` +
          message.text
            .split("\n")
            .map((line) => `  | ${line}`)
            .join("\n") +
          "\n",
      );
    }

    await record("skipped_not_configured");
    return { ok: true };
  }

  try {
    const result = await transport.emails.send({
      from: env().EMAIL_FROM!,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(env().EMAIL_REPLY_TO ? { replyTo: env().EMAIL_REPLY_TO! } : {}),
      headers: {
        // Transactional mail must not be bundled or delayed by aggressive
        // clients, and marking it as such is also what keeps it out of Gmail's
        // Promotions tab.
        "X-Entity-Ref-ID": context.applicationId ?? recipientHash.slice(0, 16),
      },
    });

    if (result.error) {
      await record("failed", undefined, result.error.message);
      console.error("[email] provider rejected the message", result.error);
      return { ok: false };
    }

    await record("sent", result.data?.id);
    return { ok: true };
  } catch (error) {
    // Property 1. The caller is mid-way through submitting an application and
    // must not be taken down by a mail provider.
    await record("failed", undefined, error instanceof Error ? error.message : "unknown");
    console.error("[email] send threw", error);
    return { ok: false };
  }
}
