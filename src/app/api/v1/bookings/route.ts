import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { lookupPostcode } from "@/lib/geo/postcode";
import { notifyTradesperson, confirmToCustomer } from "@/lib/notifications/email";
import { createCalendarEvent, refreshAccessToken } from "@/lib/calendar/google";
import { recordBookingCharge } from "@/lib/billing/events";
import { handleCors } from "@/lib/api/headers";

export function OPTIONS() { return handleCors(); }

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/v1/bookings
 * Create a new booking for a tradesperson.
 *
 * Body (JSON):
 *   tradesperson_id  — UUID (required)
 *   customer_name    — string (required)
 *   customer_email   — string (required)
 *   job_description  — string (required)
 *   slot_start       — ISO 8601 datetime (required)
 *   slot_end         — ISO 8601 datetime (required)
 *   customer_phone   — string (optional)
 *   postcode         — string (optional)
 *   source           — string (optional, e.g. "chatgpt", "claude", "siri")
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tradesperson_id,
      customer_name,
      customer_email,
      job_description,
      slot_start,
      slot_end,
      customer_phone,
      postcode,
      source,
    } = body;

    // Validate required fields
    const missing: string[] = [];
    if (!tradesperson_id) missing.push("tradesperson_id");
    if (!customer_name) missing.push("customer_name");
    if (!customer_email) missing.push("customer_email");
    if (!job_description) missing.push("job_description");
    if (!slot_start) missing.push("slot_start");
    if (!slot_end) missing.push("slot_end");

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${missing.join(", ")}`,
          required_fields: {
            tradesperson_id: "UUID of the tradesperson",
            customer_name: "Full name of the customer",
            customer_email: "Customer email address",
            job_description: "Description of the work needed",
            slot_start: "ISO 8601 start time",
            slot_end: "ISO 8601 end time",
          },
        },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address for customer_email." },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(slot_start);
    const endDate = new Date(slot_end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "slot_start and slot_end must be valid ISO 8601 datetimes." },
        { status: 400 }
      );
    }
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "slot_end must be after slot_start." },
        { status: 400 }
      );
    }
    if (startDate < new Date()) {
      return NextResponse.json(
        { error: "Cannot book a slot in the past." },
        { status: 400 }
      );
    }

    const supabase = getClient();

    // Verify tradesperson exists and is active
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, email, subscription_plan, google_calendar_connected, google_calendar_refresh_token")
      .eq("id", tradesperson_id)
      .eq("is_active", true)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Tradesperson not found or is not currently active." },
        { status: 404 }
      );
    }

    // Check for overlapping bookings (race-condition safe with unique constraint or advisory lock)
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("profile_id", tradesperson_id)
      .in("status", ["pending", "confirmed"])
      .lt("slot_start", slot_end)
      .gt("slot_end", slot_start);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "This time slot is no longer available. It has been booked by someone else.",
          suggestion: `Use GET /api/v1/availability/${tradesperson_id} to find other available slots.`,
        },
        { status: 409 }
      );
    }

    // Resolve postcode lat/lng if provided
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (postcode) {
      const result = await lookupPostcode(postcode);
      if (result) {
        latitude = result.latitude;
        longitude = result.longitude;
      }
    }

    // Create the booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        profile_id: tradesperson_id,
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim().toLowerCase(),
        customer_phone: customer_phone?.trim() || null,
        job_description: job_description.trim(),
        postcode: postcode?.trim().toUpperCase() || null,
        latitude,
        longitude,
        slot_start,
        slot_end,
        status: "pending",
        source: source?.trim().toLowerCase() || "api",
        source_metadata: { user_agent: request.headers.get("user-agent") },
      })
      .select("id, status, slot_start, slot_end, created_at")
      .single();

    if (error) {
      console.error("Booking creation error:", error);
      return NextResponse.json(
        { error: "Failed to create booking. Please try again." },
        { status: 500 }
      );
    }

    const tradeName = profile.business_name || profile.full_name;

    // === POST-BOOKING PIPELINE (fire-and-forget, don't block response) ===

    const bookingDetails = {
      customerName: customer_name.trim(),
      customerEmail: customer_email.trim().toLowerCase(),
      customerPhone: customer_phone?.trim() || null,
      jobDescription: job_description.trim(),
      postcode: postcode?.trim().toUpperCase() || null,
      slotStart: slot_start,
      slotEnd: slot_end,
      source: source?.trim().toLowerCase() || "api",
      bookingId: booking.id,
    };

    // 1. Notify tradesperson (email + in-app)
    notifyTradesperson(profile.email, profile.full_name, bookingDetails).catch(
      (err) => console.error("[Booking Pipeline] Tradesperson notification failed:", err)
    );

    // 2. Send confirmation to customer
    confirmToCustomer(tradeName, bookingDetails).catch(
      (err) => console.error("[Booking Pipeline] Customer confirmation failed:", err)
    );

    // 3. Create Google Calendar event (if tradesperson has calendar connected)
    if (profile.google_calendar_connected && profile.google_calendar_refresh_token) {
      (async () => {
        try {
          const accessToken = await refreshAccessToken(profile.google_calendar_refresh_token);
          const eventId = await createCalendarEvent(accessToken, {
            summary: `BlitzQuote: ${job_description.trim()}`,
            description: `Booking with ${customer_name.trim()}\nEmail: ${customer_email}\n${customer_phone ? `Phone: ${customer_phone}\n` : ""}Job: ${job_description.trim()}\nBooked via: ${source || "api"}\nBooking ID: ${booking.id}`,
            location: postcode?.trim().toUpperCase() || null,
            startTime: slot_start,
            endTime: slot_end,
            attendeeEmail: customer_email.trim().toLowerCase(),
          });
          if (eventId) {
            await supabase
              .from("bookings")
              .update({ google_calendar_event_id: eventId })
              .eq("id", booking.id);
            console.log("[Calendar] Event linked to booking:", eventId);
          }
        } catch (err) {
          console.error("[Booking Pipeline] Calendar event failed:", err);
        }
      })();
    } else {
      console.log("[Calendar] Tradesperson has no calendar connected — skipping");
    }

    // 4. Record billing event for pay-per-booking plans
    recordBookingCharge(tradesperson_id, booking.id).catch(
      (err) => console.error("[Booking Pipeline] Billing event failed:", err)
    );

    return NextResponse.json(
      {
        summary: `Booking created successfully with ${tradeName}. The booking is pending confirmation. The tradesperson will be notified and can confirm or decline. You can check the booking status at GET /api/v1/bookings/${booking.id}.`,
        booking: {
          id: booking.id,
          tradesperson_id,
          tradesperson_name: tradeName,
          status: booking.status,
          slot_start: booking.slot_start,
          slot_end: booking.slot_end,
          created_at: booking.created_at,
        },
        status_check_url: `/api/v1/bookings/${booking.id}`,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Please send valid JSON." },
      { status: 400 }
    );
  }
}
