import { batchMedia } from "./media";

export type MediaMeta = {
  alt: string | null;
  title: string | null;
  caption: string | null;
};

export async function resolveMediaHtml(html: string): Promise<string> {
  if (!html) return html;

  if (typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
    "text/html",
  );
  const figures = doc.querySelectorAll("figure[data-media-id]");
  if (figures.length === 0) return html;

  const ids: string[] = [];
  const figureList: HTMLElement[] = [];
  for (const fig of figures) {
    if (fig instanceof HTMLElement) {
      const mid = fig.getAttribute("data-media-id");
      if (mid && !ids.includes(mid)) ids.push(mid);
      figureList.push(fig);
    }
  }
  if (ids.length === 0) return html;

  try {
    const map = await batchMedia(ids);

    for (const fig of figureList) {
      const mid = fig.getAttribute("data-media-id");
      if (!mid) continue;
      const meta = map[mid];
      if (!meta) continue;

      const img = fig.querySelector("img");
      if (img) {
        if (meta.alt) img.setAttribute("alt", meta.alt);
        if (meta.title) img.setAttribute("title", meta.title);
      }

      const existingCaption = fig.querySelector("figcaption");
      if (meta.caption) {
        if (existingCaption) {
          existingCaption.textContent = meta.caption;
        } else {
          const fc = doc.createElement("figcaption");
          fc.textContent = meta.caption;
          fig.appendChild(fc);
        }
      } else if (existingCaption) {
        existingCaption.remove();
      }
    }
  } catch {
    return html;
  }

  const body = doc.querySelector("body");
  return body ? body.innerHTML : html;
}
