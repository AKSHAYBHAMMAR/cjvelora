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
 * PUT /api/admin/content/featured-collections
 * Replaces or synchronizes the list of featured collections.
 */
export async function PUT(req: NextRequest) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Items array is required.' }, { status: 400 });
    }

    // Clean existing featured collections
    await defaultSupabase.from('featured_collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (items.length > 0) {
      const rows = items.map((item: any, idx: number) => ({
        category_id: item.categoryId,
        title: item.title || null,
        description: item.description || null,
        display_order: item.displayOrder !== undefined ? Number(item.displayOrder) : idx + 1,
        active: item.active !== undefined ? Boolean(item.active) : true,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await defaultSupabase.from('featured_collections').insert(rows);
      if (insertErr) {
        console.error('Error inserting featured collections:', insertErr);
        return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in PUT /api/admin/content/featured-collections:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error.' }, { status: 500 });
  }
}
