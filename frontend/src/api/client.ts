import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";
import { API_BASE_URL } from "./config";

export { API_BASE_URL };

interface CustomFetchConfig {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json();
}

async function getValidToken(): Promise<string | undefined> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken || !refreshToken) {
    return undefined;
  }

  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    const exp = payload.exp * 1000;
    const now = Date.now();

    if (exp - now < 60 * 1000) {
      const result = await refreshTokens(refreshToken);
      setTokens(result.accessToken, result.refreshToken);
      return result.accessToken;
    }

    return accessToken;
  } catch {
    return accessToken;
  }
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  body?: unknown;

  constructor(
    message: string,
    status: number,
    statusText: string,
    url: string,
    body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.body = body;
  }
}

export const customFetch = async <T>({
  url,
  method,
  params,
  data,
  headers,
  signal,
}: CustomFetchConfig): Promise<T> => {
  const queryString = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";

  const fullUrl = `${API_BASE_URL}${url}${queryString}`;

  const token = await getValidToken();
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(fullUrl, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { message?: string }).message ||
      `HTTP ${response.status} ${response.statusText}`;
    throw new ApiError(
      message,
      response.status,
      response.statusText,
      fullUrl,
      errorBody,
    );
  }

  return response.json();
};
