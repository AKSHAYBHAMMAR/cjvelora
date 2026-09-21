import { NextResponse } from 'next/server';
import { getStorefrontContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content
 * Public endpoint to fetch published storefront content with full fallback.
 */
export async function GET() {
  try {
    const content = await getStorefrontContent();
    return NextResponse.json({ success: true, content });
  } catch (err: any) {
    console.error('Error in GET /api/content:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error loading storefront content.' },
      { status: 500 }
    );
  }
}
