"use client";
import { useState } from 'react';

export default function PaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN || ''}`,
        },
        body: JSON.stringify({
          // Replace with your Stripe Price ID from your dashboard
          priceId: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID || 'price_XXXX',
          quantity: 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'request_failed');
      if (json.url) window.location.href = json.url;
    } catch (e) {
      setError(e.message || 'checkout_error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Purchase Services</h1>
      <p className="text-sm text-gray-600">Start a secure checkout to pay for services.</p>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Checkout'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}

