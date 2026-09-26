import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyRazorpaySignature, isRazorpayConfigured } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    // 1. Fail closed on missing/unconfigured database
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Payment verification is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // 2. Fail closed on missing/unconfigured Razorpay credentials
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Payment verification is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // 3. Authenticate customer via Bearer JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for payment verification.' },
        { status: 401 }
      );
    }

    const { data: tokenUserData, error: tokenErr } = await defaultSupabase.auth.getUser(token);
    const user = tokenUserData?.user;

    if (tokenErr || !user) {
      return NextResponse.json(
        { success: false, error: 'Your session has expired. Please sign in again.' },
        { status: 401 }
      );
    }

    // Create a client scoped to the authenticated customer session
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    // 4. Parse and validate request parameters
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

    if (
      !orderId || typeof orderId !== 'string' || !orderId.trim() ||
      !razorpay_order_id || typeof razorpay_order_id !== 'string' || !razorpay_order_id.trim() ||
      !razorpay_payment_id || typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.trim() ||
      !razorpay_signature || typeof razorpay_signature !== 'string' || !razorpay_signature.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification parameters.' },
        { status: 400 }
      );
    }

    const cleanOrderId = orderId.trim();
    const cleanClientRzOrderId = razorpay_order_id.trim();
    const cleanRzPaymentId = razorpay_payment_id.trim();
    const cleanRzSignature = razorpay_signature.trim();

    // 5. Fetch authoritative database order to verify ownership and existing state
    const { data: order, error: orderFetchErr } = await userSupabase
      .from('orders')
      .select('id, order_number, customer_id, payment_status, total_amount, razorpay_order_id, razorpay_payment_id')
      .eq('id', cleanOrderId)
      .single();

    if (orderFetchErr || !order) {
      return NextResponse.json(
        { success: false, error: 'Could not find order or access restricted.' },
        { status: 404 }
      );
    }

    // Enforce customer ownership
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not own this order.' },
        { status: 403 }
      );
    }

    // Require an authoritative Razorpay order ID to exist in the database
    if (!order.razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: 'Order does not have an active payment session.' },
        { status: 400 }
      );
    }

    // 6. Authoritative Razorpay Order ID check: client-provided order ID MUST match database record
    if (order.razorpay_order_id !== cleanClientRzOrderId) {
      return NextResponse.json(
        { success: false, error: 'Payment order reference mismatch. Verification failed.' },
        { status: 400 }
      );
    }

    // 7. Same-Order Idempotency Check:
    // If order was already paid, handle legitimately idempotent retries safely
    if (order.payment_status === 'paid') {
      if (order.razorpay_payment_id === cleanRzPaymentId) {
        return NextResponse.json({
          success: true,
          message: 'Order was already verified and marked paid.',
          orderNumber: order.order_number,
          orderId: order.id,
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Conflict: Order has already been finalized with a different payment.' },
          { status: 409 }
        );
      }
    }

    // 8. Application-Level Replay Protection:
    // Check if this razorpay_payment_id has already been recorded on any other order
    const { data: existingPaymentOrders, error: replayCheckErr } = await userSupabase
      .from('orders')
      .select('id')
      .eq('razorpay_payment_id', cleanRzPaymentId)
      .neq('id', cleanOrderId)
      .limit(1);

    if (!replayCheckErr && existingPaymentOrders && existingPaymentOrders.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Conflict: Razorpay payment ID has already been utilized for another order.' },
        { status: 409 }
      );
    }

    // 9. Cryptographic HMAC-SHA256 Signature Verification
    // Message MUST use AUTHORITATIVE database order ID + payment ID
    const isValidSignature = verifyRazorpaySignature({
      orderId: order.razorpay_order_id,
      paymentId: cleanRzPaymentId,
      signature: cleanRzSignature,
    });

    if (!isValidSignature) {
      console.error('Payment verification failed: Invalid cryptographic signature for order ID:', order.id);
      return NextResponse.json(
        { success: false, error: 'Payment signature verification failed. Untrusted response.' },
        { status: 400 }
      );
    }

    // 10. Atomic Payment Finalization via RPC
    // Converts reserved stock to sold stock and marks order paid in ONE isolated transaction
    const { data: finalizeRpcData, error: finalizeRpcErr } = await userSupabase.rpc('finalize_order_payment', {
      p_order_id: cleanOrderId,
      p_razorpay_order_id: order.razorpay_order_id,
      p_razorpay_payment_id: cleanRzPaymentId,
    });

    if (finalizeRpcErr) {
      console.error('RPC finalize_order_payment error for order ID:', cleanOrderId, {
        code: finalizeRpcErr.code,
        message: finalizeRpcErr.message,
        details: finalizeRpcErr.details,
        hint: finalizeRpcErr.hint,
      });

      const errMsg = finalizeRpcErr.message || '';
      const isConflict = errMsg.toLowerCase().includes('conflict') || errMsg.toLowerCase().includes('already');
      const isUnauthorized = errMsg.toLowerCase().includes('unauthorized');

      if (isUnauthorized) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: You do not own this order.' },
          { status: 403 }
        );
      }

      if (isConflict) {
        return NextResponse.json(
          { success: false, error: 'Conflict: Payment or order state conflict during finalization.' },
          { status: 409 }
        );
      }

      // FAIL CLOSED: Unsafe fallback loop has been completely eliminated.
      // Stock remains reserved, order remains pending, no manual partial updates occur.
      return NextResponse.json(
        { success: false, error: 'Payment finalization failed. Stock and order state were not modified.' },
        { status: 500 }
      );
    }

    // 11. Clean up customer's shopping cart (best-effort post-finalization)
    try {
      const { data: userCart } = await userSupabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userCart) {
        await userSupabase.from('cart_items').delete().eq('cart_id', userCart.id);
      }
    } catch (cartCleanErr) {
      console.warn('Notice: cart cleanup warning for order ID:', cleanOrderId);
    }

    // 12. Audit log entry (sanitized, no secrets or full signatures logged)
    try {
      await userSupabase.from('audit_logs').insert({
        action: 'PAYMENT_VERIFIED',
        entity_type: 'orders',
        entity_id: cleanOrderId,
        user_id: user.id,
        details: {
          order_number: order.order_number,
          razorpay_payment_id: cleanRzPaymentId,
          razorpay_order_id: order.razorpay_order_id,
          payment_status: 'paid',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: audit log warning for order ID:', cleanOrderId);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment successfully verified.',
      orderNumber: order.order_number,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Payment verification exception:', error?.message || 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Server error verifying payment.' },
      { status: 500 }
    );
  }
}
