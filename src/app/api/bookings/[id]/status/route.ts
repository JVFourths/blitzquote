import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyStatusChange } from "@/lib/notifications/email";

/**
 * PATCH /api/bookings/:id/status
 * Update booking status (authenticated — tradesperson only).
 * Sends email notification to customer on status change.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: confirmed, completed, or cancelled." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Fetch the booking (must belong to this tradesperson)
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, profile_id, customer_name, customer_email, status")
      .eq("id", id)
      .eq("profile_id", user.id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Update status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update booking." },
        { status: 500 }
      );
    }

    // Get tradesperson name for notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, business_name")
      .eq("id", user.id)
      .single();

    const tradeName = profile?.business_name || profile?.full_name || "Your tradesperson";

    // Send notification to customer (fire-and-forget)
    notifyStatusChange(
      booking.customer_email,
      booking.customer_name,
      tradeName,
      id,
      status
    ).catch((err) => console.error("[Status Update] Notification failed:", err));

    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
