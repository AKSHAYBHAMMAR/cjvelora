import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { calculateDiscountAmount } from '@/lib/discounts';

/**
 * POST /api/discounts/validate
 * Validates a coupon code server-side and calculates exact discount amount for checkout.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { valid: false, error: 'Discount service is not available.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { code, subtotal, customerEmail, customerId } = body;

    if (!code || !String(code).trim()) {
      return NextResponse.json(
        { valid: false, error: 'Please enter a coupon code.' },
        { status: 400 }
      );
    }

    const cleanedCode = String(code).trim().toUpperCase();
    const orderSubtotal = Number(subtotal);

    if (isNaN(orderSubtotal) || orderSubtotal <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Your shopping bag subtotal must be greater than zero.' },
        { status: 400 }
      );
    }

    // 1. Fetch coupon record from Supabase
    const { data: discount, error } = await supabase
      .from('discounts')
      .select('*')
      .ilike('code', cleanedCode)
      .maybeSingle();

    if (error || !discount) {
      return NextResponse.json(
        { valid: false, error: `Coupon code "${cleanedCode}" does not exist.` },
        { status: 404 }
      );
    }

    // 2. Check if active
    if (!discount.active) {
      return NextResponse.json(
        { valid: false, error: `Coupon "${cleanedCode}" is currently inactive.` },
        { status: 400 }
      );
    }

    // 3. Date validity check
    const now = new Date();
    if (discount.start_at && new Date(discount.start_at).getTime() > now.getTime()) {
      return NextResponse.json(
        { valid: false, error: `Coupon "${cleanedCode}" is not yet active.` },
        { status: 400 }
      );
    }

    if (discount.end_at && new Date(discount.end_at).getTime() < now.getTime()) {
      return NextResponse.json(
        { valid: false, error: `Coupon "${cleanedCode}" has expired.` },
        { status: 400 }
      );
    }

    // 4. Minimum order check
    const minOrder = Number(discount.minimum_order_amount ?? 0);
    if (orderSubtotal < minOrder) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount of ₹${minOrder.toLocaleString('en-IN')} required to apply coupon "${cleanedCode}".`,
        },
        { status: 400 }
      );
    }

    // 5. Total usage limit check
    if (discount.usage_limit !== null && discount.usage_limit !== undefined) {
      const usageLimit = Number(discount.usage_limit);
      const usageCount = Number(discount.usage_count ?? 0);
      if (usageCount >= usageLimit) {
        return NextResponse.json(
          { valid: false, error: `Coupon "${cleanedCode}" has reached its maximum usage limit.` },
          { status: 400 }
        );
      }
    }

    // 6. Per-customer limit check
    if (discount.per_customer_limit && (customerEmail || customerId)) {
      const custLimit = Number(discount.per_customer_limit);
      let customerUsageCount = 0;

      if (customerEmail) {
        const { count, error: usageErr } = await supabase
          .from('discount_usages')
          .select('id', { count: 'exact', head: true })
          .eq('discount_id', discount.id)
          .eq('customer_email', String(customerEmail).trim().toLowerCase());

        if (!usageErr && typeof count === 'number') {
          customerUsageCount = count;
        } else {
          // Fallback to checking orders table
          const { count: orderCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('discount_code', cleanedCode)
            .ilike('customer_email', String(customerEmail).trim());

          if (typeof orderCount === 'number') {
            customerUsageCount = orderCount;
          }
        }
      }

      if (customerUsageCount >= custLimit) {
        return NextResponse.json(
          {
            valid: false,
            error: `You have already used coupon "${cleanedCode}" the maximum allowed number of times (${custLimit}).`,
          },
          { status: 400 }
        );
      }
    }

    // 7. Calculate discount amount
    const discountAmount = calculateDiscountAmount(
      {
        discountType: discount.discount_type,
        discountValue: Number(discount.discount_value),
        maximumDiscountAmount: discount.maximum_discount_amount
          ? Number(discount.maximum_discount_amount)
          : null,
      },
      orderSubtotal
    );

    const finalTotal = Math.max(0, orderSubtotal - discountAmount);

    return NextResponse.json({
      valid: true,
      discount: {
        id: String(discount.id),
        code: String(discount.code).toUpperCase(),
        description: String(discount.description || ''),
        discountType: discount.discount_type,
        discountValue: Number(discount.discount_value),
      },
      discountAmount,
      finalTotal,
      message: `Coupon "${cleanedCode}" applied successfully! You saved ₹${discountAmount.toLocaleString('en-IN')}.`,
    });
  } catch (err: any) {
    console.error('Unexpected error validating coupon:', err);
    return NextResponse.json(
      { valid: false, error: err?.message || 'Error occurred while validating coupon.' },
      { status: 500 }
    );
  }
}
