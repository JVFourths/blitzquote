import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getGoogleEmail } from "@/lib/calendar/google";

/**
 * GET /api/calendar/callback
 * Google OAuth2 callback — exchanges code for tokens and stores refresh token.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user ID
  const error = searchParams.get("error");

  if (error) {
    console.error("[Calendar OAuth] Error:", error);
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendar_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendar_error=missing_code`
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify the state matches the logged-in user
  if (!user || user.id !== state) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendar_error=auth_mismatch`
    );
  }

  try {
    const redirectUri = `${origin}/api/calendar/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${origin}/dashboard/settings?calendar_error=no_refresh_token`
      );
    }

    // Get the Google account email
    const googleEmail = await getGoogleEmail(tokens.access_token);

    // Store the refresh token in the profile
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        google_calendar_refresh_token: tokens.refresh_token,
        google_calendar_connected: true,
        google_calendar_email: googleEmail,
      })
      .eq("id", user.id);

    if (dbError) {
      console.error("[Calendar OAuth] DB error:", dbError);
      return NextResponse.redirect(
        `${origin}/dashboard/settings?calendar_error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendar_connected=true`
    );
  } catch (err) {
    console.error("[Calendar OAuth] Token exchange failed:", err);
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendar_error=token_exchange_failed`
    );
  }
}
