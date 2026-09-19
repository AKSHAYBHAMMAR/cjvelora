import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';
import { AdminCategory } from '@/types';

/**
 * Authenticates incoming requests via Supabase Bearer JWT
 * and verifies administrator privileges against `admin_roles`.
 */
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
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { admin: null, error: 'Unauthorized: Invalid or expired session token.', status: 401 };
  }

  const role = await verifyAdminRole(user.id, user.email);
  if (!role) {
    return { admin: null, error: 'Forbidden: Administrator privileges required.', status: 403 };
  }

  return { admin: { id: user.id, email: user.email || '', role }, error: null, status: 200 };
}

function cleanSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * PATCH /api/admin/categories/[categoryId]
 * Updates category properties with slug conflict checks.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const categoryId = params.categoryId;
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'Category ID is required.' }, { status: 400 });
    }

    // 1. Check existing category
    const { data: existing, error: fetchErr } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }

    const body = await req.json();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    // 2. Validate and handle slug if provided
    if (body.slug !== undefined && body.slug !== null) {
      const sanitizedSlug = cleanSlug(String(body.slug));
      if (!sanitizedSlug) {
        return NextResponse.json({ success: false, error: 'Invalid slug provided.' }, { status: 400 });
      }

      if (sanitizedSlug !== existing.slug) {
        // Check uniqueness
        const { data: conflict } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', sanitizedSlug)
          .neq('id', categoryId)
          .maybeSingle();

        if (conflict) {
          return NextResponse.json(
            { success: false, error: `A category with slug "${sanitizedSlug}" already exists.` },
            { status: 409 }
          );
        }
        updatePayload.slug = sanitizedSlug;
      }
    }

    if (body.name !== undefined) {
      const trimmedName = String(body.name).trim();
      if (!trimmedName) {
        return NextResponse.json({ success: false, error: 'Category name cannot be empty.' }, { status: 400 });
      }
      updatePayload.name = trimmedName;
    }

    if (body.description !== undefined) {
      updatePayload.description = body.description ? String(body.description).trim() : null;
    }

    if (body.imageUrl !== undefined) {
      updatePayload.image_url = String(body.imageUrl).trim();
    }

    if (body.isActive !== undefined) {
      updatePayload.is_active = Boolean(body.isActive);
    }

    if (body.displayOrder !== undefined) {
      updatePayload.display_order = Math.max(0, parseInt(String(body.displayOrder), 10) || 0);
    }

    // 3. Update in database
    const { data: updatedRecord, error: updateErr } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', categoryId)
      .select()
      .single();

    if (updateErr || !updatedRecord) {
      return NextResponse.json(
        { success: false, error: `Failed to update category: ${updateErr?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    // Compute live product count for this category
    const { count: productCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    const formattedCategory: AdminCategory = {
      id: String(updatedRecord.id),
      name: String(updatedRecord.name),
      slug: String(updatedRecord.slug),
      description: String(updatedRecord.description || ''),
      imageUrl: String(updatedRecord.image_url || '/images/categories/crochet-bags.jpg'),
      isActive: Boolean(updatedRecord.is_active),
      displayOrder: Number(updatedRecord.display_order ?? 0),
      productCount: productCount || 0,
      createdAt: updatedRecord.created_at,
      updatedAt: updatedRecord.updated_at,
    };

    return NextResponse.json({
      success: true,
      category: formattedCategory,
    });
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/admin/categories:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error updating category.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories/[categoryId]
 * Product-safe deletion:
 * Checks whether any products are attached to the category.
 * If products exist, returns 409 Conflict with product count and instructions to deactivate.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { admin, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const categoryId = params.categoryId;
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'Category ID is required.' }, { status: 400 });
    }

    // 1. Fetch category
    const { data: category, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle();

    if (catErr || !category) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }

    // 2. Check for attached products in products table
    // Check both category_id and slug to ensure comprehensive protection
    const [idCountRes, slugCountRes] = await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('slug', category.slug),
    ]);

    const attachedCount = Math.max(idCountRes.count || 0, slugCountRes.count || 0);

    if (attachedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          hasAttachedProducts: true,
          productCount: attachedCount,
          message: `Cannot delete "${category.name}". There are ${attachedCount} product(s) attached to this category. Please reassign or delete the products first, or deactivate the category to hide it from the storefront.`,
          error: `Safety Guard: ${attachedCount} products are attached to this category. Deletion is blocked to preserve database integrity.`,
        },
        { status: 409 }
      );
    }

    // 3. Safe to delete: no products are attached
    const { error: deleteErr } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteErr) {
      return NextResponse.json(
        { success: false, error: `Failed to delete category: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      message: `Category "${category.name}" was permanently deleted.`,
    });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/admin/categories:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error deleting category.' },
      { status: 500 }
    );
  }
}
