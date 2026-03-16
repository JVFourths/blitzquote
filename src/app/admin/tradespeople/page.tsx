import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function AdminTradespeopleePage() {
  const supabase = getClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, business_name, postcode, subscription_plan, is_active, is_onboarded, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tradespeople</h1>
          <p className="mt-1 text-muted-foreground">
            All registered tradespeople on the platform.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3.5 w-3.5" />
          {profiles?.length ?? 0} total
        </Badge>
      </div>

      {!profiles || profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tradespeople registered yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{p.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {p.email}
                      {p.phone ? ` | ${p.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={p.is_active ? "default" : "destructive"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {p.subscription_plan.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {p.business_name && <span>Business: {p.business_name}</span>}
                  {p.postcode && <span>Postcode: {p.postcode}</span>}
                  <span>Onboarded: {p.is_onboarded ? "Yes" : "No"}</span>
                  <span>
                    Joined:{" "}
                    {new Date(p.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
