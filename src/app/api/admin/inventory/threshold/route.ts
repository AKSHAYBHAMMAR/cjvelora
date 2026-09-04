import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { updateLowStockThreshold } from '@/lib/inventory';
import { verifyAdminRole, AdminProfile } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: 'Database is not configured in the environment.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { productId, threshold, productName } = body;

    // 1. Verify user session & admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    let adminProfile: AdminProfile | null = null;

    if (!authError && user) {
      const role = await verifyAdminRole(user.id, user.email);
      if (role) {
        adminProfile = { id: user.id, email: user.email || '', role };
      }
    }

    if (!adminProfile && body.adminProfile && body.adminProfile.id) {
      const verifiedRole = await verifyAdminRole(body.adminProfile.id, body.adminProfile.email);
      if (verifiedRole) {
        adminProfile = {
          id: body.adminProfile.id,
          email: body.adminProfile.email || '',
          role: verifiedRole,
        };
      }
    }

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid admin credentials required.' },
        { status: 403 }
      );
    }

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
