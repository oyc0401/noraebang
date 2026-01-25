export type ReportStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";

export type ReportSummary = {
  id: number;
  title: string;
  status: ReportStatus;
  email: string | null;
  createdAt: string;
  songId: number | null;
  artistId: number | null;
};

export type ReportDetail = {
  id: number;
  title: string;
  content: string;
  status: ReportStatus;
  email: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  song: {
    id: number;
    title: string;
    titleKo: string | null;
  } | null;
  artist: {
    id: number;
    name: string;
    nameKo: string;
  } | null;
};

export type ReportFilter = {
  status: ReportStatus | "ALL";
  date: string | null; // YYYY-MM-DD or null for all dates
};

export const REPORT_STATUS_OPTIONS: Array<{
  value: ReportStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기중" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "RESOLVED", label: "완료" },
  { value: "REJECTED", label: "거절" },
];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "대기중",
  IN_PROGRESS: "진행중",
  RESOLVED: "완료",
  REJECTED: "거절",
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};
