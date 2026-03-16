import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "BlitzQuote <noreply@blitzquote.co.uk>";

interface BookingDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  jobDescription: string;
  postcode: string | null;
  slotStart: string;
  slotEnd: string;
  source: string;
  bookingId: string;
}

/**
 * Notify the tradesperson about a new booking.
 */
export async function notifyTradesperson(
  tradespersonEmail: string,
  tradespersonName: string,
  booking: BookingDetails
) {
  if (!resend) {
    console.log("[Email] Resend not configured — skipping tradesperson notification");
    console.log("[Email] Would notify:", tradespersonEmail, "about booking", booking.bookingId);
    return;
  }

  const slotDate = new Date(booking.slotStart).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const slotTime = `${new Date(booking.slotStart).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${new Date(booking.slotEnd).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: tradespersonEmail,
      subject: `New booking request from ${booking.customerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #f59e0b, #ea580c); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Booking Request</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi ${tradespersonName},</p>
            <p>You have a new booking request${booking.source !== "api" && booking.source !== "direct" ? ` via <strong>${booking.source}</strong>` : ""}!</p>

            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Customer:</strong> ${booking.customerName}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${booking.customerEmail}</p>
              ${booking.customerPhone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${booking.customerPhone}</p>` : ""}
              <p style="margin: 4px 0;"><strong>Job:</strong> ${booking.jobDescription}</p>
              ${booking.postcode ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.postcode}</p>` : ""}
              <p style="margin: 4px 0;"><strong>Date:</strong> ${slotDate}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${slotTime}</p>
            </div>

            <p>Log in to your dashboard to confirm or decline this booking.</p>

            <a href="https://blitzquote.co.uk/dashboard/bookings"
               style="display: inline-block; background: linear-gradient(to right, #f59e0b, #ea580c); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              View Booking
            </a>

            <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
              BlitzQuote — Quotes at the speed of AI.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] Failed to notify tradesperson:", err);
  }
}

/**
 * Send booking confirmation to the customer.
 */
export async function confirmToCustomer(
  tradespersonName: string,
  booking: BookingDetails
) {
  if (!resend) {
    console.log("[Email] Resend not configured — skipping customer confirmation");
    console.log("[Email] Would confirm to:", booking.customerEmail, "for booking", booking.bookingId);
    return;
  }

  const slotDate = new Date(booking.slotStart).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const slotTime = `${new Date(booking.slotStart).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${new Date(booking.slotEnd).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: booking.customerEmail,
      subject: `Booking request sent to ${tradespersonName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #f59e0b, #ea580c); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmation</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi ${booking.customerName},</p>
            <p>Your booking request has been sent to <strong>${tradespersonName}</strong>. They'll confirm shortly.</p>

            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Tradesperson:</strong> ${tradespersonName}</p>
              <p style="margin: 4px 0;"><strong>Job:</strong> ${booking.jobDescription}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${slotDate}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${slotTime}</p>
              <p style="margin: 4px 0;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
            </div>

            <p>You'll receive another email once the tradesperson confirms your booking.</p>

            <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
              BlitzQuote — Quotes at the speed of AI.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] Failed to confirm to customer:", err);
  }
}

/**
 * Notify customer when booking status changes.
 */
export async function notifyStatusChange(
  customerEmail: string,
  customerName: string,
  tradespersonName: string,
  bookingId: string,
  newStatus: string
) {
  if (!resend) {
    console.log("[Email] Resend not configured — skipping status change notification");
    return;
  }

  const statusMessages: Record<string, { subject: string; message: string }> = {
    confirmed: {
      subject: `Booking confirmed by ${tradespersonName}`,
      message: `Great news! ${tradespersonName} has confirmed your booking. They'll be in touch about the job details.`,
    },
    cancelled: {
      subject: `Booking cancelled by ${tradespersonName}`,
      message: `Unfortunately, ${tradespersonName} was unable to take this booking. We recommend searching for another tradesperson on BlitzQuote.`,
    },
    completed: {
      subject: `Job completed with ${tradespersonName}`,
      message: `Your job with ${tradespersonName} has been marked as complete. Thank you for using BlitzQuote!`,
    },
  };

  const content = statusMessages[newStatus];
  if (!content) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: content.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #f59e0b, #ea580c); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Booking Update</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi ${customerName},</p>
            <p>${content.message}</p>
            <p style="color: #6b7280; font-size: 14px;">Booking ID: ${bookingId}</p>
            <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
              BlitzQuote — Quotes at the speed of AI.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] Failed to send status change notification:", err);
  }
}
