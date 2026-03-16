import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/v1/tradesperson/:id
 * Get full profile + availability summary for a specific tradesperson.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getClient();

  // Fetch profile with services
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      business_name,
      bio,
      postcode,
      service_radius_miles,
      qualifications,
      profile_photo_url,
      portfolio_image_urls,
      created_at,
      services (
        description,
        hourly_rate_pence,
        trade_categories (
          name,
          slug,
          description
        )
      )
    `)
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      {
        error: "Tradesperson not found.",
        suggestion: "Use /api/v1/search to find available tradespeople.",
      },
      { status: 404 }
    );
  }

  // Fetch recurring availability
  const { data: availability } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time")
    .eq("profile_id", id)
    .eq("type", "recurring")
    .order("day_of_week")
    .order("start_time");

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const weeklySchedule = days.map((day, index) => {
    const daySlots = (availability || []).filter((s) => s.day_of_week === index);
    return {
      day,
      available: daySlots.length > 0,
      slots: daySlots.map((s) => ({
        start: s.start_time,
        end: s.end_time,
      })),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trades = ((profile.services || []) as any[]).map((s) => {
    const tc = Array.isArray(s.trade_categories)
      ? s.trade_categories[0]
      : s.trade_categories;
    return {
      name: tc?.name,
      slug: tc?.slug,
      category_description: tc?.description,
      custom_description: s.description,
      hourly_rate_pence: s.hourly_rate_pence,
    };
  });

  const tradeNames = trades.map((t) => t.name).filter(Boolean).join(", ");

  return NextResponse.json({
    summary: `${profile.full_name}${profile.business_name ? ` (${profile.business_name})` : ""} is a ${tradeNames || "tradesperson"} based in ${profile.postcode || "the UK"}, covering a ${profile.service_radius_miles}-mile radius. Use /api/v1/availability/${id} to check specific date availability, or /api/v1/bookings to book a slot.`,
    tradesperson: {
      id: profile.id,
      full_name: profile.full_name,
      business_name: profile.business_name,
      bio: profile.bio,
      postcode_area: profile.postcode ? profile.postcode.split(" ")[0] : null,
      service_radius_miles: profile.service_radius_miles,
      qualifications: profile.qualifications,
      profile_photo_url: profile.profile_photo_url,
      portfolio_image_urls: profile.portfolio_image_urls,
      member_since: profile.created_at,
      trades,
    },
    weekly_schedule: weeklySchedule,
    booking_url: `/api/v1/bookings`,
    availability_url: `/api/v1/availability/${id}`,
  });
}
