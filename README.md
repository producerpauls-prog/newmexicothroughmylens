# newmexicothroughmylens
New Mexico Through My Lens photography website and print shop

Print fulfillment uses the validated JPEG originals in `print-assets/`. The Stripe webhook sends Prodigi direct `raw.githubusercontent.com` URLs because Prodigi's downloader does not complete Cloudflare Pages asset downloads.

## Adding photographs

Open `https://newmexicothroughmylens.com/admin-upload` while signed in to the repository owner's GitHub account. The shortcut opens GitHub's protected uploader directly in `incoming-photos/` on `main`, where one or multiple full-resolution JPEGs can be selected from a phone or computer. Repository write permission is required, and the shortcut is not linked from the public storefront.

The filename does not need an ID. GitHub Actions validates each file, assigns the next unused `NM-###` ID, preserves the original bytes in `print-assets/`, updates `photos.json`, and removes the incoming copy.

The storefront reads `photos.json` and adds published photographs to the existing collection layout. Its existing Stripe Payment Links pass `NM-###_SIZE` in `client_reference_id`; the signed webhook uses the paid amount as the authoritative size and sends Prodigi the matching direct JPEG URL. No code, webhook, Stripe product, appearance, or price change is needed for each future photograph.
