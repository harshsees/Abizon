"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, inputVariants } from "@/components/ui/field";
import { TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { DocumentUploader, type UploadState } from "./DocumentUploader";
import { TrackingTimeline } from "./TrackingTimeline";
import { VisaTypeSelector } from "./VisaTypeSelector";

const visaPlans = [
  {
    id: "tourist-30",
    title: "Tourist visa - 30 days",
    price: "₹7,499",
    processing: "3-5 working days",
    validity: "30 days",
    description: "Best for short leisure trips.",
  },
  {
    id: "tourist-60",
    title: "Tourist visa - 60 days",
    price: "₹12,499",
    processing: "4-6 working days",
    validity: "60 days",
    description: "Ideal for longer family visits.",
  },
  {
    id: "express",
    title: "Express visa",
    price: "₹15,999",
    processing: "24-48 hours",
    validity: "14-30 days",
    description: "Fast-track approval for urgent travel.",
  },
  {
    id: "multiple-entry",
    title: "Multiple-entry visa",
    price: "₹19,999",
    processing: "4-7 working days",
    validity: "60 days",
    description: "For frequent visits during validity period.",
  },
] as const;

const schema = z.object({
  visaType: z.string().min(1, "Please select a visa type."),
  travelDate: z.string().min(1, "Travel date is required."),
  returnDate: z.string().min(1, "Return date is required."),
  travelers: z
    .number({ message: "Number of travelers is required." })
    .min(1, "At least 1 traveler is required.")
    .max(10, "Max 10 travelers per application."),
  purpose: z.string().min(2, "Please enter purpose of travel."),
  contactEmail: z.string().email("Enter a valid email."),
  contactPhone: z.string().min(8, "Enter a valid phone number."),
  fullName: z.string().min(2, "Full name is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  passportNumber: z.string().min(6, "Passport number is required."),
  passportExpiry: z.string().min(1, "Passport expiry date is required."),
  nationality: z.string().min(2, "Nationality is required."),
  gender: z.string().min(1, "Gender is required."),
  applicantEmail: z.string().email("Enter a valid email."),
  applicantPhone: z.string().min(8, "Enter a valid phone number."),
});

type FormValues = z.infer<typeof schema>;
type DocStatus = "missing" | "uploaded";

const checklistTemplate = [
  {
    key: "passport-scan",
    name: "Passport scan",
    required: true,
    help: "Color scan with all details clearly visible.",
  },
  {
    key: "photo",
    name: "Passport-size photograph",
    required: true,
    help: "White background and neutral expression.",
  },
  {
    key: "travel-dates",
    name: "Travel dates",
    required: true,
    help: "Departure and return dates are mandatory.",
  },
  {
    key: "return-ticket",
    name: "Return ticket",
    required: false,
    help: "May be requested for some applications.",
  },
  {
    key: "hotel-booking",
    name: "Hotel booking",
    required: false,
    help: "Optional at initial submission stage.",
  },
  {
    key: "previous-visa",
    name: "Previous visa",
    required: false,
    help: "Upload if you previously traveled to UAE.",
  },
] as const;

export function MultiStepApplicationForm({ className }: { className?: string }) {
  const [step, setStep] = useState(1);
  /**
   * Which way the wizard is travelling, so a step entering after "Back"
   * slides in from the opposite side it left on. Without this every step
   * animated identically and the flow lost its sense of place.
   */
  const [direction, setDirection] = useState<1 | -1>(1);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [passportFile, setPassportFile] = useState<string>();
  const [passportError, setPassportError] = useState<string>();
  const [passportStatus, setPassportStatus] = useState<UploadState>("uploaded");
  const [checklistStatus, setChecklistStatus] = useState<
    Record<string, { file?: string; status: DocStatus }>
  >({});

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      travelers: 1,
      nationality: "Indian",
    },
  });

  const selectedVisaType = useWatch({ control, name: "visaType" });

  const selectedPlan = useMemo(
    () => visaPlans.find((item) => item.id === selectedVisaType) ?? visaPlans[0],
    [selectedVisaType],
  );

  const stepFields: Record<number, (keyof FormValues)[]> = {
    1: ["visaType"],
    2: ["travelDate", "returnDate", "travelers", "purpose", "contactEmail", "contactPhone"],
    3: [],
    4: [
      "fullName",
      "dateOfBirth",
      "passportNumber",
      "passportExpiry",
      "nationality",
      "gender",
      "applicantEmail",
      "applicantPhone",
    ],
    5: [],
    6: [],
  };

  const nextStep = async () => {
    if (step === 3 && !passportFile) {
      setPassportError("Please upload your passport first.");
      return;
    }
    const fields = stepFields[step];
    if (fields?.length) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setDirection(1);
    setStep((prev) => Math.min(prev + 1, 7));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onPassportSelect = (file: File | null) => {
    setPassportError(undefined);
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    const maxSize = 5 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      setPassportError("Invalid file format. Upload JPG, PNG, or PDF.");
      return;
    }
    if (file.size > maxSize) {
      setPassportError("File exceeds 5MB limit.");
      return;
    }
    setPassportFile(file.name);
    setPassportStatus("reviewing");
    setTimeout(() => setPassportStatus("approved"), 900);
    if (!getValues("fullName")) {
      setValue("fullName", "Autofill from passport");
    }
  };

  const submit = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const values = getValues();
    const travelCode = values.travelDate?.replaceAll("-", "").slice(-6) || "000000";
    const passportCode = values.passportNumber?.slice(-4).toUpperCase() || "0000";
    setApplicationId(`UAE-${travelCode}-${passportCode}`);
    setLoading(false);
    setStep(7);
  };

  return (
    <section id="application-flow" className={className || "mx-auto w-full max-w-7xl px-4 py-14 md:px-6"}>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-e2 md:p-8">
        <ol
          aria-label={`Application progress — step ${step} of ${STEP_LABELS.length}`}
          className="mb-7 flex flex-wrap gap-2"
        >
          {STEP_LABELS.map((label, index) => {
            const current = index + 1;
            const reached = step >= current;
            return (
              <li
                key={label}
                aria-current={step === current ? "step" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold",
                  reached
                    ? "bg-primary-subtle text-primary-subtle-foreground"
                    : "bg-surface-sunken text-muted-foreground",
                )}
              >
                <span className="tabular-nums">{current}.</span> {label}
                {step === current ? <span className="sr-only"> (current step)</span> : null}
              </li>
            );
          })}
        </ol>

        {/* `mode="wait"` lets the outgoing step finish before the next arrives,
            so the panel never shows two steps stacked mid-transition. */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial="enter"
            animate="settled"
            exit="leave"
            variants={{
              enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 24 }),
              settled: { opacity: 1, x: 0, transition: TRANSITION.enter },
              leave: (dir: 1 | -1) => ({
                opacity: 0,
                x: dir * -24,
                transition: TRANSITION.exit,
              }),
            }}
          >
            {step === 1 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 1: Select visa type
                </h3>
                <VisaTypeSelector
                  plans={[...visaPlans]}
                  value={selectedVisaType ?? ""}
                  onChange={(value) => setValue("visaType", value, { shouldValidate: true })}
                  error={errors.visaType?.message}
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 2: Travel details
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Travel date" required error={errors.travelDate?.message}>
                    {(field) => <Input {...field} type="date" {...register("travelDate")} />}
                  </Field>
                  <Field label="Return date" required error={errors.returnDate?.message}>
                    {(field) => <Input {...field} type="date" {...register("returnDate")} />}
                  </Field>
                  <Field
                    label="Number of travelers"
                    required
                    helper="Up to 10 travelers per application."
                    error={errors.travelers?.message}
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        max={10}
                        {...register("travelers", { valueAsNumber: true })}
                      />
                    )}
                  </Field>
                  <Field label="Purpose of travel" required error={errors.purpose?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="Tourism / Family visit / Business"
                        {...register("purpose")}
                      />
                    )}
                  </Field>
                  <Field label="Contact email" required error={errors.contactEmail?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        {...register("contactEmail")}
                      />
                    )}
                  </Field>
                  <Field label="Phone number" required error={errors.contactPhone?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        type="tel"
                        autoComplete="tel"
                        {...register("contactPhone")}
                      />
                    )}
                  </Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 3: Passport upload
                </h3>
                <DocumentUploader
                  fileName={passportFile}
                  status={passportStatus}
                  error={passportError}
                  onFileSelect={onPassportSelect}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["uploaded", "reviewing", "needs replacement", "approved"] as UploadState[]).map(
                    (state) => (
                      <Button
                        key={state}
                        variant="secondary"
                        size="xs"
                        onClick={() => setPassportStatus(state)}
                      >
                        Mark {state}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 4: Applicant details
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Passport upload can auto-fill some details. You can edit them before submission.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name" required error={errors.fullName?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        autoComplete="name"
                        {...register("fullName")}
                      />
                    )}
                  </Field>
                  <Field label="Date of birth" required error={errors.dateOfBirth?.message}>
                    {(field) => <Input {...field} type="date" {...register("dateOfBirth")} />}
                  </Field>
                  <Field
                    label="Passport number"
                    required
                    error={errors.passportNumber?.message}
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        autoCapitalize="characters"
                        {...register("passportNumber")}
                      />
                    )}
                  </Field>
                  <Field
                    label="Passport expiry date"
                    required
                    error={errors.passportExpiry?.message}
                  >
                    {(field) => <Input {...field} type="date" {...register("passportExpiry")} />}
                  </Field>
                  <Field label="Nationality" required error={errors.nationality?.message}>
                    {(field) => <Input {...field} type="text" {...register("nationality")} />}
                  </Field>
                  <Field label="Gender" required error={errors.gender?.message}>
                    {({ id, invalid, "aria-describedby": describedBy }) => (
                      <select
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        defaultValue=""
                        {...register("gender")}
                        className={inputVariants({ invalid })}
                      >
                        <option value="" disabled>
                          Select gender
                        </option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Email" required error={errors.applicantEmail?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        {...register("applicantEmail")}
                      />
                    )}
                  </Field>
                  <Field label="Phone number" required error={errors.applicantPhone?.message}>
                    {(field) => (
                      <Input
                        {...field}
                        type="tel"
                        autoComplete="tel"
                        {...register("applicantPhone")}
                      />
                    )}
                  </Field>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 5: Document checklist
                </h3>
                <div className="space-y-3">
                  {checklistTemplate.map((doc) => {
                    const item = checklistStatus[doc.key];
                    return (
                      <div key={doc.key} className="rounded-md border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              {doc.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">{doc.help}</p>
                          </div>
                          <Badge variant={doc.required ? "destructive" : "neutral"}>
                            {doc.required ? "Required" : "Optional"}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {/* A label wrapping a hidden input is the accessible way to
                              style a file picker — it keeps the native control. */}
                          <label className={cn(buttonVariants({ size: "sm" }), "cursor-pointer")}>
                            Upload
                            <span className="sr-only"> {doc.name}</span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                setChecklistStatus((prev) => ({
                                  ...prev,
                                  [doc.key]: { file: file.name, status: "uploaded" },
                                }));
                              }}
                            />
                          </label>
                          <Badge
                            dot
                            variant={item?.status === "uploaded" ? "success" : "warning"}
                          >
                            {item?.status === "uploaded" ? "Uploaded" : "Pending"}
                          </Badge>
                          {item?.file && (
                            <span className="text-xs text-muted-foreground">{item.file}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 6: Review and payment
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-primary-border bg-primary-subtle p-4">
                    <p className="text-sm text-muted-foreground">Selected visa type</p>
                    <p className="text-base font-semibold text-foreground">
                      {selectedPlan.title}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Processing time: {selectedPlan.processing}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <ul className="space-y-2 text-sm tabular-nums">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Government fee</span>
                        <span>₹5,000</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Service fee</span>
                        <span>₹2,100</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Taxes</span>
                        <span>₹399</span>
                      </li>
                      <li className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                        <span>Total amount</span>
                        <span>₹7,499</span>
                      </li>
                    </ul>
                    <p className="mt-3 rounded-sm bg-success-subtle p-2 text-2xs text-success-subtle-foreground">
                      Refund support available under on-time delivery guarantee terms.
                    </p>
                  </div>
                </div>
                <Button
                  block
                  size="xl"
                  className="mt-6"
                  loading={loading}
                  onClick={handleSubmit(submit)}
                >
                  {loading ? "Processing payment..." : "Pay Securely"}
                </Button>
              </div>
            )}

            {step === 7 && (
              <div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                  Step 7: Confirmation and tracking
                </h3>
                {/* role="status" so the ID is announced when the step swaps in. */}
                <div
                  role="status"
                  className="mb-4 rounded-md border border-transparent bg-success-subtle p-4"
                >
                  <p className="text-sm text-success-subtle-foreground">
                    Application submitted successfully.
                  </p>
                  <p className="mt-1 text-lg font-semibold text-success-subtle-foreground">
                    Application ID: <span className="tabular-nums">{applicationId}</span>
                  </p>
                </div>
                <TrackingTimeline activeIndex={1} />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild variant="secondary">
                    <a href="#">Download receipt</a>
                  </Button>
                  <Button asChild variant="secondary">
                    <a href="mailto:[support@email.com]">Contact support</a>
                  </Button>
                  <Button asChild>
                    <Link href={`/track/${applicationId || "UAE-123456"}`}>
                      Open tracking page
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 7 && (
          <div className="mt-7 flex items-center justify-between">
            <Button variant="secondary" onClick={prevStep} disabled={step === 1}>
              Back
            </Button>
            {step < 6 && (
              <Button size="lg" onClick={nextStep}>
                Continue
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const STEP_LABELS = [
  "Visa Type",
  "Travel Details",
  "Passport Upload",
  "Applicant Details",
  "Document Checklist",
  "Review & Payment",
  "Confirmation",
] as const;
