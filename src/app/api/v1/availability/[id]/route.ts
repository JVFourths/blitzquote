import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { refreshAccessToken, getFreeBusy } from "@/lib/calendar/google";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/v1/availability/:id
 * Get available time slots for a specific tradesperson.
 *
 * Query params:
 *   date  — specific date (ISO 8601, e.g. "2026-03-20")
 *   days  — number of days to look ahead (default: 7, max: 30)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const daysAhead = Math.min(parseInt(searchParams.get("days") || "7") || 7, 30);

  const supabase = getClient();

  // Verify tradesperson exists and is active
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, business_name, google_calendar_connected, google_calendar_refresh_token")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Tradesperson not found.", suggestion: "Use /api/v1/search to find available tradespeople." },
      { status: 404 }
    );
  }

  // Fetch recurring availability
  const { data: recurringSlots } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time")
    .eq("profile_id", id)
    .eq("type", "recurring")
    .order("day_of_week")
    .order("start_time");

  // Fetch one-off blocks
  const startDate = dateParam ? new Date(dateParam) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysAhead);

  const { data: blocks } = await supabase
    .from("availability")
    .select("start_date, end_date")
    .eq("profile_id", id)
    .eq("type", "one_off_blocked")
    .gte("end_date", startDate.toISOString())
    .lte("start_date", endDate.toISOString());

  // Fetch existing bookings in the date range to exclude booked slots
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("slot_start, slot_end")
    .eq("profile_id", id)
    .in("status", ["pending", "confirmed"])
    .gte("slot_end", startDate.toISOString())
    .lte("slot_start", endDate.toISOString());

  // Fetch Google Calendar busy times if connected
  let googleBusySlots: { start: string; end: string }[] = [];
  if (profile.google_calendar_connected && profile.google_calendar_refresh_token) {
    try {
      const accessToken = await refreshAccessToken(profile.google_calendar_refresh_token);
      googleBusySlots = await getFreeBusy(
        accessToken,
        startDate.toISOString(),
        endDate.toISOString()
      );
    } catch (err) {
      console.error("[Availability] Google Calendar fetch failed:", err);
    }
  }

  // Generate available slots for each day in range
  const availableSlots: {
    date: string;
    day_of_week: string;
    slots: { start: string; end: string; available: boolean }[];
  }[] = [];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let d = 0; d < daysAhead; d++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + d);

    // Skip past dates
    const now = new Date();
    if (current < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      continue;
    }

    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split("T")[0];

    // Check if this date is blocked
    const isBlocked = (blocks || []).some((block) => {
      const blockStart = new Date(block.start_date);
      const blockEnd = new Date(block.end_date);
      return current >= blockStart && current <= blockEnd;
    });

    if (isBlocked) {
      availableSlots.push({
        date: dateStr,
        day_of_week: days[dayOfWeek],
        slots: [],
      });
      continue;
    }

    // Get recurring slots for this day of week
    const dayRecurring = (recurringSlots || []).filter(
      (s) => s.day_of_week === dayOfWeek
    );

    if (dayRecurring.length === 0) {
      availableSlots.push({
        date: dateStr,
        day_of_week: days[dayOfWeek],
        slots: [],
      });
      continue;
    }

    const daySlots = dayRecurring.map((slot) => {
      const slotStart = new Date(`${dateStr}T${slot.start_time}`);
      const slotEnd = new Date(`${dateStr}T${slot.end_time}`);

      // Check if any booking overlaps this slot
      const isBooked = (existingBookings || []).some((booking) => {
        const bookStart = new Date(booking.slot_start);
        const bookEnd = new Date(booking.slot_end);
        return bookStart < slotEnd && bookEnd > slotStart;
      });

      // Check if Google Calendar shows busy during this slot
      const isGoogleBusy = googleBusySlots.some((busy) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return busyStart < slotEnd && busyEnd > slotStart;
      });

      return {
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked && !isGoogleBusy,
      };
    });

    availableSlots.push({
      date: dateStr,
      day_of_week: days[dayOfWeek],
      slots: daySlots,
    });
  }

  const totalAvailable = availableSlots.reduce(
    (sum, day) => sum + day.slots.filter((s) => s.available).length,
    0
  );

  const name = profile.business_name || profile.full_name;

  return NextResponse.json({
    summary: totalAvailable > 0
      ? `${name} has ${totalAvailable} available slot${totalAvailable !== 1 ? "s" : ""} in the next ${daysAhead} days. To book a slot, POST to /api/v1/bookings with the tradesperson ID, a time slot, customer name, email, and job description.`
      : `${name} has no available slots in the next ${daysAhead} days. Try searching for other tradespeople using /api/v1/search.`,
    tradesperson_id: id,
    tradesperson_name: name,
    date_range: {
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
      days: daysAhead,
    },
    total_available_slots: totalAvailable,
    schedule: availableSlots,
    booking_instructions: {
      endpoint: "POST /api/v1/bookings",
      required_fields: {
        tradesperson_id: "UUID of the tradesperson",
        customer_name: "Full name of the customer",
        customer_email: "Customer's email address",
        job_description: "What work needs doing",
        slot_start: "ISO 8601 start time of the selected slot",
        slot_end: "ISO 8601 end time of the selected slot",
      },
      optional_fields: {
        customer_phone: "Customer's phone number",
        postcode: "Customer's postcode for the job location",
        source: "Which AI platform is making this booking (e.g. 'chatgpt', 'claude')",
      },
    },
  });
}
