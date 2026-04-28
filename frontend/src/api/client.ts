import { useAuthStore } from "@/store/authStore";
import { API_BASE_URL } from "./config";

export { API_BASE_URL };

const isServer = typeof window === "undefined";

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

interface CustomFetchConfig {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
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

interface MobileAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 동시 다중 요청의 refresh 중복 실행 방지
let refreshPromise: Promise<boolean> | null = null;

function isTokenExpiringSoon(): boolean {
  const expiresAt = useAuthStore.getState().accessTokenExpiresAt;
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

async function refreshOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = attemptRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function attemptRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();

  if (!refreshToken) {
    return attemptAnonymousLogin();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/mobile/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = (await response.json()) as MobileAuthResponse;
      setTokens(data.accessToken, data.refreshToken, data.expiresIn);
      return true;
    }

    if (response.status === 401 || response.status === 403) {
      clearTokens();
      return attemptAnonymousLogin();
    }

    return false;
  } catch {
    return false;
  }
}

async function attemptAnonymousLogin(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/mobile/anonymous`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = (await response.json()) as MobileAuthResponse;
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken, data.expiresIn);
      return true;
    }

    return false;
  } catch {
    return false;
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
  if (!isServer && isTokenExpiringSoon()) {
    await refreshOnce();
  }

  const queryString = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";

  const fullUrl = `${API_BASE_URL}${url}${queryString}`;

  const buildHeaders = (): Record<string, string> => {
    const base: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (!isServer) {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) {
        base.Authorization = `Bearer ${accessToken}`;
      }
    }

    return base;
  };

  const fetchRequest = () =>
    fetch(fullUrl, {
      method,
      signal,
      headers: buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

  let response = await fetchRequest();

  if (!isServer && response.status === 401) {
    const recovered = await refreshOnce();
    if (recovered) {
      response = await fetchRequest();
    }
  }

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

  const responseText = await response.text();
  if (!responseText.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new ApiError(
      "Invalid JSON response",
      response.status,
      response.statusText,
      fullUrl,
      responseText,
    );
  }
};
