"use server";

import { prisma } from "@/lib/prisma";
import type {
  ReportDetail,
  ReportFilter,
  ReportStatus,
  ReportSummary,
} from "./types";

export async function fetchReports(
  filter: ReportFilter
): Promise<ReportSummary[]> {
  const whereClause: any = {};

  // 상태 필터
  if (filter.status !== "ALL") {
    whereClause.status = filter.status;
  }

  // 날짜 필터
  if (filter.date) {
    const startDate = new Date(filter.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filter.date);
    endDate.setHours(23, 59, 59, 999);

    whereClause.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  const reports = await prisma.report.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      status: true,
      email: true,
      createdAt: true,
      songId: true,
      artistId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return reports.map((report) => ({
    id: report.id,
    title: report.title,
    status: report.status as ReportStatus,
    email: report.email,
    createdAt: report.createdAt.toISOString(),
    songId: report.songId,
    artistId: report.artistId,
  }));
}

export async function fetchReportDetail(
  id: number
): Promise<ReportDetail | null> {
  if (!id || Number.isNaN(id)) {
    return null;
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      email: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
        },
      },
      artist: {
        select: {
          id: true,
          name: true,
          nameKo: true,
        },
      },
    },
  });

  if (!report) {
    return null;
  }

  return {
    id: report.id,
    title: report.title,
    content: report.content,
    status: report.status as ReportStatus,
    email: report.email,
    adminNote: report.adminNote,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    song: report.song
      ? {
          id: report.song.id,
          title: report.song.title,
          titleKo: report.song.titleKo,
        }
      : null,
    artist: report.artist
      ? {
          id: report.artist.id,
          name: report.artist.name,
          nameKo: report.artist.nameKo,
        }
      : null,
  };
}

export async function updateReportStatus(
  id: number,
  status: ReportStatus,
  adminNote?: string
): Promise<ReportDetail | null> {
  if (!id || Number.isNaN(id)) {
    throw new Error("유효한 문의 ID가 필요합니다.");
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status,
      adminNote: adminNote ?? undefined,
    },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      email: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
        },
      },
      artist: {
        select: {
          id: true,
          name: true,
          nameKo: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    status: updated.status as ReportStatus,
    email: updated.email,
    adminNote: updated.adminNote,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    song: updated.song
      ? {
          id: updated.song.id,
          title: updated.song.title,
          titleKo: updated.song.titleKo,
        }
      : null,
    artist: updated.artist
      ? {
          id: updated.artist.id,
          name: updated.artist.name,
          nameKo: updated.artist.nameKo,
        }
      : null,
  };
}

export async function updateAdminNote(
  id: number,
  adminNote: string
): Promise<{ success: boolean }> {
  if (!id || Number.isNaN(id)) {
    throw new Error("유효한 문의 ID가 필요합니다.");
  }

  await prisma.report.update({
    where: { id },
    data: { adminNote },
  });

  return { success: true };
}
