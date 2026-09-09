export const getFullImageUrl = (url: string): string => {
  if (!url) return "";

  if (url.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url;
  }

  return `/api/${url}`;
};