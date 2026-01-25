import { useAuthStore } from "@/store/authStore";
import { API_BASE_URL } from "./config";

export { API_BASE_URL };

const isServer = typeof window === "undefined";

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

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // 만료 60초 전에 갱신

type RecoveryResult = "success" | "auth_failed" | "server_error";

// 토큰 갱신 중복 방지를 위한 Promise 저장
let refreshPromise: Promise<RecoveryResult> | null = null;

function isTokenExpiringSoon(): boolean {
  const expiresAt = useAuthStore.getState().accessTokenExpiresAt;
  // expiresAt이 없으면 만료된 것으로 간주 → refresh 시도
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

// 토큰 갱신을 한 번만 실행하고, 다른 요청들은 같은 Promise를 기다림
async function refreshTokenOnce(): Promise<RecoveryResult> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = attemptRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export const customFetch = async <T>({
  url,
  method,
  params,
  data,
  headers,
  signal,
}: CustomFetchConfig): Promise<T> => {
  // 토큰 만료 임박 시 미리 갱신 (중복 요청 방지)
  if (!isServer && isTokenExpiringSoon()) {
    await refreshTokenOnce();
  }

  const queryString = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";

  const fullUrl = `${API_BASE_URL}${url}${queryString}`;

  const fetchRequest = () =>
    fetch(fullUrl, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: isServer ? "omit" : "include",
    });

  let response = await fetchRequest();

  if (!isServer && response.status === 401) {
    const recovered = await attemptRecovery();
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

interface AuthResponse {
  expiresIn: number;
  success: boolean;
}

function updateAccessTokenExpiresAt(expiresIn: number): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  useAuthStore.getState().setAccessTokenExpiresAt(expiresAt);
}

async function attemptRefresh(): Promise<RecoveryResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const data: AuthResponse = await response.json().catch(() => ({}));
      if (data.expiresIn) {
        updateAccessTokenExpiresAt(data.expiresIn);
      }
      return "success";
    }

    // 401/403: 인증 실패 → anonymous login 시도 가능
    if (response.status === 401 || response.status === 403) {
      return "auth_failed";
    }

    // 500 등 서버 에러: 토큰은 유효할 수 있음
    return "server_error";
  } catch {
    return "server_error";
  }
}

async function attemptAnonymousLogin(): Promise<RecoveryResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const data: AuthResponse = await response.json().catch(() => ({}));
      if (data.expiresIn) {
        updateAccessTokenExpiresAt(data.expiresIn);
      }
      return "success";
    }

    if (response.status === 401 || response.status === 403) {
      return "auth_failed";
    }

    return "server_error";
  } catch {
    return "server_error";
  }
}

async function attemptRecovery(): Promise<boolean> {
  const refreshResult = await attemptRefresh();

  if (refreshResult === "success") {
    return true;
  }

  // 서버 에러면 기존 토큰 유지, anonymous login 시도 안 함
  if (refreshResult === "server_error") {
    return false;
  }

  // 인증 실패(401/403)일 때만 anonymous login 시도
  const anonymousResult = await attemptAnonymousLogin();

  if (anonymousResult === "success") {
    return true;
  }

  // anonymous login도 인증 실패면 상태 초기화
  if (anonymousResult === "auth_failed") {
    useAuthStore.getState().clearAuth();
  }

  // 서버 에러면 clearAuth 안 함 (다음 요청에서 재시도 가능)
  return false;
}
