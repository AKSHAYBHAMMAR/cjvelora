import { NextRequest, NextResponse } from 'next/server';
import { supabase as defaultSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';
import {
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_HERO,
  DEFAULT_ABOUT,
  DEFAULT_SEO,
  DEFAULT_BANNERS,
} from '@/lib/content';
import { AllContentData, SiteContentSectionKey } from '@/types/content';

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
 * GET /api/admin/content
 * Retrieves all content management domains for the admin panel.
 */
export async function GET(req: NextRequest) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const content: AllContentData = {
      announcementBar: { ...DEFAULT_ANNOUNCEMENT },
      hero: { ...DEFAULT_HERO },
      banners: [...DEFAULT_BANNERS],
      featuredCollections: [],
      featuredProducts: [],
      about: { ...DEFAULT_ABOUT },
      seo: { ...DEFAULT_SEO },
    };

    // Parallel fetch from database
    const [siteContentRes, bannersRes, featCollectionsRes, featProductsRes] = await Promise.all([
      defaultSupabase.from('site_content').select('*'),
      defaultSupabase.from('promotional_banners').select('*').order('display_order', { ascending: true }),
      defaultSupabase
        .from('featured_collections')
        .select('*, categories(id, name, slug, image_url)')
        .order('display_order', { ascending: true }),
      defaultSupabase
        .from('featured_products')
        .select('*, products(id, name, slug, price, image, image_url, badge, in_stock, category)')
        .order('display_order', { ascending: true }),
    ]);

    if (!siteContentRes.error && siteContentRes.data) {
      for (const row of siteContentRes.data) {
        if (row.section === 'announcement_bar' && row.content) {
          content.announcementBar = { ...DEFAULT_ANNOUNCEMENT, ...row.content };
        } else if (row.section === 'hero' && row.content) {
          content.hero = { ...DEFAULT_HERO, ...row.content };
        } else if (row.section === 'about' && row.content) {
          content.about = { ...DEFAULT_ABOUT, ...row.content };
        } else if (row.section === 'seo' && row.content) {
          content.seo = { ...DEFAULT_SEO, ...row.content };
        }
      }
    }

    if (!bannersRes.error && bannersRes.data) {
      content.banners = bannersRes.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description || '',
        imageUrl: b.image_url || '',
        ctaText: b.cta_text || '',
        ctaLink: b.cta_link || '',
        active: Boolean(b.active),
        displayOrder: Number(b.display_order ?? 0),
        startDate: b.start_date || null,
        endDate: b.end_date || null,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));
    }

    if (!featCollectionsRes.error && featCollectionsRes.data) {
      content.featuredCollections = featCollectionsRes.data.map((c: any) => ({
        id: c.id,
        categoryId: c.category_id,
        title: c.title || c.categories?.name || '',
        description: c.description || '',
        imageUrl: c.image_url || c.categories?.image_url || '',
        displayOrder: Number(c.display_order ?? 0),
        active: Boolean(c.active),
        categorySlug: c.categories?.slug || '',
      }));
    }

    if (!featProductsRes.error && featProductsRes.data) {
      content.featuredProducts = featProductsRes.data.map((p: any) => ({
        id: p.id,
        productId: p.product_id,
        displayOrder: Number(p.display_order ?? 0),
        active: Boolean(p.active),
        product: p.products,
      }));
    }

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/content:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error fetching content.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/content
 * Updates a singleton site_content section (announcement_bar, hero, about, seo).
 */
export async function PUT(req: NextRequest) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { section, content, active } = body;

    const validSections: SiteContentSectionKey[] = ['announcement_bar', 'hero', 'about', 'seo'];
    if (!section || !validSections.includes(section)) {
      return NextResponse.json(
        { success: false, error: `Invalid content section "${section}".` },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must contain valid content object.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const { error: upsertError } = await defaultSupabase
      .from('site_content')
      .upsert(
        {
          section,
          content,
          active: active !== undefined ? Boolean(active) : true,
          updated_at: nowIso,
          updated_by: admin.id,
        },
        { onConflict: 'section' }
      );

    if (upsertError) {
      console.error(`Error saving site_content "${section}":`, upsertError);
      return NextResponse.json(
        { success: false, error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      section,
      content,
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Error in PUT /api/admin/content:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error saving content.' },
      { status: 500 }
    );
  }
}
