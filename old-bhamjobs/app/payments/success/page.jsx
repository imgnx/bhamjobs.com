export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Payment Successful</h1>
      <p className="text-sm text-gray-700">Thank you! Your payment was processed. You will receive an email receipt from Stripe.</p>
    </div>
  );
}

