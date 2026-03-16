import { NextResponse } from "next/server";

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "BlitzQuote API",
    description:
      "Find and book UK tradespeople instantly. Search by trade, location, and availability. Designed for AI agent consumption — all responses include human-readable summaries alongside structured data.",
    version: "1.0.0",
    contact: {
      name: "BlitzQuote Support",
      email: "support@blitzquote.co.uk",
      url: "https://blitzquote.co.uk",
    },
  },
  servers: [
    {
      url: "https://blitzquote.co.uk/api/v1",
      description: "Production",
    },
    {
      url: "http://localhost:3007/api/v1",
      description: "Local development",
    },
  ],
  paths: {
    "/trades": {
      get: {
        operationId: "listTrades",
        summary: "List all available trade categories",
        description:
          "Returns all trade categories (plumber, electrician, etc.) with slugs for use in search queries.",
        responses: {
          "200": {
            description: "List of trade categories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "Human-readable summary" },
                    total: { type: "integer" },
                    trades: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", description: "Human-readable trade name" },
                          slug: { type: "string", description: "URL-safe identifier for search queries" },
                          description: { type: "string" },
                          icon: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/search": {
      get: {
        operationId: "searchTradespeople",
        summary: "Search for tradespeople by trade, location, and availability",
        description:
          "Find tradespeople matching criteria. Returns profiles sorted by distance when a postcode is provided.",
        parameters: [
          {
            name: "trade",
            in: "query",
            description: "Trade category slug (e.g. 'plumber', 'electrician'). Get slugs from /trades.",
            schema: { type: "string" },
          },
          {
            name: "postcode",
            in: "query",
            description: "UK postcode for location-based search (e.g. 'M1 1AA')",
            schema: { type: "string" },
          },
          {
            name: "date",
            in: "query",
            description: "ISO 8601 date to check availability (e.g. '2026-03-20')",
            schema: { type: "string", format: "date" },
          },
          {
            name: "radius",
            in: "query",
            description: "Search radius in miles (default: 25, max: 100)",
            schema: { type: "integer", default: 25, maximum: 100 },
          },
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results (default: 10, max: 50)",
            schema: { type: "integer", default: 10, maximum: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Search results with tradesperson profiles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    total: { type: "integer" },
                    search_parameters: { type: "object" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          full_name: { type: "string" },
                          business_name: { type: "string", nullable: true },
                          bio: { type: "string", nullable: true },
                          distance_miles: { type: "number", nullable: true },
                          qualifications: { type: "array", items: { type: "string" } },
                          trades: { type: "array", items: { type: "object" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid postcode or search parameters",
          },
        },
      },
    },
    "/tradesperson/{id}": {
      get: {
        operationId: "getTradesperson",
        summary: "Get full profile and weekly schedule for a tradesperson",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Tradesperson UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "Tradesperson profile with weekly schedule" },
          "404": { description: "Tradesperson not found" },
        },
      },
    },
    "/availability/{id}": {
      get: {
        operationId: "getAvailability",
        summary: "Get available time slots for a tradesperson",
        description:
          "Returns day-by-day available slots, accounting for existing bookings and blocked dates.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Tradesperson UUID",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "date",
            in: "query",
            description: "Start date for availability check (default: today)",
            schema: { type: "string", format: "date" },
          },
          {
            name: "days",
            in: "query",
            description: "Number of days to look ahead (default: 7, max: 30)",
            schema: { type: "integer", default: 7, maximum: 30 },
          },
        ],
        responses: {
          "200": { description: "Available time slots with booking instructions" },
          "404": { description: "Tradesperson not found" },
        },
      },
    },
    "/bookings": {
      post: {
        operationId: "createBooking",
        summary: "Book a quoting slot with a tradesperson",
        description:
          "Creates a new booking. The tradesperson will be notified and can confirm or decline. Checks for slot conflicts.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "tradesperson_id",
                  "customer_name",
                  "customer_email",
                  "job_description",
                  "slot_start",
                  "slot_end",
                ],
                properties: {
                  tradesperson_id: {
                    type: "string",
                    format: "uuid",
                    description: "UUID of the tradesperson to book",
                  },
                  customer_name: {
                    type: "string",
                    description: "Full name of the homeowner/customer",
                  },
                  customer_email: {
                    type: "string",
                    format: "email",
                    description: "Customer's email for booking confirmation",
                  },
                  job_description: {
                    type: "string",
                    description: "What work needs doing (be specific)",
                  },
                  slot_start: {
                    type: "string",
                    format: "date-time",
                    description: "Start of the quoting slot (ISO 8601)",
                  },
                  slot_end: {
                    type: "string",
                    format: "date-time",
                    description: "End of the quoting slot (ISO 8601)",
                  },
                  customer_phone: {
                    type: "string",
                    description: "Customer's phone number (optional)",
                  },
                  postcode: {
                    type: "string",
                    description: "Postcode where the job is located (optional)",
                  },
                  source: {
                    type: "string",
                    description: "AI platform making this booking (e.g. 'chatgpt', 'claude', 'siri', 'google_assistant')",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Booking created successfully" },
          "400": { description: "Missing or invalid fields" },
          "404": { description: "Tradesperson not found" },
          "409": { description: "Time slot conflict — already booked" },
        },
      },
    },
    "/bookings/{id}": {
      get: {
        operationId: "getBookingStatus",
        summary: "Check the status of a booking",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Booking UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "Booking details with current status" },
          "404": { description: "Booking not found" },
        },
      },
    },
  },
};

/**
 * GET /api/v1/openapi.json
 * Returns the full OpenAPI 3.1 specification for the BlitzQuote API.
 */
export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
