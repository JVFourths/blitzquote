"use client";

import { useState, useEffect, useCallback } from "react";
import { WIZARD_STEPS, PHASES, getStepsForPhase } from "@/lib/setup/steps-config";
import type { StepStatus } from "@/lib/setup/types";
import { SetupPhase } from "./SetupPhase";
import { SetupStep } from "./SetupStep";
import { PhaseComplete } from "./PhaseComplete";

// Step components
import { SupabaseAccountStep } from "./steps/SupabaseAccountStep";
import { SupabaseSqlStep } from "./steps/SupabaseSqlStep";
import { SupabaseKeysStep } from "./steps/SupabaseKeysStep";
import { VercelRedeployStep } from "./steps/VercelRedeployStep";
import { AdminCredentialsStep } from "./steps/AdminCredentialsStep";
import { StripeAccountStep } from "./steps/StripeAccountStep";
import { StripeKeysStep } from "./steps/StripeKeysStep";
import { StripeWebhookStep } from "./steps/StripeWebhookStep";
import { ResendAccountStep } from "./steps/ResendAccountStep";
import { ResendDomainStep } from "./steps/ResendDomainStep";
import { ResendKeyStep } from "./steps/ResendKeyStep";
import { VercelRedeploy2Step } from "./steps/VercelRedeploy2Step";
import { GoogleCalendarStep } from "./steps/GoogleCalendarStep";
import { CustomDomainStep } from "./steps/CustomDomainStep";
import { BuildGptStep } from "./steps/BuildGptStep";

const STEP_COMPONENTS: Record<number, React.ComponentType<StepComponentProps>> = {
  1: SupabaseAccountStep,
  2: SupabaseSqlStep,
  3: SupabaseKeysStep,
  4: VercelRedeployStep,
  5: AdminCredentialsStep,
  6: StripeAccountStep,
  7: StripeKeysStep,
  8: StripeWebhookStep,
  9: ResendAccountStep,
  10: ResendDomainStep,
  11: ResendKeyStep,
  12: VercelRedeploy2Step,
  13: GoogleCalendarStep,
  14: CustomDomainStep,
  15: BuildGptStep,
};

export interface StepComponentProps {
  onValidated: () => void;
  wizardData: Record<string, string>;
  setWizardData: (data: Record<string, string>) => void;
}

interface SetupWizardProps {
  mode: "first-run" | "admin";
  initialStep?: number;
}

const STORAGE_KEY = "blitzquote_setup_wizard";

export function SetupWizard({ mode, initialStep }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
  const [wizardData, setWizardData] = useState<Record<string, string>>({});
  const [showPhaseComplete, setShowPhaseComplete] = useState<number | null>(null);
  const [stepValidated, setStepValidated] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.stepStatuses) setStepStatuses(parsed.stepStatuses);
        if (parsed.wizardData) setWizardData(parsed.wizardData);
      }
    } catch { /* ignore */ }
  }, []);

  // Save state to localStorage
  const saveState = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentStep, stepStatuses, wizardData })
      );
    } catch { /* ignore */ }
  }, [currentStep, stepStatuses, wizardData]);

  useEffect(() => { saveState(); }, [saveState]);

  // Filter steps based on mode
  const availableSteps = mode === "first-run"
    ? WIZARD_STEPS.filter((s) => s.id <= 4) // Only pre-Supabase steps
    : WIZARD_STEPS;

  const currentStepConfig = WIZARD_STEPS.find((s) => s.id === currentStep);
  if (!currentStepConfig) return null;

  const stepPhase = currentStepConfig.phase;
  const phaseSteps = getStepsForPhase(stepPhase);
  const stepIndexInPhase = phaseSteps.findIndex((s) => s.id === currentStep);

  function handleNext() {
    // Mark current step as validated
    const newStatuses = { ...stepStatuses, [currentStep]: "validated" as StepStatus };
    setStepStatuses(newStatuses);
    setStepValidated(false);

    // Check if this is the last step in the phase
    const isLastInPhase = stepIndexInPhase === phaseSteps.length - 1;

    if (isLastInPhase) {
      setShowPhaseComplete(stepPhase);
      return;
    }

    // Go to next step
    const nextStep = phaseSteps[stepIndexInPhase + 1];
    if (nextStep) setCurrentStep(nextStep.id);
  }

  function handleBack() {
    if (stepIndexInPhase > 0) {
      setCurrentStep(phaseSteps[stepIndexInPhase - 1].id);
      setStepValidated(false);
    }
  }

  function handleSkip() {
    const newStatuses = { ...stepStatuses, [currentStep]: "skipped" as StepStatus };
    setStepStatuses(newStatuses);
    setStepValidated(false);

    const nextStep = phaseSteps[stepIndexInPhase + 1];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    } else {
      setShowPhaseComplete(stepPhase);
    }
  }

  function handlePhaseCompleteNext() {
    const nextPhase = PHASES.find((p) => p.id === (showPhaseComplete || 0) + 1);
    setShowPhaseComplete(null);

    if (nextPhase) {
      const firstStep = getStepsForPhase(nextPhase.id)[0];
      if (firstStep) setCurrentStep(firstStep.id);
    }
  }

  function handleStepValidated() {
    setStepValidated(true);
  }

  function handleWizardDataChange(data: Record<string, string>) {
    setWizardData({ ...wizardData, ...data });
  }

  // Show phase completion screen
  if (showPhaseComplete !== null) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12">
        <SetupPhase currentStep={currentStep} stepStatuses={stepStatuses} />
        <div className="mt-8">
          <PhaseComplete
            phase={showPhaseComplete}
            onContinue={handlePhaseCompleteNext}
          />
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];
  if (!StepComponent) return null;

  // Instructional steps (no validation needed) can always proceed
  const isInstructionalStep = [1, 4, 6, 9, 12, 14].includes(currentStep);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <SetupPhase currentStep={currentStep} stepStatuses={stepStatuses} />

      <div className="mt-8">
        <SetupStep
          step={currentStepConfig}
          totalStepsInPhase={phaseSteps.length}
          stepIndexInPhase={stepIndexInPhase}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={currentStepConfig.skippable ? handleSkip : undefined}
          canProceed={stepValidated || isInstructionalStep}
        >
          <StepComponent
            onValidated={handleStepValidated}
            wizardData={wizardData}
            setWizardData={handleWizardDataChange}
          />
        </SetupStep>
      </div>
    </div>
  );
}
