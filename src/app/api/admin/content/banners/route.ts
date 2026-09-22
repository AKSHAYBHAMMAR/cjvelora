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
    const { title, description, imageUrl, ctaText, ctaLink, active, displayOrder, startDate, endDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Banner title is required.' }, { status: 400 });
    }

    const { data, error } = await db
      .from('promotional_banners')
      .insert({
        title: title.trim(),
        description: description ? description.trim() : '',
        image_url: imageUrl || '',
        cta_text: ctaText ? ctaText.trim() : '',
        cta_link: ctaLink ? ctaLink.trim() : '',
        active: active !== undefined ? Boolean(active) : true,
        display_order: Number(displayOrder ?? 0),
        start_date: startDate || null,
        end_date: endDate || null,
        created_by: adminProfile.id,
      })
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
