import { resolveHubspotToken } from './config';

const HUBSPOT_API = 'https://api.hubapi.com';

export interface HubspotContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  company?: string | null;
  /** CRM lead status — stored on a HubSpot property for reference. */
  leadStatus?: string | null;
  /** CRM notes — stored on a HubSpot property for reference. */
  notes?: string | null;
}

export interface HubspotContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
}

export class HubspotNotConfiguredError extends Error {
  constructor() {
    super('HubSpot is not configured. Add the HubSpot Private App Token in Admin → Settings.');
    this.name = 'HubspotNotConfiguredError';
  }
}

async function hubspotFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await resolveHubspotToken();
  if (!token) throw new HubspotNotConfiguredError();

  return fetch(`${HUBSPOT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/** Split a full name into first/last for HubSpot's separate name fields. */
function splitName(name?: string | null): { firstName: string; lastName: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildProperties(input: HubspotContactInput): Record<string, string> {
  const props: Record<string, string> = { email: input.email };
  if (input.firstName != null && input.firstName !== '') props.firstname = input.firstName;
  if (input.lastName != null && input.lastName !== '') props.lastname = input.lastName;
  if (input.phone) props.phone = input.phone;
  if (input.company) props.company = input.company;
  // HubSpot has a standard "hs_lead_status" contact property.
  if (input.leadStatus) props.hs_lead_status = mapLeadStatus(input.leadStatus);
  return props;
}

/** Map our CRM statuses onto HubSpot's standard hs_lead_status values. */
function mapLeadStatus(status: string): string {
  switch (status) {
    case 'new':
      return 'NEW';
    case 'contacted':
      return 'ATTEMPTED_TO_CONTACT';
    case 'qualified':
      return 'CONNECTED';
    case 'won':
      return 'CONNECTED';
    case 'lost':
      return 'UNQUALIFIED';
    default:
      return 'NEW';
  }
}

/**
 * Create or update a HubSpot contact keyed by email.
 * Tries create first; on a 409 (already exists) it updates by email id-path.
 * A trailing note is appended as an Engagement so status/notes are visible.
 */
export async function upsertContact(input: HubspotContactInput): Promise<{ id: string }> {
  const name = splitName(`${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() || undefined);
  const properties = buildProperties({
    ...input,
    firstName: input.firstName ?? name.firstName,
    lastName: input.lastName ?? name.lastName,
  });

  // Create
  const createRes = await hubspotFetch('/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });

  if (createRes.ok) {
    const data = (await createRes.json()) as { id: string };
    await maybeAppendNote(data.id, input);
    return { id: data.id };
  }

  // Already exists -> update by email
  if (createRes.status === 409) {
    const updateRes = await hubspotFetch(
      `/crm/v3/objects/contacts/${encodeURIComponent(input.email)}?idProperty=email`,
      {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      },
    );
    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`HubSpot update failed (${updateRes.status}): ${text.slice(0, 300)}`);
    }
    const data = (await updateRes.json()) as { id: string };
    await maybeAppendNote(data.id, input);
    return { id: data.id };
  }

  const text = await createRes.text();
  throw new Error(`HubSpot create failed (${createRes.status}): ${text.slice(0, 300)}`);
}

/** Append the CRM notes as a HubSpot note engagement, best-effort. */
async function maybeAppendNote(contactId: string, input: HubspotContactInput): Promise<void> {
  if (!input.notes || !input.notes.trim()) return;
  try {
    const timestamp = new Date().toISOString();
    const res = await hubspotFetch('/crm/v3/objects/notes', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          hs_note_body: input.notes.trim(),
          hs_timestamp: timestamp,
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 },
            ],
          },
        ],
      }),
    });
    // Non-fatal: ignore note failures so the contact upsert still succeeds.
    void res;
  } catch {
    // ignore
  }
}

/** Pull up to `limit` HubSpot contacts for import into the CRM. */
export async function listContacts(limit = 100): Promise<HubspotContact[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const res = await hubspotFetch(
    `/crm/v3/objects/contacts?limit=${capped}&properties=email,firstname,lastname,phone,company`,
    { method: 'GET' },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot list failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    results?: Array<{ properties: Record<string, string | null> }>;
  };
  return (data.results ?? [])
    .map((r) => r.properties)
    .filter((p) => p.email)
    .map((p) => ({
      email: (p.email as string).trim(),
      firstName: p.firstname ?? null,
      lastName: p.lastname ?? null,
      phone: p.phone ?? null,
      company: p.company ?? null,
    }));
}
