"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface TravelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: "before" | "after") => void;
  /**
   * The cutoff the two options are phrased around. Defaults to the value this
   * component previously hardcoded; pass a real date to make it dynamic.
   */
  thresholdLabel?: string;
}

export function TravelPlanModal({
  isOpen,
  onClose,
  onSelectOption,
  thresholdLabel = "Aug 19, 2026",
}: TravelPlanModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="When do you plan to travel?"
      description="This tells us which processing timeline to quote you."
    >
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          block
          onClick={() => onSelectOption("before")}
        >
          Before {thresholdLabel}
        </Button>
        <Button
          variant="outline"
          size="lg"
          block
          onClick={() => onSelectOption("after")}
        >
          After {thresholdLabel}
        </Button>
      </div>
    </Modal>
  );
}
