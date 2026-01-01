export interface ApiResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: ApiResponseMeta;
}

export function mapResponseData<T>(fallback: T) {
  return (response: unknown): T => {
    if (
      response &&
      typeof response === "object" &&
      "data" in response &&
      (response as ApiResponse<T>).data !== undefined
    ) {
      return (response as ApiResponse<T>).data;
    }
    return fallback;
  };
}

export function getResponseData<T>(response: unknown): T {
  const result = mapResponseData<T | undefined>(undefined)(response);
  if (result === undefined) {
    throw new Error("API 응답에 data가 없습니다.");
  }
  return result;
}

export function getResponseMessage(response: unknown): string | undefined {
  if (
    response &&
    typeof response === "object" &&
    "message" in response
  ) {
    return (response as ApiResponse<unknown>).message;
  }
  return undefined;
}
