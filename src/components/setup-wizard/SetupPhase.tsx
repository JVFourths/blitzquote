"use client";

import { PHASES, WIZARD_STEPS } from "@/lib/setup/steps-config";
import type { StepStatus } from "@/lib/setup/types";

interface SetupPhaseProps {
  currentStep: number;
  stepStatuses: Record<number, StepStatus>;
}

export function SetupPhase({ currentStep, stepStatuses }: SetupPhaseProps) {
  const currentPhase = WIZARD_STEPS.find((s) => s.id === currentStep)?.phase ?? 1;

  return (
    <div className="space-y-3">
      {PHASES.map((phase) => {
        const phaseSteps = WIZARD_STEPS.filter((s) => s.phase === phase.id);
        const completedCount = phaseSteps.filter(
          (s) => stepStatuses[s.id] === "validated" || stepStatuses[s.id] === "skipped"
        ).length;
        const isActive = phase.id === currentPhase;
        const isDone = completedCount === phaseSteps.length;
        const isFuture = phase.id > currentPhase;

        return (
          <div key={phase.id} className={`transition-opacity ${isFuture ? "opacity-40" : ""}`}>
            <div className="flex items-center justify-between text-sm">
              <span className={`font-display font-semibold ${isActive ? "text-primary" : isDone ? "text-green-400" : "text-muted-foreground"}`}>
                Phase {phase.id}: {phase.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{phaseSteps.length}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {phaseSteps.map((step) => {
                const status = stepStatuses[step.id] || "pending";
                return (
                  <div
                    key={step.id}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      status === "validated" || status === "skipped"
                        ? "bg-primary"
                        : step.id === currentStep
                          ? "bg-primary/50"
                          : "bg-border/50"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
