export async function onRequestGet({ env }) {
  if (!env.PRODIGI_API_KEY) return Response.json({ error: 'missing Prodigi binding' }, { status: 500 });
  const response = await fetch('https://api.sandbox.prodigi.com/v4.0/orders/ord_1167082', {
    headers: { 'X-API-Key': env.PRODIGI_API_KEY }
  });
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
    asset: {
      status: asset.status || null,
      url: asset.url || null,
      thumbnailUrl: asset.thumbnailUrl || null,
      md5Hash: asset.md5Hash || null
    }
  }, { status: response.ok ? 200 : response.status, headers: { 'cache-control': 'no-store' } });
}
