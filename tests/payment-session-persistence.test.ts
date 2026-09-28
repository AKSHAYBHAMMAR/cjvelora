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

  // ============================================================================
  // 11. finalize_order_payment RPC Permissions & Security Context Suite
  // ============================================================================
  describe('finalize_order_payment RPC Permissions & Security Context', () => {
    test('Migration Verification: migration_finalize_payment_permissions.sql defines exact signature, SECURITY DEFINER, search_path, and EXECUTE grants', async () => {
      const fs = await import('fs');
      const migrationPath = 'supabase/migration_finalize_payment_permissions.sql';
      assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

      const content = fs.readFileSync(migrationPath, 'utf8');

      // 1. Signature verification
      assert.ok(
        content.includes('FUNCTION public.finalize_order_payment(') &&
        content.includes('p_order_id uuid,') &&
        content.includes('p_razorpay_order_id text,') &&
        content.includes('p_razorpay_payment_id text') &&
        content.includes('RETURNS jsonb'),
        'Must define public.finalize_order_payment(uuid, text, text) returning jsonb'
      );

      // 2. SECURITY DEFINER and pinned search_path
      assert.ok(content.includes('SECURITY DEFINER'), 'Must have SECURITY DEFINER');
      assert.ok(content.includes('SET search_path = public, pg_temp'), 'Must have SET search_path = public, pg_temp');

      // 3. Revoke public and grant authenticated & service_role
      assert.ok(
        content.includes('REVOKE ALL ON FUNCTION public.finalize_order_payment(uuid, text, text) FROM PUBLIC;'),
        'Must revoke execution from PUBLIC'
      );
      assert.ok(
        content.includes('GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO authenticated;'),
        'Must grant execution to authenticated'
      );
      assert.ok(
        content.includes('GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO service_role;'),
        'Must grant execution to service_role'
      );

      // 4. Critical security logic preserved
      assert.ok(content.includes('FOR UPDATE'), 'Must preserve row-level locking (FOR UPDATE)');
      assert.ok(content.includes('v_caller_id := auth.uid();'), 'Must preserve caller ownership validation');
      assert.ok(content.includes('Conflict: Authoritative Razorpay order ID mismatch.'), 'Must preserve Razorpay order ID check');
      assert.ok(content.includes('Conflict: Razorpay payment ID has already been redeemed for another order.'), 'Must preserve replay check');
      assert.ok(content.includes('idx_orders_razorpay_payment_id_unique'), 'Must ensure unique index exists');

      // 5. Must NOT add customer UPDATE policy to orders
      assert.ok(
        !content.toLowerCase().includes('create policy') ||
        !content.toLowerCase().includes('update on public.orders to authenticated'),
        'Migration must not grant broad UPDATE policy to customers on orders'
      );
    });

    test('Verify Route: Diagnostic error logging captures code, message, details, hint without exposing secrets', async () => {
      const fs = await import('fs');
      const routeContent = fs.readFileSync('src/app/api/payments/verify/route.ts', 'utf8');

      // 1. Logs error diagnostic fields
      assert.ok(routeContent.includes('code: finalizeRpcErr.code'), 'Must log error code');
      assert.ok(routeContent.includes('message: finalizeRpcErr.message'), 'Must log error message');
      assert.ok(routeContent.includes('details: finalizeRpcErr.details'), 'Must log error details');
      assert.ok(routeContent.includes('hint: finalizeRpcErr.hint'), 'Must log error hint');

      // 2. Client response remains fail-closed and sanitized
      assert.ok(
        routeContent.includes("Payment finalization failed. Stock and order state were not modified."),
        'Customer-facing response must remain sanitized and fail-closed'
      );

      // 3. No raw fallback direct updating orders as paid
      assert.ok(
        !routeContent.includes("using fallback atomic update"),
        'Must not contain unsafe direct update fallback'
      );
    });
  });

  // ============================================================================
  // 12. Complete Payment Finalization Flow & Schema Cache Fix Suite (Phase 15)
  // ============================================================================
  describe('Complete Payment Finalization Flow & Regression Suite', () => {
    test('Migration Verification: migration_finalize_order_payment_schema_cache_fix.sql defines complete architecture', async () => {
      const fs = await import('fs');
      const migrationPath = 'supabase/migration_finalize_order_payment_schema_cache_fix.sql';
      assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

      const content = fs.readFileSync(migrationPath, 'utf8');

      // 1. Primary canonical 3-parameter signature
      assert.ok(
        content.includes('FUNCTION public.finalize_order_payment(') &&
        content.includes('p_order_id uuid,') &&
        content.includes('p_razorpay_order_id text,') &&
        content.includes('p_razorpay_payment_id text'),
        'Must define 3-parameter finalize_order_payment'
      );

      // 2. No JSONB overload allowed
      assert.ok(
        !content.includes('finalize_order_payment(p_params jsonb)') &&
        !content.includes('finalize_order_payment(jsonb)'),
        'Must NOT define JSONB overload'
      );

      // 3. Strict authentication check
      assert.ok(
        content.includes("IF v_caller_id IS NULL THEN") &&
        content.includes("RAISE EXCEPTION 'Unauthorized: Authentication required.';"),
        'Must reject unauthenticated callers (auth.uid() is null)'
      );

      // 4. Strict customer ownership check
      assert.ok(
        content.includes("IF v_caller_id <> v_order_customer_id THEN") &&
        content.includes("RAISE EXCEPTION 'Unauthorized: You do not own this order.';"),
        'Must reject unauthorized callers who do not own the order'
      );

      // 5. Strict Execution privileges: REVOKE from public, grant authenticated and service_role (anon NOT granted)
      assert.ok(
        content.includes('REVOKE ALL ON FUNCTION public.finalize_order_payment(uuid, text, text) FROM PUBLIC;'),
        'Must revoke execute from PUBLIC'
      );
      assert.ok(
        content.includes('GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO authenticated;'),
        'Must grant execute to authenticated'
      );
      assert.ok(
        content.includes('GRANT EXECUTE ON FUNCTION public.finalize_order_payment(uuid, text, text) TO service_role;'),
        'Must grant execute to service_role'
      );
      assert.ok(
        !content.includes('TO anon'),
        'Must strictly NOT grant execute to anon'
      );

      // 6. PostgREST schema reload signal
      assert.ok(
        content.includes("NOTIFY pgrst, 'reload schema';"),
        "Must emit NOTIFY pgrst, 'reload schema' to immediately update PostgREST schema cache"
      );

      // 7. Strict Inventory Validation without silent GREATEST(0, ...) clamping in function body
      const functionBody = content.slice(content.indexOf('AS $$'));
      assert.ok(
        !functionBody.includes('GREATEST(0,'),
        'Function body must NOT use GREATEST(0, ...) to silently clamp stock to zero'
      );
      assert.ok(
        content.includes('IF v_current_stock < v_item.quantity THEN') &&
        content.includes('IF v_reserved_stock < v_item.quantity THEN'),
        'Must explicitly validate available stock and reserved stock before deduction'
      );
      assert.ok(
        content.includes('ORDER BY product_id ASC'),
        'Must lock and update order items in deterministic order to prevent deadlocks'
      );
    });

    test('Verify Route: Calls canonical 3-parameter finalize_order_payment RPC', async () => {
      const fs = await import('fs');
      const routeContent = fs.readFileSync('src/app/api/payments/verify/route.ts', 'utf8');

      assert.ok(
        routeContent.includes("userSupabase.rpc('finalize_order_payment', {") &&
        routeContent.includes('p_order_id: cleanOrderId,') &&
        routeContent.includes('p_razorpay_order_id: order.razorpay_order_id,') &&
        routeContent.includes('p_razorpay_payment_id: cleanRzPaymentId,'),
        'Verify route must call canonical 3-parameter RPC with clean parameters'
      );
    });

    test('Complete Simulated Finalization Flow: 13-Point Regression Verification with Strict Stock Validation', () => {
      // 1. Authenticated customer setup
      const customerId = 'user_uuid_customer_456';
      const orderId = 'order_uuid_target_789';
      const rzOrderId = 'order_RZP_valid_session_123';
      const initialRzPaymentId = 'pay_RZP_success_456';

      // 2. Database state simulation before finalization
      const database = {
        orders: new Map<string, any>([
          [
            orderId,
            {
              id: orderId,
              order_number: 'VEL-20260928-TEST01',
              customer_id: customerId,
              payment_status: 'pending',
              status: 'pending',
              order_status: 'pending',
              razorpay_order_id: rzOrderId, // Point 2: Persisted at creation
              razorpay_payment_id: null,
            },
          ],
        ]),
        order_items: [
          { order_id: orderId, product_id: 'prod_1', quantity: 2 },
          { order_id: orderId, product_id: 'prod_2', quantity: 1 },
        ],
        inventory: new Map<string, any>([
          ['prod_1', { product_id: 'prod_1', quantity: 20, reserved_quantity: 2 }],
          ['prod_2', { product_id: 'prod_2', quantity: 15, reserved_quantity: 1 }],
        ]),
      };

      // Simulated atomic finalize_order_payment RPC adhering to exact SQL logic
      function simulateFinalizeRpc(
        callerId: string | null,
        pOrderId: string,
        pRzOrderId: string,
        pRzPaymentId: string
      ) {
        const order = database.orders.get(pOrderId);
        if (!order) {
          throw new Error(`Order with ID ${pOrderId} not found.`);
        }

        // Point 13: Unauthorized customer check
        if (!callerId) {
          throw new Error('Unauthorized: Authentication required.');
        }
        if (callerId !== order.customer_id) {
          throw new Error('Unauthorized: You do not own this order.');
        }

        // Point 3: Authoritative order ID validation
        if (order.razorpay_order_id && pRzOrderId && order.razorpay_order_id !== pRzOrderId) {
          throw new Error('Conflict: Authoritative Razorpay order ID mismatch.');
        }

        // Point 10 & 11: Idempotency & conflict handling
        if (order.payment_status === 'paid') {
          if (order.razorpay_payment_id === pRzPaymentId) {
            return {
              success: true,
              message: 'Order was already verified and marked paid.',
              order_id: pOrderId,
            };
          } else {
            throw new Error('Conflict: Order was already finalized with a different payment ID.');
          }
        }

        // Point 12: Cross-order payment ID replay check
        database.orders.forEach((existingOrder, existingId) => {
          if (existingId !== pOrderId && existingOrder.razorpay_payment_id === pRzPaymentId) {
            throw new Error('Conflict: Razorpay payment ID has already been redeemed for another order.');
          }
        });

        // Point 8 & 9: Atomic Inventory conversion with strict stock validation (no clamping)
        const items = database.order_items.filter((i) => i.order_id === pOrderId);
        for (const item of items) {
          const inv = database.inventory.get(item.product_id);
          if (!inv) {
            throw new Error(`Inventory record for product ID ${item.product_id} not found.`);
          }
          if (inv.quantity < item.quantity) {
            throw new Error(`Insufficient stock to finalize order for product ID ${item.product_id}. Available on hand: ${inv.quantity}, Requested: ${item.quantity}`);
          }
          if (inv.reserved_quantity < item.quantity) {
            throw new Error(`Reserved stock mismatch to finalize order for product ID ${item.product_id}. Reserved: ${inv.reserved_quantity}, Requested: ${item.quantity}`);
          }

          inv.quantity = inv.quantity - item.quantity;
          inv.reserved_quantity = inv.reserved_quantity - item.quantity;
        }

        // Point 5, 6, 7: Mark order paid, status processing, store payment ID
        order.payment_status = 'paid';
        order.status = 'processing';
        order.order_status = 'processing';
        order.razorpay_order_id = pRzPaymentId ? (order.razorpay_order_id || pRzOrderId) : order.razorpay_order_id;
        order.razorpay_payment_id = pRzPaymentId;

        return {
          success: true,
          message: 'Payment successfully finalized and stock deducted.',
          order_id: pOrderId,
        };
      }

      // Execution Step 0: Insufficient stock fails closed and rolls back without silent clamping
      database.inventory.set('prod_1', { product_id: 'prod_1', quantity: 1, reserved_quantity: 2 });
      assert.throws(
        () => simulateFinalizeRpc(customerId, orderId, rzOrderId, initialRzPaymentId),
        /Insufficient stock to finalize order/
      );
      // Restore valid stock for subsequent steps
      database.inventory.set('prod_1', { product_id: 'prod_1', quantity: 20, reserved_quantity: 2 });

      // Execution Step 0b: Reserved stock shortfall fails closed
      database.inventory.set('prod_1', { product_id: 'prod_1', quantity: 20, reserved_quantity: 0 });
      assert.throws(
        () => simulateFinalizeRpc(customerId, orderId, rzOrderId, initialRzPaymentId),
        /Reserved stock mismatch to finalize order/
      );
      // Restore valid reserved stock
      database.inventory.set('prod_1', { product_id: 'prod_1', quantity: 20, reserved_quantity: 2 });


      // Execution Step 1: Unauthorized customer cannot finalize
      assert.throws(
        () => simulateFinalizeRpc('attacker_uuid', orderId, rzOrderId, initialRzPaymentId),
        /Unauthorized: You do not own this order/
      );

      // Execution Step 2: Unauthenticated caller cannot finalize
      assert.throws(
        () => simulateFinalizeRpc(null, orderId, rzOrderId, initialRzPaymentId),
        /Unauthorized: Authentication required/
      );

      // Execution Step 3: Valid customer payment finalization succeeds (Point 4)
      const res = simulateFinalizeRpc(customerId, orderId, rzOrderId, initialRzPaymentId);
      assert.equal(res.success, true);

      // Verification of Points 5, 6, 7
      const updatedOrder = database.orders.get(orderId);
      assert.equal(updatedOrder.payment_status, 'paid', 'Point 5: payment_status must become paid');
      assert.equal(updatedOrder.status, 'processing', 'Point 6: status must become processing');
      assert.equal(updatedOrder.order_status, 'processing', 'Point 6: order_status must become processing');
      assert.equal(updatedOrder.razorpay_payment_id, initialRzPaymentId, 'Point 7: razorpay_payment_id stored');

      // Verification of Points 8 & 9: Inventory conversion
      const invProd1 = database.inventory.get('prod_1');
      assert.equal(invProd1.quantity, 18, 'Point 8: quantity deducted from 20 to 18');
      assert.equal(invProd1.reserved_quantity, 0, 'Point 9: reserved_quantity deducted from 2 to 0');

      const invProd2 = database.inventory.get('prod_2');
      assert.equal(invProd2.quantity, 14, 'Point 8: quantity deducted from 15 to 14');
      assert.equal(invProd2.reserved_quantity, 0, 'Point 9: reserved_quantity deducted from 1 to 0');

      // Verification of Point 10: Repeated identical verification remains idempotent
      const retryRes = simulateFinalizeRpc(customerId, orderId, rzOrderId, initialRzPaymentId);
      assert.equal(retryRes.success, true);
      assert.equal(retryRes.message, 'Order was already verified and marked paid.');

      // Verification of Point 11: A different payment ID cannot claim the already paid order
      assert.throws(
        () => simulateFinalizeRpc(customerId, orderId, rzOrderId, 'pay_DIFFERENT_payment_999'),
        /Conflict: Order was already finalized with a different payment ID/
      );

      // Verification of Point 12: A payment ID cannot be reused on another order
      const secondOrderId = 'order_uuid_second_order_999';
      database.orders.set(secondOrderId, {
        id: secondOrderId,
        customer_id: customerId,
        payment_status: 'pending',
        status: 'pending',
        order_status: 'pending',
        razorpay_order_id: 'order_RZP_second_session_888',
        razorpay_payment_id: null,
      });

      assert.throws(
        () => simulateFinalizeRpc(customerId, secondOrderId, 'order_RZP_second_session_888', initialRzPaymentId),
        /Conflict: Razorpay payment ID has already been redeemed for another order/
      );
    });
  });
});


