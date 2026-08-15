import { slugify } from "./slugify";

export function stripStyles(html: string) {
  html = html.replace(/&nbsp;/g, " ");
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove all style attributes
  doc.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));

  // Remove class attributes
  doc.querySelectorAll("[class]").forEach((el) => el.removeAttribute("class"));

  // Unwrap useless <span> tags (no attributes left)
  doc.querySelectorAll("span").forEach((span) => {
    if (span.attributes.length === 0) {
      const parent = span.parentNode;

      if (!parent) return;

      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    }
  });

  // Add slugified id to all h2 elements
  const seen = new Map<string, number>();
  doc.querySelectorAll("h2").forEach((h2) => {
    let id = slugify(h2.textContent || "");
    if (!id) return;
    const count = seen.get(id);
    if (count !== undefined) {
      seen.set(id, count + 1);
      id = `${id}-${count}`;
    } else {
      seen.set(id, 1);
    }
    h2.id = id;
  });

  return doc.body.innerHTML;
}
