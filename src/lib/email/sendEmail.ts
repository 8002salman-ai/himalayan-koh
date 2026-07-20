interface SendEmailAttachment {
  filename: string;
  /** Raw PDF (or other) bytes — base64-encoded before sending to Resend. */
  content: Buffer;
}

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: SendEmailAttachment[];
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email:', input.subject);
    return false;
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    'Himalayan Koh <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString('base64'),
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('Email send failed:', response.status, body);
    return false;
  }

  return true;
}

export function adminNotificationEmails(): string[] {
  const raw =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SHIPPO_FROM_EMAIL ||
    'sales@himalayankoh.com';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://himalayankoh.com'
  );
}
