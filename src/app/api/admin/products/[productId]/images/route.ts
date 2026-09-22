import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { STORAGE_BUCKET, getPublicImageUrl } from '@/lib/product-images';

/**
 * GET /api/admin/products/[productId]/images
 * Returns all gallery images for a given product.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const productId = params.productId;
    const { data, error } = await db
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const formatted = (data || []).map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      storagePath: String(row.storage_path),
      publicUrl: getPublicImageUrl(row.storage_path),
      altText: String(row.alt_text || ''),
      displayOrder: Number(row.display_order ?? 0),
      createdAt: row.created_at,
    }));

    return NextResponse.json({ success: true, images: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error fetching images' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products/[productId]/images
 * Registers an uploaded image record in the database.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const productId = params.productId;
    const body = await req.json();
    const { storagePath, altText, displayOrder, setAsPrimary } = body;

    if (!storagePath) {
      return NextResponse.json({ success: false, error: 'Missing storagePath.' }, { status: 400 });
    }

    // Insert into product_images table
    const { data: record, error: insertErr } = await db
      .from('product_images')
      .insert({
        product_id: productId,
        storage_path: storagePath,
        alt_text: altText || 'Product Image',
        display_order: displayOrder ?? 0,
      })
      .select()
      .single();

    if (insertErr || !record) {
      return NextResponse.json(
        { success: false, error: insertErr?.message || 'Failed to save image record.' },
        { status: 500 }
      );
    }

    const publicUrl = getPublicImageUrl(storagePath);

    // If setAsPrimary or if this is the first image, update product's image_url
    if (setAsPrimary || displayOrder === 0) {
      await db
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', productId);
    }

    return NextResponse.json({
      success: true,
      image: {
        id: String(record.id),
        productId: String(record.product_id),
        storagePath: String(record.storage_path),
        publicUrl,
        altText: record.alt_text,
        displayOrder: record.display_order,
        createdAt: record.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to register image.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/products/[productId]/images
 * Updates display orders or marks an image as primary.
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
    const body = await req.json();
    const { primaryImageId, reorderedImages } = body;

    // Flow 1: Set specific image as Primary
    if (primaryImageId) {
      // Find the target image
      const { data: targetImg, error: targetErr } = await db
        .from('product_images')
        .select('*')
        .eq('id', primaryImageId)
        .eq('product_id', productId)
        .single();

      if (targetErr || !targetImg) {
        return NextResponse.json({ success: false, error: 'Target image not found.' }, { status: 404 });
      }

      // Fetch all images for this product
      const { data: allImages } = await db
        .from('product_images')
        .select('id, display_order')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      // Put target at index 0, others shifted
      if (allImages) {
        let order = 1;
        for (const img of allImages) {
          if (img.id === primaryImageId) {
            await db.from('product_images').update({ display_order: 0 }).eq('id', img.id);
          } else {
            await db.from('product_images').update({ display_order: order++ }).eq('id', img.id);
          }
        }
      }

      // Update the product's primary image_url
      const publicUrl = getPublicImageUrl(targetImg.storage_path);
      await db
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', productId);

      return NextResponse.json({
        success: true,
        primaryImageUrl: publicUrl,
        message: 'Primary image updated successfully.',
      });
    }

    // Flow 2: Batch reorder
    if (Array.isArray(reorderedImages)) {
      for (const item of reorderedImages) {
        await db
          .from('product_images')
          .update({ display_order: item.displayOrder })
          .eq('id', item.id)
          .eq('product_id', productId);
      }

      // If the top item has displayOrder 0, sync to product.image_url
      const topItem = reorderedImages.find((item) => item.displayOrder === 0);
      if (topItem && topItem.storagePath) {
        const publicUrl = getPublicImageUrl(topItem.storagePath);
        await db
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', productId);
      }

      return NextResponse.json({ success: true, message: 'Image display order updated.' });
    }

    return NextResponse.json({ success: false, error: 'No update action specified.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update images.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[productId]/images
 * Removes an image from Supabase Storage and database table.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const productId = params.productId;
    const body = await req.json();
    const { imageId, storagePath } = body;

    if (!imageId || !storagePath) {
      return NextResponse.json({ success: false, error: 'Missing imageId or storagePath.' }, { status: 400 });
    }

    // Safety: Protect local asset paths
    if (
      storagePath.startsWith('/') ||
      storagePath.includes('images/products') ||
      storagePath.includes('images/categories')
    ) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete bundled project assets.' },
        { status: 400 }
      );
    }

    // 1. Remove from Supabase Storage bucket
    const { error: storageErr } = await db.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (storageErr) {
      console.warn('Storage removal notice:', storageErr.message);
    }

    // 2. Remove from product_images table
    const { error: dbErr } = await db
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', productId);

    if (dbErr) {
      return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 });
    }

    // Check if deleted image was the primary product image; if so, fallback to next available
    const { data: remaining } = await db
      .from('product_images')
      .select('storage_path')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      const newPrimary = getPublicImageUrl(remaining[0].storage_path);
      await db.from('products').update({ image_url: newPrimary }).eq('id', productId);
    }

    return NextResponse.json({ success: true, message: 'Image deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to delete image.' }, { status: 500 });
  }
}
