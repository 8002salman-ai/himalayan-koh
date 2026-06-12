export interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippoParcelInput {
  /** Billable weight: max(actual weight, dimensional weight). Sent to Shippo. */
  weightLbs: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  /** Actual product weight before DIM comparison (for logging/reference). */
  actualWeightLbs?: number;
  /** Dimensional weight = L × W × H / DIM_DIVISOR (for logging/reference). */
  dimWeightLbs?: number;
}

export interface ShippoRate {
  objectId: string;
  amount: number;
  currency: string;
  provider: string;
  serviceName: string;
  estimatedDays: number | null;
}

export interface ShippoLabelResult {
  transactionId: string;
  trackingNumber: string;
  labelUrl: string;
  trackingUrl: string | null;
  carrier: string;
  serviceName: string;
}

export interface CheckoutShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface RatesLineItem {
  productId?: string;
  quantity: number;
  weightLbs?: number;
}
