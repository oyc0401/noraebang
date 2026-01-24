import { ApiProperty } from "@nestjs/swagger";
import { ApiResponse } from "../../dto/api-response.dto";

export class ReportDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1, required: false })
  songId?: number;

  @ApiProperty({ example: 1, required: false })
  artistId?: number;

  @ApiProperty({ example: "잘못된 노래방 번호" })
  title: string;

  @ApiProperty({ example: "TJ 번호가 잘못되었습니다." })
  content: string;

  @ApiProperty({ example: "user@example.com", required: false })
  email?: string;

  @ApiProperty({ example: "PENDING", enum: ["PENDING", "RESOLVED", "REJECTED"] })
  status: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt: Date;
}

export class ReportResponseDto extends ApiResponse<ReportDto> {
  @ApiProperty({ type: ReportDto })
  data: ReportDto;
}
