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
| Members | Invite teammates and manage roles (owner vs editor). |
| Inquiries | Contact-form submissions arriving via the public API. |
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

Go to **Members** to invite someone by email. Invited people accept with a link and
create their account. Roles:

- **owner** — everything: content, media, members, API access.
- **editor** — content, media, and inquiries.

Owners can also remove a member to revoke access. Each workspace member's session only
sees that workspace.

## Inquiries

When your website submits a form through the public API (see the
[Public API guide](public-api.md) → *Inquiries*), the message lands here. Update its
status (`new` → `read` → `archived`) or delete it.

## API Access

This is where you create the **publishable key** your website uses. Keys look like:

```
kb_pub_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

- Keys are shown **only once** at creation — copy them immediately.
- List existing keys (by prefix), revoke a key to instantly block its requests.
- Keys are workspace-scoped: they only ever read that workspace's content.

Now read the [Public API guide](public-api.md) for how to use the key on a website.