"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";

import { changeStatusAction } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";

/**
 * MOVING AN APPLICATION ALONG.
 * ---------------------------------------------------------------------------
 * The options offered are computed from the current status on the server and
 * passed in. The server checks them again — the transition map in
 * `lib/ops/mutations.ts` is the authority — because a list rendered into a page
 * is a suggestion, and this form is a POST endpoint like any other.
 *
 * The note is optional and it goes to the applicant verbatim, which the label
 * says. Staff write internal notes in whatever they use for internal notes; a
 * box that emails the customer must announce itself as one.
 */

export type StatusControlProps = {
  applicationId: string;
  current: string;
  options: Array<{ value: string; label: string; description: string }>;
};

export function StatusControl({ applicationId, current, options }: StatusControlProps) {
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");

  const change = useAction(changeStatusAction, {
    onSuccess: () => {
      setSelected("");
      setNote("");
    },
  });

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This application is <strong className="text-foreground">{current}</strong> and
        cannot move any further.
      </p>
    );
  }

  const chosen = options.find((option) => option.value === selected);

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-bold text-foreground">Move this to</legend>

        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:border-border-strong has-checked:border-primary has-checked:bg-primary-subtle"
          >
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={selected === option.value}
              onChange={() => setSelected(option.value)}
              className="mt-1"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {chosen ? (
        <div className="space-y-2">
          <label htmlFor="status-note" className="block text-xs font-bold text-foreground">
            Note for the applicant (optional) — sent to them exactly as written
          </label>
          <textarea
            id="status-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
      ) : null}

      {change.result?.serverError ? (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {change.result.serverError}
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        disabled={!selected}
        loading={change.isPending}
        onClick={() =>
          change.execute({
            applicationId,
            to: selected as "received" | "processing" | "decided" | "closed" | "withdrawn",
            note: note.trim() || undefined,
          })
        }
      >
        {chosen ? `Mark as ${chosen.label.toLowerCase()}` : "Choose a status"}
      </Button>
    </div>
  );
}
