export async function onRequestGet({ env }) {
  if (!env.PRODIGI_API_KEY) return Response.json({ error: 'missing Prodigi binding' }, { status: 500 });
  const response = await fetch('https://api.sandbox.prodigi.com/v4.0/orders/ord_1167053', {
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
