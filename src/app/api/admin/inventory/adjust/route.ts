import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { adjustStock } from '@/lib/inventory';
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
    const { productId, delta, reason, productName } = body;

    // 1. Verify user session & admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    let adminProfile: AdminProfile | null = null;

    if (!authError && user) {
      const role = await verifyAdminRole(user.id, user.email);
      if (role) {
        adminProfile = { id: user.id, email: user.email || '', role };
      }
    }

    // If session check in route handler didn't get user directly (e.g. client-driven with body profile),
    // fallback to provided verified profile if admin authentication is established
    if (!adminProfile) {
      if (body.adminProfile && body.adminProfile.id && body.adminProfile.role) {
        const verifiedRole = await verifyAdminRole(body.adminProfile.id, body.adminProfile.email);
        if (verifiedRole) {
          adminProfile = {
            id: body.adminProfile.id,
            email: body.adminProfile.email || '',
            role: verifiedRole,
          };
        }
      }
    }

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid admin credentials required.' },
        { status: 403 }
      );
    }

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
