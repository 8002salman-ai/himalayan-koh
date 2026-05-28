export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export function toPaymentError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
