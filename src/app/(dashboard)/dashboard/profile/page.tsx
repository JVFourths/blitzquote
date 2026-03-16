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
import { Loader2, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  bio: string;
  postcode: string;
  service_radius_miles: number;
  qualifications: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newQualification, setNewQualification] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, business_name, bio, postcode, service_radius_miles, qualifications")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Look up lat/lng if postcode changed
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (profile.postcode) {
      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(profile.postcode)}`
        );
        const json = await res.json();
        if (json.status === 200 && json.result) {
          latitude = json.result.latitude;
          longitude = json.result.longitude;
        }
      } catch { /* non-critical */ }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone || null,
        business_name: profile.business_name || null,
        bio: profile.bio || null,
        postcode: profile.postcode?.toUpperCase() || null,
        service_radius_miles: profile.service_radius_miles,
        qualifications: profile.qualifications,
        ...(latitude !== undefined && { latitude, longitude }),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully." });
      router.refresh();
    }
  }

  function addQualification() {
    if (!newQualification.trim() || !profile) return;
    setProfile({
      ...profile,
      qualifications: [...profile.qualifications, newQualification.trim()],
    });
    setNewQualification("");
  }

  function removeQualification(index: number) {
    if (!profile) return;
    setProfile({
      ...profile,
      qualifications: profile.qualifications.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your business profile visible to AI agents and homeowners.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              This information helps AI agents describe you to homeowners.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={profile.business_name}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  placeholder="e.g. Sidwell Plumbing Services"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="07700 900123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About You</Label>
              <textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
                placeholder="Describe your experience, specialisms, and what makes you different..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Area</CardTitle>
            <CardDescription>
              Where do you operate? AI agents use this to match you with nearby homeowners.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Base Postcode</Label>
                <Input
                  id="postcode"
                  value={profile.postcode}
                  onChange={(e) => setProfile({ ...profile, postcode: e.target.value })}
                  placeholder="e.g. M1 1AA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">
                  Service Radius: {profile.service_radius_miles} miles
                </Label>
                <input
                  id="radius"
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={profile.service_radius_miles}
                  onChange={(e) =>
                    setProfile({ ...profile, service_radius_miles: parseInt(e.target.value) })
                  }
                  className="mt-2 w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 miles</span>
                  <span>100 miles</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualifications & Certifications</CardTitle>
            <CardDescription>
              List any relevant qualifications (Gas Safe, Part P, City & Guilds, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                placeholder="e.g. Gas Safe Registered"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addQualification(); }
                }}
              />
              <Button type="button" variant="outline" onClick={addQualification}>
                Add
              </Button>
            </div>
            {profile.qualifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.qualifications.map((q, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700"
                  >
                    {q}
                    <button
                      type="button"
                      onClick={() => removeQualification(i)}
                      className="ml-1 text-amber-500 hover:text-amber-700"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
          type="submit"
          disabled={saving}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save Changes</>
          )}
        </Button>
      </form>
    </div>
  );
}
