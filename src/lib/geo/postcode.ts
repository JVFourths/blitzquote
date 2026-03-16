interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
}

/**
 * Look up lat/lng for a UK postcode via postcodes.io (free, no key needed).
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeResult | null> {
  try {
    const baseUrl = process.env.POSTCODES_IO_URL || "https://api.postcodes.io";
    const res = await fetch(
      `${baseUrl}/postcodes/${encodeURIComponent(postcode.trim())}`,
      { next: { revalidate: 86400 } } // cache for 24h
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 200 || !json.result) return null;

    return {
      postcode: json.result.postcode,
      latitude: json.result.latitude,
      longitude: json.result.longitude,
    };
  } catch {
    return null;
  }
}
