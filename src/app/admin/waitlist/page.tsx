"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Mail, Download, ClipboardList } from "lucide-react";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  trade: string | null;
  preferred_plan: string | null;
  is_invited: boolean;
  created_at: string;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);

  const loadWaitlist = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setEntries(data as WaitlistEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadWaitlist(); }, [loadWaitlist]);

  async function markInvited(id: string) {
    setInviting(id);
    const supabase = createClient();

    await supabase
      .from("waitlist")
      .update({ is_invited: true, invited_at: new Date().toISOString() })
      .eq("id", id);

    await loadWaitlist();
    setInviting(null);
  }

  function exportCsv() {
    const header = "Name,Email,Trade,Preferred Plan,Invited,Signed Up\n";
    const rows = entries
      .map(
        (e) =>
          `"${e.name}","${e.email}","${e.trade || ""}","${e.preferred_plan || ""}","${e.is_invited ? "Yes" : "No"}","${new Date(e.created_at).toLocaleDateString("en-GB")}"`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blitzquote-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const invited = entries.filter((e) => e.is_invited).length;
  const pending = entries.filter((e) => !e.is_invited).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="mt-1 text-muted-foreground">
            {entries.length} signups — {pending} pending, {invited} invited.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={entries.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 h-8 w-8" />
            No waitlist signups yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{entry.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {entry.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={entry.is_invited ? "default" : "secondary"}
                    >
                      {entry.is_invited ? "Invited" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {entry.trade && <span>Trade: {entry.trade}</span>}
                    {entry.preferred_plan && (
                      <span className="capitalize">
                        Plan: {entry.preferred_plan.replace(/_/g, " ")}
                      </span>
                    )}
                    <span>
                      Signed up:{" "}
                      {new Date(entry.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {!entry.is_invited && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markInvited(entry.id)}
                      disabled={inviting === entry.id}
                    >
                      {inviting === entry.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          Mark Invited
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
