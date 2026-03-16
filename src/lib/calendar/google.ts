/**
 * Google Calendar integration.
 * OAuth2 flow + event creation/management.
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

interface CalendarEvent {
  summary: string;
  description: string;
  location: string | null;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Build the Google OAuth2 authorization URL.
 */
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return res.json();
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Get the Google account email from an access token.
 */
export async function getGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch Google user info");

  const data = await res.json();
  return data.email;
}

/**
 * Create a Google Calendar event for a booking.
 */
export async function createCalendarEvent(
  accessToken: string | null,
  event: CalendarEvent
): Promise<string | null> {
  if (!accessToken) {
    console.log("[Calendar] No access token — skipping event creation");
    return null;
  }

  try {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startTime,
          timeZone: "Europe/London",
        },
        end: {
          dateTime: event.endTime,
          timeZone: "Europe/London",
        },
        attendees: [{ email: event.attendeeEmail }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[Calendar] Failed to create event:", error);
      return null;
    }

    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error("[Calendar] Error creating event:", err);
    return null;
  }
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.ok || res.status === 404; // 404 = already deleted
  } catch (err) {
    console.error("[Calendar] Error deleting event:", err);
    return false;
  }
}

/**
 * Fetch busy times from Google Calendar for a date range.
 * Used for two-way sync: block BlitzQuote slots that are busy in Google Calendar.
 */
export async function getFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<{ start: string; end: string }[]> {
  try {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "Europe/London",
        items: [{ id: "primary" }],
      }),
    });

    if (!res.ok) {
      console.error("[Calendar] FreeBusy query failed:", await res.text());
      return [];
    }

    const data = await res.json();
    return data.calendars?.primary?.busy || [];
  } catch (err) {
    console.error("[Calendar] Error fetching free/busy:", err);
    return [];
  }
}
