import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';
import { Discount } from '@/types';

/**
 * Authenticates incoming requests via Supabase Bearer JWT
 * and verifies administrator privileges against `admin_roles`.
 */
async function authenticateAdmin(
  req: NextRequest
): Promise<{ admin: AdminProfile | null; error: string | null; status: number }> {
  if (!isSupabaseConfigured) {
    return { admin: null, error: 'Database is not configured in the environment.', status: 503 };
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { admin: null, error: 'Unauthorized: Missing authentication token.', status: 401 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { admin: null, error: 'Unauthorized: Invalid or expired session token.', status: 401 };
  }

  const role = await verifyAdminRole(user.id, user.email);
  if (!role) {
    return { admin: null, error: 'Forbidden: Administrator privileges required.', status: 403 };
  }

  return { admin: { id: user.id, email: user.email || '', role }, error: null, status: 200 };
}

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
 * PATCH /api/admin/discounts/[discountId]
 * Updates discount properties.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { discountId: string } }
) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const discountId = params.discountId;
    if (!discountId) {
      return NextResponse.json({ success: false, error: 'Discount ID is required.' }, { status: 400 });
    }

    // 1. Check existing record
    const { data: existing, error: fetchErr } = await supabase
      .from('discounts')
      .select('*')
      .eq('id', discountId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: 'Discount not found.' }, { status: 404 });
    }

    const body = await req.json();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    // 2. Code check & uniqueness
    if (body.code !== undefined && body.code !== null) {
      const cleanedCode = String(body.code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!cleanedCode) {
        return NextResponse.json({ success: false, error: 'Invalid discount code.' }, { status: 400 });
      }

      if (cleanedCode !== existing.code.toUpperCase()) {
        const { data: conflict } = await supabase
          .from('discounts')
          .select('id')
          .ilike('code', cleanedCode)
          .neq('id', discountId)
          .maybeSingle();

        if (conflict) {
          return NextResponse.json(
            { success: false, error: `A discount with code "${cleanedCode}" already exists.` },
            { status: 409 }
          );
        }
        updatePayload.code = cleanedCode;
      }
    }

    if (body.description !== undefined) {
      updatePayload.description = body.description ? String(body.description).trim() : null;
    }

    const newType = body.discountType !== undefined ? body.discountType : existing.discount_type;
    if (body.discountType !== undefined) {
      updatePayload.discount_type = newType === 'fixed_amount' ? 'fixed_amount' : 'percentage';
    }

    if (body.discountValue !== undefined) {
      const val = Number(body.discountValue);
      if (isNaN(val) || val <= 0) {
        return NextResponse.json({ success: false, error: 'Discount value must be greater than 0.' }, { status: 400 });
      }
      if (newType === 'percentage' && val > 100) {
        return NextResponse.json({ success: false, error: 'Percentage discount cannot exceed 100%.' }, { status: 400 });
      }
      updatePayload.discount_value = val;
    }

    if (body.minimumOrderAmount !== undefined) {
      updatePayload.minimum_order_amount = Math.max(0, Number(body.minimumOrderAmount) || 0);
    }

    if (body.maximumDiscountAmount !== undefined) {
      if (body.maximumDiscountAmount === null || String(body.maximumDiscountAmount).trim() === '') {
        updatePayload.maximum_discount_amount = null;
      } else {
        const maxVal = Number(body.maximumDiscountAmount);
        if (isNaN(maxVal) || maxVal <= 0) {
          return NextResponse.json({ success: false, error: 'Maximum discount amount must be greater than 0.' }, { status: 400 });
        }
        updatePayload.maximum_discount_amount = maxVal;
      }
    }

    if (body.startAt !== undefined) {
      updatePayload.start_at = new Date(body.startAt).toISOString();
    }

    if (body.endAt !== undefined) {
      if (!body.endAt || String(body.endAt).trim() === '') {
        updatePayload.end_at = null;
      } else {
        const parsedEnd = new Date(body.endAt);
        const refStart = updatePayload.start_at || existing.start_at;
        if (parsedEnd.getTime() < new Date(refStart).getTime()) {
          return NextResponse.json({ success: false, error: 'End date cannot be earlier than start date.' }, { status: 400 });
        }
        updatePayload.end_at = parsedEnd.toISOString();
      }
    }

    if (body.usageLimit !== undefined) {
      if (body.usageLimit === null || String(body.usageLimit).trim() === '') {
        updatePayload.usage_limit = null;
      } else {
        const parsedLimit = parseInt(String(body.usageLimit), 10);
        if (isNaN(parsedLimit) || parsedLimit < 0) {
          return NextResponse.json({ success: false, error: 'Usage limit cannot be negative.' }, { status: 400 });
        }
        updatePayload.usage_limit = parsedLimit;
      }
    }

    if (body.perCustomerLimit !== undefined) {
      if (body.perCustomerLimit === null || String(body.perCustomerLimit).trim() === '') {
        updatePayload.per_customer_limit = null;
      } else {
        const parsedCustLimit = parseInt(String(body.perCustomerLimit), 10);
        if (isNaN(parsedCustLimit) || parsedCustLimit < 1) {
          return NextResponse.json({ success: false, error: 'Per-customer limit must be at least 1.' }, { status: 400 });
        }
        updatePayload.per_customer_limit = parsedCustLimit;
      }
    }

    if (body.active !== undefined) {
      updatePayload.active = Boolean(body.active);
    }

    // 3. Update database
    const { data: updated, error: updateErr } = await supabase
      .from('discounts')
      .update(updatePayload)
      .eq('id', discountId)
      .select()
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: `Failed to update discount: ${updateErr?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: mapRowToDiscount(updated),
    });
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/admin/discounts/[discountId]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error updating discount.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/discounts/[discountId]
 * Deletion safety:
 * Checks whether this discount has order usage history.
 * If used: blocks hard deletion and suggests deactivation.
 * If unused: permanently deletes discount.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { discountId: string } }
) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const discountId = params.discountId;
    if (!discountId) {
      return NextResponse.json({ success: false, error: 'Discount ID is required.' }, { status: 400 });
    }

    // 1. Fetch discount
    const { data: discount, error: fetchErr } = await supabase
      .from('discounts')
      .select('*')
      .eq('id', discountId)
      .maybeSingle();

    if (fetchErr || !discount) {
      return NextResponse.json({ success: false, error: 'Discount not found.' }, { status: 404 });
    }

    // 2. Check usage count and discount_usages records
    const [usageTableCountRes, orderUsageCountRes] = await Promise.all([
      supabase
        .from('discount_usages')
        .select('id', { count: 'exact', head: true })
        .eq('discount_id', discountId),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('discount_code', discount.code),
    ]);

    const totalUsageRecords = Math.max(
      Number(discount.usage_count ?? 0),
      usageTableCountRes.count || 0,
      orderUsageCountRes.count || 0
    );

    if (totalUsageRecords > 0) {
      return NextResponse.json(
        {
          success: false,
          hasUsage: true,
          usageCount: totalUsageRecords,
          message: `Cannot delete coupon "${discount.code}". It has been used in ${totalUsageRecords} order(s). Hard-deleting would damage historical financial audits. Please deactivate it instead so it can no longer be used by customers.`,
          error: `Safety Guard: Coupon "${discount.code}" has ${totalUsageRecords} historical uses. Deletion is blocked to preserve order records.`,
        },
        { status: 409 }
      );
    }

    // 3. Unused discount: Safe to delete
    const { error: deleteErr } = await supabase
      .from('discounts')
      .delete()
      .eq('id', discountId);

    if (deleteErr) {
      return NextResponse.json(
        { success: false, error: `Failed to delete discount: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      message: `Discount coupon "${discount.code}" was permanently removed.`,
    });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/admin/discounts/[discountId]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error deleting discount.' },
      { status: 500 }
    );
  }
}
