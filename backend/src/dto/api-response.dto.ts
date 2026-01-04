import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseMeta {
  @ApiProperty({ description: "전체 개수", required: false })
  total?: number;

  @ApiProperty({ description: "현재 페이지", required: false })
  page?: number;

  @ApiProperty({ description: "페이지 크기", required: false })
  limit?: number;

  @ApiProperty({ description: "더 있는지", required: false })
  hasMore?: boolean;
}

export class ApiResponse<T> {
  @ApiProperty({ description: "응답 데이터" })
  data: T;

  @ApiProperty({ description: "메시지", required: true })
  message: string;

  @ApiProperty({
    description: "메타데이터 (페이지네이션 등)",
    required: false,
  })
  meta?: ApiResponseMeta;

  constructor(data: T, message: string, meta?: ApiResponseMeta) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static success<T>(
    data: T,
    message: string,
    meta?: ApiResponseMeta,
  ): ApiResponse<T> {
    return new ApiResponse(data, message, meta);
  }

  static error(message: string): ApiResponse<null> {
    return new ApiResponse(null, message);
  }
}
