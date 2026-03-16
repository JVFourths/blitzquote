import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshAccessToken, getFreeBusy } from "@/lib/calendar/google";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/calendar/sync
 * Sync Google Calendar busy times as blocked slots in BlitzQuote.
 * Fetches the next 14 days of busy times and creates one_off_blocked entries.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const serviceSupabase = getServiceSupabase();

  // Get the refresh token
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("google_calendar_refresh_token, google_calendar_connected")
    .eq("id", user.id)
    .single();

  if (!profile?.google_calendar_connected || !profile.google_calendar_refresh_token) {
    return NextResponse.json(
      { error: "Google Calendar is not connected." },
      { status: 400 }
    );
  }

  try {
    // Refresh access token
    const accessToken = await refreshAccessToken(profile.google_calendar_refresh_token);

    // Fetch busy times for the next 14 days
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const busySlots = await getFreeBusy(
      accessToken,
      now.toISOString(),
      twoWeeksLater.toISOString()
    );

    // Clear existing synced blocks for this period
    await serviceSupabase
      .from("availability")
      .delete()
      .eq("profile_id", user.id)
      .eq("type", "one_off_blocked")
      .gte("start_date", now.toISOString())
      .lte("end_date", twoWeeksLater.toISOString());

    // Insert new blocked slots from Google Calendar
    if (busySlots.length > 0) {
      const blockedEntries = busySlots.map((slot) => ({
        profile_id: user.id,
        type: "one_off_blocked" as const,
        start_date: slot.start,
        end_date: slot.end,
      }));

      await serviceSupabase.from("availability").insert(blockedEntries);
    }

    return NextResponse.json({
      success: true,
      synced_blocks: busySlots.length,
      period: {
        from: now.toISOString().split("T")[0],
        to: twoWeeksLater.toISOString().split("T")[0],
      },
    });
  } catch (err) {
    console.error("[Calendar Sync] Error:", err);
    return NextResponse.json(
      { error: "Calendar sync failed. Try reconnecting your Google account." },
      { status: 500 }
    );
  }
}
