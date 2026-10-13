# Changelog

All notable changes to the dashboard are documented here.
Format: `## YYYY-MM-DD` sections with `- bullet` entries.

## 2026-10-13

- **Team.** New **Team** page in the sidebar for the staff profiles shown on your
  website: photo, name, role, description, and optional profession, qualification and
  license. Add, edit and remove them from the dashboard; websites read them from
  `GET /api/v1/team`. These are profiles, not logins (those stay under Members).
- **Lists remember where you were.** Opening an item and coming back (Cancel or Save)
  used to jump the table back to page 1 and drop the filters. Page, page size, Posts'
  All/Trash and category filter, and Services' status and category filter now live in
  the URL and are restored.
- **Editors keep their category and author.** Opening a service or post and saving it
  wiped the saved category (and the post's author): the dropdown cleared itself while its
  options were still loading. Fixed in both editors.
- **Workspace switcher.** The sidebar header is now a menu of every workspace you
  belong to, with your role in each; switching keeps you on the same section. One
  login per person: if an owner adds an email that already has an account, it keeps its
  own password and the Members page says so plainly.
- **Login lands where you expect.** You return to the workspace you last had open. On a
  fresh browser it is one you own, not whichever workspace added you most recently.
- **Post authors.** Owners can attach an author to a post from the post editor (Author
  field next to Category). Editors see the author but can't change it; their saves keep
  it. The author shows up in the posts list and in the public API.
- **Dashboard counts fixed.** Services were always 0 (counted the wrong content type),
  pages were counted as posts when there were no posts, and trashed posts were still
  counted.
- **Workspace scoping fixed.** For anyone in more than one workspace, dashboard data
  (posts, media, counts, …) came from their newest workspace instead of the one open.
  Every dashboard request is now scoped to the workspace page it comes from.
- **Tags on posts.** The post editor has a Tags field: pick existing tags or type a new
  one and press Enter. (The old hidden "Cover Image Alt" field in the SEO panel was
  secretly writing tags — removed.) The Tags page now shows how many posts use each tag.
- **Deletes update in place.** Moving a post to trash, restoring it, deleting it for
  good and deleting a service now refresh the list without a page reload. Permanent
  deletes and member removal ask for confirmation in a dialog instead of the browser
  popup.
- **Inquiries removed.** The Inquiries page, `/api/inquiries`, `POST /api/v1/inquiries`
  and inquiry emails are gone, along with Resend. Existing rows stay in the database
  untouched.
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
