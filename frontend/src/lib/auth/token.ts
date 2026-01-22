const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const DEVICE_ID_KEY = "deviceId";

export function getAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
}

export function getRefreshToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
}

export function getDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(DEVICE_ID_KEY) ?? undefined;
}

export function setTokens(
  accessToken: string,
  refreshToken: string,
  deviceId: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
