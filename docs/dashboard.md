# Using the dashboard

The dashboard is the admin app for managing a workspace. Cloud signups land here right
after signup; the URL is always `{your-app}/workspace/{workspace-slug}/…`.

## Sign up and log in

- **Sign up** at `/signup` — pick a name, email, password, and a workspace name. Your
  workspace slug is derived from the workspace name; it becomes part of dashboard URLs.
- **Log in** at `/login`. Passwords are hashed with PBKDF2; sessions are signed cookies.
- Passwords must be at least 12 characters.

## Navigation

The sidebar groups the workspace's tools:

| Area | What it does |
|---|---|
| Dashboard | Compact overview of recent posts and pages. |
| Pages & Posts | Manage **Pages** (your main content; Services are a type of page) and **Posts** (blog). |
| Media | Upload images, edit alt text/captions, reuse files in content. |
| API Access | Create and revoke publishable API keys. |
| Members | Add teammates (you set their login) and manage roles (owner vs editor). |
| Settings | Business name, contact details, address, logo and social links for your website. |
| Redirects | Manage URL redirects that your site resolves through the API. |
| Authors / Categories / Tags | Taxonomy used by Posts. |

## Creating and publishing content

1. Open **Pages & Posts** and pick a content type (e.g. Posts).
2. **Create post** — give it a *title*, *slug*, write the body, set the cover image,
   author, category and tags, and fill in the SEO fields (meta title, description,
   canonical URL).
3. Save as **draft** to keep it hidden, or **publish** immediately.
4. Only content with status `published` (and not deleted) is returned by the
   [public API](public-api.md).

Slugs are used to address content in the API (`/posts/{slug}`, `/pages/{slug}`).
Slugify rules: lowercase, non-alphanumerics become `-`, max 100 chars.

## Media

- Upload single or multiple images in **Media**; files are stored in object storage
  (R2 on a self-hosted install) and exposed on your media domain.
- Each media item can carry title, alt text and a caption.
- Cover images in content resolve to full absolute URLs on your media domain, so you
  can put them straight into `<img src>`.
- Add images by URL too (metadadata row only) if you already store them elsewhere.

## Members and roles

Go to **Members** to add someone: enter their name, email, a password (one is generated
for you) and a role. The account is created immediately — no email is sent and they
don't sign up or create a workspace. Copy the login details shown and share them
yourself; the member logs in straight into your workspace. If the email already has an
account, it is added as-is and keeps its existing password. Roles:

- **owner** — everything: content, media, members, API access.
- **editor** — content and media.

Owners can also remove a member to revoke access. Each workspace member's session only
sees that workspace.

## Settings

Business details your website reads through the public API. Owners only — editors can
view but not save.

- **Business** — name, established year, short description.
- **Contact** — contact email and WhatsApp number.
- **Phone numbers**, **Address**, **Opening hours**.
- **Branding** — website URL, logo, and social links.

Your site fetches these with `GET /api/v1/site-config`; media fields come back as
absolute URLs on your media domain.

## API Access

This is where you create the **publishable key** your website uses. Keys look like:

```
kb_pub_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

- Keys are shown **only once** at creation — copy them immediately.
- List existing keys (by prefix), revoke a key to instantly block its requests.
- Keys are workspace-scoped: they only ever read that workspace's content.

Now read the [Public API guide](public-api.md) for how to use the key on a website.