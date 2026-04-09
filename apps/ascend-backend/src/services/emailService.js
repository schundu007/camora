import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Camora <noreply@cariara.com>';

/**
 * Send a free trial granted email
 */
export async function sendTrialEmail({ to, name, days, trialEndsAt }) {
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email');
    return null;
  }

  const endDate = new Date(trialEndsAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://camora.cariara.com/camora-logo.png" alt="Camora" width="48" height="48" style="border-radius:12px;">
    </div>

    <!-- Card -->
    <div style="background:#111111;border:1px solid #222;border-radius:16px;padding:36px 32px;">

      <!-- Greeting -->
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px;">
        You've been granted free access!
      </h1>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hi ${name || 'there'},
      </p>

      <!-- Trial details -->
      <div style="background:#10b98120;border:1px solid #10b98140;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#10b981;font-size:14px;font-weight:600;margin:0 0 4px;">
          ${days}-Day Full Access Trial
        </p>
        <p style="color:#6ee7b7;font-size:13px;margin:0;">
          Valid until ${endDate}
        </p>
      </div>

      <p style="color:#d1d5db;font-size:15px;line-height:1.7;margin:0 0 24px;">
        You now have full access to everything on Camora — solve coding problems with AI explanations,
        practice system design, do mock interviews, and prepare with company-specific questions.
      </p>

      <!-- What you can do -->
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">What's included:</p>
      <ul style="color:#d1d5db;font-size:14px;line-height:2;margin:0 0 28px;padding-left:20px;">
        <li>Unlimited AI-powered coding solutions</li>
        <li>System design practice with diagrams</li>
        <li>Company-specific interview prep</li>
        <li>Behavioral interview coaching</li>
        <li>Live interview assistant (Lumora)</li>
      </ul>

      <!-- CTA -->
      <a href="https://camora.cariara.com/capra/prepare"
         style="display:block;text-align:center;background:#10b981;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;margin-bottom:8px;">
        Start Preparing Now
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:28px;">
      <p style="color:#6b7280;font-size:12px;margin:0;">
        Apply. Prepare. Practice. Attend.
      </p>
      <p style="color:#4b5563;font-size:11px;margin:8px 0 0;">
        <a href="https://camora.cariara.com" style="color:#4b5563;text-decoration:underline;">camora.cariara.com</a>
      </p>
    </div>

  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: `You've got ${days} days of free access to Camora!`,
      html,
    });
    console.log(`[Email] Trial email sent to ${to}:`, result);
    return result;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return null;
  }
}
