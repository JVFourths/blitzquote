"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Calendar,
  Bell,
  Shield,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Unplug,
  XCircle,
} from "lucide-react";

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <SettingsPage />
    </Suspense>
  );
}

function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deactivating, setDeactivating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const calendarSuccess = searchParams.get("calendar_connected") === "true";
  const calendarDisconnected = searchParams.get("calendar_disconnected") === "true";
  const calendarError = searchParams.get("calendar_error");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("google_calendar_connected, google_calendar_email")
        .eq("id", user.id)
        .single();

      if (profile) {
        setCalendarConnected(profile.google_calendar_connected || false);
        setCalendarEmail(profile.google_calendar_email || null);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setSyncMessage(`Synced ${data.synced_blocks} busy blocks from Google Calendar.`);
      } else {
        setSyncMessage(data.error || "Sync failed.");
      }
    } catch {
      setSyncMessage("Network error during sync.");
    }

    setSyncing(false);
  }

  async function handleDeactivate() {
    if (!confirm("Are you sure you want to deactivate your account? Your profile will no longer be visible to AI agents.")) {
      return;
    }

    setDeactivating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", user.id);

    if (dbError) {
      setError(dbError.message);
      setDeactivating(false);
      return;
    }

    router.push("/");
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
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account preferences and integrations.
        </p>
      </div>

      {/* Calendar banners */}
      {calendarSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Google Calendar connected successfully! Your busy times will now sync automatically.
        </div>
      )}
      {calendarDisconnected && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <Unplug className="h-5 w-5 shrink-0" />
          Google Calendar disconnected. Booking events will no longer sync.
        </div>
      )}
      {calendarError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          Calendar connection failed: {calendarError.replace(/_/g, " ")}. Please try again.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            How you want to be notified about new bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive an email for every new booking.
              </p>
            </div>
            <Badge variant="secondary">Always on</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SMS notifications</p>
              <p className="text-xs text-muted-foreground">
                Get a text message for urgent bookings.
              </p>
            </div>
            <Badge variant="outline">Coming soon</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your availability with Google Calendar. Busy times in your
            calendar will automatically block those slots from AI agent bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {calendarConnected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Google Calendar</p>
                    <Badge className="bg-green-100 text-green-700">Connected</Badge>
                  </div>
                  {calendarEmail && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Synced with {calendarEmail}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Sync Now
                  </Button>
                  <form action="/api/calendar/disconnect" method="POST">
                    <Button
                      variant="outline"
                      size="sm"
                      type="submit"
                      className="text-destructive hover:text-destructive"
                    >
                      <Unplug className="mr-1.5 h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </form>
                </div>
              </div>

              {syncMessage && (
                <p className="text-sm text-muted-foreground">{syncMessage}</p>
              )}

              <Separator />
              <div>
                <p className="text-sm font-medium">How sync works</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• Busy times from your Google Calendar block those slots on BlitzQuote</li>
                  <li>• New bookings from AI agents are added to your Google Calendar</li>
                  <li>• Sync runs automatically, or click &quot;Sync Now&quot; for immediate update</li>
                  <li>• Only the next 14 days are synced at a time</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Connect to sync your availability and receive booking events.
                </p>
              </div>
              <a href="/api/calendar/connect">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  Connect Google Calendar
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deactivate Account</p>
              <p className="text-xs text-muted-foreground">
                Your profile will be hidden from AI agents. You can reactivate
                by signing in again.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Deactivate
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
