export async function onRequestGet(context) {
  const key = context.env.PRODIGI_API_KEY;
  if (!key) return json({ ok: false, error: 'PRODIGI_API_KEY is not configured' }, 500);

  const candidates = [
    'GLOBAL-PHO-8X10-PRO','GLOBAL-PHO-8X10',
    'GLOBAL-PHO-11X14-PRO','GLOBAL-PHO-11X14',
    'GLOBAL-PHO-16X20-PRO','GLOBAL-PHO-16X20',
    'GLOBAL-PHO-20X30-PRO','GLOBAL-PHO-20X30'
  ];

  const results = [];
  for (const sku of candidates) {
    try {
      const r = await fetch(`https://api.sandbox.prodigi.com/v4.0/products/${encodeURIComponent(sku)}`, {
        headers: { 'X-API-Key': key }
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.product) {
        results.push({
          sku: data.product.sku,
          description: data.product.description,
          productDimensions: data.product.productDimensions,
          attributes: data.product.attributes,
          shipsToUS: Array.isArray(data.product.variants) ? data.product.variants.some(v => Array.isArray(v.shipsTo) && v.shipsTo.includes('US')) : null
        });
      }
    } catch (_) {}
  }

  return json({ ok: true, environment: 'sandbox', results });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
