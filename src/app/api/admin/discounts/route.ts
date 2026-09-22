import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { Discount } from '@/types';

function mapRowToDiscount(row: any): Discount {
  return {
    id: String(row.id),
    code: String(row.code || '').toUpperCase(),
    description: String(row.description || ''),
    discountType: row.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
    discountValue: Number(row.discount_value ?? 0),
    minimumOrderAmount: Number(row.minimum_order_amount ?? 0),
    maximumDiscountAmount:
      row.maximum_discount_amount !== null && row.maximum_discount_amount !== undefined
        ? Number(row.maximum_discount_amount)
        : null,
    startAt: row.start_at || new Date().toISOString(),
    endAt: row.end_at || null,
    usageLimit:
      row.usage_limit !== null && row.usage_limit !== undefined
        ? Number(row.usage_limit)
        : null,
    usageCount: Number(row.usage_count ?? 0),
    perCustomerLimit:
      row.per_customer_limit !== null && row.per_customer_limit !== undefined
        ? Number(row.per_customer_limit)
        : 1,
    active: row.active !== undefined ? Boolean(row.active) : true,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

/**
 * GET /api/admin/discounts
 * Retrieves all discounts ordered by created_at DESC.
 */
export async function GET(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const { data, error } = await db
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to query discounts: ${error.message}` },
        { status: 500 }
      );
    }

    const discounts: Discount[] = (data || []).map(mapRowToDiscount);

    return NextResponse.json({
      success: true,
      discounts,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/discounts:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error fetching discounts.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/discounts
 * Creates a new discount with validations.
 */
export async function POST(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      startAt,
      endAt,
      usageLimit,
      perCustomerLimit,
      active,
    } = body;

    // 1. Code Validation
    if (!code || !String(code).trim()) {
      return NextResponse.json({ success: false, error: 'Discount code is required.' }, { status: 400 });
    }

    const cleanedCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanedCode) {
      return NextResponse.json({ success: false, error: 'Invalid discount code format.' }, { status: 400 });
    }

    // Uniqueness check
    const { data: existingCode } = await db
      .from('discounts')
      .select('id')
      .ilike('code', cleanedCode)
      .maybeSingle();

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Discount code "${cleanedCode}" already exists. Please choose a unique code.` },
        { status: 409 }
      );
    }

    // 2. Type & Value Validation
    const type = discountType === 'fixed_amount' ? 'fixed_amount' : 'percentage';
    const valueNum = Number(discountValue);

    if (isNaN(valueNum) || valueNum <= 0) {
      return NextResponse.json({ success: false, error: 'Discount value must be greater than 0.' }, { status: 400 });
    }

    if (type === 'percentage' && valueNum > 100) {
      return NextResponse.json({ success: false, error: 'Percentage discount cannot exceed 100%.' }, { status: 400 });
    }

    // 3. Minimum & Maximum Amounts
    const minOrder = minimumOrderAmount !== undefined && minimumOrderAmount !== ''
      ? Math.max(0, Number(minimumOrderAmount) || 0)
      : 0;

    let maxDiscount: number | null = null;
    if (maximumDiscountAmount !== undefined && maximumDiscountAmount !== null && String(maximumDiscountAmount).trim() !== '') {
      const maxVal = Number(maximumDiscountAmount);
      if (isNaN(maxVal) || maxVal <= 0) {
        return NextResponse.json({ success: false, error: 'Maximum discount amount must be greater than 0.' }, { status: 400 });
      }
      maxDiscount = maxVal;
    }

    // 4. Dates Validation
    const startDate = startAt ? new Date(startAt).toISOString() : new Date().toISOString();
    let endDate: string | null = null;
    if (endAt && String(endAt).trim()) {
      const parsedEnd = new Date(endAt);
      if (isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid end date format.' }, { status: 400 });
      }
      if (parsedEnd.getTime() < new Date(startDate).getTime()) {
        return NextResponse.json({ success: false, error: 'End date cannot be earlier than start date.' }, { status: 400 });
      }
      endDate = parsedEnd.toISOString();
    }

    // 5. Usage Limits
    let usageLimitNum: number | null = null;
    if (usageLimit !== undefined && usageLimit !== null && String(usageLimit).trim() !== '') {
      const parsedLimit = parseInt(String(usageLimit), 10);
      if (isNaN(parsedLimit) || parsedLimit < 0) {
        return NextResponse.json({ success: false, error: 'Usage limit cannot be negative.' }, { status: 400 });
      }
      usageLimitNum = parsedLimit;
    }

    let perCustLimitNum: number | null = 1;
    if (perCustomerLimit !== undefined && perCustomerLimit !== null && String(perCustomerLimit).trim() !== '') {
      const parsedCustLimit = parseInt(String(perCustomerLimit), 10);
      if (isNaN(parsedCustLimit) || parsedCustLimit < 1) {
        return NextResponse.json({ success: false, error: 'Per-customer limit must be at least 1.' }, { status: 400 });
      }
      perCustLimitNum = parsedCustLimit;
    }

    // 6. Insert row
    const payload = {
      code: cleanedCode,
      description: description ? String(description).trim() : null,
      discount_type: type,
      discount_value: valueNum,
      minimum_order_amount: minOrder,
      maximum_discount_amount: maxDiscount,
      start_at: startDate,
      end_at: endDate,
      usage_limit: usageLimitNum,
      usage_count: 0,
      per_customer_limit: perCustLimitNum,
      active: active !== undefined ? Boolean(active) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insertErr } = await db
      .from('discounts')
      .insert(payload)
      .select()
      .single();

    if (insertErr || !created) {
      return NextResponse.json(
        { success: false, error: `Failed to create discount: ${insertErr?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: mapRowToDiscount(created),
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/discounts:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error creating discount.' },
      { status: 500 }
    );
  }
}
