import { createClient } from "@supabase/supabase-js";

export function getServiceClient(url: string, key: string) {
  return createClient(url, key);
}

/**
 * Check if setup is complete (Phase 2 done = minimum viable).
 * Phase 3 is optional, so we don't gate on it.
 */
export async function isSetupComplete(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const supabase = getServiceClient(url, key);
    const { data } = await supabase
      .from("setup_status")
      .select("status")
      .eq("phase", 2)
      .eq("status", "complete")
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Mark a setup step as complete.
 */
export async function markStepComplete(
  url: string,
  key: string,
  phase: number,
  step: number,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getServiceClient(url, key);
  await supabase.from("setup_status").upsert(
    {
      phase,
      step,
      status: "complete",
      completed_at: new Date().toISOString(),
      metadata,
    },
    { onConflict: "phase,step" }
  );
}

/**
 * Get all setup step statuses.
 */
export async function getSetupSteps(
  url: string,
  key: string
): Promise<{ phase: number; step: number; status: string; completed_at: string | null }[]> {
  const supabase = getServiceClient(url, key);
  const { data } = await supabase
    .from("setup_status")
    .select("phase, step, status, completed_at")
    .order("phase")
    .order("step");
  return (data || []) as { phase: number; step: number; status: string; completed_at: string | null }[];
}
