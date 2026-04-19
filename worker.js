export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle Stripe checkout API
    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};

async function handleCheckout(request, env) {
  let items;
  try {
    ({ items } = await request.json());
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    return json({ error: 'Cart is empty' }, 400);
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Math.max(1, parseInt(item.qty) || 1), 0);

  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({ mode: 'payment' });
  body.set('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', `${origin}/shop.html`);
  body.set('payment_method_types[0]', 'card');
  body.set('invoice_creation[enabled]', 'true');
  body.set('billing_address_collection', 'required');
  body.set('shipping_address_collection[allowed_countries][0]', 'CA');
  body.set('phone_number_collection[enabled]', 'true');
  body.set('allow_promotion_codes', 'true');

  // Free shipping over $75, otherwise standard rate ($5.99 CAD)
  const rateId = subtotal >= 75
    ? 'shr_1TNgha3kPqER5hcq6p7FgdUc'
    : 'shr_1TNgic3kPqER5hcqvdDCzphy';
  body.set('shipping_options[0][shipping_rate]', rateId);

  items.forEach((item, i) => {
    const p = `line_items[${i}]`;
    body.set(`${p}[price_data][currency]`, 'cad');
    body.set(`${p}[price_data][product_data][name]`, String(item.name));
    body.set(`${p}[price_data][unit_amount]`, String(Math.round(Number(item.price) * 100)));
    body.set(`${p}[quantity]`, String(Math.max(1, parseInt(item.qty) || 1)));
  });

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const session = await resp.json();

  if (!resp.ok) {
    return json({ error: session.error?.message ?? 'Stripe error' }, 502);
  }

  return json({ url: session.url });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
