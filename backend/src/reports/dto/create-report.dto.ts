import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateReportDto {
  @ApiProperty({ example: 1, required: false, description: "신고 대상 곡 ID" })
  @IsOptional()
  @IsInt()
  songId?: number;

  @ApiProperty({ example: 1, required: false, description: "신고 대상 아티스트 ID" })
  @IsOptional()
  @IsInt()
  artistId?: number;

  @ApiProperty({ example: "잘못된 노래방 번호", description: "신고 제목" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: "TJ 번호가 잘못되었습니다.", description: "신고 내용" })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiProperty({ example: "user@example.com", required: false, description: "답변 받을 이메일" })
  @IsOptional()
  @IsEmail()
  email?: string;
}
