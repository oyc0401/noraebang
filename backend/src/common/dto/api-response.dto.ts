import { ApiProperty } from "@nestjs/swagger";

interface ApiResponseMeta {
  total?: number; // 전체 개수
  page?: number; // 현재 페이지
  limit?: number; // 페이지 크기
  hasMore?: boolean; // 더 있는지
}

export class ApiResponse<T> {
  @ApiProperty({ description: "응답 데이터" })
  data: T;

  @ApiProperty({ description: "메시지", required: false })
  message?: string;

  @ApiProperty({
    description: "메타데이터 (페이지네이션 등)",
    required: false,
  })
  meta?: ApiResponseMeta;

  constructor(data: T, message?: string, meta?: ApiResponseMeta) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static success<T>(
    data: T,
    message?: string,
    meta?: ApiResponseMeta,
  ): ApiResponse<T> {
    return new ApiResponse(data, message, meta);
  }

  static error(message: string): ApiResponse<null> {
    return new ApiResponse(null, message);
  }
}
