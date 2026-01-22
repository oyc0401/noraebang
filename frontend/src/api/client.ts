import { API_BASE_URL } from "./config";

export { API_BASE_URL };

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1일
const LAST_ACTIVITY_STORAGE_KEY = "song:lastApiActivity";

let lastActivityInMemory = 0;
let pendingRefreshPromise: Promise<void> | null = null;

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

export const customFetch = async <T>({
  url,
  method,
  params,
  data,
  headers,
  signal,
}: CustomFetchConfig): Promise<T> => {
  await ensureDailyRefresh();

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
      credentials: "include",
    });

  let response = await fetchRequest();

  try {
    if (response.status === 401) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
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
  } finally {
    recordActivity();
  }
};

async function attemptRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    await response.json().catch(() => ({}));
    return true;
  } catch {
    return false;
  }
}

function recordActivity(timestamp: number = Date.now()): void {
  lastActivityInMemory = timestamp;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      LAST_ACTIVITY_STORAGE_KEY,
      timestamp.toString(),
    );
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

function getLastActivity(): number | undefined {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!Number.isNaN(parsed)) {
          lastActivityInMemory = parsed;
          return parsed;
        }
      }
    } catch {
      // localStorage 접근 실패 시 메모리 값 사용
    }
  }

  return lastActivityInMemory || undefined;
}

async function ensureDailyRefresh(): Promise<void> {
  const lastActivity = getLastActivity();
  if (!lastActivity) {
    return;
  }

  const inactiveDuration = Date.now() - lastActivity;
  if (inactiveDuration < REFRESH_INTERVAL_MS) {
    return;
  }

  if (!pendingRefreshPromise) {
    pendingRefreshPromise = attemptRefresh()
      .then((refreshed) => {
        if (refreshed) {
          recordActivity();
        }
      })
      .finally(() => {
        pendingRefreshPromise = null;
      });
  }

  await pendingRefreshPromise;
}
