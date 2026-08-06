"use client";

import React, { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/** Monday-indexed weekday headers, matching the grid padding below. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const TABS = [
  { id: "fixed", label: "Fixed Dates" },
  { id: "flexible", label: "Flexible" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const fullDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Days of `month`, padded at the front so the first column is always Monday.
 * `null` marks a leading blank cell.
 */
function getDaysInMonth(year: number, month: number): Array<Date | null> {
  const date = new Date(year, month, 1);
  const days: Array<Date | null> = [];

  // getDay() is Sunday-indexed; shift so Monday is 0 and Sunday is 6.
  const firstDay = (date.getDay() + 6) % 7;
  for (let i = 0; i < firstDay; i++) days.push(null);

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  /**
   * Last unselectable date — everything on or before it is struck through.
   * The two months on offer are derived from it. Defaults to the value this
   * component previously hardcoded; pass a real date to make it dynamic.
   */
  minDate?: Date;
}

export function DatePickerModal({
  isOpen,
  onClose,
  onSelectDate,
  minDate,
}: DatePickerModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("fixed");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // August 19, 2026 — the previous hardcoded cutoff.
  const threshold = useMemo(() => minDate ?? new Date(2026, 7, 19), [minDate]);

  // The cutoff month and the one after it.
  const months = useMemo(() => {
    const year = threshold.getFullYear();
    const month = threshold.getMonth();
    return [
      { key: `${year}-${month}`, date: new Date(year, month, 1), days: getDaysInMonth(year, month) },
      {
        key: `${year}-${month + 1}`,
        date: new Date(year, month + 1, 1),
        days: getDaysInMonth(year, month + 1),
      },
    ];
  }, [threshold]);

  const isDateDisabled = (day: Date) => day <= threshold;

  const handleProceed = () => {
    if (selectedDate) onSelectDate(selectedDate);
  };

  // Arrow keys move between tabs; the tablist itself is a single tab stop.
  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + TABS.length) % TABS.length;
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="Select your departure date"
      closeLabel="Close date picker"
      footer={
        <Button block size="lg" disabled={!selectedDate} onClick={handleProceed}>
          {selectedDate
            ? `Proceed to Application (${shortDate.format(selectedDate)})`
            : "Proceed to Application"}
        </Button>
      }
    >
      <div role="tablist" aria-label="Date selection mode" className="mx-auto mb-5 flex w-fit rounded-full bg-surface-sunken p-1">
        {TABS.map((tab, index) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`datepicker-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`datepicker-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={cn(
                "cursor-pointer rounded-full px-5 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-surface text-primary shadow-e1"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "fixed" ? (
        <div
          role="tabpanel"
          id="datepicker-panel-fixed"
          aria-labelledby="datepicker-tab-fixed"
          tabIndex={0}
          className="flex min-h-0 flex-col"
        >
          <div
            aria-hidden="true"
            className="mb-2 grid grid-cols-7 text-center text-2xs font-semibold text-muted-foreground"
          >
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div
            data-lenis-prevent
            className="max-h-[280px] flex-1 overflow-y-auto overscroll-contain pr-1"
          >
            {months.map(({ key, date, days }, monthIndex) => (
              <section key={key} aria-label={monthLabel.format(date)} className="mb-4">
                <h3
                  className={cn(
                    "text-center text-2xs font-bold uppercase tracking-wider text-foreground",
                    monthIndex === 0 ? "mb-3" : "my-4",
                  )}
                >
                  {monthLabel.format(date)}
                </h3>

                <div className="grid grid-cols-7 gap-y-1.5 text-center">
                  {days.map((day, index) =>
                    day === null ? (
                      <div key={`${key}-pad-${index}`} />
                    ) : (
                      <DayCell
                        key={day.toISOString()}
                        day={day}
                        disabled={isDateDisabled(day)}
                        selected={selectedDate?.toDateString() === day.toDateString()}
                        onSelect={setSelectedDate}
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="datepicker-panel-flexible"
          aria-labelledby="datepicker-tab-flexible"
          tabIndex={0}
          className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground"
        >
          Flexible date selection is available on the next page. Please select fixed dates
          or proceed.
        </div>
      )}
    </Modal>
  );
}

function DayCell({
  day,
  disabled,
  selected,
  onSelect,
}: {
  day: Date;
  disabled: boolean;
  selected: boolean;
  onSelect: (day: Date) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={
        disabled
          ? `${fullDate.format(day)} — unavailable`
          : fullDate.format(day)
      }
      onClick={() => onSelect(day)}
      className={cn(
        "mx-auto flex size-9 cursor-pointer items-center justify-center rounded-full",
        "text-xs font-semibold tabular-nums transition-colors",
        "disabled:cursor-not-allowed",
        disabled
          ? "text-muted-foreground/50 line-through"
          : selected
            ? "bg-primary font-bold text-on-primary shadow-e2"
            : "text-foreground hover:bg-surface-sunken active:scale-95 motion-reduce:active:scale-100",
      )}
    >
      {day.getDate()}
    </button>
  );
}
