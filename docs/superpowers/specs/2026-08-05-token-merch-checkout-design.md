# Token Merch Checkout Design

Date: 2026-08-05

## Summary

Add a product-first merchandise page for the Ngobrolin WEB “Token” T-shirt. Buyers in Indonesia can build a mixed-variant cart, provide a structured delivery address, obtain a required shipping estimate, choose a preferred courier service, pay only for the merchandise through a hosted Mayar QRIS invoice, and receive email confirmation. Shipping is booked manually and paid by the recipient when the package arrives.

The existing Astro site remains on Cloudflare Pages. Pages Functions own checkout APIs and third-party integrations, Cloudflare D1 stores orders, Cloudflare Access protects a lightweight admin interface, and a small Cron Worker reconciles Mayar payments and performs retention cleanup.

## Goals

- Sell one made-to-order T-shirt through `ngobrol.in` without customer accounts.
- Support mixed color and size combinations in one order.
- Require a real RajaOngkir shipping estimate before payment.
- Reconcile every payment to one durable local order.
- Give buyers clear production, shipping, size, cancellation, and refund expectations.
- Give the operator a protected fulfillment queue and auditable state transitions.
- Keep fixed monthly infrastructure costs at zero while usage remains inside free tiers.

## Non-goals

- Automated courier booking, pickup, label generation, or shipping payment.
- Inventory reservation or stock tracking; all shirts are made to order.
- Customer accounts or saved addresses.
- Coupons, promotions, tax calculation, international shipping, or multiple products.
- Marketing contact retention or promotional messaging.
- Automatic refunds through Mayar.

## Product Definition

| Attribute | Value |
| --- | --- |
| Product | Token |
| Artwork | “Kebanyakan Ide Kekurangan Token” |
| Story | A spontaneous meme from a live Ngobrolin WEB podcast session |
| Fabric | New States Apparel Premium Cotton T-shirt |
| Printing | Sablon |
| Colors | Cokelat Gelap and Putih |
| Default color | Cokelat Gelap |
| Sizes | S, M, L, XL, 2XL, 3XL, 4XL, 5XL |
| Unit price | Rp180.000 for every color and size |
| Production time | 2–3 days before shipping |
| Maximum order | 12 shirts across all variants |
| Shipping weight | 250 grams per shirt |

The customer pays exactly `Rp180.000 × quantity` online. The merchant absorbs Mayar and QRIS fees. Ongkir is not included in the Mayar invoice.

### Size chart

| Size | Chest width | Length | Sleeve |
| --- | ---: | ---: | ---: |
| S | 47 cm | 67 cm | 19 cm |
| M | 50 cm | 70 cm | 19.5 cm |
| L | 53 cm | 73 cm | 20 cm |
| XL | 56 cm | 75 cm | 20.5 cm |
| 2XL | 59 cm | 77 cm | 21 cm |
| 3XL | 62 cm | 80 cm | 21.5 cm |
| 4XL | 65 cm | 83 cm | 22 cm |
| 5XL | 68 cm | 86 cm | 22.5 cm |

Measurement tolerance is 1–2.5 cm. The page must explain how chest width, length, and sleeve are measured.

## Customer Experience

### Product page

Use `/merch` for the initial single-product experience and add “Merch” to desktop and mobile navigation. The page uses the existing dark Ngobrolin WEB visual language.

The first viewport is product-first:

- Large Cokelat Gelap product image by default.
- Alternate Putih and worn photos in the gallery.
- Product name, story, Rp180.000 price, color, size, and quantity controls.
- Cart summary and “Order sekarang” action.
- Made-to-order and production-time notice visible near the action.

Selecting a color updates the lead product image. The back is described as plain/no print; a back photo is not required.

### Cart

The cart supports multiple line items. A line item is uniquely identified by color and size. Adding the same combination increments its quantity instead of creating a duplicate row.

The server enforces:

- Allowed product, colors, and sizes.
- Integer quantity greater than zero.
- Maximum 12 shirts across all line items.
- Rp180.000 canonical unit price.
- Package weight of `250 × total quantity` grams.

Browser-provided prices, totals, and weights are never trusted.

### Delivery form

Checkout is guest-only. Require:

- Recipient name.
- Email address.
- WhatsApp/mobile number.
- Street/building address.
- Province.
- City/regency.
- Kecamatan.
- Kelurahan/desa.
- Postcode.
- Optional delivery notes.

Province through kelurahan use searchable structured selections backed by shipping-provider location identifiers. They are not unrestricted text fields.

The shipping origin is:

- Banten.
- Tangerang Selatan.
- Ciputat Timur.
- Rengas.
- Postcode 15412.

### Shipping estimate

Use RajaOngkir Starter and initially request JNE, J&T, SiCepat, and AnterAja regular/economy services. Do not show services the operator will not manually book.

The buyer must select one returned service before checkout can continue. Store the courier, service, estimated cost, estimated duration, package weight, destination identifier, and quote timestamp as a snapshot on the order.

Display this notice wherever the estimate appears:

> Estimasi ongkir tidak termasuk dalam pembayaran. Ongkir dibayar penerima saat paket tiba dan tarif akhir dapat berbeda.

The selected service is a fulfillment preference, not a binding rate. If RajaOngkir fails or returns no eligible service, preserve the form and cart, block payment, and offer retry/check-back-later guidance. Do not substitute stale or invented rates.

### Review and policy acknowledgement

Before payment, show:

- Every cart line and merchandise subtotal.
- Selected courier/service and estimated ongkir, clearly excluded from payment.
- Production time of 2–3 days before shipping.
- Size chart and measurement tolerance.
- Made-to-order size policy.
- Cancellation/refund policy.
- Links to privacy, ordering, shipping, and refund terms.

Required size-policy text:

> Pesanan dibuat sesuai ukuran yang dipilih. Salah pilih ukuran tidak dapat ditukar. Penggantian hanya berlaku untuk barang cacat atau barang yang tidak sesuai pesanan.

Required cancellation/refund text:

> Permintaan pembatalan atau refund ditinjau berdasarkan status produksi dan kondisi pesanan. Hubungi kami melalui WhatsApp dengan nomor pesanan. Pengajuan tidak otomatis menjamin refund. Barang cacat atau tidak sesuai pesanan akan ditangani tanpa biaya tambahan bagi pembeli.

### Payment

Create a one-off Mayar v2 invoice and restrict it to `paymentMethod: "qris"`:

- Production: `POST https://api.mayar.id/hl/v2/invoices/create`.
- Sandbox: `POST https://api.mayar.io/hl/v2/invoices/create`.
- Set `expiredAt` to 30 minutes after creation.
- Send canonical cart lines as Mayar invoice items.
- Put the local order identity in `extraData`.
- Do not include ongkir as an invoice item.

Mayar returns invoice ID, transaction ID, hosted link, and expiration. Save these before redirecting the buyer to the hosted invoice.

The browser return is not proof of payment. Only a verified Mayar status may move an order to paid.

### Confirmation and status

After verified payment:

- Email the buyer from `Ngobrolin WEB Merch <merch@ngobrol.in>` through Resend.
- Set reply-to to `rizafahmi@gmail.com`.
- Send an admin notification to `rizafahmi@gmail.com`.
- Include order number, items, merchandise amount, address, shipping estimate, production time, and recipient-paid shipping notice.
- Include a secure order-status link with an unguessable token.
- Include support link `https://wa.me/628128231512` with order-aware prefilled text.

The public status page shows payment and fulfillment state, cart, selected courier, and tracking information. It must not display the complete stored address after initial confirmation.

Email customers only for:

1. Payment confirmed/order accepted.
2. Shipment sent with courier and tracking number.
3. Cancellation or refund.

Internal production transitions do not send customer email.

## Architecture

```text
Buyer/Admin
    |
    v
Astro on Cloudflare Pages
    |
    +-- Pages Functions
    |     +-- order and status APIs
    |     +-- RajaOngkir proxy
    |     +-- Mayar invoice and webhook handlers
    |     +-- admin APIs
    |     +-- Resend notifications
    |
    +-- Cloudflare D1
    |
    +-- Cloudflare Access for /admin

Small Cloudflare Cron Worker
    +-- invokes authenticated reconciliation/retention endpoints
```

Cloudflare Pages cannot run Cron Triggers directly. The scheduled Worker is intentionally small and may live in the same repository, but deploys as a separate Worker. It invokes an authenticated internal endpoint rather than duplicating order-domain logic.

## Checkout Data Flow

1. Buyer builds a mixed-variant cart.
2. Buyer enters a structured Indonesian address.
3. Server validates cart and destination, recalculates weight, and requests RajaOngkir rates.
4. Buyer selects an eligible service.
5. Server validates the final submission and obtains a fresh required quote if the snapshot is stale.
6. Server creates the local pending order and line items in D1.
7. Server creates the 30-minute hosted Mayar QRIS invoice.
8. Server saves Mayar identifiers and returns the hosted link.
9. Browser redirects to Mayar.
10. Mayar webhook notifies the Pages Function.
11. The handler authenticates the request and verifies invoice status with Mayar before applying payment state.
12. An atomic, idempotent transition marks the order paid and enqueues/sends buyer and admin notifications.
13. The scheduled Worker reconciles pending transactions if the webhook is delayed or missed.

If Mayar invoice creation fails after the local insert, mark the local order `checkout_failed`; do not leave an apparently payable pending order.

## Data Model

### Orders

Store:

- Internal ID and human-readable public order number.
- Hash of the public status-link token; never store the raw token.
- Customer name, email, mobile, and structured address.
- Province and city/regency in dedicated fields for post-anonymization statistics.
- Merchandise subtotal in integer IDR.
- Total quantity and package weight in grams.
- Selected courier/service and quote snapshot.
- Mayar invoice ID, transaction ID, link metadata, and expiration.
- Payment and fulfillment status.
- Courier and tracking number used for the actual shipment.
- Internal notes.
- Created, paid, shipped, completed, cancelled/refunded, and anonymized timestamps.

### Order items

Store immutable purchase snapshots:

- Order ID.
- Product name.
- Color.
- Size.
- Quantity.
- Unit price in integer IDR.

### Order events

Use append-only events for:

- State transition.
- Actor: webhook, reconciliation, admin, notification retry, or retention job.
- Timestamp.
- Provider event identity or stable payload fingerprint for idempotency.
- Minimal non-PII metadata needed to audit the transition.

Do not copy full addresses or contact data into event payloads.

### Notifications

Track notification type, recipient role, provider message ID, status, attempts, and last error. A retry must not duplicate an already successful notification.

## Order State Machine

Primary fulfillment path:

```text
pending_payment -> paid_producing -> ready_to_ship -> shipped -> completed
```

Terminal/exception states:

- `checkout_failed`.
- `payment_expired`.
- `cancelled`.
- `refunded`.

Only verified Mayar payment handling may enter `paid_producing`. Admins cannot manually mark an order paid.

When moving to `shipped`, require the actual courier and tracking number, then send the shipment email. Cancellation/refund decisions are handled case-by-case through WhatsApp and executed manually in Mayar before the local status is updated.

## Admin Experience

Protect `/admin` and all admin APIs with Cloudflare Access email one-time code. Allow only approved identities, initially `rizafahmi@gmail.com`. Server-side APIs must validate the Access identity; protecting only the rendered route is insufficient.

The admin page supports:

- Filtering by status.
- Viewing product lines, contact/address, quote, and payment data.
- Moving orders through valid fulfillment transitions.
- Adding internal notes.
- Entering actual courier and tracking number.
- Recording cancellation/refund after manual Mayar action.
- Viewing append-only history.
- Retrying failed email notifications.

## Privacy and Retention

Use fulfillment contact data only to process the order. Do not add marketing consent or reuse checkout details for meetup promotion.

A daily retention job anonymizes an order 90 days after completion:

- Delete name, email, phone, street/building address, kecamatan, kelurahan/desa, postcode, and delivery notes.
- Retain province and city/regency only for anonymized aggregate mapping.
- Retain product variants, financial totals, non-personal payment references, and timestamps for accounting and analysis.
- Record the anonymization event without preserving erased values.

## Security

- Keep all provider keys and internal reconciliation secrets in Cloudflare secrets/bindings.
- Validate product, variants, quantities, prices, totals, weight, destination identifiers, and state transitions server-side.
- Use integer rupiah amounts.
- Use cryptographically random public status tokens and store only hashes.
- Require Cloudflare Turnstile before rate quote/checkout operations.
- Apply request throttling and cache area lookups and identical short-lived quote requests where safe.
- Authenticate the Mayar webhook with a secret URL and re-fetch invoice status before marking paid because the public webhook documentation does not specify a signed body.
- Make webhook and reconciliation processing idempotent.
- Avoid PII in URLs, logs, analytics, and event metadata.
- Add CSRF protection to admin mutations in addition to Cloudflare Access identity checks.

## Failure Handling

- RajaOngkir failure blocks checkout and preserves user input.
- D1 write failure prevents Mayar invoice creation.
- Mayar creation failure marks the local order `checkout_failed`.
- Duplicate webhooks are accepted safely without duplicate side effects.
- Email failure does not roll back payment; it appears in admin for retry.
- Delayed or missed webhooks are repaired by scheduled reconciliation.
- A delayed confirmed payment on an expired local order is escalated to a visible admin exception rather than discarded.
- Invalid or unavailable courier responses never fall back to fabricated rates.

## External Services and Expected Cost

Initial fixed monthly service cost can remain Rp0 within free tiers:

- Cloudflare Pages/Functions, D1, Access, Turnstile, and small Cron Worker.
- RajaOngkir Starter: 100 rate checks/day.
- Resend Free: 3,000 emails/month and 100/day.
- Mayar Starter: Rp0/month.

Mayar charges approximately 1.5% invoicing fee plus 0.7% QRIS channel fee on Starter, and Rp2.775 per withdrawal. The merchant absorbs these fees. Reconfirm all vendor prices and limits immediately before launch.

## Verification Strategy

### Unit tests

- Product variant allowlist.
- Mixed-cart merge and 12-item limit.
- Canonical totals and integer money handling.
- `250 × quantity` weight formula.
- Valid and invalid state transitions.
- Status-token hashing and comparison.
- 90-day anonymization field removal.

### Function integration tests

- Successful and failed RajaOngkir quote responses.
- Checkout blocked without a current valid quote.
- Mayar invoice payload excludes ongkir and has a 30-minute expiry.
- Local pending order exists before the Mayar request.
- Mayar creation failure produces `checkout_failed`.
- Authenticated, unauthenticated, duplicate, mismatched, and delayed webhooks.
- Invoice re-fetch before paid transition.
- Resend success, failure, and idempotent retry.
- Admin identity enforcement and state-transition validation.

### Browser tests

- Product image/color selection.
- Mixed color/size cart.
- Structured address flow.
- Rate failure blocks checkout without losing entered values.
- Required policy acknowledgement.
- Hosted invoice redirect.
- Secure order-status route.
- Cloudflare Access protection for admin routes in an appropriate deployed test environment.

### External acceptance

1. Use Mayar sandbox to create a one-off invoice with QRIS, line items, `extraData`, and 30-minute expiration.
2. Complete a sandbox payment.
3. Capture the real webhook payload and prove it can be matched to the saved transaction.
4. Verify invoice status through the Mayar API before transitioning paid.
5. Exercise duplicate webhook and missed-webhook reconciliation.
6. Verify RajaOngkir origin/destination and the four configured couriers with real test addresses.
7. Send test buyer/admin emails from the verified `ngobrol.in` domain.
8. Place one controlled low-value live order before public launch.

## Launch Gates

- Mayar sandbox spike proves unique transaction matching and status verification.
- Production Mayar invoice endpoint and QRIS channel are active.
- RajaOngkir API key, origin identifier, courier responses, and quota behavior are verified.
- Resend sender domain has valid SPF/DKIM records.
- Cloudflare D1 migrations and backup/export procedure are tested.
- Cloudflare Access policy protects admin HTML and API routes.
- Privacy and commerce terms are published and linked before payment.
- Product images are optimized and approved for commercial publication.
- End-to-end sandbox and controlled production orders pass.

## Success Criteria

- A buyer can order 1–12 mixed variants on mobile or desktop.
- Checkout cannot proceed without a valid selected shipping estimate.
- Mayar charges exactly the canonical merchandise subtotal and never ongkir.
- One verified Mayar transaction creates exactly one paid transition and one confirmation set.
- The operator can fulfill an order without querying D1 manually.
- The buyer can inspect current status through the secure emailed link.
- Shipment email includes actual courier and tracking number.
- Completed orders are anonymized automatically after 90 days.
