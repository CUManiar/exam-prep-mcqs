import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { ok: false, error: 'Razorpay secret key not configured on server' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, or razorpay_signature',
        },
        { status: 400 }
      );
    }

    // Generate expected HMAC-SHA256 signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    // Timing-safe buffer comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8');

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      return NextResponse.json(
        {
          ok: false,
          verified: false,
          error: 'Payment verification failed: signature mismatch',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      message: 'Payment signature verified successfully',
    });
  } catch (error: any) {
    console.error('[Razorpay Verify Payment Error]:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Server error during payment verification',
      },
      { status: 500 }
    );
  }
}
