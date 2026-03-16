"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle, ChevronRight, ChevronLeft, Check } from "lucide-react";

const TRADE_OPTIONS = [
  "Plumber", "Electrician", "Gas Engineer", "Carpenter", "Roofer",
  "Plasterer", "Painter & Decorator", "Locksmith", "Landscaper",
  "Builder", "Tiler", "Handyman", "Kitchen Fitter", "Bathroom Fitter",
  "Window Fitter", "Heating Engineer", "Damp Proofing", "Pest Control",
  "Drainage Engineer", "Scaffolder",
];

const TOTAL_STEPS = 3;

interface OnboardingData {
  business_name: string;
  phone: string;
  trade: string;
  bio: string;
  postcode: string;
  service_radius_miles: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tradeCategories, setTradeCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [data, setData] = useState<OnboardingData>({
    business_name: "",
    phone: "",
    trade: "",
    bio: "",
    postcode: "",
    service_radius_miles: 25,
  });

  useEffect(() => {
    async function loadTrades() {
      const supabase = createClient();
      const { data: categories } = await supabase
        .from("trade_categories")
        .select("id, name, slug")
        .order("name");
      if (categories) setTradeCategories(categories);
    }
    loadTrades();
  }, []);

  function updateField<K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleComplete() {
    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          business_name: data.business_name || null,
          phone: data.phone || null,
          bio: data.bio || null,
          postcode: data.postcode.toUpperCase() || null,
          service_radius_miles: data.service_radius_miles,
          is_onboarded: true,
        })
        .eq("id", user.id);

      if (profileError) {
        setError(profileError.message);
        setIsSubmitting(false);
        return;
      }

      // Link trade category if selected
      if (data.trade) {
        const category = tradeCategories.find((c) => c.name === data.trade);
        if (category) {
          await supabase.from("services").insert({
            profile_id: user.id,
            trade_category_id: category.id,
          });
        }
      }

      // Fetch lat/lng from postcodes.io
      if (data.postcode) {
        try {
          const res = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(data.postcode)}`
          );
          const json = await res.json();
          if (json.status === 200 && json.result) {
            await supabase
              .from("profiles")
              .update({
                latitude: json.result.latitude,
                longitude: json.result.longitude,
              })
              .eq("id", user.id);
          }
        } catch {
          // Non-critical — postcode lookup failed, continue
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          Step {step} of {TOTAL_STEPS} — {step === 1 ? "Business Details" : step === 2 ? "Your Trade" : "Service Area"}
        </CardDescription>
        {/* Progress bar */}
        <div className="mt-4 flex gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < step
                  ? "bg-gradient-to-r from-amber-500 to-orange-600"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Step 1: Business Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={data.business_name}
                onChange={(e) => updateField("business_name", e.target.value)}
                placeholder="e.g. Sidwell Plumbing Services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="07700 900123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">About You / Your Business</Label>
              <textarea
                id="bio"
                value={data.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Tell homeowners about your experience, specialisms, and what makes you different..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        )}

        {/* Step 2: Trade */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Your Primary Trade *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(tradeCategories.length > 0 ? tradeCategories.map((c) => c.name) : TRADE_OPTIONS).map(
                  (trade) => (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => updateField("trade", trade)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        data.trade === trade
                          ? "border-amber-500 bg-amber-50 font-medium text-amber-700"
                          : "border-border hover:border-amber-300 hover:bg-amber-50/50"
                      }`}
                    >
                      {data.trade === trade && (
                        <Check className="mr-1.5 inline h-3.5 w-3.5" />
                      )}
                      {trade}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Service Area */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postcode">Your Base Postcode *</Label>
              <Input
                id="postcode"
                value={data.postcode}
                onChange={(e) => updateField("postcode", e.target.value)}
                placeholder="e.g. M1 1AA"
              />
              <p className="text-xs text-muted-foreground">
                This is used to match you with nearby homeowners. It won&apos;t
                be shown publicly.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Service Radius: {data.service_radius_miles} miles</Label>
              <input
                id="radius"
                type="range"
                min={5}
                max={100}
                step={5}
                value={data.service_radius_miles}
                onChange={(e) =>
                  updateField("service_radius_miles", parseInt(e.target.value))
                }
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 miles</span>
                <span>100 miles</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => { setStep(step - 1); setError(""); }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => { setStep(step + 1); setError(""); }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting || !data.postcode}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>Complete Setup <Check className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
