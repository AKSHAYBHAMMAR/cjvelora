import { NextRequest, NextResponse } from 'next/server';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured in the environment.' },
        { status: 503 }
      );
    }

    // 1. Verify user session strictly via Authorization Bearer token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
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

    const body = await req.json().catch(() => ({}));
    const { orderId, orderNumber } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order reference (orderId or orderNumber) is required.' },
        { status: 400 }
      );
    }

    // 2. Query authoritative order row from database
    let query = defaultSupabase
      .from('orders')
      .select('id, order_number, customer_id, customer_email, status, order_status, payment_status');

    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderNumber);
    }

    const { data: order, error: orderFetchErr } = await query.single();

    if (orderFetchErr || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found in records.' },
        { status: 404 }
      );
    }

    // 3. Strict Server-side Ownership Verification: user must own this order
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to modify this order.' },
        { status: 403 }
      );
    }

    const paymentStatus = String(order.payment_status || 'pending').toLowerCase();
    const orderStatus = String(order.order_status || order.status || 'pending').toLowerCase();

    // 4. Strict State Validation:
    // Disallow cancellation for paid, refunded, shipped, or delivered orders
    if (paymentStatus === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Paid orders cannot be cancelled by the customer. Please contact concierge support.' },
        { status: 400 }
      );
    }

    if (paymentStatus === 'refunded') {
      return NextResponse.json(
        { success: false, error: 'Refunded orders cannot be cancelled.' },
        { status: 400 }
      );
    }

    if (orderStatus === 'shipped') {
      return NextResponse.json(
        { success: false, error: 'Orders that have already been dispatched for delivery cannot be cancelled.' },
        { status: 400 }
      );
    }

    if (orderStatus === 'delivered') {
      return NextResponse.json(
        { success: false, error: 'Delivered orders cannot be cancelled.' },
        { status: 400 }
      );
    }

    if (orderStatus === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'This order has already been cancelled.' },
        { status: 400 }
      );
    }

    // Customer cancellation is permitted strictly when order is unpaid and pending
    const isUnpaid = paymentStatus === 'pending' || paymentStatus === 'failed';
    const isPending = orderStatus === 'pending';

    if (!isUnpaid || !isPending) {
      return NextResponse.json(
        {
          success: false,
          error: `This order is not eligible for cancellation (Order: ${orderStatus}, Payment: ${paymentStatus}).`,
        },
        { status: 400 }
      );
    }

    // 5. Release inventory reservations and set status to cancelled
    let rpcSuccess = false;
    try {
      const { data: rpcData, error: rpcErr } = await defaultSupabase.rpc('cancel_order_reservation', {
        p_order_id: order.id,
        p_reason: 'Cancelled by customer (unpaid order)',
      });

      if (!rpcErr && rpcData?.success) {
        rpcSuccess = true;
      } else if (rpcErr) {
        console.warn('cancel_order_reservation RPC error, running direct fallback:', rpcErr.message);
      }
    } catch (rpcEx) {
      console.warn('cancel_order_reservation RPC call exception:', rpcEx);
    }

    // Fallback if RPC was not invoked / unavailable
    if (!rpcSuccess) {
      // 5a. Release reserved stock if payment was pending
      if (paymentStatus === 'pending') {
        const { data: items } = await defaultSupabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', order.id);

        if (items && Array.isArray(items)) {
          for (const it of items) {
            const { data: inv } = await defaultSupabase
              .from('inventory')
              .select('reserved_quantity')
              .eq('product_id', it.product_id)
              .single();

            if (inv) {
              await defaultSupabase
                .from('inventory')
                .update({
                  reserved_quantity: Math.max(0, Number(inv.reserved_quantity ?? 0) - it.quantity),
                  updated_at: new Date().toISOString(),
                })
                .eq('product_id', it.product_id);
            }
          }
        }
      }

      // 5b. Update order status
      const { error: updateErr } = await defaultSupabase
        .from('orders')
        .update({
          status: 'cancelled',
          order_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateErr) {
        return NextResponse.json(
          { success: false, error: `Failed to cancel order: ${updateErr.message}` },
          { status: 500 }
        );
      }
    }

    // 6. Record audit log
    try {
      await defaultSupabase.from('audit_logs').insert({
        action: 'ORDER_CANCELLED_BY_CUSTOMER',
        entity_type: 'orders',
        entity_id: order.id,
        user_id: user.id,
        details: {
          order_number: order.order_number,
          previous_status: orderStatus,
          previous_payment_status: paymentStatus,
          new_status: 'cancelled',
          reason: 'Customer cancelled unpaid pending order',
          user_email: user.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: Could not write customer cancellation audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Order has been successfully cancelled.',
      orderId: order.id,
      orderNumber: order.order_number,
      status: 'cancelled',
      orderStatus: 'cancelled',
    });
  } catch (err: any) {
    console.error('Customer cancel order route exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error while cancelling order.' },
      { status: 500 }
    );
  }
}
