import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { adjustStock } from '@/lib/inventory';

export async function POST(req: NextRequest) {
  try {
    const { admin, adminProfile, supabase: db, error: authErr, status: authStatus } = await authenticateAdmin(req);
    if (!admin || !db || !adminProfile) {
      return NextResponse.json({ success: false, error: authErr }, { status: authStatus });
    }

    const body = await req.json();
    const { productId, delta, reason, productName } = body;

    // 2. Validate input
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Missing product ID.' },
        { status: 400 }
      );
    }

    const deltaNum = Number(delta);
    if (isNaN(deltaNum) || deltaNum === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock adjustment must be a non-zero number.' },
        { status: 400 }
      );
    }

    if (!reason || !String(reason).trim()) {
      return NextResponse.json(
        { success: false, error: 'A reason or audit note is required for stock adjustments.' },
        { status: 400 }
      );
    }

    // 3. Execute safe stock adjustment
    const result = await adjustStock({
      productId,
      delta: deltaNum,
      reason: String(reason).trim(),
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
      message: `Stock successfully adjusted by ${deltaNum > 0 ? `+${deltaNum}` : deltaNum}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
