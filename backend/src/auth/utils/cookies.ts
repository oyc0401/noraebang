import type { Request } from "express";

export function getCookieValue(
  req: Request | undefined,
  name: string,
): string | undefined {
  if (!req) {
    return undefined;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex);
    if (cookieName !== name) {
      continue;
    }

    try {
      return decodeURIComponent(cookie.slice(separatorIndex + 1));
    } catch {
      return cookie.slice(separatorIndex + 1);
    }
  }

  return undefined;
}
