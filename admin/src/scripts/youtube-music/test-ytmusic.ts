/**
 * youtube-music-ts-api 테스트 스크립트
 */

import "dotenv/config";

async function main() {
  try {
    // 라이브러리 import 테스트
    const YTMusicModule = await import("youtube-music-ts-api");
    console.log("✅ youtube-music-ts-api 로드 성공");
    console.log("Available exports:", Object.keys(YTMusicModule));

    const YouTubeMusic = YTMusicModule.default;

    if (!YouTubeMusic) {
      console.error("❌ YouTubeMusic 클래스를 찾을 수 없습니다.");
      console.log("Module structure:", YTMusicModule);
      return;
    }

    console.log("\n🎵 YouTubeMusic 인스턴스 생성 중...");

    // 쿠키 확인
    const cookie = process.env.YOUTUBE_MUSIC_COOKIE;
    if (!cookie) {
      console.error("❌ YOUTUBE_MUSIC_COOKIE 환경변수가 설정되지 않았습니다.");
      console.log("\n설정 방법:");
      console.log("1. YouTube Music (https://music.youtube.com) 접속");
      console.log("2. 개발자 도구 열기 (F12)");
      console.log("3. Network 탭에서 '/browse' 요청 찾기");
      console.log("4. Request Headers에서 'cookie' 값 복사");
      console.log("5. .env 파일에 YOUTUBE_MUSIC_COOKIE=<복사한값> 추가");
      return;
    }

    const ytmusic = new YouTubeMusic();
    await ytmusic.initialize({ cookies: cookie });

    console.log("✅ 인증 성공!");

    console.log("\n📋 사용 가능한 메서드:");
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(ytmusic))
      .filter((name) => name !== "constructor")
      .sort();

    methods.forEach((method, index) => {
      console.log(`${index + 1}. ${method}`);
    });

    console.log(`\n총 ${methods.length}개의 메서드 발견`);

    // 검색 관련 메서드 찾기
    const searchMethods = methods.filter((m) =>
      m.toLowerCase().includes("search"),
    );
    if (searchMethods.length > 0) {
      console.log("\n🔍 검색 관련 메서드:");
      searchMethods.forEach((m) => console.log(`   - ${m}`));
    }

    // 아티스트 관련 메서드 찾기
    const artistMethods = methods.filter((m) =>
      m.toLowerCase().includes("artist"),
    );
    if (artistMethods.length > 0) {
      console.log("\n🎤 아티스트 관련 메서드:");
      artistMethods.forEach((m) => console.log(`   - ${m}`));
    }

    // 간단한 검색 테스트
    console.log("\n🔍 검색 테스트: '아이유'");
    const searchResult = await ytmusic.search("아이유");
    console.log(
      "검색 결과:",
      JSON.stringify(searchResult, null, 2).slice(0, 500) + "...",
    );
  } catch (error: any) {
    console.error("❌ 오류 발생:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  }
}

main();
