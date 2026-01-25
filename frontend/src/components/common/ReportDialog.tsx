"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useReportsControllerCreate } from "@/api/model/reports/reports";
import { cn } from "@/lib/cn";
import { useReportDialogStore } from "@/store/reportDialogStore";

type SectionKey = "improvement" | "other";

interface SectionConfig {
  key: SectionKey;
  label: string;
  placeholder: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: "improvement",
    label: "정보개선",
    placeholder:
      "개선이 필요한 정보를 알려주세요\n\n예시:\n• 스포티파이 추가해주세요: https://open.spotify.com/...\n• 한국어 번역 추가해주세요: 역광\n• 아티스트 이름이 잘못되었어요: DAOKO × 米津玄師",
  },
  {
    key: "other",
    label: "기타",
    placeholder: "기타 개선 사항을 입력해주세요",
  },
];

type SectionState = Record<SectionKey, string>;

export function ReportDialog() {
  const { isOpen, data, closeDialog } = useReportDialogStore();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("improvement");
  const [sections, setSections] = useState<SectionState>({
    improvement: "",
    other: "",
  });
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createReport } = useReportsControllerCreate();

  useEffect(() => {
    if (isOpen && data) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
        setSections({ improvement: "", other: "" });
        setEmail("");
        setActiveSection("improvement");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !data) return null;

  const hasContent = Object.values(sections).some((v) => v.trim().length > 0);
  const activeConfig = SECTIONS.find((s) => s.key === activeSection);

  const handleSubmit = async () => {
    if (!hasContent) return;

    setIsSubmitting(true);
    try {
      const contentParts: string[] = [];
      if (sections.improvement.trim()) {
        contentParts.push(`[정보개선]\n${sections.improvement.trim()}`);
      }
      if (sections.other.trim()) {
        contentParts.push(`[기타]\n${sections.other.trim()}`);
      }

      await createReport({
        data: {
          songId: data.songId,
          artistId: data.artistId,
          title: `${data.songTitle} - ${data.artistName}`,
          content: contentParts.join("\n\n"),
          email: email.trim() || undefined,
        },
      });
      closeDialog();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={closeDialog}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeDialog();
        }}
      />

      {/* 다이얼로그 */}
      <div
        className={cn(
          "fixed inset-x-4 top-1/2 z-50 max-w-lg mx-auto -translate-y-1/2 bg-[#1a1a1a] rounded-2xl transition-all duration-300 max-h-[90vh] overflow-y-auto",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">정보 개선하기</h3>
          <button
            type="button"
            onClick={closeDialog}
            className="p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* 대상 정보 */}
        <div className="px-5 py-3 bg-white/5">
          <p className="text-sm text-gray-400">대상 곡</p>
          <p className="text-white font-medium truncate">{data.songTitle}</p>
          <p className="text-sm text-gray-400 truncate">{data.artistName}</p>
        </div>

        {/* 섹션 탭 버튼 */}
        <div className="px-4 pt-4 flex gap-2 flex-wrap">
          {SECTIONS.map((section) => {
            const hasValue = sections[section.key].trim().length > 0;
            const isActive = activeSection === section.key;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "relative px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20",
                )}
              >
                {section.label}
                {hasValue && (
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                      isActive ? "bg-white" : "bg-blue-500",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 활성 섹션 입력 */}
        <div className="px-5 py-4">
          <textarea
            rows={8}
            placeholder={activeConfig?.placeholder}
            value={sections[activeSection]}
            onChange={(e) =>
              setSections((prev) => ({
                ...prev,
                [activeSection]: e.target.value,
              }))
            }
            className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 이메일 & 제출 */}
        <div className="px-5 pb-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
              이메일 (선택)
            </label>
            <input
              id="email"
              type="email"
              placeholder="답변 받으실 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeDialog}
              className="flex-1 py-3 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !hasContent}
              className={cn(
                "flex-1 py-3 bg-blue-600 rounded-lg text-white font-medium cursor-pointer transition-colors",
                isSubmitting || !hasContent
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-700",
              )}
            >
              {isSubmitting ? "제출 중..." : "제출하기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
