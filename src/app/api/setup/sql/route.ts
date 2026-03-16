import { NextResponse } from "next/server";
import { getCombinedSQL } from "@/lib/setup/combined-sql";

/**
 * GET /api/setup/sql
 * Returns the combined SQL for Grant to paste into Supabase SQL Editor.
 */
export async function GET() {
  return NextResponse.json({ sql: getCombinedSQL() });
}
