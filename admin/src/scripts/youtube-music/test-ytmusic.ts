/**
 * ytmusic-api 테스트 스크립트
 */

import "dotenv/config";

async function main() {
  try {
    // 라이브러리 import 테스트
    const ytmusicModule = await import("ytmusic-api");
    console.log("✅ ytmusic-api 로드 성공");
    console.log("Available exports:", Object.keys(ytmusicModule));

    // YTMUSIC 클래스 가져오기
    const YTMUSIC = ytmusicModule.default || ytmusicModule.YTMUSIC;

    if (!YTMUSIC) {
      console.error("❌ YTMUSIC 클래스를 찾을 수 없습니다.");
      console.log("Module structure:", ytmusicModule);
      return;
    }

    console.log("\n🎵 YTMUSIC 인스턴스 생성 중...");
    const api = new YTMUSIC();

    console.log("\n📋 사용 가능한 메서드:");
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(api))
      .filter(name => name !== 'constructor')
      .sort();

    methods.forEach((method, index) => {
      console.log(`${index + 1}. ${method}`);
    });

    console.log(`\n총 ${methods.length}개의 메서드 발견`);

    // 검색 관련 메서드 찾기
    const searchMethods = methods.filter(m => m.toLowerCase().includes('search'));
    if (searchMethods.length > 0) {
      console.log("\n🔍 검색 관련 메서드:");
      searchMethods.forEach(m => console.log(`   - ${m}`));
    }

    // 아티스트 관련 메서드 찾기
    const artistMethods = methods.filter(m => m.toLowerCase().includes('artist'));
    if (artistMethods.length > 0) {
      console.log("\n🎤 아티스트 관련 메서드:");
      artistMethods.forEach(m => console.log(`   - ${m}`));
    }

  } catch (error: any) {
    console.error("❌ 오류 발생:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  }
}

main();
