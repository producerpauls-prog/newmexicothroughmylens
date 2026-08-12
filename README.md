# newmexicothroughmylens
New Mexico Through My Lens photography website and print shop

Print fulfillment uses the validated JPEG originals in `print-assets/`. The Stripe webhook sends Prodigi direct `raw.githubusercontent.com` URLs because Prodigi's downloader does not complete Cloudflare Pages asset downloads.

## Adding photographs

Upload one or more full-resolution JPEGs to `incoming-photos/` on the `main` branch. The filename does not need an ID. GitHub Actions validates each file, assigns the next unused `NM-###` ID, preserves the original bytes in `print-assets/`, updates `photos.json`, and removes the incoming copy.

The storefront reads `photos.json` and adds published photographs to the existing collection layout. Its existing Stripe Payment Links pass `NM-###_SIZE` in `client_reference_id`; the signed webhook uses the paid amount as the authoritative size and sends Prodigi the matching direct JPEG URL. No code, webhook, Stripe product, appearance, or price change is needed for each future photograph.
