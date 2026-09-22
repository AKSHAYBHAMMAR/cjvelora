import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

/**
 * GET /api/admin/products
 * Fetches all products merged with categories and inventory for the admin console.
 */
export async function GET(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    // Query products, categories, inventory, and product_images in parallel with authenticated client
    const [productsRes, categoriesRes, inventoryRes, imagesRes] = await Promise.all([
      db
        .from('products')
        .select('*, categories(id, name, slug)')
        .order('created_at', { ascending: false }),
      db
        .from('categories')
        .select('id, name, slug')
        .order('name', { ascending: true }),
      db
        .from('inventory')
        .select('*'),
      db
        .from('product_images')
        .select('*')
        .order('display_order', { ascending: true }),
    ]);

    if (productsRes.error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch products: ${productsRes.error.message}` },
        { status: 500 }
      );
    }

    const inventoryMap = new Map<string, any>();
    if (inventoryRes.data) {
      for (const inv of inventoryRes.data) {
        inventoryMap.set(inv.product_id, inv);
      }
    }

    const imagesMap = new Map<string, any[]>();
    if (imagesRes.data) {
      for (const img of imagesRes.data) {
        const list = imagesMap.get(img.product_id) || [];
        list.push(img);
        imagesMap.set(img.product_id, list);
      }
    }

    const mergedProducts = (productsRes.data || []).map((row: any) => {
      const inv = inventoryMap.get(row.id) || {
        quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 5,
      };

      const quantity = typeof inv.quantity === 'number' ? inv.quantity : 0;
      const reservedQuantity = typeof inv.reserved_quantity === 'number' ? inv.reserved_quantity : 0;
      const threshold = typeof inv.low_stock_threshold === 'number' ? inv.low_stock_threshold : 5;
      const available = Math.max(0, quantity - reservedQuantity);

      return {
        id: String(row.id),
        name: String(row.name || ''),
        slug: String(row.slug || ''),
        category: row.categories?.name || 'Crochet Bags',
        categorySlug: row.categories?.slug || 'crochet-bags',
        categoryId: row.category_id ? String(row.category_id) : undefined,
        price: Number(row.price || 0),
        compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
        description: String(row.description || ''),
        longDescription: row.long_description || undefined,
        materials: String(row.materials || '100% Organic Cotton Yarn'),
        dimensions: row.dimensions || undefined,
        careInstructions: row.care_instructions || undefined,
        image: row.image_url || '/images/products/tote-bag.jpg',
        images: (imagesMap.get(row.id) || []).map((i) => i.storage_path),
        badge: row.badge || undefined,
        isMostLoved: Boolean(row.is_best_seller),
        isMadeToOrder: Boolean(row.is_made_to_order),
        leadTime: row.lead_time || undefined,
        isPublished: row.is_published !== undefined ? Boolean(row.is_published) : true,
        inStock: available > 0,
        createdAt: row.created_at || new Date().toISOString(),
        inventoryQuantity: quantity,
        reservedQuantity: reservedQuantity,
        availableStock: available,
        lowStockThreshold: threshold,
        isLowStock: available <= threshold,
      };
    });

    return NextResponse.json({
      success: true,
      products: mergedProducts,
      categories: categoriesRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error while fetching products.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * Creates a new product and initializes its corresponding inventory record.
 */
export async function POST(req: NextRequest) {
  try {
    const { admin, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const {
      name,
      slug,
      description,
      longDescription,
      price,
      compareAtPrice,
      categoryId,
      materials,
      dimensions,
      careInstructions,
      isMadeToOrder,
      leadTime,
      stockQuantity,
      lowStockThreshold,
      isPublished,
      isBestSeller,
      imageUrl,
    } = body;

    // 1. Validation
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Product name is required.' }, { status: 400 });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ success: false, error: 'Price must be a non-negative number.' }, { status: 400 });
    }

    let comparePriceNum: number | null = null;
    if (compareAtPrice !== undefined && compareAtPrice !== null && String(compareAtPrice).trim() !== '') {
      comparePriceNum = Number(compareAtPrice);
      if (isNaN(comparePriceNum) || comparePriceNum < 0) {
        return NextResponse.json({ success: false, error: 'Compare-at price must be a non-negative number.' }, { status: 400 });
      }
    }

    const stockNum = stockQuantity !== undefined ? Math.max(0, parseInt(String(stockQuantity), 10) || 0) : 0;
    const thresholdNum = lowStockThreshold !== undefined ? Math.max(0, parseInt(String(lowStockThreshold), 10) || 5) : 5;

    // Generate or sanitize slug
    const cleanedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (!cleanedSlug) {
      return NextResponse.json({ success: false, error: 'A valid slug could not be generated.' }, { status: 400 });
    }

    // Check slug uniqueness
    const { data: existingSlug } = await db
      .from('products')
      .select('id')
      .eq('slug', cleanedSlug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `A product with slug "${cleanedSlug}" already exists. Please choose a unique name or slug.` },
        { status: 409 }
      );
    }

    // 2. Insert into products table
    const productPayload: any = {
      name: String(name).trim(),
      slug: cleanedSlug,
      description: String(description || '').trim(),
      long_description: longDescription ? String(longDescription).trim() : null,
      price: priceNum,
      compare_at_price: comparePriceNum,
      materials: materials ? String(materials).trim() : '100% Organic Cotton Yarn',
      dimensions: dimensions ? String(dimensions).trim() : null,
      care_instructions: careInstructions ? String(careInstructions).trim() : null,
      is_made_to_order: Boolean(isMadeToOrder),
      lead_time: isMadeToOrder && leadTime ? String(leadTime).trim() : null,
      is_published: isPublished !== undefined ? Boolean(isPublished) : true,
      is_best_seller: Boolean(isBestSeller),
      image_url: imageUrl ? String(imageUrl).trim() : '/images/products/tote-bag.jpg',
      in_stock: stockNum > 0,
    };

    if (categoryId) {
      productPayload.category_id = categoryId;
    }

    const { data: createdProduct, error: productErr } = await db
      .from('products')
      .insert(productPayload)
      .select('*, categories(id, name, slug)')
      .single();

    if (productErr || !createdProduct) {
      return NextResponse.json(
        { success: false, error: `Failed to create product: ${productErr?.message || 'Unknown database error.'}` },
        { status: 500 }
      );
    }

    // 3. Initialize inventory record
    const { error: inventoryErr } = await db
      .from('inventory')
      .insert({
        product_id: createdProduct.id,
        quantity: stockNum,
        reserved_quantity: 0,
        low_stock_threshold: thresholdNum,
      });

    if (inventoryErr) {
      console.warn('Inventory record creation warning:', inventoryErr.message);
    }

    return NextResponse.json({
      success: true,
      product: {
        id: String(createdProduct.id),
        name: createdProduct.name,
        slug: createdProduct.slug,
        price: createdProduct.price,
        compareAtPrice: createdProduct.compare_at_price,
        category: createdProduct.categories?.name || 'Crochet Bags',
        categorySlug: createdProduct.categories?.slug || 'crochet-bags',
        isPublished: createdProduct.is_published,
        isMadeToOrder: createdProduct.is_made_to_order,
        availableStock: stockNum,
        inventoryQuantity: stockNum,
        lowStockThreshold: thresholdNum,
      },
      message: `Product "${createdProduct.name}" created successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process product creation.' },
      { status: 500 }
    );
  }
}
