import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  isRazorpayConfigured,
  createRazorpayOrder,
  getRazorpayKeyId,
} from '@/lib/razorpay';

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VEL-${dateStr}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured in the environment.' },
        { status: 503 }
      );
    }

    // 1. Verify authenticated user
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to complete your purchase.' },
        { status: 401 }
      );
    }

    const { data: tokenUserData, error: tokenErr } = await defaultSupabase.auth.getUser(token);
    const user = tokenUserData?.user;

    if (tokenErr || !user) {
      return NextResponse.json(
        { success: false, error: 'Your session is invalid or expired. Please sign in again.' },
        { status: 401 }
      );
    }

    // Authenticated user-scoped Supabase client preserving RLS auth.uid()
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const customerId = user.id;
    const customerEmail = user.email || '';
    const customerPhone = user.phone || '';
    const body = await req.json();
    const { items } = body;
    const rawAddress = body.shippingAddress || body.shippingDetails;

    // 2. Validate payload items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot create order: your shopping bag is empty.' },
        { status: 400 }
      );
    }

    // 3. Validate shipping details
    const shippingDetails = {
      fullName: (rawAddress?.fullName || '').trim(),
      email: (rawAddress?.email || customerEmail).trim(),
      phone: (rawAddress?.phone || customerPhone || '').trim(),
      addressLine: (rawAddress?.addressLine || rawAddress?.addressLine1 || '').trim(),
      city: (rawAddress?.city || '').trim(),
      state: (rawAddress?.state || '').trim(),
      pincode: (rawAddress?.pincode || rawAddress?.postalCode || '').trim(),
      country: (rawAddress?.country || 'India').trim(),
    };

    if (
      !shippingDetails.fullName ||
      !shippingDetails.phone ||
      !shippingDetails.addressLine ||
      !shippingDetails.city ||
      !shippingDetails.state ||
      !shippingDetails.pincode
    ) {
      return NextResponse.json(
        { success: false, error: 'Please complete all required delivery address and contact fields.' },
        { status: 400 }
      );
    }

    // 4. Fetch authoritative product prices and inventory availability
    const productIds = items.map((i: any) => i.productId);
    const [productsRes, inventoryRes] = await Promise.all([
      userSupabase
        .from('products')
        .select('id, name, slug, price, is_published, in_stock, image_url, image')
        .in('id', productIds),
      userSupabase
        .from('inventory')
        .select('product_id, quantity, reserved_quantity, low_stock_threshold')
        .in('product_id', productIds),
    ]);

    if (productsRes.error || !productsRes.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify catalog items from database.' },
        { status: 500 }
      );
    }

    const productsMap = new Map<string, any>(productsRes.data.map((p: any) => [p.id, p]));
    const inventoryMap = new Map<string, any>((inventoryRes.data || []).map((inv: any) => [inv.product_id, inv]));

    let calculatedSubtotal = 0;
    const validatedItems: {
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      productImage?: string;
    }[] = [];

    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'One of the selected items is no longer available in our catalog.' },
          { status: 400 }
        );
      }

      if (product.is_published === false) {
        return NextResponse.json(
          { success: false, error: `"${product.name}" is currently unavailable for purchase.` },
          { status: 400 }
        );
      }

      const requestedQty = Math.floor(Number(item.quantity));
      if (isNaN(requestedQty) || requestedQty <= 0) {
        return NextResponse.json(
          { success: false, error: `Invalid item quantity for "${product.name}".` },
          { status: 400 }
        );
      }

      const inv = inventoryMap.get(product.id);
      if (inv) {
        const onHand = Number(inv.quantity ?? 0);
        const reserved = Number(inv.reserved_quantity ?? 0);
        const available = Math.max(0, onHand - reserved);
        if (requestedQty > available) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for "${product.name}". Only ${available} unit(s) available (Requested: ${requestedQty}).`,
            },
            { status: 400 }
          );
        }
      }

      const unitPrice = Number(product.price);
      const lineSubtotal = unitPrice * requestedQty;
      calculatedSubtotal += lineSubtotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: requestedQty,
        subtotal: lineSubtotal,
        productImage: product.image_url || product.image,
      });
    }

    const shippingFee = 0;
    const finalTotal = calculatedSubtotal + shippingFee;
    const orderNumber = generateOrderNumber();

    let createdOrderId: string | null = null;

    // 5. Attempt atomic RPC: create_order_with_items
    const rpcItems = validatedItems.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    const { data: rpcData, error: rpcError } = await userSupabase.rpc('create_order_with_items', {
      p_order_number: orderNumber,
      p_customer_id: customerId,
      p_customer_name: shippingDetails.fullName,
      p_customer_email: shippingDetails.email,
      p_customer_phone: shippingDetails.phone,
      p_shipping_name: shippingDetails.fullName,
      p_shipping_address: shippingDetails.addressLine,
      p_shipping_address_line1: shippingDetails.addressLine,
      p_shipping_city: shippingDetails.city,
      p_shipping_state: shippingDetails.state,
      p_shipping_postal_code: shippingDetails.pincode,
      p_shipping_country: shippingDetails.country,
      p_shipping_phone: shippingDetails.phone,
      p_subtotal: calculatedSubtotal,
      p_discount: 0,
      p_shipping_fee: shippingFee,
      p_total_amount: finalTotal,
      p_items: rpcItems,
    });

    if (!rpcError && rpcData && rpcData.order_id) {
      createdOrderId = rpcData.order_id;
    } else {
      // Fallback: Direct insert with compensating cleanup and stock reservation
      if (rpcError) {
        console.warn('RPC create_order_with_items unavailable, using safe direct insert fallback:', rpcError.message);
      }

      // 5a. Reserve stock on inventory table
      for (const item of validatedItems) {
        const inv = inventoryMap.get(item.productId);
        if (inv) {
          const currentReserved = Number(inv.reserved_quantity ?? 0);
          await userSupabase
            .from('inventory')
            .update({
              reserved_quantity: currentReserved + item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('product_id', item.productId);
        }
      }

      // 5b. Insert orders row
      const { data: orderRow, error: orderError } = await userSupabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          customer_name: shippingDetails.fullName,
          customer_email: shippingDetails.email,
          customer_phone: shippingDetails.phone || null,
          shipping_name: shippingDetails.fullName,
          shipping_address: shippingDetails.addressLine,
          shipping_address_line1: shippingDetails.addressLine,
          shipping_city: shippingDetails.city,
          shipping_state: shippingDetails.state,
          shipping_postal_code: shippingDetails.pincode,
          shipping_country: shippingDetails.country,
          shipping_phone: shippingDetails.phone,
          subtotal: calculatedSubtotal,
          discount: 0,
          discount_amount: 0,
          shipping_fee: shippingFee,
          shipping_amount: shippingFee,
          total_amount: finalTotal,
          status: 'pending',
          order_status: 'pending',
          payment_status: 'pending',
          payment_method: 'razorpay',
        })
        .select('id')
        .single();

      if (orderError || !orderRow) {
        console.error('Order insert error:', orderError);
        return NextResponse.json(
          { success: false, error: `Failed to create order record: ${orderError?.message || 'Database error'}` },
          { status: 500 }
        );
      }

      createdOrderId = orderRow.id;

      // 5c. Insert order_items with canonical subtotal
      const orderItemsToInsert = validatedItems.map((item) => ({
        order_id: createdOrderId,
        product_id: item.productId,
        product_name: item.productName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      const { error: orderItemsError } = await userSupabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        console.error('Order items insert error, initiating rollback:', orderItemsError);
        // Atomicity rollback: delete orphan order
        await userSupabase.from('orders').delete().eq('id', createdOrderId);

        // Release reserved stock
        for (const item of validatedItems) {
          const inv = inventoryMap.get(item.productId);
          if (inv) {
            const currentReserved = Number(inv.reserved_quantity ?? 0);
            await userSupabase
              .from('inventory')
              .update({
                reserved_quantity: Math.max(0, currentReserved),
                updated_at: new Date().toISOString(),
              })
              .eq('product_id', item.productId);
          }
        }

        return NextResponse.json(
          { success: false, error: `Failed to record order items: ${orderItemsError.message}` },
          { status: 500 }
        );
      }
    }

    // 6. Record audit log
    try {
      await userSupabase.from('audit_logs').insert({
        action: 'ORDER_CREATED',
        entity_type: 'orders',
        entity_id: createdOrderId,
        user_id: customerId,
        details: {
          order_id: createdOrderId,
          order_number: orderNumber,
          total_amount: finalTotal,
          item_count: validatedItems.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: Audit log skipped:', auditErr);
    }

    // 7. Gateway Razorpay order creation (if credentials configured)
    let razorpayOrderId: string | null = null;
    let razorpayConfigured = false;

    if (isRazorpayConfigured()) {
      const rzResult = await createRazorpayOrder({
        amount: Math.round(finalTotal * 100), // in paise
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          velora_order_id: createdOrderId!,
          customer_email: shippingDetails.email,
        },
      });

      if (rzResult.order && rzResult.order.id) {
        razorpayOrderId = rzResult.order.id;
        razorpayConfigured = true;

        // Store razorpay_order_id on order record
        await userSupabase
          .from('orders')
          .update({ razorpay_order_id: razorpayOrderId })
          .eq('id', createdOrderId);
      } else {
        console.warn('Notice: Razorpay order creation warning:', rzResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: createdOrderId,
      orderNumber,
      totalAmount: finalTotal,
      subtotal: calculatedSubtotal,
      shippingFee,
      discount: 0,
      paymentStatus: 'pending',
      razorpayConfigured,
      razorpayOrderId,
      razorpayKeyId: razorpayConfigured ? getRazorpayKeyId() : null,
      currency: 'INR',
      amountInPaise: Math.round(finalTotal * 100),
    });
  } catch (error: any) {
    console.error('Create order API fatal error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to complete order processing.' },
      { status: 500 }
    );
  }
}
