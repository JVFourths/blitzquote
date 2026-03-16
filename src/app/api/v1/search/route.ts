import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { lookupPostcode } from "@/lib/geo/postcode";
import { haversineDistanceMiles } from "@/lib/geo/distance";
import { handleCors } from "@/lib/api/headers";

export function OPTIONS() { return handleCors(); }

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/v1/search
 * Search for tradespeople by trade, location, and availability.
 *
 * Query params:
 *   trade     — trade category slug (e.g. "plumber")
 *   postcode  — UK postcode for location search (e.g. "M1 1AA")
 *   date      — ISO 8601 date to check availability (e.g. "2026-03-20")
 *   radius    — search radius in miles (default: 25, max: 100)
 *   limit     — max results (default: 10, max: 50)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trade = searchParams.get("trade");
  const postcode = searchParams.get("postcode");
  const date = searchParams.get("date");
  const radius = Math.min(parseInt(searchParams.get("radius") || "25") || 25, 100);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10") || 10, 50);

  const supabase = getClient();

  // Resolve postcode to lat/lng
  let searchLat: number | null = null;
  let searchLng: number | null = null;

  if (postcode) {
    const result = await lookupPostcode(postcode);
    if (!result) {
      return NextResponse.json(
        {
          error: `Could not resolve postcode "${postcode}". Please provide a valid UK postcode.`,
          suggestion: "Try a postcode like M1 1AA, SW1A 1AA, or B1 1BB.",
        },
        { status: 400 }
      );
    }
    searchLat = result.latitude;
    searchLng = result.longitude;
  }

  // Build query — fetch active profiles with their services and trade categories
  let query = supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      business_name,
      bio,
      postcode,
      latitude,
      longitude,
      service_radius_miles,
      qualifications,
      profile_photo_url,
      services (
        id,
        description,
        hourly_rate_pence,
        trade_categories (
          id,
          name,
          slug
        )
      )
    `)
    .eq("is_active", true)
    .eq("is_onboarded", true);

  const { data: profiles, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Search failed.", details: error.message },
      { status: 500 }
    );
  }

  // Filter and enrich results
  let results = (profiles || [])
    .map((profile) => {
      // Filter by trade if specified
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const services = (profile.services || []) as any[];
      const matchingServices = trade
        ? services.filter((s) => {
            const tc = Array.isArray(s.trade_categories)
              ? s.trade_categories[0]
              : s.trade_categories;
            return tc?.slug === trade;
          })
        : services;

      if (trade && matchingServices.length === 0) return null;

      // Calculate distance if search location provided
      let distanceMiles: number | null = null;
      if (searchLat !== null && searchLng !== null && profile.latitude && profile.longitude) {
        distanceMiles = haversineDistanceMiles(
          searchLat,
          searchLng,
          profile.latitude,
          profile.longitude
        );

        // Filter by radius — check both search radius and tradesperson's service radius
        if (distanceMiles > radius || distanceMiles > profile.service_radius_miles) {
          return null;
        }
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        business_name: profile.business_name,
        bio: profile.bio,
        postcode_area: profile.postcode ? profile.postcode.split(" ")[0] : null,
        distance_miles: distanceMiles !== null ? Math.round(distanceMiles * 10) / 10 : null,
        qualifications: profile.qualifications,
        profile_photo_url: profile.profile_photo_url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trades: matchingServices.map((s: any) => {
          const tc = Array.isArray(s.trade_categories)
            ? s.trade_categories[0]
            : s.trade_categories;
          return {
            name: tc?.name,
            slug: tc?.slug,
            description: s.description,
            hourly_rate_pence: s.hourly_rate_pence,
          };
        }),
      };
    })
    .filter(Boolean);

  // Sort by distance if location search, otherwise alphabetical
  if (searchLat !== null) {
    results.sort((a, b) => (a!.distance_miles ?? 999) - (b!.distance_miles ?? 999));
  } else {
    results.sort((a, b) => a!.full_name.localeCompare(b!.full_name));
  }

  // Apply limit
  results = results.slice(0, limit);

  // Build human-readable summary for LLMs
  const tradeLabel = trade ? trade.replace(/-/g, " ") : "tradesperson";
  const locationLabel = postcode ? ` near ${postcode}` : "";
  const summary =
    results.length === 0
      ? `No ${tradeLabel}s found${locationLabel}. Try expanding your search radius or using a different postcode.`
      : `Found ${results.length} ${tradeLabel}${results.length !== 1 ? "s" : ""}${locationLabel}. ${
          date
            ? `To check availability for ${date}, use the /api/v1/availability/{id} endpoint with the tradesperson's ID.`
            : "Use the /api/v1/availability/{id} endpoint to check real-time availability for any tradesperson."
        }`;

  return NextResponse.json({
    summary,
    total: results.length,
    search_parameters: {
      trade: trade || "any",
      postcode: postcode || "not specified",
      radius_miles: radius,
      date: date || "not specified",
    },
    results,
  });
}
