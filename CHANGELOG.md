# Changelog

All notable changes to the dashboard are documented here.
Format: `## YYYY-MM-DD` sections with `- bullet` entries.

## 2026-10-13

- **Members:** owners now add teammates directly — name, email, password, role. The
  account is created on the spot and the login details are shown to copy and share. No
  invitation email, no invite link, and the member never signs up or creates a
  workspace. An email that already has an account is added as-is. The `/invite/[token]`
  page and invitation endpoints are removed.
- **API caching:** Fullbleed no longer caches anything. Every `/api` response (including
  `/api/v1`) is sent with `Cache-Control: no-store`, and the edge cache / vinext CDN
  adapter are disabled. Content edits show up on the next request; caching is up to the
  consuming website.

## 2026-10-05

- Added a **Settings** page (sidebar, bottom) for the business details your site reads:
  name, description, contact email, WhatsApp, phone numbers, address, opening hours,
  website URL, logo and social links. Only owners can save.
- New inquiries are now emailed to the Settings contact address, with `reply_to` set to
  the sender. The `POST /v1/inquiries` response reports `emailed` / `emailError`; the
  inquiry is stored either way. Blank contact address means dashboard-only.
- Added `GET /api/v1/site-config` so sites can read those details, with logo/image
  rewritten to absolute media URLs.
- Fixed `uploadMedia` returning the wrapped `{ data: … }` payload, which left callers
  with an undefined `url` and `mediaId`.

## 2026-08-13

- Settings > Brand: added color palette presets and font pickers (primary/secondary) with live preview; the storefront reflects the saved choices.
- Navbar & Footer settings: custom and auto nav are now mutually exclusive — auto nav is shown alone when enabled, the custom menu editor alone when disabled.

## 2026-08-12

- Added a changelog page so every dashboard user can see what's new.
- Changelog is maintained in this file — append a bullet under today's date on every change.
