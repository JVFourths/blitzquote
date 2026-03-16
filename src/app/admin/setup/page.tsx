"use client";

import { SetupWizard } from "@/components/setup-wizard/SetupWizard";

export default function AdminSetupPage() {
  return <SetupWizard mode="admin" initialStep={5} />;
}
