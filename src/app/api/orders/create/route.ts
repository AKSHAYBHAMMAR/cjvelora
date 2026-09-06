import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
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
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

    let supabase = defaultSupabase;

    if (authHeader) {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Also support user session passed in verified client context if authHeader is absent
    const body = await req.json();
    const customerId = user?.id || body.customerId;

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please sign in to an authorized client account to complete checkout.',
        },
        { status: 401 }
      );
    }

    const customerEmail = user?.email || body.shippingDetails?.email || '';

    // 2. Validate request payload
    const { items } = body;
    const rawAddress = body.shippingAddress || body.shippingDetails;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot create order: your shopping bag is empty.' },
        { status: 400 }
      );
    }

    const shippingDetails = {
      fullName: rawAddress?.fullName || '',
      email: rawAddress?.email || customerEmail,
      phone: rawAddress?.phone || '',
      addressLine: rawAddress?.addressLine || rawAddress?.addressLine1 || '',
      city: rawAddress?.city || '',
      state: rawAddress?.state || '',
      pincode: rawAddress?.pincode || rawAddress?.postalCode || '',
      country: rawAddress?.country || 'India',
    };

    if (
      !shippingDetails.fullName.trim() ||
      !shippingDetails.addressLine.trim() ||
      !shippingDetails.city.trim() ||
      !shippingDetails.state.trim() ||
      !shippingDetails.pincode.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'Please complete all required shipping address fields.' },
        { status: 400 }
      );
    }

    // 3. Load product and inventory rows from Supabase
    const productIds = items.map((i: any) => i.productId);

    const [productsRes, inventoryRes] = await Promise.all([
      defaultSupabase
        .from('products')
        .select('id, name, slug, price, is_published, in_stock, image_url, image')
        .in('id', productIds),
      defaultSupabase
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
    const inventoryMap = new Map<string, any>(
      (inventoryRes.data || []).map((inv: any) => [inv.product_id, inv])
    );

    // 4. Validate products and stock availability server-side
    let calculatedSubtotal = 0;
    const validatedItems: {
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      productImage?: string;
    }[] = [];

    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: `One of the selected items is no longer available in our catalog.` },
          { status: 400 }
        );
      }

      // Check published status
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

      // Check stock availability
      const inv = inventoryMap.get(product.id);
      if (inv) {
        const onHand = Number(inv.quantity ?? 0);
        const reserved = Number(inv.reserved_quantity ?? 0);
        const available = Math.max(0, onHand - reserved);

        if (requestedQty > available) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for "${product.name}". Only ${available} units available (Requested: ${requestedQty}).`,
            },
            { status: 400 }
          );
        }
      }

      // Calculate server-side prices
      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * requestedQty;
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: requestedQty,
        lineTotal,
        productImage: product.image_url || product.image,
      });
    }

    // 5. Calculate final financial figures server-side (Complimentary express delivery)
    const shippingFee = 0;
    const discountAmount = 0;
    const finalTotal = calculatedSubtotal + shippingFee - discountAmount;

    // 6. Generate collision-resistant unique order number
    const orderNumber = generateOrderNumber();

    // 7. Create orders record in Supabase
    const { data: orderRow, error: orderError } = await defaultSupabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: shippingDetails.fullName.trim(),
        customer_email: (shippingDetails.email || customerEmail).trim(),
        customer_phone: shippingDetails.phone?.trim() || null,
        shipping_name: shippingDetails.fullName.trim(),
        shipping_address: shippingDetails.addressLine.trim(),
        shipping_city: shippingDetails.city.trim(),
        shipping_state: shippingDetails.state.trim(),
        shipping_postal_code: shippingDetails.pincode.trim(),
        shipping_country: shippingDetails.country?.trim() || 'India',
        subtotal: calculatedSubtotal,
        discount: discountAmount,
        shipping_fee: shippingFee,
        total_amount: finalTotal,
        status: 'pending',
        order_status: 'pending',
        payment_status: 'pending',
        payment_method: 'razorpay',
      })
      .select('id, order_number, total_amount')
      .single();

    if (orderError || !orderRow) {
      return NextResponse.json(
        { success: false, error: `Failed to create order record: ${orderError?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    // 8. Create order_items snapshot records
    const orderItemRows = validatedItems.map((v) => ({
      order_id: orderRow.id,
      product_id: v.productId,
      product_name: v.productName,
      unit_price: v.unitPrice,
      quantity: v.quantity,
      line_total: v.lineTotal,
    }));

    const { error: itemsInsertError } = await defaultSupabase
      .from('order_items')
      .insert(orderItemRows);

    if (itemsInsertError) {
      // Atomicity guard: clean up order header if items failed
      await defaultSupabase.from('orders').delete().eq('id', orderRow.id);
      return NextResponse.json(
        { success: false, error: `Failed to record order items: ${itemsInsertError.message}` },
        { status: 500 }
      );
    }

    // 9. Clear user's active cart in Supabase if cart exists
    try {
      const { data: userCart } = await defaultSupabase
        .from('carts')
        .select('id')
        .eq('user_id', customerId)
        .maybeSingle();

      if (userCart) {
        await defaultSupabase.from('cart_items').delete().eq('cart_id', userCart.id);
      }
    } catch (cartCleanErr) {
      console.warn('Notice: cart cleanup notice:', cartCleanErr);
    }

    // 10. Record audit entry
    try {
      await defaultSupabase.from('audit_logs').insert({
        user_id: customerId,
        action: 'CUSTOMER_ORDER_CREATED',
        entity_type: 'orders',
        entity_id: orderRow.id,
        details: {
          order_number: orderRow.order_number,
          total_amount: finalTotal,
          item_count: validatedItems.length,
          payment_method: 'razorpay',
          status: 'pending',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Notice: Could not record audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: orderRow.order_number,
      orderId: orderRow.id,
      total: finalTotal,
      subtotal: calculatedSubtotal,
      shippingFee,
      discount: discountAmount,
      status: 'pending',
      paymentStatus: 'pending',
      message: 'Order created successfully and awaiting payment.',
    });
  } catch (err: any) {
    console.error('Fatal order creation error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'An unexpected error occurred during order creation.' },
      { status: 500 }
    );
  }
}
