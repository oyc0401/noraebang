import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiResponse as SwaggerApiResponse } from "@nestjs/swagger";
import { ApiResponse } from "../dto/api-response.dto";
import { ErrorResponseDto } from "../dto";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReportResponseDto } from "./dto/report-response.dto";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: "신고 접수",
    description: "잘못된 정보에 대한 신고를 접수합니다.",
  })
  @SwaggerApiResponse({
    status: 201,
    description: "신고 접수 성공",
    type: ReportResponseDto,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "잘못된 요청",
    type: ErrorResponseDto,
  })
  async create(@Body() createReportDto: CreateReportDto): Promise<ReportResponseDto> {
    const report = await this.reportsService.create(createReportDto);
    return ApiResponse.success(report, "신고가 접수되었습니다.");
  }
}
