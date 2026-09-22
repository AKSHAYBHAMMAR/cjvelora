import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { AdminCategory } from '@/types';

/**
 * Sanitizes and generates a clean slug.
 */
function cleanSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * GET /api/admin/categories
 * Retrieves all categories merged with live product count per category.
 */
export async function GET(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    // 1. Fetch categories and products count in parallel
    const [categoriesRes, productsRes] = await Promise.all([
      db
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true }),
      db
        .from('products')
        .select('id, category_id, slug'),
    ]);

    if (categoriesRes.error) {
      return NextResponse.json(
        { success: false, error: `Failed to query categories: ${categoriesRes.error.message}` },
        { status: 500 }
      );
    }

    // Count products per category_id
    const productCounts = new Map<string, number>();
    if (productsRes.data) {
      for (const prod of productsRes.data) {
        if (prod.category_id) {
          const catId = String(prod.category_id);
          productCounts.set(catId, (productCounts.get(catId) || 0) + 1);
        }
      }
    }

    const categories: AdminCategory[] = (categoriesRes.data || []).map((row: any) => {
      const id = String(row.id);
      const productCount = productCounts.get(id) || 0;

      return {
        id,
        name: String(row.name || ''),
        slug: String(row.slug || ''),
        description: String(row.description || ''),
        imageUrl: String(row.image_url || row.image || '/images/categories/crochet-bags.jpg'),
        isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
        displayOrder: Number(row.display_order ?? 0),
        productCount,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/categories:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error fetching categories.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Creates a new category with slug validation and uniqueness check.
 */
export async function POST(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { name, slug, description, imageUrl, isActive, displayOrder } = body;

    // 1. Validation
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    const rawSlug = slug && String(slug).trim() ? String(slug).trim() : String(name).trim();
    const sanitizedSlug = cleanSlug(rawSlug);

    if (!sanitizedSlug) {
      return NextResponse.json({ success: false, error: 'A valid slug could not be generated.' }, { status: 400 });
    }

    // 2. Validate slug uniqueness
    const { data: existingSlug } = await db
      .from('categories')
      .select('id')
      .eq('slug', sanitizedSlug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `A category with slug "${sanitizedSlug}" already exists.` },
        { status: 409 }
      );
    }

    // 3. Insert category
    const categoryPayload = {
      name: String(name).trim(),
      slug: sanitizedSlug,
      description: description ? String(description).trim() : null,
      image_url: imageUrl ? String(imageUrl).trim() : '/images/categories/crochet-bags.jpg',
      is_active: isActive !== undefined ? Boolean(isActive) : true,
      display_order: displayOrder !== undefined ? Math.max(0, parseInt(String(displayOrder), 10) || 0) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdCategory, error: insertErr } = await db
      .from('categories')
      .insert(categoryPayload)
      .select()
      .single();

    if (insertErr || !createdCategory) {
      return NextResponse.json(
        { success: false, error: `Failed to create category: ${insertErr?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    const formattedCategory: AdminCategory = {
      id: String(createdCategory.id),
      name: String(createdCategory.name),
      slug: String(createdCategory.slug),
      description: String(createdCategory.description || ''),
      imageUrl: String(createdCategory.image_url || '/images/categories/crochet-bags.jpg'),
      isActive: Boolean(createdCategory.is_active),
      displayOrder: Number(createdCategory.display_order ?? 0),
      productCount: 0,
      createdAt: createdCategory.created_at,
      updatedAt: createdCategory.updated_at,
    };

    return NextResponse.json({
      success: true,
      category: formattedCategory,
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/categories:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error creating category.' },
      { status: 500 }
    );
  }
}
