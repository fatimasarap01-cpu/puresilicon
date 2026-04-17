export async function onRequestPost(context) {
  const { request, env } = context;

  let items;
  try {
    ({ items } = await request.json());
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    return json({ error: 'Cart is empty' }, 400);
  }

  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({ mode: 'payment' });
  body.set('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', `${origin}/shop.html`);
  body.set('payment_method_types[0]', 'card');

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
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
