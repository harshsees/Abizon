"use server";

/**
 * Sticker-visa callback requests (Schengen, USA, Canada).
 *
 * These visas are not applied for online. The visitor leaves a name and a
 * number on the country page, and the team calls them back. The request is
 * saved for the ops console and, when `CALLBACK_EMAIL_TO` is set, emailed to
 * the team as well.
 *
 * Public by necessity: the people asking are, by definition, not signed in.
 * So it is rate limited per address, carries a honeypot field, and refuses a
 * destination that is not a callback destination.
 */

import { headers } from "next/headers";
import { z } from "zod";

import { isCallbackDestination } from "@/data/visaOptions";
import { countryFromSlug, displayCountryName } from "@/lib/countryVisa";
import { db } from "@/lib/db/client";
import { callbackRequests } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { callbackRequested } from "@/lib/email/templates";
import { capabilities, env } from "@/lib/env";
import { checkLimit } from "@/lib/rateLimit";
import { clientIp, ipPrefix } from "@/lib/request";
import { publicAction, userError } from "@/lib/safeAction";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const callbackInput = z.object({
  countrySlug: z.string().min(1),
  name: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a phone number we can call."),
  email: z
    .union([z.literal(""), z.string().trim().email("That email address does not look right.")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  travelPlan: optionalText(80),
  message: optionalText(600),
  /** The honeypot. A person never sees it; a form-filling script fills it. */
  website: z.string().optional(),
});

export const requestCallbackAction = publicAction
  .metadata({ name: "callback.request" })
  .inputSchema(callbackInput)
  .action(async ({ parsedInput }) => {
    // A filled honeypot is a bot. Answer as if it worked, so it learns nothing.
    if (parsedInput.website) return { ok: true };

    const country = countryFromSlug(parsedInput.countrySlug);
    if (!country || !isCallbackDestination(country.code)) {
      userError("That destination is applied for online. Use the application on its page.");
    }

    const ip = ipPrefix(clientIp(await headers())) ?? "unknown";
    const limit = await checkLimit("callbackRequestPerIp", ip);
    if (!limit.ok) {
      userError("We already have several requests from this network. We will be in touch.");
    }

    const destination = displayCountryName(country);
    let saved = false;
    let emailed = false;

    const database = db();
    if (database) {
      try {
        await database.insert(callbackRequests).values({
          countrySlug: parsedInput.countrySlug,
          name: parsedInput.name,
          phone: parsedInput.phone,
          email: parsedInput.email ?? null,
          travelPlan: parsedInput.travelPlan ?? null,
          message: parsedInput.message ?? null,
        });
        saved = true;
      } catch (error) {
        console.error("[callback] could not save request", error);
      }
    }

    const to = env().CALLBACK_EMAIL_TO;
    if (to && capabilities.email()) {
      const result = await sendEmail(
        to,
        callbackRequested({
          country: destination,
          name: parsedInput.name,
          phone: parsedInput.phone,
          email: parsedInput.email,
          travelPlan: parsedInput.travelPlan,
          message: parsedInput.message,
        }),
        { template: "callback_requested" },
      );
      emailed = result.ok;
    }

    // Neither reached anybody: say so, rather than promise a call that cannot come.
    if (!saved && !emailed) {
      userError(
        "We could not send your request just now. Please call us on +91 11 4084 5678 instead.",
      );
    }

    return { ok: true };
  });
