import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VEL-${dateStr}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: false, error: 'Database is not configured in the environment.' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required. Please sign in to complete your purchase.' }, { status: 401 });
    }

    const { data: tokenUserData, error: tokenErr } = await defaultSupabase.auth.getUser(token);
    const user = tokenUserData?.user;

    if (tokenErr || !user) {
      return NextResponse.json({ success: false, error: 'Your session is invalid or expired. Please sign in again.' }, { status: 401 });
    }

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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cannot create order: your shopping bag is empty.' }, { status: 400 });
    }

    const shippingDetails = {
      fullName: rawAddress?.fullName || '',
      email: rawAddress?.email || customerEmail,
      phone: rawAddress?.phone || customerPhone,
      addressLine: rawAddress?.addressLine || rawAddress?.addressLine1 || '',
      city: rawAddress?.city || '',
      state: rawAddress?.state || '',
      pincode: rawAddress?.pincode || rawAddress?.postalCode || '',
      country: rawAddress?.country || 'India',
    };

    if (!shippingDetails.fullName.trim() || !shippingDetails.addressLine.trim() || !shippingDetails.city.trim() || !shippingDetails.state.trim() || !shippingDetails.pincode.trim()) {
      return NextResponse.json({ success: false, error: 'Please complete all required shipping address fields.' }, { status: 400 });
    }

    const productIds = items.map((i: any) => i.productId);
    const [productsRes, inventoryRes] = await Promise.all([
      userSupabase.from('products').select('id, name, slug, price, is_published, in_stock, image_url, image').in('id', productIds),
      userSupabase.from('inventory').select('product_id, quantity, reserved_quantity, low_stock_threshold').in('product_id', productIds),
    ]);

    if (productsRes.error || !productsRes.data) {
      return NextResponse.json({ success: false, error: 'Failed to verify catalog items from database.' }, { status: 500 });
    }

    const productsMap = new Map<string, any>(productsRes.data.map((p: any) => [p.id, p]));
    const inventoryMap = new Map<string, any>((inventoryRes.data || []).map((inv: any) => [inv.product_id, inv]));

    let calculatedSubtotal = 0;
    const validatedItems: { productId: string; productName: string; unitPrice: number; quantity: number; lineTotal: number; productImage?: string }[] = [];

    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product) return NextResponse.json({ success: false, error: 'One of the selected items is no longer available in our catalog.' }, { status: 400 });
      if (product.is_published === false) return NextResponse.json({ success: false, error: `"${product.name}" is currently unavailable for purchase.` }, { status: 400 });

      const requestedQty = Math.floor(Number(item.quantity));
      if (isNaN(requestedQty) || requestedQty <= 0) return NextResponse.json({ success: false, error: `Invalid item quantity for "${product.name}".` }, { status: 400 });

      const inv = inventoryMap.get(product.id);
      if (inv) {
        const onHand = Number(inv.quantity ?? 0);
        const reserved = Number(inv.reserved_quantity ?? 0);
        const available = Math.max(0, onHand - reserved);
        if (requestedQty > available) {
          return NextResponse.json({ success: false, error: `Insufficient stock for "${product.name}". Only ${available} units available (Requested: ${requestedQty}).` }, { status: 400 });
        }
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * requestedQty;
      calculatedSubtotal += lineTotal;
      validatedItems.push({ productId: product.id, productName: product.name, unitPrice, quantity: requestedQty, lineTotal, productImage: product.image_url || product.image });
    }

    const shippingFee = 0;
    const discountAmount = 0;
    const finalTotal = calculatedSubtotal + shippingFee - discountAmount;
    const orderNumber = generateOrderNumber();

    const { data: orderRow, error: orderError } = await userSupabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: shippingDetails.fullName.trim(),
        customer_email: (shippingDetails.email || customerEmail).trim(),
        customer_phone: (shippingDetails.phone || customerPhone || '').trim() || null,
        shipping_name: shippingDetails.fullName.trim(),
        shipping_address: shippingDetails.addressLine.trim(),
        shipping_address_line1: shippingDetails.addressLine.trim(),
        shipping_city: shippingDetails.city.trim(),
        shipping_state: shippingDetails.state.trim(),
        shipping_postal_code: shippingDetails.pincode.trim(),
        shipping_country: shippingDetails.country?.trim() || 'India',
        shipping_phone: shippingDetails.phone.trim(),
        subtotal: calculatedSubtotal,
        discount: discountAmount,
        shipping_fee: shippingFee,
        total_amount: finalTotal,
        status: 'pending',
        order_status: 'pending',
        payment_status: 'pending',
        payment_method: 'razorpay',
      })
      .select()
      .single();

    if (orderError || !orderRow) {
      console.error('Order insert error:', orderError);
      return NextResponse.json({ success: false, error: `Failed to create order record: ${orderError?.message || 'Unknown database error'}` }, { status: 500 });
    }

    const orderItems = validatedItems.map((item) => ({
      order_id: orderRow.id,
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      total_price: item.lineTotal,
    }));

    const { error: orderItemsError } = await userSupabase.from('order_items').insert(orderItems);
    if (orderItemsError) {
      console.error('Order items insert error:', orderItemsError);
      return NextResponse.json({ success: false, error: `Failed to create order items: ${orderItemsError.message}` }, { status: 500 });
    }

    try {
      await userSupabase.from('cart_items').delete().eq('user_id', customerId);
    } catch (err) {
      console.warn('Cart cleanup warning:', err);
    }

    try {
      await userSupabase.from('audit_logs').insert({
        action: 'order_created',
        user_id: customerId,
        metadata: { order_id: orderRow.id, order_number: orderNumber, total_amount: finalTotal },
      });
    } catch (err) {
      console.warn('Audit log warning:', err);
    }

    return NextResponse.json({ success: true, orderId: orderRow.id, orderNumber, totalAmount: finalTotal, paymentStatus: 'pending' });
  } catch (error: any) {
    console.error('Create order API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create order.' }, { status: 500 });
  }
}
