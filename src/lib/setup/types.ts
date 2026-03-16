export type StepStatus = "pending" | "in-progress" | "validated" | "skipped";

export interface WizardStep {
  id: number;
  phase: 1 | 2 | 3;
  title: string;
  description: string;
  skippable: boolean;
  requiresAuth: boolean;
  envVars?: string[];
}

export interface WizardState {
  currentPhase: number;
  currentStep: number;
  steps: Record<number, {
    status: StepStatus;
    completedAt?: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string[];
  suggestions?: string[];
}

export interface FieldConfig {
  key: string;
  label: string;
  hint: string;
  pattern?: RegExp;
  patternError?: string;
  sensitive: boolean;
  placeholder: string;
}
