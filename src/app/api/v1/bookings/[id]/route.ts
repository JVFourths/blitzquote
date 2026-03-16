import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/v1/bookings/:id
 * Check the status of a booking.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_name,
      customer_email,
      job_description,
      postcode,
      slot_start,
      slot_end,
      status,
      source,
      created_at,
      updated_at,
      profile_id
    `)
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { error: "Booking not found.", suggestion: "Check the booking ID and try again." },
      { status: 404 }
    );
  }

  // Fetch tradesperson name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", booking.profile_id)
    .single();

  const tradeName = profile?.business_name || profile?.full_name || "Unknown";

  const statusDescriptions: Record<string, string> = {
    pending: "The tradesperson has been notified and will confirm or decline shortly.",
    confirmed: "The tradesperson has confirmed this booking. The job is scheduled.",
    completed: "This job has been completed.",
    cancelled: "This booking has been cancelled.",
  };

  return NextResponse.json({
    summary: `Booking with ${tradeName} is currently "${booking.status}". ${statusDescriptions[booking.status] || ""}`,
    booking: {
      id: booking.id,
      tradesperson_name: tradeName,
      customer_name: booking.customer_name,
      job_description: booking.job_description,
      location_postcode: booking.postcode,
      slot_start: booking.slot_start,
      slot_end: booking.slot_end,
      status: booking.status,
      status_description: statusDescriptions[booking.status],
      source: booking.source,
      created_at: booking.created_at,
      last_updated: booking.updated_at,
    },
  });
}
