export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const apiBase = "/api";
  const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {};

  if (
    options?.body instanceof FormData ||
    options?.headers instanceof Headers ||
    (options?.headers && "get" in options.headers)
  ) {
    // Let browser set Content-Type for FormData
  } else if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    credentials: "include",
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
    ...options,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return new Promise(() => {});
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Something went wrong");
  }

  return res.json();
}
