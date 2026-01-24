import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReportDto } from "./dto/report-response.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createReportDto: CreateReportDto): Promise<ReportDto> {
    const report = await this.prisma.report.create({
      data: {
        songId: createReportDto.songId,
        artistId: createReportDto.artistId,
        title: createReportDto.title,
        content: createReportDto.content,
        email: createReportDto.email,
      },
    });

    return {
      id: report.id,
      songId: report.songId ?? undefined,
      artistId: report.artistId ?? undefined,
      title: report.title,
      content: report.content,
      email: report.email ?? undefined,
      status: report.status,
      createdAt: report.createdAt,
    };
  }
}
