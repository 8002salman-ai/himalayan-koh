import type { DealerApplication } from '@/lib/supabase/database.types';

export async function updateDealerApplicationStatus(
  accessToken: string,
  params: {
    applicationId: string;
    status: DealerApplication['status'];
    reason?: string;
  }
): Promise<void> {
  const response = await fetch('/api/admin/dealer/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Unable to update dealer application status.');
  }
}
