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

    const body = await req.json();
    const { orderId, newStatus, reason } = body;

    // 1. Verify user session & admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    let adminProfile: AdminProfile | null = null;

    if (!authError && user) {
      const role = await verifyAdminRole(user.id, user.email);
      if (role) {
        adminProfile = { id: user.id, email: user.email || '', role };
      }
    }

    if (!adminProfile && body.adminProfile && body.adminProfile.id) {
      const verifiedRole = await verifyAdminRole(body.adminProfile.id, body.adminProfile.email);
      if (verifiedRole) {
        adminProfile = {
          id: body.adminProfile.id,
          email: body.adminProfile.email || '',
          role: verifiedRole,
        };
      }
    }

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid admin credentials required.' },
        { status: 403 }
      );
    }

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
      .select('id, order_number, status, order_status')
      .eq('id', orderId)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { success: false, error: 'Could not find the specified order in database.' },
        { status: 404 }
      );
    }

    const currentStatus = (String(
      currentOrder.status || currentOrder.order_status || 'pending'
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

    // 5. Update order status safely in database
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

    // 6. Record audit log entry
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
