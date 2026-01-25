import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-6">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-5" />
        <span>홈으로</span>
      </Link>

      <h1 className="mb-6 text-2xl font-bold">개인정보처리방침</h1>

      <div className="space-y-6 text-sm leading-relaxed text-white/80">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            1. 수집하는 개인정보
          </h2>
          <p>
            서비스는 별도의 회원가입 없이 이용 가능하며, 최소한의 정보만
            수집합니다.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-white/60">
            <li>자동 수집: 접속 기록, 기기 정보 (Google Analytics)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            2. 개인정보의 이용 목적
          </h2>
          <ul className="list-inside list-disc space-y-1 text-white/60">
            <li>서비스 이용 통계 분석</li>
            <li>서비스 개선</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            3. 개인정보의 보유 및 파기
          </h2>
          <p>
            수집된 정보는 서비스 운영 기간 동안 보유하며, 서비스 종료 시 즉시
            파기합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">
            4. 쿠키 사용 안내
          </h2>
          <p>
            서비스는 Google Analytics를 통해 쿠키를 사용합니다. 브라우저
            설정에서 쿠키를 거부할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">5. 문의</h2>
          <p>
            개인정보 관련 문의:{" "}
            <a
              href="mailto:oyc0401@gmail.com"
              className="text-primary hover:underline"
            >
              oyc0401@gmail.com
            </a>
          </p>
        </section>

        <p className="pt-4 text-white/40">최종 수정일: 2025년 1월</p>
      </div>
    </div>
  );
}
