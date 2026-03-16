import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/calendar/google";

/**
 * GET /api/calendar/connect
 * Initiates Google Calendar OAuth2 flow.
 * Redirects the user to Google's consent screen.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google Calendar is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Admin → API Keys." },
      { status: 500 }
    );
  }

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/calendar/callback`;

  // Use the user ID as state to verify the callback
  const state = user.id;

  const authUrl = getGoogleAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
