import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-6">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-5" />
        <span>홈으로</span>
      </Link>

      <h1 className="mb-6 text-2xl font-bold">이용약관</h1>

      <div className="space-y-6 text-sm leading-relaxed text-white/80">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">제1조 (목적)</h2>
          <p>
            본 약관은 Sing It!(이하 "서비스")의 이용과 관련하여 서비스와 이용자
            간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            제2조 (서비스의 내용)
          </h2>
          <p>
            서비스는 노래방 수록곡 정보 검색 및 곡 신청 기능을 제공합니다. 서비스
            내 정보는 참고용이며, 실제 노래방 기기의 수록 여부와 다를 수
            있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            제3조 (면책조항)
          </h2>
          <p>
            서비스는 제공된 정보의 정확성을 보장하지 않으며, 정보 이용으로 인한
            손해에 대해 책임지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            제4조 (저작권)
          </h2>
          <p>
            서비스 내 콘텐츠의 저작권은 각 권리자에게 있으며, 서비스는 정보 제공
            목적으로만 해당 콘텐츠를 사용합니다.
          </p>
        </section>

        <p className="pt-4 text-white/40">최종 수정일: 2025년 1월</p>
      </div>
    </div>
  );
}
