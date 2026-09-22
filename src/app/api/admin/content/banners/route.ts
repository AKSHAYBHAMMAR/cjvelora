import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/banners
 * Creates a new promotional banner.
 */
export async function POST(req: NextRequest) {
  try {
    const { admin, adminProfile, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db || !adminProfile) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const {
      title,
      description,
      imageUrl,
      ctaText,
      ctaLink,
      active,
      displayOrder,
      startDate,
      endDate,
      badge,
      discountType,
      discountValue,
      collectionId,
      collectionName,
      collectionSlug,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Banner title is required.' }, { status: 400 });
    }

    const numericDiscount = Number(discountValue ?? 0);
    if (isNaN(numericDiscount) || numericDiscount < 0 || numericDiscount > 100) {
      return NextResponse.json(
        { success: false, error: 'Discount percentage must be between 0% and 100%.' },
        { status: 400 }
      );
    }

    // Auto-derive collection route if collection provided
    let finalCtaLink = ctaLink ? String(ctaLink).trim() : '';
    if (!finalCtaLink && (collectionSlug || collectionName)) {
      const slug = (collectionSlug || '').trim().toLowerCase();
      const name = (collectionName || '').trim();
      if (slug === 'new-arrivals' || name.toLowerCase() === 'new arrivals') {
        finalCtaLink = '/#shop';
      } else if (slug === 'bestsellers' || slug === 'most-loved' || name.toLowerCase() === 'bestsellers') {
        finalCtaLink = '/#most-loved';
      } else if (name) {
        finalCtaLink = `/?category=${encodeURIComponent(name)}#category-products-anchor`;
      } else {
        finalCtaLink = '/#categories';
      }
    }

    const insertPayload: any = {
      title: title.trim(),
      description: description ? description.trim() : '',
      image_url: imageUrl || '',
      cta_text: ctaText ? ctaText.trim() : 'Explore Collection',
      cta_link: finalCtaLink || '/#categories',
      active: active !== undefined ? Boolean(active) : true,
      display_order: Number(displayOrder ?? 0),
      start_date: startDate || null,
      end_date: endDate || null,
      created_by: adminProfile.id,
      badge: badge ? String(badge).trim() : 'Limited Atelier Edition',
      discount_type: discountType || 'percentage',
      discount_value: numericDiscount,
      collection_id: collectionId || null,
      collection_name: collectionName ? String(collectionName).trim() : null,
      collection_slug: collectionSlug ? String(collectionSlug).trim() : null,
    };

    const { data, error } = await db
      .from('promotional_banners')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating promotional banner:', error);
      return NextResponse.json({ success: false, error: `Database error: ${error.message}` }, { status: 500 });
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
    console.error('Error in POST /api/admin/content/banners:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error.' }, { status: 500 });
  }
}
