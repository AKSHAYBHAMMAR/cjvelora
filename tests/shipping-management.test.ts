// @ts-ignore
global.WebSocket = class MockWebSocket {};
// @ts-ignore
globalThis.WebSocket = class MockWebSocket {};

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { OrderStatus } from '../src/types';

let VALID_STATUS_TRANSITIONS: any;
let isValidStatusTransition: any;
let mapSupabaseOrder: any;

before(async () => {
  const ordersModule = await import('../src/lib/orders');
  VALID_STATUS_TRANSITIONS = ordersModule.VALID_STATUS_TRANSITIONS;
  isValidStatusTransition = ordersModule.isValidStatusTransition;
  mapSupabaseOrder = ordersModule.mapSupabaseOrder;
});

describe('CJVELORA — Shipping Management & Logistics Architecture Suite', () => {
  // ============================================================================
  // 1. ORDER STATUS EXTENSION & STATE MACHINE TRANSITIONS
  // ============================================================================
  describe('Status Transitions & State Machine', () => {
    test('State machine contains out_for_delivery in valid transitions', () => {
      assert.ok('out_for_delivery' in VALID_STATUS_TRANSITIONS);
      assert.deepEqual(VALID_STATUS_TRANSITIONS['out_for_delivery'], ['delivered']);
    });

    test('Valid forward lifecycle transitions succeed', () => {
      assert.equal(isValidStatusTransition('pending', 'processing'), true);
      assert.equal(isValidStatusTransition('processing', 'shipped'), true);
      assert.equal(isValidStatusTransition('shipped', 'out_for_delivery'), true);
      assert.equal(isValidStatusTransition('out_for_delivery', 'delivered'), true);
      assert.equal(isValidStatusTransition('shipped', 'delivered'), true); // Fast/direct delivery
    });

    test('Identical status transition is allowed as an idempotent no-op', () => {
      assert.equal(isValidStatusTransition('shipped', 'shipped'), true);
      assert.equal(isValidStatusTransition('out_for_delivery', 'out_for_delivery'), true);
      assert.equal(isValidStatusTransition('delivered', 'delivered'), true);
    });

    test('Invalid backward transitions are strictly rejected', () => {
      assert.equal(isValidStatusTransition('delivered', 'processing'), false);
      assert.equal(isValidStatusTransition('delivered', 'shipped'), false);
      assert.equal(isValidStatusTransition('delivered', 'out_for_delivery'), false);
      assert.equal(isValidStatusTransition('shipped', 'processing'), false);
      assert.equal(isValidStatusTransition('out_for_delivery', 'processing'), false);
      assert.equal(isValidStatusTransition('out_for_delivery', 'shipped'), false);
    });

    test('Terminal states (delivered, cancelled, refunded) cannot transition to processing or shipped', () => {
      assert.equal(isValidStatusTransition('cancelled', 'processing'), false);
      assert.equal(isValidStatusTransition('cancelled', 'shipped'), false);
      assert.equal(isValidStatusTransition('refunded', 'processing'), false);
      assert.equal(isValidStatusTransition('refunded', 'shipped'), false);
      assert.equal(isValidStatusTransition('delivered', 'processing'), false);
    });
  });

  // ============================================================================
  // 2. PAYMENT SAFETY: Disallow Shipping Updates for Unpaid Orders
  // ============================================================================
  describe('Payment Safety Guard', () => {
    function simulateShippingStatusUpdate(order: { payment_status: string; order_status: OrderStatus }, targetStatus: OrderStatus) {
      const isDispatchState =
        targetStatus === 'shipped' ||
        targetStatus === 'out_for_delivery' ||
        targetStatus === 'delivered';

      if (isDispatchState && order.payment_status !== 'paid') {
        return {
          allowed: false,
          error: `Shipping cannot be updated because payment is not confirmed (Current payment status: "${order.payment_status}").`,
        };
      }

      if (!isValidStatusTransition(order.order_status, targetStatus)) {
        return {
          allowed: false,
          error: `Illegal status transition: cannot transition order from "${order.order_status}" to "${targetStatus}".`,
        };
      }

      return { allowed: true };
    }

    test('Rejects transition to shipped if payment_status is pending', () => {
      const order = { payment_status: 'pending', order_status: 'processing' as OrderStatus };
      const res = simulateShippingStatusUpdate(order, 'shipped');
      assert.equal(res.allowed, false);
      assert.match(res.error!, /payment is not confirmed/);
    });

    test('Rejects transition to shipped if payment_status is failed', () => {
      const order = { payment_status: 'failed', order_status: 'processing' as OrderStatus };
      const res = simulateShippingStatusUpdate(order, 'shipped');
      assert.equal(res.allowed, false);
      assert.match(res.error!, /payment is not confirmed/);
    });

    test('Allows transition to shipped when payment_status is paid', () => {
      const order = { payment_status: 'paid', order_status: 'processing' as OrderStatus };
      const res = simulateShippingStatusUpdate(order, 'shipped');
      assert.equal(res.allowed, true);
    });

    test('Allows transition to out_for_delivery when payment_status is paid', () => {
      const order = { payment_status: 'paid', order_status: 'shipped' as OrderStatus };
      const res = simulateShippingStatusUpdate(order, 'out_for_delivery');
      assert.equal(res.allowed, true);
    });

    test('Allows transition to delivered when payment_status is paid', () => {
      const order = { payment_status: 'paid', order_status: 'out_for_delivery' as OrderStatus };
      const res = simulateShippingStatusUpdate(order, 'delivered');
      assert.equal(res.allowed, true);
    });
  });

  // ============================================================================
  // 3. TRACKING URL VALIDATION
  // ============================================================================
  describe('Tracking URL Validation', () => {
    function validateTrackingUrl(url: string | null | undefined): boolean {
      if (!url) return true; // Optional field
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }

    test('Accepts valid HTTPS carrier tracking URLs', () => {
      assert.equal(validateTrackingUrl('https://www.delhivery.com/track/package/123456789'), true);
      assert.equal(validateTrackingUrl('https://www.bluedart.com/tracking?awb=987654321'), true);
      assert.equal(validateTrackingUrl('https://track.fedex.com/track/12345'), true);
    });

    test('Rejects invalid, non-web, or malformed URLs', () => {
      assert.equal(validateTrackingUrl('javascript:alert(1)'), false);
      assert.equal(validateTrackingUrl('not-a-valid-url'), false);
      assert.equal(validateTrackingUrl('ftp://invalidscheme.com/file'), false);
    });

    test('Allows null, undefined, or empty string (optional field)', () => {
      assert.equal(validateTrackingUrl(null), true);
      assert.equal(validateTrackingUrl(undefined), true);
      assert.equal(validateTrackingUrl(''), true);
    });
  });

  // ============================================================================
  // 4. MAP SUPABASE ORDER: Normalizing Shipping & Tracking Fields
  // ============================================================================
  describe('Supabase Order Mapping with Shipping Fields', () => {
    test('Correctly maps all 6 shipping fields from database row to AdminOrder', () => {
      const mockRow = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        order_number: 'VEL-20261001-TEST01',
        created_at: '2026-10-01T12:00:00Z',
        order_status: 'shipped',
        payment_status: 'paid',
        payment_method: 'razorpay',
        customer_name: 'Aditi Sharma',
        customer_email: 'aditi@example.com',
        shipping_provider: 'Delhivery',
        shipping_tracking_number: 'DEL123456789',
        shipping_tracking_url: 'https://www.delhivery.com/track/package/DEL123456789',
        shipping_dispatched_at: '2026-10-01T14:30:00Z',
        shipping_estimated_delivery: '2026-10-04',
        shipping_notes: 'Artisan gift wrap included.',
        subtotal: 5500,
        total_amount: 5500,
      };

      const mapped = mapSupabaseOrder(mockRow);

      assert.equal(mapped.shippingProvider, 'Delhivery');
      assert.equal(mapped.shippingTrackingNumber, 'DEL123456789');
      assert.equal(mapped.shippingTrackingUrl, 'https://www.delhivery.com/track/package/DEL123456789');
      assert.equal(mapped.shippingDispatchedAt, '2026-10-01T14:30:00Z');
      assert.equal(mapped.shippingEstimatedDelivery, '2026-10-04');
      assert.equal(mapped.shippingNotes, 'Artisan gift wrap included.');
      assert.equal(mapped.orderStatus, 'shipped');
      assert.equal(mapped.paymentStatus, 'paid');
    });

    test('Omits missing shipping fields cleanly without throwing or rendering dummy text', () => {
      const mockRow = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e',
        order_number: 'VEL-20261001-TEST02',
        created_at: '2026-10-01T12:00:00Z',
        order_status: 'processing',
        payment_status: 'paid',
        total_amount: 3200,
      };

      const mapped = mapSupabaseOrder(mockRow);

      assert.equal(mapped.shippingProvider, undefined);
      assert.equal(mapped.shippingTrackingNumber, undefined);
      assert.equal(mapped.shippingTrackingUrl, undefined);
      assert.equal(mapped.shippingDispatchedAt, undefined);
      assert.equal(mapped.shippingEstimatedDelivery, undefined);
      assert.equal(mapped.shippingNotes, undefined);
    });
  });

  // ============================================================================
  // 5. CANCELLATION GUARD: Disallowing Shipped & Out for Delivery Cancellation
  // ============================================================================
  describe('Customer Cancellation Guard', () => {
    function canCustomerCancelOrder(orderStatus: OrderStatus, paymentStatus: string): boolean {
      if (paymentStatus === 'paid' || paymentStatus === 'refunded') return false;
      if (orderStatus === 'shipped' || orderStatus === 'out_for_delivery' || orderStatus === 'delivered' || orderStatus === 'cancelled') {
        return false;
      }
      return orderStatus === 'pending' && (paymentStatus === 'pending' || paymentStatus === 'failed');
    }

    test('Customer can cancel unpaid pending orders', () => {
      assert.equal(canCustomerCancelOrder('pending', 'pending'), true);
      assert.equal(canCustomerCancelOrder('pending', 'failed'), true);
    });

    test('Customer CANNOT cancel orders that are shipped or out for delivery', () => {
      assert.equal(canCustomerCancelOrder('shipped', 'pending'), false);
      assert.equal(canCustomerCancelOrder('out_for_delivery', 'pending'), false);
      assert.equal(canCustomerCancelOrder('shipped', 'paid'), false);
      assert.equal(canCustomerCancelOrder('out_for_delivery', 'paid'), false);
    });
  });
});
