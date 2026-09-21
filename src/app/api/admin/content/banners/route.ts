import { NextRequest, NextResponse } from 'next/server';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
  } = await defaultSupabase.auth.getUser(token);

  if (authError || !user) {
    return { admin: null, error: 'Unauthorized: Invalid or expired session token.', status: 401 };
  }

  const role = await verifyAdminRole(user.id, user.email);
  if (!role) {
    return { admin: null, error: 'Forbidden: Administrator privileges required.', status: 403 };
  }

  return { admin: { id: user.id, email: user.email || '', role }, error: null, status: 200 };
}

/**
 * POST /api/admin/content/banners
 * Creates a new promotional banner.
 */
export async function POST(req: NextRequest) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { title, description, imageUrl, ctaText, ctaLink, active, displayOrder, startDate, endDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Banner title is required.' }, { status: 400 });
    }

    const { data, error } = await defaultSupabase
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
        created_by: admin.id,
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
