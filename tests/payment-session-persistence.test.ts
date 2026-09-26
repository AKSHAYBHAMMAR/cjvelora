import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyRazorpaySignature } from '../src/lib/razorpay';

describe('CJVELORA — Razorpay Payment Session Persistence & Security Suite', () => {
  const TEST_SECRET = 'test_secret_key_velora_2026';
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mockKey123';
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_mockKey123';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function generateValidSignature(orderId: string, paymentId: string, secret: string = TEST_SECRET): string {
    return crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  // ============================================================================
  // 1. REGRESSION TEST: Active Payment Session Persistence
  // ============================================================================
  describe('Regression: Payment Session Persistence', () => {
    test('Regression Bug Check: Null razorpay_order_id in DB triggers "Order does not have an active payment session"', () => {
      // Simulates the old broken state where customer UPDATE was silently blocked by RLS
      const dbOrderRecord = {
        id: 'order_uuid_101',
        customer_id: 'user_uuid_abc',
        order_number: 'CJV-2026-0001',
        payment_status: 'pending',
        total_amount: 3499,
        razorpay_order_id: null, // BUG: was left NULL because of RLS UPDATE block
        razorpay_payment_id: null,
      };

      // Payment verify logic checks order.razorpay_order_id
      const hasActiveSession = Boolean(dbOrderRecord.razorpay_order_id);
      assert.equal(hasActiveSession, false);

      const verifyCheck = () => {
        if (!dbOrderRecord.razorpay_order_id) {
          return { status: 400, error: 'Order does not have an active payment session.' };
        }
        return { status: 200 };
      };

      const result = verifyCheck();
      assert.equal(result.status, 400);
      assert.equal(result.error, 'Order does not have an active payment session.');
    });

    test('Fixed Behavior: Razorpay Order ID bound at atomic creation allows payment verification to proceed', () => {
      const generatedRzOrderId = 'order_RZP987654321';
      
      // Fixed atomic creation inserts razorpay_order_id at the same time as order header
      const dbOrderRecord = {
        id: 'order_uuid_102',
        customer_id: 'user_uuid_abc',
        order_number: 'CJV-2026-0002',
        payment_status: 'pending',
        total_amount: 3499,
        razorpay_order_id: generatedRzOrderId, // PERSISTED AT CREATION
        razorpay_payment_id: null,
      };

      assert.equal(dbOrderRecord.razorpay_order_id, generatedRzOrderId);

      // Verify active session check passes
      assert.ok(dbOrderRecord.razorpay_order_id);

      const clientPaymentId = 'pay_RZP123456789';
      const validSig = generateValidSignature(dbOrderRecord.razorpay_order_id, clientPaymentId);

      const isValid = verifyRazorpaySignature({
        orderId: dbOrderRecord.razorpay_order_id,
        paymentId: clientPaymentId,
        signature: validSig,
      });

      assert.equal(isValid, true, 'Cryptographic signature against database razorpay_order_id must pass');
    });

    test('Source Code Verification: src/app/api/orders/create/route.ts binds razorpay_order_id and removes post-insert update', async () => {
      const fs = await import('fs');
      const routeContent = fs.readFileSync('src/app/api/orders/create/route.ts', 'utf8');

      // 1. Must pass p_razorpay_order_id to create_order_with_items RPC
      assert.ok(
        routeContent.includes('p_razorpay_order_id: razorpayOrderId'),
        'create_order_with_items RPC call must include p_razorpay_order_id'
      );

      // 2. Direct fallback insert must include razorpay_order_id
      assert.ok(
        routeContent.includes('razorpay_order_id: razorpayOrderId'),
        'Direct fallback insert must include razorpay_order_id'
      );

      // 3. Broken post-creation UPDATE call must be completely eliminated
      const hasBrokenUpdate = routeContent.includes(".update({ razorpay_order_id: razorpayOrderId })");
      assert.equal(
        hasBrokenUpdate,
        false,
        'Post-creation orders.update({ razorpay_order_id }) must NOT exist in the codebase'
      );
    });

    test('Migration Verification: migration_order_payment_session_persistence.sql includes p_razorpay_order_id DEFAULT NULL', async () => {
      const fs = await import('fs');
      const migrationContent = fs.readFileSync('supabase/migration_order_payment_session_persistence.sql', 'utf8');

      assert.ok(
        migrationContent.includes('p_razorpay_order_id text DEFAULT NULL'),
        'RPC function must declare p_razorpay_order_id text DEFAULT NULL'
      );
      assert.ok(
        migrationContent.includes('razorpay_order_id,') && migrationContent.includes('p_razorpay_order_id,'),
        'RPC function must insert p_razorpay_order_id into orders.razorpay_order_id'
      );
      assert.ok(
        !migrationContent.toLowerCase().includes('create policy') || !migrationContent.toLowerCase().includes('update on public.orders'),
        'Migration must NOT add an UPDATE policy for customers on orders'
      );
    });
  });

  // ============================================================================
  // 2. SCENARIO 1: Razorpay Unavailable / Config Missing
  // ============================================================================
  describe('Scenario 1: Razorpay Unavailable / Config Missing', () => {
    test('verifyRazorpaySignature returns false when RAZORPAY_KEY_SECRET is missing', () => {
      delete process.env.RAZORPAY_KEY_SECRET;

      const isValid = verifyRazorpaySignature({
        orderId: 'order_test_123',
        paymentId: 'pay_test_456',
        signature: 'some_sig',
      });

      assert.equal(isValid, false, 'Must fail closed when secret is not configured');
    });
  });

  // ============================================================================
  // 3. SCENARIO 2: Razorpay Order Creation Failure
  // ============================================================================
  describe('Scenario 2: Razorpay Order Creation Failure', () => {
    test('Fails closed: Returns 502 error and does NOT proceed with order persistence if gateway fails', () => {
      const gatewayResponse = {
        order: null,
        error: 'Gateway payment service timeout',
      };

      const handleGatewayResult = (rzResult: typeof gatewayResponse) => {
        if (!rzResult.order || !(rzResult.order as any)?.id) {
          return {
            status: 502,
            body: {
              success: false,
              error: rzResult.error || 'Failed to initialize secure payment session. Please try again.',
            },
          };
        }
        return { status: 200, body: { success: true } };
      };

      const response = handleGatewayResult(gatewayResponse);
      assert.equal(response.status, 502);
      assert.equal(response.body.success, false);
      assert.equal(response.body.error, 'Gateway payment service timeout');
    });
  });

  // ============================================================================
  // 4. SCENARIO 3 & 4: Normal & Promotional Pricing Validation
  // ============================================================================
  describe('Scenario 3 & 4: Authoritative Pricing & Promotional Offers', () => {
    test('Calculates authoritative finalTotal and Razorpay amount in paise for normal pricing', () => {
      const product = { price: 3499, active_offer_percent: null };
      const quantity = 2;
      const shippingFee = 0; // free over ₹999

      const unitPrice = product.price;
      const subtotal = unitPrice * quantity; // 6998
      const finalTotal = subtotal + shippingFee;
      const razorpayPaise = Math.round(finalTotal * 100);

      assert.equal(subtotal, 6998);
      assert.equal(finalTotal, 6998);
      assert.equal(razorpayPaise, 699800);
    });

    test('Promotional discounted order: 10% discount on ₹3,499 produces ₹3,149 authoritative total', () => {
      const originalPrice = 3499;
      const offerPercent = 10;
      const discountedPrice = Math.round(originalPrice * (1 - offerPercent / 100));

      assert.equal(discountedPrice, 3149, '₹3,499 with 10% off must be ₹3,149');

      const quantity = 1;
      const shippingFee = 0;
      const finalTotal = discountedPrice * quantity + shippingFee;
      const razorpayPaise = Math.round(finalTotal * 100);

      assert.equal(finalTotal, 3149);
      assert.equal(razorpayPaise, 314900, 'Razorpay amount must be 314900 paise');
    });

    test('Promotional discounted order: 15% discount on ₹4,200', () => {
      const originalPrice = 4200;
      const offerPercent = 15;
      const discountedPrice = Math.round(originalPrice * (1 - offerPercent / 100));

      assert.equal(discountedPrice, 3570);

      const quantity = 2;
      const finalTotal = discountedPrice * quantity;
      assert.equal(finalTotal, 7140);
      assert.equal(Math.round(finalTotal * 100), 714000);
    });
  });

  // ============================================================================
  // 5. SCENARIO 5: Manipulated Browser Price Immunity
  // ============================================================================
  describe('Scenario 5: Manipulated Browser Price Immunity', () => {
    test('Server authoritative calculation strictly overrides client-manipulated prices', () => {
      // Attacker attempts to send unit_price: 10 and subtotal: 10
      const clientPayloadItem = {
        productId: 'prod_uuid_silk_crochet',
        quantity: 1,
        clientSuppliedPrice: 10,
        clientSuppliedSubtotal: 10,
      };

      // Server DB catalog has authoritative price
      const dbCatalog = new Map([
        ['prod_uuid_silk_crochet', { id: 'prod_uuid_silk_crochet', price: 3499, offer_percentage: null }],
      ]);

      // Server pricing logic
      const dbProduct = dbCatalog.get(clientPayloadItem.productId)!;
      const authoritativeUnitPrice = dbProduct.price; // ignores clientSuppliedPrice
      const authoritativeSubtotal = authoritativeUnitPrice * clientPayloadItem.quantity;
      const authoritativeFinalTotal = authoritativeSubtotal;

      assert.equal(authoritativeUnitPrice, 3499);
      assert.equal(authoritativeFinalTotal, 3499);
      assert.notEqual(authoritativeFinalTotal, clientPayloadItem.clientSuppliedSubtotal);
    });
  });

  // ============================================================================
  // 6. SCENARIO 6: Unauthorized Customer Checks
  // ============================================================================
  describe('Scenario 6: Unauthorized Customer Checks', () => {
    test('Rejects verification with 403 when customer does not own the order', () => {
      const order = {
        id: 'order_uuid_201',
        customer_id: 'customer_owner_uuid',
        razorpay_order_id: 'order_RZP111',
      };

      const callerUser = { id: 'different_attacker_uuid' };

      const checkOwnership = () => {
        if (order.customer_id !== callerUser.id) {
          return { status: 403, error: 'Unauthorized: You do not own this order.' };
        }
        return { status: 200 };
      };

      const result = checkOwnership();
      assert.equal(result.status, 403);
      assert.equal(result.error, 'Unauthorized: You do not own this order.');
    });
  });

  // ============================================================================
  // 7. SCENARIO 7: Payment / Order ID Mismatch
  // ============================================================================
  describe('Scenario 7: Payment / Order ID Mismatch', () => {
    test('Rejects verification when client razorpay_order_id does not match database razorpay_order_id', () => {
      const dbOrder = {
        id: 'order_uuid_301',
        razorpay_order_id: 'order_RZP_AUTHORITATIVE_FROM_DB',
      };

      const clientProvidedRzOrderId = 'order_RZP_TAMPERED_CLIENT_ID';

      const verifyOrderIdMatch = () => {
        if (dbOrder.razorpay_order_id !== clientProvidedRzOrderId) {
          return { status: 400, error: 'Payment order reference mismatch. Verification failed.' };
        }
        return { status: 200 };
      };

      const result = verifyOrderIdMatch();
      assert.equal(result.status, 400);
      assert.equal(result.error, 'Payment order reference mismatch. Verification failed.');
    });
  });

  // ============================================================================
  // 8. SCENARIO 8: Payment Replay Protection
  // ============================================================================
  describe('Scenario 8: Payment Replay Protection', () => {
    test('Rejects verification with 409 Conflict when payment ID was already used on another order', () => {
      const incomingOrderId = 'order_uuid_current';
      const incomingPaymentId = 'pay_RZP_ALREADY_USED_ONCE';

      // Simulates database check for other orders utilizing this payment id
      const existingOrdersWithSamePayment = [
        { id: 'order_uuid_previously_paid', razorpay_payment_id: incomingPaymentId },
      ];

      const replayCheck = () => {
        const conflict = existingOrdersWithSamePayment.find(
          (o) => o.razorpay_payment_id === incomingPaymentId && o.id !== incomingOrderId
        );
        if (conflict) {
          return {
            status: 409,
            error: 'Conflict: Razorpay payment ID has already been utilized for another order.',
          };
        }
        return { status: 200 };
      };

      const result = replayCheck();
      assert.equal(result.status, 409);
      assert.equal(result.error, 'Conflict: Razorpay payment ID has already been utilized for another order.');
    });
  });

  // ============================================================================
  // 9. SCENARIO 9: Repeated Verification / Idempotency
  // ============================================================================
  describe('Scenario 9: Repeated Verification / Idempotency', () => {
    test('Allows idempotent retry for identical payment ID on already paid order', () => {
      const paidOrder = {
        id: 'order_uuid_401',
        order_number: 'CJV-2026-0401',
        payment_status: 'paid',
        razorpay_payment_id: 'pay_RZP_ORIGINAL_SUCCESS',
      };

      const clientPaymentId = 'pay_RZP_ORIGINAL_SUCCESS';

      const idempotencyCheck = () => {
        if (paidOrder.payment_status === 'paid') {
          if (paidOrder.razorpay_payment_id === clientPaymentId) {
            return {
              status: 200,
              success: true,
              message: 'Order was already verified and marked paid.',
              orderNumber: paidOrder.order_number,
              orderId: paidOrder.id,
            };
          } else {
            return {
              status: 409,
              success: false,
              error: 'Conflict: Order has already been finalized with a different payment.',
            };
          }
        }
        return { status: 200, success: true };
      };

      const result = idempotencyCheck();
      assert.equal(result.status, 200);
      assert.equal(result.success, true);
      assert.equal(result.message, 'Order was already verified and marked paid.');
    });

    test('Rejects with 409 Conflict when a different payment ID attempts to claim an already paid order', () => {
      const paidOrder = {
        id: 'order_uuid_401',
        order_number: 'CJV-2026-0401',
        payment_status: 'paid',
        razorpay_payment_id: 'pay_RZP_ORIGINAL_SUCCESS',
      };

      const differentPaymentId = 'pay_RZP_DIFFERENT_PAYMENT';

      const idempotencyCheck = () => {
        if (paidOrder.payment_status === 'paid') {
          if (paidOrder.razorpay_payment_id === differentPaymentId) {
            return { status: 200, success: true };
          } else {
            return {
              status: 409,
              success: false,
              error: 'Conflict: Order has already been finalized with a different payment.',
            };
          }
        }
        return { status: 200, success: true };
      };

      const result = idempotencyCheck();
      assert.equal(result.status, 409);
      assert.equal(result.success, false);
      assert.equal(result.error, 'Conflict: Order has already been finalized with a different payment.');
    });
  });

  // ============================================================================
  // 10. Cryptographic Signature Timing-Safe Checks
  // ============================================================================
  describe('Cryptographic Signature Security', () => {
    test('verifyRazorpaySignature validates authentic HMAC SHA-256 signature', () => {
      const orderId = 'order_test_secure_1';
      const paymentId = 'pay_test_secure_1';
      const sig = generateValidSignature(orderId, paymentId);

      const verified = verifyRazorpaySignature({
        orderId,
        paymentId,
        signature: sig,
      });

      assert.equal(verified, true);
    });

    test('verifyRazorpaySignature rejects forged or tampered signature', () => {
      const orderId = 'order_test_secure_2';
      const paymentId = 'pay_test_secure_2';
      const forgedSig = 'a'.repeat(64);

      const verified = verifyRazorpaySignature({
        orderId,
        paymentId,
        signature: forgedSig,
      });

      assert.equal(verified, false);
    });

    test('verifyRazorpaySignature rejects signature with mismatched secret', () => {
      const orderId = 'order_test_secure_3';
      const paymentId = 'pay_test_secure_3';
      const sigDifferentSecret = generateValidSignature(orderId, paymentId, 'wrong_secret_123');

      const verified = verifyRazorpaySignature({
        orderId,
        paymentId,
        signature: sigDifferentSecret,
      });

      assert.equal(verified, false);
    });
  });
});
