export function isCarrierActivationError(message: string): boolean {
  return /not yet registered|activate account|register via webapp|carrier account/i.test(message);
}

export function formatShippoLabelError(message: string): {
  title: string;
  detail: string;
  actionUrl?: string;
  actionLabel?: string;
} {
  if (isCarrierActivationError(message)) {
    const carrierMatch = message.match(/\b(UPS|USPS|FedEx|DHL)\b/i);
    const carrier = carrierMatch?.[1]?.toUpperCase() || 'Carrier';
    return {
      title: `${carrier} is not activated in Shippo`,
      detail:
        `This order used a ${carrier} shipping rate at checkout, but that carrier is not connected in your Shippo account yet. Activate ${carrier} in Shippo, or click Create Shippo Label again — we will try USPS automatically.`,
      actionUrl: 'https://apps.goshippo.com/settings/carriers',
      actionLabel: 'Open Shippo carrier settings',
    };
  }

  return {
    title: 'Unable to create shipping label',
    detail: message,
  };
}

/** Prefer USPS for labels — works on Shippo test/live without extra carrier signup. */
export function sortRatesForLabelPurchase(rates: { provider: string; amount: number }[]): typeof rates {
  return [...rates].sort((a, b) => {
    const aUsps = /usps/i.test(a.provider) ? 0 : 1;
    const bUsps = /usps/i.test(b.provider) ? 0 : 1;
    if (aUsps !== bUsps) return aUsps - bUsps;
    return a.amount - b.amount;
  });
}
