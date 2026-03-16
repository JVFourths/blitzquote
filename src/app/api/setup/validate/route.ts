import { NextResponse } from "next/server";
import { isSetupComplete } from "@/lib/setup/guard";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Resend } from "resend";

/**
 * POST /api/setup/validate
 * Validates third-party service keys without persisting them.
 *
 * Body: { step: "supabase" | "stripe" | "resend", keys: Record<string, string> }
 * Returns: { valid: boolean, message: string, details?: string[] }
 */
export async function POST(request: Request) {
  // Block if setup already complete
  if (await isSetupComplete()) {
    return NextResponse.json({ error: "Setup is already complete." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { step, keys } = body;

    if (!step || !keys) {
      return NextResponse.json(
        { valid: false, message: "Missing step or keys in request body." },
        { status: 400 }
      );
    }

    switch (step) {
      case "supabase":
        return await validateSupabase(keys);
      case "stripe":
        return await validateStripe(keys);
      case "resend":
        return await validateResend(keys);
      default:
        return NextResponse.json(
          { valid: false, message: `Unknown step: ${step}` },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { valid: false, message: "Invalid request." },
      { status: 400 }
    );
  }
}

async function validateSupabase(keys: Record<string, string>) {
  const url = keys.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = keys.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = keys.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({
      valid: false,
      message: "All three Supabase values are required.",
      details: [
        !url ? "Missing: Project URL" : null,
        !anonKey ? "Missing: Anon Key" : null,
        !serviceKey ? "Missing: Service Role Key" : null,
      ].filter(Boolean),
    });
  }

  // Pattern checks
  if (!url.includes(".supabase.co")) {
    return NextResponse.json({
      valid: false,
      message: "That URL doesn't look right. It should end with .supabase.co — check for extra characters or spaces.",
    });
  }

  if (!anonKey.startsWith("eyJ")) {
    return NextResponse.json({
      valid: false,
      message: "The Anon Key should start with 'eyJ'. Make sure you copied the right value from Supabase Settings → API.",
    });
  }

  if (!serviceKey.startsWith("eyJ")) {
    return NextResponse.json({
      valid: false,
      message: "The Service Role Key should start with 'eyJ'. Make sure you copied the right value from Supabase Settings → API.",
    });
  }

  if (anonKey === serviceKey) {
    return NextResponse.json({
      valid: false,
      message: "The Anon Key and Service Role Key are the same. These should be two different values — check your Supabase API settings.",
    });
  }

  // Try connecting
  try {
    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      // Table doesn't exist = SQL hasn't been run yet
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json({
          valid: false,
          message: "Database tables not found. Go back to Step 2 and make sure you ran the SQL in your Supabase SQL Editor.",
          details: [
            "Open your Supabase Dashboard",
            "Go to SQL Editor",
            "Paste the SQL from Step 2 and click Run",
          ],
        });
      }

      return NextResponse.json({
        valid: false,
        message: "Connected to Supabase but got an error. It looks like you may have swapped the two keys. The Anon Key goes in the first field, the Service Role Key in the second.",
        details: [error.message],
      });
    }

    return NextResponse.json({
      valid: true,
      message: "Connected to your database! Tables are set up correctly.",
      details: [
        "Database connection working",
        "Tables created",
        "Security rules applied",
      ],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("ENOTFOUND")) {
      return NextResponse.json({
        valid: false,
        message: "We couldn't reach Supabase. This usually means the URL has a typo, or Supabase is temporarily down. Double-check and try again in a minute.",
      });
    }

    if (errorMsg.includes("503")) {
      return NextResponse.json({
        valid: false,
        message: "Your Supabase project has been paused due to inactivity. Go to your Supabase dashboard and click 'Restore project.' This takes about 2 minutes.",
      });
    }

    return NextResponse.json({
      valid: false,
      message: "Something went wrong connecting to Supabase.",
      details: [errorMsg],
    });
  }
}

async function validateStripe(keys: Record<string, string>) {
  const secretKey = keys.STRIPE_SECRET_KEY;
  const publishableKey = keys.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    return NextResponse.json({
      valid: false,
      message: "Stripe Secret Key is required.",
    });
  }

  // Pattern checks
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
    return NextResponse.json({
      valid: false,
      message: "That doesn't look like a Stripe Secret Key. It should start with 'sk_test_' or 'sk_live_'. Make sure you copied the Secret Key, not the Publishable Key.",
    });
  }

  if (publishableKey && !publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
    return NextResponse.json({
      valid: false,
      message: "The Publishable Key should start with 'pk_test_' or 'pk_live_'.",
    });
  }

  // Check if test vs live keys are mixed
  if (publishableKey) {
    const secretIsTest = secretKey.startsWith("sk_test_");
    const pubIsTest = publishableKey.startsWith("pk_test_");
    if (secretIsTest !== pubIsTest) {
      return NextResponse.json({
        valid: false,
        message: "Your keys are mismatched — one is a test key and the other is a live key. Both should be either test or live.",
      });
    }
  }

  try {
    const stripe = new Stripe(secretKey);
    await stripe.accounts.retrieve();

    const isTest = secretKey.startsWith("sk_test_");

    return NextResponse.json({
      valid: true,
      message: `Stripe connected successfully. You're in ${isTest ? "test" : "live"} mode.${isTest ? " That's fine for setup — switch to live keys when you're ready for real payments." : ""}`,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      valid: false,
      message: "That Stripe key was rejected. Make sure you copied the full key from Stripe Dashboard → Developers → API Keys.",
      details: [errorMsg],
    });
  }
}

async function validateResend(keys: Record<string, string>) {
  const apiKey = keys.RESEND_API_KEY;
  const testEmail = keys.test_email;

  if (!apiKey) {
    return NextResponse.json({
      valid: false,
      message: "Resend API Key is required.",
    });
  }

  if (!apiKey.startsWith("re_")) {
    return NextResponse.json({
      valid: false,
      message: "That doesn't look like a Resend API Key. It should start with 're_'.",
    });
  }

  try {
    const resend = new Resend(apiKey);

    if (testEmail) {
      await resend.emails.send({
        from: "BlitzQuote Setup <onboarding@resend.dev>",
        to: testEmail,
        subject: "BlitzQuote — Test Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #f59e0b;">BlitzQuote Setup</h2>
            <p>If you're reading this, your email is working!</p>
            <p style="color: #888; font-size: 12px;">You can close this email and go back to the setup wizard.</p>
          </div>
        `,
      });

      return NextResponse.json({
        valid: true,
        message: `Test email sent to ${testEmail}. Check your inbox (and spam folder).`,
      });
    }

    // Just validate the key without sending
    await resend.emails.send({
      from: "BlitzQuote Setup <onboarding@resend.dev>",
      to: "test@resend.dev",
      subject: "Key validation",
      html: "test",
    });

    return NextResponse.json({
      valid: true,
      message: "Resend API key is valid.",
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      valid: false,
      message: "That Resend key didn't work. Make sure you copied the full key from Resend Dashboard → API Keys.",
      details: [errorMsg],
    });
  }
}
