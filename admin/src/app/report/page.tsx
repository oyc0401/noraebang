"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Music,
  User,
  Clock,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { useReportStore } from "./store";
import {
  fetchReports,
  fetchReportDetail,
  updateReportStatus,
  updateAdminNote,
} from "./action";
import {
  type ReportSummary,
  type ReportDetail,
  type ReportStatus,
  REPORT_STATUS_OPTIONS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
} from "./types";

export default function ReportPage() {
  const {
    selectedReportId,
    setSelectedReportId,
    filter,
    setStatusFilter,
    goToPreviousDay,
    goToNextDay,
    toggleAllDates,
  } = useReportStore();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // 리스트 로드
  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fetchReports(filter);
      setReports(data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // 상세 로드
  const loadDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await fetchReportDetail(id);
      setDetail(data);
    } catch (error) {
      console.error("Failed to fetch report detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  // 필터 변경 시 리스트 다시 로드
  useEffect(() => {
    loadReports();
  }, [filter]);

  // 선택 변경 시 상세 로드
  useEffect(() => {
    if (selectedReportId) {
      loadDetail(selectedReportId);
    } else {
      setDetail(null);
    }
  }, [selectedReportId]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 h-[100vh]">
      <div className="mx-auto flex h-full min-h-0 flex-col">
        <div className="grid flex-1 min-h-0 gap-0 [grid-template-columns:350px_minmax(0,1fr)_420px]">
          {/* 왼쪽 패널: 리스트 + 필터 */}
          <LeftPanel
            reports={reports}
            loading={loading}
            selectedId={selectedReportId}
            onSelect={setSelectedReportId}
            filter={filter}
            onStatusChange={setStatusFilter}
            onPrevDay={goToPreviousDay}
            onNextDay={goToNextDay}
            onToggleAllDates={toggleAllDates}
            onRefresh={loadReports}
          />

          {/* 가운데 패널: 상세 보기 */}
          <CenterPanel detail={detail} loading={detailLoading} />

          {/* 오른쪽 패널: 상태 관리 + 이메일 */}
          <RightPanel
            detail={detail}
            onStatusChange={async (status, note) => {
              if (!detail) return;
              const updated = await updateReportStatus(detail.id, status, note);
              if (updated) {
                setDetail(updated);
                loadReports();
              }
            }}
            onNoteSave={async (note) => {
              if (!detail) return;
              await updateAdminNote(detail.id, note);
              loadDetail(detail.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== 왼쪽 패널 ====================
function LeftPanel({
  reports,
  loading,
  selectedId,
  onSelect,
  filter,
  onStatusChange,
  onPrevDay,
  onNextDay,
  onToggleAllDates,
  onRefresh,
}: {
  reports: ReportSummary[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  filter: { status: ReportStatus | "ALL"; date: string | null };
  onStatusChange: (status: ReportStatus | "ALL") => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToggleAllDates: () => void;
  onRefresh: () => void;
}) {
  const formatDateDisplay = (date: string | null) => {
    if (!date) return "전체 기간";
    const d = new Date(date);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <div className="border-r border-zinc-200 flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="p-4 border-b border-zinc-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">문의사항 관리</h1>
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 hover:bg-zinc-100 rounded cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* 날짜 네비게이션 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onPrevDay}
            className="p-1.5 hover:bg-zinc-100 rounded cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onToggleAllDates}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-100 rounded cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatDateDisplay(filter.date)}
            </span>
          </button>
          <button
            type="button"
            onClick={onNextDay}
            className="p-1.5 hover:bg-zinc-100 rounded cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 상태 필터 */}
        <div className="flex flex-wrap gap-1.5">
          {REPORT_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              className={`px-2.5 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                filter.status === option.value
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-400">
            문의사항이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isSelected={selectedId === report.id}
                onSelect={() => onSelect(report.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 하단 카운트 */}
      <div className="p-3 border-t border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        총 {reports.length}건
      </div>
    </div>
  );
}

function ReportCard({
  report,
  isSelected,
  onSelect,
}: {
  report: ReportSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const createdDate = new Date(report.createdAt);
  const timeStr = `${createdDate.getHours().toString().padStart(2, "0")}:${createdDate.getMinutes().toString().padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50" : "hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-sm line-clamp-1">{report.title}</span>
        <span
          className={`px-1.5 py-0.5 text-xs rounded shrink-0 ${REPORT_STATUS_COLORS[report.status]}`}
        >
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeStr}
        </span>
        {report.email && (
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {report.email.split("@")[0]}
          </span>
        )}
        {report.songId && (
          <span className="flex items-center gap-1">
            <Music className="w-3 h-3" />곡
          </span>
        )}
        {report.artistId && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            아티스트
          </span>
        )}
      </div>
    </button>
  );
}

// ==================== 가운데 패널 ====================
function CenterPanel({
  detail,
  loading,
}: {
  detail: ReportDetail | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-zinc-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>문의사항을 선택하세요</p>
        </div>
      </div>
    );
  }

  const createdDate = new Date(detail.createdAt);
  const updatedDate = new Date(detail.updatedAt);

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-6">
        {/* 제목 & 상태 */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-xl font-semibold">{detail.title}</h2>
            <span
              className={`px-2 py-1 text-sm rounded shrink-0 ${REPORT_STATUS_COLORS[detail.status]}`}
            >
              {REPORT_STATUS_LABELS[detail.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>
              작성: {createdDate.toLocaleDateString()}{" "}
              {createdDate.toLocaleTimeString()}
            </span>
            <span>
              수정: {updatedDate.toLocaleDateString()}{" "}
              {updatedDate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* 연관 정보 */}
        {(detail.song || detail.artist || detail.email) && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-lg">
            <h3 className="text-sm font-medium text-zinc-700 mb-3">연관 정보</h3>
            <div className="space-y-2">
              {detail.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-600">이메일:</span>
                  <a
                    href={`mailto:${detail.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {detail.email}
                  </a>
                </div>
              )}
              {detail.song && (
                <div className="flex items-center gap-2 text-sm">
                  <Music className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-600">곡:</span>
                  <a
                    href={`/manager?songId=${detail.song.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {detail.song.title}
                    {detail.song.titleKo && ` (${detail.song.titleKo})`}
                  </a>
                </div>
              )}
              {detail.artist && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-600">아티스트:</span>
                  <a
                    href={`/manager?artistId=${detail.artist.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {detail.artist.name} ({detail.artist.nameKo})
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 내용 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-700 mb-2">문의 내용</h3>
          <div className="p-4 bg-zinc-50 rounded-lg whitespace-pre-wrap text-sm">
            {detail.content}
          </div>
        </div>

        {/* 관리자 메모 (읽기 전용) */}
        {detail.adminNote && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-700 mb-2">
              관리자 메모
            </h3>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg whitespace-pre-wrap text-sm">
              {detail.adminNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 오른쪽 패널 ====================
function RightPanel({
  detail,
  onStatusChange,
  onNoteSave,
}: {
  detail: ReportDetail | null;
  onStatusChange: (status: ReportStatus, note?: string) => Promise<void>;
  onNoteSave: (note: string) => Promise<void>;
}) {
  const [adminNote, setAdminNote] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [saving, setSaving] = useState(false);

  // detail 변경 시 adminNote 초기화
  useEffect(() => {
    setAdminNote(detail?.adminNote ?? "");
    setEmailSubject(detail ? `[노래방 서비스] ${detail.title}에 대한 답변` : "");
    setEmailBody("");
  }, [detail?.id]);

  if (!detail) {
    return (
      <div className="border-l border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>문의사항을 선택하세요</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (status: ReportStatus) => {
    setSaving(true);
    try {
      await onStatusChange(status, adminNote || undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleNoteSave = async () => {
    setSaving(true);
    try {
      await onNoteSave(adminNote);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-l border-zinc-200 bg-white flex flex-col h-full">
      {/* 상태 변경 섹션 */}
      <div className="p-4 border-b border-zinc-200">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">상태 변경</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving || detail.status === "IN_PROGRESS"}
            onClick={() => handleStatusChange("IN_PROGRESS")}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
              detail.status === "IN_PROGRESS"
                ? "bg-blue-100 text-blue-800"
                : "bg-zinc-100 hover:bg-blue-50 text-zinc-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Loader2 className="w-4 h-4" />
            진행중
          </button>
          <button
            type="button"
            disabled={saving || detail.status === "RESOLVED"}
            onClick={() => handleStatusChange("RESOLVED")}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
              detail.status === "RESOLVED"
                ? "bg-green-100 text-green-800"
                : "bg-zinc-100 hover:bg-green-50 text-zinc-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <CheckCircle className="w-4 h-4" />
            완료
          </button>
          <button
            type="button"
            disabled={saving || detail.status === "PENDING"}
            onClick={() => handleStatusChange("PENDING")}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
              detail.status === "PENDING"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-zinc-100 hover:bg-yellow-50 text-zinc-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Clock className="w-4 h-4" />
            대기중
          </button>
          <button
            type="button"
            disabled={saving || detail.status === "REJECTED"}
            onClick={() => handleStatusChange("REJECTED")}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
              detail.status === "REJECTED"
                ? "bg-red-100 text-red-800"
                : "bg-zinc-100 hover:bg-red-50 text-zinc-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <XCircle className="w-4 h-4" />
            거절
          </button>
        </div>
      </div>

      {/* 관리자 메모 섹션 */}
      <div className="p-4 border-b border-zinc-200">
        <h3 className="text-sm font-medium text-zinc-700 mb-2">관리자 메모</h3>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="내부 메모를 입력하세요..."
          className="w-full h-24 p-3 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          disabled={saving}
          onClick={handleNoteSave}
          className="mt-2 w-full py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "저장 중..." : "메모 저장"}
        </button>
      </div>

      {/* 이메일 발송 섹션 */}
      <div className="flex-1 p-4 flex flex-col min-h-0">
        <h3 className="text-sm font-medium text-zinc-700 mb-2">이메일 발송</h3>
        {detail.email ? (
          <>
            <div className="mb-2">
              <label className="text-xs text-zinc-500">받는 사람</label>
              <div className="px-3 py-2 text-sm bg-zinc-50 rounded border border-zinc-200">
                {detail.email}
              </div>
            </div>
            <div className="mb-2">
              <label className="text-xs text-zinc-500">제목</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-h-0 mb-2">
              <label className="text-xs text-zinc-500">내용</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="답변 내용을 입력하세요..."
                className="w-full h-full min-h-[120px] p-3 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              disabled={!emailBody.trim()}
              onClick={() => {
                // TODO: 실제 이메일 발송 로직 구현
                alert("이메일 발송 기능은 아직 구현되지 않았습니다.");
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              이메일 발송 (미구현)
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            이메일 주소가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
