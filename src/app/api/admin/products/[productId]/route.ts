import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

/**
 * PATCH /api/admin/products/[productId]
 * Updates product details, prices, product type, and inventory.
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
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Missing product ID.' }, { status: 400 });
    }

    // Verify product existence
    const { data: existingProduct, error: fetchErr } = await db
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (fetchErr || !existingProduct) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }

    const body = await req.json();
    const productPayload: any = {};

    // 1. Slug uniqueness validation if slug is modified
    if (body.slug !== undefined && body.slug !== null) {
      const cleanedSlug = String(body.slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (cleanedSlug && cleanedSlug !== existingProduct.slug) {
        const { data: conflict } = await db
          .from('products')
          .select('id')
          .eq('slug', cleanedSlug)
          .neq('id', productId)
          .maybeSingle();

        if (conflict) {
          return NextResponse.json(
            { success: false, error: `A product with slug "${cleanedSlug}" already exists.` },
            { status: 409 }
          );
        }
        productPayload.slug = cleanedSlug;
      }
    }

    // 2. Price validation
    if (body.price !== undefined && body.price !== null) {
      const priceNum = Number(body.price);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json({ success: false, error: 'Price must be a valid non-negative number.' }, { status: 400 });
      }
      productPayload.price = priceNum;
    }

    if (body.compareAtPrice !== undefined) {
      if (body.compareAtPrice === null || String(body.compareAtPrice).trim() === '') {
        productPayload.compare_at_price = null;
      } else {
        const compareNum = Number(body.compareAtPrice);
        if (isNaN(compareNum) || compareNum < 0) {
          return NextResponse.json({ success: false, error: 'Compare-at price must be a valid non-negative number.' }, { status: 400 });
        }
        productPayload.compare_at_price = compareNum;
      }
    }

    // 3. String & Boolean fields
    if (body.name !== undefined) productPayload.name = String(body.name).trim();
    if (body.description !== undefined) productPayload.description = String(body.description).trim();
    if (body.longDescription !== undefined) productPayload.long_description = body.longDescription ? String(body.longDescription).trim() : null;
    if (body.materials !== undefined) productPayload.materials = String(body.materials).trim();
    if (body.dimensions !== undefined) productPayload.dimensions = body.dimensions ? String(body.dimensions).trim() : null;
    if (body.careInstructions !== undefined) productPayload.care_instructions = body.careInstructions ? String(body.careInstructions).trim() : null;
    if (body.isMadeToOrder !== undefined) productPayload.is_made_to_order = Boolean(body.isMadeToOrder);
    if (body.leadTime !== undefined) productPayload.lead_time = body.leadTime ? String(body.leadTime).trim() : null;
    if (body.isPublished !== undefined) productPayload.is_published = Boolean(body.isPublished);
    if (body.isBestSeller !== undefined) productPayload.is_best_seller = Boolean(body.isBestSeller);
    if (body.imageUrl !== undefined) productPayload.image_url = String(body.imageUrl).trim();
    if (body.categoryId !== undefined) productPayload.category_id = body.categoryId || null;

    // 4. Update products table
    let updatedProduct = existingProduct;
    if (Object.keys(productPayload).length > 0) {
      productPayload.updated_at = new Date().toISOString();

      const { data: updated, error: updateErr } = await db
        .from('products')
        .update(productPayload)
        .eq('id', productId)
        .select('*, categories(id, name, slug)')
        .single();

      if (updateErr || !updated) {
        return NextResponse.json(
          { success: false, error: `Failed to update product: ${updateErr?.message || 'Database error'}` },
          { status: 500 }
        );
      }
      updatedProduct = updated;
    }

    // 5. Stock and Inventory management
    let updatedInventory: any = null;
    if (body.stockQuantity !== undefined || body.lowStockThreshold !== undefined) {
      const { data: invRow } = await db
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      const currentQuantity = invRow?.quantity ?? 0;
      const currentReserved = invRow?.reserved_quantity ?? 0;
      const currentThreshold = invRow?.low_stock_threshold ?? 5;

      const newQuantity = body.stockQuantity !== undefined
        ? Math.max(0, parseInt(String(body.stockQuantity), 10) || 0)
        : currentQuantity;

      const newThreshold = body.lowStockThreshold !== undefined
        ? Math.max(0, parseInt(String(body.lowStockThreshold), 10) || 0)
        : currentThreshold;

      // Price / Stock Safety: Ensure available stock cannot be forced negative if active reservations exist
      if (newQuantity < currentReserved) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot set total quantity to ${newQuantity}. There are currently ${currentReserved} unit(s) reserved by active customer checkouts. Total stock must be at least ${currentReserved}.`,
          },
          { status: 400 }
        );
      }

      if (invRow) {
        const { data: invUpdated, error: invErr } = await db
          .from('inventory')
          .update({
            quantity: newQuantity,
            low_stock_threshold: newThreshold,
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', productId)
          .select()
          .single();

        if (invErr) {
          console.warn('Inventory update error:', invErr.message);
        } else {
          updatedInventory = invUpdated;
        }
      } else {
        const { data: invCreated, error: invErr } = await db
          .from('inventory')
          .insert({
            product_id: productId,
            quantity: newQuantity,
            reserved_quantity: 0,
            low_stock_threshold: newThreshold,
          })
          .select()
          .single();

        if (invErr) {
          console.warn('Inventory insert error:', invErr.message);
        } else {
          updatedInventory = invCreated;
        }
      }

      // Update in_stock flag on product
      const available = Math.max(0, newQuantity - currentReserved);
      await db
        .from('products')
        .update({ in_stock: available > 0 })
        .eq('id', productId);
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      inventory: updatedInventory,
      message: `Product "${updatedProduct.name}" updated successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update product.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products/[productId]
 * Safely removes a product.
 * If historical orders exist in order_items, archives/unpublishes the product to preserve integrity.
 * If no historical orders exist, permanently deletes product, inventory, and images.
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
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Missing product ID.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const forceArchive = searchParams.get('archive') === 'true';

    // 1. Check if product exists
    const { data: product, error: fetchErr } = await db
      .from('products')
      .select('id, name, is_published')
      .eq('id', productId)
      .maybeSingle();

    if (fetchErr || !product) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }

    // 2. Check for historical orders in order_items
    const { count: orderItemsCount, error: countErr } = await db
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    const hasOrderReferences = !countErr && typeof orderItemsCount === 'number' && orderItemsCount > 0;

    // 3. If referenced in historical orders or archive was explicitly requested
    if (hasOrderReferences || forceArchive) {
      // Safely unpublish (archive)
      const { error: archiveErr } = await db
        .from('products')
        .update({ is_published: false })
        .eq('id', productId);

      if (archiveErr) {
        return NextResponse.json(
          { success: false, error: `Failed to archive product: ${archiveErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        archived: true,
        hasOrderReferences,
        message: `Product "${product.name}" is referenced by ${orderItemsCount || 0} historical order(s). It has been safely unpublished and archived so customers cannot purchase it, while financial and order records remain preserved.`,
      });
    }

    // 4. No orders reference this product: Safe to permanently delete
    // Delete product images
    await db.from('product_images').delete().eq('product_id', productId);

    // Delete inventory row
    await db.from('inventory').delete().eq('product_id', productId);

    // Delete product
    const { error: deleteErr } = await db
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteErr) {
      // If constraint violation occurs unexpectedly
      if (deleteErr.code === '23503' || deleteErr.message.toLowerCase().includes('foreign key')) {
        // Fall back to safe unpublishing
        await db.from('products').update({ is_published: false }).eq('id', productId);
        return NextResponse.json({
          success: true,
          archived: true,
          hasOrderReferences: true,
          message: `Foreign key constraint detected. Product "${product.name}" has been safely archived and unpublished.`,
        });
      }

      return NextResponse.json(
        { success: false, error: `Failed to delete product: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      message: `Product "${product.name}" was permanently removed from the catalog.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process product deletion.' },
      { status: 500 }
    );
  }
}
