import { NextResponse } from "next/server";
import { getSetupSteps } from "@/lib/setup/guard";

/**
 * GET /api/setup/status
 * Returns current wizard state from setup_status table.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      configured: false,
      message: "Supabase is not configured yet. Complete Phase 1 first.",
    });
  }

  try {
    const steps = await getSetupSteps(url, key);

    const phase1Complete = steps.some((s) => s.phase === 1 && s.step === 5 && s.status === "complete");
    const phase2Complete = steps.some((s) => s.phase === 2 && s.status === "complete");
    const phase3Complete = steps.some((s) => s.phase === 3 && s.status === "complete");

    return NextResponse.json({
      configured: true,
      setup_complete: phase2Complete,
      phases: {
        1: { complete: phase1Complete },
        2: { complete: phase2Complete },
        3: { complete: phase3Complete },
      },
      steps,
    });
  } catch {
    // Table doesn't exist yet — SQL hasn't been run
    return NextResponse.json({
      configured: true,
      setup_complete: false,
      error: "setup_status table not found. Run the database SQL first.",
      steps: [],
    });
  }
}
