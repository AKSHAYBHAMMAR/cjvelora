import crypto from 'crypto';

export interface CreateRazorpayOrderParams {
  amount: number; // in paise (e.g. 349900 for ₹3499)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Checks whether live or test Razorpay credentials are populated in the environment.
 */
export function isRazorpayConfigured(): boolean {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder')
  );
}

/**
 * Returns the public Razorpay Key ID for client-side Checkout initialization.
 */
export function getRazorpayKeyId(): string {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    ''
  ).trim();
}

/**
 * Creates an authoritative Razorpay order via Razorpay REST API.
 * Never executes in browser — server-side only.
 */
export async function createRazorpayOrder(
  params: CreateRazorpayOrderParams
): Promise<{ order: RazorpayOrderResult | null; error: string | null }> {
  try {
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!keyId || !keySecret) {
      return {
        order: null,
        error: 'Razorpay API credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured in environment.',
      };
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(params.amount),
        currency: params.currency || 'INR',
        receipt: params.receipt.slice(0, 40),
        notes: params.notes || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      return {
        order: null,
        error: data?.error?.description || 'Failed to create order on payment gateway.',
      };
    }

    return {
      order: {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
        status: data.status,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Razorpay order creation exception:', err);
    return {
      order: null,
      error: err?.message || 'Unexpected payment gateway communication error.',
    };
  }
}

/**
 * Cryptographically verifies Razorpay payment signature using HMAC SHA-256.
 * Timing-safe comparison prevents side-channel timing attacks.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  try {
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!keySecret) {
      console.error('Cannot verify Razorpay signature: RAZORPAY_KEY_SECRET is not set.');
      return false;
    }

    const { orderId, paymentId, signature } = params;
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error('Error verifying Razorpay signature:', err);
    return false;
  }
}
