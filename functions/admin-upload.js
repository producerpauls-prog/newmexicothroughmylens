const SECURE_UPLOAD_URL = 'https://github.com/producerpauls-prog/newmexicothroughmylens/upload/main/incoming-photos';

export function onRequestGet() {
  return redirectToSecureUploader();
}

export function onRequestHead() {
  return redirectToSecureUploader();
}

function redirectToSecureUploader() {
  return new Response(null, {
    status: 302,
    headers: {
      location: SECURE_UPLOAD_URL,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff'
    }
  });
}
