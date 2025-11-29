import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function textToBuffer(text) {
  return Buffer.from(text, 'utf8');
}

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'missing_stripe_env' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(textToBuffer(raw), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('stripe_webhook_signature_error', err?.message || err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Fulfill purchase, grant access, etc.
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed':
      default:
        break;
    }
  } catch (e) {
    console.error('stripe_webhook_handler_error', e?.message || e);
    return NextResponse.json({ received: true, error: 'handler_error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
