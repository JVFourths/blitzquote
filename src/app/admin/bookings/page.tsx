import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarCheck, MapPin, User } from "lucide-react";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const supabase = getClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, profiles!bookings_profile_id_fkey(full_name, business_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <p className="mt-1 text-muted-foreground">
          View all bookings across the platform.
        </p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarCheck className="mx-auto mb-3 h-8 w-8" />
            No bookings yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = b.profiles as any;
            const tradeName = profile?.business_name || profile?.full_name || "Unknown";

            return (
              <Card key={b.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {b.customer_name}
                        <span className="font-normal text-muted-foreground">→</span>
                        {tradeName}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {b.customer_email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          b.status === "confirmed"
                            ? "default"
                            : b.status === "pending"
                              ? "secondary"
                              : b.status === "completed"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {b.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {b.source}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{b.job_description}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      {new Date(b.slot_start).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {new Date(b.slot_end).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {b.postcode && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {b.postcode}
                      </span>
                    )}
                    <span>
                      Created:{" "}
                      {new Date(b.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
