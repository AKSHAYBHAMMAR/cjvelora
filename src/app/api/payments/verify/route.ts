import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyRazorpaySignature, isRazorpayConfigured } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured.' },
        { status: 503 }
      );
    }

    // 1. Authenticate user
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

    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const body = await req.json();
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!orderId || !razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification parameters.' },
        { status: 400 }
      );
    }

    // 2. Fetch order to verify customer ownership
    const { data: order, error: orderFetchErr } = await userSupabase
      .from('orders')
      .select('id, order_number, customer_id, payment_status, total_amount, razorpay_order_id')
      .eq('id', orderId)
      .single();

    if (orderFetchErr || !order) {
      return NextResponse.json(
        { success: false, error: 'Could not find order or access restricted.' },
        { status: 404 }
      );
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not own this order.' },
        { status: 403 }
      );
    }

    // 3. Idempotency check
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Order was already verified and marked paid.',
        orderNumber: order.order_number,
      });
    }

    // 4. Verify Razorpay cryptographic signature
    if (isRazorpayConfigured()) {
      if (!razorpay_order_id || !razorpay_signature) {
        return NextResponse.json(
          { success: false, error: 'Razorpay order ID and cryptographic signature are required.' },
          { status: 400 }
        );
      }

      const isValidSignature = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValidSignature) {
        console.error('Cryptographic signature verification failed for payment:', razorpay_payment_id);
        return NextResponse.json(
          { success: false, error: 'Payment signature verification failed. Untrusted response.' },
          { status: 400 }
        );
      }
    }

    // 5. Finalize payment in database: convert reserved stock to sold
    const { data: finalizeRpcData, error: finalizeRpcErr } = await userSupabase.rpc('finalize_order_payment', {
      p_order_id: orderId,
      p_razorpay_order_id: razorpay_order_id || null,
      p_razorpay_payment_id: razorpay_payment_id,
    });

    if (finalizeRpcErr) {
      console.warn('RPC finalize_order_payment unavailable, using fallback atomic update:', finalizeRpcErr.message);

      // Fallback: Decrement stock directly
      const { data: items } = await userSupabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (items && Array.isArray(items)) {
        for (const item of items) {
          const { data: currentInv } = await userSupabase
            .from('inventory')
            .select('quantity, reserved_quantity')
            .eq('product_id', item.product_id)
            .single();

          if (currentInv) {
            const onHand = Number(currentInv.quantity ?? 0);
            const reserved = Number(currentInv.reserved_quantity ?? 0);
            await userSupabase
              .from('inventory')
              .update({
                quantity: Math.max(0, onHand - item.quantity),
                reserved_quantity: Math.max(0, reserved - item.quantity),
                updated_at: new Date().toISOString(),
              })
              .eq('product_id', item.product_id);
          }
        }
      }

      // Update order status
      await userSupabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          order_status: 'processing',
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    // 6. Clean up customer's shopping cart
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
      console.warn('Notice: cart cleanup warning:', cartCleanErr);
    }

    // 7. Audit log entry
    try {
      await userSupabase.from('audit_logs').insert({
        action: 'PAYMENT_VERIFIED',
        entity_type: 'orders',
        entity_id: orderId,
        user_id: user.id,
        details: {
          order_number: order.order_number,
          razorpay_payment_id,
          razorpay_order_id,
          payment_status: 'paid',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: audit log warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment successfully verified.',
      orderNumber: order.order_number,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error verifying payment.' },
      { status: 500 }
    );
  }
}
