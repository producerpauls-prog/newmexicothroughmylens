export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  let html = await response.text();
  const script = `<script>
  (() => {
    document.addEventListener('click', (event) => {
      const button=event.target.closest('.photo-buy');
      if(!button) return;
      const holder=button.closest('[data-photo]');
      const photo=holder?.dataset?.photo;
      if(!photo) return;
      document.querySelectorAll('.modal-choice').forEach((link) => {
        const size=link.dataset.size;
        if(!size) return;
        const u=new URL(link.getAttribute('href'), location.href);
        u.searchParams.set('client_reference_id', photo+'_'+size);
        link.href=u.toString();
      });
    }, true);
  })();
  </script>`;
  html = html.replace('</body>', script + '</body>');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-cache');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
