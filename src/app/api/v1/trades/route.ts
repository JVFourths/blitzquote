import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { handleCors } from "@/lib/api/headers";

export function OPTIONS() { return handleCors(); }

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/v1/trades
 * List all available trade categories.
 * Designed for LLM consumption — includes human-readable descriptions.
 */
export async function GET() {
  const supabase = getClient();

  const { data: categories, error } = await supabase
    .from("trade_categories")
    .select("id, name, slug, description, icon")
    .order("name");

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch trade categories.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    summary: `There are ${categories.length} trade categories available on BlitzQuote. Use the slug value when searching for tradespeople.`,
    total: categories.length,
    trades: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
    })),
  });
}
