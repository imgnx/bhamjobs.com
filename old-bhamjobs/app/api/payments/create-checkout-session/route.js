import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function POST(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== process.env.API_TOKEN) return unauthorized();

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'missing_stripe_key' }, { status: 500 });
  }

  const json = await req.json().catch(() => ({}));
  const {
    priceId,
    mode = 'payment',
    quantity = 1,
    success_url,
    cancel_url,
    payment_method_types: requestedPaymentMethods,
  } = json || {};

  if (!priceId || typeof priceId !== 'string') {
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  try {
    const payload = {
      mode,
      line_items: [{ price: priceId, quantity: Math.max(1, Number(quantity) || 1) }],
      success_url: success_url || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/cancel`,
      automatic_tax: { enabled: true },
    };

    const normalizedPaymentMethods = Array.isArray(requestedPaymentMethods)
      ? requestedPaymentMethods.filter((method) => typeof method === 'string' && method.trim().length > 0)
      : null;

    if (normalizedPaymentMethods?.length) {
      payload.payment_method_types = normalizedPaymentMethods;
    } else if (mode === 'payment') {
      // Default to card + Link to surface Link by Stripe in Checkout.
      payload.payment_method_types = ['card', 'link'];
    }

    const session = await stripe.checkout.sessions.create(payload);
    return NextResponse.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error('stripe_checkout_error', e?.message || e);
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 });
  }
}
