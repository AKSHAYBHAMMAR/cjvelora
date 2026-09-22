import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/content/banners/[bannerId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { bannerId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const { bannerId } = params;
    const body = await req.json();

    const updateFields: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateFields.title = String(body.title).trim();
    if (body.description !== undefined) updateFields.description = String(body.description).trim();
    if (body.imageUrl !== undefined) updateFields.image_url = String(body.imageUrl).trim();
    if (body.ctaText !== undefined) updateFields.cta_text = String(body.ctaText).trim();
    if (body.ctaLink !== undefined) updateFields.cta_link = String(body.ctaLink).trim();
    if (body.active !== undefined) updateFields.active = Boolean(body.active);
    if (body.displayOrder !== undefined) updateFields.display_order = Number(body.displayOrder);
    if (body.startDate !== undefined) updateFields.start_date = body.startDate || null;
    if (body.endDate !== undefined) updateFields.end_date = body.endDate || null;

    if (body.badge !== undefined) updateFields.badge = String(body.badge).trim();
    if (body.discountType !== undefined) updateFields.discount_type = body.discountType;
    if (body.discountValue !== undefined) {
      const numVal = Number(body.discountValue ?? 0);
      if (isNaN(numVal) || numVal < 0 || numVal > 100) {
        return NextResponse.json(
          { success: false, error: 'Discount percentage must be between 0% and 100%.' },
          { status: 400 }
        );
      }
      updateFields.discount_value = numVal;
    }
    if (body.collectionId !== undefined) updateFields.collection_id = body.collectionId || null;
    if (body.collectionName !== undefined) updateFields.collection_name = body.collectionName ? String(body.collectionName).trim() : null;
    if (body.collectionSlug !== undefined) updateFields.collection_slug = body.collectionSlug ? String(body.collectionSlug).trim() : null;

    // If collection is provided and ctaLink not explicitly set, auto-derive cta_link and default cta_text
    if ((updateFields.collectionSlug || updateFields.collectionName) && !body.ctaLink) {
      const slug = (updateFields.collectionSlug || '').toLowerCase();
      const name = (updateFields.collectionName || '').toLowerCase();
      if (slug === 'new-arrivals' || name === 'new arrivals') {
        updateFields.cta_link = '/#shop';
      } else if (slug === 'bestsellers' || slug === 'most-loved' || name === 'bestsellers') {
        updateFields.cta_link = '/#most-loved';
      } else if (updateFields.collectionName) {
        updateFields.cta_link = `/?category=${encodeURIComponent(updateFields.collectionName)}#category-products-anchor`;
      }
      if (!updateFields.cta_text) {
        updateFields.cta_text = 'Explore Collection';
      }
    }

    const { data, error } = await db
      .from('promotional_banners')
      .update(updateFields)
      .eq('id', bannerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating promotional banner:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      banner: {
        id: data.id,
        title: data.title,
        description: data.description,
        imageUrl: data.image_url,
        ctaText: data.cta_text,
        ctaLink: data.cta_link,
        badge: data.badge || 'Limited Atelier Edition',
        discountType: (data.discount_type as any) || 'percentage',
        discountValue: Number(data.discount_value ?? 0),
        collectionId: data.collection_id || null,
        collectionName: data.collection_name || null,
        collectionSlug: data.collection_slug || null,
        active: Boolean(data.active),
        displayOrder: Number(data.display_order ?? 0),
        startDate: data.start_date,
        endDate: data.end_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err: any) {
    console.error('Error in PUT banner:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/content/banners/[bannerId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { bannerId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const { bannerId } = params;
    const { error } = await db
      .from('promotional_banners')
      .delete()
      .eq('id', bannerId);

    if (error) {
      console.error('Error deleting promotional banner:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE banner:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error.' }, { status: 500 });
  }
}
