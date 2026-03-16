"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6; // 06:00 to 19:30
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

interface Slot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSlots = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("availability")
      .select("id, day_of_week, start_time, end_time")
      .eq("profile_id", user.id)
      .eq("type", "recurring")
      .order("day_of_week")
      .order("start_time");

    if (data) setSlots(data as Slot[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  function addSlot(dayOfWeek: number) {
    setSlots([
      ...slots,
      { day_of_week: dayOfWeek, start_time: "09:00", end_time: "17:00" },
    ]);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: "start_time" | "end_time", value: string) {
    setSlots(slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete existing recurring slots
    await supabase
      .from("availability")
      .delete()
      .eq("profile_id", user.id)
      .eq("type", "recurring");

    // Insert new slots
    if (slots.length > 0) {
      const { error } = await supabase.from("availability").insert(
        slots.map((slot) => ({
          profile_id: user.id,
          type: "recurring" as const,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }))
      );

      if (error) {
        setMessage({ type: "error", text: error.message });
        setSaving(false);
        return;
      }
    }

    setMessage({ type: "success", text: "Availability saved." });
    setSaving(false);
    await loadSlots();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const slotsByDay = DAYS.map((_, dayIndex) =>
    slots
      .map((slot, originalIndex) => ({ ...slot, originalIndex }))
      .filter((slot) => slot.day_of_week === dayIndex)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="mt-1 text-muted-foreground">
          Set your weekly recurring availability. AI agents will only book slots
          within these times.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {DAYS.map((day, dayIndex) => (
          <Card key={day}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{day}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addSlot(dayIndex)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Slot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {slotsByDay[dayIndex].length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No availability set
                </p>
              ) : (
                <div className="space-y-2">
                  {slotsByDay[dayIndex].map((slot) => (
                    <div
                      key={slot.originalIndex}
                      className="flex items-center gap-2"
                    >
                      <select
                        value={slot.start_time}
                        onChange={(e) =>
                          updateSlot(slot.originalIndex, "start_time", e.target.value)
                        }
                        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">to</span>
                      <select
                        value={slot.end_time}
                        onChange={(e) =>
                          updateSlot(slot.originalIndex, "end_time", e.target.value)
                        }
                        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(slot.originalIndex)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          "Save Availability"
        )}
      </Button>
    </div>
  );
}
