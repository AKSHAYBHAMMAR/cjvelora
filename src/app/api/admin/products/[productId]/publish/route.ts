import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole } from '@/lib/auth';

/**
 * PATCH /api/admin/products/[productId]/publish
 * Toggles or sets the published status for a product.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: false, error: 'Database not configured.' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
    }

    const role = await verifyAdminRole(user.id, user.email);
    if (!role) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    const productId = params.productId;
    const body = await req.json().catch(() => ({}));

    // If explicit `isPublished` is passed in body, use it; otherwise toggle current
    let targetStatus: boolean;

    if (body.isPublished !== undefined) {
      targetStatus = Boolean(body.isPublished);
    } else {
      const { data: current, error: fetchErr } = await supabase
        .from('products')
        .select('is_published')
        .eq('id', productId)
        .maybeSingle();

      if (fetchErr || !current) {
        return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
      }

      targetStatus = !current.is_published;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('products')
      .update({ is_published: targetStatus })
      .eq('id', productId)
      .select('id, name, is_published')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: updateErr?.message || 'Failed to update publish status.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: updated,
      isPublished: updated.is_published,
      message: `Product is now ${updated.is_published ? 'Published (Live)' : 'Unpublished (Draft)'}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
