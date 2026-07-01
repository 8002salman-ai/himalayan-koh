import { sendEmail, siteBaseUrl } from './sendEmail';
import type { DealerApplication } from '@/lib/supabase/database.types';

const statusCopy: Record<DealerApplication['status'], { subject: string; heading: string; body: string }> = {
  pending: {
    subject: 'Dealer application received',
    heading: 'Application received',
    body: 'Thanks for applying to become a Himalayan Koh dealer. Our team is reviewing your submission.',
  },
  under_review: {
    subject: 'Your dealer application is under review',
    heading: 'Application under review',
    body: 'Your dealer application is now being reviewed by our team. We will follow up shortly.',
  },
  need_more_info: {
    subject: 'Additional information needed for your dealer application',
    heading: 'More information needed',
    body: 'We need a bit more information to continue reviewing your dealer application. Please sign in to your dealer portal to see what is required.',
  },
  approved: {
    subject: 'Your Himalayan Koh dealer application was approved',
    heading: "You're approved!",
    body: 'Congratulations — your dealer account is now active. Sign in to your dealer portal to view dealer pricing and place orders.',
  },
  rejected: {
    subject: 'Update on your dealer application',
    heading: 'Application update',
    body: 'After review, we are unable to approve your dealer application at this time.',
  },
  suspended: {
    subject: 'Your dealer account has been suspended',
    heading: 'Account suspended',
    body: 'Your dealer account has been temporarily suspended. Please contact our support team for details.',
  },
};

export async function sendDealerStatusEmail(params: {
  to: string;
  status: DealerApplication['status'];
  reason?: string | null;
}): Promise<{ subject: string } | null> {
  const copy = statusCopy[params.status];
  if (!copy) return null;

  const sent = await sendEmail({
    to: params.to,
    subject: copy.subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h1 style="color:#b86452">Himalayan Koh Dealer Program</h1>
        <h2>${copy.heading}</h2>
        <p>${copy.body}</p>
        ${params.reason ? `<p><strong>Note from our team:</strong> ${params.reason}</p>` : ''}
        <p style="margin-top:24px">
          <a href="${siteBaseUrl()}/dealer/login" style="background:#b86452;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Go to Dealer Portal
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:24px">12620 FM 1960 W Ste A-4, Houston, TX 77065 · (832) 224-6466</p>
      </div>
    `,
  });

  return sent ? { subject: copy.subject } : null;
}
