import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: "HTTP 상태 코드" })
  statusCode: number;

  @ApiProperty({ example: "Bad Request", description: "오류 메시지" })
  message: string;

  @ApiProperty({
    example: "BadRequestException",
    required: false,
    description: "오류 유형(선택)",
  })
  error?: string;

  constructor(statusCode: number, message: string, error?: string) {
    this.statusCode = statusCode;
    this.message = message;
    this.error = error;
  }
}
