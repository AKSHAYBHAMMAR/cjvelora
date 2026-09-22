import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/content/featured-collections
 * Replaces or synchronizes the list of featured collections.
 */
export async function PUT(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Items array is required.' }, { status: 400 });
    }

    // Clean existing featured collections
    await db.from('featured_collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (items.length > 0) {
      const rows = items.map((item: any, idx: number) => ({
        category_id: item.categoryId,
        title: item.title || null,
        description: item.description || null,
        display_order: item.displayOrder !== undefined ? Number(item.displayOrder) : idx + 1,
        active: item.active !== undefined ? Boolean(item.active) : true,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await db.from('featured_collections').insert(rows);
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
