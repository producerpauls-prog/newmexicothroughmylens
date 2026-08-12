export async function onRequestGet({ env }) {
  if (!env.PRODIGI_API_KEY) return Response.json({ error: 'missing Prodigi binding' }, { status: 500 });
  const response = await fetch('https://api.sandbox.prodigi.com/v4.0/orders/ord_1167055', {
    headers: { 'X-API-Key': env.PRODIGI_API_KEY }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.order) {
    return Response.json({ httpStatus: response.status, outcome: body?.outcome || null, error: body?.error || null }, { status: response.ok ? 502 : response.status });
  }
  const order = body.order;
  return Response.json({
    outcome: body.outcome,
    id: order.id,
    stage: order.status?.stage,
    issues: order.status?.issues || [],
    details: order.status?.details || {},
    items: (order.items || []).map(item => ({
      status: item.status,
      sku: item.sku,
      merchantReference: item.merchantReference,
      assets: (item.assets || []).map(asset => ({
        id: asset.id,
        status: asset.status,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl || null,
        md5Hash: asset.md5Hash || null
      }))
    }))
  }, { headers: { 'cache-control': 'no-store' } });
}


export async function onRequestPost({ env }) {
  if (!env.PRODIGI_API_KEY) return Response.json({ error: 'missing Prodigi binding' }, { status: 500 });
  const payload = {
    merchantReference: 'codex-sandbox-sample-control',
    idempotencyKey: 'codex-sandbox-sample-control-20260811',
    shippingMethod: 'Standard',
    recipient: {
      name: 'Prodigi Sample Control',
      address: {
        line1: '123 Test Street',
        postalOrZipCode: '87101',
        countryCode: 'US',
        townOrCity: 'Albuquerque',
        stateOrCounty: 'NM'
      }
    },
    items: [{
      merchantReference: 'official-sample-8X10',
      sku: 'GLOBAL-PHO-8X10-PRO',
      copies: 1,
      sizing: 'fillPrintArea',
      attributes: { finish: 'lustre' },
      assets: [{
        printArea: 'default',
        url: 'https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png'
      }]
    }]
  };
  const response = await fetch('https://api.sandbox.prodigi.com/v4.0/Orders', {
    method: 'POST',
    headers: { 'X-API-Key': env.PRODIGI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);
  const order = body?.order || {};
  const asset = order.items?.[0]?.assets?.[0] || {};
  return Response.json({
    httpStatus: response.status,
    outcome: body?.outcome || null,
    id: order.id || null,
    stage: order.status?.stage || null,
    issues: order.status?.issues || [],
    downloadAssets: order.status?.details?.downloadAssets || null,
    itemStatus: order.items?.[0]?.status || null,
    asset: { status: asset.status || null, url: asset.url || null, thumbnailUrl: asset.thumbnailUrl || null }
  }, { status: response.ok ? 200 : response.status, headers: { 'cache-control': 'no-store' } });
}
