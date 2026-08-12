const SOURCE_BASE_URL = 'https://raw.githubusercontent.com/producerpauls-prog/newmexicothroughmylens/main/print-assets';

export async function onRequestGet(context) {
  return servePrintAsset(context, false);
}

export async function onRequestHead(context) {
  return servePrintAsset(context, true);
}

async function servePrintAsset({ params }, headOnly) {
  const requestedPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const match = requestedPath.match(/^(NM-\d{3,9})\.jpg$/i);
  const photoNumber = match?.[1]?.toUpperCase();
  if (!photoNumber) return new Response('Unknown photograph', { status: 404 });

  let source;
  try {
    source = await fetch(`${SOURCE_BASE_URL}/${photoNumber}.jpg`, {
      headers: { Accept: 'image/jpeg' }
    });
  } catch {
    return new Response('Print asset unavailable', { status: 503 });
  }
  if (!source.ok) {
    await source.body?.cancel();
    return new Response('Print asset unavailable', { status: source.status === 404 ? 404 : 503 });
  }

  const bytes = await source.arrayBuffer();
  if (bytes.byteLength < 4) return new Response('Print asset unavailable', { status: 503 });
  const first = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 3));
  if (first[0] !== 0xff || first[1] !== 0xd8 || first[2] !== 0xff) return new Response('Print asset unavailable', { status: 503 });

  const headers = new Headers({
    'content-type': 'image/jpeg',
    'content-length': String(bytes.byteLength),
    'content-disposition': `inline; filename="${photoNumber}.jpg"`,
    'cache-control': 'public, max-age=86400',
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff'
  });
  return new Response(headOnly ? null : bytes, { status: 200, headers });
}
