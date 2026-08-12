const SOURCE_BASE_URL = 'https://newmexicothroughmylens-site.pages.dev/images/portfolio';

const PHOTO_FILES = {
  'NM-001':'photo-01-2131.jpg','NM-002':'photo-02-2238.jpg','NM-006':'photo-06-all_1119.jpg','NM-007':'photo-07-all_1141.jpg','NM-008':'photo-08-all_1143.jpg','NM-009':'photo-09-all_1144.jpg','NM-010':'photo-10-_all_117.jpg','NM-011':'photo-11-all_1290.jpg','NM-012':'photo-12-all_1296.jpg','NM-013':'photo-13-all_1424.jpg','NM-014':'photo-14-all_1452.jpg','NM-015':'photo-15-all_1488.jpg','NM-016':'photo-16-all_1893.jpg','NM-017':'photo-17-all_1898.jpg','NM-018':'photo-18-_all_193.jpg','NM-019':'photo-19-all_2066.jpg','NM-020':'photo-20-all_2090.jpg','NM-021':'photo-21-all_2130.jpg','NM-022':'photo-22-all_2131.jpg','NM-023':'photo-23-all_2132.jpg','NM-024':'photo-24-all_2601.jpg','NM-025':'photo-25-all_2772.jpg','NM-026':'photo-26-all_2945.jpg','NM-027':'photo-27-all_3066.jpg','NM-028':'photo-28-all_3105.jpg','NM-029':'photo-29-all_3401.jpg','NM-030':'photo-30-all_3406.jpg','NM-031':'photo-31-all_3416.jpg','NM-032':'photo-32-all_3419.jpg','NM-033':'photo-33-all_3432.jpg','NM-034':'photo-34-all_3433.jpg','NM-035':'photo-35-_all_397.jpg','NM-036':'photo-36-all_4079.jpg','NM-037':'photo-37-all_4191.jpg','NM-038':'photo-38-all_4245.jpg','NM-039':'photo-39-all_4250.jpg','NM-040':'photo-40-_all_435.jpg','NM-041':'photo-41-all_4412.jpg','NM-042':'photo-42-all_4423.jpg','NM-043':'photo-43-_all_625.jpg','NM-044':'photo-44-_all_628.jpg','NM-045':'photo-45-_all_631.jpg','NM-046':'photo-46-_all_653.jpg','NM-047':'photo-47-_all_878.jpg'
};

export async function onRequestGet(context) {
  return servePrintAsset(context, false);
}

export async function onRequestHead(context) {
  return servePrintAsset(context, true);
}

async function servePrintAsset({ params }, headOnly) {
  const requestedPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const match = requestedPath.match(/^(NM-\d{3})\.jpg$/i);
  const photoNumber = match?.[1]?.toUpperCase();
  const filename = PHOTO_FILES[photoNumber];
  if (!filename) return new Response('Unknown photograph', { status: 404 });

  let source;
  try {
    source = await fetch(`${SOURCE_BASE_URL}/${filename}`, {
      headers: { Accept: 'image/jpeg' }
    });
  } catch {
    return new Response('Print asset unavailable', { status: 503 });
  }
  if (!source.ok) {
    await source.body?.cancel();
    return new Response('Print asset unavailable', { status: 503 });
  }

  const bytes = await source.arrayBuffer();
  if (bytes.byteLength < 4) return new Response('Print asset unavailable', { status: 503 });

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
