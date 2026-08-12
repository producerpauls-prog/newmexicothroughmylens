const PRICE_TO_SIZE = {
  3000: '8X10',
  7500: '16X20',
  12500: '20X30'
};

const DEFAULT_PRINT_ASSET_BASE_URL = 'https://raw.githubusercontent.com/producerpauls-prog/newmexicothroughmylens/main/print-assets';

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.STRIPE_WEBHOOK_SECRET) return text('STRIPE_WEBHOOK_SECRET is not configured', 500);
  if (!env.PRODIGI_API_KEY) return text('PRODIGI_API_KEY is not configured', 500);

  const raw = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  const verified = await verifyStripeSignature(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) return text('Invalid Stripe signature', 400);

  let event;
  try { event = JSON.parse(raw); } catch { return text('Invalid JSON', 400); }
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return text('ignored', 200);

  const session = event.data?.object || {};
  if (session.payment_status && session.payment_status === 'unpaid') return text('not paid', 200);
  const photoNumber = getPhotoNumber(session);
  if (!photoNumber) return text('No Photo Number; manual fulfillment required', 200);
  const size = parseSizeFromReference(session.client_reference_id) || PRICE_TO_SIZE[session.amount_subtotal];
  if (!size) return text('Unable to determine print size; manual fulfillment required', 200);
  const sku = env[`PRODIGI_SKU_${size}`];
  if (!sku) return text(`PRODIGI_SKU_${size} is not configured`, 500);

  const shipping = session.shipping_details || session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!shipping || !address) return text('No shipping details; manual fulfillment required', 200);

  // Prodigi's downloader does not complete downloads from Cloudflare Pages URLs,
  // so fulfillment uses GitHub's direct raw-file host for these immutable assets.
  const imageUrl = photoUrl(photoNumber, env.PRINT_ASSET_BASE_URL || DEFAULT_PRINT_ASSET_BASE_URL);
  if (!imageUrl) return text('Unknown photo number', 400);

  const assetError = await validatePrintAsset(imageUrl);
  if (assetError) {
    console.error('Print asset validation failed', { sessionId: session.id, photoNumber, imageUrl, assetError });
    return text(`Print asset unavailable: ${assetError}`, 503);
  }

  const payload = {
    merchantReference: `stripe-${session.id}`, idempotencyKey: `stripe-${session.id}`, shippingMethod: 'Standard',
    recipient: { name: shipping.name || session.customer_details?.name || 'Customer', email: session.customer_details?.email || null, phoneNumber: session.customer_details?.phone || null,
      address: { line1: address.line1, line2: address.line2 || null, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || null } },
    items: [{ merchantReference: `${photoNumber}-${size}`, sku, copies: 1, sizing: 'fillPrintArea', attributes: { finish: 'lustre' }, assets: [{ printArea: 'default', url: imageUrl }] }],
    metadata: { stripeCheckoutSession: session.id, photoNumber, printSize: size, environment: 'sandbox' }
  };

  let response;
  try {
    response = await fetch('https://api.sandbox.prodigi.com/v4.0/Orders', { method: 'POST', headers: { 'X-API-Key': env.PRODIGI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch (error) {
    console.error('Prodigi request failed', error);
    return text(`Prodigi request failed: ${safeErrorMessage(error)}`, 503);
  }

  const result = await response.text();
  if (!response.ok) return text(`Prodigi error: ${result}`, 503);

  const fulfillment = prodigiSummary(result, imageUrl);
  console.log('Prodigi order accepted', {
    eventId: event.id,
    sessionId: session.id,
    photoNumber,
    size,
    imageUrl,
    orderId: fulfillment.orderId,
    outcome: fulfillment.outcome,
    assetStatus: fulfillment.assetStatus,
    assetUrlVerified: fulfillment.assetUrlVerified
  });

  if (fulfillment.assetUrlVerified === false && fulfillment.outcome !== 'alreadyexists') {
    return text('Prodigi accepted the order without the selected image URL', 503);
  }

  return text(`fulfilled in Prodigi sandbox; order ${fulfillment.orderId}; asset ${fulfillment.assetStatus}; image URL ${fulfillment.assetUrlVerified ? 'verified' : 'pending verification'}`, 200);
}

function getPhotoNumber(session) {
  const fromRef = (session.client_reference_id || '').match(/NM-\d{3}/i)?.[0]; if (fromRef) return fromRef.toUpperCase();
  for (const field of session.custom_fields || []) { const label = field.label?.custom || ''; if (/photo\s*number/i.test(label)) { const value = field.text?.value || field.numeric?.value || field.dropdown?.value || ''; const match = String(value).match(/NM-?\d{3}|\d{1,3}/i); if (match) { const n = String(match[0]).replace(/\D/g, ''); return `NM-${n.padStart(3, '0')}`; } } }
  return null;
}

function parseSizeFromReference(ref = '') { const normalized = ref.toUpperCase().replace(/[^0-9X]/g, ''); for (const size of ['8X10','16X20','20X30']) if (normalized.includes(size)) return size; return null; }

function photoUrl(photoNumber, base) {
  const files = {'NM-001':'photo-01-2131.jpg','NM-002':'photo-02-2238.jpg','NM-006':'photo-06-all_1119.jpg','NM-007':'photo-07-all_1141.jpg','NM-008':'photo-08-all_1143.jpg','NM-009':'photo-09-all_1144.jpg','NM-010':'photo-10-_all_117.jpg','NM-011':'photo-11-all_1290.jpg','NM-012':'photo-12-all_1296.jpg','NM-013':'photo-13-all_1424.jpg','NM-014':'photo-14-all_1452.jpg','NM-015':'photo-15-all_1488.jpg','NM-016':'photo-16-all_1893.jpg','NM-017':'photo-17-all_1898.jpg','NM-018':'photo-18-_all_193.jpg','NM-019':'photo-19-all_2066.jpg','NM-020':'photo-20-all_2090.jpg','NM-021':'photo-21-all_2130.jpg','NM-022':'photo-22-all_2131.jpg','NM-023':'photo-23-all_2132.jpg','NM-024':'photo-24-all_2601.jpg','NM-025':'photo-25-all_2772.jpg','NM-026':'photo-26-all_2945.jpg','NM-027':'photo-27-all_3066.jpg','NM-028':'photo-28-all_3105.jpg','NM-029':'photo-29-all_3401.jpg','NM-030':'photo-30-all_3406.jpg','NM-031':'photo-31-all_3416.jpg','NM-032':'photo-32-all_3419.jpg','NM-033':'photo-33-all_3432.jpg','NM-034':'photo-34-all_3433.jpg','NM-035':'photo-35-_all_397.jpg','NM-036':'photo-36-all_4079.jpg','NM-037':'photo-37-all_4191.jpg','NM-038':'photo-38-all_4245.jpg','NM-039':'photo-39-all_4250.jpg','NM-040':'photo-40-_all_435.jpg','NM-041':'photo-41-all_4412.jpg','NM-042':'photo-42-all_4423.jpg','NM-043':'photo-43-_all_625.jpg','NM-044':'photo-44-_all_628.jpg','NM-045':'photo-45-_all_631.jpg','NM-046':'photo-46-_all_653.jpg','NM-047':'photo-47-_all_878.jpg'};
  const file = files[photoNumber]; return file ? `${base.replace(/\/$/, '')}/${photoNumber}.jpg` : null;
}

async function validatePrintAsset(url) {
  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'image/jpeg,image/png' } });
  } catch (error) {
    return safeErrorMessage(error);
  }

  if (!response.ok) {
    await response.body?.cancel();
    return `HTTP ${response.status}`;
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('image/jpeg') && !contentType.startsWith('image/png')) {
    await response.body?.cancel();
    return `unexpected content type ${contentType || 'missing'}`;
  }

  if (!response.body) return 'empty response body';
  const reader = response.body.getReader();
  const { value, done } = await reader.read();
  await reader.cancel();
  if (done || !value?.length) return 'empty image';

  const jpeg = value.length >= 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff;
  const png = value.length >= 8 && value[0] === 0x89 && value[1] === 0x50 && value[2] === 0x4e && value[3] === 0x47;
  return jpeg || png ? null : 'invalid image bytes';
}

function prodigiSummary(result, expectedImageUrl) {
  let parsed;
  try { parsed = JSON.parse(result); } catch { return { orderId: 'unknown', outcome: 'unknown', assetStatus: 'unknown', assetUrlVerified: null }; }
  const order = parsed?.order || {};
  const asset = order.items?.[0]?.assets?.[0];
  return {
    orderId: order.id || 'unknown',
    outcome: String(parsed?.outcome || 'unknown').toLowerCase(),
    assetStatus: String(asset?.status || order.status?.details?.downloadAssets || 'pending').toLowerCase(),
    assetUrlVerified: asset?.url ? asset.url === expectedImageUrl : null
  };
}

async function verifyStripeSignature(payload, header, secret) { const parts=header.split(',').map(x=>x.trim()); const timestamp=parts.find(x=>x.startsWith('t='))?.slice(2); const signatures=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3)); if(!timestamp||!signatures.length)return false; if(Math.abs(Date.now()/1000-Number(timestamp))>300)return false; const enc=new TextEncoder(); const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']); const sig=await crypto.subtle.sign('HMAC',key,enc.encode(`${timestamp}.${payload}`)); const expected=[...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join(''); return signatures.some(s=>timingSafeEqual(s,expected)); }
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function safeErrorMessage(error){return String(error?.message||error||'Unknown error').replace(/[^\w .,:;()/-]/g,'?').slice(0,160);}
function text(body,status=200){return new Response(body,{status,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
