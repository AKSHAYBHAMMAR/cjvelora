import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Resend } from 'resend';
import { renderWelcomeBackHtml, renderWelcomeBackText } from '@/lib/email/welcomeBackTemplate';

export const dynamic = 'force-dynamic';

function getSupabaseClient(bearerToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: bearerToken
      ? { headers: { Authorization: `Bearer ${bearerToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extractSessionIdFromToken(token: string, userId: string): string {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.session_id) {
        return String(payload.session_id);
      }
      if (payload.jti) {
        return String(payload.jti);
      }
    }
  } catch {
    // Graceful fallback to deterministic token hash
  }

  return crypto
    .createHash('sha256')
    .update(`${userId}:${token}`)
    .digest('hex')
    .slice(0, 36);
}

function extractFirstName(userMetadata: any): string {
  if (!userMetadata || typeof userMetadata !== 'object') {
    return 'Client';
  }

  const rawName =
    userMetadata.full_name ||
    userMetadata.name ||
    userMetadata.given_name ||
    '';

  const trimmed = String(rawName).trim();
  if (!trimmed) {
    return 'Client';
  }

  const firstPart = trimmed.split(/\s+/)[0];
  return firstPart || 'Client';
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify caller has a valid authenticated Supabase session
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization bearer token required.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session is invalid or expired.' },
        { status: 401 }
      );
    }

    // 2. Obtain the authenticated user's email (NEVER accept arbitrary recipient from client)
    const userEmail = user.email?.trim().toLowerCase();
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User does not have a verified email address.' },
        { status: 400 }
      );
    }

    // 3. Obtain user's first name from user metadata when available
    const firstName = extractFirstName(user.user_metadata);

    // 4. Derive deterministic session ID for strict deduplication
    const sessionId = extractSessionIdFromToken(token, user.id);

    // 5. Check idempotency and determine FIRST LOGIN vs RETURNING LOGIN
    let shouldSendWelcome = false;
    let isReturning = false;
    let alreadyNotified = false;

    try {
      // Try atomic RPC function first
      const { data: rpcResult, error: rpcError } = await supabase.rpc('record_customer_login_event', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_email: userEmail,
        p_event_type: 'login',
      });

      if (!rpcError && rpcResult && typeof rpcResult === 'object') {
        shouldSendWelcome = Boolean(rpcResult.should_send_welcome);
        isReturning = Boolean(rpcResult.is_returning);
        alreadyNotified = Boolean(rpcResult.already_notified);
      } else {
        // Fallback: Check deduplication table directly if RPC is not present
        const { data: existingNotification } = await supabase
          .from('customer_login_notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .maybeSingle();

        if (existingNotification) {
          alreadyNotified = true;
          shouldSendWelcome = false;
        } else {
          // Check if customer has prior orders to reliably detect returning customer
          const { count: orderCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .or(`customer_id.eq.${user.id},customer_email.ilike.${userEmail}`);

          const hasPriorOrders = Number(orderCount || 0) > 0;

          // Check if user has metadata indicator
          const hasPriorLoginMeta = Boolean(user.user_metadata?.has_logged_in);

          if (hasPriorOrders || hasPriorLoginMeta) {
            isReturning = true;
            shouldSendWelcome = true;
          } else {
            // First login: record without sending email
            isReturning = false;
            shouldSendWelcome = false;
          }
        }
      }
    } catch {
      // Safe fallback if database queries encounter transient issues
      shouldSendWelcome = false;
    }

    // Idempotency: Already sent for this session
    if (alreadyNotified) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: 'already_notified_for_session',
      });
    }

    // Phase 9: Do NOT send welcome back for first-time login
    if (!shouldSendWelcome || !isReturning) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: 'first_login_recorded',
      });
    }

    // 6. Check Resend API configuration
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!resendApiKey || resendApiKey.includes('placeholder')) {
      // Safe diagnostic log without leaking secrets
      console.warn('[WelcomeBack] RESEND_API_KEY is not configured. Email dispatch skipped.');
      return NextResponse.json({
        success: true,
        sent: false,
        reason: 'resend_not_configured',
      });
    }

    const fromEmail = (process.env.RESEND_FROM_EMAIL || 'CJVELORA <onboarding@resend.dev>').trim();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cjvelora.vercel.app').trim();

    // 7. Send the Welcome Back email using Resend
    const resend = new Resend(resendApiKey);

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: 'Welcome back to CJVELORA ✨',
      html: renderWelcomeBackHtml({ firstName, siteUrl }),
      text: renderWelcomeBackText({ firstName, siteUrl }),
    });

    if (sendError) {
      console.error('[WelcomeBack] Resend API error:', sendError.name);
      return NextResponse.json({
        success: false,
        error: 'Failed to send welcome back notification.',
      }, { status: 502 });
    }

    // 8. Record notification in deduplication table
    try {
      await supabase.rpc('mark_welcome_back_sent', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_email: userEmail,
      });
    } catch {
      // Try direct insert fallback
      try {
        await supabase
          .from('customer_login_notifications')
          .insert({
            user_id: user.id,
            session_id: sessionId,
            email: userEmail,
            notification_type: 'welcome_back',
          });
      } catch {
        // Silently continue
      }
    }

    return NextResponse.json({
      success: true,
      sent: true,
    });
  } catch (err: any) {
    console.error('[WelcomeBack] Unexpected error in welcome-back endpoint');
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
