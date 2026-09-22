import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

/**
 * PATCH /api/admin/products/[productId]/publish
 * Toggles or sets the published status for a product.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const productId = params.productId;
    const body = await req.json().catch(() => ({}));

    // If explicit `isPublished` is passed in body, use it; otherwise toggle current
    let targetStatus: boolean;

    if (body.isPublished !== undefined) {
      targetStatus = Boolean(body.isPublished);
    } else {
      const { data: current, error: fetchErr } = await db
        .from('products')
        .select('is_published')
        .eq('id', productId)
        .maybeSingle();

      if (fetchErr || !current) {
        return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
      }

      targetStatus = !current.is_published;
    }

    const { data: updated, error: updateErr } = await db
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
