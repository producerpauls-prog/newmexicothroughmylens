const SESSION_ID = 'cs_test_automatic_photo_1786540269';

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) return Response.json({ error: 'missing Stripe webhook binding' }, { status: 500 });
  const event = {
    id: 'evt_test_automatic_photo_1786540269',
    type: 'checkout.session.completed',
    data: { object: {
      id: SESSION_ID,
      payment_status: 'paid',
      client_reference_id: 'NM-048_8X10',
      amount_subtotal: 3000,
      shipping_details: {
        name: 'Automatic Upload Test',
        address: { line1: '123 Test Street', city: 'Albuquerque', state: 'NM', postal_code: '87101', country: 'US' }
      },
      customer_details: { name: 'Automatic Upload Test', email: 'webhook-test@example.com' }
    } }
  };
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(String(timestamp) + '.' + body));
  const signature = [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const response = await fetch(new URL('/api/stripe-webhook', request.url).origin + '/api/stripe-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=' + timestamp + ',v1=' + signature },
    body
  });
  return Response.json({ httpStatus: response.status, body: await response.text(), session: SESSION_ID }, { status: response.ok ? 200 : response.status, headers: { 'cache-control': 'no-store' } });
}

export async function onRequestGet({ request, env }) {
  const orderId = new URL(request.url).searchParams.get('order');
  if (!/^ord_[A-Za-z0-9]+$/.test(orderId || '')) return Response.json({ error: 'invalid order id' }, { status: 400 });
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
    merchantReference: item.merchantReference || null,
    asset: { status: asset.status || null, url: asset.url || null, thumbnailUrl: asset.thumbnailUrl || null, md5Hash: asset.md5Hash || null }
  }, { status: response.ok ? 200 : response.status, headers: { 'cache-control': 'no-store' } });
}
