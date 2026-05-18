// Stripe-ready Vercel serverless endpoint.
// Real payments are intentionally disabled until STRIPE_SECRET_KEY is configured
// and the `stripe` package is installed/enabled for production checkout.

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return response.status(503).json({
      error: 'Stripe payments are not active yet. STRIPE_SECRET_KEY is not configured.',
    });
  }

  return response.status(501).json({
    error: 'Stripe endpoint is prepared but not activated. Install Stripe SDK and enable live payment creation before accepting card payments.',
  });
}
