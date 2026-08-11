/**
 * APPLICANT VALIDATION
 * ---------------------------------------------------------------------------
 * Salvaged from `MultiStepApplicationForm`, which is otherwise deleted. The
 * schema shape was the one genuinely reusable thing in that file — the field
 * set matches what a passport actually carries, and the messages were already
 * written in the second person.
 *
 * What did NOT come across: the form's `visaType` field (the plan now lives in
 * application state and prices through `computeTotals`), its `travelDate` /
 * `returnDate` pair (the flow asks for an outbound date only, because a return
 * date is not required to file), and its `travelers` number field (travellers
 * are named individuals here, not a count).
 *
 * These schemas exist alongside `blockingReason` in `state.ts` rather than
 * replacing it. The division is deliberate:
 *
 *   `blockingReason`  can the applicant LEAVE this step — coarse, always
 *                     available, drives the rail and the progress bar.
 *   this file         is THIS FIELD acceptable — fine-grained, per-input,
 *                     drives the message under the box.
 *
 * Keeping step gating out of zod means the rail does not need a resolver to
 * ask whether step 2 is satisfied.
 */

import { z } from "zod";

/**
 * Six months is the near-universal passport rule and it is already stated in
 * `documents.ts`. Enforcing it here means the applicant is told before filing
 * rather than after a refusal.
 */
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;

export const travellerDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the full name exactly as printed in the passport.")
    .max(80, "That is longer than a passport name field allows."),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((value) => new Date(value) < new Date(), {
      message: "Date of birth must be in the past.",
    }),
  passportNumber: z
    .string()
    .trim()
    .min(6, "Passport numbers are at least six characters.")
    .max(12, "That is longer than a passport number.")
    .regex(/^[A-Za-z0-9]+$/, "Passport numbers contain only letters and digits."),
  passportExpiry: z
    .string()
    .min(1, "Passport expiry date is required.")
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "This passport has expired.",
    })
    .refine((value) => new Date(value).getTime() > Date.now() + SIX_MONTHS_MS, {
      message:
        "Most destinations need at least six months of validity left. Renew before applying.",
    }),
  nationality: z.string().trim().min(2, "Nationality is required."),
  gender: z.string().min(1, "Select an option."),
});

export const contactSchema = z.object({
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a phone number we can reach you on.")
    .regex(/^[0-9+\-\s()]+$/, "Phone numbers contain only digits and + - ( )."),
});

export type TravellerDetailsInput = z.infer<typeof travellerDetailsSchema>;
export type ContactInput = z.infer<typeof contactSchema>;

/** Field-level errors for one traveller, keyed by field name. */
export function validateTravellerDetails(
  value: unknown,
): Partial<Record<keyof TravellerDetailsInput, string>> {
  const result = travellerDetailsSchema.safeParse(value);
  if (result.success) return {};

  const errors: Partial<Record<keyof TravellerDetailsInput, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof TravellerDetailsInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function validateContact(
  value: unknown,
): Partial<Record<keyof ContactInput, string>> {
  const result = contactSchema.safeParse(value);
  if (result.success) return {};

  const errors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ContactInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
