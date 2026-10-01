import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { isValidStatusTransition } from '@/lib/orders';
import { OrderStatus } from '@/types';

/**
 * Validates whether a given string is a valid HTTP/HTTPS URL.
 */
function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates an ISO / YYYY-MM-DD date string.
 */
function isValidDateString(dateString: string): boolean {
  const timestamp = Date.parse(dateString);
  return !isNaN(timestamp);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate admin/staff caller using the established secure pattern
    const { admin: adminProfile, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!adminProfile || !db) {
      return NextResponse.json({ success: false, error: authErr || 'Unauthorized.' }, { status: authStatus || 401 });
    }

    // 2. Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const {
      orderId,
      shippingProvider,
      shippingTrackingNumber,
      shippingTrackingUrl,
      shippingDispatchedAt,
      shippingEstimatedDelivery,
      shippingNotes,
      newStatus,
    } = body || {};

    // 3. Validate orderId
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json({ success: false, error: 'Missing required order ID.' }, { status: 400 });
    }

    const cleanOrderId = orderId.trim();

    // 4. Validate allowlisted input values server-side
    let cleanProvider: string | null = null;
    if (shippingProvider !== undefined && shippingProvider !== null) {
      if (typeof shippingProvider !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid shipping provider format.' }, { status: 400 });
      }
      cleanProvider = shippingProvider.trim();
      if (cleanProvider.length > 100) {
        return NextResponse.json({ success: false, error: 'Shipping provider name exceeds maximum 100 characters.' }, { status: 400 });
      }
      cleanProvider = cleanProvider || null;
    }

    let cleanTrackingNumber: string | null = null;
    if (shippingTrackingNumber !== undefined && shippingTrackingNumber !== null) {
      if (typeof shippingTrackingNumber !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid tracking number format.' }, { status: 400 });
      }
      cleanTrackingNumber = shippingTrackingNumber.trim();
      if (cleanTrackingNumber.length > 100) {
        return NextResponse.json({ success: false, error: 'Tracking number exceeds maximum 100 characters.' }, { status: 400 });
      }
      cleanTrackingNumber = cleanTrackingNumber || null;
    }

    let cleanTrackingUrl: string | null = null;
    if (shippingTrackingUrl !== undefined && shippingTrackingUrl !== null) {
      if (typeof shippingTrackingUrl !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid tracking URL format.' }, { status: 400 });
      }
      const trimmedUrl = shippingTrackingUrl.trim();
      if (trimmedUrl) {
        if (!isValidHttpUrl(trimmedUrl)) {
          return NextResponse.json({ success: false, error: 'Tracking URL must be a valid web URL starting with http:// or https://.' }, { status: 400 });
        }
        if (trimmedUrl.length > 500) {
          return NextResponse.json({ success: false, error: 'Tracking URL exceeds maximum 500 characters.' }, { status: 400 });
        }
        cleanTrackingUrl = trimmedUrl;
      }
    }

    let cleanDispatchedAt: string | null = null;
    if (shippingDispatchedAt !== undefined && shippingDispatchedAt !== null) {
      const trimmedDispatch = String(shippingDispatchedAt).trim();
      if (trimmedDispatch) {
        if (!isValidDateString(trimmedDispatch)) {
          return NextResponse.json({ success: false, error: 'Invalid dispatch date/time format.' }, { status: 400 });
        }
        cleanDispatchedAt = new Date(trimmedDispatch).toISOString();
      }
    }

    let cleanEstimatedDelivery: string | null = null;
    if (shippingEstimatedDelivery !== undefined && shippingEstimatedDelivery !== null) {
      const trimmedEst = String(shippingEstimatedDelivery).trim();
      if (trimmedEst) {
        if (!isValidDateString(trimmedEst)) {
          return NextResponse.json({ success: false, error: 'Invalid estimated delivery date format.' }, { status: 400 });
        }
        // Extract YYYY-MM-DD
        cleanEstimatedDelivery = new Date(trimmedEst).toISOString().slice(0, 10);
      }
    }

    let cleanNotes: string | null = null;
    if (shippingNotes !== undefined && shippingNotes !== null) {
      if (typeof shippingNotes !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid shipping notes format.' }, { status: 400 });
      }
      const trimmedNotes = shippingNotes.trim();
      if (trimmedNotes.length > 1000) {
        return NextResponse.json({ success: false, error: 'Shipping notes cannot exceed 1000 characters.' }, { status: 400 });
      }
      cleanNotes = trimmedNotes || null;
    }

    // 5. Query authoritative order row from database
    const { data: currentOrder, error: fetchErr } = await db
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        order_status,
        payment_status,
        shipping_provider,
        shipping_tracking_number,
        shipping_tracking_url,
        shipping_dispatched_at,
        shipping_estimated_delivery,
        shipping_notes
      `)
      .eq('id', cleanOrderId)
      .single();

    if (fetchErr || !currentOrder) {
      return NextResponse.json({ success: false, error: 'Order not found in atelier records.' }, { status: 404 });
    }

    const currentStatus = (String(
      currentOrder.order_status || currentOrder.status || 'pending'
    ).toLowerCase()) as OrderStatus;

    const currentPaymentStatus = String(currentOrder.payment_status || 'pending').toLowerCase();

    // 6. Target status evaluation
    let targetStatus: OrderStatus = currentStatus;
    if (newStatus !== undefined && newStatus !== null) {
      const cleanNewStatus = String(newStatus).toLowerCase() as OrderStatus;
      const validStatuses: OrderStatus[] = [
        'pending',
        'processing',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
      ];

      if (!validStatuses.includes(cleanNewStatus)) {
        return NextResponse.json({ success: false, error: `Invalid target status: "${newStatus}".` }, { status: 400 });
      }

      if (cleanNewStatus !== currentStatus) {
        // Enforce valid state machine transition
        if (!isValidStatusTransition(currentStatus, cleanNewStatus)) {
          return NextResponse.json(
            {
              success: false,
              error: `Illegal status transition: cannot transition order from "${currentStatus}" to "${cleanNewStatus}".`,
            },
            { status: 422 }
          );
        }
        targetStatus = cleanNewStatus;
      }
    }

    // 7. PAYMENT SAFETY ENFORCEMENT
    // Shipping operations must NEVER bypass payment verification.
    // An order must NOT be marked shipped, out_for_delivery, or delivered unless payment_status === 'paid'.
    const isFulfillmentDispatchState =
      targetStatus === 'shipped' ||
      targetStatus === 'out_for_delivery' ||
      targetStatus === 'delivered';

    if (isFulfillmentDispatchState && currentPaymentStatus !== 'paid') {
      return NextResponse.json(
        {
          success: false,
          error: `Shipping cannot be updated because payment is not confirmed (Current payment status: "${currentPaymentStatus}").`,
        },
        { status: 400 }
      );
    }

    // 8. DISPATCH TIMESTAMP BEHAVIOR
    // When marking as 'shipped' and no dispatch timestamp is explicitly supplied,
    // default to current authoritative server timestamp.
    // Preserve any existing dispatch timestamp unless explicitly overridden.
    let finalDispatchedAt = currentOrder.shipping_dispatched_at;

    if (cleanDispatchedAt !== null) {
      finalDispatchedAt = cleanDispatchedAt;
    } else if (shippingDispatchedAt === null) {
      // Explicitly cleared
      finalDispatchedAt = null;
    } else if (targetStatus === 'shipped' && !finalDispatchedAt) {
      finalDispatchedAt = new Date().toISOString();
    }

    // 9. Build sanitized update payload (maintaining status & order_status synchronization)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (shippingProvider !== undefined) {
      updateData.shipping_provider = cleanProvider;
    }
    if (shippingTrackingNumber !== undefined) {
      updateData.shipping_tracking_number = cleanTrackingNumber;
    }
    if (shippingTrackingUrl !== undefined) {
      updateData.shipping_tracking_url = cleanTrackingUrl;
    }
    if (shippingEstimatedDelivery !== undefined) {
      updateData.shipping_estimated_delivery = cleanEstimatedDelivery;
    }
    if (shippingNotes !== undefined) {
      updateData.shipping_notes = cleanNotes;
    }

    updateData.shipping_dispatched_at = finalDispatchedAt;

    if (targetStatus !== currentStatus) {
      updateData.status = targetStatus;
      updateData.order_status = targetStatus;
    }

    // 10. Execute database update
    const { error: updateErr } = await db
      .from('orders')
      .update(updateData)
      .eq('id', cleanOrderId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Failed to update shipping information: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 11. Immutable Audit Logging
    try {
      await db.from('audit_logs').insert({
        user_id: adminProfile.id,
        action: 'ORDER_SHIPPING_UPDATE',
        entity_type: 'orders',
        entity_id: cleanOrderId,
        details: {
          order_number: currentOrder.order_number,
          previous_status: currentStatus,
          new_status: targetStatus,
          shipping_provider: updateData.shipping_provider ?? currentOrder.shipping_provider,
          shipping_tracking_number: updateData.shipping_tracking_number ?? currentOrder.shipping_tracking_number,
          shipping_tracking_url: updateData.shipping_tracking_url ?? currentOrder.shipping_tracking_url,
          shipping_dispatched_at: finalDispatchedAt,
          shipping_estimated_delivery: updateData.shipping_estimated_delivery ?? currentOrder.shipping_estimated_delivery,
          shipping_notes: updateData.shipping_notes ?? currentOrder.shipping_notes,
          admin_email: adminProfile.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: Could not record audit log for shipping update:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Shipping information updated successfully.',
      orderId: cleanOrderId,
      orderStatus: targetStatus,
      shippingProvider: updateData.shipping_provider ?? currentOrder.shipping_provider,
      shippingTrackingNumber: updateData.shipping_tracking_number ?? currentOrder.shipping_tracking_number,
      shippingTrackingUrl: updateData.shipping_tracking_url ?? currentOrder.shipping_tracking_url,
      shippingDispatchedAt: finalDispatchedAt,
      shippingEstimatedDelivery: updateData.shipping_estimated_delivery ?? currentOrder.shipping_estimated_delivery,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error processing shipping update.' },
      { status: 500 }
    );
  }
}
