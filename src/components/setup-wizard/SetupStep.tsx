"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import type { WizardStep } from "@/lib/setup/types";

interface SetupStepProps {
  step: WizardStep;
  totalStepsInPhase: number;
  stepIndexInPhase: number;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  canProceed: boolean;
  children: React.ReactNode;
}

export function SetupStep({
  step,
  totalStepsInPhase,
  stepIndexInPhase,
  onNext,
  onBack,
  onSkip,
  canProceed,
  children,
}: SetupStepProps) {
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Phase {step.phase} — Step {stepIndexInPhase + 1} of {totalStepsInPhase}
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold">{step.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
      </div>

      <Card className="border-border/40 bg-card/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-display">What to do</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={step.id === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex gap-2">
          {step.skippable && onSkip && (
            <Button variant="ghost" onClick={onSkip} className="gap-1 text-muted-foreground">
              <SkipForward className="h-4 w-4" /> Skip for now
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="gap-1 bg-primary font-display font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
