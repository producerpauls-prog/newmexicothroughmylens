const ACCESS_TOKEN = 'd1dd0cdbc3e883268ac998b0eebbdfad84a9';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get('token') !== ACCESS_TOKEN) return new Response('Not found', { status: 404 });

  const orderId = url.searchParams.get('order');
  if (orderId) return orderStatus(orderId, env);

  if (!env.STRIPE_WEBHOOK_SECRET) return Response.json({ error: 'missing Stripe webhook binding' }, { status: 500 });
  const event = {
    id: 'evt_test_github_fallback_1786527756770',
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_test_github_fallback_1786527756770',
      payment_status: 'paid',
      client_reference_id: 'NM-019_8X10',
      amount_subtotal: 3000,
      shipping_details: {
        name: 'GitHub Fallback Test',
        address: { line1: '123 Test Street', city: 'Albuquerque', state: 'NM', postal_code: '87101', country: 'US' }
      },
      customer_details: { name: 'GitHub Fallback Test', email: 'webhook-test@example.com' }
    } }
  };
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(String(timestamp) + '.' + body));
  const signature = [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const response = await fetch(new URL('/api/stripe-webhook', url.origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=' + timestamp + ',v1=' + signature },
    body
  });
  return Response.json({ httpStatus: response.status, body: await response.text(), session: event.data.object.id }, { status: response.ok ? 200 : response.status, headers: { 'cache-control': 'no-store' } });
}

async function orderStatus(orderId, env) {
  if (!/^ord_[A-Za-z0-9]+$/.test(orderId)) return Response.json({ error: 'invalid order id' }, { status: 400 });
  const response = await fetch('https://api.sandbox.prodigi.com/v4.0/orders/' + orderId, { headers: { 'X-API-Key': env.PRODIGI_API_KEY } });
  const body = await response.json().catch(() => null);
  const order = body?.order || {};
  const item = order.items?.[0] || {};
  const asset = item.assets?.[0] || {};
  return Response.json({
    httpStatus: response.status,
    id: order.id || null,
    stage: order.status?.stage || null,
    issues: order.status?.issues || [],
    downloadAssets: order.status?.details?.downloadAssets || null,
    itemStatus: item.status || null,
    asset: { status: asset.status || null, url: asset.url || null, thumbnailUrl: asset.thumbnailUrl || null }
  }, { status: response.ok ? 200 : response.status, headers: { 'cache-control': 'no-store' } });
}
