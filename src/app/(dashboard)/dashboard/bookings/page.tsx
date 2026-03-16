"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CalendarCheck, MapPin, User, MessageSquare } from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  job_description: string;
  postcode: string | null;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  source: string;
  created_at: string;
}

const STATUS_FILTERS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    let query = supabase
      .from("bookings")
      .select("*")
      .eq("profile_id", user.id)
      .order("slot_start", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    if (data) setBookings(data as Booking[]);
    setLoading(false);
  }, [router, filter]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  async function updateStatus(bookingId: string, newStatus: BookingStatus) {
    setUpdating(bookingId);

    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update booking status:", err);
    }

    await loadBookings();
    setUpdating(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your incoming and past bookings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter(f.value); setLoading(true); }}
            className={filter === f.value ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No bookings found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all"
                ? "Bookings from AI agents and direct customers will appear here."
                : `No ${filter} bookings.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      <User className="mr-1.5 inline h-4 w-4" />
                      {booking.customer_name}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.customer_email}
                      {booking.customer_phone && ` | ${booking.customer_phone}`}
                    </p>
                  </div>
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "default"
                        : booking.status === "pending"
                          ? "secondary"
                          : booking.status === "completed"
                            ? "outline"
                            : "destructive"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p>{booking.job_description}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {new Date(booking.slot_start).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" "}
                    {new Date(booking.slot_start).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(booking.slot_end).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {booking.postcode && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {booking.postcode}
                    </span>
                  )}
                  <span className="capitalize">via {booking.source}</span>
                </div>

                {/* Action buttons */}
                {booking.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => updateStatus(booking.id, "confirmed")}
                      disabled={updating === booking.id}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {updating === booking.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Confirm"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(booking.id, "cancelled")}
                      disabled={updating === booking.id}
                      className="text-destructive hover:text-destructive"
                    >
                      Decline
                    </Button>
                  </div>
                )}
                {booking.status === "confirmed" && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(booking.id, "completed")}
                      disabled={updating === booking.id}
                    >
                      {updating === booking.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Mark Complete"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
