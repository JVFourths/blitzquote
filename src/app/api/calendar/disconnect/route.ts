import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/calendar/disconnect
 * Disconnects Google Calendar by clearing the stored refresh token.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      google_calendar_refresh_token: null,
      google_calendar_connected: false,
      google_calendar_email: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to disconnect." }, { status: 500 });
  }

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/dashboard/settings?calendar_disconnected=true`, {
    status: 302,
  });
}
