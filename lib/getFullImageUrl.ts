export const getFullImageUrl = (url: string): string => {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `/api${url.startsWith("/") ? "" : "/"}${url}`;
};
