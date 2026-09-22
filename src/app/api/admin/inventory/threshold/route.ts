import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { updateLowStockThreshold } from '@/lib/inventory';

export async function POST(req: NextRequest) {
  try {
    const { admin, adminProfile, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db || !adminProfile) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { productId, threshold, productName } = body;

    const thresholdNum = Number(threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      return NextResponse.json(
        { success: false, error: 'Low-stock threshold must be a valid non-negative number.' },
        { status: 400 }
      );
    }

    const result = await updateLowStockThreshold({
      productId,
      threshold: thresholdNum,
      adminProfile,
      productName,
      client: db,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedItem: result.updatedItem,
      message: `Low stock threshold updated to ${thresholdNum}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
