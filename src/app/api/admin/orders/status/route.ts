import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';
import { isValidStatusTransition } from '@/lib/orders';
import { OrderStatus } from '@/types';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured in the environment.' },
        { status: 503 }
      );
    }

    // 1. Verify user session & admin role strictly via Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    let adminProfile: AdminProfile | null = null;

    if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        const role = await verifyAdminRole(user.id, user.email);
        if (role) {
          adminProfile = { id: user.id, email: user.email || '', role };
        }
      }
    }

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid administrator session required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, newStatus, reason } = body;

    // 2. Validate inputs
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required order ID.' },
        { status: 400 }
      );
    }

    const validStatuses: OrderStatus[] = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ];

    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid target order status: "${newStatus}".` },
        { status: 400 }
      );
    }

    // 3. Fetch current order status from database
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status, order_status, payment_status')
      .eq('id', orderId)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { success: false, error: 'Could not find the specified order in database.' },
        { status: 404 }
      );
    }

    const currentStatus = (String(
      currentOrder.order_status || currentOrder.status || 'pending'
    ).toLowerCase()) as OrderStatus;

    // 4. Enforce valid state transition rules
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Illegal status transition: cannot transition order from "${currentStatus}" to "${newStatus}".`,
        },
        { status: 422 }
      );
    }

    // 5. If cancelling an unpaid order, release reserved inventory
    if ((newStatus === 'cancelled' || newStatus === 'refunded') && currentOrder.payment_status === 'pending') {
      try {
        const { error: cancelRpcErr } = await supabase.rpc('cancel_order_reservation', {
          p_order_id: orderId,
          p_reason: reason || 'Status updated by admin',
        });

        if (cancelRpcErr) {
          // Fallback inventory reservation release
          const { data: items } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', orderId);

          if (items && Array.isArray(items)) {
            for (const it of items) {
              const { data: inv } = await supabase
                .from('inventory')
                .select('reserved_quantity')
                .eq('product_id', it.product_id)
                .single();

              if (inv) {
                await supabase
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
      } catch (relErr) {
        console.warn('Notice: Stock reservation release warning:', relErr);
      }
    }

    // 6. Update order status safely in database (keep status and order_status synchronized)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Failed to update order status: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 7. Record audit log entry
    try {
      await supabase.from('audit_logs').insert({
        user_id: adminProfile.id,
        action: 'ORDER_STATUS_UPDATE',
        entity_type: 'orders',
        entity_id: orderId,
        details: {
          order_number: currentOrder.order_number,
          previous_status: currentStatus,
          new_status: newStatus,
          reason: reason || 'Status updated via admin console',
          user_email: adminProfile.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: Could not record audit log for order status update:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Order status successfully updated to "${newStatus}".`,
      orderId,
      newStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
