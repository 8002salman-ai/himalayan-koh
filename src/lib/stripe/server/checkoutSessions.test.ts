import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  status: 'pending' as 'pending' | 'processing' | 'paid' | 'failed',
  paymentIntentId: 'pi_test_123',
  orderId: null as string | null,
  serverCreateOrderCalls: 0,
};

const sessionData = {
  email: 'buyer@example.com',
  shippingAddress: {
    fullName: 'Test Buyer',
    addressLine1: '1 Test Street',
    city: 'Houston',
    state: 'TX',
    postalCode: '77001',
    country: 'US',
  },
  cartSessionId: 'sess_test',
};

vi.mock('./supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const chain: any = {};
      let operation: 'select' | 'update' | null = null;
      let isClaim = false;
      let isFinalUpdate = false;

      chain.select = () => {
        if (operation !== 'update') operation = 'select';
        return chain;
      };
      chain.update = () => {
        operation = 'update';
        return chain;
      };
      chain.eq = (_column: string, value: string) => {
        if (operation === 'update' && value === 'processing') isFinalUpdate = true;
        return chain;
      };
      chain.in = () => {
        isClaim = true;
        return chain;
      };
      chain.maybeSingle = async () => {
        if (operation === 'select') {
          return {
            data: {
              id: 'checkout-1',
              status: state.status,
              payment_intent_id: state.paymentIntentId,
              order_id: state.orderId,
              checkout_data: sessionData,
              cart_fingerprint: 'product-1:1',
            },
            error: null,
          };
        }
        if (isClaim) {
          if (state.status !== 'pending' && state.status !== 'failed') return { data: null, error: null };
          state.status = 'processing';
          return {
            data: {
              id: 'checkout-1',
              status: 'processing',
              payment_intent_id: state.paymentIntentId,
              order_id: null,
              checkout_data: sessionData,
              cart_fingerprint: 'product-1:1',
            },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      chain.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => {
        if (operation === 'update' && isFinalUpdate) {
          state.status = 'paid';
          state.orderId = 'order-1';
        }
        return Promise.resolve({ error: null }).then(resolve, reject);
      };
      return chain;
    },
  }),
}));

vi.mock('@/lib/orders/serverCreateOrder', () => ({
  serverCreateOrder: vi.fn(async () => {
    state.serverCreateOrderCalls += 1;
    return { id: 'order-1' };
  }),
}));

import { finalizeCheckoutSession, shouldFinalizeSuccessfulPayment } from './checkoutSessions';

describe('Stripe checkout finalization', () => {
  beforeEach(() => {
    state.status = 'pending';
    state.orderId = null;
    state.serverCreateOrderCalls = 0;
  });

  it('does not create an order for a failed payment', () => {
    expect(shouldFinalizeSuccessfulPayment('payment_intent.payment_failed')).toBe(false);
    expect(state.serverCreateOrderCalls).toBe(0);
  });

  it('creates exactly one order after a successful payment', async () => {
    state.status = 'pending';
    const result = await finalizeCheckoutSession('checkout-1', 'pi_test_123');
    expect(result.order?.id).toBe('order-1');
    expect(state.serverCreateOrderCalls).toBe(1);
  });

  it('does not create a duplicate order for a duplicate webhook', async () => {
    state.status = 'paid';
    state.orderId = 'order-1';
    const result = await finalizeCheckoutSession('checkout-1', 'pi_test_123');
    expect(result).toEqual({ order: null, alreadyFinalized: true });
    expect(state.serverCreateOrderCalls).toBe(0);
  });
});
